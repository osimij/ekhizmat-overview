/* ============================================================
   app.js — входная точка. Сборка шелла, роутинг, горячие клавиши (§11.6),
   автоблокировка по бездействию (§7), заглушка на узком окне (§7).
   ============================================================ */
import { initI18n, onLangChange, t } from './i18n.js';
import { initTheme, renderTopbar, renderSessionBar, renderStepper, paintTimer } from './shell.js';
import { start as startRouter, refresh as refreshRoute } from './router.js';
import { getState, subscribe, dispatch, ST, STEP } from './store.js';
import { closeTopLayer, hasLayers } from './ui.js';
import { renderLogin, preloadTsons } from './screens/login.js';
import { renderIdle } from './screens/idle.js';
import { renderLocked } from './screens/locked.js';
import { renderIdentify } from './screens/identify.js';
import { renderEnroll } from './screens/enroll.js';
import { renderConsent } from './screens/consent.js';
import { renderCatalog } from './screens/catalog.js';
import { renderData } from './screens/data.js';
import { renderForm } from './screens/form.js';
import { renderDocs } from './screens/docs.js';
import { renderResult } from './screens/result.js';
import { startSessionClock, endVisit, ttlLeft } from './session.js';
import { initDemo } from './demo.js';
import { clock } from './clock.js';

const IDLE_LOCK_MS = 3 * 60_000;   // §7 — «Оператор ушёл (idle 3 мин) → LOCKED»
const MIN_WIDTH = 1280;            // §3.1 — минимум; ниже показываем заглушку (§7)

const SCREENS = {
  '#/login': renderLogin,
  '#/bind': renderLogin,
  '#/idle': renderIdle,
  // Справочный каталог вне приёма (§6/S1, Д-09) — тот же экран, режим только
  // на чтение: ни сессии, ни скоупов, ни старта оформления.
  '#/catalog-view': host => renderCatalog(host, { readonly: true }),
  '#/identify': renderIdentify,
  '#/enroll': renderEnroll,
  '#/consent': renderConsent,
  '#/session/catalog': renderCatalog,
  '#/session/data': renderData,
  '#/session/form': renderForm,
  '#/session/docs': renderDocs,
  '#/session/result': renderResult,
};

let teardown = () => {};
let demo;
let mounted = { route: null, locked: false };

async function boot() {
  initTheme();
  await initI18n();
  await preloadTsons();

  demo = initDemo();
  bindHotkeys();
  watchIdle();
  watchViewport();
  translateStatic();
  startSessionClock(paintTimer);

  // Шелл перерисовывается на каждое изменение состояния: session bar и
  // stepper обязаны исчезать из DOM в тот же тик, что и данные (P1).
  subscribe(() => {
    renderTopbar(document.getElementById('topbar'));
    renderSessionBar(document.getElementById('sessionbar'));
    renderStepper(document.getElementById('stepper'));
    paintTimer(ttlLeft());     // полосу только что пересобрали — вернём время
    demo.redraw();
  });

  // §10 — «Переключатель в topbar меняет язык без перезагрузки».
  //
  // В Ф1 здесь стоял location.reload(): словарь был один, и перезагрузка
  // ничего не стоила. С Ф2 она стала бы прямым багом — store.initial()
  // всегда AUTH (приёмка §6/S0 «рефреш возвращает на S0»), то есть оператор,
  // нажавший «TG» посреди приёма, терял бы сессию гражданина и шёл заново
  // сканировать QR. Поэтому пересобираем шелл и перемонтируем экран: текст
  // берётся из нового словаря, состояние остаётся на месте.
  onLangChange(() => {
    renderTopbar(document.getElementById('topbar'));
    renderSessionBar(document.getElementById('sessionbar'));
    renderStepper(document.getElementById('stepper'));
    paintTimer(ttlLeft());
    translateStatic();
    mounted.route = null;      // снимаем защиту от повторного монтирования
    refreshRoute();
  });

  renderTopbar(document.getElementById('topbar'));
  startRouter(renderRoute);
}

/* ---------- рендер экрана по роуту ----------
   Экран перемонтируется только при СМЕНЕ роута. Раньше здесь стоял
   безусловный рендер на каждое уведомление store — с Ф1 это сходило с рук,
   потому что уведомлений было мало. С Ф4 так нельзя: автосохранение S6
   дёргает store каждые 10 секунд, и безусловный ремоунт стирал бы форму
   вместе с фокусом прямо под руками оператора. Реактивность внутри экрана —
   дело экрана: он подписывается сам и обновляет свои узлы. */
function renderRoute(route, { locked }) {
  const screenRoot = document.getElementById('screen');
  const lockRoot = document.getElementById('lock-root');
  const shell = document.getElementById('shell');

  // LOCKED — слой поверх; канвас размывается, но остаётся смонтирован и жив:
  // сессия гражданина продолжает тикать (§6/S9c). Экран НЕ размонтируем —
  // teardown() убил бы таймеры, подписки и набранный, но ещё не сохранённый
  // текст формы, а блокировка не должна стоить оператору работы.
  if (locked) {
    if (mounted.locked) return;
    mounted.locked = true;
    shell.classList.add('is-blurred');
    shell.setAttribute('inert', '');       // под блюром ничего не сфокусировать
    renderLocked(lockRoot);
    return;
  }

  if (mounted.locked) {
    mounted.locked = false;
    shell.classList.remove('is-blurred');
    shell.removeAttribute('inert');
    lockRoot.replaceChildren();
  }

  if (mounted.route === route) return;
  mounted.route = route;

  teardown();
  teardown = () => {};

  const R = SCREENS[route];
  if (!R) { mounted.route = null; screenRoot.replaceChildren(); return; }

  teardown = R(screenRoot) || (() => {});
}

