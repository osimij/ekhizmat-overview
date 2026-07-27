/* ============================================================
   router.js — hash-роутер + guards приватности (§2.3).

   Роутер здесь подчинён машине состояний, а не наоборот. URL — это отражение
   state.app, а не команда к нему. Поэтому:

     · нельзя «попасть» на #/session/form, набрав его руками (§2.3.2);
     · нельзя вернуться к данным кнопкой «назад» после завершения (§6/S8);
     · в URL никогда не попадают ИНН/ФИО — только id шагов (§2.3.4).

   Из-за этого guard работает в обе стороны: он и не пускает URL вперёд машины,
   и переписывает URL, когда машина ушла сама (TTL, отзыв согласия).
   ============================================================ */
import { ST, STEP, getState, subscribe } from './store.js';

/* Роут → состояние, в котором он легален (§6, колонка «Роуты»). */
export const ROUTES = {
  '#/login':            ST.AUTH,
  '#/bind':             ST.SETUP,
  '#/idle':             ST.IDLE,
  // §6/S1 — справочный просмотр каталога без приёма (Д-09). Легален только в
  // IDLE: в сессии каталог свой, с оформлением, а до входа его нет вовсе.
  '#/catalog-view':     ST.IDLE,
  '#/identify':         ST.IDENTIFY,
  // §6/S2b. В URL — только имя шага: паспортные данные живут в экране и в
  // адресную строку не попадают ни в каком виде (§2.3.4).
  '#/enroll':           ST.ENROLL,
  '#/consent':          ST.CONSENT_WAIT,
  '#/session/catalog':  ST.SESSION,
  '#/session/data':     ST.SESSION,
  '#/session/form':     ST.SESSION,
  '#/session/docs':     ST.SESSION,
  '#/session/result':   ST.SESSION,
};

/* Куда отправлять, когда роут нелегален. Для сессионных — строго #/idle
   (§2.3.2: «иначе редирект в #/idle»). */
const HOME = {
  [ST.AUTH]: '#/login',
  [ST.SETUP]: '#/bind',
  [ST.IDLE]: '#/idle',
  [ST.IDENTIFY]: '#/identify',
  [ST.ENROLL]: '#/enroll',
  [ST.CONSENT_WAIT]: '#/consent',
  [ST.LOCKED]: null,   // LOCKED не имеет своего роута: экран закрыт поверх
};

/* Внутри SESSION роут определяется подсостоянием step (§2.2 «Решение»:
   линейный маршрут catalog → form → docs → result + параллельный data).
   Поэтому `#/session/*` — это не пять независимых адресов, а одно окно в
   текущий шаг: набрать #/session/form, стоя на каталоге, нельзя ровно так же,
   как нельзя перепрыгнуть шаг кнопкой (§3.2 «будущие — disabled»). */
const sessionRoute = () => `#/session/${getState().step || STEP.CATALOG}`;

let render = () => {};
let suppress = false;   // защита от рекурсии при программной правке hash

/* §2.3.4 — в URL только id шагов. Проверяем не «на глаз», а фактически:
   любой хвост с цифрами длиной от 6 (ИНН 9 цифр, телефон, номер паспорта)
   или с кириллицей (ФИО) — это утечка. */
const LOOKS_LIKE_PII = /[Ѐ-ӿ]|\d{6,}/;

export function routeFor(app) {
  if (app === ST.SESSION) return sessionRoute();
  return HOME[app] ?? '#/idle';
}

/* Главный guard. Возвращает роут, который РАЗРЕШЕНО показать сейчас. */
export function resolve(hash) {
  const { app } = getState();

  // LOCKED — не роут, а слой поверх. URL остаётся тем, где заблокировались,
  // но рендерим замок. Иначе «назад» после разблокировки уводил бы не туда.
  if (app === ST.LOCKED) return { route: hash.split('?')[0] || '#/login', locked: true };

  const clean = hash.split('?')[0] || '#/login';
  const need = ROUTES[clean];

  // Неизвестный роут или роут не для текущего состояния → домой по состоянию.
  if (!need || need !== app) return { route: routeFor(app), locked: false, redirected: true };

  // Роут состояния угадан, но шаг сессии — нет: ведём на текущий шаг.
  if (app === ST.SESSION && clean !== sessionRoute()) {
    return { route: sessionRoute(), locked: false, redirected: true };
  }

  return { route: clean, locked: false };
}

function apply() {
  if (suppress) return;

  const raw = location.hash || '#/login';

  // §2.3.4 — ПД в URL. Это баг программиста; чинить надо код, а не терпеть,
  // но в проде мы обязаны прежде всего убрать данные из адресной строки.
  if (LOOKS_LIKE_PII.test(decodeURIComponent(raw))) {
    console.error('router: в URL похоже на персональные данные — вычищаю (§2.3.4)');
    replace(routeFor(getState().app));
    return;
  }

  const { route, locked, redirected } = resolve(raw);

  if (redirected || route !== raw) replace(route);
  render(route, { locked });
}

function replace(route) {
  suppress = true;
  // replaceState, а не hash = ... : «назад» не должен возвращать на роут,
  // с которого нас только что выгнал guard (§6/S8 приёмка).
  history.replaceState(null, '', route);
  suppress = false;
}

export function go(route) {
  const { route: allowed } = resolve(route);
  if (allowed !== route) {
    console.warn(`router: ${route} недоступен из ${getState().app}, веду на ${allowed}`);
  }
  location.hash = allowed;
}

/* Перерисовать текущий роут заново. Нужно смене языка (§10): состояние не
   менялось, а весь текст — да. */
export function refresh() { apply(); }

export function start(renderFn) {
  render = renderFn;
  addEventListener('hashchange', apply);

  // Машина может уйти сама: TTL=0, отзыв согласия, блокировка (§7).
  // URL обязан догнать её, иначе адресная строка врёт о состоянии.
  subscribe(() => {
    const { route } = resolve(location.hash || '#/login');
    if (route !== location.hash) replace(route);
    render(route, { locked: getState().app === ST.LOCKED });
  });

  apply();
}
