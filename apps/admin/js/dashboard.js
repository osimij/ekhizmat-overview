import { dispatchLowCode, getLowCodeState, subscribeLowCode } from './lowcode.js';

const icon = name => `<svg aria-hidden="true"><use href="/design-system/assets/icons.svg#${name}"/></svg>`;
const COPY = {
  tg: {
    title:'Нишондиҳандаҳои хизматҳо', lead:'Ҳолати нашр, вазифаҳои баррасӣ ва мушкилоти талабкунандаи амал — дар як экран.', role:'Нақши намоишӣ', author:'Муаллифи идора', reviewer:'Баррасӣкунанда', admin:'Маъмури портал',
    total:'Ҳамаи хизматҳо', draft:'Сиёҳнавис', review:'Дар баррасӣ', approved:'Интизори нашр', published:'Нашршуда', errors:'Хатои танзим',
    tasks:'Вазифаҳои баррасии ман', sla:'Вайроншавии SLA — аз рӯи идора', changes:'Тағйироти охирин', tests:'Натиҷаҳои санҷиш', publications:'Нашрҳои охирин',
    service:'Хизмат', agency:'Идора', version:'Версия', deadline:'Муҳлати SLA', status:'Ҳолат', action:'Амал', stage:'Марҳила', overdue:'Дермонӣ', authorCol:'Муаллиф', change:'Тағйир', date:'Сана ва вақт', result:'Натиҷа', publisher:'Нашркунанда',
    openReview:'Кушодани баррасӣ', openService:'Кушодани хизмат', requested:'Ислоҳ дархост шуд', inReview:'Дар баррасӣ', awaiting:'Интизори нашр', overdueValue:'1 рӯз 4 соат', publishedStatus:'Нашр шуд', success:'Муваффақ', failed:'Хато',
    empty:'Вазифаи баррасӣ нест.', quick:'Конструктор', registry:'Феҳристи хизматҳо', newService:'Хизмати нав', editor:'Муҳаррири шакл', allFeeds:'Навсозиҳои корӣ'
  },
  ru: {
    title:'Показатели услуг', lead:'Статусы публикации, задачи проверки и проблемы, требующие действий — на одном экране.', role:'Демо-роль', author:'Автор ведомства', reviewer:'Проверяющий', admin:'Администратор портала',
    total:'Все услуги', draft:'Черновики', review:'На проверке', approved:'Ожидают публикации', published:'Опубликованы', errors:'Ошибки настройки',
    tasks:'Мои задачи проверки', sla:'Нарушения SLA — по ведомствам', changes:'Последние изменения', tests:'Результаты тестов', publications:'Последние публикации',
    service:'Услуга', agency:'Ведомство', version:'Версия', deadline:'Срок SLA', status:'Статус', action:'Действие', stage:'Этап', overdue:'Просрочка', authorCol:'Автор', change:'Изменение', date:'Дата и время', result:'Результат', publisher:'Опубликовал',
    openReview:'Открыть проверку', openService:'Открыть услугу', requested:'Запрошены изменения', inReview:'На проверке', awaiting:'Ожидает публикации', overdueValue:'1 день 4 часа', publishedStatus:'Опубликовано', success:'Успешно', failed:'Ошибка',
    empty:'Задач проверки нет.', quick:'Конструктор', registry:'Реестр услуг', newService:'Новая услуга', editor:'Редактор формы', allFeeds:'Рабочие обновления'
  },
  en: {
    title:'Service metrics', lead:'Publishing status, review tasks, and issues requiring action — in one workspace.', role:'Demo role', author:'Agency author', reviewer:'Reviewer', admin:'Portal admin',
    total:'All services', draft:'Drafts', review:'In review', approved:'Awaiting publication', published:'Published', errors:'Configuration errors',
    tasks:'My review tasks', sla:'SLA violations — by agency', changes:'Recent changes', tests:'Test results', publications:'Recent publications',
    service:'Service', agency:'Agency', version:'Version', deadline:'SLA deadline', status:'Status', action:'Action', stage:'Stage', overdue:'Overdue', authorCol:'Author', change:'Change', date:'Date and time', result:'Result', publisher:'Published by',
    openReview:'Open review', openService:'Open service', requested:'Changes requested', inReview:'In review', awaiting:'Awaiting publication', overdueValue:'1 day 4 hours', publishedStatus:'Published', success:'Success', failed:'Failed',
    empty:'No review tasks.', quick:'Constructor', registry:'Service registry', newService:'New service', editor:'Form editor', allFeeds:'Work updates'
  }
};

