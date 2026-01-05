const screens = Array.from(document.querySelectorAll('.screen'));
const navLinks = Array.from(document.querySelectorAll('.nav-link'));
const screenLinks = Array.from(document.querySelectorAll('[data-screen]'));

const screenMap = screens.reduce((acc, screen) => {
  acc[screen.id] = screen;
  return acc;
}, {});

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

const initial = window.location.hash.replace('#', '') || 'dashboard';
setActiveScreen(initial);
