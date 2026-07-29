const STORAGE_KEY = 'ekh.demo.lowcode';
const DEFAULT_STATE = {
  role:'agency-author', serviceVersion:'0.4', audience:['person','guest'],
  status:'draft', comments:[], changedSections:['Audience','Form fields','Notifications'],
  serviceName:{ru:'Регистрация некоммерческой организации',tg:'Бақайдгирии ташкилоти ғайритиҷоратӣ'},
  agencyName:{ru:'Министерство юстиции',tg:'Вазорати адлия'},
  formFields:[
    {id:'org-name',label:{ru:'Название организации',tg:'Номи ташкилот'},type:'text',required:true},
    {id:'contact',label:{ru:'Контактное лицо',tg:'Шахси тамос'},type:'text',required:true},
  ],
  review:null, publishedAt:null,
};

const TRANSITIONS = {
  draft:{ SAVE_STAGE:'stage', SEND_REVIEW:'in_review' },
  stage:{ SAVE_STAGE:'stage', SEND_REVIEW:'in_review' },
  in_review:{ REQUEST_CHANGES:'changes_requested', REJECT:'rejected', APPROVE:'approved' },
  changes_requested:{ SAVE_STAGE:'changes_requested', RESUBMIT:'resubmitted' },
  resubmitted:{ REQUEST_CHANGES:'changes_requested', REJECT:'rejected', APPROVE:'approved' },
  approved:{ PUBLISH:'published' },
  rejected:{ SAVE_STAGE:'stage' },
  published:{},
};

