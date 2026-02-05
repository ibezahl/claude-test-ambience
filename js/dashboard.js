// ============================================================
// Dashboard View — KPI cards, charts, alert panel
// ============================================================

import { ACCOUNT, DEPARTMENTS, CLINICIANS, UTILIZATION_TRENDS, ALERTS } from "./data.js";
import {
  el, formatPercent, formatHours, getUtilizationColorClass,
  navigate, loadJSON, saveJSON,
} from "./utils.js";

let utilizationChart = null;
let deptComparisonChart = null;

export function renderDashboard(container) {
  container.innerHTML = "";

  // Header
  const header = el("div", { className: "view-header" }, [
    el("h1", { textContent: "Dashboard" }),
    el("p", { textContent: `${ACCOUNT.name} — ${ACCOUNT.currentPhase}` }),
  ]);
  container.appendChild(header);

  // KPI cards
  container.appendChild(renderKPIs());

  // Charts
  container.appendChild(renderCharts());

  // Alerts
  container.appendChild(renderAlerts());
}

function renderKPIs() {
  const activeDepts = DEPARTMENTS.filter((d) => d.utilizationRate > 0);
  const overallUtil = activeDepts.reduce((s, d) => s + d.utilizationRate * d.activeClinicians, 0) /
    activeDepts.reduce((s, d) => s + d.activeClinicians, 0);
  const totalOnboarded = DEPARTMENTS.reduce((s, d) => s + d.activeClinicians, 0);
  const avgTimeSaved = activeDepts.reduce((s, d) => s + d.avgTimeSavedPerWeek * d.activeClinicians, 0) /
    activeDepts.reduce((s, d) => s + d.activeClinicians, 0);
  const npsScores = DEPARTMENTS.filter((d) => d.npsScore != null).map((d) => d.npsScore);
  const avgNps = npsScores.reduce((s, n) => s + n, 0) / npsScores.length;

  const grid = el("div", { className: "kpi-grid" });

  // Utilization
  const utilColor = getUtilizationColorClass(overallUtil);
  grid.appendChild(kpiCard("Utilization Rate", formatPercent(overallUtil), utilColor, "Across active departments"));

  // Onboarded
  const onboardPct = totalOnboarded / ACCOUNT.totalTarget;
  grid.appendChild(kpiCardWithProgress(
    "Clinicians Onboarded",
    `${totalOnboarded} / ${ACCOUNT.totalTarget}`,
    onboardPct,
    `${formatPercent(onboardPct)} of total target`
  ));

  // Time saved
  grid.appendChild(kpiCard("Avg Time Saved", formatHours(avgTimeSaved) + "/wk", avgTimeSaved >= 4 ? "green" : "yellow", "Target: 5 hrs/week"));

  // NPS
  const npsColor = avgNps >= 50 ? "green" : avgNps >= 30 ? "yellow" : "red";
  grid.appendChild(kpiCard("Account NPS", Math.round(avgNps).toString(), npsColor, "Weighted by department size"));

  return grid;
}

function kpiCard(label, value, colorClass, sub) {
  return el("div", { className: "kpi-card" }, [
    el("div", { className: "kpi-label", textContent: label }),
    el("div", { className: `kpi-value ${colorClass}`, textContent: value }),
    el("div", { className: "kpi-sub", textContent: sub }),
  ]);
}

function kpiCardWithProgress(label, value, pct, sub) {
  const bar = el("div", { className: "kpi-progress" }, [
    el("div", { className: "kpi-progress-bar", style: `width: ${pct * 100}%` }),
  ]);
  return el("div", { className: "kpi-card" }, [
    el("div", { className: "kpi-label", textContent: label }),
    el("div", { className: "kpi-value", textContent: value }),
    bar,
    el("div", { className: "kpi-sub", textContent: sub }),
  ]);
}

function renderCharts() {
  const grid = el("div", { className: "chart-grid" });

  // Utilization trend
  const trendCard = el("div", { className: "chart-card" }, [
    el("h3", { textContent: "Utilization Trend by Department" }),
    el("div", { className: "chart-container" }, [
      el("canvas", { id: "utilization-trend-chart" }),
    ]),
  ]);
  grid.appendChild(trendCard);

  // Department comparison
  const compCard = el("div", { className: "chart-card" }, [
    el("h3", { textContent: "Department Comparison" }),
    el("div", { className: "chart-container" }, [
      el("canvas", { id: "dept-comparison-chart" }),
    ]),
  ]);
  grid.appendChild(compCard);

  // Render charts after DOM insertion
  requestAnimationFrame(() => {
    renderUtilizationTrend();
    renderDeptComparison();
  });

  return grid;
}

