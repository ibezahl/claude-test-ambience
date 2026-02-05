// ============================================================
// Clinician Detail View — drill-down for individual clinicians
// ============================================================

import { CLINICIANS, DEPARTMENTS, FEEDBACK_LOG } from "./data.js";
import {
  el, formatPercent, formatDate, daysSince, getInitials,
  getRiskBadgeClass, getChampionBadgeClass, getTrainingBadgeClass,
  getUtilizationColorClass, getTrendArrow, getTrendClass,
  getSentimentBadgeClass, loadJSON, saveJSON, navigate,
} from "./utils.js";

export function renderClinicianDetail(container, clinicianId) {
  container.innerHTML = "";

  const clinician = CLINICIANS.find((c) => c.id === clinicianId);
  if (!clinician) {
    container.appendChild(el("div", { className: "card", textContent: "Clinician not found." }));
    return;
  }

  const dept = DEPARTMENTS.find((d) => d.id === clinician.department);

  // Back link
  const back = el("a", {
    className: "back-link",
    href: "#/dashboard",
    innerHTML: "&#8592; Back to Dashboard",
  });
  container.appendChild(back);

  // Header
  const header = el("div", { className: "detail-header" });
  header.appendChild(el("div", { className: "detail-avatar", textContent: getInitials(clinician.name) }));

  const info = el("div", { className: "detail-info" });
  info.appendChild(el("h1", { textContent: clinician.name }));
  info.appendChild(el("div", {
    className: "detail-sub",
    textContent: `${clinician.role} — ${dept ? dept.name : clinician.department} — ${clinician.specialty}`,
  }));

  const badges = el("div", { className: "detail-badges" });
  badges.appendChild(el("span", {
    className: `badge ${getTrainingBadgeClass(clinician.trainingStatus)}`,
    textContent: clinician.trainingStatus.replace("_", " "),
  }));
  badges.appendChild(el("span", {
    className: `badge ${getChampionBadgeClass(clinician.championStatus)}`,
    textContent: clinician.championStatus,
  }));
  badges.appendChild(el("span", {
    className: `badge ${getRiskBadgeClass(clinician.riskLevel)}`,
    textContent: clinician.riskLevel === "none" ? "no risk" : `${clinician.riskLevel} risk`,
  }));
  info.appendChild(badges);
  header.appendChild(info);
  container.appendChild(header);

  // Meta info
  const metaLine = el("div", {
    className: "kpi-sub mb-24",
    textContent: `Onboarded ${formatDate(clinician.onboardDate)} — Last active ${formatDate(clinician.lastActive)} (${daysSince(clinician.lastActive)} days ago)`,
  });
  container.appendChild(metaLine);

  // Metrics grid
  container.appendChild(renderMetrics(clinician, dept));

  // Two-column: Feedback + Notes
  const twocol = el("div", { className: "two-col" });
  twocol.appendChild(renderFeedback(clinician));
  twocol.appendChild(renderNotes(clinician));
  container.appendChild(twocol);
}

