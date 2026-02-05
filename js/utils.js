// ============================================================
// Utility functions — DOM helpers, formatters, status logic
// ============================================================

export function $(selector, parent = document) {
  return parent.querySelector(selector);
}

export function el(tag, attrs = {}, children = []) {
  const elem = document.createElement(tag);
  for (const [key, val] of Object.entries(attrs)) {
    if (key === "className") elem.className = val;
    else if (key === "textContent") elem.textContent = val;
    else if (key === "innerHTML") elem.innerHTML = val;
    else if (key.startsWith("on")) elem.addEventListener(key.slice(2).toLowerCase(), val);
    else elem.setAttribute(key, val);
  }
  for (const child of children) {
    if (typeof child === "string") elem.appendChild(document.createTextNode(child));
    else if (child) elem.appendChild(child);
  }
  return elem;
}

export function formatPercent(val, decimals = 0) {
  if (val == null) return "—";
  return (val * 100).toFixed(decimals) + "%";
}

export function formatHours(val) {
  if (val == null || val === 0) return "—";
  return val.toFixed(1) + " hrs";
}

export function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function daysSince(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date("2026-02-05T00:00:00");
  return Math.floor((now - d) / (1000 * 60 * 60 * 24));
}

export function getStatusColor(status) {
  const map = {
    mature: "var(--success)",
    growing: "#10B981",
    ramping: "var(--warning)",
    at_risk: "var(--danger)",
    onboarding: "var(--info)",
    pre_launch: "var(--text-muted)",
  };
  return map[status] || "var(--text-muted)";
}

export function getStatusBadgeClass(status) {
  const map = {
    mature: "badge-green",
    growing: "badge-green",
    ramping: "badge-yellow",
    at_risk: "badge-red",
    onboarding: "badge-info",
    pre_launch: "badge-gray",
  };
  return map[status] || "badge-gray";
}

export function getUtilizationColorClass(rate) {
  if (rate == null) return "";
  if (rate >= 0.7) return "green";
  if (rate >= 0.5) return "yellow";
  return "red";
}

export function getUtilizationCellClass(rate) {
  if (rate == null) return "";
  if (rate >= 0.7) return "cell-green";
  if (rate >= 0.5) return "cell-yellow";
  return "cell-red";
}

export function getNpsCellClass(nps) {
  if (nps == null) return "";
  if (nps >= 50) return "cell-green";
  if (nps >= 30) return "cell-yellow";
  return "cell-red";
}

export function getRiskBadgeClass(risk) {
  const map = {
    none: "badge-green",
    low: "badge-blue",
    medium: "badge-yellow",
    high: "badge-red",
  };
  return map[risk] || "badge-gray";
}

export function getChampionBadgeClass(status) {
  const map = {
    champion: "badge-green",
    potential: "badge-blue",
    neutral: "badge-gray",
    resistant: "badge-yellow",
    disengaged: "badge-red",
  };
  return map[status] || "badge-gray";
}

export function getTrainingBadgeClass(status) {
  const map = {
    completed: "badge-green",
    in_progress: "badge-blue",
    scheduled: "badge-yellow",
    not_started: "badge-gray",
  };
  return map[status] || "badge-gray";
}

export function getSentimentIcon(sentiment) {
  const map = {
    positive: "+",
    neutral: "~",
    negative: "-",
  };
  return map[sentiment] || "~";
}

export function getSentimentBadgeClass(sentiment) {
  const map = {
    positive: "badge-green",
    neutral: "badge-gray",
    negative: "badge-red",
  };
  return map[sentiment] || "badge-gray";
}

export function getTrendArrow(trend) {
  const map = {
    increasing: "&#9650;",
    stable: "&#9654;",
    declining: "&#9660;",
  };
  return map[trend] || "";
}

export function getTrendClass(trend) {
  const map = {
    increasing: "trend-up",
    stable: "trend-flat",
    declining: "trend-down",
  };
  return map[trend] || "";
}

export function getInitials(name) {
  return name
    .replace(/^(Dr\.|NP|PA)\s+/i, "")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// localStorage helpers
export function loadJSON(key, fallback = null) {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJSON(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

export function navigate(hash) {
  window.location.hash = hash;
}