function renderUtilizationTrend() {
  const canvas = document.getElementById("utilization-trend-chart");
  if (!canvas) return;

  if (utilizationChart) utilizationChart.destroy();

  const labels = UTILIZATION_TRENDS.map((d) => d.week);

  utilizationChart = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Family Medicine",
          data: UTILIZATION_TRENDS.map((d) => d.famMed != null ? +(d.famMed * 100).toFixed(1) : null),
          borderColor: "#059669",
          backgroundColor: "rgba(5,150,105,0.1)",
          tension: 0.3,
          pointRadius: 3,
          spanGaps: false,
        },
        {
          label: "Internal Medicine",
          data: UTILIZATION_TRENDS.map((d) => d.intMed != null ? +(d.intMed * 100).toFixed(1) : null),
          borderColor: "#2563EB",
          backgroundColor: "rgba(37,99,235,0.1)",
          tension: 0.3,
          pointRadius: 3,
          spanGaps: false,
        },
        {
          label: "Cardiology",
          data: UTILIZATION_TRENDS.map((d) => d.cardiology != null ? +(d.cardiology * 100).toFixed(1) : null),
          borderColor: "#D97706",
          backgroundColor: "rgba(217,119,6,0.1)",
          tension: 0.3,
          pointRadius: 3,
          spanGaps: false,
        },
        {
          label: "Orthopedics",
          data: UTILIZATION_TRENDS.map((d) => d.ortho != null ? +(d.ortho * 100).toFixed(1) : null),
          borderColor: "#DC2626",
          backgroundColor: "rgba(220,38,38,0.1)",
          tension: 0.3,
          pointRadius: 3,
          spanGaps: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: "index" },
      plugins: {
        legend: { position: "bottom", labels: { usePointStyle: true, padding: 16, font: { size: 11 } } },
        annotation: undefined,
      },
      scales: {
        y: {
          min: 0,
          max: 100,
          ticks: {
            callback: (v) => v + "%",
            font: { size: 11 },
          },
          grid: { color: "rgba(0,0,0,0.04)" },
        },
        x: {
          ticks: { font: { size: 11 } },
          grid: { display: false },
        },
      },
    },
    plugins: [
      {
        id: "targetLine",
        beforeDraw(chart) {
          const { ctx, chartArea, scales } = chart;
          const y = scales.y.getPixelForValue(60);
          ctx.save();
          ctx.strokeStyle = "rgba(100,116,139,0.4)";
          ctx.lineWidth = 1;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(chartArea.left, y);
          ctx.lineTo(chartArea.right, y);
          ctx.stroke();
          ctx.fillStyle = "rgba(100,116,139,0.6)";
          ctx.font = "10px -apple-system, sans-serif";
          ctx.fillText("60% target", chartArea.right - 60, y - 6);
          ctx.restore();
        },
      },
    ],
  });
}

function renderDeptComparison() {
  const canvas = document.getElementById("dept-comparison-chart");
  if (!canvas) return;

  if (deptComparisonChart) deptComparisonChart.destroy();

  const activeDepts = DEPARTMENTS.filter((d) => d.utilizationRate > 0);
  const labels = activeDepts.map((d) => d.name);

  deptComparisonChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Utilization %",
          data: activeDepts.map((d) => +(d.utilizationRate * 100).toFixed(1)),
          backgroundColor: "#2563EB",
          borderRadius: 4,
        },
        {
          label: "Same-Day Note Close %",
          data: activeDepts.map((d) => d.sameDayNoteClose != null ? +(d.sameDayNoteClose * 100).toFixed(1) : 0),
          backgroundColor: "#059669",
          borderRadius: 4,
        },
        {
          label: "NPS",
          data: activeDepts.map((d) => d.npsScore || 0),
          backgroundColor: "#D97706",
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom", labels: { usePointStyle: true, padding: 16, font: { size: 11 } } },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { font: { size: 11 } },
          grid: { color: "rgba(0,0,0,0.04)" },
        },
        x: {
          ticks: { font: { size: 11 } },
          grid: { display: false },
        },
      },
    },
  });
}

function renderAlerts() {
  const section = el("div", { className: "alerts-panel card" }, [
    el("h3", { textContent: "Action Items" }),
  ]);

  const addressedAlerts = loadJSON("addressed-alerts", []);
  const list = el("div", { className: "alert-list" });

  // Sort: high first, then medium, then info
  const severityOrder = { high: 0, medium: 1, info: 2 };
  const sorted = [...ALERTS].sort((a, b) => (severityOrder[a.severity] || 9) - (severityOrder[b.severity] || 9));

  for (const alert of sorted) {
    const isAddressed = addressedAlerts.includes(alert.id);
    const item = el("div", { className: `alert-item ${isAddressed ? "addressed" : ""}` });

    const dot = el("div", { className: `alert-dot ${alert.severity}` });
    item.appendChild(dot);

    const body = el("div", { className: "alert-body" });
    const msgEl = el("div", { className: "alert-message" });
    if (alert.clinicianId) {
      const link = el("a", {
        href: `#/clinician/${alert.clinicianId}`,
        innerHTML: alert.message,
      });
      msgEl.appendChild(link);
    } else {
      msgEl.textContent = alert.message;
    }
    body.appendChild(msgEl);
    body.appendChild(el("div", { className: "alert-action", textContent: alert.suggestedAction }));
    item.appendChild(body);

    const meta = el("div", { className: "alert-meta" });
    meta.appendChild(el("span", { className: "alert-date", textContent: alert.createdDate }));
    const btn = el("button", {
      className: "btn-mark",
      textContent: isAddressed ? "Reopen" : "Mark Addressed",
      onClick: () => {
        const current = loadJSON("addressed-alerts", []);
        if (isAddressed) {
          saveJSON("addressed-alerts", current.filter((id) => id !== alert.id));
        } else {
          saveJSON("addressed-alerts", [...current, alert.id]);
        }
        renderDashboard(document.getElementById("main-content"));
      },
    });
    meta.appendChild(btn);
    item.appendChild(meta);

    list.appendChild(item);
  }

  section.appendChild(list);
  return section;
}