const COPY = {
  ru:{ author:'Автор ведомства', reviewer:'Ревьюер', admin:'Администратор портала', role:'Демо-роль', draft:'Черновик', stage:'На stage', in_review:'На проверке', changes_requested:'Требуются изменения', resubmitted:'Повторная проверка', approved:'Одобрено', rejected:'Отклонено', published:'Опубликовано', service:'Регистрация некоммерческой организации', stageEnv:'Stage', version:'Версия', audiences:'Аудитории', person:'ФЛ', business:'ЮЛ', guest:'Гость', guestReady:'Guest-preview включён', history:'Версия и история', comments:'Комментарии', noComments:'Комментариев пока нет.', reviewQueue:'Очередь проверки', newTab:'Новые', repeatTab:'Повторно', approvedTab:'Одобрено', rejectedTab:'Отклонено', agency:'Министерство юстиции', changed:'Изменённые разделы', checklist:'Чек-лист автора', check1:'Названия на русском и таджикском', check2:'Безопасные поля и понятные подсказки', check3:'Guest-preview проверен на stage', send:'Отправить на проверку', resubmit:'Отправить повторно', save:'Сохранить на stage', publish:'Опубликовать', publishHint:'Публикация доступна после проверки только администратору портала', addComment:'Добавить комментарий', request:'Запросить изменения', reject:'Отклонить', approve:'Одобрить', commentPlaceholder:'Комментарий с привязкой к полю или шагу', prepared:'Уточните формат номера документа', fieldAnchor:'Поле «Номер документа»', preview:'Preview формы', formTitle:'Регистрация НКО', docNumber:'Номер документа', docHelp:'Серия и номер через пробел', topic:'Тема обращения', submit:'Продолжить', metadata:'Метаданные', action:'Доступное действие', updated:'изменено сегодня, 14:20', sla:'SLA проверки: 1 рабочий день', reset:'Сбросить demo', openBuilder:'Открыть конструктор', summary:'Сводка перед отправкой', note:'Комментарий ревьюеру (необязательно)', cancel:'Отмена', confirm:'Подтвердить отправку', publishSummary:'Подтверждение публикации', confirmPublish:'Опубликовать версию', sentToast:'Услуга отправлена на проверку', changesToast:'Изменения запрошены', approvedToast:'Версия одобрена', publishedToast:'Демо-услуга опубликована', commentToast:'Комментарий добавлен', readonly:'На проверке: редактирование временно недоступно.', authorCannot:'Автор ведомства не может публиковать услугу.', adminBlocked:'Сначала версия должна получить статус «Одобрено».', reviewerOnly:'Действие доступно ревьюеру.', reply:'Ответ автора', resolution:'Формат уточнён: серия и номер разделены пробелом.', queueEmpty:'В этой вкладке сейчас нет других услуг.', demoData:'Демо-данные', filterAgency:'Ведомство', filterAudience:'Аудитория', filterDate:'Дата изменения', any:'Все', seven:'7 дней', thirty:'30 дней', reviewSummary:'Итог проверки' },
  tg:{ author:'Муаллифи идора', reviewer:'Баррасӣкунанда', admin:'Маъмури портал', role:'Нақши намоишӣ', draft:'Сиёҳнавис', stage:'Дар stage', in_review:'Дар санҷиш', changes_requested:'Тағйирот лозим', resubmitted:'Санҷиши такрорӣ', approved:'Тасдиқ шуд', rejected:'Рад шуд', published:'Нашр шуд', service:'Бақайдгирии ташкилоти ғайритиҷоратӣ', stageEnv:'Stage', version:'Версия', audiences:'Аудиторияҳо', person:'Шахси воқеӣ', business:'Шахси ҳуқуқӣ', guest:'Меҳмон', guestReady:'Пешнамоиши меҳмон фаъол аст', history:'Версия ва таърих', comments:'Шарҳҳо', noComments:'Ҳоло шарҳ нест.', reviewQueue:'Навбати санҷиш', newTab:'Нав', repeatTab:'Такрорӣ', approvedTab:'Тасдиқшуда', rejectedTab:'Радшуда', agency:'Вазорати адлия', changed:'Қисмҳои тағйирёфта', checklist:'Рӯйхати санҷиши муаллиф', check1:'Номҳо ба тоҷикӣ ва русӣ', check2:'Майдонҳои бехатар ва роҳнамои равшан', check3:'Пешнамоиши меҳмон дар stage санҷида шуд', send:'Ба санҷиш фиристодан', resubmit:'Такроран фиристодан', save:'Дар stage захира кардан', publish:'Нашр кардан', publishHint:'Нашр танҳо баъд аз санҷиш ба маъмури портал дастрас аст', addComment:'Илова кардани шарҳ', request:'Дархости тағйирот', reject:'Рад кардан', approve:'Тасдиқ кардан', commentPlaceholder:'Шарҳ ба майдон ё қадам', prepared:'Формати рақами ҳуҷҷатро дақиқ кунед', fieldAnchor:'Майдони «Рақами ҳуҷҷат»', preview:'Пешнамоиши шакл', formTitle:'Бақайдгирии ТҒТ', docNumber:'Рақами ҳуҷҷат', docHelp:'Силсила ва рақам бо фосила', topic:'Мавзӯи муроҷиат', submit:'Идома', metadata:'Маълумот', action:'Амали дастрас', updated:'имрӯз, 14:20 тағйир ёфт', sla:'SLA-и санҷиш: 1 рӯзи корӣ', reset:'Demo-ро аз нав оғоз кардан', openBuilder:'Кушодани конструктор', summary:'Ҷамъбаст пеш аз фиристодан', note:'Шарҳ ба баррасӣкунанда (ихтиёрӣ)', cancel:'Бекор', confirm:'Тасдиқи фиристодан', publishSummary:'Тасдиқи нашр', confirmPublish:'Нашри версия', sentToast:'Хизмат ба санҷиш фиристода шуд', changesToast:'Тағйирот дархост шуд', approvedToast:'Версия тасдиқ шуд', publishedToast:'Хизмати намоишӣ нашр шуд', commentToast:'Шарҳ илова шуд', readonly:'Дар санҷиш: таҳрир муваққатан баста аст.', authorCannot:'Муаллифи идора хизматро нашр карда наметавонад.', adminBlocked:'Аввал версия бояд мақоми «Тасдиқ шуд» гирад.', reviewerOnly:'Ин амал ба баррасӣкунанда дастрас аст.', reply:'Ҷавоби муаллиф', resolution:'Формат дақиқ шуд: силсила ва рақам бо фосила.', queueEmpty:'Дар ин бахш ҳоло хизмати дигар нест.', demoData:'Маълумоти намоишӣ', filterAgency:'Идора', filterAudience:'Аудитория', filterDate:'Санаи тағйир', any:'Ҳама', seven:'7 рӯз', thirty:'30 рӯз', reviewSummary:'Натиҷаи санҷиш' },
};

