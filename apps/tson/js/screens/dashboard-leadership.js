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
      trendChart(d.trend));

    // Все три полосы всегда на месте — секция и существует ради сравнения.
    const audience = h('section', { class: 'panel dashboard-section' },
      h('h2', { class: 'h3' }, t('dash.network.distribution')),
      h('div', { class: 'audience-bars' }, ...d.audiences.map(a =>
        h('div', { class: `audience-bar audience-bar--${a.id}` },
          h('div', { class: 'row between' }, h('span', {}, a.label), h('b', { class: 'tnum' }, `${a.value}%`)),
          h('span', { class: 'audience-bar__track' }, h('span', { style: { width: `${a.value}%` } }))))));

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

  /* Кривая динамики: сетка, заливка и одна акцентная точка «сейчас» — без
     wireframe-рамки и без дублирования всех семи значений (правило 6). */
  function trendChart(values) {
    const ns = 'http://www.w3.org/2000/svg';
    const W = 700;
    const H = 160;
    const padTop = 28;
    const padBottom = 10;
    const padX = 6;
    const plotH = H - padTop - padBottom;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const x = i => padX + (i * (W - padX * 2)) / (values.length - 1);
    const y = v => padTop + plotH - ((v - min) / span) * plotH;
    const pts = values.map((v, i) => ({ x: x(i), y: y(v), v }));

    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('class', 'line-chart__plot');
    svg.setAttribute('role', 'img');
    const deltaPct = ((values.at(-1) - values[0]) / values[0]) * 100;
    svg.setAttribute('aria-label', t('dash.network.trendAria', {
      days: values.length,
      min: min.toLocaleString('ru-RU'),
      max: max.toLocaleString('ru-RU'),
      delta: `${deltaPct > 0 ? '+' : ''}${deltaPct.toFixed(1).replace('.', ',')}%`,
    }));

    const defs = document.createElementNS(ns, 'defs');
    const grad = document.createElementNS(ns, 'linearGradient');
    grad.setAttribute('id', 'dash-trend-area');
    grad.setAttribute('x1', '0');
    grad.setAttribute('y1', '0');
    grad.setAttribute('x2', '0');
    grad.setAttribute('y2', '1');
    const stopA = document.createElementNS(ns, 'stop');
    stopA.setAttribute('offset', '0%');
    stopA.setAttribute('class', 'line-chart__grad-a');
    const stopB = document.createElementNS(ns, 'stop');
    stopB.setAttribute('offset', '100%');
    stopB.setAttribute('class', 'line-chart__grad-b');
    grad.append(stopA, stopB);
    defs.append(grad);
    svg.append(defs);

    const grid = document.createElementNS(ns, 'g');
    grid.setAttribute('class', 'line-chart__grid');
    grid.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 4; i += 1) {
      const gy = padTop + (i * plotH) / 3;
      const line = document.createElementNS(ns, 'line');
      line.setAttribute('x1', String(padX));
      line.setAttribute('x2', String(W - padX));
      line.setAttribute('y1', String(gy));
      line.setAttribute('y2', String(gy));
      grid.append(line);
    }
    svg.append(grid);

    const baseline = padTop + plotH;
    const lineD = smoothLinePath(pts);
    const area = document.createElementNS(ns, 'path');
    area.setAttribute('class', 'line-chart__area');
    area.setAttribute('d', `${lineD} L ${pts.at(-1).x},${baseline} L ${pts[0].x},${baseline} Z`);

    const line = document.createElementNS(ns, 'path');
    line.setAttribute('class', 'line-chart__line');
    line.setAttribute('d', lineD);

    svg.append(area, line);

    // Тихие подписи min/max у сетки — ориентир без второй легенды.
    [min, max].forEach((v, i) => {
      const label = document.createElementNS(ns, 'text');
      label.setAttribute('class', 'line-chart__bound');
      label.setAttribute('x', String(W - padX));
      label.setAttribute('y', String(i === 0 ? padTop + plotH + 1 : padTop + 4));
      label.setAttribute('text-anchor', 'end');
      label.textContent = v.toLocaleString('ru-RU');
      svg.append(label);
    });

    const last = pts.at(-1);
    const dot = document.createElementNS(ns, 'circle');
    dot.setAttribute('class', 'line-chart__dot');
    dot.setAttribute('cx', String(last.x));
    dot.setAttribute('cy', String(last.y));
    dot.setAttribute('r', '5');

    const value = document.createElementNS(ns, 'text');
    value.setAttribute('class', 'line-chart__value');
    value.setAttribute('x', String(last.x));
    value.setAttribute('y', String(last.y - 12));
    value.setAttribute('text-anchor', 'end');
    value.textContent = last.v.toLocaleString('ru-RU');

    svg.append(dot, value);

    const today = new Date();
    const fmt = new Intl.DateTimeFormat(document.documentElement.lang || 'ru', { weekday: 'short' });
    const days = values.map((_, i) => {
      const day = new Date(today);
      day.setDate(today.getDate() - (values.length - 1 - i));
      return fmt.format(day);
    });

    return h('div', { class: 'line-chart' },
      svg,
      h('div', { class: 'line-chart__axis tnum', 'aria-hidden': 'true' }, ...days.map(d => h('span', {}, d))));
  }

  function smoothLinePath(points) {
    if (points.length < 2) return '';
    let d = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i += 1) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
    return d;
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
