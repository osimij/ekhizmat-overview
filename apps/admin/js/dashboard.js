import { dispatchLowCode, getLowCodeState, subscribeLowCode } from './lowcode.js';

const icon = name => `<svg aria-hidden="true"><use href="/design-system/assets/icons.svg#${name}"/></svg>`;
const COPY = {
  tg: {
    title:'Нишондиҳандаҳои хизматҳо', lead:'Ҳолати нашр, вазифаҳои баррасӣ ва мушкилоти талабкунандаи амал — дар як экран.', role:'Нақши намоишӣ', author:'Муаллифи идора', reviewer:'Баррасӣкунанда', admin:'Маъмури портал',
    total:'Ҳамаи хизматҳо', draft:'Сиёҳнавис', review:'Дар баррасӣ', approved:'Интизори нашр', published:'Нашршуда', errors:'Хатои танзим',
    tasks:'Вазифаҳои баррасии ман', sla:'Вайроншавии SLA — аз рӯи идора', changes:'Тағйироти охирин', tests:'Натиҷаҳои санҷиш', publications:'Нашрҳои охирин',
    service:'Хизмат', agency:'Идора', version:'Версия', deadline:'Муҳлати SLA', status:'Ҳолат', action:'Амал', stage:'Марҳила', overdue:'Дермонӣ', authorCol:'Муаллиф', change:'Тағйир', date:'Сана ва вақт', result:'Натиҷа', publisher:'Нашркунанда',
    openReview:'Кушодани баррасӣ', openService:'Кушодани хизмат', requested:'Ислоҳ дархост шуд', inReview:'Дар баррасӣ', awaiting:'Интизори нашр', overdueValue:'1 р. 4 с.', publishedStatus:'Нашр шуд', success:'Муваффақ', failed:'Хато',
    empty:'Вазифаи баррасӣ нест.', quick:'Конструктор', registry:'Феҳристи хизматҳо', newService:'Хизмати нав', editor:'Муҳаррири шакл', allFeeds:'Навсозиҳои корӣ'
  },
  ru: {
    title:'Показатели услуг', lead:'Статусы публикации, задачи проверки и проблемы, требующие действий — на одном экране.', role:'Демо-роль', author:'Автор ведомства', reviewer:'Проверяющий', admin:'Администратор портала',
    total:'Все услуги', draft:'Черновики', review:'На проверке', approved:'Ожидают публикации', published:'Опубликованы', errors:'Ошибки настройки',
    tasks:'Мои задачи проверки', sla:'Нарушения SLA — по ведомствам', changes:'Последние изменения', tests:'Результаты тестов', publications:'Последние публикации',
    service:'Услуга', agency:'Ведомство', version:'Версия', deadline:'Срок SLA', status:'Статус', action:'Действие', stage:'Этап', overdue:'Просрочка', authorCol:'Автор', change:'Изменение', date:'Дата и время', result:'Результат', publisher:'Опубликовал',
    openReview:'Открыть проверку', openService:'Открыть услугу', requested:'Запрошены изменения', inReview:'На проверке', awaiting:'Ожидает публикации', overdueValue:'1 д. 4 ч.', publishedStatus:'Опубликовано', success:'Успешно', failed:'Ошибка',
    empty:'Задач проверки нет.', quick:'Конструктор', registry:'Реестр услуг', newService:'Новая услуга', editor:'Редактор формы', allFeeds:'Рабочие обновления'
  },
  en: {
    title:'Service metrics', lead:'Publishing status, review tasks, and issues requiring action — in one workspace.', role:'Demo role', author:'Agency author', reviewer:'Reviewer', admin:'Portal admin',
    total:'All services', draft:'Drafts', review:'In review', approved:'Awaiting publication', published:'Published', errors:'Configuration errors',
    tasks:'My review tasks', sla:'SLA violations — by agency', changes:'Recent changes', tests:'Test results', publications:'Recent publications',
    service:'Service', agency:'Agency', version:'Version', deadline:'SLA deadline', status:'Status', action:'Action', stage:'Stage', overdue:'Overdue', authorCol:'Author', change:'Change', date:'Date and time', result:'Result', publisher:'Published by',
    openReview:'Open review', openService:'Open service', requested:'Changes requested', inReview:'In review', awaiting:'Awaiting publication', overdueValue:'1 d. 4 hr.', publishedStatus:'Published', success:'Success', failed:'Failed',
    empty:'No review tasks.', quick:'Constructor', registry:'Service registry', newService:'New service', editor:'Form editor', allFeeds:'Work updates'
  }
};