const lang = () => {
  try { return new URLSearchParams(location.search).get('lang') || localStorage.getItem('ekh.preferences.lang') || 'tg'; }
  catch (_) { return 'tg'; }
};
const c = () => COPY[lang()] || COPY.tg;

function taskForRole(role, x) {
  if (role === 'agency-author') return { name:'Маълумотнома — ҳайати оила', agency:'САҲШ', version:'2.3', deadline:'имрӯз, 16:30', label:x.requested, tone:'warning', href:'builder.html' };
  if (role === 'portal-admin') return { name:'Нусхаи дубораи шаҳодатнома', agency:'САҲШ', version:'1.8', deadline:'имрӯз, 17:00', label:x.awaiting, tone:'success', href:'review.html' };
  return { name:'Маълумотнома аз феҳристи замин', agency:'Кумитаи замин', version:'3.1', deadline:'имрӯз, 15:20', label:x.inReview, tone:'info', href:'review.html' };
}

function roleSelect(role, x) {
  return `<label class="admin-role"><span>${x.role}</span><select class="input" id="dashboardRole"><option value="agency-author" ${role==='agency-author'?'selected':''}>${x.author}</option><option value="reviewer" ${role==='reviewer'?'selected':''}>${x.reviewer}</option><option value="portal-admin" ${role==='portal-admin'?'selected':''}>${x.admin}</option></select></label>`;
}

function metrics(x) {
  const values = [['all',x.total,612,''],['draft',x.draft,8,''],['in_review',x.review,4,''],['approved',x.approved,3,''],['published',x.published,596,''],['errors',x.errors,1,'metric--danger']];
  return `<nav class="metric-strip dashboard-metrics" aria-label="${x.title}">${values.map(([status,label,value,tone])=>`<a class="metric ${tone}" href="services.html${status==='all'?'':`?status=${status}`}" data-metric-status="${status}"><span class="metric__label">${label}</span><strong class="metric__value">${value}</strong></a>`).join('')}</nav>`;
}

function reviewPanel(role, x) {
  const t=taskForRole(role,x);
  return `<section class="panel dashboard-panel dashboard-tasks"><div class="panel__head"><h2>${x.tasks}</h2><span class="status-pill status-pill--info">1</span></div><div class="panel__body dashboard-task"><div><a class="dashboard-row-link" href="${t.href}"><strong>${t.name}</strong></a><p>${t.agency} · ${x.version} ${t.version} · ${x.deadline}</p></div><span class="status-pill status-pill--${t.tone}">${t.label}</span><a class="btn btn-sec btn-sm" href="${t.href}">${x.openReview}</a></div></section>`;
}

function slaPanel(x) {
  return `<section class="panel dashboard-panel dashboard-sla"><div class="panel__head"><h2>${x.sla}</h2><span class="status-pill status-pill--danger">2</span></div><div class="panel__body panel-table-body"><div class="data-table-wrap"><table class="data-table"><colgroup><col class="dashboard-sla__agency"><col class="dashboard-sla__service"><col class="dashboard-sla__stage"><col class="dashboard-sla__overdue"></colgroup><thead><tr><th>${x.agency}</th><th>${x.service}</th><th>${x.stage}</th><th>${x.overdue}</th></tr></thead><tbody><tr><td>ВКД</td><td><a href="builder.html">Иваз кардани ID-корт</a></td><td>${x.inReview}</td><td><span class="status-pill status-pill--danger">${x.overdueValue}</span></td></tr><tr><td>Кумитаи андоз</td><td><a href="builder.html">Маълумотномаи андоз</a></td><td>${x.inReview}</td><td><span class="status-pill status-pill--danger">6 соат</span></td></tr></tbody></table></div></div></section>`;
}

