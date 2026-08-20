/* ============================================================
   shell.js — анатомия шелла (§3.2): topbar 60 · session bar 48 · stepper 44.

   Session bar и stepper существуют только в сессии — не «скрыты», а
   отсутствуют в DOM (P1: «Нет сессии — в интерфейсе физически нет данных
   (не скрыты, а отсутствуют в DOM и памяти)»).
   ============================================================ */
import { h, mount, icon, maskName, maskInn, mmss, openLayer, closeTopLayer, confirmDanger } from './ui.js';
import { t, getLang, setLang, bindTsonName } from './i18n.js';
import { getState, dispatch, __reset, ST, STEP } from './store.js';
import { endVisit } from './session.js';
import { getThemeChoice, setTheme } from '/design-system/js/preferences.js';
import { fmtTime } from './format.js';
import { SCOPES } from './mock/data.js';
import { consent } from './mock/api.js';
import { ROLE, getRole, roleLabel, setRole, resetRole } from './role.js';

/* Тема принадлежит design-system/js/preferences.js — единственному владельцу
   ключей `ekh.preferences.*` (§1 правило 7). Свой initTheme/toggleTheme здесь
   был вторым владельцем того же ключа, писал его в другом формате (JSON-строка
   против голой) и запускался после await за словарём — отсюда и вспышка темы,
   и то, что сохранённый выбор был не виден общей библиотеке. Предотрисовку
   делает инлайновый скрипт в tson/index.html (§7). */

/* ---------- topbar (§3.2) ---------- */
export function renderTopbar(host) {
  const st = getState();

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
        t('shell.window', { n: st.bind.window, tson: bindTsonName(st.bind) }))
    : null;

  // Значок роли — только когда роль не подразумевается (§10 правила 4 и 6).
  // «Оператор» на каждом экране пересказывал умолчание: девять смен из десяти
  // это и есть оператор, и подпись не отвечала ни на один вопрос. Роль
  // руководителя или руководства, наоборот, объясняет, почему на экране
  // дашборд, — её показываем.
  const badge = st.operator && getRole() !== ROLE.OPERATOR
    ? h('span', { class: 'review-badge review-badge--stage' }, roleLabel())
    : null;

  mount(host,
    h('div', { class: 'topbar__brand' },
      icon('logo'),
      h('strong', {}, t('app.name')),
      h('span', { class: 'ink-faint' }, '·'),
      h('span', { class: 'ink-2' }, t('app.arm')),
      badge),
    bind,
    h('span', { class: 'spacer' }),
    // §3 «Top bar»: справа только слот роли. Тема и язык переехали в поповер
    // оператора (§3 «Global preferences», правило 12) — их ставят раз в смену,
    // и постоянное место в раме они не окупали. До входа карточки оператора
    // нет, поэтому там остаётся одна тихая иконка с теми же настройками:
    // сменить язык до логина оператор обязан уметь (§9). Ghost (синий)
    // здесь нельзя: blue на воротах — действие «Продолжить», а не шестерёнка.
    st.operator ? operatorMenu(st) : preferencesButton());
}

/* Кнопка настроек на экране входа. Тот же поповер, только без личной карточки
   и действий смены — их не к чему привязать, пока никто не вошёл.

   Открытие — как у меню оператора: повторный клик по шестерёнке закрывает,
   клик снаружи закрывает, Esc закрывает верхний слой. Раньше onClick только
   открывал ещё один слой: второй клик по триггеру не переключал, а стопкой
   клал второе меню, и снаружи закрыть было нечем. */
function preferencesButton() {
  let closeMenu = null;
  const btn = h('button', {
    class: 'btn btn--icon', 'aria-label': t('shell.preferences'),
    'aria-haspopup': 'menu', 'aria-expanded': 'false',
    onClick: () => {
      if (closeMenu) { closeMenu(); return; }
      closeMenu = openPreferencesMenu(btn, () => { closeMenu = null; });
    },
  }, icon('gear', { size: 20 }));
  return btn;
}

function openPreferencesMenu(anchor, onClose) {
  const rect = anchor.getBoundingClientRect();
  const node = h('div', {
    class: 'popover menu', role: 'menu', 'aria-label': t('shell.preferences'),
    style: {
      top: `${rect.bottom + 8}px`,
      right: `${Math.round(innerWidth - rect.right)}px`,
      transformOrigin: 'top right',
    },
  }, ...preferencesGroup());
  return openAnchoredPopover(anchor, node, { onClose });
}

