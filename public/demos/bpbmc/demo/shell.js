import { createFixtures } from './fixtures.js';

const frame = document.querySelector('#bpbmc-frame');
const screen = document.querySelector('#demo-screen');
const toast = document.querySelector('#demo-toast');
const routes = await fetch(new URL('../routes.json', import.meta.url)).then(response => {
  if (!response.ok) throw new Error('The showcase screen manifest could not load.');
  return response.json();
});
const aliases = { admin:'main-admin', staff:'main-staff', doctor:'main-doctor', patient:'main-patient', public:'index', backup:'main-admin-backup-restore' };
let activeRoute = '';
let noticeTimer;
const demo = {
  data: createFixtures(),
  navigate(route) {
    const clean = String(route).replace(/^#?\/?/, '').split('?')[0].replace(/\.(?:php|html)$/, '');
    const destination = routes.some(entry => entry.route === clean) ? clean : aliases[clean] ?? clean;
    if (!routes.some(entry => entry.route === destination)) {
      demo.notify('This action is simulated in the frontend showcase. No server request was sent.');
      return;
    }
    if (location.hash === `#/${destination}`) render(destination);
    else location.hash = `#/${destination}`;
  },
  notify(message) {
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => { toast.hidden = true; }, 5000);
  },
  reset() {
    demo.data = createFixtures();
    render(activeRoute || 'main-admin');
    demo.notify('Fictional sample data has been reset.');
  },
};
window.BPBMCDemo = demo;

function render(requested) {
  const route = routes.some(item => item.route === requested) ? requested : aliases[requested] ?? requested;
  const entry = routes.find(item => item.route === route) ?? routes.find(item => item.route === 'main-admin');
  activeRoute = entry.route;
  demo.role = entry.role;
  document.title = `${entry.title} · BPBMC Frontend Demo`;
  for (const link of document.querySelectorAll('[data-role]')) {
    if (link.dataset.role === entry.role) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  screen.replaceChildren(...routes.filter(item => item.role === entry.role).map(item => {
    const option = document.createElement('option');
    option.value = item.route;
    option.textContent = item.title;
    option.selected = item.route === entry.route;
    return option;
  }));
  frame.title = `BPBMC ${entry.title} — fictional sample data`;
  frame.src = `pages/${entry.route}.html`;
}
window.addEventListener('hashchange', () => render(location.hash.slice(2) || 'main-admin'));
screen.addEventListener('change', () => demo.navigate(screen.value));
document.querySelector('#demo-reset').addEventListener('click', demo.reset);
render(location.hash.slice(2) || 'main-admin');
