/* ============================================================
   S5 · Данные гражданина · #/session/data  (§6/S5)

   Двойная роль: самостоятельный экран и правая контекст-панель S6. Один
   модуль на обе — потому что это буквально «те же вкладки» (§6/S6), и две
   реализации разошлись бы в первый же день.

   Приёмка §6/S5: «ответ мок-API для невыданного скоупа — HTTP 403 без тела
   данных; UI это честно отражает». Здесь важно, чего в коде НЕТ: закрытая
   вкладка не блюрит и не прячет значения — она их не имеет. Данных нет ни в
   DOM, ни в памяти экрана, потому что сервер их не прислал.
   ============================================================ */
import { h, mount, icon, toast } from '../ui.js';
import { t, errText } from '../i18n.js';
import { getState, subscribe, dispatch, STEP } from '../store.js';
import { citizen } from '../mock/api.js';
import { requestScope } from '../scope.js';
import { ttlLeft } from '../session.js';
import { fmtTime } from '../format.js';
import { SCOPES, SCOPE_ORDER } from '../mock/data.js';

/* Самостоятельный экран (§6/S5). */
export function renderData(host) {
  const view = dataView({ compact: false });
  mount(host,
    h('div', { class: 'canvas s-data' },
      h('div', { class: 'row between s-data__head' },
        h('div', { class: 'stack g-1' },
          h('h1', { class: 'h2' }, t('data.title')),
          // §6/S5 каркас: «Доступ предоставлен до 14:32» (Д-19). Считаем от
          // остатка TTL, а не от startedAt: приём могли продлить, и тогда
          // время начала уже ничего не говорит о сроке доступа.
          h('p', { class: 'small ink-2' },
            t('data.accessUntil', { t: fmtTime(Date.now() + ttlLeft()) }))),
        h('button', {
          class: 'btn btn--secondary btn--s',
          onClick: () => dispatch('GOTO', { step: STEP.CATALOG }),
        }, icon('chev-l', { size: 20 }), t('data.back'))),
      view.el));
  return view.destroy;
}

/* Компактная панель-источник в S6 (§6/S6). */
export function renderDataPanel(host) {
  const view = dataView({ compact: true });
  mount(host,
    h('section', { class: 'panel stack g-3 s-data--compact' },
      h('h2', { class: 'label' }, t('data.panelTitle')),
      view.el));
  return view.destroy;
}

/* ============================================================
   Общая реализация
   ============================================================ */
function dataView({ compact }) {
  let dead = false;
  let active = null;
  const cache = new Map();          // скоуп → данные; живёт ровно столько же,
                                    // сколько сам view: wipe снимает экран.

  const tabsEl = h('div', { class: 'tabs', role: 'tablist', 'aria-label': t('data.title') });
  const paneEl = h('div', { class: 's-data__pane', role: 'tabpanel' });
  const el = h('div', { class: `s-data__box${compact ? ' is-compact' : ''}` }, tabsEl, paneEl);

  // Выданный скоуп может появиться в любой момент — из этой же панели или из
  // каталога. Вкладка обязана ожить «без перезагрузки» (§6/S5).
  const unsub = subscribe((_, event) => {
    if (event === 'SESSION_PATCH' && !dead) drawTabs();
  });

  drawTabs();
  select(active || 'profile');

  return {
    el,
    destroy() { dead = true; unsub(); },
  };

  function granted() { return getState().session?.scopes || []; }

  function drawTabs() {
    const have = granted();
    mount(tabsEl, ...SCOPE_ORDER.map(id => {
      const ok = have.includes(id);
      return h('button', {
        class: 'tab', role: 'tab', 'aria-selected': String(id === active),
        onClick: () => select(id),
      }, ok ? null : icon('lock', { size: 16 }), SCOPES[id].tab);
    }));
  }

  function select(id) {
    active = id;
    drawTabs();
    granted().includes(id) ? load(id) : locked(id);
  }

  /* ---------- выданный скоуп ---------- */
  async function load(id) {
    if (cache.has(id)) return paint(id, cache.get(id));

    mount(paneEl, skeleton());
    try {
      const data = await citizen.get(id);
      if (dead || active !== id) return;
      cache.set(id, data);
      paint(id, data);
    } catch (e) {
      if (dead || active !== id) return;
      mount(paneEl, h('div', { class: 'panel' },
        h('div', { class: 'banner banner--error' },
          icon('info'),
          h('span', { class: 'banner__text' },
            e.code === 'FORBIDDEN' ? t('data.forbidden') : errText(e)),
          h('button', { class: 'btn btn--ghost btn--s', onClick: () => load(id) }, t('common.retry')))));
    }
  }

  function paint(id, data) {
    const rows = ROWS[id](data);
    const src = data.source;

    mount(paneEl,
      h('div', { class: 'panel stack g-3' },
        // §7 «Реестр-источник недоступен» — снимок показываем, но честно
        // помечаем: свежесть подтвердить нечем.
        data.stale
          ? h('div', { class: 'banner banner--warn' },
              icon('info'),
              h('span', { class: 'banner__text' }, t('data.stale', { registry: src?.registry || '' })))
          : null,

        h('div', { class: 'def' }, ...rows),

        src
          ? h('div', { class: 'def__source' },
              icon(data.stale ? 'info' : 'check', { size: 16, cls: data.stale ? 'amber-ink' : 'green-ink' }),
              h('span', {}, t('data.source', { registry: src.registry, date: src.updated })))
          : null));
  }

  /* ---------- невыданный скоуп ---------- */
  function locked(id) {
    mount(paneEl,
      h('div', { class: 'panel empty' },
        icon('lock'),
        h('span', { class: 'empty__title' }, t('data.lockedTitle')),
        h('span', { class: 'empty__hint' }, t('data.lockedHint', { scope: SCOPES[id].name })),
        h('button', {
          class: 'btn btn--primary',
          onClick: async () => {
            const ok = await requestScope(id);
            if (!dead && ok) select(id);       // вкладка оживает без перезагрузки
          },
        }, icon('bell', { size: 20 }), t('data.request'))));
  }
}