/* Поповер, привязанный к кнопке: клик по триггеру не считается «снаружи»
   (иначе pointerdown закрыл бы меню, а click сразу открыл бы его снова),
   а выносной список языков — сосед в #layers, не потомок, поэтому его тоже
   не считаем кликом мимо. Закрытие родителя убирает и живой flyout. */
function openAnchoredPopover(anchor, node, { onClose } = {}) {
  let close = () => {};
  anchor.setAttribute('aria-expanded', 'true');

  const onPointerDown = e => {
    const el = e.target instanceof Element ? e.target : e.target?.parentElement;
    if (el && (node.contains(el) || anchor.contains(el) || el.closest('#layers .menu--flyout'))) return;
    close();
  };
  document.addEventListener('pointerdown', onPointerDown);
  close = openLayer(node, {
    onClose: () => {
      document.removeEventListener('pointerdown', onPointerDown);
      anchor.setAttribute('aria-expanded', 'false');
      if (document.querySelector('#layers .menu--flyout:not([inert])')) closeTopLayer();
      onClose?.();
    },
  });
  return close;
}

/* ---------- настройки (§3 «Global preferences», правило 12) ----------
   Язык и тема живут за личностью, а не в постоянной раме: их ставят раз в
   смену, и место в топбаре они не окупали. Анатомия — как у профиля админки:
   строка языка с выносным списком и трёхпозиционный выбор темы. Глобуса
   в строке языка нет: подпись уже называет контроль, икона была вторым
   представлением того же факта (§10 правила 5–6). */
function preferencesGroup() {
  let closeFlyout = null;
  const langRow = h('button', {
    class: 'menu__item menu__row', role: 'menuitem',
    'aria-haspopup': 'menu', 'aria-expanded': 'false',
    onClick: () => {
      if (closeFlyout) { closeFlyout(); return; }
      closeFlyout = openLangFlyout(langRow, () => { closeFlyout = null; });
    },
  },
    h('span', { class: 'grow' }, t('shell.lang')),
    h('span', { class: 'menu__value' }, t(`lang.${getLang()}`)),
    icon('chev-r', { size: 16, cls: 'menu__chev' }));

  return [
    h('span', { class: 'menu__label small ink-faint' }, t('shell.preferences')),
    langRow,
    themeRow(),
  ];
}

/* Три состояния, а не переключатель: «системная» — это отдельный ответ, а не
   отсутствие ответа (§3). aria-pressed объявляет выбранное, поэтому подпись
   каждой кнопки называет именно её состояние, а не действие (§9). */
function themeRow() {
  const options = [
    { id: 'system', icn: 'theme-system', key: 'shell.themeSystem' },
    { id: 'light', icn: 'sun', key: 'shell.themeLight' },
    { id: 'dark', icn: 'moon', key: 'shell.themeDark' },
  ];

  const row = h('div', { class: 'menu__row menu__row--theme' },
    h('span', { class: 'grow' }, t('shell.theme')),
    h('div', { class: 'menu__choices', role: 'group', 'aria-label': t('shell.theme') },
      ...options.map(o => h('button', {
        class: 'menu__choice',
        'aria-pressed': String(getThemeChoice() === o.id),
        'aria-label': t(o.key), title: t(o.key),
        onClick: () => {
          setTheme(o.id);
          row.querySelectorAll('.menu__choice').forEach((b, i) => {
            b.setAttribute('aria-pressed', String(options[i].id === getThemeChoice()));
          });
        },
      }, icon(o.icn, { size: 16 })))));

  return row;
}

/* Выносной список языков. Отдельный слой, а не раскрывающийся блок: Esc тогда
   закрывает сначала его, а фокус возвращается на строку языка — это уже умеет
   openLayer, и второй такой механизм заводить незачем (§6). */
function openLangFlyout(row, onClose) {
  const rect = row.getBoundingClientRect();
  const langs = ['ru', 'tg'];
  let close = () => {};

  const node = h('div', {
    class: 'popover menu menu--flyout', role: 'menu', 'aria-label': t('shell.lang'),
    style: {
      top: `${Math.round(rect.top)}px`,
      right: `${Math.round(innerWidth - rect.left + 8)}px`,
      transformOrigin: 'top right',
    },
  }, ...langs.map(code => h('button', {
    class: 'menu__item', role: 'menuitemradio',
    'aria-checked': String(getLang() === code),
    onClick: () => {
      close();
      closeTopLayer();
      setLang(code);
    },
  },
    h('span', { class: 'grow' }, t(`lang.${code}`)),
    getLang() === code ? icon('check', { size: 16 }) : null)));

  close = openAnchoredPopover(row, node, { onClose });
  return close;
}

