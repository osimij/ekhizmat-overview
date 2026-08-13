const KEYS = Object.freeze({
  theme: 'ekh.preferences.theme',
  lang: 'ekh.preferences.lang',
});
const LEGACY = Object.freeze({
  theme: ['ekh-theme', 'varm-theme', 'arm.theme'],
  lang: ['ekh-lang', 'varm-lang', 'arm.lang'],
});
const THEMES = new Set(['light', 'dark']);
const LANGS = new Set(['tg', 'ru', 'en']);

function read(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function write(key, value) {
  try { localStorage.setItem(key, value); } catch { /* preferences are non-critical */ }
}

function migrate(kind, allowed) {
  const current = read(KEYS[kind]);
  if (allowed.has(current)) return current;
  for (const legacy of LEGACY[kind]) {
    let value = read(legacy);
    try { value = JSON.parse(value); } catch { /* legacy plain string */ }
    if (allowed.has(value)) {
      write(KEYS[kind], value);
      return value;
    }
  }
  return null;
}

const query = new URLSearchParams(location.search);
const queryTheme = THEMES.has(query.get('theme')) ? query.get('theme') : null;
const queryLang = LANGS.has(query.get('lang')) ? query.get('lang') : null;
const storedTheme = migrate('theme', THEMES);
const storedLang = migrate('lang', LANGS);
const systemTheme = document.documentElement.hasAttribute('data-system-theme');
const colorScheme = matchMedia('(prefers-color-scheme: dark)');

let theme = systemTheme ? (colorScheme.matches ? 'dark' : 'light') : queryTheme || storedTheme || (colorScheme.matches ? 'dark' : 'light');
let lang = queryLang || storedLang || document.documentElement.lang || 'tg';
if (!LANGS.has(lang)) lang = 'tg';

export function applyPreferences() {
  document.documentElement.dataset.theme = theme;
  document.documentElement.lang = lang;
  document.documentElement.dataset.lang = lang;
  const mode = query.get('dev') === '1' ? 'dev' : query.get('present') === '1' ? 'present' : 'product';
  document.documentElement.dataset.mode = mode;
  window.dispatchEvent(new CustomEvent('ekh:preferences', { detail: { theme, lang, mode } }));
}

export function getTheme() { return theme; }
export function getLang() { return lang; }
export function getMode() { return document.documentElement.dataset.mode || 'product'; }

export function setTheme(next, { persist = true } = {}) {
  if (systemTheme) {
    theme = colorScheme.matches ? 'dark' : 'light';
    applyPreferences();
    return;
  }
  if (!THEMES.has(next)) return;
  theme = next;
  if (persist && !queryTheme) write(KEYS.theme, next);
  applyPreferences();
}

export function setLang(next, { persist = true } = {}) {
  if (!LANGS.has(next)) return;
  lang = next;
  if (persist && !queryLang) write(KEYS.lang, next);
  applyPreferences();
}

export function toggleTheme() { setTheme(theme === 'dark' ? 'light' : 'dark'); }

export function resetPreferences() {
  try {
    localStorage.removeItem(KEYS.theme);
    localStorage.removeItem(KEYS.lang);
    for (const values of Object.values(LEGACY)) values.forEach(key => localStorage.removeItem(key));
  } catch { /* storage can be blocked */ }
}

applyPreferences();

colorScheme.addEventListener('change', () => {
  if (!systemTheme) return;
  theme = colorScheme.matches ? 'dark' : 'light';
  applyPreferences();
});

addEventListener('storage', event => {
  if (!systemTheme && event.key === KEYS.theme && THEMES.has(event.newValue)) theme = event.newValue;
  if (event.key === KEYS.lang && LANGS.has(event.newValue)) lang = event.newValue;
  applyPreferences();
});

export { KEYS as PREFERENCE_KEYS };
