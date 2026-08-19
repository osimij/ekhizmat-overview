/* ============================================================
   S4 · Выбор услуги (каталог) · #/session/catalog  (§6/S4)

   «Найти услугу за секунды. Поиск — главный сценарий, категории — второй».

   Приёмка §6/S4: от «пустого поиска» до старта оформления типовой услуги —
   ≤ 4 действия. Считается так: фокус уже в поиске (0), набрать (1), Enter —
   открыть drawer (2), Enter — начать оформление (3), подтвердить скоуп (4).
   Поэтому автофокус здесь не украшение, а часть счёта, а ↑↓/Enter обязаны
   работать без единого клика.
   ============================================================ */
import { h, mount, icon, drawerLayer, closeLayer, toast, statusIcon } from '../ui.js';
import { t, plural, errText } from '../i18n.js';
import { dispatch, getState, patchSession, STEP } from '../store.js';
import { catalog } from '../mock/api.js';
import { searchField } from '../fields.js';
import { fmtTerm, fmtFee } from '../format.js';
import { requestScope, missingScopes } from '../scope.js';
import { CATEGORIES, CATEGORY, SITUATIONS, SERVICE, FREQUENT, SCOPES } from '../mock/data.js';

/* Приём начался с регистрации (§6/S2b). Банер стоит один раз, на первом
   экране сессии, и объясняет главное следствие: паспорт больше не нужен ни
   для этой услуги, ни для следующих. Без него оператор, привыкший требовать
   документ, продолжит его требовать — и весь смысл регистрации сведётся к
   лишним трём минутам у окна.

   Флаг живёт в session и гасится ЗДЕСЬ, при первой отрисовке: банер про
   только что случившееся событие, а не постоянное свойство сессии, и на
   втором заходе в каталог он был бы уже не новостью, а шумом. */
function enrolledBanner() {
  const e = getState().session?.enrolled;
  if (!e) return null;
  patchSession({ enrolled: null });

  return h('div', { class: 'banner banner--ok' },
    icon('shield'),
    h('span', { class: 'banner__text' }, t('catalog.enrolled')));
}

/* readonly — справочный просмотр каталога вне приёма (§6/S1: «оператор может
   проконсультировать без идентификации», Д-09). Тот же поиск, те же категории
   и та же карточка услуги, но без старта оформления: гражданина ещё нет, а
   значит, нет ни сессии, ни скоупов, ни данных. Один модуль на оба режима —
   потому что это буквально один каталог, и две реализации разошлись бы в
   первый же день (ровно как S5 и панель S6). */
