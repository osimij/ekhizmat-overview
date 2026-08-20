import { describeStatus, getLowCodeState, getReviewQueue, getRoleHint, localizeValue, subscribeLowCode } from './lowcode.js';

const icon = name => `<svg aria-hidden="true"><use href="/design-system/assets/icons.svg#${name}"/></svg>`;
const COPY = {
  tg: {
    title:'Нишондиҳандаҳои хизматҳо',
    total:'Ҳамаи хизматҳо', draft:'Сиёҳнавис', review:'Дар баррасӣ', approved:'Интизори нашр', published:'Нашршуда', errors:'Хатои танзим',
    tasks:'Вазифаҳои баррасии ман', sla:'Вайроншавии SLA', activity:'Навсозиҳои корӣ',
    version:'Версия', overdue:'Дермонӣ',
    all:'Ҳама', changes:'Тағйирот', tests:'Санҷишҳо', publications:'Нашрҳо',
    success:'Санҷиш гузашт', failed:'Санҷиш нагузашт',
    empty:'Ҳоло вазифаи баррасӣ нест.', slaEmpty:'Вайроншавии SLA нест.', slaEmptyHint:'Ҳамаи хизматҳо дар муҳлат коркард мешаванд.',
  },
  ru: {
    title:'Показатели услуг',
    total:'Все услуги', draft:'Черновики', review:'На проверке', approved:'Ожидают публикации', published:'Опубликованы', errors:'Ошибки настройки',
    tasks:'Мои задачи проверки', sla:'Нарушения SLA', activity:'Рабочие обновления',
    version:'Версия', overdue:'Просрочка',
    all:'Все', changes:'Изменения', tests:'Тесты', publications:'Публикации',
    success:'Тест пройден', failed:'Тест не пройден',
    empty:'Задач проверки пока нет.', slaEmpty:'Нарушений SLA нет.', slaEmptyHint:'Все услуги обрабатываются в срок.',
  },
  en: {
    title:'Service metrics',
    total:'All services', draft:'Drafts', review:'In review', approved:'Awaiting publication', published:'Published', errors:'Configuration errors',
    tasks:'My review tasks', sla:'SLA violations', activity:'Work updates',
    version:'Version', overdue:'Overdue',
    all:'All', changes:'Changes', tests:'Tests', publications:'Publications',
    success:'Test passed', failed:'Test failed',
    empty:'No review tasks yet.', slaEmpty:'No SLA violations.', slaEmptyHint:'Every service is being handled inside its deadline.',
  }
};

/* SLA breaches and the activity stream are named demo data: one list each, so a
   number on this page can never disagree with the list beneath it. */
