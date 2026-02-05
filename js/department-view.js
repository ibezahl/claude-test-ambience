// ============================================================
// Department Rollout View — timeline, cards, sortable table
// ============================================================

import { ACCOUNT, DEPARTMENTS, CLINICIANS } from "./data.js";
import {
  el, formatPercent, formatHours, getStatusColor, getStatusBadgeClass,
  getUtilizationCellClass, getNpsCellClass, navigate,
} from "./utils.js";

let sortCol = "name";
let sortAsc = true;

export function renderDepartments(container) {
  container.innerHTML = "";

  // Header
  container.appendChild(el("div", { className: "view-header" }, [
    el("h1", { textContent: "Department Rollout" }),
    el("p", { textContent: "Track deployment phases and department-level adoption progress" }),
  ]));

  // Phase timeline
  container.appendChild(renderTimeline());

  // Department cards
  container.appendChild(renderDeptCards());

  // Sortable comparison table
  container.appendChild(renderComparisonTable());
}

function renderTimeline() {
  const timeline = el("div", { className: "phase-timeline" });

  for (const phase of ACCOUNT.phases) {
    const block = el("div", { className: "phase-block" });

    const statusLabel = phase.status === "completed" ? "Completed" :
      phase.status === "in_progress" ? "In Progress" : "Planned";
    const statusColor = phase.status === "completed" ? "var(--success)" :
      phase.status === "in_progress" ? "var(--primary)" : "var(--text-muted)";

    block.appendChild(el("div", { className: "phase-title" }, [
      el("span", {
        style: `width:10px;height:10px;border-radius:50%;background:${statusColor};display:inline-block;`,
      }),
      document.createTextNode(phase.name),
    ]));
    block.appendChild(el("div", { className: "phase-status", textContent: statusLabel }));

    for (const deptId of phase.departments) {
      const dept = DEPARTMENTS.find((d) => d.id === deptId);
      if (dept) {
        const deptEl = el("div", { className: "phase-dept" }, [
          el("span", { className: `status-dot ${dept.status}` }),
          el("a", {
            href: `#/departments`,
            textContent: dept.name,
            style: `color: inherit; text-decoration: none;`,
          }),
        ]);
        block.appendChild(deptEl);
      } else {
        // Planned departments without data yet
        block.appendChild(el("div", { className: "phase-dept" }, [
          el("span", { className: "status-dot pre_launch" }),
          document.createTextNode(deptId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())),
        ]));
      }
    }

    timeline.appendChild(block);
  }

  return timeline;
}

function renderDeptCards() {
  const grid = el("div", { className: "dept-cards" });

  for (const dept of DEPARTMENTS) {
    const card = el("div", { className: "dept-card" });

    // Header
    const header = el("div", { className: "dept-card-header" });
    header.appendChild(el("h3", { textContent: dept.name }));
    header.appendChild(el("span", {
      className: `badge ${getStatusBadgeClass(dept.status)}`,
      textContent: dept.status.replace("_", " "),
    }));
    card.appendChild(header);

    // Activation bar
    const activationPct = dept.totalClinicians > 0 ? dept.activeClinicians / dept.totalClinicians : 0;
    const activation = el("div", { className: "dept-activation" });
    activation.appendChild(el("div", { className: "dept-activation-label" }, [
      document.createTextNode("Clinician Activation"),
      el("span", { textContent: `${dept.activeClinicians} / ${dept.totalClinicians}` }),
    ]));
    const bar = el("div", { className: "dept-activation-bar" }, [
      el("div", {
        className: "dept-activation-fill",
        style: `width: ${activationPct * 100}%; background: ${getStatusColor(dept.status)};`,
      }),
    ]);
    activation.appendChild(bar);
    card.appendChild(activation);

    // Metrics row
    const metrics = el("div", { className: "dept-metrics-row" });
    metrics.appendChild(miniMetric("Utilization", dept.utilizationRate != null ? formatPercent(dept.utilizationRate) : "—"));
    metrics.appendChild(miniMetric("Time Saved", dept.avgTimeSavedPerWeek > 0 ? formatHours(dept.avgTimeSavedPerWeek) + "/wk" : "—"));
    metrics.appendChild(miniMetric("NPS", dept.npsScore != null ? dept.npsScore.toString() : "—"));
    metrics.appendChild(miniMetric("wRVU", dept.wrvuChange != null ? (dept.wrvuChange >= 0 ? "+" : "") + formatPercent(dept.wrvuChange) : "—"));
    card.appendChild(metrics);

    // Flagged clinicians
    const flagged = CLINICIANS.filter(
      (c) => c.department === dept.id && (c.riskLevel === "high" || c.championStatus === "disengaged")
    );
    if (flagged.length > 0) {
      const flagSection = el("div", { className: "dept-flagged" });
      flagSection.appendChild(el("div", { className: "dept-flagged-title", textContent: "Needs Attention" }));
      for (const c of flagged) {
        flagSection.appendChild(el("div", { className: "dept-flagged-item" }, [
          el("a", {
            href: `#/clinician/${c.id}`,
            textContent: `${c.name} — ${c.riskLevel} risk, ${c.championStatus}`,
          }),
        ]));
      }
      card.appendChild(flagSection);
    }

    grid.appendChild(card);
  }

  return grid;
}