export function renderCatalog(host, { readonly = false } = {}) {
  let dead = false;
  let filter = null;          // {kind: 'cat'|'situation', id, name}
  let results = [];
  let cursor = -1;
  let closeDrawer = null;
  let seq = 0;                // гонка живого поиска: отвечает только последний
  const guestMode = !readonly && !!getState().session?.guest;

  const search = searchField({ placeholder: t('catalog.search'), onInput: onSearch });
  const browse = h('div', { class: 's-catalog__browse' });
  /* Список результатов — динамическая область: скринридер обязан услышать,
     что выдача изменилась (§7). role="listbox" не украшение: визуальный курсор
     ↑↓ живёт отдельно от фокуса (фокус остаётся в поиске, иначе стрелки
     перестанут печатать), и без aria-activedescendant этот курсор существует
     только для зрячих (§9). */
  const list = h('div', {
    class: 's-catalog__results', hidden: true,
    role: 'listbox', 'aria-label': t('catalog.title'), 'aria-live': 'polite',
  });

  mount(host,
    h('div', { class: 'canvas s-catalog' },
      readonly
        ? h('div', { class: 'row between s-catalog__head' },
            h('div', { class: 'stack g-1' },
              h('h1', { class: 'page-title' }, t('catalog.viewTitle')),
              h('p', { class: 'small ink-2' }, t('catalog.viewLead'))),
            h('button', {
              class: 'btn btn--secondary btn--s',
              onClick: () => { location.hash = '#/idle'; },
            }, icon('chev-l', { size: 20 }), t('catalog.viewBack')))
        : h('h1', { class: 'page-title' }, t('catalog.title')),
      enrolledBanner(),
      search.el,
      browse,
      list));

  drawBrowse();
  if (guestMode) showGuestServices();
  loadCounts();

  // Автофокус синхронно (см. README «Два правила, которые легко сломать»).
  search.input.focus();

  // Esc здесь не ловим: drawer — слой, а слои закрывает общий обработчик
  // в app.js (§9 «Esc закрывает верхний слой»). Второй перехват означал бы
  // две разные лестницы закрытия на одном экране.
  const onKey = e => {
    if (!results.length || list.hidden) return;

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      move(e.key === 'ArrowDown' ? 1 : -1);
    }
    if (e.key === 'Enter' && cursor >= 0 && document.activeElement === search.input) {
      e.preventDefault();
      open(results[cursor]);
    }
  };
  addEventListener('keydown', onKey);

  return () => {
    dead = true;
    removeEventListener('keydown', onKey);
    closeDrawer?.();
  };

  /* ---------- живой поиск (§6/S4) ---------- */
  async function onSearch(q) {
    const my = ++seq;
    const s = q.trim();

    if (s.length < 2) { filter = null; return showBrowse(); }

    // Скелетоны сразу: мок отвечает за 200ms, бэкенд — за сколько ответит.
    showResults([h('div', { class: 'skel skel--card' }), h('div', { class: 'skel skel--card' })]);

    try {
      const r = await catalog.search(s);
      if (dead || my !== seq) return;      // приехал ответ на устаревший запрос
      results = guestMode ? r.filter(svc => svc.guest) : r;
      cursor = results.length ? 0 : -1;
      showResults(results.length
        ? results.map((svc, i) => row(svc, i, s))
        : [empty(s)]);
    } catch (e) {
      if (dead || my !== seq) return;
      showResults([h('div', { class: 'banner banner--error' },
        icon('info'), h('span', { class: 'banner__text' }, errText(e)))]);
    }
  }

  function showBrowse() {
    if (guestMode) { showGuestServices(); return; }
    results = []; cursor = -1;
    browse.hidden = false;
    list.hidden = true;
    search.input.setAttribute('aria-expanded', 'false');
    search.input.removeAttribute('aria-activedescendant');
  }

  function showGuestServices() {
    results = Object.values(SERVICE).filter(svc => svc.guest);
    cursor = results.length ? 0 : -1;
    showResults([
      h('div', { class:'banner banner--info' }, icon('user'),
        h('span', { class:'banner__text' }, getState().session?.guest
          ? t('guest.sessionHint')
          : '')),
      ...results.map((svc, i) => row(svc, i, '')),
    ]);
  }

  function showResults(nodes) {
    browse.hidden = true;
    list.hidden = false;
    search.input.setAttribute('aria-expanded', 'true');
    mount(list, ...nodes);
    if (filter) list.prepend(filterChip());
    // Курсор стоит на первой строке уже при выдаче, а не только после ↑↓,
    // — значит и объявлен он должен быть сразу.
    paint();
  }

  function move(d) {
    const rows = [...list.querySelectorAll('.srv-row')];
    if (!rows.length) return;
    cursor = (cursor + d + rows.length) % rows.length;
    paint();
    rows[cursor].scrollIntoView({ block: 'nearest' });
  }

  /* Курсор ↑↓ и мышь ведут одну и ту же подсветку: если бы у них были разные
     состояния, Enter после наведения мышью открывал бы не то, на что смотрит
     оператор. */
  function paint() {
    const rows = [...list.querySelectorAll('.srv-row')];
    rows.forEach((el, i) => {
      const on = i === cursor;
      el.classList.toggle('is-cursor', on);
      el.setAttribute('aria-selected', String(on));
    });
    // Курсор объявляется через активный потомок поля поиска — там, где сейчас
    // фокус. Без этого ↑↓ двигали подсветку молча.
    const active = rows[cursor];
    if (active) search.input.setAttribute('aria-activedescendant', active.id);
    else search.input.removeAttribute('aria-activedescendant');
  }

  /* ---------- витрина: ситуации + категории + частое ---------- */
  function drawBrowse() {
    mount(browse,
      h('section', { class: 'stack g-3' },
        h('h2', { class: 'label' }, t('catalog.situations')),
        h('div', { class: 'row wrap g-2' },
          ...SITUATIONS.map(s => h('button', {
            class: `chip chip--hue hue-${s.hue} s-catalog__situation`,
            onClick: () => setFilter({ kind: 'situation', id: s.id, name: s.name }),
          }, icon(s.icon, { size: 16 }), s.name)))),

      h('div', { class: 's-catalog__cols' },
        h('section', { class: 'stack g-3' },
          h('h2', { class: 'label' }, t('catalog.categories')),
          h('div', { class: 's-catalog__cats' },
            ...CATEGORIES.map(catCard))),

        h('section', { class: 'stack g-3' },
          h('h2', { class: 'label' }, t('catalog.frequent')),
          h('ol', { class: 'panel stack g-1 s-catalog__frequent' },
            ...FREQUENT.map((id, i) => {
              const svc = SERVICE[id];
              return h('li', {},
                h('button', { class: 's-catalog__freq', onClick: () => open(svc) },
                  h('span', { class: 'ink-faint tnum' }, `${i + 1}.`),
                  h('span', { class: 'grow' }, svc.name),
                  icon('chev-r', { size: 20, cls: 'ink-faint' })));
            })))));
  }

  function catCard(c) {
    return h('button', {
      class: `panel s-catalog__cat hue-${c.hue}`,
      onClick: () => setFilter({ kind: 'cat', id: c.id, name: c.name }),
    },
      h('span', { class: 's-catalog__glyph' }, icon(c.icon)),
      h('span', { class: 'stack g-1' },
        h('span', { class: 'h3 s-catalog__catname' }, c.name),
        h('span', { class: 'small ink-faint tnum' }, `${c.count} ${plural(c.count, 'plural.services')}`)));
  }

  /* Счётчики на карточках — витринные (mock/data.js). Каталог грузим, чтобы
     показать, что список приходит с сервера, и поймать офлайн (§7). */
  async function loadCounts() {
    try { await catalog.list(); } catch (e) {
      if (dead) return;
      browse.prepend(h('div', { class: 'banner banner--warn' },
        icon('info'), h('span', { class: 'banner__text' }, t('catalog.offline'))));
    }
  }

  /* ---------- фильтр по категории/ситуации ---------- */
  function setFilter(f) {
    filter = f;
    const ids = f.kind === 'situation'
      ? SITUATIONS.find(s => s.id === f.id).services
      : Object.values(SERVICE).filter(s => s.cat === f.id).map(s => s.id);

    results = ids.map(id => SERVICE[id]).filter(svc => svc && (!guestMode || svc.guest));
    cursor = results.length ? 0 : -1;
    showResults(results.length ? results.map((svc, i) => row(svc, i, '')) : [empty(f.name)]);
    search.input.value = '';
    search.input.focus();
  }

  function filterChip() {
    return h('div', { class: 'row g-2 s-catalog__filter' },
      h('span', { class: 'small ink-2' }, t('catalog.filtered', { name: filter.name })),
      h('button', { class: 'btn btn--ghost btn--s', onClick: () => { filter = null; showBrowse(); } },
        icon('x', { size: 16 }), t('catalog.reset')));
  }

  /* ---------- строка результата ---------- */
  function row(svc, i, q) {
    const c = CATEGORY[svc.cat];
    const el = h('button', {
      class: `panel srv-row${i === cursor ? ' is-cursor' : ''}${svc.unavailable ? ' srv-row--off' : ''}`,
      id: `srv-${svc.id}`, role: 'option', 'aria-selected': String(i === cursor),
      onClick: () => open(svc),
      onMouseEnter: () => { cursor = i; paint(); },
    },
      h('span', { class: `srv-row__glyph hue-${c.hue}` }, icon(c.icon, { size: 20 })),
      h('span', { class: 'srv-row__body' },
        h('span', { class: 'srv-row__name' }, ...highlight(svc.name, q)),
        h('span', { class: 'small ink-faint' },
          `${c.name} · ${t('catalog.no')} `,
          ...highlight(svc.no, q),
          ` · ${fmtTerm(svc)} · ${fmtFee(svc)}`),
        // Услуга могла найтись по синониму, которого нет ни в названии, ни в
        // номере, — и тогда строка выглядит как случайная (Д-18). Показываем,
        // чем именно совпало: «прописка» → «Адресная регистрация».
        matchedSynonym(svc, q)),
      svc.guest ? h('span', { class:'audience-badge audience-badge--guest' }, icon('user', { size:14 }), t('guest.badge')) : null,
      svc.unavailable
        ? statusIcon('warning', svc.unavailable, { iconName:'info' })
        : icon('chev-r', { size: 20, cls: 'ink-faint' }));

    return el;
  }

  function empty(q) {
    return h('div', { class: 'panel empty' },
      icon('girih-tile'),
      h('span', { class: 'empty__title' }, t('catalog.nothing')),
      h('span', { class: 'empty__hint' }, t('catalog.nothingHint', { q })),
      h('button', {
        class: 'btn btn--secondary',
        onClick: () => { filter = null; search.input.value = ''; search.input.focus(); showBrowse(); },
      }, t('catalog.reset')));
  }

  /* ---------- drawer услуги (§6/S4) ---------- */
  function open(svc) {
    closeDrawer?.();

    // Вне приёма оформлять нечего: гражданин не идентифицирован, скоупов нет.
    // Поэтому CTA ведёт не в форму, а в начало приёма — честнее, чем кнопка,
    // которая упрётся в отсутствие сессии (§6/S1, Д-09).
    const start = readonly
      ? h('button', {
          class: 'btn btn--primary s-drawer__cta',
          onClick: () => dispatch('START'),
        }, t('catalog.viewStartVisit'))
      : h('button', {
          class: 'btn btn--primary s-drawer__cta',
          disabled: !!svc.unavailable,
          onClick: () => begin(svc),
        }, t('catalog.start'));

    const node = h('aside', {
      class: 'drawer', role: 'dialog', 'aria-modal': 'false',
      'aria-label': svc.name,
    },
      h('div', { class: 'drawer__head' },
        h('div', { class: 'stack g-2' },
          svc.guest ? h('span', { class:'audience-badge audience-badge--guest' }, icon('user', { size:14 }), t('guest.available')) : null,
          h('h2', { class: 'h2--card' }, svc.name),
          h('span', { class: 'small ink-faint' },
            `${CATEGORY[svc.cat].name} · ${t('catalog.term')}: ${fmtTerm(svc)}`),
          h('span', { class: 'small ink-faint' }, `${t('catalog.fee')}: ${fmtFee(svc)}`)),
        h('button', {
          class: 'btn btn--ghost btn--icon btn--s', 'aria-label': t('common.close'),
          onClick: () => closeDrawer(),
        }, icon('x', { size: 20 }))),

      svc.unavailable
        ? h('div', { class: 'banner banner--warn' }, icon('info'),
            h('span', { class: 'banner__text' }, t('catalog.unavailableHint')))
        : null,

      readonly
        ? h('div', { class: 'banner banner--info' }, icon('info'),
            h('span', { class: 'banner__text' }, t('catalog.viewHint')))
        : null,

      h('p', { class: 'body ink-2' }, svc.about),
      h('hr', { class: 'rule' }),

      h('section', { class: 'stack g-3' },
        h('h3', { class: 'label' }, t('catalog.needFromCitizen')),
        h('div', { class: 'check-list' },
          ...svc.docs.map(d => h('div', { class: 'check-item check-item--todo' },
            icon('doc'),
            h('span', {}, d.name + (d.required ? '' : ` · ${t('catalog.optional')}`)))))),

      h('hr', { class: 'rule' }),

      h('section', { class: 'stack g-3' },
        h('h3', { class: 'label' }, t('catalog.needAccess')),
        h('div', { class: 'check-list' }, ...scopeRows(svc))),

      h('div', { class: 'drawer__foot' }, start));

    closeDrawer = drawerLayer(node, { onClose: () => { closeDrawer = null; search.input.focus(); } });
    start.focus();
  }

  /* «✓ Профиль ✓ Адрес 🔒 Состав семьи — будет запрошен у гражданина» */
  function scopeRows(svc) {
    const have = getState().session?.scopes || [];
    return (svc.scopes || []).map(id => {
      const ok = have.includes(id);
      return h('div', { class: `check-item check-item--${ok ? 'done' : 'locked'}` },
        icon(ok ? 'check' : 'lock'),
        h('span', {}, SCOPES[id]?.name || id,
          ok ? null : h('span', { class: 'small ink-faint' }, ` — ${t('catalog.willAsk')}`)));
    });
  }

  /* ---------- старт оформления ---------- */
  async function begin(svc) {
    const missing = missingScopes(svc);

    // §6/S4 — «Если услуга требует скоуп сверх выданного — CTA сначала
    // триггерит запрос доп. скоупа, после одобрения → S6».
    for (const scope of missing) {
      const ok = await requestScope(scope, svc.name);
      if (dead) return;
      if (!ok) return;              // отказ — остаёмся в каталоге (§7)
    }

    closeDrawer?.();
    patchSession({ service: svc.id, draft: null, docs: {}, application: null });
    dispatch('GOTO', { step: STEP.FORM });
  }
}

/* Синоним, по которому нашлась услуга, — только если в названии и номере
   совпадения нет (иначе подсказка дублирует подсвеченное). */
function matchedSynonym(svc, q) {
  const s = (q || '').trim().toLowerCase();
  if (s.length < 2) return null;
  if (svc.name.toLowerCase().includes(s) || svc.no.toLowerCase().includes(s)) return null;

  const hit = (svc.synonyms || []).find(w => w.includes(s));
  if (!hit) return null;

  return h('span', { class: 'small ink-faint' },
    `${t('catalog.matchedBy')} `,
    ...highlight(hit, s));
}

/* Подсветка совпадения (§6/S4). textContent, а не innerHTML: в поиск
   оператор вводит что угодно, и разметке там взяться неоткуда. */
function highlight(text, q) {
  if (!q || q.length < 2) return [text];

  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i === -1) return [text];

  return [
    text.slice(0, i),
    h('mark', { class: 'mark' }, text.slice(i, i + q.length)),
    text.slice(i + q.length),
  ];
}