/* ============================================================
   Строки по скоупам (§5.3 «Строка данных (def-list)»)
   ============================================================ */
const ROWS = {
  profile: d => [
    row(t('data.full'), d.full, true),
    row(t('data.birth'), d.birth),
    row(t('data.inn'), group(d.inn), true, true),
    d.phone ? row(t('data.phone'), d.phone, true, true) : null,
  ].filter(Boolean),

  // §6/S2b — у сверенного паспорта показываем, кем и когда он сверен.
  // Оператор, увидевший эту строку, знает, почему S7 не просит скан: без неё
  // закрытый пункт чеклиста выглядел бы как поблажка системы, а не как факт.
  documents: d => d.items.flatMap((x, i) => [
    row(t('data.docType'), x.type),
    row(t('data.docNo'), x.no, true, true),
    row(t('data.docIssued'), `${x.issued} · ${x.by}`),
    x.expires ? row(t('data.docExpires'), x.expires) : null,
    x.verified ? row(t('data.docVerified'), `${x.verified.at} · ${x.verified.by}`) : null,
    i < d.items.length - 1 ? h('div', { class: 'def__gap' }) : null,
  ].filter(Boolean)),

  address: d => [
    row(t('data.address'), d.value, true),
    row(t('data.since'), d.since),
  ],

  family: d => d.items.map(x => row(x.rel, `${x.full} · ${x.birth}`, true)),

  vehicles: d => d.items.map(x => row(x.model, `${x.year} · ${x.plate}`, true, true)),

  income: d => [
    row(t('data.employer'), d.employer),
    row(t('data.debt'), d.debt),
  ],
};

/* label 13caps слева (200), значение 15 справа, копирование по hover (§5.3). */
function row(key, value, copyable = false, tnum = false) {
  const val = h('span', { class: `def__val grow${tnum ? ' def__val--tnum' : ''}` }, value);

  const copy = copyable ? h('button', {
    class: 'def__copy', 'aria-label': t('common.copy'),
    onClick: async () => {
      // Данные гражданина не логируются (§11.2) — включая catch.
      try {
        await navigator.clipboard.writeText(String(value));
        toast(t('common.copied'), 'success', 2000);
      } catch { toast(t('common.copyFailed'), 'error'); }
    },
  }, icon('paperclip', { size: 16 })) : null;

  return h('div', { class: 'def__row' },
    h('span', { class: 'def__key' }, key),
    val,
    copy);
}

const group = inn => String(inn).replace(/(\d{3})(?=\d)/g, '$1 ');

function skeleton() {
  return h('div', { class: 'panel stack g-4' },
    ...Array.from({ length: 3 }, () => h('div', { class: 'row g-4' },
      h('div', { class: 'skel skel--line', style: { width: '160px' } }),
      h('div', { class: 'skel skel--line grow' }))));
}