let state = load();
const listeners = new Set();
const lang = () => { try { return new URLSearchParams(location.search).get('lang') || localStorage.getItem('ekh.preferences.lang') || 'tg'; } catch(e) { return 'tg'; } };
const c = () => COPY[lang()] || COPY.tg;
const localized = (value, fallback) => typeof value === 'string' ? value : value?.[lang()] || value?.ru || fallback;
const serviceLabel = () => localized(state.serviceName, c().service);
const agencyLabel = () => localized(state.agencyName, c().agency);
function load(){ try { return { ...DEFAULT_STATE, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }; } catch(e) { return { ...DEFAULT_STATE }; } }
function persist(){ try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e) {} }
function notify(){ listeners.forEach(fn => fn(state)); window.dispatchEvent(new CustomEvent('ekh:lowcode',{detail:state})); }
window.addEventListener('storage', event => { if(event.key === STORAGE_KEY){ state = load(); notify(); } });

export function getLowCodeState(){ return state; }
export function subscribeLowCode(fn){ listeners.add(fn); return () => listeners.delete(fn); }
export function dispatchLowCode(event, payload={}){
  if(event === 'RESET'){ state = { ...DEFAULT_STATE, audience:[...DEFAULT_STATE.audience], comments:[] }; persist(); notify(); return state; }
  if(event === 'SET_ROLE'){ state = { ...state, role:payload.role }; persist(); notify(); return state; }
  if(event === 'UPDATE_SERVICE'){
    state = {
      ...state,
      serviceName:{ ...(state.serviceName || DEFAULT_STATE.serviceName), ...(payload.serviceName || {}) },
      formFields:Array.isArray(payload.formFields) ? payload.formFields : (state.formFields || DEFAULT_STATE.formFields),
    };
    persist(); notify(); return state;
  }
  if(event === 'SET_AUDIENCE'){
    const audience = state.audience.includes(payload.value) ? state.audience.filter(x => x !== payload.value) : [...state.audience,payload.value];
    if(audience.length) state = { ...state, audience };
    persist(); notify(); return state;
  }
  if(event === 'ADD_COMMENT'){
    const body = String(payload.body || '').trim(); if(!body) return state;
    state = { ...state, comments:[...state.comments,{id:`c-${Date.now()}`,author:state.role,body,anchor:payload.anchor || c().fieldAnchor,at:'14:24',reply:false}] };
    persist(); notify(); return state;
  }
  if(event === 'REPLY'){
    state = { ...state, comments:[...state.comments,{id:`c-${Date.now()}`,author:'agency-author',body:c().resolution,anchor:c().fieldAnchor,at:'14:31',reply:true}] };
    persist(); notify(); return state;
  }
  const next = TRANSITIONS[state.status]?.[event];
  if(!next) return state;
  state = { ...state, status:next };
  if(event === 'RESUBMIT') state.serviceVersion = (Number(state.serviceVersion) + 0.1).toFixed(1);
  if(event === 'APPROVE') state.review = {by:'Demo reviewer',at:'14:36'};
  if(event === 'PUBLISH') state.publishedAt = '14:40';
  persist(); notify(); return state;
}

function statusTone(status){ return ({draft:'draft',stage:'stage',in_review:'review',changes_requested:'changes',resubmitted:'review',approved:'approved',rejected:'rejected',published:'published'})[status]; }
function statusBadge(){ const x=c(); return `<span class="review-badge review-badge--${statusTone(state.status)}">${x[state.status]}</span>`; }
function audienceBadges(){ const x=c(); return state.audience.map(a=>`<span class="audience-badge audience-badge--${a==='guest'?'guest':a==='business'?'business':'person'}">${x[a]}</span>`).join(''); }
function roleSelect(){ const x=c(); return `<label class="lc-role"><span>${x.role}</span><select class="input" data-lc-role><option value="agency-author" ${state.role==='agency-author'?'selected':''}>${x.author}</option><option value="reviewer" ${state.role==='reviewer'?'selected':''}>${x.reviewer}</option><option value="portal-admin" ${state.role==='portal-admin'?'selected':''}>${x.admin}</option></select></label>`; }
function toast(message){ window.bpToast ? window.bpToast(message) : null; }

