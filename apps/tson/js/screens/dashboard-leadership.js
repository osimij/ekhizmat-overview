import { h, mount, icon, statusIcon } from '../ui.js';
import { getLang } from '../i18n.js';
import { TSON_DASHBOARD } from '../mock/data.js';
import { setCenterContext, setRole, ROLE } from '../role.js';

const TXT = {
  ru:{ title:'Сеть центров обслуживания', lead:'Сравнение регионов, SLA и проблемных зон', demo:'Демо-данные', period:'Период', region:'Регион', audience:'Аудитория', all:'Все', week:'7 дней', month:'30 дней', trend:'Динамика визитов', centers:'Центры', name:'Центр', visits:'Визиты', sla:'SLA', wait:'Ожидание', load:'Загрузка', state:'Статус', normal:'Норма', warning:'Внимание', danger:'Критично', distribution:'Распределение по аудиториям', problems:'Требует внимания', problem1:'ЦОН №1, Турсунзаде: среднее ожидание 16:12', problem2:'3 центра временно неактивны' },
  tg:{ title:'Шабакаи марказҳои хизматрасонӣ', lead:'Муқоисаи минтақаҳо, SLA ва нуқтаҳои мушкил', demo:'Маълумоти намоишӣ', period:'Давра', region:'Минтақа', audience:'Аудитория', all:'Ҳама', week:'7 рӯз', month:'30 рӯз', trend:'Тағйири муроҷиатҳо', centers:'Марказҳо', name:'Марказ', visits:'Муроҷиат', sla:'SLA', wait:'Интизорӣ', load:'Сарборӣ', state:'Ҳолат', normal:'Меъёр', warning:'Таваҷҷуҳ', danger:'Ҷиддӣ', distribution:'Тақсимот аз рӯи аудитория', problems:'Таваҷҷуҳ лозим', problem1:'Маркази №1, Турсунзода: интизории миёна 16:12', problem2:'3 марказ муваққатан ғайрифаъол' },
};

export function renderDashboardLeadership(host) {
  const state = { period:'week', region:'all', audience:'all' };
  draw();
  return () => {};

  function copy() { return TXT[getLang()] || TXT.ru; }

  function draw() {
    const x = copy();
    const d = TSON_DASHBOARD.network;
    const centers = d.centers.filter(row => state.region === 'all' || row.region === state.region);
    const regions = [...new Set(d.centers.map(row => row.region))];

    const head = h('header', { class:'dashboard-head' },
      h('div', { class:'stack g-2' },
        h('span', { class:'review-badge review-badge--stage' }, x.demo),
        h('h1', { class:'h2' }, x.title),
        h('p', { class:'ink-2' }, x.lead)),
      h('div', { class:'dashboard-controls' },
        picker(x.period, [['week', x.week], ['month', x.month]], state.period, v => { state.period = v; draw(); }),
        picker(x.region, [['all', x.all], ...regions.map(v => [v, v])], state.region, v => { state.region = v; draw(); }),
        picker(x.audience, [['all', x.all], ['person', 'ФЛ'], ['business', 'ЮЛ'], ['guest', 'Гость']], state.audience, v => { state.audience = v; draw(); })));

    const kpis = h('section', { class:'dashboard-kpis', 'aria-label':'KPI' }, ...d.kpis.map(k =>
      h('article', { class:'metric dashboard-metric' },
        h('span', { class:'metric__label' }, k.label), h('strong', { class:'metric__value' }, k.value), h('span', { class:'metric__context' }, k.context))));

    const trendPoints = d.trend.map((v, i) => `${i * 116},${170 - (v - 1900) / 4}`).join(' ');
    const legendRows = d.trend.map((v, i) => h('span', {}, h('small', {}, String(i + 1)), h('b', {}, String(v))));
    const trendChart = h('div', { class:'line-chart' },
      trendGraphic(trendPoints, x.trend),
      h('div', { class:'chart-legend' }, ...legendRows));
    const trend = h('section', { class:'panel dashboard-section' },
      h('h2', { class:'h3' }, x.trend),
      trendChart);

    const audienceRows = d.audiences.filter(a => state.audience === 'all' || ({ person:'ФЛ', business:'ЮЛ', guest:'Гость' })[state.audience] === a.label);
    const audienceBars = audienceRows.map(a => h('div', { class:'audience-bar' },
      h('div', { class:'row between' }, h('span', {}, a.label), h('b', {}, `${a.value}%`)),
      h('span', { class:'audience-bar__track' }, h('span', { style:{ width:`${a.value}%` } }))));
    const audience = h('section', { class:'panel dashboard-section' },
      h('h2', { class:'h3' }, x.distribution),
      h('div', { class:'audience-bars' }, ...audienceBars));

    const table = h('section', { class:'panel dashboard-section dashboard-table-section' },
      h('div', { class:'row between' }, h('h2', { class:'h3' }, x.centers),
        h('span', { class:'small ink-faint' }, `${centers.reduce((sum, row) => sum + row.visits, 0).toLocaleString('ru-RU')} ${x.visits.toLowerCase()}`)),
      h('div', { class:'table-wrap' }, h('table', { class:'data-table' },
        h('thead', {}, h('tr', {}, ...['name', 'visits', 'sla', 'wait', 'load', 'state'].map(key => h('th', {}, x[key])))),
        h('tbody', {}, ...centers.map(row => centerRow(row, x))))),
      h('aside', { class:'banner banner--warning dashboard-problems' }, icon('info'),
        h('div', { class:'stack g-1' }, h('b', {}, x.problems), h('span', {}, x.problem1), h('span', {}, x.problem2))));

    mount(host, h('div', { class:'canvas dashboard' }, head, kpis, h('div', { class:'dashboard-grid' }, trend, audience), table));
  }

  function picker(label, options, value, onChange) {
    return h('label', { class:'dashboard-select' }, h('span', { class:'small ink-faint' }, label),
      h('select', { class:'input', onChange:e => onChange(e.target.value) },
        ...options.map(([v, name]) => h('option', { value:v, selected:v === value }, name))));
  }

  function trendGraphic(points, label) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 700 180');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', label);
    const line = document.createElementNS(ns, 'polyline');
    line.setAttribute('points', points);
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', 'currentColor');
    line.setAttribute('stroke-width', '4');
    svg.append(line);
    return svg;
  }

  function centerRow(row, x) {
    const tone = row.status === 'danger' ? 'danger' : row.status === 'warning' ? 'warning' : 'success';
    const open = () => { setCenterContext(row); setRole(ROLE.SUPERVISOR); location.hash = '#/dashboard-center'; };
    return h('tr', { class:'dashboard-center-row', tabindex:'0', onClick:open, onKeydown:e => { if (e.key === 'Enter') open(); } },
      h('td', {}, h('b', {}, row.name), h('small', { class:'ink-faint' }, row.region)),
      h('td', { class:'tnum' }, String(row.visits)), h('td', { class:'tnum' }, row.sla),
      h('td', { class:'tnum' }, row.wait), h('td', { class:'tnum' }, row.load),
      h('td', {}, statusIcon(tone, x[row.status])));
  }
}
