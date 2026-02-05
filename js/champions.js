// ============================================================
// Champions View — pipeline funnel, candidates, active champions
// ============================================================

import { CLINICIANS, DEPARTMENTS } from "./data.js";
import {
  el, formatPercent, getInitials, loadJSON, saveJSON, navigate,
} from "./utils.js";

export function renderChampions(container) {
  container.innerHTML = "";

  // Header
  container.appendChild(el("div", { className: "view-header" }, [
    el("h1", { textContent: "Clinical Champions" }),
    el("p", { textContent: "Identify, develop, and leverage clinical advocates to drive peer-to-peer adoption" }),
  ]));

  // Funnel
  container.appendChild(renderFunnel());

  // Impact metrics
  container.appendChild(renderImpact());

  // Active champions
  container.appendChild(el("div", { className: "section-title", textContent: "Active Champions" }));
  container.appendChild(renderActiveChampions());

  // Candidates
  container.appendChild(el("div", { className: "section-title mt-12", textContent: "Champion Candidates" }));
  container.appendChild(el("p", {
    className: "kpi-sub mb-16",
    textContent: "Clinicians showing champion signals: high utilization, positive feedback, and peer mentoring behavior.",
  }));
  container.appendChild(renderCandidates());
}

function renderFunnel() {
  const nominations = loadJSON("champion-nominations", []);

  // Count clinicians by stage
  const stages = {
    disengaged: { label: "Disengaged", color: "var(--danger)", bgColor: "var(--danger-bg)", count: 0 },
    resistant: { label: "Resistant", color: "var(--warning)", bgColor: "var(--warning-bg)", count: 0 },
    neutral: { label: "Neutral", color: "var(--text-secondary)", bgColor: "#F1F5F9", count: 0 },
    potential: { label: "Potential", color: "var(--primary)", bgColor: "var(--primary-bg)", count: 0 },
    champion: { label: "Champion", color: "var(--success)", bgColor: "var(--success-bg)", count: 0 },
  };

  for (const c of CLINICIANS) {
    let status = c.championStatus;
    // Override if nominated
    if (nominations.includes(c.id) && status === "potential") {
      status = "champion";
    }
    if (stages[status]) stages[status].count++;
  }

  const total = CLINICIANS.length;
  const funnel = el("div", { className: "funnel" });

  const stageKeys = ["disengaged", "resistant", "neutral", "potential", "champion"];
  stageKeys.forEach((key, i) => {
    const stage = stages[key];
    const stageEl = el("div", {
      className: "funnel-stage",
      style: `background: ${stage.bgColor};`,
    });
    stageEl.appendChild(el("div", {
      className: "funnel-stage-count",
      style: `color: ${stage.color};`,
      textContent: stage.count.toString(),
    }));
    stageEl.appendChild(el("div", {
      className: "funnel-stage-label",
      style: `color: ${stage.color};`,
      textContent: stage.label,
    }));
    stageEl.appendChild(el("div", {
      className: "funnel-stage-pct",
      textContent: formatPercent(stage.count / total),
    }));
    funnel.appendChild(stageEl);

    if (i < stageKeys.length - 1) {
      funnel.appendChild(el("div", { className: "funnel-arrow", innerHTML: "&#8594;" }));
    }
  });

  return funnel;
}

function renderImpact() {
  const nominations = loadJSON("champion-nominations", []);

  // Departments with at least one champion
  const champDepts = new Set();
  for (const c of CLINICIANS) {
    if (c.championStatus === "champion" || nominations.includes(c.id)) {
      champDepts.add(c.department);
    }
  }

  const deptsWithChamps = DEPARTMENTS.filter((d) => champDepts.has(d.id) && d.utilizationRate > 0);
  const deptsWithout = DEPARTMENTS.filter((d) => !champDepts.has(d.id) && d.utilizationRate > 0);

  const avgWith = deptsWithChamps.length > 0
    ? deptsWithChamps.reduce((s, d) => s + d.utilizationRate, 0) / deptsWithChamps.length
    : 0;
  const avgWithout = deptsWithout.length > 0
    ? deptsWithout.reduce((s, d) => s + d.utilizationRate, 0) / deptsWithout.length
    : 0;

  const grid = el("div", { className: "impact-grid" });

  const withCard = el("div", { className: "impact-card" });
  withCard.appendChild(el("div", { className: "impact-label", textContent: "Depts With Champions" }));
  withCard.appendChild(el("div", { className: "impact-value", style: "color: var(--success);", textContent: formatPercent(avgWith) }));
  withCard.appendChild(el("div", { className: "impact-sub", textContent: `${deptsWithChamps.length} department${deptsWithChamps.length !== 1 ? "s" : ""}` }));
  grid.appendChild(withCard);

  const withoutCard = el("div", { className: "impact-card" });
  withoutCard.appendChild(el("div", { className: "impact-label", textContent: "Depts Without Champions" }));
  withoutCard.appendChild(el("div", {
    className: "impact-value",
    style: `color: ${avgWithout >= 0.5 ? "var(--warning)" : "var(--danger)"};`,
    textContent: deptsWithout.length > 0 ? formatPercent(avgWithout) : "—",
  }));
  withoutCard.appendChild(el("div", { className: "impact-sub", textContent: `${deptsWithout.length} department${deptsWithout.length !== 1 ? "s" : ""}` }));
  grid.appendChild(withoutCard);

  return grid;
}

