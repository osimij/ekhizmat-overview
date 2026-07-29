import { h, mount, icon, modal } from '../ui.js';
import { getLang } from '../i18n.js';
import { TSON_DASHBOARD } from '../mock/data.js';
import { getCenterContext } from '../role.js';

const TXT = {
  ru:{ title:'Операционная панель центра', demo:'Демо-данные', updated:'Обновлено', today:'Сегодня', week:'Неделя', scenario:'Сценарий', normal:'Обычный', high:'Высокая очередь', empty:'Пустой период', loading:'Загрузка', error:'Ошибка', retry:'Повторить', errorText:'Не удалось обновить данные', queue:'Очередь по зонам', waiting:'ожидают', long:'дольше 15 минут', avg:'среднее', load:'Нагрузка по часам', windows:'Окна и операторы', window:'Окно', operator:'Оператор', state:'Состояние', served:'Обслужено', details:'Детали', serving:'Работает', break:'Перерыв', closed:'Закрыто', alerts:'Требует внимания', emptyText:'За выбранный период визитов нет.', assign:'Назначить оператора', demoOnly:'Действие доступно только в рабочей системе.', period:'Период', close:'Закрыть' },
  tg:{ title:'Панели амалиётии марказ', demo:'Маълумоти намоишӣ', updated:'Нав шуд', today:'Имрӯз', week:'Ҳафта', scenario:'Саҳна', normal:'Одатӣ', high:'Навбати зиёд', empty:'Давраи холӣ', loading:'Боркунӣ', error:'Хато', retry:'Такрор кардан', errorText:'Маълумотро нав кардан муяссар нашуд', queue:'Навбат аз рӯи минтақа', waiting:'интизоранд', long:'зиёда аз 15 дақиқа', avg:'миёна', load:'Сарборӣ аз рӯи соат', windows:'Тирезаҳо ва операторон', window:'Тиреза', operator:'Оператор', state:'Ҳолат', served:'Хизмат гирифт', details:'Ҷузъиёт', serving:'Кор мекунад', break:'Танаффус', closed:'Пӯшида', alerts:'Таваҷҷуҳ лозим', emptyText:'Дар давраи интихобшуда муроҷиат нест.', assign:'Таъини оператор', demoOnly:'Ин амал танҳо дар системаи корӣ дастрас аст.', period:'Давра', close:'Пӯшидан' },
};
const statusTone = { serving:'success', break:'warning', closed:'danger' };

