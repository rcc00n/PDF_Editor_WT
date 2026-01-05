const screens = Array.from(document.querySelectorAll(".screen"));
const navLinks = Array.from(document.querySelectorAll(".nav-link"));
const screenLinks = Array.from(document.querySelectorAll("[data-screen]"));

const appShell = document.querySelector(".app-shell");
const railToggle = document.querySelector("#railToggle");
const railClose = document.querySelector("#railClose");
const overlay = document.querySelector("#overlay");
const mobileMenuBtn = document.querySelector("#mobileMenuBtn");
const topbarSubtle = document.querySelector("#topbarSubtle");

const railStorageKey = "relayforms:rail-collapsed";
const mobileDrawerKey = "relayforms:drawer-open";

const screenMap = screens.reduce((acc, screen) => {
  acc[screen.id] = screen;
  return acc;
}, {});

const isMobile = () => window.matchMedia("(max-width: 900px)").matches;

const setRailCollapsed = (collapsed) => {
  if (!appShell || !railToggle) return;
  appShell.classList.toggle("is-collapsed", collapsed);

  const label = collapsed ? "Expand sidebar" : "Collapse sidebar";
  railToggle.setAttribute("aria-expanded", String(!collapsed));
  railToggle.setAttribute("aria-label", label);
  railToggle.setAttribute("title", label);
};

const setDrawerOpen = (open) => {
  if (!appShell) return;
  appShell.classList.toggle("drawer-open", open);
  if (overlay) overlay.classList.toggle("is-active", open);

  if (open) localStorage.setItem(mobileDrawerKey, "true");
  else localStorage.removeItem(mobileDrawerKey);

  if (overlay) overlay.setAttribute("aria-hidden", String(!open));
};

const closeDrawerIfMobile = () => {
  if (isMobile()) setDrawerOpen(false);
};

const setActiveScreen = (id) => {
  const next = screenMap[id] || screenMap.dashboard;

  screens.forEach((s) => s.classList.remove("is-active"));
  next.classList.add("is-active");

  navLinks.forEach((link) => {
    link.classList.toggle("is-active", link.dataset.screen === next.id);
  });

  const title = next.dataset.title || "RelayForms";
  document.title = `RelayForms - ${title}`;

  if (topbarSubtle) topbarSubtle.textContent = title;
};

const handleScreenClick = (event) => {
  const target = event.target.closest("[data-screen]");
  if (!target) return;

  const id = target.dataset.screen;
  if (!id) return;

  window.location.hash = id;
  closeDrawerIfMobile();
};

window.addEventListener("hashchange", () => {
  const id = window.location.hash.replace("#", "");
  setActiveScreen(id);
});

screenLinks.forEach((link) => link.addEventListener("click", handleScreenClick));

if (appShell && railToggle) {
  const stored = localStorage.getItem(railStorageKey);
  setRailCollapsed(stored === "true");

  railToggle.addEventListener("click", () => {
    const next = !appShell.classList.contains("is-collapsed");
    setRailCollapsed(next);
    localStorage.setItem(railStorageKey, String(next));
  });
}

if (mobileMenuBtn) mobileMenuBtn.addEventListener("click", () => setDrawerOpen(true));
if (railClose) railClose.addEventListener("click", () => setDrawerOpen(false));
if (overlay) overlay.addEventListener("click", () => setDrawerOpen(false));

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") setDrawerOpen(false);
});

window.addEventListener("resize", () => {
  // При выходе с мобилки: закрыть drawer и вернуть нормальный layout
  if (!isMobile()) setDrawerOpen(false);
});

const initial = window.location.hash.replace("#", "") || "dashboard";
setActiveScreen(initial);

// Если хочешь помнить открытый drawer при перезагрузке на мобилке — можно включить:
if (isMobile() && localStorage.getItem(mobileDrawerKey) === "true") {
  setDrawerOpen(true);
}
