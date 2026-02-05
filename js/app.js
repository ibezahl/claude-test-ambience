// ============================================================
// App — hash-based routing and view switching
// ============================================================

import { renderDashboard } from "./dashboard.js";
import { renderClinicianDetail } from "./clinician-detail.js";
import { renderDepartments } from "./department-view.js";
import { renderChampions } from "./champions.js";

const mainContent = document.getElementById("main-content");

function route() {
  const hash = window.location.hash || "#/dashboard";
  const parts = hash.replace("#/", "").split("/");
  const view = parts[0];
  const param = parts[1] || null;

  // Update active nav
  document.querySelectorAll(".nav-item").forEach((item) => {
    const itemView = item.dataset.view;
    if (view === "clinician") {
      // Keep dashboard active when viewing clinician detail
      item.classList.toggle("active", itemView === "dashboard");
    } else {
      item.classList.toggle("active", itemView === view);
    }
  });

  // Render view
  switch (view) {
    case "dashboard":
      renderDashboard(mainContent);
      break;
    case "clinician":
      renderClinicianDetail(mainContent, param);
      break;
    case "departments":
      renderDepartments(mainContent);
      break;
    case "champions":
      renderChampions(mainContent);
      break;
    default:
      renderDashboard(mainContent);
  }

  // Scroll to top
  window.scrollTo(0, 0);
}

// Listen for hash changes
window.addEventListener("hashchange", route);

// Initial route
route();
