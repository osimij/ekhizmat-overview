/* ============================================================
   Сеть центров обслуживания (#/dashboard-leadership).

   Здесь смотрят не «как дела у меня», а «где по сети хуже всего» — и сразу
   уходят в этот центр. Поэтому проблемные центры вынесены отдельной панелью
   НАД таблицей и кликабельны, а не оставлены баннером под ней (§6: тревожное
   состояние обязано отвечать «что делать дальше»).
   ============================================================ */
import { h, mount, icon, statusIcon, titleAlignedCell, filterSelect } from '../ui.js';
import { t } from '../i18n.js';
import { TSON_DASHBOARD } from '../mock/data.js';
import { setCenterContext, setRole, ROLE } from '../role.js';

const PERIODS = ['week', 'month'];

/* Календарная неделя, пн→вс, а не «сегодня минус шесть». 5 января 2026 —
   понедельник; Intl даёт короткие имена на текущем языке без словаря.
   Первая буква заглавная — это sentence case ярлыка, не uppercase (§1). */
function weekdaysMonSun() {
  const lang = document.documentElement.lang || 'ru';
  const fmt = new Intl.DateTimeFormat(lang, { weekday: 'short' });
  return Array.from({ length: 7 }, (_, i) => {
    const raw = fmt.format(new Date(2026, 0, 5 + i)).replace(/\.$/, '');
    return raw ? raw.charAt(0).toLocaleUpperCase(lang) + raw.slice(1) : raw;
  });
}

/* Как и на панели центра: период и регион — не персональные данные, и адрес
   вправе их помнить (§7). Всё, что не из белого списка, игнорируется. */
function readState(regions) {
  const q = new URLSearchParams(location.hash.split('?')[1] || '');
  const period = PERIODS.includes(q.get('period')) ? q.get('period') : 'week';
  const region = regions.includes(q.get('region')) ? q.get('region') : 'all';
  return { period, region };
}

function writeState(state) {
  const base = location.hash.split('?')[0];
  const q = new URLSearchParams();
  if (state.period !== 'week') q.set('period', state.period);
  if (state.region !== 'all') q.set('region', state.region);
  const s = q.toString();
  history.replaceState(null, '', s ? `${base}?${s}` : base);
}

