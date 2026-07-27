/* ============================================================
   i18n.js — §10. Рабочий язык прототипа — русский, но словарь строится
   сразу под i18n: t('consent.waiting'), JSON-словари ru.json / tg.json.
   Переключатель в topbar меняет язык без перезагрузки.
   ============================================================ */
import { load, save } from './storage.js';

const dictionaryUrls = {
  ru: new URL('../i18n/ru.json', import.meta.url),
  tg: new URL('../i18n/tg.json', import.meta.url),
};

let dict = {};
let lang = 'ru';
const listeners = new Set();

/* Загрузка на старте. НЕ глушим ошибку: без словаря весь интерфейс
   вырождается в ключи разработчика («login.submit», «LOGIN.PASSWORD»), и
   оператор получает рабочее с виду место, набранное отладочным мусором.
   Пусть лучше boot() покажет честное «АРМ не запустился» с кнопкой повтора. */
export async function initI18n() {
  const requested = new URLSearchParams(location.search).get('lang');
  lang = requested === 'ru' || requested === 'tg' ? requested : load('ekh.preferences.lang', 'ru');
  dict = await fetchDict(lang).catch(async e => {
    // Сохранённый язык мог быть tg, а tg.json появляется только в Ф6 (§12).
    // Это не повод падать — падаем, только если недоступен и русский.
    if (lang === 'ru') throw e;
    console.warn(`i18n: словарь "${lang}" недоступен, откатываюсь на ru`, e);
    lang = 'ru';
    return fetchDict('ru');
  });
  document.documentElement.lang = lang;
}

/* Переключение языка в рантайме — наоборот, падать нельзя: оператор нажал
   кнопку в топбаре, и потеря словаря не должна стоить ему смены. Остаёмся
   на текущем языке и говорим об этом в консоль. */
export async function setLang(next) {
  if (next === lang) return;
  try {
    dict = await fetchDict(next);
    lang = next;
    save('ekh.preferences.lang', next);
    document.documentElement.lang = next;
    listeners.forEach(fn => fn(next));
  } catch (e) {
    console.warn(`i18n: словарь "${next}" недоступен, остаёмся на "${lang}"`, e);
  }
}

async function fetchDict(code) {
  const url = dictionaryUrls[code];
  if (!url) throw new Error(`Неизвестный язык: ${code}`);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
  return r.json();
}

export function getLang() { return lang; }
export function onLangChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

/* t('idle.ready', {n: 4}) → «Окно № 4 готово к приёму»
   Отсутствующий ключ возвращает сам ключ — в интерфейсе это видно сразу,
   в отличие от пустой строки. */
export function t(key, vars) {
  let s = dict[key];
  if (s === undefined) {
    console.warn(`i18n: нет ключа "${key}" в ${lang}.json`);
    return key;
  }
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

/* Текст ошибки API — по КОДУ из словаря (§10, Д-10).

   Тексты ApiError захардкожены в моке по-русски (в проде их будет писать
   бэкенд), и рендер через e.message означал русские ошибки в таджикском
   интерфейсе — ровно в тот момент, когда оператору и так тяжело. Код же
   language-agnostic: err.OFFLINE переводится один раз и работает везде.

   message остаётся фолбэком, и это не лень: незнакомый код (бэкенд завёл
   новый, словарь ещё не догнал) лучше показать текстом сервера, чем ключом
   разработчика или пустотой. Молча — без console.warn из t(): отсутствие
   ключа здесь штатный сценарий, а не ошибка программиста. */
export function errText(e) {
  const key = e?.code ? `err.${e.code}` : null;
  if (key && dict[key] !== undefined) return dict[key];
  return e?.message || t('err.unknown');
}

/* plural(46, 'plural.services') → «услуг»; plural(31, …) → «услуга».
   Формы в словаре через «|»: "услуга|услуги|услуг".

   Берём min(index, forms.length - 1) не из лени, а чтобы словарь не врал:
   в русском форм три, в таджикском счётная форма одна. Требуя три везде, мы
   заставили бы переводчика написать «хизматрасонӣ|хизматрасонӣ|хизматрасонӣ»
   — то есть подделать грамматику под чужой язык. Одна форма в tg.json
   означает ровно то, что означает: она одна. */
export function plural(n, key) {
  const forms = String(dict[key] ?? key).split('|');
  return forms[Math.min(pluralIndex(Math.abs(n)), forms.length - 1)];
}

function pluralIndex(n) {
  if (lang !== 'ru') return 0;
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 0;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 1;
  return 2;
}
