/* ============================================================
   storage.js — единственная дверь к localStorage и sessionStorage.

   §2.3.1 запрещает класть данные гражданина в localStorage/sessionStorage/
   cookies. Это требование DoD, а не пожелание, поэтому оно здесь не «принято
   на словах», а физически ограничено белым списком ключей.

   Всё, что можно хранить, — настройки рабочего места, а не человека за окошком:
     ekh.tson.bind         — последняя привязка ЦОН/окно (localStorage)
     ekh.preferences.*     — тема и язык
     ekh.tson.arm          — сессия оператора в ЭТОЙ вкладке (sessionStorage):
                             логин, роль, idle-роут. Гражданин сюда не попадает.
                             F5 и HMR оставляют оператора на месте; Cmd+Shift+R /
                             Ctrl+F5 / закрытие вкладки / выход возвращают на S0.

   Добавлять сюда ключ можно только с ответом на вопрос: «может ли в нём
   когда-нибудь оказаться что-то о гражданине?». Если да — нельзя.
   ============================================================ */

const ALLOWED = new Set(['ekh.tson.bind', 'ekh.preferences.theme', 'ekh.preferences.lang']);
const SAFE_ORIGIN_KEYS = new Set([
  ...ALLOWED,
  'ekh.citizen.auth',
  'ekh.admin.rail',
  'ekh.ministry.side',
]);

const SESSION_ALLOWED = new Set(['ekh.tson.arm', 'ekh.ministry.arm']);
const IDLE_ROUTES = new Set([
  '#/idle',
  '#/catalog-view',
  '#/dashboard-center',
  '#/dashboard-leadership',
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

/* ---------- сессия оператора (вкладка) ----------
   Только то, без чего рабочее место после F5 выглядит как новый вход:
   кто за компьютером, куда привязаны, какой экран смены открыт. Приём
   гражданина намеренно отсутствует — рефреш из сессии безопасен. */

export function idleRoute(hash) {
  const raw = hash || '';
  const clean = raw.split('?')[0];
  return IDLE_ROUTES.has(clean) ? raw : '';
}

export function readArm() {
  try {
    const snap = JSON.parse(sessionStorage.getItem('ekh.tson.arm') || 'null');
    if (!snap?.operator?.login || typeof snap.operator.login !== 'string') return null;
    if (snap.operator.name != null && typeof snap.operator.name !== 'string') return null;
    return snap;
  } catch {
    return null;
  }
}

export function writeArm(payload) {
  try {
    sessionStorage.setItem('ekh.tson.arm', JSON.stringify({
      operator: {
        login: payload.operator.login,
        name: payload.operator.name,
      },
      bind: payload.bind ? {
        tson: payload.bind.tson,
        window: payload.bind.window,
        tsonName: payload.bind.tsonName,
      } : null,
      role: payload.role || 'operator',
      route: idleRoute(payload.route) || '#/idle',
      shift: payload.shift ? {
        served: payload.shift.served || 0,
        avgMs: payload.shift.avgMs || 0,
        issued: payload.shift.issued || 0,
      } : undefined,
    }));
  } catch {
    /* Приватный режим. Потеря сессии вкладки стоит оператору повторного MFA. */
  }
}

export function clearArm() {
  try { sessionStorage.removeItem('ekh.tson.arm'); } catch { /* ignore */ }
}

/* Cmd+Shift+R / Ctrl+Shift+R / Ctrl+F5 / Shift+F5 — намеренный сброс к S0.
   Обычный F5, Cmd+R и Vite HMR (location.reload без Shift) сессию не трогают. */
export function bindHardReloadReset() {
  addEventListener('keydown', e => {
    const hardR = (e.key === 'r' || e.key === 'R') && (e.metaKey || e.ctrlKey) && e.shiftKey;
    const hardF5 = e.key === 'F5' && (e.shiftKey || e.ctrlKey);
    if (hardR || hardF5) clearArm();
  }, true);
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
  const sessionForeign = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const k = sessionStorage.key(i);
    if (!SESSION_ALLOWED.has(k)) sessionForeign.push(k);
  }
  return {
    ok: foreign.length === 0,
    allowed: [...ALLOWED].filter(k => localStorage.getItem(k) !== null),
    foreign,
    sessionStorageKeys: sessionStorage.length,
    sessionForeign,
    cookies: document.cookie ? document.cookie.split(';').map(c => c.split('=')[0].trim()) : [],
  };
}
