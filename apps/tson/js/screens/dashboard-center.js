/* ============================================================
   Операционная панель центра (#/dashboard-center).

   Экран сравнения, а не чтения: руководитель смотрит на него между делом и
   должен за секунду понять, где сейчас плохо. Поэтому один факт рисуется один
   раз (design-guide §10 правило 6), а всё, что можно открыть, открывается там,
   где по нему кликнули (§5).
   ============================================================ */
import { h, mount, icon, statusIcon, titleAlignedCell, drawerLayer, filterSelect } from '../ui.js';
import { t } from '../i18n.js';
import { TSON_DASHBOARD } from '../mock/data.js';
import { getCenterContext } from '../role.js';

const statusTone = { serving: 'success', break: 'warning', closed: 'danger' };
const statusGlyph = { serving: 'check', break: 'pause', closed: 'x-strong' };

/* Период — не персональные данные, поэтому его можно держать в адресе (§7):
   перезагрузка и ссылка возвращают на то, что человек смотрел. Разрешён
   ровно один параметр и ровно два значения — маршрутизатор ЦОН выселяет всё
   подозрительное из хеша, и белый список здесь не формальность. */
const PERIODS = ['today', 'week'];

function readPeriod() {
  const q = location.hash.split('?')[1];
  const v = new URLSearchParams(q || '').get('period');
  return PERIODS.includes(v) ? v : 'today';
}

function writePeriod(value) {
  const base = location.hash.split('?')[0];
  history.replaceState(null, '', value === 'today' ? base : `${base}?period=${value}`);
}

