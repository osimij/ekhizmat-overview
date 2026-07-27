import { getLang, getMode } from './preferences.js';

const DEMO_PREFIXES = ['ekh.citizen.', 'ekh.tson.', 'ekh.ministry.', 'ekh.admin.'];

function removeMatching(prefixes) {
  try {
    Object.keys(localStorage)
      .filter(key => prefixes.some(prefix => key.startsWith(prefix)))
      .forEach(key => localStorage.removeItem(key));
    sessionStorage.clear();
  } catch { /* demo reset remains optional when storage is blocked */ }
}

export function mountDemoTools() {
  if (getMode() !== 'dev' || document.querySelector('[data-demo-tools]')) return;
  const lang = getLang() === 'ru' ? 'ru' : 'tg';
  const platform = document.body.dataset.platform;
  const root = document.createElement('aside');
  root.className = 'ekh-demo-tools';
  root.dataset.demoTools = '';
  root.dataset.devOnly = '';
  root.setAttribute('aria-label', lang === 'ru' ? 'Инструменты демо' : 'Абзорҳои намоиш');
  root.innerHTML = `
    <strong>${lang === 'ru' ? 'Демо' : 'Намоиш'}</strong>
    <button class="btn btn-sec btn-sm" type="button" data-reset-current>${lang === 'ru' ? 'Сбросить платформу' : 'Тоза кардани платформа'}</button>
    <button class="btn btn-danger btn-sm" type="button" data-reset-all>${lang === 'ru' ? 'Сбросить всё демо' : 'Тоза кардани ҳамаи намоиш'}</button>`;
  root.querySelector('[data-reset-current]').addEventListener('click', () => {
    if (platform) removeMatching([`ekh.${platform}.`]);
    location.reload();
  });
  root.querySelector('[data-reset-all]').addEventListener('click', () => {
    removeMatching(DEMO_PREFIXES);
    location.reload();
  });
  document.body.append(root);
}