/* §3.2 — «меню оператора (смена, блокировка, выход)».
   В Ф1 кнопка просто блокировала: меню было не из чего строить. Теперь оно
   нужно и по §3.2, и по §6/S1 («конец дня — подсказка "Завершить смену" в
   меню оператора»). */
function operatorMenu(st) {
  let closeMenu = null;
  const btn = h('button', {
    class: 'btn btn--ghost btn--s topbar__operator', 'aria-label': t('shell.operatorMenu'),
    'aria-haspopup': 'menu', 'aria-expanded': 'false',
    onClick: () => {
      if (closeMenu) { closeMenu(); return; }
      closeMenu = openOperatorMenu(btn, st, () => { closeMenu = null; });
    },
  }, icon('role', { size: 20 }), st.operator.name, icon('chev-d', { size: 16 }));
  return btn;
}

function openOperatorMenu(anchor, st, onClose) {
  const rect = anchor.getBoundingClientRect();
  let close = () => {};

  // Смену и выход в сессии не предлагаем: у окна сидит гражданин, и уйти,
  // не закрыв приём, значит бросить его данные в памяти. Сначала «Завершить
  // приём» — это же и есть wipe (§2.3.3).
  const inVisit = st.app === ST.SESSION;

  const item = (icn, label, hint, onClick, disabled = false) => h('button', {
    class: 'menu__item', role: 'menuitem', disabled,
    onClick: () => { close(); onClick(); },
  },
    icon(icn, { size: 20 }),
    h('span', { class: 'grow' }, label),
    hint ? h('kbd', { class: 'menu__kbd' }, hint) : null);

  // Выбранная роль — настоящий radio с aria-checked и настоящей галочкой.
  // Раньше «✓» приезжала как подсказка горячей клавиши: скринридер читал её
  // как клавишу, а глаз — как символ неизвестного назначения (§9).
  const roleItem = (icn, id) => h('button', {
    class: 'menu__item', role: 'menuitemradio', 'aria-checked': String(getRole() === id),
    onClick: () => { close(); switchRole(id); },
  },
    icon(icn, { size: 20 }),
    h('span', { class: 'grow' }, roleLabel(id)),
    getRole() === id ? icon('check', { size: 16 }) : null);

  const node = h('div', {
    class: 'popover menu', role: 'menu', 'aria-label': t('shell.operatorMenu'),
    style: {
      top: `${rect.bottom + 8}px`,
      right: `${Math.round(innerWidth - rect.right)}px`,
      // §8 — поповер растёт из своего триггера, а не из середины себя.
      transformOrigin: 'top right',
    },
  },
    h('div', { class: 'menu__head' },
      h('strong', {}, st.operator.name),
      h('span', { class: 'small ink-faint' },
        st.bind ? t('shell.window', { n: st.bind.window, tson: bindTsonName(st.bind) }) : '')),
    h('hr', { class: 'rule' }),
    !inVisit ? h('span', { class: 'menu__label small ink-faint' }, t('shell.demoRole')) : null,
    !inVisit ? roleItem('role', ROLE.OPERATOR) : null,
    !inVisit ? roleItem('building', ROLE.SUPERVISOR) : null,
    !inVisit ? roleItem('manager', ROLE.LEADERSHIP) : null,
    h('hr', { class: 'rule' }),
    ...preferencesGroup(),
    h('hr', { class: 'rule' }),
    item('lock', t('shell.lock'), 'Ctrl+L', () => dispatch('LOCK')),
    item('clock-check', t('shell.endShift'), null, endShift, inVisit),
    item('out', t('shell.logout'), null, logout, inVisit),
    inVisit ? h('p', { class: 'small ink-faint menu__note' }, t('shell.busyHint')) : null);

  close = openAnchoredPopover(anchor, node, { onClose });
  return close;

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

/* Уход с рабочего места = полный сброс к S0: память, сессия вкладки, роль. */
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
      h('span', { class:'audience-badge audience-badge--guest' }, icon('user', { size:16 }), t('guest.badge')),
      h('span', { class:'small ink-2' }, t('guest.noPersonal')),
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
    style: {
      top: `${rect.bottom + 8}px`,
      left: `${rect.left}px`,
      transformOrigin: 'top left',   // §8 — растёт из чипа, а не из себя
    },
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
