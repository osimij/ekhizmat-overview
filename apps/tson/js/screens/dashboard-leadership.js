/* ============================================================
   Сеть центров обслуживания (#/dashboard-leadership).

   Здесь смотрят не «как дела у меня», а «где по сети хуже всего» — и сразу
   уходят в этот центр. Поэтому проблемные центры вынесены отдельной панелью
   НАД таблицей и кликабельны, а не оставлены баннером под ней (§6: тревожное
   состояние обязано отвечать «что делать дальше»).
   ============================================================ */
import { h, mount, icon, statusIcon, filterSelect } from '../ui.js';
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
        h('span', { class: 'small ink-faint' }, t('dash.network.demo')),
        h('h1', { class: 'page-title' }, t('dash.network.title')),
        h('p', { class: 'ink-2' }, t('dash.network.lead'))),
      // «Аудитория» удалена: она прятала столбики в единственной секции
      // распределения и при этом стояла рядом с фильтрами, которые меняют
      // весь экран. Контрол, врущий про свою область действия, хуже
      // отсутствующего (§3, правило 6).
      h('div', { class: 'dashboard-controls' },
        filterSelect('net-period', 'calendar', t('dash.network.period'),
          [['week', t('dash.network.week')], ['month', t('dash.network.month')]],
          state.period, v => { state.period = v; writeState(state); draw(); }),
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
        h('div', { class: 'audience-bar' },
          h('div', { class: 'row between' }, h('span', {}, a.label), h('b', { class: 'tnum' }, `${a.value}%`)),
          h('span', { class: 'audience-bar__track' }, h('span', { style: { width: `${a.value}%` } }))))));

    const table = h('section', { class: 'panel dashboard-section dashboard-table-section' },
      h('div', { class: 'row between' },
        h('h2', { class: 'h3' }, t('dash.network.centers')),
        h('span', { class: 'small ink-faint tnum' },
          t('dash.network.totalVisits', { n: centers.reduce((sum, row) => sum + row.visits, 0).toLocaleString('ru-RU') }))),
      h('div', { class: 'table-wrap' }, h('table', { class: 'data-table' },
        h('thead', {}, h('tr', {},
          ...['name', 'visits', 'sla', 'wait', 'load', 'state'].map(key => h('th', {}, t(`dash.network.${key}`))),
          h('th', { class: 'data-table__go' }, h('span', { class: 'sr-only' }, t('dash.network.name'))))),
        h('tbody', {}, ...centers.map(centerRow)))));

    mount(host, h('div', { class: 'canvas dashboard' },
      head, kpis, h('div', { class: 'dashboard-grid' }, trend, audience),
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

  /* Тонкая линия с точками и подписанной осью дней. Значения подписаны только
     у четырёх точек — первой, минимальной, максимальной и последней: именно
     они отвечают на вопросы «откуда», «худшее», «лучшее», «сейчас». Прежняя
     легенда печатала все семь значений и порядковые номера, то есть рисовала
     тот же ряд второй раз, ничего к нему не добавляя (правило 6). */
  function trendChart(values) {
    const ns = 'http://www.w3.org/2000/svg';
    const W = 700, H = 180, PAD = 14;
    const min = Math.min(...values), max = Math.max(...values);
    const span = max - min || 1;
    const x = i => (i * W) / (values.length - 1);
    const y = v => H - PAD - ((v - min) / span) * (H - PAD * 2);

    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('role', 'img');
    const deltaPct = ((values.at(-1) - values[0]) / values[0]) * 100;
    svg.setAttribute('aria-label', t('dash.network.trendAria', {
      days: values.length,
      min: min.toLocaleString('ru-RU'),
      max: max.toLocaleString('ru-RU'),
      delta: `${deltaPct > 0 ? '+' : ''}${deltaPct.toFixed(1).replace('.', ',')}%`,
    }));

    const line = document.createElementNS(ns, 'polyline');
    line.setAttribute('points', values.map((v, i) => `${x(i)},${y(v)}`).join(' '));
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', 'currentColor');
    line.setAttribute('stroke-width', '2');
    line.setAttribute('stroke-linejoin', 'round');
    line.setAttribute('stroke-linecap', 'round');
    svg.append(line);

    const labelled = new Set([0, values.length - 1, values.indexOf(min), values.indexOf(max)]);
    values.forEach((v, i) => {
      const dot = document.createElementNS(ns, 'circle');
      dot.setAttribute('cx', x(i)); dot.setAttribute('cy', y(v)); dot.setAttribute('r', '3');
      dot.setAttribute('fill', 'currentColor');
      svg.append(dot);

      if (!labelled.has(i)) return;
      const text = document.createElementNS(ns, 'text');
      // Крайние подписи прижимаются к своей точке, но не к краю панели:
      // без сдвига «2 010» упиралось в левую границу секции.
      const edge = i === 0 ? 4 : i === values.length - 1 ? -4 : 0;
      text.setAttribute('x', x(i) + edge);
      text.setAttribute('y', y(v) - 10);
      text.setAttribute('text-anchor', i === 0 ? 'start' : i === values.length - 1 ? 'end' : 'middle');
      text.setAttribute('font-size', '12');
      text.setAttribute('fill', 'currentColor');
      text.setAttribute('opacity', '.75');
      text.textContent = v.toLocaleString('ru-RU');
      svg.append(text);
    });

    // Ось X — реальные дни, локализованные средствами платформы, а не
    // порядковые номера 1…7, которые ничего не называли.
    const today = new Date();
    const fmt = new Intl.DateTimeFormat(document.documentElement.lang || 'ru', { weekday: 'short' });
    const days = values.map((_, i) => {
      const day = new Date(today);
      day.setDate(today.getDate() - (values.length - 1 - i));
      return fmt.format(day);
    });

    return h('div', { class: 'line-chart' },
      svg,
      h('div', { class: 'line-chart__axis', 'aria-hidden': 'true' }, ...days.map(x2 => h('span', {}, x2))));
  }

  function centerRow(row) {
    const tone = row.status === 'danger' ? 'danger' : row.status === 'warning' ? 'warning' : 'success';
    return h('tr', {
      class: 'data-row', tabindex: '0',
      'aria-label': t('dash.network.rowAria', { name: row.name, region: row.region }),
      onClick: () => open(row),
      onKeydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(row); } },
    },
      h('td', {}, h('b', {}, row.name), h('small', { class: 'ink-faint' }, row.region)),
      h('td', { class: 'tnum' }, String(row.visits)),
      h('td', { class: 'tnum' }, row.sla),
      h('td', { class: 'tnum' }, row.wait),
      h('td', { class: 'tnum' }, row.load),
      h('td', {}, statusIcon(tone, t(`dash.network.${row.status}`))),
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