/* ---------- горячие клавиши (§11.6) ----------
   Здесь только глобальные. Клавиши, осмысленные на одном экране (1/2/3 —
   метод идентификации, Ctrl+Enter / Ctrl+S — форма), живут в своих экранах:
   глобальный обработчик пришлось бы учить состоянию, которое экран и так
   знает про себя. */
function bindHotkeys() {
  addEventListener('keydown', e => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);
    const st = getState();

    // Под замком горячих клавиш нет: замок на то и замок.
    if (st.app === ST.LOCKED) return;

    // Esc закрывает верхний слой (§9). Приоритет выше всех остальных клавиш.
    if (e.key === 'Escape' && hasLayers()) { e.preventDefault(); closeTopLayer(); return; }

    if (e.key === 'F2' && st.app === ST.IDLE) { e.preventDefault(); dispatch('START'); }

    // Esc на воротах = отмена приёма (§6/S2 hotkeys).
    if (e.key === 'Escape' && (st.app === ST.IDENTIFY || st.app === ST.CONSENT_WAIT)) {
      e.preventDefault();
      dispatch('CANCEL');
    }

    if (e.key === '/' && !typing) {
      e.preventDefault();
      // На S1 поля поиска нет, и раньше клавиша просто проваливалась (Д-09).
      // Ведём в справочный каталог — там автофокус уже стоит в поиске, так что
      // для оператора это тот же жест «искать услугу», просто из главной.
      if (st.app === ST.IDLE) { location.hash = '#/catalog-view'; return; }
      document.querySelector('.field__wrap--search input')?.focus();
    }

    if (e.key.toLowerCase() === 'l' && e.ctrlKey && st.app !== ST.AUTH && st.app !== ST.SETUP) {
      e.preventDefault();
      dispatch('LOCK');
    }

    // §11.6 — «F9 завершить приём (с подтверждением)». Через тот же модал
    // S9b, что и кнопка: подтверждение — свойство действия, а не кнопки.
    if (e.key === 'F9' && st.app === ST.SESSION) { e.preventDefault(); endVisit(); }
  });
}

/* ---------- автоблокировка (§7) ---------- */
function watchIdle() {
  let last = Date.now();
  const touch = () => { last = Date.now(); };

  for (const ev of ['pointerdown', 'keydown', 'wheel']) {
    addEventListener(ev, touch, { passive: true });
  }

  setInterval(() => {
    const st = getState();
    if (st.app === ST.AUTH || st.app === ST.SETUP || st.app === ST.LOCKED) return;
    // Ускорение таймеров из демо-панели касается и автоблокировки —
    // иначе её нельзя показать стейкхолдеру, не сидя три минуты молча.
    if (Date.now() - last > IDLE_LOCK_MS / clock.speed) dispatch('LOCK');
  }, 1000);
}

/* ---------- узкое окно (§7) ----------
   «Окно браузера < 1280px → полноэкранная заглушка "Разверните окно"».

   Слушаем И matchMedia, И resize. Дублирование намеренное: под эмуляцией
   вьюпорта (devtools, CDP) событие change у MediaQueryList не диспатчится —
   проверено, mq.matches становится true, а change не приходит. А проверять
   1280×720 QA будет именно через эмуляцию (§13). Цена пропущенного события
   тут не косметическая: заглушка прячет весь шелл, и АРМ выглядит мёртвым. */
function watchViewport() {
  const mq = matchMedia(`(min-width: ${MIN_WIDTH}px)`);
  const apply = () => document.body.classList.toggle('is-too-small', !mq.matches);

  mq.addEventListener('change', apply);
  addEventListener('resize', apply, { passive: true });
  apply();
}

/* Статические строки разметки — из словаря (§10). Их немного (заглушка §7),
   но оставить их русскими значило бы, что таджикский интерфейс говорит
   по-русски ровно тогда, когда оператору и так неудобно. */
function translateStatic() {
  for (const el of document.querySelectorAll('[data-i18n]')) {
    el.textContent = t(el.dataset.i18n);
  }
}

/* ---------- падение на старте ----------
   boot() делает несколько await (словарь, список ЦОНов). Любой из них может
   не доехать: сеть моргнула, файл не выложился, сервер отдал 500. Без этого
   обработчика promise отклонялся бы молча, и оператор в 9 утра видел бы
   ПУСТУЮ БЕЛУЮ СТРАНИЦУ — ни ошибки, ни кнопки. Это худший из возможных
   исходов (§7 требует внятной деградации), поэтому падение показываем явно
   и даём повторить, не заставляя искать F5. */
function fatal(err) {
  console.error('АРМ не запустился:', err);
  document.body.innerHTML = '';

  const box = document.createElement('div');
  box.className = 'canvas empty';
  box.innerHTML =
    `<svg class="icon icon--48" aria-hidden="true"><use href="assets/icons.svg#i-info"/></svg>
     <span class="empty__title">АРМ не запустился</span>
     <span class="empty__hint">Не удалось загрузить рабочее место.
       Проверьте связь и повторите. Если не помогает — сообщите в поддержку.</span>`;

  const retry = document.createElement('button');
  retry.className = 'btn btn--primary';
  retry.textContent = 'Повторить';
  retry.addEventListener('click', () => location.reload());

  box.append(retry);
  document.body.append(box);
}

boot().catch(fatal);