export function renderDashboardCenter(host) {
  let period = 'today';
  let mode = 'normal';
  let selected = null;
  draw();
  return () => {};

  function copy() { return TXT[getLang()] || TXT.ru; }

  function draw() {
    const x = copy();
    const d = TSON_DASHBOARD.center;

    if (mode === 'loading') {
      mount(host, h('div', { class:'canvas dashboard' },
        dashboardHeader(x, d),
        h('div', { class:'skel skel--line' }),
        h('div', { class:'dashboard-kpis' }, ...d.kpis.map(() => h('div', { class:'skel skel--card' }))),
        h('div', { class:'skel skel--card' })));
      return;
    }

    if (mode === 'error' || mode === 'empty') {
      const isError = mode === 'error';
      mount(host, h('div', { class:'canvas dashboard' },
        dashboardHeader(x, d),
        h('div', { class:'panel dashboard-state' },
          icon(isError ? 'info' : 'history', { size:48 }),
          h('h2', { class:'h3' }, isError ? x.errorText : x.emptyText),
          h('button', { class:'btn btn--primary', onClick:() => { mode = 'normal'; draw(); } }, isError ? x.retry : x.today))));
      return;
    }

    const high = mode === 'high';
    const kpis = d.kpis.map(k => k.id === 'queue' && high
      ? { ...k, value:'29', context:'11 ожидают больше 15 минут', tone:'danger' }
      : k);

    const nodes = [
      dashboardHeader(x, d),
      h('section', { class:'dashboard-kpis', 'aria-label':'KPI' }, ...kpis.map(metric)),
      high ? h('div', { class:'banner banner--danger' }, icon('info'), h('span', { class:'banner__text' }, `${x.alerts}: 11 ${x.long}.`)) : null,
      h('div', { class:'dashboard-grid' },
        h('section', { class:'panel dashboard-section' },
          h('div', { class:'row between' }, h('h2', { class:'h3' }, x.queue), h('span', { class:'small ink-faint' }, period === 'today' ? x.today : x.week)),
          h('div', { class:'queue-grid' }, ...d.queues.map((q, i) => queueCard(q, high && i === 0, x)))),
        h('section', { class:'panel dashboard-section' },
          h('h2', { class:'h3' }, x.load),
          h('div', { class:'bar-chart', 'aria-label':x.load }, ...d.hours.map((v, i) =>
            h('div', { class:'bar-chart__item' },
              h('span', { class:'bar-chart__bar', style:{ height:`${high ? Math.min(100, v + 22) : v}%` }, title:`${9 + i}:00 · ${v}` }),
              h('small', {}, String(9 + i))))))),
      h('section', { class:'panel dashboard-section' },
        h('div', { class:'row between' }, h('h2', { class:'h3' }, x.windows), h('span', { class:'demo-data-badge' }, x.demo)),
        windowTable(d.windows, x)),
      selected ? queueDetail(selected, x) : null,
    ];
    mount(host, h('div', { class:'canvas dashboard' }, ...nodes));
  }

  function dashboardHeader(x, d) {
    const context = getCenterContext();
    return h('header', { class:'dashboard-head' },
      h('div', { class:'stack g-2' },
        h('div', { class:'row g-2' }, h('span', { class:'review-badge review-badge--stage' }, x.demo), h('span', { class:'small ink-faint' }, `${x.updated} ${d.updated}`)),
        h('h1', { class:'h2' }, context?.name || d.name),
        h('p', { class:'ink-2' }, x.title)),
      h('div', { class:'dashboard-controls' },
        selectControl(x.period, [['today', x.today], ['week', x.week]], period, v => { period = v; draw(); }),
        selectControl(x.scenario, [['normal', x.normal], ['high', x.high], ['empty', x.empty], ['loading', x.loading], ['error', x.error]], mode, v => { mode = v; draw(); })));
  }

  function selectControl(label, options, value, onChange) {
    return h('label', { class:'dashboard-select' },
      h('span', { class:'small ink-faint' }, label),
      h('select', { class:'input', onChange:e => onChange(e.target.value) },
        ...options.map(([v, name]) => h('option', { value:v, selected:v === value }, name))));
  }

  function metric(k) {
    const tone = k.tone === 'warn' ? 'warning' : k.tone === 'danger' ? 'danger' : 'success';
    return h('article', { class:`metric dashboard-metric${k.tone === 'danger' ? ' dashboard-metric--danger' : ''}` },
      h('span', { class:'metric__label' }, k.label),
      h('strong', { class:'metric__value' }, k.value),
      h('span', { class:`metric__context metric__context--${tone}` }, k.context));
  }

  function queueCard(q, isHigh, x) {
    const waiting = isHigh ? 18 : q.waiting;
    return h('button', { class:`queue-card${isHigh ? ' queue-card--danger' : ''}`, onClick:() => { selected = { ...q, waiting }; draw(); } },
      h('span', { class:'queue-card__name' }, q.label), h('strong', {}, String(waiting)),
      h('span', { class:'small ink-2' }, x.waiting), h('span', { class:'small ink-faint' }, `${x.avg}: ${q.wait}`));
  }

  function windowTable(rows, x) {
    return h('div', { class:'table-wrap' }, h('table', { class:'data-table' },
      h('thead', {}, h('tr', {}, ...['window', 'operator', 'state', 'served', 'details'].map(key => h('th', {}, x[key])))),
      h('tbody', {}, ...rows.map(row => h('tr', {},
        h('td', { class:'tnum' }, String(row.no)), h('td', {}, row.operator),
        h('td', {}, h('span', { class:`status-pill status-pill--${statusTone[row.status]}` }, x[row.status])),
        h('td', { class:'tnum' }, String(row.served)),
        h('td', {}, h('button', { class:'btn btn--ghost btn--s', onClick:() => operatorDetail(row, x) }, x.details)))))));
  }

  function queueDetail(q, x) {
    return h('aside', { class:'panel dashboard-drilldown' },
      h('div', { class:'row between' }, h('div', {}, h('span', { class:'label' }, x.queue), h('h2', { class:'h3' }, q.label)),
        h('button', { class:'btn btn--ghost btn--icon', onClick:() => { selected = null; draw(); }, 'aria-label':x.close }, icon('x'))),
      h('div', { class:'dashboard-kpis dashboard-kpis--small' },
        metric({ label:x.waiting, value:String(q.waiting), context:`${q.long} ${x.long}`, tone:q.long ? 'warn' : 'good' }),
        metric({ label:x.avg, value:q.wait, context:'SLA ≤ 10:00', tone:'good' })));
  }

  function operatorDetail(row, x) {
    let close = () => {};
    close = modal({
      title:`${x.window} ${row.no}`,
      body:h('div', { class:'stack g-4' },
        h('div', { class:'def' },
          h('div', { class:'def__row' }, h('span', { class:'def__key' }, x.operator), h('span', { class:'def__val' }, row.operator)),
          h('div', { class:'def__row' }, h('span', { class:'def__key' }, x.served), h('span', { class:'def__val' }, String(row.served)))),
        h('p', { class:'small ink-faint' }, x.demoOnly)),
      actions:[h('button', { class:'btn btn--secondary', disabled:true }, x.assign), h('button', { class:'btn btn--primary', onClick:() => close() }, x.close)],
    });
  }
}
