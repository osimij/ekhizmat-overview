/* ============================================================
   S1 · Главная смены (idle) · #/idle  (§6/S1)

   «Нулевая витрина данных»: приёмка требует, чтобы grep по DOM этого экрана
   не находил ни одного поля гражданина. Поэтому здесь нет и не может быть
   ничего о людях — только статистика смены оператора и номера заявлений,
   маскированные до последних цифр (§6/S1).
   ============================================================ */
import { h, mount, icon, mmss, modal } from '../ui.js';
import { t } from '../i18n.js';
import { dispatch, getState } from '../store.js';
import { shift } from '../mock/api.js';

export function renderIdle(host) {
  const st = getState();
  const stats = h('div', { class: 's-idle__stats stack g-6' }, skeletonStats());

  const start = h('button', {
    class: 'btn btn--primary btn--l s-idle__start',
    onClick: () => dispatch('START'),
  }, t('idle.start'), h('kbd', { class: 's-idle__kbd' }, 'F2'));

  mount(host,
    h('div', { class: 'canvas s-idle' },
      h('div', { class: 's-idle__main' },
        h('h1', { class: 'h2' }, t('idle.greeting', { name: st.operator?.name || '' })),
        h('p', { class: 'body-l ink-2' }, t('idle.ready', { n: st.bind?.window ?? '—' })),

        // Водяной знак-гирих 10% (§6/S1, §1 «тон»).
        // Водяного знака здесь нет намеренно. §3.3 требует, чтобы в пустом
        // центре «одно решение и ничто не конкурирует», а знак на 220px —
        // именно конкурент: единственная кнопка экрана перестаёт быть
        // единственным, на что падает взгляд. Пустота работает сама.
        h('div', { class: 's-idle__hero panel' },
          start,
          h('p', { class: 'small ink-faint' }, t('idle.emptyHint'))),

        // §6/S1 — обе кнопки ведут в реальные экраны (Д-09). Кнопка без
        // обработчика выглядит живой и врёт оператору о возможностях АРМ.
        h('div', { class: 'row g-4 s-idle__links' },
          h('button', {
            class: 'btn btn--ghost',
            onClick: () => { location.hash = '#/catalog-view'; },
          }, icon('search'), t('idle.catalog'), h('kbd', { class: 'kbd' }, '/')),
          h('button', { class: 'btn btn--ghost', onClick: openHelp },
            icon('info'), t('idle.help')))),

      stats));

  load();
  return () => {};

  async function load() {
    // §5.3 — скелетон обязателен на каждом экране с данными.
    const s = await shift.stats();
    mount(stats,
      h('section', { class: 'panel' },
        h('h2', { class: 'label' }, t('idle.today')),
        h('div', { class: 'def' },
          statRow(t('idle.served'), String(s.served)),
          statRow(t('idle.avg'), mmss(s.avgMs)),
          statRow(t('idle.issued'), String(s.issued)))),

      h('section', { class: 'panel' },
        h('h2', { class: 'label' }, t('idle.recent')),
        s.recent.length
          ? h('div', { class: 'def' }, ...s.recent.map(r =>
              h('div', { class: 'def__row' },
                // Только номер — ни ФИО, ни ИНН. Это и есть «без имён граждан!».
                h('span', { class: 'def__val def__val--tnum grow' }, `№ ${r.no}`),
                h('span', { class: 'pill pill--active' },
                  icon('check', { size: 16 }), t('idle.issuedMark')))))
          : h('p', { class: 'small ink-faint' }, t('idle.noRecent'))));
  }
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

function statRow(key, value) {
  return h('div', { class: 'def__row' },
    h('span', { class: 'def__key grow' }, key),
    h('span', { class: 'def__val def__val--tnum s-idle__stat' }, value));
}

function skeletonStats() {
  return [
    h('div', { class: 'panel stack g-3' },
      h('div', { class: 'skel skel--title' }),
      h('div', { class: 'skel skel--line' }),
      h('div', { class: 'skel skel--line' }),
      h('div', { class: 'skel skel--line' })),
    h('div', { class: 'panel stack g-3' },
      h('div', { class: 'skel skel--title' }),
      h('div', { class: 'skel skel--line' }),
      h('div', { class: 'skel skel--line' })),
  ];
}
