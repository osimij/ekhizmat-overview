import {
  getForms, getForm, getVersion, liveVersion, publishedForms,
  getServiceFormReference, setServiceFormReference, localized,
} from './forms-data.js';

const $=(selector,root=document)=>root.querySelector(selector);
const $$=(selector,root=document)=>Array.from(root.querySelectorAll(selector));
const esc=value=>String(value==null?'':value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
let currentLang=(()=>{try{return new URLSearchParams(location.search).get('lang')||localStorage.getItem('ekh.preferences.lang')||'tg';}catch(_){return 'tg';}})();
let pending=null;

const COPY={
  tg:{published:'Нашршуда · зинда',archived:'Бойгонӣ',draft:'Сиёҳнавис',fields:'майдон',used:'дар хизмат истифода мешавад',pinned:'Нусхаи пайвастшуда',available:'Нусхаи нав дастрас аст',upgrade:'Ҳангоми омода будан онро аз рӯйхат интихоб кунед.',required:'ҳатмӣ',optional:'ихтиёрӣ',choose:'Интихоб кунед',file:'PDF, JPG ё PNG',confirm:'Пайваст кардани шакл',empty:'Ягон шакли нашршуда ёфт нашуд',emptyBody:'Дар китобхонаи шаклҳо нусхаро нашр кунед.',search:'Ҷустуҷӯи шакл, идора ё рамз…',linked:'Шакл ба хизмат пайваст шуд',formLibrary:'Китобхонаи шаклҳо',pickerTitle:'Интихоби шакл аз китобхона',pickerLead:'Танҳо нусхаҳои нашршуда ва зинда барои пайваст кардан дастрасанд.',open:'Кушодани шакл',select:'Интихоби шакл',safe:'пайвасти бехатар',attached:'Шакли пайвастшуда',publishedVersion:'Нусхаи нашршуда',fieldHeading:'Майдонҳои ин нусха',readonly:'Пешнамоиши танҳо-хондан. Барои тағйир додан нусхаи нави шакл созед.'},
  ru:{published:'Опубликована · живая',archived:'В архиве',draft:'Черновик',fields:'полей',used:'используется в услугах',pinned:'Подключённая версия',available:'Доступна новая версия',upgrade:'Когда будете готовы, выберите её из списка.',required:'обязательное',optional:'необязательное',choose:'Выберите',file:'PDF, JPG или PNG',confirm:'Подключить форму',empty:'Опубликованные формы не найдены',emptyBody:'Опубликуйте версию в библиотеке форм.',search:'Поиск формы, ведомства или кода…',linked:'Форма подключена к услуге',formLibrary:'Библиотека форм',pickerTitle:'Выберите форму из библиотеки',pickerLead:'Для подключения доступны только опубликованные живые версии.',open:'Открыть форму',select:'Выбрать форму',safe:'безопасная привязка',attached:'Подключённая форма',publishedVersion:'Опубликованная версия',fieldHeading:'Поля этой версии',readonly:'Предпросмотр только для чтения. Для изменений создайте новую версию формы.'},
};
const c=()=>COPY[currentLang]||COPY.tg;
const label=value=>localized(value,currentLang);
const statusText=status=>status==='published'?c().published:status==='archived'?c().archived:c().draft;
const statusTone=status=>status==='published'?'published':status==='archived'?'archived':'draft';
const statusIcon=status=>{const tone=status==='published'?'success':status==='draft'?'warning':'neutral';const icon=status==='published'?'i-check':status==='draft'?'i-edit':'i-history';const text=statusText(status);return `<span class="status-icon status-icon--${tone}" role="img" aria-label="${esc(text)}" title="${esc(text)}"><svg aria-hidden="true"><use href="/design-system/assets/icons.svg#${icon}"/></svg></span>`;};

function referenceData(){
  let reference=getServiceFormReference(),form=getForm(reference.formId),version=getVersion(form,reference.version);
  if(!form||!version){
    const first=publishedForms()[0];
    if(!first) return {reference:null,form:null,version:null};
    reference=setServiceFormReference({formId:first.form.id,version:first.version.number}); form=first.form; version=first.version;
  }
  return {reference,form,version};
}

function fieldPreview(field){
  const name=esc(label(field.label)),required=field.required?' <span class="req">*</span>':'';
  if(field.type==='select') return `<div class="field"><label>${name}${required}</label><div class="select"><select disabled><option>${esc(c().choose)}</option>${(field.options?.[currentLang]||field.options?.tg||[]).map(item=>`<option>${esc(item)}</option>`).join('')}</select></div></div>`;
  if(field.type==='textarea') return `<div class="field"><label>${name}${required}</label><textarea class="input" rows="2" disabled></textarea></div>`;
  if(field.type==='file') return `<div class="field"><label>${name}${required}</label><div class="form-preview-upload"><svg><use href="/design-system/assets/icons.svg#i-upload"/></svg><span>${esc(c().file)}</span></div></div>`;
  if(field.type==='checkbox') return `<label class="consent"><input type="checkbox" disabled><span>${name}</span></label>`;
  return `<div class="field"><label>${name}${required}</label><input class="input" type="${field.type==='date'?'date':field.type==='email'?'email':'text'}" disabled></div>`;
}

function renderSelected(){
  const root=$('#serviceFormSelection'); if(!root) return;
  const {form,version}=referenceData(); if(!form||!version){ root.innerHTML=''; return; }
  const currentLive=liveVersion(form),hasUpdate=currentLive&&currentLive.number!==version.number;
  root.innerHTML=`<article class="attached-form-card">
    <span class="attached-form-card__icon"><svg><use href="/design-system/assets/icons.svg#i-doc"/></svg></span>
    <div class="attached-form-card__copy"><span>${esc(form.code)} · ${esc(label(form.owner))}</span><h3>${esc(label(form.name))}</h3><p>${esc(label(form.description))}</p><div><span class="form-version-badge form-version-badge--${statusTone(version.status)}">v${version.number}${statusIcon(version.status)}</span><span class="metachip">${version.fields.length} ${esc(c().fields)}</span></div></div>
    ${hasUpdate?`<div class="attached-form-update"><span><svg><use href="/design-system/assets/icons.svg#i-refresh"/></svg>${esc(c().available)} · v${currentLive.number}</span><small>${esc(c().upgrade)}</small></div>`:`<span class="attached-form-pin"><svg><use href="/design-system/assets/icons.svg#i-pin"/></svg>${esc(c().pinned)} · v${version.number}</span>`}
  </article>`;
  const link=$('#openAttachedForm'); if(link){link.href=`form-builder.html?id=${encodeURIComponent(form.id)}&version=${version.number}`;const text=$('span',link);if(text)text.textContent=c().open;}
  const readonly=$('#serviceFormReadonlyFields'); if(readonly) readonly.innerHTML=version.fields.map((field,index)=>`<div class="service-readonly-field"><span>${index+1}</span><div><b>${esc(label(field.label))}</b><small>${esc(field.required?c().required:c().optional)}</small></div><svg><use href="/design-system/assets/icons.svg#i-lock"/></svg></div>`).join('');
  const preview=$('#pvFields'); if(preview) preview.innerHTML=version.fields.map(fieldPreview).join('');
  const count=$('#serviceFormFieldCount'); if(count) count.textContent=`${version.fields.length} ${c().fields}`;
  const stepCount=$('#stgFieldsCount'); if(stepCount) stepCount.textContent=String(version.fields.length);
  const pubCount=$('#pubFields'); if(pubCount) pubCount.textContent=String(version.fields.length);
}

function renderPicker(){
  const root=$('#serviceFormPickerList'); if(!root) return;
  const query=($('#serviceFormSearch')?.value||'').trim().toLowerCase();
  const current=getServiceFormReference();
  const items=publishedForms().filter(({form})=>[label(form.name),label(form.description),label(form.owner),form.code].join(' ').toLowerCase().includes(query));
  root.innerHTML=items.map(({form,version})=>{
    const checked=(pending&&pending.formId===form.id&&Number(pending.version)===version.number)||(!pending&&current.formId===form.id&&Number(current.version)===version.number);
    return `<label class="service-form-option"><input type="radio" name="serviceFormChoice" value="${esc(form.id)}" data-version="${version.number}" ${checked?'checked':''}><span class="service-form-option__icon"><svg><use href="/design-system/assets/icons.svg#i-doc"/></svg></span><span class="service-form-option__copy"><b>${esc(label(form.name))}</b><span>${esc(form.code)} · ${esc(label(form.owner))}</span><small>${esc(label(form.description))}</small></span><span class="form-version-badge form-version-badge--published">v${version.number}${statusIcon('published')}</span></label>`;
  }).join('');
  const empty=$('#serviceFormPickerEmpty'); if(empty) empty.hidden=items.length!==0;
  const confirm=$('#confirmServiceForm'); if(confirm) confirm.disabled=!pending;
}

function localizeStatic(){
  const set=(selector,text)=>{const element=$(selector);if(element)element.textContent=text;};
  set('#serviceFormHeading',c().publishedVersion); set('.service-form-safe span',c().safe); set('.service-form-binding__head>div>span',c().attached); set('.service-form-actions [data-open] span',c().select); set('#openAttachedForm span',c().open); set('.service-form-readonly__head h2',c().fieldHeading); set('.service-form-readonly__head p',c().readonly); set('#serviceFormPickerTitle',c().pickerTitle); set('#serviceFormPickerTitle + p',c().pickerLead); set('#confirmServiceForm',c().confirm); set('.service-form-picker__foot a span',c().formLibrary); set('#serviceFormPickerEmpty b',c().empty); set('#serviceFormPickerEmpty p',c().emptyBody);
  const search=$('#serviceFormSearch'); if(search) search.placeholder=c().search;
}

function closePicker(){
  const overlay=$('#serviceFormPicker'); if(!overlay) return;
  if(window.EKHDialog) window.EKHDialog.closeExistingDialog(overlay); else overlay.classList.remove('open','is-open');
}

function init(){
  if(!$('#serviceFormSelection')) return;
  localizeStatic(); renderSelected(); renderPicker();
  $('#serviceFormSearch')?.addEventListener('input',renderPicker);
  $('#serviceFormPickerList')?.addEventListener('change',event=>{
    const input=event.target.closest('[name="serviceFormChoice"]'); if(!input) return;
    pending={formId:input.value,version:Number(input.dataset.version)}; renderPicker();
  });
  $('#confirmServiceForm')?.addEventListener('click',()=>{
    if(!pending) return;
    setServiceFormReference(pending); pending=null; closePicker(); renderSelected(); renderPicker();
    window.bpToast?.(c().linked);
  });
  document.addEventListener('click',event=>{ if(event.target.closest('[data-open="serviceFormPicker"]')){pending=null;renderPicker();} });
}

document.addEventListener('bp:langchange',event=>{currentLang=event.detail?.lang||currentLang;localizeStatic();renderSelected();renderPicker();});
window.addEventListener('ekh:formschange',()=>{renderSelected();renderPicker();});
init();
