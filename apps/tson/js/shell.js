/* ============================================================
   shell.js — анатомия шелла (§3.2): topbar 60 · session bar 48 · stepper 44.

   Session bar и stepper существуют только в сессии — не «скрыты», а
   отсутствуют в DOM (P1: «Нет сессии — в интерфейсе физически нет данных
   (не скрыты, а отсутствуют в DOM и памяти)»).
   ============================================================ */
import { h, mount, icon, maskName, maskInn, mmss, openLayer, confirmDanger } from './ui.js';
import { t, getLang, setLang } from './i18n.js';
import { getState, dispatch, __reset, ST, STEP } from './store.js';
import { load, save } from './storage.js';
import { endVisit } from './session.js';
import { fmtTime } from './format.js';
import { SCOPES } from './mock/data.js';
import { consent } from './mock/api.js';
import { ROLE, getRole, roleLabel, setRole, resetRole } from './role.js';

/* ---------- тема ---------- */
export function initTheme() {
  const requested = new URLSearchParams(location.search).get('theme');
  const saved = requested === 'dark' || requested === 'light' ? requested : load('ekh.preferences.theme', 'light');
  document.documentElement.dataset.theme = saved;
}

function toggleTheme() {
  const dark = document.documentElement.dataset.theme === 'dark';
  const next = dark ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  save('ekh.preferences.theme', next);
  return next;
}

/* ---------- topbar (§3.2) ---------- */
export function renderTopbar(host) {
  const st = getState();
  const dark = document.documentElement.dataset.theme === 'dark';

  const themeBtn = h('button', {
    class: 'btn btn--ghost btn--icon', 'aria-label': t('shell.theme'),
    onClick: e => {
      const next = toggleTheme();
      mount(e.currentTarget, icon(next === 'dark' ? 'sun' : 'moon'));
    },
  }, icon(dark ? 'sun' : 'moon'));

  const langBtn = h('button', {
    class: 'btn btn--ghost btn--s', 'aria-label': t('shell.lang'),
    onClick: () => setLang(getLang() === 'ru' ? 'tg' : 'ru'),
  }, icon('globe', { size: 20 }), getLang().toUpperCase());

  // Привязка кликабельна → смена привязки (§3.2). Смена привязки без
  // перезахода — отдельный сценарий, которого нет в §6; поэтому здесь она
  // ведёт туда же, куда и «выйти»: перезайти и выбрать другое окно.
  //
  // Вне IDLE перезаход недопустим (у окна сидит гражданин), и раньше клик
  // просто молча ничего не делал при живой на вид кнопке (Д-24). Теперь
  // кнопка честно disabled и объясняет причину в title.
  const rebindable = st.app === ST.IDLE;
  const bind = st.bind
    ? h('button', {
        class: 'topbar__bind btn btn--ghost btn--s',
        title: rebindable ? t('shell.rebind') : t('shell.rebindBusy'),
        disabled: !rebindable,
        onClick: () => location.reload(),
      },
        icon('building', { size: 20 }),
        t('shell.window', { n: st.bind.window, tson: st.bind.tsonName || st.bind.tson }))
    : null;

  mount(host,
    h('div', { class: 'topbar__brand' },
      icon('logo'),
      h('strong', {}, t('app.name')),
      h('span', { class: 'ink-faint' }, '·'),
      h('span', { class: 'ink-2' }, t('app.arm')),
      st.operator ? h('span', { class: 'review-badge review-badge--stage' }, roleLabel()) : null),
    bind,
    h('span', { class: 'spacer' }),
    themeBtn,
    langBtn,
    st.operator ? operatorMenu(st) : null);
}

/* §3.2 — «меню оператора (смена, блокировка, выход)».
   В Ф1 кнопка просто блокировала: меню было не из чего строить. Теперь оно
   нужно и по §3.2, и по §6/S1 («конец дня — подсказка "Завершить смену" в
   меню оператора»). */
function operatorMenu(st) {
  const btn = h('button', {
    class: 'btn btn--ghost btn--s', 'aria-label': t('shell.operatorMenu'),
    'aria-haspopup': 'menu',
    onClick: () => openOperatorMenu(btn, st),
  }, icon('role', { size: 20 }), st.operator.name, icon('chev-d', { size: 16 }));
  return btn;
}

