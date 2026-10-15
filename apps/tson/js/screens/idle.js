/* ============================================================
   S1 · Главная смены (idle) · #/idle  (§6/S1)

   «Нулевая витрина данных»: приёмка требует, чтобы grep по DOM этого экрана
   не находил ни одного поля гражданина. Поэтому здесь нет и не может быть
   ничего о людях — талоны (номер, зона, услуга из терминала), статистика
   смены и номера заявлений. Паспорт и телефон появляются только у окна,
   после «Начать приём», и живут в сессии (§2.3).

   Раскладка — рабочее место окна, а затем сводка смены:

     · «Очередь центра» и «Окно N» рядом. Это самое частое, что оператор
       делает за день: выбрать талон, вызвать, начать приём, завершить,
       вызвать следующего. Частота решает, что стоит первым (§2 шаг 1),
       поэтому работа выше показателей.
     · Пять KPI — те же, что руководитель видит по окну в таблице «Окна и
       операторы» (dashboard-center.js), и последние заявления.

   «Начать приём» больше не висит в шапке страницы само по себе: приём
   всегда начинается по конкретному вызванному талону, и кнопка живёт в
   панели окна рядом с ним (design-guide §3 «Workstation queue»).

   Какие кнопки есть у талона и почему какая-то недоступна, решает сервер
   очереди (mock/api.js → queue): экран рисует присланный набор.
   ============================================================ */
import { h, mount, icon, modal, statusIcon, confirmDanger, toast, hasLayers } from '../ui.js';
import { t, plural, errText } from '../i18n.js';
import { dispatch, getState, ST } from '../store.js';
import { shift, queue } from '../mock/api.js';
import { fmtMinutes } from '../format.js';
import {
  actionGroup, openTransfer, openFinish, ticketStatus, ticketStatusIcon,
  waitText, ticketMoment, actionErrorText,
} from '../visit.js';