const CONTENT = {
  tg: {
    sla: [
      { service:'Иваз кардани ID-корт', agency:'ВКД', stage:'Санҷиши ҳуҷҷатҳо', overdue:'1 р. 4 с.' },
      { service:'Маълумотномаи андоз', agency:'Кумитаи андоз', stage:'Баррасии мутахассис', overdue:'6 с.' },
    ],
    events: [
      { type:'change',      at:'12.08, 14:20', ts:'2026-08-12T14:20', title:'Маълумотнома — ҳайати оила', meta:'Фируза Н. · майдонҳои шакл' },
      { type:'test-pass',   at:'12.08, 14:18', ts:'2026-08-12T14:18', title:'Маълумотнома — ҳайати оила · v2.3', meta:'8 сенария · 0 хато' },
      { type:'change',      at:'12.08, 11:05', ts:'2026-08-12T11:05', title:'Бақайдгирии таваллуд', meta:'Аброр К. · раванди хизмат' },
      { type:'publication', at:'12.08, 10:30', ts:'2026-08-12T10:30', title:'Сабти соҳибкори инфиродӣ · v5.2', meta:'Аброр К.' },
      { type:'test-fail',   at:'12.08, 13:44', ts:'2026-08-12T13:44', title:'Иваз кардани ID-корт · v4.0', meta:'6 сенария · 1 хато' },
      { type:'change',      at:'11.08, 17:40', ts:'2026-08-11T17:40', title:'Иқтибос аз феҳристи замин', meta:'Меҳринисо С. · натиҷаи хизмат' },
      { type:'publication', at:'11.08, 16:12', ts:'2026-08-11T16:12', title:'Маълумотномаи доғи судӣ · v2.1', meta:'Меҳринисо С.' },
    ],
  },
  ru: {
    sla: [
      { service:'Замена ID-карты', agency:'МВД', stage:'Проверка документов', overdue:'1 д. 4 ч.' },
      { service:'Налоговая справка', agency:'Налоговый комитет', stage:'Проверка специалистом', overdue:'6 ч.' },
    ],
    events: [
      { type:'change',      at:'12.08, 14:20', ts:'2026-08-12T14:20', title:'Справка о составе семьи', meta:'Фируза Н. · поля формы' },
      { type:'test-pass',   at:'12.08, 14:18', ts:'2026-08-12T14:18', title:'Справка о составе семьи · v2.3', meta:'8 сценариев · 0 ошибок' },
      { type:'change',      at:'12.08, 11:05', ts:'2026-08-12T11:05', title:'Регистрация рождения', meta:'Аброр К. · процесс услуги' },
      { type:'publication', at:'12.08, 10:30', ts:'2026-08-12T10:30', title:'Регистрация ИП · v5.2', meta:'Аброр К.' },
      { type:'test-fail',   at:'12.08, 13:44', ts:'2026-08-12T13:44', title:'Замена ID-карты · v4.0', meta:'6 сценариев · 1 ошибка' },
      { type:'change',      at:'11.08, 17:40', ts:'2026-08-11T17:40', title:'Выписка из земельного реестра', meta:'Мехринисо С. · результат услуги' },
      { type:'publication', at:'11.08, 16:12', ts:'2026-08-11T16:12', title:'Справка о наличии судимости · v2.1', meta:'Мехринисо С.' },
    ],
  },
  en: {
    sla: [
      { service:'ID card replacement', agency:'Ministry of Internal Affairs', stage:'Document check', overdue:'1 d. 4 hr.' },
      { service:'Tax certificate', agency:'Tax Committee', stage:'Specialist review', overdue:'6 hr.' },
    ],
    events: [
      { type:'change',      at:'12.08, 14:20', ts:'2026-08-12T14:20', title:'Family composition certificate', meta:'Firuza N. · form fields' },
      { type:'test-pass',   at:'12.08, 14:18', ts:'2026-08-12T14:18', title:'Family composition certificate · v2.3', meta:'8 scenarios · 0 failures' },
      { type:'change',      at:'12.08, 11:05', ts:'2026-08-12T11:05', title:'Birth registration', meta:'Abror K. · service process' },
      { type:'publication', at:'12.08, 10:30', ts:'2026-08-12T10:30', title:'Sole trader registration · v5.2', meta:'Abror K.' },
      { type:'test-fail',   at:'12.08, 13:44', ts:'2026-08-12T13:44', title:'ID card replacement · v4.0', meta:'6 scenarios · 1 failure' },
      { type:'change',      at:'11.08, 17:40', ts:'2026-08-11T17:40', title:'Land registry extract', meta:'Mehriniso S. · service result' },
      { type:'publication', at:'11.08, 16:12', ts:'2026-08-11T16:12', title:'Certificate of no criminal record · v2.1', meta:'Mehriniso S.' },
    ],
  }
};

/* the URL's ?lang= only reflects how the page was first opened — once the switcher
   fires bp:langchange, that's the live language, even if the URL never changes */
let langOverride = null;
document.addEventListener('bp:langchange', event => { langOverride = (event.detail && event.detail.lang) || langOverride; });
const lang = () => {
  if (langOverride) return langOverride;
  try { return new URLSearchParams(location.search).get('lang') || localStorage.getItem('ekh.preferences.lang') || 'tg'; }
  catch (_) { return 'tg'; }
};
const c = () => COPY[lang()] || COPY.tg;
const content = () => CONTENT[lang()] || CONTENT.tg;
const esc = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));

/* the feed's view switcher is page state, not app state — it never leaves this module */
let activityView = 'all';

function metrics(x) {
  const values = [['all',x.total,612,''],['draft',x.draft,8,''],['in_review',x.review,4,''],['approved',x.approved,3,''],['published',x.published,596,''],['errors',x.errors,1,'stat--danger']];
  return `<nav class="reg-stats reg-stats--dashboard" aria-label="${x.title}">${values.map(([status,label,value,tone])=>`<a class="stat ${tone}" href="services.html${status==='all'?'':`?status=${status}`}" data-metric-status="${status}"><div class="big">${value}</div><div class="k">${label}</div></a>`).join('')}</nav>`;
}

/* §6 empty state: what happened, whether that is good, what to do next */
function emptyState(title, body) {
  return `<div class="dashboard-empty"><b>${esc(title)}</b><p>${esc(body)}</p></div>`;
}