function openOperatorMenu(anchor, st) {
  const rect = anchor.getBoundingClientRect();
  let close = () => {};

  // Смену и выход в сессии не предлагаем: у окна сидит гражданин, и уйти,
  // не закрыв приём, значит бросить его данные в памяти. Сначала «Завершить
  // приём» — это же и есть wipe (§2.3.3).
  const inVisit = st.app === ST.SESSION;
  const demoRole = getLang() === 'tg' ? 'Нақши намоишӣ' : 'Демо-роль';

  const item = (icn, label, hint, onClick, disabled = false) => h('button', {
    class: 'menu__item', role: 'menuitem', disabled,
    onClick: () => { close(); onClick(); },
  },
    icon(icn, { size: 20 }),
    h('span', { class: 'grow' }, label),
    hint ? h('kbd', { class: 'menu__kbd' }, hint) : null);

  const node = h('div', {
    class: 'popover menu', role: 'menu', 'aria-label': t('shell.operatorMenu'),
    style: { top: `${rect.bottom + 8}px`, right: `${Math.round(innerWidth - rect.right)}px` },
  },
    h('div', { class: 'menu__head' },
      h('strong', {}, st.operator.name),
      h('span', { class: 'small ink-faint' },
        st.bind ? t('shell.window', { n: st.bind.window, tson: st.bind.tsonName || st.bind.tson }) : '')),
    h('hr', { class: 'rule' }),
    !inVisit ? h('span', { class: 'menu__label small ink-faint' }, demoRole) : null,
    !inVisit ? item('role', roleLabel(ROLE.OPERATOR), getRole() === ROLE.OPERATOR ? '✓' : null, () => switchRole(ROLE.OPERATOR)) : null,
    !inVisit ? item('building', roleLabel(ROLE.SUPERVISOR), getRole() === ROLE.SUPERVISOR ? '✓' : null, () => switchRole(ROLE.SUPERVISOR)) : null,
    !inVisit ? item('history', roleLabel(ROLE.LEADERSHIP), getRole() === ROLE.LEADERSHIP ? '✓' : null, () => switchRole(ROLE.LEADERSHIP)) : null,
    !inVisit ? h('hr', { class: 'rule' }) : null,
    item('lock', t('shell.lock'), 'Ctrl+L', () => dispatch('LOCK')),
    item('history', t('shell.endShift'), null, endShift, inVisit),
    item('out', t('shell.logout'), null, logout, inVisit),
    inVisit ? h('p', { class: 'small ink-faint menu__note' }, t('shell.busyHint')) : null);

  close = openLayer(node);

  function switchRole(next) {
    setRole(next);
    renderTopbar(document.getElementById('topbar'));
    location.hash = next === ROLE.SUPERVISOR ? '#/dashboard-center'
      : next === ROLE.LEADERSHIP ? '#/dashboard-leadership' : '#/idle';
  }
}

/* Обе кнопки ведут на S0 — и это не дубль. Завершение смены закрывает
   рабочий день (в проде — сводка и закрытие смены на бэкенде), выход просто
   освобождает окно для другого оператора. Разными их делает бэкенд, а не
   экран, но спрятать одну из них значило бы соврать про §3.2. */
function endShift() {
  const st = getState();
  confirmDanger({
    title: t('shell.endShiftTitle'),
    body: h('div', { class: 'stack g-2' },
      h('p', {}, t('shell.endShiftBody')),
      h('p', { class: 'small ink-faint' }, t('shell.endShiftStats', { n: st.shift.served }))),
    confirmText: t('shell.endShift'),
    onConfirm: leave,
  });
}

function logout() {
  confirmDanger({
    title: t('shell.logoutTitle'),
    body: h('p', {}, t('shell.logoutBody')),
    confirmText: t('shell.logout'),
    onConfirm: leave,
  });
}

/* Уход с рабочего места = полный сброс к S0. Тем же путём, что и рефреш
   (§6/S0 приёмка): состояние собирается заново, в памяти не остаётся ничего. */
function leave() {
  resetRole();
  __reset();
  location.hash = '#/login';
}

/* ---------- session bar (§3.2) ----------
   Появляется ТОЛЬКО в сессии. ФИО и ИНН здесь всегда маскированы (§2.3.5) —
   полные значения живут только в рабочей зоне. */
export function renderSessionBar(host) {
  const st = getState();

  if (st.app !== ST.SESSION || !st.session) {
    host.replaceChildren();
    host.hidden = true;
    host.classList.remove('sessionbar--warn', 'sessionbar--danger');
    return;
  }
  host.hidden = false;

  if (st.session.guest) {
    mount(host,
      h('span', { class:'audience-badge audience-badge--guest' }, icon('user', { size:16 }), getLang() === 'tg' ? 'Меҳмон' : 'Гость'),
      h('span', { class:'small ink-2' }, getLang() === 'tg' ? 'Бе маълумоти шахсӣ' : 'Без персональных данных'),
      h('span', { class:'spacer' }),
      h('span', { class:'sessionbar__timer tnum', role:'timer', 'aria-live':'off', 'aria-label':t('session.ttl') }, mmss(30 * 60_000)),
      h('button', { class:'btn btn--danger btn--s', onClick:() => endVisit() }, t('session.end')));
    return;
  }

  const c = st.session.citizen?.profile || {};
  const n = st.session.scopes.length;

  mount(host,
    h('span', { class: 'dot green-ink' }),

    // §6/S9a — «Клик по имени → S5».
    h('button', {
      class: 'sessionbar__who',
      onClick: () => dispatch('GOTO', { step: STEP.DATA }),
      title: t('session.data'),
    }, maskName(c.full)),

    h('span', { class: 'ink-faint' }, '·'),
    h('span', { class: 'tnum' }, t('session.inn', { v: maskInn(c.inn) })),

    // §6/S9a — «Клик по чипу скоупов → поповер со списком».
    h('button', { class: 'chip', onClick: e => scopePopover(e.currentTarget, st) },
      icon('shield', { size: 16 }),
      t('session.access', { n }),
      icon('chev-d', { size: 16 })),

    h('button', {
      class: 'btn btn--ghost btn--s',
      onClick: () => dispatch('GOTO', { step: STEP.DATA }),
    }, icon('user-add', { size: 20 }), t('session.data')),

    h('span', { class: 'spacer' }),

    h('span', {
      class: 'sessionbar__timer tnum', role: 'timer', 'aria-live': 'off',
      'aria-label': t('session.ttl'),
    }, mmss(30 * 60_000)),

    h('button', { class: 'btn btn--danger btn--s', onClick: () => endVisit() },
      t('session.end')));
}