function renderBuilder(){
  const root=document.querySelector('#lowCodeBuilder'); if(!root)return; const x=c();
  root.innerHTML=`<div class="lc-builder-main"><div class="lc-builder-meta"><span class="environment-badge environment-badge--stage">${x.stageEnv}</span>${statusBadge()}<span class="metachip">${x.version} ${state.serviceVersion}</span></div>${roleSelect()}<a class="btn btn-sec btn-sm" href="review.html">${x.reviewQueue}</a></div><div class="lc-builder-panels"><section><h3>${x.audiences}</h3><div class="audience-selector">${['person','business','guest'].map(a=>`<label><input type="checkbox" data-lc-audience="${a}" ${state.audience.includes(a)?'checked':''}><span>${x[a]}</span></label>`).join('')}</div><div class="lc-guest-preview" ${state.audience.includes('guest')?'':'hidden'}><span class="audience-badge audience-badge--guest">${x.guest}</span><b>${x.guestReady}</b></div></section><section><h3>${x.history}</h3><p>${x.version} ${state.serviceVersion} · ${x.updated}</p><p class="lc-readonly" ${['in_review','resubmitted'].includes(state.status)?'':'hidden'}>${x.readonly}</p></section><section><h3>${x.comments} <span class="metachip">${state.comments.length}</span></h3>${commentsMarkup(true)}</section></div>`;
  const status=document.querySelector('#svcStatus'); if(status){status.className=`pill-st ${statusTone(state.status)}`;status.textContent=x[state.status];}
  const send=document.querySelector('#approveBtn'); if(send){send.innerHTML=`<svg><use href="/design-system/assets/icons.svg#i-users"/></svg>${state.status==='changes_requested'?x.resubmit:x.send}`;send.disabled=state.role!=='agency-author'||!['draft','stage','changes_requested'].includes(state.status);}
  const publish=document.querySelector('#publishBtn'); if(publish){publish.removeAttribute('data-open');publish.disabled=!(state.role==='portal-admin'&&state.status==='approved');publish.title=state.role==='agency-author'?x.authorCannot:state.status!=='approved'?x.adminBlocked:'';}
}

function renderRegistry(){
  const root=document.querySelector('#lowCodeRegistry'); if(!root)return; const x=c();
  root.innerHTML=`<div class="lc-registry-toolbar">${roleSelect()}<div class="lc-registry-summary"><span><b>3</b> ${x.draft.toLowerCase()}</span><span><b>1</b> ${x.in_review.toLowerCase()}</span><span><b>1</b> ${x.changes_requested.toLowerCase()}</span><span><b>2</b> ${x.published.toLowerCase()}</span></div></div><article class="lc-service-card"><div><div class="lc-card-badges"><span class="environment-badge environment-badge--stage">${x.stageEnv}</span>${statusBadge()}${audienceBadges()}${state.comments.length?`<span class="metachip">${state.comments.length} · ${x.comments}</span>`:''}</div><h2>${serviceLabel()}</h2><p>${agencyLabel()} · ${x.version} ${state.serviceVersion} · ${x.updated}</p></div><a class="btn btn-pri" href="${state.status==='draft'||state.status==='stage'||state.status==='changes_requested'?'builder.html':'review.html'}">${state.status==='draft'||state.status==='stage'||state.status==='changes_requested'?x.openBuilder:x.reviewQueue}</a></article>`;
}

function commentsMarkup(compact=false){ const x=c(); if(!state.comments.length)return `<p class="muted small">${x.noComments}</p>`;return `<div class="comment-thread">${state.comments.map(m=>`<article class="comment"><div class="comment__meta"><b>${m.author==='reviewer'?x.reviewer:x.author}</b><span>${m.at}</span></div><span class="comment__anchor">${m.anchor}</span><p>${m.body}</p></article>`).join('')}</div>`; }

function queueMatches(tab){ return tab==='new'&&['draft','stage','in_review','changes_requested'].includes(state.status)||tab==='repeat'&&state.status==='resubmitted'||tab==='approved'&&['approved','published'].includes(state.status)||tab==='rejected'&&state.status==='rejected'; }
let reviewTab='new';
const reviewFilters={agency:'all',audience:'all',date:'7d'};
function renderReview(){
  const root=document.querySelector('#lowCodeReview'); if(!root)return; const x=c(); const visible=queueMatches(reviewTab)&&(reviewFilters.audience==='all'||state.audience.includes(reviewFilters.audience));
  root.innerHTML=`<header class="lc-review-head"><div><span class="eyebrow">Low Code · Review</span><span class="demo-data-badge">${x.demoData}</span><h1>${x.reviewQueue}</h1><p>${x.sla}</p></div>${roleSelect()}</header><div class="lc-review-tabs" role="tablist">${[['new',x.newTab],['repeat',x.repeatTab],['approved',x.approvedTab],['rejected',x.rejectedTab]].map(([id,label])=>`<button class="tab" type="button" role="tab" data-lc-tab="${id}" aria-selected="${reviewTab===id}" tabindex="${reviewTab===id?'0':'-1'}">${label}</button>`).join('')}</div><div class="lc-review-filters"><label><span>${x.filterAgency}</span><select class="input" data-lc-filter="agency"><option value="all">${x.any}</option><option value="land" ${reviewFilters.agency==='land'?'selected':''}>${agencyLabel()}</option></select></label><label><span>${x.filterAudience}</span><select class="input" data-lc-filter="audience"><option value="all">${x.any}</option>${['person','business','guest'].map(a=>`<option value="${a}" ${reviewFilters.audience===a?'selected':''}>${x[a]}</option>`).join('')}</select></label><label><span>${x.filterDate}</span><select class="input" data-lc-filter="date"><option value="7d">${x.seven}</option><option value="30d" ${reviewFilters.date==='30d'?'selected':''}>${x.thirty}</option></select></label></div>${visible?reviewWorkspace(x):`<div class="empty-state panel"><svg><use href="/design-system/assets/icons.svg#i-check"/></svg><h2>${x.queueEmpty}</h2><button class="btn btn-sec" data-lc-action="RESET">${x.reset}</button></div>`}`;
}