const CONTENT = {
  tg: {
    tasks: [
      { name:'Маълумотнома — ҳайати оила', agency:'САҲШ', deadline:'имрӯз, 16:30' },
      { name:'Нусхаи дубораи шаҳодатнома', agency:'САҲШ', deadline:'имрӯз, 17:00' },
      { name:'Маълумотнома аз феҳристи замин', agency:'Кумитаи замин', deadline:'имрӯз, 15:20' }
    ],
    sla: [['ВКД','Иваз кардани ID-корт','6 с.'],['Кумитаи андоз','Маълумотномаи андоз','6 с.']],
    feeds: {
      changes: [['Фируза Н.','Маълумотнома — ҳайати оила','Майдонҳои шакл'],['Аброр К.','Бақайдгирии таваллуд','Раванди хизмат']],
      tests: ['Маълумотнома — ҳайати оила','Иваз кардани ID-корт'],
      publications: [['Сабти соҳибкори инфиродӣ','Аброр К.'],['Маълумотномаи доғи судӣ','Меҳринисо С.']]
    }
  },
  ru: {
    tasks: [
      { name:'Справка о составе семьи', agency:'ЗАГС', deadline:'сегодня, 16:30' },
      { name:'Повторное свидетельство', agency:'ЗАГС', deadline:'сегодня, 17:00' },
      { name:'Справка из земельного реестра', agency:'Земельный комитет', deadline:'сегодня, 15:20' }
    ],
    sla: [['МВД','Замена ID-карты','6 ч.'],['Налоговый комитет','Налоговая справка','6 ч.']],
    feeds: {
      changes: [['Фируза Н.','Справка о составе семьи','Поля формы'],['Аброр К.','Регистрация рождения','Процесс услуги']],
      tests: ['Справка о составе семьи','Замена ID-карты'],
      publications: [['Регистрация индивидуального предпринимателя','Аброр К.'],['Справка о наличии судимости','Мехринисо С.']]
    }
  },
  en: {
    tasks: [
      { name:'Family composition certificate', agency:'Civil Registry Office', deadline:'today, 16:30' },
      { name:'Duplicate certificate', agency:'Civil Registry Office', deadline:'today, 17:00' },
      { name:'Land registry certificate', agency:'Land Committee', deadline:'today, 15:20' }
    ],
    sla: [['Ministry of Internal Affairs','ID card replacement','6 hr.'],['Tax Committee','Tax certificate','6 hr.']],
    feeds: {
      changes: [['Firuza N.','Family composition certificate','Form fields'],['Abror K.','Birth registration','Service process']],
      tests: ['Family composition certificate','ID card replacement'],
      publications: [['Individual entrepreneur registration','Abror K.'],['Certificate of no criminal record','Mehriniso S.']]
    }
  }
};

const lang = () => {
  try { return new URLSearchParams(location.search).get('lang') || localStorage.getItem('ekh.preferences.lang') || 'tg'; }
  catch (_) { return 'tg'; }
};
const c = () => COPY[lang()] || COPY.tg;
const content = () => CONTENT[lang()] || CONTENT.tg;
const statusIcon = (tone,label) => `<span class="status-icon status-icon--${tone}" role="img" aria-label="${label}" title="${label}"><svg aria-hidden="true"><use href="/design-system/assets/icons.svg#${tone==='success'?'i-check':tone==='warning'?'i-edit':tone==='danger'?'i-x':tone==='info'?'i-clock':'i-dots'}"/></svg></span>`;

function taskForRole(role, x, copy) {
  if (role === 'agency-author') return { ...copy.tasks[0], version:'2.3', label:x.requested, tone:'warning', href:'builder.html' };
  if (role === 'portal-admin') return { ...copy.tasks[1], version:'1.8', label:x.awaiting, tone:'success', href:'review.html' };
  return { ...copy.tasks[2], version:'3.1', label:x.inReview, tone:'info', href:'review.html' };
}

function roleSelect(role, x) {
  return `<label class="admin-role"><span>${x.role}</span><span class="admin-role__control"><select class="input" id="dashboardRole"><option value="agency-author" ${role==='agency-author'?'selected':''}>${x.author}</option><option value="reviewer" ${role==='reviewer'?'selected':''}>${x.reviewer}</option><option value="portal-admin" ${role==='portal-admin'?'selected':''}>${x.admin}</option></select>${icon('i-chev-d')}</span></label>`;
}

function metrics(x) {
  const values = [['all',x.total,612,''],['draft',x.draft,8,''],['in_review',x.review,4,''],['approved',x.approved,3,''],['published',x.published,596,''],['errors',x.errors,1,'metric--danger']];
  return `<nav class="metric-strip dashboard-metrics" aria-label="${x.title}">${values.map(([status,label,value,tone])=>`<a class="metric ${tone}" href="services.html${status==='all'?'':`?status=${status}`}" data-metric-status="${status}"><strong class="metric__value">${value}</strong><span class="metric__label">${label}</span></a>`).join('')}</nav>`;
}

function reviewPanel(role, x, copy) {
  const t=taskForRole(role,x,copy);
  return `<section class="panel dashboard-panel dashboard-tasks"><div class="panel__head"><h2>${x.tasks}</h2><span class="status-pill status-pill--info">1</span></div><div class="panel__body dashboard-task"><div><a class="dashboard-row-link" href="${t.href}"><strong>${t.name}</strong></a><p>${t.agency} · ${x.version} ${t.version} · ${x.deadline}: ${t.deadline}</p></div>${statusIcon(t.tone,t.label)}<a class="btn btn-sec btn-sm" href="${t.href}">${x.openReview}</a></div></section>`;
}