export function renderDashboardLeadership(host) {
  const d = TSON_DASHBOARD.network;
  // Пары «код → подпись»: в адрес уезжает код, человеку показывается подпись.
  const regions = [...new Map(d.centers.map(row => [row.regionId, row.region])).entries()];
  const allowed = ['all', ...regions.map(([id]) => id)];
  let state = readState(allowed);
  draw();

  /* Адрес — тоже источник состояния, а не только его отражение (§7): «назад»
     и правка строки вручную обязаны вернуть экран к тому, что в адресе. */
  const onHash = () => { state = readState(allowed); draw(); };
  addEventListener('hashchange', onHash);
  return () => removeEventListener('hashchange', onHash);

  function draw() {
    const centers = d.centers.filter(row => state.region === 'all' || row.regionId === state.region);

    const head = h('header', { class: 'dashboard-head' },
      h('div', { class: 'stack g-2' },
        h('h1', { class: 'page-title' }, t('dash.network.title')),
        h('p', { class: 'ink-2' }, t('dash.network.lead'))),
      // «Аудитория» удалена: она прятала столбики в единственной секции
      // распределения и при этом стояла рядом с фильтрами, которые меняют
      // весь экран. Контрол, врущий про свою область действия, хуже
      // отсутствующего (§3, правило 6).
      h('div', { class: 'dashboard-controls' },
        filterSelect('net-period', 'calendar', t('dash.network.period'),
          [['week', t('dash.network.week')], ['month', t('dash.network.month')]],
          state.period, v => { state.period = v; writeState(state); draw(); },
          'dashboard-period-filter'),
        filterSelect('net-region', 'filter', t('dash.network.region'),
          [['all', t('dash.network.all')], ...regions],
          state.region, v => { state.region = v; writeState(state); draw(); })));

    const kpis = h('section', { class: 'dashboard-kpis', 'aria-label': 'KPI' },
      ...d.kpis.map(k => h('article', { class: 'kpi' },
        h('strong', { class: 'kpi__value' }, k.value),
        h('span', { class: 'kpi__label' }, t(`dash.network.kpi.${k.id}`)),
        h('span', { class: 'kpi__context' }, t(`dash.network.kpi.${k.id}.ctx`)))));

    const trend = h('section', { class: 'panel dashboard-section' },
      h('h2', { class: 'h3' }, t('dash.network.trend')),
      weekChart(d.trend));

    // Три столбика всегда на месте — секция и существует ради сравнения
    // по высоте, а не по длине полосы. Подпись и доля видимы без hover (правило 20).
    const audience = h('section', { class: 'panel dashboard-section' },
      h('h2', { class: 'h3' }, t('dash.network.distribution')),
      h('div', {
        class: 'audience-bars',
        role: 'img',
        'aria-label': t('dash.network.distributionAria', Object.fromEntries(
          d.audiences.map(a => [a.id, String(a.value)]))),
      }, ...d.audiences.map(a =>
        h('div', { class: `audience-bar audience-bar--${a.id}` },
          h('span', { class: 'audience-bar__value tnum' }, `${a.value}%`),
          h('span', { class: 'audience-bar__col', 'aria-hidden': 'true' },
            h('span', { class: 'audience-bar__fill', style: { height: `${a.value}%` } })),
          h('span', { class: 'audience-bar__label' }, a.label)))));

    const tableColumns = ['name', 'visits', 'sla', 'wait', 'load', 'state'];
    const tableLabels = Object.fromEntries(tableColumns.map(key => [key, t(`dash.network.${key}`)]));
    const table = h('section', { class: 'panel dashboard-section dashboard-table-section' },
      h('div', { class: 'row between' },
        h('h2', { class: 'h3' }, t('dash.network.centers')),
        h('span', { class: 'small ink-faint tnum' },
          t('dash.network.totalVisits', { n: centers.reduce((sum, row) => sum + row.visits, 0).toLocaleString('ru-RU') }))),
      h('div', { class: 'table-wrap' }, h('table', { class: 'data-table' },
        h('thead', {}, h('tr', {},
          ...tableColumns.map(key => h('th', {}, tableLabels[key])),
          h('th', { class: 'data-table__go' }, h('span', { class: 'sr-only' }, t('dash.network.name'))))),
        h('tbody', {}, ...centers.map(row => centerRow(row, tableLabels))))));

    mount(host, h('div', { class: 'canvas dashboard' },
      head,
      h('div', { class: 'dashboard-overview' },
        kpis,
        h('div', { class: 'dashboard-grid' }, trend, audience)),
      alertsPanel(centers), table));
  }

  /* Тревоги выводятся из данных, а не записаны словами: пока они были двумя
     захардкоженными строками, они устаревали молча и никуда не вели. */
  function alertsPanel(centers) {
    const problems = centers.filter(row => row.status !== 'normal');
    if (!problems.length) return null;

    return h('section', { class: 'panel dashboard-section' },
      h('h2', { class: 'h3' }, t('dash.network.alerts')),
      h('div', { class: 'alerts' }, ...problems.map(row => h('button', {
        class: 'alert-row',
        'aria-label': t('dash.network.rowAria', { name: row.name, region: row.region }),
        onClick: () => open(row),
      },
        statusIcon(row.status === 'danger' ? 'danger' : 'warning', t(`dash.network.${row.status}`)),
        h('span', { class: 'alert-row__text' },
          t(row.status === 'danger' ? 'dash.network.alertLoad' : 'dash.network.alertWait',
            { name: row.name, wait: row.wait, load: row.load })),
        icon('chev-r', { size: 20, cls: 'alert-row__chev' })))));
  }

  /* Горизонтальные полосы пн→вс на всю ширину панели. Вертикальные столбики
     оставляли пустоту по бокам; сплайн — пустоту сверху и снизу. Подпись дня
     и число всегда на месте (правило 20). */
  function weekChart(values) {
    const peak = Math.max(...values);
    const peakIndex = values.indexOf(peak);
    const min = Math.min(...values);
    const deltaPct = ((values.at(-1) - values[0]) / values[0]) * 100;
    const days = weekdaysMonSun();

    return h('div', {
      class: 'week-chart', role: 'img',
      'aria-label': t('dash.network.trendAria', {
        days: values.length,
        min: min.toLocaleString('ru-RU'),
        max: peak.toLocaleString('ru-RU'),
        delta: `${deltaPct > 0 ? '+' : ''}${deltaPct.toFixed(1).replace('.', ',')}%`,
      }),
    }, ...values.map((v, i) =>
      h('div', { class: `week-chart__row${i === peakIndex ? ' week-chart__row--peak' : ''}` },
        h('span', { class: 'week-chart__day' }, days[i]),
        h('span', { class: 'week-chart__track', 'aria-hidden': 'true' },
          h('span', { class: 'week-chart__fill', style: { width: `${(v / peak) * 100}%` } })),
        h('span', { class: 'week-chart__value tnum' }, v.toLocaleString('ru-RU')))));
  }

  function centerRow(row, labels) {
    const tone = row.status === 'danger' ? 'danger' : row.status === 'warning' ? 'warning' : 'success';
    return h('tr', {
      class: 'data-row', tabindex: '0',
      'aria-label': t('dash.network.rowAria', { name: row.name, region: row.region }),
      onClick: () => open(row),
      onKeydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(row); } },
    },
      h('td', {}, h('b', {}, row.name), h('small', { class: 'ink-faint' }, row.region)),
      titleAlignedCell(labels.visits, String(row.visits), 'tnum'),
      titleAlignedCell(labels.sla, row.sla, 'tnum'),
      titleAlignedCell(labels.wait, row.wait, 'tnum'),
      titleAlignedCell(labels.load, row.load, 'tnum'),
      titleAlignedCell(labels.state, statusIcon(tone, t(`dash.network.${row.status}`))),
      // Строка ведёт в центр — и это должно быть видно до наведения мыши
      // (правило 20): шеврон стоит там же, где в строках каталога.
      h('td', { class: 'data-table__go' }, icon('chev-r', { size: 20 })));
  }

  function open(row) {
    setCenterContext(row);
    setRole(ROLE.SUPERVISOR);
    location.hash = '#/dashboard-center';
  }
}