function renderMetrics(clinician, dept) {
  const grid = el("div", { className: "metrics-grid" });

  // Utilization
  const utilColor = getUtilizationColorClass(clinician.utilizationRate);
  const trendHtml = `${formatPercent(clinician.utilizationRate)} <span class="${getTrendClass(clinician.utilizationTrend)}">${getTrendArrow(clinician.utilizationTrend)}</span>`;
  grid.appendChild(metricCard("Utilization Rate", trendHtml, `Trend: ${clinician.utilizationTrend}`, true));

  // Encounters
  grid.appendChild(metricCard(
    "Encounters",
    `${clinician.encountersWithAmbience} / ${clinician.totalEncounters}`,
    `${formatPercent(clinician.encountersWithAmbience / clinician.totalEncounters)} with Ambience`
  ));

  // Time saved
  grid.appendChild(metricCard(
    "Time Saved / Day",
    `${clinician.avgTimeSavedPerDay} min`,
    dept ? `Dept avg: ${Math.round(dept.avgTimeSavedPerWeek / 5 * 60)} min` : ""
  ));

  // After-hours
  grid.appendChild(metricCard(
    "After-Hours EHR",
    `${clinician.afterHoursMinutes} min/day`,
    clinician.afterHoursMinutes > 45 ? "Above department target" : "Within target"
  ));

  // NPS
  grid.appendChild(metricCard(
    "NPS Response",
    clinician.npsResponse != null ? clinician.npsResponse.toString() : "—",
    clinician.npsResponse != null ? (clinician.npsResponse >= 9 ? "Promoter" : clinician.npsResponse >= 7 ? "Passive" : "Detractor") : "No response yet"
  ));

  // Same-day note close (from dept average as proxy)
  grid.appendChild(metricCard(
    "Feedback Submitted",
    clinician.feedbackCount.toString(),
    clinician.feedbackCount > 5 ? "Highly engaged" : clinician.feedbackCount > 0 ? "Some engagement" : "No feedback yet"
  ));

  return grid;
}

function metricCard(label, value, sub, isHtml = false) {
  const card = el("div", { className: "metric-card" });
  card.appendChild(el("div", { className: "metric-label", textContent: label }));
  if (isHtml) {
    card.appendChild(el("div", { className: "metric-value", innerHTML: value }));
  } else {
    card.appendChild(el("div", { className: "metric-value", textContent: value }));
  }
  card.appendChild(el("div", { className: "metric-sub", textContent: sub }));
  return card;
}

function renderFeedback(clinician) {
  const card = el("div", { className: "card" }, [
    el("h3", { textContent: "Feedback History" }),
  ]);

  const feedbacks = FEEDBACK_LOG.filter((f) => f.clinicianId === clinician.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (feedbacks.length === 0) {
    card.appendChild(el("div", { className: "kpi-sub", textContent: "No feedback recorded yet." }));
    return card;
  }

  const list = el("div", { className: "feedback-list" });
  for (const fb of feedbacks) {
    const item = el("div", { className: "feedback-item" });

    const header = el("div", { className: "feedback-header" });
    header.appendChild(el("span", {
      className: `badge ${getSentimentBadgeClass(fb.sentiment)}`,
      textContent: fb.sentiment,
    }));
    header.appendChild(el("span", { className: `badge badge-gray`, textContent: fb.type }));
    header.appendChild(el("span", { className: "feedback-date", textContent: formatDate(fb.date) }));
    item.appendChild(header);

    item.appendChild(el("div", { className: "feedback-text", textContent: fb.text }));

    if (fb.actionTaken) {
      item.appendChild(el("div", {
        className: "feedback-action-taken",
        textContent: `Action: ${fb.actionTaken}`,
      }));
    }

    list.appendChild(item);
  }

  card.appendChild(list);
  return card;
}

function renderNotes(clinician) {
  const card = el("div", { className: "card" }, [
    el("h3", { textContent: "Intervention Notes" }),
    el("p", {
      className: "kpi-sub mb-16",
      textContent: "Notes about interactions, interventions, and follow-ups with this clinician.",
    }),
  ]);

  const storageKey = `notes-${clinician.id}`;
  const savedNotes = loadJSON(storageKey, "");

  const textarea = el("textarea", {
    className: "notes-area",
    placeholder: "Add notes about your interventions, upcoming check-ins, or action items...",
  });
  textarea.value = savedNotes;

  const statusEl = el("div", { className: "notes-save-status", textContent: savedNotes ? "Saved" : "" });

  let saveTimeout;
  textarea.addEventListener("input", () => {
    statusEl.textContent = "Saving...";
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      saveJSON(storageKey, textarea.value);
      statusEl.textContent = "Saved";
    }, 500);
  });

  card.appendChild(textarea);
  card.appendChild(statusEl);
  return card;
}
