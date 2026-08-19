const KEYS = Object.freeze({
  theme: 'ekh.preferences.theme',
  lang: 'ekh.preferences.lang',
});
const LEGACY = Object.freeze({
  theme: ['ekh-theme', 'varm-theme', 'arm.theme'],
  lang: ['ekh-lang', 'varm-lang', 'arm.lang'],
});
/* Two sets, because a theme preference and a rendered theme are different
   things (design-guide §3 "Global preferences"): the user may choose `system`,
   and only light/dark can ever land on <html data-theme>. Keeping one set made
   `system` unstorable, which is why consoles grew private binary toggles. */
const THEME_CHOICES = new Set(['system', 'light', 'dark']);
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
const storedTheme = migrate('theme', THEME_CHOICES);
const storedLang = migrate('lang', LANGS);
const systemTheme = document.documentElement.hasAttribute('data-system-theme');
const colorScheme = matchMedia('(prefers-color-scheme: dark)');

const resolveSystem = () => (colorScheme.matches ? 'dark' : 'light');

/* `choice` is what the user picked and what persists; `theme` is what paints.
   A page pinned with data-system-theme has no choice to make. */
let choice = systemTheme ? 'system' : queryTheme || storedTheme || 'system';
let theme = choice === 'system' ? resolveSystem() : choice;
let lang = queryLang || storedLang || document.documentElement.lang || 'tg';
if (!LANGS.has(lang)) lang = 'tg';

export function applyPreferences() {
  document.documentElement.dataset.theme = theme;
  document.documentElement.lang = lang;
  document.documentElement.dataset.lang = lang;
  const mode = query.get('dev') === '1' ? 'dev' : query.get('present') === '1' ? 'present' : 'product';
  document.documentElement.dataset.mode = mode;
  window.dispatchEvent(new CustomEvent('ekh:preferences', { detail: { theme, choice, lang, mode } }));
}

export function getTheme() { return theme; }
/* What the user chose — 'system' | 'light' | 'dark'. A three-state control
   must show the choice, not the resolved result: with getTheme() alone a
   `system` picker on a dark machine renders "dark" as if it were explicit. */
export function getThemeChoice() { return systemTheme ? 'system' : choice; }
export function getLang() { return lang; }
export function getMode() { return document.documentElement.dataset.mode || 'product'; }

export function setTheme(next, { persist = true } = {}) {
  if (systemTheme) {
    theme = resolveSystem();
    applyPreferences();
    return;
  }
  if (!THEME_CHOICES.has(next)) return;
  choice = next;
  theme = next === 'system' ? resolveSystem() : next;
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
  // Follows the OS both when the page is pinned and when the user chose
  // `system` — otherwise "system" would only mean "system at load time".
  if (!systemTheme && choice !== 'system') return;
  theme = resolveSystem();
  applyPreferences();
});

addEventListener('storage', event => {
  if (!systemTheme && event.key === KEYS.theme && THEME_CHOICES.has(event.newValue)) {
    choice = event.newValue;
    theme = choice === 'system' ? resolveSystem() : choice;
  }
  if (event.key === KEYS.lang && LANGS.has(event.newValue)) lang = event.newValue;
  applyPreferences();
});

export { KEYS as PREFERENCE_KEYS };