export function renderDashboardCenter(host) {
  let period = readPeriod();
  /* Сценарии (высокая очередь, пусто, загрузка, ошибка) — симуляция, и живёт
     она в демо-панели, а не в рабочей шапке экрана (§11.5). Раньше это был
     обычный на вид фильтр рядом с «Периодом», то есть рабочее место
     предлагало руководителю «выбрать ошибку». */
  let mode = 'normal';
  draw();

  const onHash = () => { period = readPeriod(); draw(); };
  window.addEventListener('tson:dash-scenario', onScenario);
  addEventListener('hashchange', onHash);
  return () => {
    window.removeEventListener('tson:dash-scenario', onScenario);
    removeEventListener('hashchange', onHash);
  };

  function onScenario(e) { mode = e.detail || 'normal'; draw(); }

  function draw() {
    const d = TSON_DASHBOARD.center;

    if (mode === 'loading') {
      mount(host, h('div', { class: 'canvas dashboard' },
        dashboardHeader(d),
        h('div', { class: 'dashboard-overview' },
          h('div', { class: 'dashboard-kpis' }, ...d.kpis.map(() => h('div', { class: 'skel skel--card' }))),
          h('div', { class: 'skel skel--card' }))));
      return;
    }

    if (mode === 'error' || mode === 'empty') {
      const isError = mode === 'error';
      mount(host, h('div', { class: 'canvas dashboard' },
        dashboardHeader(d),
        h('div', { class: 'panel dashboard-state' },
          icon(isError ? 'info' : 'history', { size: 48 }),
          h('h2', { class: 'h3' }, t(isError ? 'dash.center.errorText' : 'dash.center.emptyText')),
          h('button', {
            class: 'btn btn--primary',
            onClick: () => { mode = 'normal'; draw(); },
          }, t(isError ? 'dash.center.retry' : 'dash.center.today')))));
      return;
    }

    const high = mode === 'high';
    const longWait = high ? 11 : 3;

    const nodes = [
      dashboardHeader(d),
      h('div', { class: 'dashboard-overview' },
        h('section', { class: 'dashboard-kpis', 'aria-label': 'KPI' },
          ...d.kpis.map(k => kpiCard(k, high))),
        // Баннер остаётся: это действенная сводка, а не четвёртая перекраска
        // того же числа — карточка KPI и зона показывают «сколько», баннер
        // говорит «и это уже дольше нормы».
        high ? h('div', { class: 'banner banner--error' },
          icon('info'),
          h('span', { class: 'banner__text' }, t('dash.center.alertLong', { n: longWait }))) : null,
        h('div', { class: 'dashboard-grid' },
          h('section', { class: 'panel dashboard-section dashboard-queue-section' },
            h('div', { class: 'dashboard-queue-head' },
              h('h2', { class: 'h3' }, t('dash.center.queue')),
              h('span', { class: 'small ink-faint' }, t(period === 'today' ? 'dash.center.today' : 'dash.center.week'))),
            h('div', { class: 'queue-grid' }, ...d.queues.map((q, i) => queueCard(q, high && i === 0)))),
          h('section', { class: 'panel dashboard-section' },
            h('h2', { class: 'h3' }, t('dash.center.load')),
            barChart(d.hours, high)))),
      h('section', { class: 'panel dashboard-section dashboard-table-section' },
        h('h2', { class: 'h3' }, t('dash.center.windows')),
        windowTable(d.windows)),
    ];
    mount(host, h('div', { class: 'canvas dashboard' }, ...nodes));
  }

  function dashboardHeader(d) {
    const context = getCenterContext();
    return h('header', { class: 'dashboard-head' },
      h('div', { class: 'stack g-2' },
        h('h1', { class: 'page-title' }, context?.name || d.name),
        h('p', { class: 'ink-2' }, t('dash.center.lead'))),
      h('div', { class: 'dashboard-controls' },
        filterSelect('dash-period', 'calendar', t('dash.center.period'),
          [['today', t('dash.center.today')], ['week', t('dash.center.week')]],
          period,
          v => { period = v; writePeriod(v); draw(); },
          'dashboard-period-filter')));
  }

  function kpiCard(k, high) {
    const isQueue = k.id === 'queue';
    const value = isQueue && high ? '29' : k.value;
    const tone = isQueue && high ? 'danger' : k.tone === 'warn' ? 'warn' : k.tone === 'danger' ? 'danger' : '';
    const ctx = isQueue
      ? t('dash.center.kpi.queue.ctx', { n: high ? 11 : 3 })
      : t(`dash.center.kpi.${k.id}.ctx`);

    // Значение первым, подпись второй, контекст третьим (§3 KPI canon).
    return h('article', { class: `kpi${tone ? ` kpi--${tone}` : ''}` },
      h('strong', { class: 'kpi__value' }, value),
      h('span', { class: 'kpi__label' }, t(`dash.center.kpi.${k.id}`)),
      h('span', { class: 'kpi__context' }, ctx));
  }

  function queueCard(q, isHigh) {
    const waiting = isHigh ? 18 : q.waiting;
    return h('button', {
      class: `queue-card${isHigh ? ' queue-card--danger' : ''}`,
      'aria-label': t('dash.center.queueAria', { zone: q.label, n: waiting }),
      onClick: () => openQueueDrawer({ ...q, waiting }),
    },
      h('span', { class: 'queue-card__head' },
        h('span', { class: 'queue-card__name' }, q.label),
        // Тон красный (норма нарушена), глиф — часы (люди ждут). «Крестик»
        // из общей карты означает «закрыто», и на очереди он читался как
        // «зона не работает».
        isHigh ? statusIcon('danger', t('dash.center.long'), { iconName: 'clock' }) : null),
      h('span', { class: 'queue-card__metrics' },
        h('strong', {}, String(waiting)),
        h('span', { class: 'small ink-2' }, t('dash.center.waiting')),
        h('span', { class: 'small ink-faint' }, `${t('dash.center.avg')}: ${q.wait}`)));
  }

  /* Столбики нагрузки. Значение раньше жило только в title — то есть было
     недостижимо без мыши (правило 20). Теперь оно подписано у двух столбиков,
     которые отвечают на реальные вопросы («сколько сейчас» и «где пик»), а
     весь график назван для скринридера одной фразой с числами. */
  function barChart(hours, high) {
    const values = hours.map(v => (high ? Math.min(100, v + 22) : v));
    const peak = Math.max(...values);
    const peakIndex = values.indexOf(peak);
    const nowIndex = values.length - 1;

    return h('div', {
      class: 'bar-chart', role: 'img',
      'aria-label': t('dash.center.loadAria', {
        peak, peakHour: 9 + peakIndex, now: values[nowIndex], nowHour: 9 + nowIndex,
      }),
    }, ...values.map((v, i) => {
      const labelled = i === peakIndex || i === nowIndex;
      return h('div', { class: `bar-chart__item${i === peakIndex ? ' bar-chart__item--peak' : ''}` },
        labelled ? h('span', { class: 'bar-chart__value' }, String(v)) : null,
        h('span', { class: 'bar-chart__bar', style: { height: `${v}%` }, title: `${9 + i}:00 · ${v}` }),
        h('small', {}, String(9 + i)));
    }));
  }

  /* Строка таблицы сама и есть кнопка. Колонка с одинаковой кнопкой «Детали»
     на каждой из десяти строк была десятикратным повтором одного действия
     (правило 7), а открывала она модал с двумя фактами и вечно выключенной
     кнопкой «Назначить оператора» — контрол, который никогда не сработает,
     учит не доверять контролам (§6). */
  function windowTable(rows) {
    const cols = ['window', 'operator', 'state', 'served'];
    const labels = Object.fromEntries(cols.map(key => [key, t(`dash.center.${key}`)]));
    return h('div', { class: 'table-wrap' }, h('table', { class: 'data-table window-table' },
      h('thead', {}, h('tr', {},
        ...cols.map(key => h('th', {}, labels[key])),
        h('th', { class: 'data-table__go' }, h('span', { class: 'sr-only' }, t('dash.center.state'))))),
      h('tbody', {}, ...rows.map(row => {
        const open = () => openWindowDrawer(row);
        return h('tr', {
          class: 'data-row', tabindex: '0',
          'aria-label': t('dash.center.rowAria', { n: row.no, operator: row.operator }),
          onClick: open,
          onKeydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } },
        },
          titleAlignedCell(labels.window, String(row.no), 'tnum'),
          titleAlignedCell(labels.operator, row.operator),
          titleAlignedCell(labels.state, statusIcon(statusTone[row.status], t(`dash.center.${row.status}`), { iconName: statusGlyph[row.status] })),
          titleAlignedCell(labels.served, String(row.served), 'tnum'),
          h('td', { class: 'data-table__go' }, icon('chev-r', { size: 20 })));
      }))));
  }

  /* Разбор открывается слоем-ящиком там же, где по нему кликнули. Раньше он
     дописывался <aside>-ом в самый низ страницы — под таблицу окон, за
     пределы экрана: клик по карточке очереди визуально не делал ничего. */
  function openQueueDrawer(q) {
    drawer(q.label, t('dash.center.queue'), [
      kpiStat(String(q.waiting), t('dash.center.waiting'), `${q.long} ${t('dash.center.long')}`, q.long ? 'warn' : ''),
      kpiStat(q.wait, t('dash.center.avg'), t('dash.center.sla'), ''),
    ]);
  }

  function openWindowDrawer(row) {
    drawer(`${t('dash.center.window')} ${row.no}`, row.operator, [
      kpiStat(String(row.served), t('dash.center.served'), '', ''),
      kpiStat(row.avg, t('dash.center.avg'), '', ''),
    ], h('div', { class: 'row g-2' },
      statusIcon(statusTone[row.status], t(`dash.center.${row.status}`), { iconName: statusGlyph[row.status] }),
      h('span', {}, t(`dash.center.${row.status}`))));
  }

  function kpiStat(value, label, context, tone) {
    return h('article', { class: `kpi${tone ? ` kpi--${tone}` : ''}` },
      h('strong', { class: 'kpi__value' }, value),
      h('span', { class: 'kpi__label' }, label),
      context ? h('span', { class: 'kpi__context' }, context) : null);
  }

  function drawer(title, eyebrow, stats, extra = null) {
    let close = () => {};
    const node = h('aside', { class: 'drawer', role: 'dialog', 'aria-modal': 'false', 'aria-label': title },
      h('div', { class: 'drawer__head' },
        h('div', { class: 'stack g-1' },
          h('span', { class: 'label' }, eyebrow),
          h('h2', { class: 'h2--card' }, title)),
        h('button', {
          class: 'btn btn--ghost btn--icon btn--s', 'aria-label': t('common.close'),
          onClick: () => close(),
        }, icon('x', { size: 20 }))),
      extra,
      h('div', { class: 'dashboard-kpis dashboard-kpis--small' }, ...stats));
    close = drawerLayer(node);
  }
}