export function renderIdle(host) {
  const st = getState();
  const win = Number(st.bind?.window) || 1;

  /* Состояние экрана очереди. status: loading · ready · error. busy — id
     действия, которое сейчас выполняется; settle — действие прошло, ждём
     свежий ответ сервера, чтобы снять спиннер уже с новым состоянием, а не
     показать на миг старое (кнопка «Вызвать» снова живая — второй вызов). */
  const q = { status: 'loading', data: null, error: null, selected: null, busy: null, settle: false, actionError: null };
  let dead = false;
  let seq = 0;

  const queueNow = h('p', { class: 'small ink-2 s-queue__now' });
  const queueBody = h('div', { class: 's-queue__body' });
  const windowPanel = h('section', { class: 'panel s-window', 'aria-labelledby': 's-window-title' });
  const body = h('div', { class: 's-idle__body' }, skeletonStats());

  mount(host,
    h('div', { class: 'canvas s-idle' },
      h('header', { class: 's-idle__head' },
        h('h1', { class: 'page-title' }, t('idle.greeting', { name: st.operator?.name || '' }))),
      h('div', { class: 's-idle__work' },
        h('section', { class: 'panel s-queue', 'aria-labelledby': 's-queue-title' },
          h('div', { class: 's-queue__head' },
            h('h2', { class: 'h3', id: 's-queue-title' }, t('queue.title')),
            queueNow),
          queueBody),
        windowPanel),
      body));

  draw();
  loadQueue({ hard: true });
  loadStats();

  // Сервер очереди сообщает об изменениях сам (в проде — сокет): талон
  // вызвали соседи, терминал выдал новый. 'mode' — демо сменило сценарий.
  const offQueue = queue.onChange(kind => loadQueue({ hard: kind === 'mode' }));

  // Время ожидания растёт само: раз в полминуты пересчитываем подписи из
  // issuedAt, без запроса к серверу и без анимации (§8 — постоянные
  // поверхности не двигаются).
  const tick = setInterval(() => { if (q.status === 'ready' && !q.busy) draw(); }, 30_000);

  // F2 — «Начать приём» вызванного талона. Только на свободной главной:
  // под замком экран смонтирован (§6/S9c), а поверх открытого диалога
  // клавиша начинала бы приём за спиной у оператора.
  const onKey = e => {
    if (e.key !== 'F2') return;
    e.preventDefault();
    if (getState().app !== ST.IDLE || hasLayers() || q.busy) return;
    const cur = q.data?.current;
    const a = cur?.actions.find(x => x.id === 'start');
    if (a?.enabled) run(a, cur);
  };
  addEventListener('keydown', onKey);

  return () => {
    dead = true;
    offQueue();
    clearInterval(tick);
    removeEventListener('keydown', onKey);
  };

  /* ---------- данные ---------- */
  async function loadQueue({ hard = false } = {}) {
    const my = ++seq;
    if (hard || q.status !== 'ready') { q.status = 'loading'; draw(); }
    try {
      const data = await queue.state(win);
      if (dead || my !== seq) return;
      q.data = data;
      q.status = 'ready';
      q.error = null;
      // Выбор держится за талон, пока тот в очереди; ушёл — сервер
      // подсказывает следующего для этого окна. Пока у окна свой талон,
      // выбора нет вовсе: освободившись, окно начинает с подсказки сервера,
      // а не со строки, на которой случайно стоял курсор.
      const ids = data.tickets.map(x => x.id);
      if (data.current) q.selected = null;
      else if (!ids.includes(q.selected)) q.selected = data.nextId ?? ids[0] ?? null;
    } catch (e) {
      if (dead || my !== seq) return;
      q.status = 'error';
      q.error = e;
    }
    if (q.settle || q.status === 'error') { q.settle = false; q.busy = null; }
    draw();
  }

  async function loadStats() {
    // §5.3 — скелетон обязателен на каждом экране с данными.
    const s = await shift.stats(st.bind?.window);
    if (dead) return;
    const avg = fmtMinutes(s.avgMin);
    mount(body, idleMain(
      h('section', { class: 'dashboard-kpis s-idle__kpis', 'aria-label': t('idle.today') },
        kpi(String(s.visits), t('stats.visits'), 'users', 'blue'),
        kpi(String(s.applications), t('stats.applications'), 'doc', 'violet'),
        kpi(String(s.consultations), t('stats.consultations'), 'chat', 'teal'),
        kpi(String(s.issued), t('stats.issued'), 'cat-cert', 'green'),
        kpi(avg.value, t('stats.avg'), 'clock', 'amber', avg.unit)),
      recentPanel(
        s.recent.length
          ? recentList(s.recent.map(r =>
              h('div', { class: 's-idle__recent-row' },
                // Только номер — ни ФИО, ни ИНН. Это и есть «без имён граждан!».
                h('span', { class: 'tnum' }, `№ ${r.no}`),
                r.status === 'issued'
                  ? statusIcon('success', t('idle.issuedMark'))
                  : statusIcon('info', t('idle.filedMark'), { iconName: 'clock' }))))
          : h('p', { class: 'small ink-faint' }, t('idle.noRecent')))));
  }

  /* ---------- действия ---------- */
  function run(a, tk) {
    if (q.busy || !tk) return;
    if (a.id === 'transfer') return openTransfer(tk, win, { onDone: () => loadQueue() });
    if (a.id === 'finish') {
      return openFinish(tk, win, {
        onDone: result => {
          toast(t('queue.toast.finished', { no: tk.no, result: t(`visit.result.${result}.short`) }), 'success');
          loadQueue();
        },
      });
    }
    // Неявка снимает талон с очереди насовсем: человеку, подошедшему позже,
    // понадобится новый. Разрушающее — значит, с подтверждением (P5).
    if (a.id === 'noShow') {
      return confirmDanger({
        title: t('queue.noShow.title', { no: tk.no }),
        body: h('p', {}, t('queue.noShow.body')),
        confirmText: t('queue.act.noShow'),
        onConfirm: () => perform(a, tk),
      });
    }
    perform(a, tk);
  }

  async function perform(a, tk) {
    q.busy = a.id;
    q.actionError = null;
    drawWindow();
    try {
      if (a.id === 'call') {
        await queue.call(tk.id, win);
        say(t('queue.announce.called', { no: tk.no, n: win }));
      } else if (a.id === 'recall') {
        await queue.recall(tk.id, win);
        say(t('queue.announce.recalled', { no: tk.no, n: win }));
      } else if (a.id === 'noShow') {
        await queue.noShow(tk.id, win);
        toast(t('queue.toast.noShow', { no: tk.no }));
      } else if (a.id === 'start' || a.id === 'restart') {
        const ticket = await queue.start(tk.id, win);
        if (dead) return;
        q.busy = null;
        // Приём идёт по этому талону: он поедет в шапку приёма (shell.js).
        dispatch('START', { ticket });
        return;
      }
      if (dead) return;
      q.settle = true;
    } catch (e) {
      if (dead) return;
      // Ошибка — рядом с решением, которого она касается (§6), а очередь
      // перечитываем: чаще всего она значит, что талон уже у другого окна.
      q.actionError = actionErrorText(e);
      q.busy = null;
    }
    loadQueue();
  }

  function select(id, { focus = false } = {}) {
    if (q.selected === id) return;
    q.selected = id;
    q.actionError = null;
    draw();
    if (focus) queueBody.querySelector(`[data-ticket="${id}"]`)?.focus();
  }

  /* ---------- отрисовка ---------- */
  function draw() {
    drawQueue();
    drawWindow();
  }

  function drawQueue() {
    // Перерисовка не должна выбивать фокус из списка: оператор листает
    // стрелками, а очередь тем временем обновляется сама.
    const hadFocus = queueBody.contains(document.activeElement);

    if (q.status === 'loading') {
      queueNow.textContent = '';
      mount(queueBody, listHead(), h('div', { class: 's-queue__list', 'aria-busy': 'true' },
        ...Array.from({ length: 6 }, () => h('div', { class: 's-queue__row s-queue__row--skel' },
          h('div', { class: 'skel skel--line' })))));
      return;
    }

    if (q.status === 'error') {
      queueNow.textContent = '';
      mount(queueBody, stateBox('info', t('queue.error.title'), errText(q.error),
        h('button', {
          class: 'btn btn--secondary s-queue__retry', type: 'button',
          onClick: () => loadQueue({ hard: true }),
        }, icon('refresh', { size: 20 }), t('queue.retry'))));
      return;
    }

    const list = q.data.tickets;
    const waiting = list.filter(x => x.status !== 'called');
    // «Сейчас», а не итог периода — под заголовком панели, как у
    // руководителя (§3 «Workstation idle»). Считается из тех же строк, что
    // нарисованы ниже (правило 49).
    // Пустой список сам говорит «очередь пуста» — вторая подпись над ним
    // повторяла бы тот же факт (правило 6).
    queueNow.textContent = !list.length ? '' : waiting.length
      ? t('queue.now', {
          n: waiting.length, w: plural(waiting.length, 'plural.waiting'),
          m: Math.round(waiting.reduce((sum, x) => sum + (Date.now() - x.issuedAt), 0) / waiting.length / 60_000),
        })
      : t('queue.nowEmpty');

    if (!list.length) {
      mount(queueBody, stateBox('users', t('queue.empty.title'), t('queue.empty.hint')));
      return;
    }

    // Выбирать талон есть смысл, только пока окно свободно. С вызванным
    // талоном у окна очередь — просто обзор: строки не выбираются, и в
    // панели окна не появляется второй «выбранный» рядом с вызванным.
    const free = !q.data.current;
    mount(queueBody,
      listHead(),
      h('div', {
        class: `s-queue__list${free ? ' s-queue__list--pick' : ''}`,
        role: free ? 'listbox' : 'list',
        'aria-labelledby': 's-queue-title',
        onKeydown: free ? onListKey : null,
      }, ...list.map(tk => row(tk, free))));

    if (hadFocus && free) queueBody.querySelector(`[data-ticket="${q.selected}"]`)?.focus();
  }

  function listHead() {
    return h('div', { class: 's-queue__cols', 'aria-hidden': 'true' },
      h('span', {}, t('queue.col.no')),
      h('span', {}, t('queue.col.service')),
      h('span', {}, t('queue.col.status')),
      h('span', {}, t('queue.col.wait')),
      h('span', {}, t('queue.col.window')));
  }

  function row(tk, free) {
    const status = ticketStatus(tk);
    const selected = free && tk.id === q.selected;
    const long = Date.now() - tk.issuedAt > q.data.normMin * 60_000;
    const label = [
      tk.no, tk.service.name, status.text,
      t('queue.rowWait', { w: waitText(tk) }) + (long ? ` — ${t('queue.longAria')}` : ''),
    ].join(', ');

    return h('div', {
      class: `s-queue__row${selected ? ' is-selected' : ''}`,
      role: free ? 'option' : 'listitem',
      'aria-selected': free ? String(selected) : null,
      'aria-label': label,
      tabindex: free ? (selected ? '0' : '-1') : null,
      dataset: { ticket: tk.id },
      onClick: free ? () => select(tk.id) : null,
    },
      h('span', { class: 's-queue__no tnum' }, tk.no),
      h('span', { class: 's-queue__svc', title: tk.service.name }, tk.service.name),
      h('span', { class: 's-queue__cell' }, ticketStatusIcon(tk)),
      h('span', { class: `s-queue__cell tnum${long ? ' s-queue__wait--long' : ''}` }, waitText(tk)),
      h('span', { class: `s-queue__cell tnum${tk.window ? '' : ' ink-faint'}` }, tk.window ? String(tk.window) : '—'));
  }

  /* Listbox (§6, §9): ↑↓ двигают выбор, Home/End — к краям. Выбор следует
     за фокусом — в панели окна сразу виден талон, который будет вызван. */
  function onListKey(e) {
    const list = q.data?.tickets || [];
    const i = list.findIndex(x => x.id === q.selected);
    const map = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: list.length - 1 };
    if (!(e.key in map) || !list.length) return;
    e.preventDefault();
    const next = list[Math.max(0, Math.min(list.length - 1, map[e.key]))];
    select(next.id, { focus: true });
  }

  function drawWindow() {
    // После действия панель перерисовывается целиком — фокус возвращаем на
    // то же действие, если оно осталось, иначе на главное.
    const focusedAction = windowPanel.contains(document.activeElement)
      ? document.activeElement.dataset?.action || 'any' : null;

    const head = h('h2', { class: 'h3 s-window__title', id: 's-window-title' }, t('queue.windowN', { n: win }));

    if (q.status === 'loading') {
      windowPanel.setAttribute('aria-busy', 'true');
      mount(windowPanel, head,
        h('div', { class: 's-window__ticket' },
          h('div', { class: 'skel skel--line s-window__skel-state' }),
          h('div', { class: 'skel s-window__skel-no' }),
          h('div', { class: 'skel skel--line' })),
        h('div', { class: 'skel s-window__skel-btn' }));
      return;
    }
    windowPanel.removeAttribute('aria-busy');

    if (q.status === 'error') {
      mount(windowPanel, head, h('p', { class: 'small ink-2' }, t('queue.window.unknown')));
      return;
    }

    const cur = q.data.current;
    const tk = cur || q.data.tickets.find(x => x.id === q.selected) || null;
    const actions = tk
      ? tk.actions
      : [{ id: 'call', enabled: false, reason: { code: 'QUEUE_EMPTY', params: {} } }];

    mount(windowPanel,
      head,
      tk ? ticketBlock(tk, !!cur) : emptyBlock(),
      actionGroup(actions, { busy: q.busy, onRun: a => run(a, tk), kbd: { start: 'F2' } }),
      q.actionError
        ? h('div', { class: 'banner banner--error s-window__error', role: 'alert' },
            icon('info'), h('span', { class: 'banner__text' }, q.actionError))
        : null);
    windowPanel.setAttribute('aria-busy', q.busy ? 'true' : 'false');

    if (focusedAction) {
      const again = windowPanel.querySelector(`[data-action="${focusedAction}"]`)
        || windowPanel.querySelector('.visit-actions__btn');
      again?.focus();
    }
  }

  /* Талон в фокусе окна. Анатомия одна во всех состояниях — строка
     состояния, номер, услуга, зона и ожидание, — меняются только строка
     состояния и кнопки под ней. Номер не прыгает между «выбран», «вызван»
     и «на приёме», и глаз находит его там же, где секунду назад. */
  function ticketBlock(tk, mine) {
    let state;
    let glyph = null;
    if (mine) {
      state = ticketMoment(tk);
      glyph = tk.status === 'serving' ? 'user' : 'bell';
    } else if (tk.status === 'transferred' && tk.window === win) {
      state = t('queue.pick.toYou', { n: tk.from });
    } else if (tk.status !== 'waiting') {
      state = ticketStatus(tk).text;
    } else {
      state = tk.id === q.data.nextId ? t('queue.pick.next') : t('queue.pick.chosen');
    }

    const meta = [t(`queue.zone.${tk.zone}`)];
    if (!mine || tk.status === 'called') meta.push(t('queue.inQueue', { w: waitText(tk) }));
    if (mine && tk.from) meta.push(t('queue.fromWindow', { n: tk.from }));

    return h('div', { class: `s-window__ticket s-window__ticket--${mine ? tk.status : 'pick'}` },
      h('span', { class: 's-window__state' }, glyph ? icon(glyph, { size: 16 }) : null, h('span', {}, state)),
      h('strong', { class: 's-window__no tnum' }, tk.no),
      h('span', { class: 's-window__svc' }, tk.service.name),
      h('span', { class: 's-window__meta' }, meta.join(' · ')));
  }

  function emptyBlock() {
    return h('div', { class: 's-window__ticket s-window__ticket--empty' },
      h('span', { class: 's-window__state' }, h('span', {}, t('queue.window.free'))),
      h('span', { class: 's-window__svc' }, t('queue.window.freeHint')));
  }

  function stateBox(iconName, title, hint, action = null) {
    return h('div', { class: 's-queue__state' },
      icon(iconName, { size: 40 }),
      h('p', { class: 's-queue__state-title' }, title),
      h('p', { class: 'small ink-2' }, hint),
      action);
  }
}

