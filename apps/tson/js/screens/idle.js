/* ============================================================
   S1 · Главная смены (idle) · #/idle  (§6/S1)

   «Нулевая витрина данных»: приёмка требует, чтобы grep по DOM этого экрана
   не находил ни одного поля гражданина. Поэтому здесь нет и не может быть
   ничего о людях — только статистика смены оператора и номера заявлений,
   маскированные до последних цифр (§6/S1).

   Раскладка — дом смены, не заставка: заголовок + одно главное действие,
   карточки KPI, последние заявления. Пустая панель вокруг кнопки убрана
   (design-guide §3 «Workstation idle», правило 28).
   ============================================================ */
import { h, mount, icon, mmss, modal, statusIcon } from '../ui.js';
import { t } from '../i18n.js';
import { dispatch, getState } from '../store.js';
import { shift } from '../mock/api.js';

export function renderIdle(host) {
  const st = getState();
  const body = h('div', { class: 's-idle__body' }, skeletonStats());

  const start = h('button', {
    class: 'btn btn--primary btn--l s-idle__start',
    onClick: () => dispatch('START'),
  }, t('idle.start'), h('kbd', { class: 'kbd' }, 'F2'));

  mount(host,
    h('div', { class: 'canvas s-idle' },
      h('header', { class: 's-idle__head' },
        h('div', { class: 'stack g-2 s-idle__intro' },
          h('h1', { class: 'page-title' }, t('idle.greeting', { name: st.operator?.name || '' })),
          h('p', { class: 'ink-2' }, t('idle.ready', { n: st.bind?.window ?? '—' }))),
        start),
      body));

  load();
  return () => {};

  async function load() {
    // §5.3 — скелетон обязателен на каждом экране с данными.
    const s = await shift.stats();
    mount(body, idleMain(
      h('section', { class: 'dashboard-kpis s-idle__kpis', 'aria-label': t('idle.today') },
        kpi(String(s.served), t('idle.served'), 'calendar', 'blue'),
        kpi(mmss(s.avgMs), t('idle.avg'), 'clock', 'amber'),
        kpi(String(s.issued), t('idle.issued'), 'cat-cert', 'green')),
      recentPanel(
        s.recent.length
          ? recentList(s.recent.map(r =>
              h('div', { class: 's-idle__recent-row' },
                // Только номер — ни ФИО, ни ИНН. Это и есть «без имён граждан!».
                h('span', { class: 'tnum' }, `№ ${r.no}`),
                statusIcon('success', t('idle.issuedMark')))))
          : h('p', { class: 'small ink-faint' }, t('idle.noRecent')))));
  }
}

function idleMain(kpis, recent) {
  return h('div', { class: 's-idle__main' },
    kpis,
    idleTools(),
    recent);
}

function recentPanel(content) {
  return h('section', { class: 'panel s-idle__recent' },
    h('h2', { class: 'h3 panel__title' }, t('idle.recent')),
    content);
}

/* Сетка 5×3: заявления заполняют колонки сверху вниз, третья колонка
   остаётся пустой, пока заявлений меньше 15. Пустые ячейки держат
   горизонтальную линейку на всю ширину панели. */
const RECENT_ROWS = 5;
const RECENT_COLS = 3;

function recentList(nodes) {
  const fill = RECENT_ROWS * RECENT_COLS;
  while (nodes.length < fill) {
    nodes.push(h('div', {
      class: 's-idle__recent-row s-idle__recent-row--empty',
      'aria-hidden': 'true',
    }));
  }
  return h('div', { class: 's-idle__recent-list' }, ...nodes);
}

/* §6/S1 — обе кнопки ведут в реальные экраны (Д-09). В ряд под KPI:
   редкие инструменты не конкурируют с «Начать приём». */
function idleTools() {
  return h('div', { class: 'row g-2 s-idle__tools' },
    h('button', {
      class: 'btn btn--ghost btn--s',
      title: t('idle.catalog'),
      onClick: () => { location.hash = '#/catalog-view'; },
    }, icon('search'), h('span', { class: 's-idle__tools-label' }, t('idle.catalog')),
      h('kbd', { class: 'kbd' }, '/')),
    h('button', {
      class: 'btn btn--ghost btn--s',
      title: t('idle.help'),
      onClick: openHelp,
    }, icon('info'), h('span', { class: 's-idle__tools-label' }, t('idle.help'))));
}

/* «Справка для оператора» (§6/S1, §11.6) — то, что оператор спрашивает у
   соседа в первую неделю: какие клавиши и из чего состоит приём. Модал, а не
   экран: справку читают, не уходя с главной, и закрывают Esc.

   Клавиши перечислены здесь, а обрабатываются в app.js и экранах. Список
   короткий намеренно: справка, которую надо листать, не помогает за окошком. */
const HOTKEYS = [
  { k: 'F2',       key: 'help.k.start' },
  { k: '/',        key: 'help.k.search' },
  { k: 'Ctrl+L',   key: 'help.k.lock' },
  { k: 'F9',       key: 'help.k.end' },
  { k: 'Ctrl+↵',   key: 'help.k.submit' },
  { k: 'Ctrl+S',   key: 'help.k.draft' },
  { k: 'Esc',      key: 'help.k.esc' },
  { k: '1 2 3',    key: 'help.k.methods' },
];

function openHelp() {
  let close = () => {};
  close = modal({
    title: t('help.title'),
    body: h('div', { class: 'stack g-6' },
      h('section', { class: 'stack g-3' },
        h('h3', { class: 'label' }, t('help.hotkeys')),
        h('div', { class: 'def' },
          ...HOTKEYS.map(x => h('div', { class: 'def__row' },
            h('span', { class: 'def__key' }, h('kbd', { class: 'kbd' }, x.k)),
            h('span', { class: 'def__val grow' }, t(x.key)))))),

      h('section', { class: 'stack g-3' },
        h('h3', { class: 'label' }, t('help.flowTitle')),
        h('ol', { class: 'stack g-2' },
          ...['help.flow1', 'help.flow2', 'help.flow3', 'help.flow4'].map((k, i) =>
            h('li', { class: 'row-start g-3' },
              h('span', { class: 'step__dot' }, String(i + 1)),
              h('span', { class: 'grow' }, t(k))))),
        h('p', { class: 'small ink-faint' }, t('help.privacy')))),
    actions: [
      h('button', { class: 'btn btn--primary', onClick: () => close() }, t('common.close')),
    ],
  });
}

function kpi(value, label, iconName, tone) {
  return h('article', { class: 'kpi s-idle__kpi' },
    h('div', { class: 's-idle__kpi-copy' },
      h('strong', { class: 'kpi__value' }, value),
      h('span', { class: 'kpi__label' }, label)),
    icon(iconName, { cls: `s-idle__kpi-icon s-idle__kpi-icon--${tone}` }));
}

function skeletonStats() {
  return idleMain(
    h('div', { class: 'dashboard-kpis s-idle__kpis' },
      h('div', { class: 'skel skel--card' }),
      h('div', { class: 'skel skel--card' }),
      h('div', { class: 'skel skel--card' })),
    recentPanel(recentList(
      Array.from({ length: 10 }, () =>
        h('div', { class: 's-idle__recent-row' }, h('div', { class: 'skel skel--line' }))))));
}
