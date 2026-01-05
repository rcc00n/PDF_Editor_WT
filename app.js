const screens = Array.from(document.querySelectorAll('.screen'));
const navLinks = Array.from(document.querySelectorAll('.nav-link'));
const screenLinks = Array.from(document.querySelectorAll('[data-screen]'));
const appShell = document.querySelector('.app-shell');
const railToggle = document.querySelector('.rail-toggle');
const railStorageKey = 'relayforms:rail-collapsed';

const screenMap = screens.reduce((acc, screen) => {
  acc[screen.id] = screen;
  return acc;
}, {});

const setRailCollapsed = (collapsed) => {
  if (!appShell || !railToggle) return;
  appShell.classList.toggle('is-collapsed', collapsed);
  const label = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
  railToggle.setAttribute('aria-expanded', String(!collapsed));
  railToggle.setAttribute('aria-label', label);
  railToggle.setAttribute('title', label);
};

const setActiveScreen = (id) => {
  const next = screenMap[id] || screenMap.dashboard;
  screens.forEach((screen) => screen.classList.remove('is-active'));
  next.classList.add('is-active');

  navLinks.forEach((link) => {
    link.classList.toggle('is-active', link.dataset.screen === next.id);
  });

  const title = next.dataset.title || 'RelayForms';
  document.title = `RelayForms - ${title}`;
};

const handleScreenClick = (event) => {
  const target = event.target.closest('[data-screen]');
  if (!target) return;
  const id = target.dataset.screen;
  if (!id) return;
  window.location.hash = id;
};

window.addEventListener('hashchange', () => {
  const id = window.location.hash.replace('#', '');
  setActiveScreen(id);
});

screenLinks.forEach((link) => {
  link.addEventListener('click', handleScreenClick);
});

if (appShell && railToggle) {
  const stored = localStorage.getItem(railStorageKey);
  setRailCollapsed(stored === 'true');

  railToggle.addEventListener('click', () => {
    const next = !appShell.classList.contains('is-collapsed');
    setRailCollapsed(next);
    localStorage.setItem(railStorageKey, String(next));
  });
}

const initial = window.location.hash.replace('#', '') || 'dashboard';
setActiveScreen(initial);