function reviewWorkspace(x){
  const canReview=state.role==='reviewer'&&['in_review','resubmitted'].includes(state.status),canPublish=state.role==='portal-admin'&&state.status==='approved',canResubmit=state.role==='agency-author'&&state.status==='changes_requested';
  return `<article class="lc-service-card"><div><div class="lc-card-badges"><span class="environment-badge environment-badge--stage">${x.stageEnv}</span>${statusBadge()}${audienceBadges()}</div><h2>${serviceLabel()}</h2><p>${agencyLabel()} · ${x.version} ${state.serviceVersion} · ${x.updated}</p></div><a class="btn btn-sec" href="builder.html">${x.openBuilder}</a></article><div class="lc-review-grid"><section class="panel lc-preview"><div class="panel-h"><h3>${x.preview}</h3><div class="audience-selector lc-preview-switch">${state.audience.map(a=>`<button class="chip" type="button">${x[a]}</button>`).join('')}</div></div><div class="lc-preview-form"><span class="audience-badge audience-badge--guest">${x.guest}</span><h2>${serviceLabel()}</h2><label>${x.docNumber}<input class="input" value="A 12 345 678" readonly><small>${x.docHelp}</small></label><label>${x.topic}<select class="input" disabled><option>${serviceLabel()}</option></select></label><button class="btn btn-pri" disabled>${x.submit}</button></div></section><aside class="lc-review-side"><section class="panel"><h3>${x.metadata}</h3><dl class="lc-metadata"><div><dt>${x.version}</dt><dd>${state.serviceVersion}</dd></div><div><dt>${x.audiences}</dt><dd>${audienceBadges()}</dd></div><div><dt>${x.changed}</dt><dd>${state.changedSections.join(' · ')}</dd></div>${state.review?`<div><dt>${x.reviewSummary}</dt><dd>${state.review.by} · ${state.review.at}</dd></div>`:''}</dl></section><section class="panel"><h3>${x.checklist}</h3><ul class="lc-checks"><li>✓ ${x.check1}</li><li>✓ ${x.check2}</li><li>✓ ${x.check3}</li></ul></section><section class="panel"><h3>${x.comments} <span class="metachip">${state.comments.length}</span></h3>${commentsMarkup()}${state.role==='reviewer'?`<textarea class="input" id="lcComment" placeholder="${x.commentPlaceholder}">${state.comments.length?'':x.prepared}</textarea><button class="btn btn-sec btn-sm" data-lc-action="ADD_COMMENT">${x.addComment}</button>`:''}${canResubmit?`<button class="btn btn-sec btn-sm" data-lc-action="REPLY">${x.reply}</button>`:''}</section></aside></div><footer class="lc-actionbar"><span>${x.action}: ${x[state.status]}</span><div>${canReview?`<button class="btn btn-sec" data-lc-action="REQUEST_CHANGES">${x.request}</button><button class="btn btn-danger" data-lc-action="REJECT">${x.reject}</button><button class="btn btn-pri" data-lc-action="APPROVE">${x.approve}</button>`:''}${canResubmit?`<button class="btn btn-pri" data-lc-action="RESUBMIT">${x.resubmit}</button>`:''}<button class="btn btn-pri" data-lc-action="PUBLISH" ${canPublish?'':`disabled title="${state.role==='agency-author'?x.authorCannot:x.adminBlocked}"`}>${x.publish}</button><button class="btn btn-ghost" data-lc-action="RESET">${x.reset}</button></div></footer>`;
}