/* Таймер обновляет session.js (он один знает, сколько осталось), а рисует
   шелл — здесь же, где полоса и её пороги (§3.2). */
export function paintTimer(leftMs) {
  const bar = document.getElementById('sessionbar');
  const el = bar?.querySelector('.sessionbar__timer');
  if (!el) return;

  el.textContent = mmss(leftMs);
  bar.classList.toggle('sessionbar--warn', leftMs <= 5 * 60_000 && leftMs > 60_000);
  bar.classList.toggle('sessionbar--danger', leftMs <= 60_000);
}

/* §6/S9a — «скоуп · время выдачи · кем подтверждён». */
function scopePopover(anchor, st) {
  const rect = anchor.getBoundingClientRect();

  const node = h('div', {
    class: 'popover', role: 'dialog', 'aria-label': t('session.scopes'),
    style: { top: `${rect.bottom + 8}px`, left: `${rect.left}px` },
  },
    h('span', { class: 'label' }, t('session.scopes')),
    h('div', { class: 'stack g-3 popover__list' },
      // Время берём у «сервера» по каждому скоупу (Д-16): прогрессивно
      // выданный показывал чужое — момент начала сессии. Фолбэк на startedAt
      // остаётся на случай, когда сервер времени не знает.
      ...st.session.scopes.map(id => h('div', { class: 'stack g-1' },
        h('div', { class: 'row g-2' },
          icon('check', { size: 16, cls: 'green-ink' }),
          h('span', { class: 'grow' }, SCOPES[id]?.name || id)),
        // Подпись под каждым скоупом обязана совпадать с подписью под всем
        // поповером: «подтверждён гражданином» над строкой «получено при
        // личной явке» — это два разных ответа на один вопрос в одном окне.
        h('span', { class: 'small ink-faint' },
          t(consent.via() === 'enrollment' ? 'session.grantedAtEnrollment' : 'session.grantedAt',
            { t: fmtTime(consent.grantedAt(id) ?? st.session.startedAt) }))))),
    // §6/S9a — «кем подтверждён». Согласие приходит двумя путями: нажатием в
    // приложении (§6/S3) или личной явкой с паспортом (§6/S2b). Одна подпись
    // на оба означала бы, что поповер, существующий ради прозрачности, врёт
    // ровно про то, что должен объяснять.
    h('p', { class: 'small ink-faint' },
      t(consent.via() === 'enrollment' ? 'session.byEnrollment' : 'session.byCitizen')));

  openLayer(node);
}

/* ---------- stepper (§3.2) ----------
   Только на шагах оформления. Пройденные кликабельны, будущие disabled. */
const STEPS = [
  { id: STEP.CATALOG, key: 'step.service' },
  { id: STEP.FORM,    key: 'step.form' },
  { id: STEP.DOCS,    key: 'step.docs' },
  { id: STEP.RESULT,  key: 'step.result' },
];

export function renderStepper(host) {
  const st = getState();
  const i = STEPS.findIndex(s => s.id === st.step);

  // data — параллельный просмотр, а не шаг маршрута: степпер на нём не рисуем.
  if (st.app !== ST.SESSION || i === -1) {
    host.replaceChildren();
    host.hidden = true;
    return;
  }
  host.hidden = false;

  const nodes = [];
  STEPS.forEach((s, k) => {
    const done = k < i, active = k === i;

    // Назад с результата не ходят: заявление уже зарегистрировано, и «шаг
    // назад» означал бы правку принятого документа. §6/S8 предлагает вместо
    // этого «оформить ещё одну услугу».
    const clickable = done && st.step !== STEP.RESULT;

    nodes.push(h('button', {
      class: `step ${done ? 'step--done' : active ? 'step--active' : 'step--todo'}`,
      disabled: !clickable,
      'aria-current': active ? 'step' : null,
      onClick: () => clickable && dispatch('GOTO', { step: s.id }),
    },
      h('span', { class: 'step__dot' }, done ? icon('check', { size: 16 }) : String(k + 1)),
      h('span', { class: 'step__label' }, t(s.key))));

    if (k < STEPS.length - 1) nodes.push(h('span', { class: 'step__line' }));
  });

  mount(host, h('nav', { class: 'stepper', 'aria-label': t('step.aria') }, ...nodes));
}