function slaPanel(x, copy) {
  const [[agencyA,serviceA,overdueA],[agencyB,serviceB,overdueB]]=copy.sla;
  return `<section class="panel dashboard-panel dashboard-sla"><div class="panel__head"><h2>${x.sla}</h2><span class="status-pill status-pill--danger">2</span></div><div class="panel__body panel-table-body"><div class="data-table-wrap"><table class="data-table"><colgroup><col class="dashboard-sla__agency"><col class="dashboard-sla__service"><col class="dashboard-sla__stage"><col class="dashboard-sla__overdue"></colgroup><thead><tr><th>${x.agency}</th><th>${x.service}</th><th>${x.stage}</th><th>${x.overdue}</th></tr></thead><tbody><tr><td>${agencyA}</td><td><a href="builder.html">${serviceA}</a></td><td>${statusIcon('info',x.inReview)}</td><td><span class="status-pill status-pill--danger">${x.overdueValue || overdueA}</span></td></tr><tr><td>${agencyB}</td><td><a href="builder.html">${serviceB}</a></td><td>${statusIcon('info',x.inReview)}</td><td><span class="status-pill status-pill--danger">${overdueB}</span></td></tr></tbody></table></div></div></section>`;
}

function feedPanels(x, copy) {
  const [firstChange,secondChange]=copy.feeds.changes;
  const [firstTest,secondTest]=copy.feeds.tests;
  const [firstPublication,secondPublication]=copy.feeds.publications;
  return `<section class="dashboard-feeds" aria-labelledby="dashboardFeedsH"><h2 class="sr-only" id="dashboardFeedsH">${x.allFeeds}</h2><div class="tabs dashboard-feed-tabs" role="tablist"><button class="tab" role="tab" aria-selected="true" data-feed-tab="changes">${x.changes}</button><button class="tab" role="tab" aria-selected="false" data-feed-tab="tests">${x.tests}</button><button class="tab" role="tab" aria-selected="false" data-feed-tab="publications">${x.publications}</button></div>
  <section class="panel dashboard-feed" data-feed="changes"><div class="panel__head"><h2><svg aria-hidden="true"><use href="/design-system/assets/icons.svg#i-history"/></svg>${x.changes}</h2></div><div class="dashboard-feed-list"><a href="builder.html"><strong>${firstChange[0]}</strong><span>${firstChange[1]}</span><small>${x.change}: ${firstChange[2]} · 12.08, 14:20</small></a><a href="builder.html"><strong>${secondChange[0]}</strong><span>${secondChange[1]}</span><small>${x.change}: ${secondChange[2]} · 12.08, 11:05</small></a></div></section>
  <section class="panel dashboard-feed" data-feed="tests"><div class="panel__head"><h2><svg aria-hidden="true"><use href="/design-system/assets/icons.svg#i-check"/></svg>${x.tests}</h2></div><div class="dashboard-feed-list"><a class="dashboard-test-run" href="builder.html"><strong>${firstTest} · v2.3</strong><span>12.08, 14:18</span><span class="dashboard-test-result dashboard-test-result--success" role="img" aria-label="${x.success}" title="${x.success}"><svg aria-hidden="true"><use href="/design-system/assets/icons.svg#i-check"/></svg></span></a><a class="dashboard-test-run" href="builder.html"><strong>${secondTest} · v4.0</strong><span>12.08, 13:44</span><span class="dashboard-test-result dashboard-test-result--danger" role="img" aria-label="${x.failed}" title="${x.failed}"><svg aria-hidden="true"><use href="/design-system/assets/icons.svg#i-x"/></svg></span></a></div></section>
  <section class="panel dashboard-feed" data-feed="publications"><div class="panel__head"><h2><svg aria-hidden="true"><use href="/design-system/assets/icons.svg#i-upload"/></svg>${x.publications}</h2></div><div class="dashboard-feed-list"><a href="builder.html"><strong>${firstPublication[0]} · v5.2</strong><span>${firstPublication[1]}</span><small>12.08, 10:30 · ${x.publishedStatus}</small></a><a href="builder.html"><strong>${secondPublication[0]} · v2.1</strong><span>${secondPublication[1]}</span><small>11.08, 16:12 · ${x.publishedStatus}</small></a></div></section></section>`;
}

function quickActions(x) {
  return `<section class="dashboard-quick" aria-labelledby="quickH"><h2 id="quickH">${x.quick}</h2><div><a class="btn btn-sec" href="services.html">${icon('i-cat-cert')}${x.registry}</a><a class="btn btn-sec" href="new-service.html">${icon('i-plus')}${x.newService}</a><a class="btn btn-sec" href="builder.html">${icon('i-edit')}${x.editor}</a></div></section>`;
}

function render() {
  const root=document.querySelector('#adminDashboard'); if(!root) return;
  const x=c(), copy=content(), state=getLowCodeState();
  root.innerHTML=`<header class="dashboard-head"><div><h1>${x.title}</h1></div>${roleSelect(state.role,x)}</header>${metrics(x)}<div class="dashboard-primary">${reviewPanel(state.role,x,copy)}${slaPanel(x,copy)}</div>${feedPanels(x,copy)}${quickActions(x)}`;
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