function openSummary(kind){
  const x=c(),id='lowCodeActionOverlay';document.querySelector(`#${id}`)?.remove();const overlay=document.createElement('div');overlay.className='overlay';overlay.id=id;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
  const publish=kind==='PUBLISH';overlay.innerHTML=`<div class="modal wide left"><h2>${publish?x.publishSummary:x.summary}</h2><div class="review"><div class="rv"><span class="k">${x.service}</span><span class="v">${serviceLabel()}</span></div><div class="rv"><span class="k">${x.version}</span><span class="v">${state.serviceVersion}</span></div><div class="rv"><span class="k">${x.audiences}</span><span class="v">${audienceBadges()}</span></div><div class="rv"><span class="k">${x.changed}</span><span class="v">${state.changedSections.join(' · ')}</span></div></div>${publish?'':`<div class="field"><label for="lcSubmitNote">${x.note}</label><textarea class="input" id="lcSubmitNote"></textarea></div>`}<button class="btn btn-pri btn-block" data-lc-confirm="${kind}">${publish?x.confirmPublish:x.confirm}</button><button class="btn btn-ghost btn-block" data-close>${x.cancel}</button></div>`;document.body.append(overlay);window.bpOpen?.(id);
}

function bind(){
  document.addEventListener('change',e=>{const role=e.target.closest('[data-lc-role]');if(role){dispatchLowCode('SET_ROLE',{role:role.value});return;}const filter=e.target.closest('[data-lc-filter]');if(filter){reviewFilters[filter.dataset.lcFilter]=filter.value;renderReview();return;}const audience=e.target.closest('[data-lc-audience]');if(audience)dispatchLowCode('SET_AUDIENCE',{value:audience.dataset.lcAudience});});
  document.addEventListener('keydown',e=>{const tab=e.target.closest('[data-lc-tab]');if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;const tabs=[...document.querySelectorAll('[data-lc-tab]')];let index=tabs.indexOf(tab);if(e.key==='Home')index=0;else if(e.key==='End')index=tabs.length-1;else index=(index+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;e.preventDefault();tabs[index].click();document.querySelector(`[data-lc-tab="${reviewTab}"]`)?.focus();});
  document.addEventListener('click',e=>{
    const tab=e.target.closest('[data-lc-tab]');if(tab){reviewTab=tab.dataset.lcTab;renderReview();return;}
    const confirm=e.target.closest('[data-lc-confirm]');if(confirm){const ev=confirm.dataset.lcConfirm;if(ev==='RESUBMIT')reviewTab='repeat';if(ev==='SEND_REVIEW')reviewTab='new';const overlay=document.querySelector('#lowCodeActionOverlay');window.EKHDialog?.closeExistingDialog(overlay);dispatchLowCode(ev);overlay?.remove();toast(ev==='PUBLISH'?c().publishedToast:c().sentToast);return;}
    const action=e.target.closest('[data-lc-action]');if(action){handleAction(action.dataset.lcAction);return;}
  },true);
  const save=document.querySelector('#saveBtn');save?.addEventListener('click',e=>{e.stopImmediatePropagation();dispatchLowCode('SAVE_STAGE');toast(c().save);},true);
  const send=document.querySelector('#approveBtn');send?.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();if(state.role!=='agency-author')return;openSummary(state.status==='changes_requested'?'RESUBMIT':'SEND_REVIEW');},true);
  const publish=document.querySelector('#publishBtn');publish?.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();if(state.role==='portal-admin'&&state.status==='approved')openSummary('PUBLISH');},true);
}
function handleAction(action){const x=c();if(action==='ADD_COMMENT'){dispatchLowCode(action,{body:document.querySelector('#lcComment')?.value,anchor:x.fieldAnchor});toast(x.commentToast);return;}if(action==='PUBLISH'){if(state.role==='portal-admin'&&state.status==='approved')openSummary('PUBLISH');return;}if(action==='APPROVE')reviewTab='approved';if(action==='REJECT')reviewTab='rejected';if(action==='RESUBMIT')reviewTab='repeat';if(action==='RESET')reviewTab='new';dispatchLowCode(action);toast(action==='REQUEST_CHANGES'?x.changesToast:action==='APPROVE'?x.approvedToast:action==='RESET'?x.reset:x.sentToast);}
function renderAll(){renderBuilder();renderRegistry();renderReview();}

bind();subscribeLowCode(renderAll);renderAll();
const originalSetLang=window.bpSetLang;
if(originalSetLang)window.bpSetLang=function(next){originalSetLang(next);renderAll();};
