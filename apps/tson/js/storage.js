/* ============================================================
   storage.js — единственная дверь к localStorage.

   §2.3.1 запрещает класть данные гражданина в localStorage/sessionStorage/
   cookies. Это требование DoD, а не пожелание, поэтому оно здесь не «принято
   на словах», а физически ограничено белым списком ключей.

   Всё, что можно хранить, — настройки рабочего места, а не человека за окошком:
     arm.bind   — последняя привязка ЦОН/окно. §6/S0: «Привязка запоминается —
                  на шаге 3 предзаполнено прошлое значение, обычно это один клик».
     arm.theme  — светлая/тёмная
     arm.lang   — ru/tg

   Добавлять сюда ключ можно только с ответом на вопрос: «может ли в нём
   когда-нибудь оказаться что-то о гражданине?». Если да — нельзя.
   ============================================================ */

const ALLOWED = new Set(['ekh.tson.bind', 'ekh.preferences.theme', 'ekh.preferences.lang']);
const SAFE_ORIGIN_KEYS = new Set([
  ...ALLOWED,
  'ekh.citizen.auth',
  'ekh.admin.rail',
]);

function guard(key) {
  if (!ALLOWED.has(key)) {
    throw new Error(
      `storage: ключ "${key}" не в белом списке. §2.3.1 запрещает хранить ` +
      `данные гражданина вне памяти. Если это настройка рабочего места — ` +
      `добавьте ключ в ALLOWED и объясните почему.`
    );
  }
}

export function load(key, fallback = null) {
  guard(key);
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;   // повреждённое значение не должно ронять вход в АРМ
  }
}

export function save(key, value) {
  guard(key);
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Приватный режим / переполнение. Настройки — не критичный путь:
       потеря привязки стоит оператору одного клика, падение — смены. */
  }
}

export function remove(key) {
  guard(key);
  localStorage.removeItem(key);
}

/* Проверка приёмки §13 «отсутствие данных в storage».
   Демо-панель показывает результат, чтобы это можно было продемонстрировать
   стейкхолдеру, а не обещать. */
export function audit() {
  const foreign = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!SAFE_ORIGIN_KEYS.has(k)) foreign.push(k);
  }
  return {
    ok: foreign.length === 0,
    allowed: [...ALLOWED].filter(k => localStorage.getItem(k) !== null),
    foreign,
    sessionStorageKeys: sessionStorage.length,
    cookies: document.cookie ? document.cookie.split(';').map(c => c.split('=')[0].trim()) : [],
  };
}