function renderActiveChampions() {
  const nominations = loadJSON("champion-nominations", []);
  const champions = CLINICIANS.filter(
    (c) => c.championStatus === "champion" || nominations.includes(c.id)
  );

  if (champions.length === 0) {
    return el("div", { className: "card mb-24", textContent: "No active champions yet. Nominate candidates below." });
  }

  const grid = el("div", { className: "champion-cards mb-24" });

  for (const c of champions) {
    const dept = DEPARTMENTS.find((d) => d.id === c.department);
    const card = el("div", { className: "champion-card" });

    const header = el("div", { className: "champion-card-header" });
    header.appendChild(el("div", { className: "candidate-avatar", textContent: getInitials(c.name) }));
    const info = el("div");
    info.appendChild(el("div", {
      className: "candidate-name clickable",
      textContent: c.name,
      onClick: () => navigate(`#/clinician/${c.id}`),
    }));
    info.appendChild(el("div", { className: "candidate-dept", textContent: `${dept ? dept.name : ""} — ${c.specialty}` }));
    header.appendChild(info);
    card.appendChild(header);

    const stats = el("div", { className: "champion-stats" });
    stats.appendChild(champStat(formatPercent(c.utilizationRate), "Utilization"));
    stats.appendChild(champStat(c.npsResponse != null ? c.npsResponse.toString() : "—", "NPS"));
    stats.appendChild(champStat(c.feedbackCount.toString(), "Feedback"));
    card.appendChild(stats);

    grid.appendChild(card);
  }

  return grid;
}

function champStat(value, label) {
  return el("div", { className: "text-center" }, [
    el("div", { className: "champion-stat-value", textContent: value }),
    el("div", { className: "champion-stat-label", textContent: label }),
  ]);
}

function renderCandidates() {
  const nominations = loadJSON("champion-nominations", []);

  // Candidates: high utilization (>=75%), positive NPS (>=7), not already a champion
  const candidates = CLINICIANS.filter((c) =>
    c.championStatus === "potential" &&
    !nominations.includes(c.id)
  );

  if (candidates.length === 0) {
    return el("div", { className: "card mb-24", textContent: "No new candidates identified at this time." });
  }

  const list = el("div", { className: "candidate-list mb-24" });

  for (const c of candidates) {
    const dept = DEPARTMENTS.find((d) => d.id === c.department);
    const card = el("div", { className: "candidate-card" });

    card.appendChild(el("div", { className: "candidate-avatar", textContent: getInitials(c.name) }));

    const info = el("div", { className: "candidate-info" });
    info.appendChild(el("div", {
      className: "candidate-name clickable",
      textContent: c.name,
      onClick: () => navigate(`#/clinician/${c.id}`),
    }));
    info.appendChild(el("div", {
      className: "candidate-dept",
      textContent: `${dept ? dept.name : ""} — ${c.specialty}`,
    }));

    // Signals
    const signals = el("div", { className: "candidate-signals" });
    if (c.utilizationRate >= 0.75) signals.appendChild(el("span", { className: "signal-tag", textContent: `${formatPercent(c.utilizationRate)} util` }));
    if (c.npsResponse >= 8) signals.appendChild(el("span", { className: "signal-tag", textContent: `NPS ${c.npsResponse}` }));
    if (c.utilizationTrend === "increasing") signals.appendChild(el("span", { className: "signal-tag", textContent: "Trending up" }));
    if (c.feedbackCount >= 4) signals.appendChild(el("span", { className: "signal-tag", textContent: "Active feedback" }));
    if (c.recentFeedback && c.recentFeedback.toLowerCase().includes("help")) {
      signals.appendChild(el("span", { className: "signal-tag", textContent: "Peer support" }));
    }
    info.appendChild(signals);
    card.appendChild(info);

    // Nominate button
    const btn = el("button", {
      className: "btn-nominate",
      textContent: "Nominate",
      onClick: () => {
        const current = loadJSON("champion-nominations", []);
        saveJSON("champion-nominations", [...current, c.id]);
        renderChampions(document.getElementById("main-content"));
      },
    });
    card.appendChild(btn);

    list.appendChild(card);
  }

  return list;
}