function reviewPanel(role, x) {
  const queue = getReviewQueue(role);
  const rows = queue.slice(0, 5).map(({record, workflow}) => {
    const status = describeStatus(workflow.status);
    return `<a class="dashboard-row" href="review.html?service=${esc(record.id)}">
      <span class="status-icon status-icon--${status.tone}" role="img" aria-label="${esc(status.label)}" title="${esc(status.label)}">${icon(status.icon)}</span>
      <span class="dashboard-row__copy"><strong>${esc(localizeValue(record.name))}</strong><span>${esc(localizeValue(record.agency))} · v${esc(workflow.version)} · ${esc(record.submittedAt)}</span></span>
      ${icon('i-chev-r')}</a>`;
  }).join('');
  return `<section class="panel dashboard-panel dashboard-tasks">
    <div class="panel-h"><h3>${x.tasks}</h3><span class="dashboard-count">${queue.length}</span></div>
    ${queue.length ? `<div class="dashboard-rows">${rows}</div>` : emptyState(x.empty, getRoleHint(role))}
  </section>`;
}

function slaPanel(x, copy) {
  const rows = copy.sla.map(item => `<a class="dashboard-row dashboard-row--alert" href="review.html">
      ${icon('i-clock')}
      <span class="dashboard-row__copy"><strong>${esc(item.service)}</strong><span>${esc(item.agency)} · ${esc(item.stage)}</span></span>
      <span class="dashboard-row__overdue">${esc(item.overdue)}</span></a>`).join('');
  return `<section class="panel dashboard-panel dashboard-sla">
    <div class="panel-h"><h3>${x.sla}</h3><span class="dashboard-count dashboard-count--danger">${copy.sla.length}</span></div>
    ${copy.sla.length ? `<div class="dashboard-rows">${rows}</div>` : emptyState(x.slaEmpty, x.slaEmptyHint)}
  </section>`;
}

const EVENT_ICON = { change:'i-history', 'test-pass':'i-check', 'test-fail':'i-x', publication:'i-arrow-ur' };

function activityPanel(x, copy) {
  const views = [['all',x.all],['change',x.changes],['test',x.tests],['publication',x.publications]];
  if (!views.some(([id]) => id === activityView)) activityView = 'all';
  const visible = copy.events
    .filter(event => activityView === 'all' || (activityView === 'test' ? event.type.startsWith('test') : event.type === activityView))
    .slice()
    .sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0));
  const rows = visible.map(event => {
    const label = event.type === 'test-pass' ? x.success : event.type === 'test-fail' ? x.failed : '';
    return `<a class="dashboard-row dashboard-row--${esc(event.type)}" href="builder.html">
      ${label ? `<span class="dashboard-row__glyph" role="img" aria-label="${esc(label)}" title="${esc(label)}">${icon(EVENT_ICON[event.type])}</span>` : `<span class="dashboard-row__glyph">${icon(EVENT_ICON[event.type])}</span>`}
      <span class="dashboard-row__copy"><strong>${esc(event.title)}</strong><span>${esc(event.meta)}</span></span>
      <time>${esc(event.at)}</time></a>`;
  }).join('');
  return `<section class="panel dashboard-panel dashboard-activity">
    <div class="panel-h"><h3>${x.activity}</h3></div>
    <div class="tabs dashboard-activity__tabs" role="tablist" aria-label="${x.activity}">${views.map(([id,label]) =>
      `<button class="tab" type="button" role="tab" data-activity-view="${id}" aria-selected="${activityView===id}" tabindex="${activityView===id?'0':'-1'}">${label}</button>`).join('')}</div>
    <div class="dashboard-rows" aria-live="polite">${rows}</div>
  </section>`;
}

function render() {
  const root=document.querySelector('#adminDashboard'); if(!root) return;
  const x=c(), copy=content(), state=getLowCodeState();
  root.innerHTML=`<header class="dashboard-head"><h1>${x.title}</h1></header>${metrics(x)}<div class="dashboard-primary">${reviewPanel(state.role,x)}${slaPanel(x,copy)}</div>${activityPanel(x,copy)}`;
}

document.addEventListener('click', event => {
  const tab=event.target.closest('[data-activity-view]'); if(!tab) return;
  activityView=tab.dataset.activityView;
  render();
  document.querySelector(`[data-activity-view="${activityView}"]`)?.focus();
});
document.addEventListener('keydown', event => {
  const tab=event.target.closest('[data-activity-view]');
  if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
  const tabs=[...document.querySelectorAll('[data-activity-view]')];
  let index=tabs.indexOf(tab);
  if(event.key==='Home') index=0;
  else if(event.key==='End') index=tabs.length-1;
  else index=(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
  event.preventDefault();
  tabs[index].click();
});
document.addEventListener('bp:langchange',render);
subscribeLowCode(render);
render();