function miniMetric(label, value) {
  return el("div", { className: "dept-metric" }, [
    el("div", { className: "dept-metric-value", textContent: value }),
    el("div", { className: "dept-metric-label", textContent: label }),
  ]);
}

function renderComparisonTable() {
  const section = el("div", { className: "table-card" }, [
    el("h3", { textContent: "Department Comparison" }),
  ]);

  const table = el("table", { className: "data-table" });

  // Headers
  const thead = el("thead");
  const headerRow = el("tr");
  const columns = [
    { key: "name", label: "Department" },
    { key: "status", label: "Status" },
    { key: "activeClinicians", label: "Active" },
    { key: "utilizationRate", label: "Utilization" },
    { key: "avgTimeSavedPerWeek", label: "Time Saved/Wk" },
    { key: "npsScore", label: "NPS" },
    { key: "sameDayNoteClose", label: "Same-Day Close" },
    { key: "afterHoursReduction", label: "After-Hrs Reduction" },
  ];

  for (const col of columns) {
    const th = el("th", {
      innerHTML: `${col.label} <span class="sort-arrow">${sortCol === col.key ? (sortAsc ? "&#9650;" : "&#9660;") : ""}</span>`,
      onClick: () => {
        if (sortCol === col.key) sortAsc = !sortAsc;
        else { sortCol = col.key; sortAsc = true; }
        renderDepartments(document.getElementById("main-content"));
      },
    });
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Body
  const tbody = el("tbody");
  const sorted = [...DEPARTMENTS].sort((a, b) => {
    let aVal = a[sortCol];
    let bVal = b[sortCol];
    if (aVal == null) aVal = -Infinity;
    if (bVal == null) bVal = -Infinity;
    if (typeof aVal === "string") return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    return sortAsc ? aVal - bVal : bVal - aVal;
  });

  for (const dept of sorted) {
    const row = el("tr");
    row.appendChild(el("td", { innerHTML: `<strong>${dept.name}</strong>` }));
    row.appendChild(el("td", {}, [
      el("span", { className: `badge ${getStatusBadgeClass(dept.status)}`, textContent: dept.status.replace("_", " ") }),
    ]));
    row.appendChild(el("td", { textContent: `${dept.activeClinicians} / ${dept.totalClinicians}` }));
    row.appendChild(el("td", {
      className: getUtilizationCellClass(dept.utilizationRate),
      textContent: formatPercent(dept.utilizationRate),
    }));
    row.appendChild(el("td", { textContent: dept.avgTimeSavedPerWeek > 0 ? formatHours(dept.avgTimeSavedPerWeek) : "—" }));
    row.appendChild(el("td", {
      className: getNpsCellClass(dept.npsScore),
      textContent: dept.npsScore != null ? dept.npsScore.toString() : "—",
    }));
    row.appendChild(el("td", { textContent: dept.sameDayNoteClose != null ? formatPercent(dept.sameDayNoteClose) : "—" }));
    row.appendChild(el("td", { textContent: dept.afterHoursReduction > 0 ? formatPercent(dept.afterHoursReduction) : "—" }));
    tbody.appendChild(row);
  }

  table.appendChild(tbody);
  section.appendChild(table);
  return section;
}