function feedPanels(x) {
  return `<section class="dashboard-feeds" aria-labelledby="dashboardFeedsH"><h2 class="sr-only" id="dashboardFeedsH">${x.allFeeds}</h2><div class="tabs dashboard-feed-tabs" role="tablist"><button class="tab" role="tab" aria-selected="true" data-feed-tab="changes">${x.changes}</button><button class="tab" role="tab" aria-selected="false" data-feed-tab="tests">${x.tests}</button><button class="tab" role="tab" aria-selected="false" data-feed-tab="publications">${x.publications}</button></div>
  <section class="panel dashboard-feed" data-feed="changes"><div class="panel__head"><h2>${x.changes}</h2></div><div class="dashboard-feed-list"><a href="builder.html"><strong>Фируза Н.</strong><span>Маълумотнома — ҳайати оила</span><small>${x.change}: Майдонҳои шакл · 12.08, 14:20</small></a><a href="builder.html"><strong>Аброр К.</strong><span>Бақайдгирии таваллуд</span><small>${x.change}: Раванди хизмат · 12.08, 11:05</small></a></div></section>
  <section class="panel dashboard-feed" data-feed="tests"><div class="panel__head"><h2>${x.tests}</h2></div><div class="dashboard-feed-list"><a href="builder.html"><strong>Маълумотнома — ҳайати оила · v2.3</strong><span>12.08, 14:18</span><small><span class="status-pill status-pill--success">${x.success}</span></small></a><a href="builder.html"><strong>Иваз кардани ID-корт · v4.0</strong><span>12.08, 13:44</span><small><span class="status-pill status-pill--danger">${x.failed}</span></small></a></div></section>
  <section class="panel dashboard-feed" data-feed="publications"><div class="panel__head"><h2>${x.publications}</h2></div><div class="dashboard-feed-list"><a href="builder.html"><strong>Сабти соҳибкори инфиродӣ · v5.2</strong><span>Аброр К.</span><small>12.08, 10:30 · ${x.publishedStatus}</small></a><a href="builder.html"><strong>Маълумотномаи доғи судӣ · v2.1</strong><span>Меҳринисо С.</span><small>11.08, 16:12 · ${x.publishedStatus}</small></a></div></section></section>`;
}

function quickActions(x) {
  return `<section class="dashboard-quick" aria-labelledby="quickH"><h2 id="quickH">${x.quick}</h2><div><a class="btn btn-sec" href="services.html">${icon('i-cat-cert')}${x.registry}</a><a class="btn btn-sec" href="new-service.html">${icon('i-plus')}${x.newService}</a><a class="btn btn-sec" href="builder.html">${icon('i-edit')}${x.editor}</a></div></section>`;
}

function render() {
  const root=document.querySelector('#adminDashboard'); if(!root) return;
  const x=c(), state=getLowCodeState();
  root.innerHTML=`<header class="dashboard-head"><div><span class="eyebrow">eKhizmat · Admin</span><h1>${x.title}</h1><p>${x.lead}</p></div>${roleSelect(state.role,x)}</header>${metrics(x)}<div class="dashboard-primary">${reviewPanel(state.role,x)}${slaPanel(x)}</div>${feedPanels(x)}${quickActions(x)}`;
}

document.addEventListener('change', event => {
  if (event.target.id === 'dashboardRole') dispatchLowCode('SET_ROLE',{role:event.target.value});
});
document.addEventListener('click', event => {
  const tab=event.target.closest('[data-feed-tab]'); if(!tab) return;
  const key=tab.dataset.feedTab;
  document.querySelectorAll('[data-feed-tab]').forEach(button=>button.setAttribute('aria-selected',String(button===tab)));
  document.querySelectorAll('[data-feed]').forEach(panel=>panel.classList.toggle('is-mobile-active',panel.dataset.feed===key));
});
document.addEventListener('bp:langchange',render);
subscribeLowCode(render);
render();