/* Объявление для скринридера: вызов — событие, которое зрячий видит по
   смене панели, а незрячий должен услышать (§9). Тост здесь был бы лишним
   шумом поверх панели, которая и так поменялась. */
function say(text) {
  const live = document.getElementById('live');
  if (live) live.textContent = text;
}

function idleMain(kpis, recent) {
  return h('div', { class: 's-idle__main' },
    kpis,
    recent,
    idleTools());
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
   редкие инструменты не конкурируют с работой окна. */
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
          ...['help.flow0', 'help.flow1', 'help.flow2', 'help.flow3', 'help.flow4'].map((k, i) =>
            h('li', { class: 'row-start g-3' },
              h('span', { class: 'step__dot' }, String(i + 1)),
              h('span', { class: 'grow' }, t(k))))),
        h('p', { class: 'small ink-faint' }, t('help.privacy')))),
    actions: [
      h('button', { class: 'btn btn--primary', onClick: () => close() }, t('common.close')),
    ],
  });
}

function kpi(value, label, iconName, tone, unit = null) {
  return h('article', { class: 'kpi s-idle__kpi' },
    h('div', { class: 's-idle__kpi-copy' },
      h('strong', { class: 'kpi__value' }, value, unit ? h('span', { class: 'kpi__unit' }, unit) : null),
      h('span', { class: 'kpi__label' }, label)),
    icon(iconName, { cls: `s-idle__kpi-icon s-idle__kpi-icon--${tone}` }));
}

function skeletonStats() {
  return idleMain(
    h('div', { class: 'dashboard-kpis s-idle__kpis' },
      ...Array.from({ length: 5 }, () => h('div', { class: 'skel skel--card' }))),
    recentPanel(recentList(
      Array.from({ length: 10 }, () =>
        h('div', { class: 's-idle__recent-row' }, h('div', { class: 'skel skel--line' }))))));
}
