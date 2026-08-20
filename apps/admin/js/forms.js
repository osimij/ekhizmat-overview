import { createFieldComposer, normalizeField } from './field-composer.js';
import {
  getForms, getForm, getVersion, liveVersion, newestVersion, editableVersion,
  createFormDraft, saveDraft, publishDraft, createNextDraft, localized,
} from './forms-data.js';
import { getServiceDraft, linkServiceDraftForm } from './service-drafts.js';

const $=(selector,root=document)=>root.querySelector(selector);
const $$=(selector,root=document)=>Array.from(root.querySelectorAll(selector));
const esc=value=>String(value==null?'':value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const clone=value=>JSON.parse(JSON.stringify(value));
let currentLang=(()=>{ try{return new URLSearchParams(location.search).get('lang')||localStorage.getItem('ekh.preferences.lang')||'tg';}catch(_){return 'tg';} })();

const COPY={
  tg:{
    forms:'Шаклҳо',title:'Шаклҳо',newForm:'Шакли нав',allForms:'Ҳамаи шаклҳо',all:'Ҳама',live:'Зинда',draft:'Сиёҳнавис',archived:'Бойгонӣ',empty:'Ягон шакл ёфт нашуд',emptyBody:'Ҷустуҷӯ ё филтрро тағйир диҳед.',search:'Ҷустуҷӯи шакл, идора ё рамз…',filterLabel:'Филтр аз рӯи ҳолат',statsLabel:'Хулосаи шаклҳо',colForm:'Шакл',colFields:'Майдонҳо',colServices:'Хизматҳо',colVersions:'Нусхаҳо',fields:'майдон',services:'хизмат',hasDraft:'Бо сиёҳнавис',liveForms:'Шакли зинда',unused:'Бе хизмат',
    composer:{
      required:'Ҳатмӣ',optional:'Ихтиёрӣ',optionsShort:'вариант',conditional:'шартӣ',
      labelHeading:'Номи майдон (барои шаҳрванд) · 3 забон',typeLabel:'Навъи майдон',
      options:'Вариантҳо (бо вергул)',help:'Матни ёрирасон',helpPlaceholder:'тавзеҳи кӯтоҳ зери майдон',
      validation:'Санҷиш ва формат',format:'Формати вуруд',formatHelp:'маска ва санҷиши худкор — ИНН, телефон, сана',
      requiredHelp:'шаҳрванд бояд онро пур кунад',conditionHeading:'Мантиқи шартӣ',always:'Ҳамеша нишон дода шавад',
      equals:'баробар',value:'қимат',empty:'Ҳоло майдон нест. Майдони аввалро илова кунед.',untitled:'Майдони нав',
      moveUp:'Боло',moveDown:'Поён',remove:'Нест кардан',dragHint:'Кашед барои тартиб',
      formats:{free:'Матни озод',num:'Танҳо рақам',inn:'ИНН — 9 рақам',phone:'Телефон (+992…)',date:'Сана',email:'Почтаи электронӣ'},
    },
    back:'Шаклҳо',backServices:'Хизматрасониҳо',history:'Таърих',versionTitle:'Нусхаҳои шакл',versionHelp:'Сиёҳнависро озодона тағйир диҳед. Хизматҳо танҳо нусхаи нашршударо истифода мебаранд.',detailsTitle:'Маълумоти шакл',detailsLead:'Ин ном дар китобхона ва ҳангоми интихоби шакл нишон дода мешавад.',nameTg:'Ном ба тоҷикӣ',nameRu:'Ном ба русӣ',description:'Тавсифи кӯтоҳ',fieldsTitle:'Майдонҳои шакл',fieldsLead:'Тартиб ва талаботи майдонҳо дар худи шакл нигоҳ дошта мешаванд.',addField:'Илова кардани майдон',preview:'Пешнамоиш',citizenView:'Чашми шаҳрванд',liveNow:'зинда',continue:'Идома',paletteTitle:'Навъи майдонро интихоб кунед',paletteLead:'Майдон ба охири шакл илова мешавад.',save:'Захира кардани сиёҳнавис',publish:'Нашри нусха',newDraft:'Сохтани нусхаи нав',openLive:'Кушодани нусхаи зинда',readOnly:'Ин нусха танҳо барои хондан аст.',required:'Ҳатмӣ',requiredHelp:'Шаҳрванд бояд ин майдонро пур кунад',optional:'Ихтиёрӣ',fieldTg:'Номи майдон ба тоҷикӣ',fieldRu:'Номи майдон ба русӣ',options:'Вариантҳо (бо вергул)',moveUp:'Боло',moveDown:'Поён',remove:'Нест кардан',noFields:'Ҳоло майдон нест. Майдони аввалро илова кунед.',untitled:'Шакли беном',newCode:'FORM-NEW',saved:'Сиёҳнавис захира шуд',published:'Нусха нашр шуд ва ҳоло зинда аст',created:'Нусхаи нави сиёҳнавис сохта шуд',nameRequired:'Аввал номи шаклро ворид кунед',fieldRequired:'Барои нашр ҳадди ақал як майдон лозим аст',publishTitle:'Нашри ин нусха?',publishLead:'Нусхаи зиндаи ҳозира бойгонӣ мешавад. Хизматҳои нав метавонанд ин нусхаро интихоб кунанд.',publishSummary:(v,n)=>`v${v} · ${n} майдон`,cancel:'Бекор',statusDraft:'Сиёҳнавис',statusPublished:'Нашршуда · зинда',statusArchived:'Бойгонӣ',typeText:'Матни кӯтоҳ',typeEmail:'Почтаи электронӣ',typeTextarea:'Матни дароз',typeSelect:'Рӯйхати интихоб',typeDate:'Сана',typeFile:'Файл',typeCheckbox:'Тасдиқ',choose:'Интихоб кунед',fileHint:'PDF, JPG ё PNG',yes:'Тасдиқ мекунам',newField:'Майдони нав',descriptionPlaceholder:'Шакл барои чӣ истифода мешавад?',savedVersion:'Захира шуд',draftVersion:'Дар таҳрир',liveVersion:'Дар хизматҳо дастрас',archivedVersion:'Нусхаи пешина',
  },
  ru:{
    forms:'Формы',title:'Формы',newForm:'Новая форма',allForms:'Все формы',all:'Все',live:'Живые',draft:'Черновики',archived:'Архив',empty:'Формы не найдены',emptyBody:'Измените поиск или фильтр.',search:'Поиск формы, ведомства или кода…',filterLabel:'Фильтр по статусу',statsLabel:'Сводка форм',colForm:'Форма',colFields:'Поля',colServices:'Услуги',colVersions:'Версии',fields:'полей',services:'услуг',hasDraft:'С черновиком',liveForms:'Живые формы',unused:'Без услуг',
    composer:{
      required:'Обязательное',optional:'Необязательное',optionsShort:'вариантов',conditional:'условное',
      labelHeading:'Название поля (для гражданина) · 3 языка',typeLabel:'Тип поля',
      options:'Варианты (через запятую)',help:'Подсказка',helpPlaceholder:'короткое пояснение под полем',
      validation:'Проверка и формат',format:'Формат ввода',formatHelp:'маска и автопроверка — ИНН, телефон, дата',
      requiredHelp:'гражданин должен заполнить это поле',conditionHeading:'Условная логика',always:'Показывать всегда',
      equals:'равно',value:'значение',empty:'Полей пока нет. Добавьте первое поле.',untitled:'Новое поле',
      moveUp:'Выше',moveDown:'Ниже',remove:'Удалить',dragHint:'Перетащите, чтобы изменить порядок',
      formats:{free:'Свободный текст',num:'Только цифры',inn:'ИНН — 9 цифр',phone:'Телефон (+992…)',date:'Дата',email:'Электронная почта'},
    },
    back:'Формы',backServices:'Услуги',history:'История',versionTitle:'Версии формы',versionHelp:'Черновик можно свободно менять. Услуги используют только опубликованную версию.',detailsTitle:'Данные формы',detailsLead:'Это название видно в библиотеке и при выборе формы.',nameTg:'Название на таджикском',nameRu:'Название на русском',description:'Краткое описание',fieldsTitle:'Поля формы',fieldsLead:'Порядок и требования полей хранятся в самой форме.',addField:'Добавить поле',preview:'Предпросмотр',citizenView:'Глазами гражданина',liveNow:'вживую',continue:'Продолжить',paletteTitle:'Выберите тип поля',paletteLead:'Поле будет добавлено в конец формы.',save:'Сохранить черновик',publish:'Опубликовать версию',newDraft:'Создать новую версию',openLive:'Открыть живую версию',readOnly:'Эта версия доступна только для чтения.',required:'Обязательное',requiredHelp:'Гражданин должен заполнить это поле',optional:'Необязательное',fieldTg:'Название поля на таджикском',fieldRu:'Название поля на русском',options:'Варианты (через запятую)',moveUp:'Выше',moveDown:'Ниже',remove:'Удалить',noFields:'Полей пока нет. Добавьте первое поле.',untitled:'Форма без названия',newCode:'FORM-NEW',saved:'Черновик сохранён',published:'Версия опубликована и теперь живая',created:'Создан черновик новой версии',nameRequired:'Сначала укажите название формы',fieldRequired:'Для публикации нужно хотя бы одно поле',publishTitle:'Опубликовать эту версию?',publishLead:'Текущая живая версия уйдёт в архив. Новые услуги смогут выбрать эту версию.',publishSummary:(v,n)=>`v${v} · ${n} полей`,cancel:'Отмена',statusDraft:'Черновик',statusPublished:'Опубликована · живая',statusArchived:'В архиве',typeText:'Короткий текст',typeEmail:'Электронная почта',typeTextarea:'Длинный текст',typeSelect:'Список вариантов',typeDate:'Дата',typeFile:'Файл',typeCheckbox:'Подтверждение',choose:'Выберите',fileHint:'PDF, JPG или PNG',yes:'Подтверждаю',newField:'Новое поле',descriptionPlaceholder:'Для чего используется эта форма?',savedVersion:'Сохранена',draftVersion:'В работе',liveVersion:'Доступна услугам',archivedVersion:'Предыдущая версия',
  },
};

const c=()=>COPY[currentLang]||COPY.tg;
const label=value=>localized(value,currentLang);
const theme=()=>document.documentElement.dataset.theme||'light';
const pageContext=()=>`lang=${encodeURIComponent(currentLang)}&theme=${encodeURIComponent(theme())}`;
const statusText=status=>status==='draft'?c().statusDraft:status==='published'?c().statusPublished:c().statusArchived;
const statusTone=status=>status==='draft'?'draft':status==='published'?'published':'archived';
const statusIcon=status=>{const tone=status==='published'?'success':status==='draft'?'warning':'neutral';const icon=status==='published'?'i-check':status==='draft'?'i-edit':'i-history';const text=statusText(status);return `<span class="status-icon status-icon--${tone}" role="img" aria-label="${esc(text)}" title="${esc(text)}"><svg aria-hidden="true"><use href="/design-system/assets/icons.svg#${icon}"/></svg></span>`;};
const toast=message=>window.bpToast?window.bpToast(message):null;

function setText(id,value){ const element=$('#'+id); if(element) element.textContent=value; }
function setPlaceholder(id,value){ const element=$('#'+id); if(element) element.placeholder=value; }

const LIBRARY_FILTERS=['all','live','draft','archived','unused'];
let libraryFilter='all';

function versionPills(form){
  const versions=form.versions.slice().sort((a,b)=>b.number-a.number);
  const visible=versions.slice(0,3);
  const extra=versions.length-visible.length;
  const pills=visible.map(version=>{
    const text=statusText(version.status);
    return `<span class="form-mini-version form-mini-version--${statusTone(version.status)}" title="${esc(text)}"><b>v${version.number}</b><span class="sr-only">${esc(text)}</span></span>`;
  }).join('');
  return extra?`${pills}<span class="form-mini-more">+${extra}</span>`:pills;
}

function formMatchesFilter(form,filter){
  if(filter==='live') return !!liveVersion(form);
  if(filter==='draft') return form.versions.some(version=>version.status==='draft');
  if(filter==='archived') return form.versions.some(version=>version.status==='archived');
  if(filter==='unused') return form.usedBy===0;
  return true;
}

function setLibraryFilter(status,replaceUrl){
  if(!LIBRARY_FILTERS.includes(status)) status='all';
  libraryFilter=status;
  const select=$('#formStatusFilter'); if(select) select.value=status;
  $$('#formsStats [data-st-go]').forEach(button=>button.setAttribute('aria-pressed', String(button.getAttribute('data-st-go')===status)));
  if(replaceUrl){
    const url=new URL(location.href);
    if(status==='all') url.searchParams.delete('status');
    else url.searchParams.set('status',status);
    history.replaceState(null,'',url);
  }
  renderLibrary();
}

function renderLibrary(){
  const root=$('#formsList'); if(!root) return;
  const forms=getForms();
  const search=($('#formsSearch')?.value||'').trim().toLowerCase();
  const matches=forms.filter(form=>{
    const text=[label(form.name),label(form.description),label(form.owner),form.code].join(' ').toLowerCase();
    if(search&&!text.includes(search)) return false;
    return formMatchesFilter(form,libraryFilter);
  });
  root.innerHTML=matches.map(form=>{
    const latest=editableVersion(form)||newestVersion(form);
    const fieldCount=(latest?.fields||[]).length;
    return `<a class="ekh-list-row" href="form-builder.html?id=${encodeURIComponent(form.id)}&version=${latest.number}&${pageContext()}">
      <span class="nm" title="${esc(label(form.name))}"><b>${esc(label(form.name))}</b><span class="k">${esc(form.code)} · ${esc(label(form.owner))}</span></span>
      <span class="form-library-metric"><b>${fieldCount}</b><span class="sr-only"> ${esc(c().fields)}</span></span>
      <span class="form-library-metric"><b>${form.usedBy}</b><span class="sr-only"> ${esc(c().services)}</span></span>
      <span class="form-version-strip">${versionPills(form)}</span>
    </a>`;
  }).join('');
  const empty=$('#formsEmpty'); if(empty) empty.hidden=matches.length!==0;
  const liveCount=forms.filter(form=>liveVersion(form)).length;
  const draftCount=forms.filter(form=>form.versions.some(version=>version.status==='draft')).length;
  const archivedCount=forms.filter(form=>form.versions.some(version=>version.status==='archived')).length;
  const unused=forms.filter(form=>form.usedBy===0).length;
  const stats=$('#formsStats');
  if(stats){
    stats.setAttribute('aria-label',c().statsLabel);
    stats.innerHTML=`
    <button class="stat" type="button" data-st-go="live" aria-pressed="${libraryFilter==='live'}"><div class="big">${liveCount}</div><div class="k">${esc(c().liveForms)}</div></button>
    <button class="stat" type="button" data-st-go="draft" aria-pressed="${libraryFilter==='draft'}"><div class="big">${draftCount}</div><div class="k">${esc(c().hasDraft)}</div></button>
    <button class="stat" type="button" data-st-go="archived" aria-pressed="${libraryFilter==='archived'}"><div class="big">${archivedCount}</div><div class="k">${esc(c().archived)}</div></button>
    <button class="stat" type="button" data-st-go="unused" aria-pressed="${libraryFilter==='unused'}"><div class="big">${unused}</div><div class="k">${esc(c().unused)}</div></button>`;
  }
}

function localizeLibrary(){
  setText('formsTopTitle',c().forms); setText('formsTitle',c().title); setText('newFormLabel',c().newForm); setText('allFormsLabel',c().allForms); setText('formsFilterLabel',c().filterLabel); setText('formsColForm',c().colForm); setText('formsColFields',c().colFields); setText('formsColServices',c().colServices); setText('formsColVersions',c().colVersions); setText('formsEmptyTitle',c().empty); setText('formsEmptyBody',c().emptyBody); setPlaceholder('formsSearch',c().search);
  const search=$('#formsSearch'); if(search) search.setAttribute('aria-label',c().search.replace('…',''));
  const select=$('#formStatusFilter');
  if(select){
    select.setAttribute('aria-label',c().filterLabel);
    const labels={all:c().all,live:c().live,draft:c().draft,archived:c().archived,unused:c().unused};
    $$('#formStatusFilter option').forEach(option=>{ if(labels[option.value]) option.textContent=labels[option.value]; });
  }
  const create=$('#newFormLabel')?.closest('a'); if(create) create.href=`form-builder.html?new=1&${pageContext()}`;
  renderLibrary();
}

function initLibrary(){
  if(!$('#formsList')) return;
  const requested=new URLSearchParams(location.search).get('status')||'all';
  libraryFilter=LIBRARY_FILTERS.includes(requested)?requested:'all';
  $('#formsSearch')?.addEventListener('input',renderLibrary);
  $('#formStatusFilter')?.addEventListener('change',event=>setLibraryFilter(event.target.value,true));
  $('#formsStats')?.addEventListener('click',event=>{
    const button=event.target.closest('[data-st-go]'); if(!button) return;
    const value=button.getAttribute('data-st-go');
    setLibraryFilter(libraryFilter===value?'all':value,true);
  });
  localizeLibrary();
  setLibraryFilter(libraryFilter,false);
}

const FIELD_TYPES=['text','email','textarea','select','date','file','checkbox'];
const typeCopy=type=>({text:c().typeText,email:c().typeEmail,textarea:c().typeTextarea,select:c().typeSelect,date:c().typeDate,file:c().typeFile,checkbox:c().typeCheckbox})[type]||c().typeText;
const typeIcon=type=>({text:'i-edit',email:'i-mail',textarea:'i-doc',select:'i-chev-d',date:'i-calendar',file:'i-upload',checkbox:'i-check'})[type]||'i-edit';

let editor={isNew:false,form:null,version:null,draft:null,serviceDraftId:null};

function blankDraft(service){
  const name=service?.name||{tg:'',ru:''};
  return {
    name:clone(name),
    description:{tg:name.tg?`Шакли дархост барои «${name.tg}»`:'',ru:name.ru?`Форма заявления для «${name.ru}»`:''},
    fields:[],serviceId:service?.id||null,
  };
}
function editorEditable(){ return editor.isNew||editor.version?.status==='draft'; }
function activeName(){ return label(editor.draft.name)||c().untitled; }
function editorContext(){return `${pageContext()}${editor.serviceDraftId?`&service=${encodeURIComponent(editor.serviceDraftId)}`:''}`;}

function hydrateEditor(){
  const query=new URLSearchParams(location.search);
  editor.isNew=query.get('new')==='1';
  const service=getServiceDraft(query.get('service'));
  editor.serviceDraftId=service?.id||null;
  if(editor.isNew){ editor.form=null; editor.version={number:1,status:'draft',fields:[]}; editor.draft=blankDraft(service); return; }
  editor.form=getForm(query.get('id'))||getForms()[0];
  editor.serviceDraftId=editor.serviceDraftId||editor.form?.serviceId||null;
  const requested=getVersion(editor.form,query.get('version'));
  editor.version=requested||editableVersion(editor.form)||newestVersion(editor.form);
  editor.draft={name:clone(editor.form.name),description:clone(editor.form.description),fields:(clone(editor.version.fields)||[]).map(normalizeField)};
}

/* the shared composer owns the field rows; forms.js owns what a saved draft is */
let composer=null;
function ensureComposer(){
  const root=$('#independentFields'); if(!root) return null;
  if(!composer) composer=createFieldComposer({
    root,
    fields:()=>editor.draft.fields,
    onChange:()=>{ renderEditorPreview(); },
    editable:editorEditable,
    copy:()=>c().composer,
    typeLabel:typeCopy,
    typeIcon,
    types:FIELD_TYPES,
    lang:()=>currentLang,
  });
  return composer;
}
function renderEditorFields(){ ensureComposer()?.render(); }

const FORMAT_PLACEHOLDER={num:'123',inn:'123456789',phone:'+992 ',date:'',email:'name@example.tj'};
/* the preview shows what the citizen gets, help text and conditions included */
function previewControl(field){
  const name=esc(label(field.label)||c().newField),required=field.required?' <span class="req">*</span>':'';
  const help=field.help?.[currentLang]||field.help?.tg||'';
  const source=field.condOn&&editor.draft.fields.find(item=>item.id===field.condOn);
  const tail=(help?`<p class="help">${esc(help)}</p>`:'')
    +(source?`<p class="help help--cond">↳ ${esc(c().composer.conditional)}: ${esc(label(source.label)||source.label.tg)} = «${esc(field.condVal||'…')}»</p>`:'');
  const placeholder=FORMAT_PLACEHOLDER[field.format]||'';
  if(field.type==='select') return `<div class="field"><label>${name}${required}</label><div class="select"><select disabled><option>${esc(c().choose)}</option>${(field.options?.[currentLang]||field.options?.tg||[]).map(option=>`<option>${esc(option)}</option>`).join('')}</select></div>${tail}</div>`;
  if(field.type==='textarea') return `<div class="field"><label>${name}${required}</label><textarea class="input" rows="3" disabled></textarea>${tail}</div>`;
  if(field.type==='file') return `<div class="field"><label>${name}${required}</label><div class="form-preview-upload"><svg><use href="/design-system/assets/icons.svg#i-upload"/></svg><span>${esc(c().fileHint)}</span></div>${tail}</div>`;
  if(field.type==='checkbox') return `<label class="consent"><input type="checkbox" disabled><span>${name||esc(c().yes)}</span></label>${tail}`;
  return `<div class="field"><label>${name}${required}</label><input class="input" type="${field.type==='email'?'email':field.type==='date'?'date':'text'}" placeholder="${esc(placeholder)}" disabled>${tail}</div>`;
}

function renderEditorPreview(){
  setText('previewFormName',activeName()); setText('previewFormDescription',label(editor.draft.description));
  const root=$('#independentPreviewFields'); if(root) root.innerHTML=editor.draft.fields.map(previewControl).join('');
}

function renderVersionList(){
  const root=$('#formVersionList'); if(!root) return;
  const versions=editor.isNew?[editor.version]:editor.form.versions.slice().sort((a,b)=>b.number-a.number);
  root.innerHTML=versions.map(version=>{
    const selected=Number(version.number)===Number(editor.version.number);
    const updated=label(version.updated)||'';
    const note=label(version.note)||'';
    return `<button class="form-version-item form-version-item--${statusTone(version.status)} ${selected?'is-selected':''}" type="button" data-version="${version.number}" ${editor.isNew?'disabled':''}><span class="form-version-item__copy"><b>v${version.number}</b>${updated?`<small>${esc(updated)}</small>`:''}${note?`<small class="form-version-item__note" title="${esc(note)}">${esc(note)}</small>`:''}<span class="sr-only">${esc(statusText(version.status))}</span></span><span class="form-version-item__icon">${statusIcon(version.status)}</span></button>`;
  }).join('');
  setText('versionCount',String(versions.length));
}

function renderEditorActions(){
  const root=$('#formEditorActions'); if(!root) return;
  if(editorEditable()) root.innerHTML=`<button class="btn btn-sec btn-sm" type="button" data-form-action="save"><svg><use href="/design-system/assets/icons.svg#i-check"/></svg>${esc(c().save)}</button><button class="btn btn-pri btn-sm" type="button" data-form-action="publish"><svg><use href="/design-system/assets/icons.svg#i-arrow-ur"/></svg>${esc(c().publish)}</button>`;
  else if(editor.version.status==='published') root.innerHTML=`<button class="btn btn-pri btn-sm" type="button" data-form-action="new-version"><svg><use href="/design-system/assets/icons.svg#i-plus"/></svg>${esc(c().newDraft)}</button>`;
  else { const live=liveVersion(editor.form); root.innerHTML=live?`<button class="btn btn-sec btn-sm" type="button" data-form-action="open-live"><svg><use href="/design-system/assets/icons.svg#i-check"/></svg>${esc(c().openLive)}</button>`:''; }
}

function renderEditorChrome(){
  setText('formBackLabel',editor.serviceDraftId?c().backServices:c().back); setText('versionsEyebrow',c().history); setText('versionsTitle',c().versionTitle); setText('versionsHelp',c().versionHelp); setText('detailsTitle',c().detailsTitle); setText('detailsLead',c().detailsLead); setText('formNameTgLabel',c().nameTg); setText('formNameRuLabel',c().nameRu); setText('formDescriptionLabel',c().description); setText('fieldsTitle',c().fieldsTitle); setText('fieldsLead',c().fieldsLead); setText('addFieldLabel',c().addField); setText('previewEyebrow',c().preview); setText('previewTitle',c().citizenView); setText('previewLive',c().liveNow); setText('previewContinue',c().continue); setText('formPaletteTitle',c().paletteTitle); setText('formPaletteLead',c().paletteLead); setText('publishFormTitle',c().publishTitle); setText('publishFormLead',c().publishLead); setText('confirmFormPublish',c().publish); setText('cancelFormPublish',c().cancel); setPlaceholder('formDescription',c().descriptionPlaceholder);
  const name=$('#formNameTg'),ru=$('#formNameRu'),desc=$('#formDescription');
  if(name){name.value=editor.draft.name?.tg||'';name.disabled=!editorEditable();}
  if(ru){ru.value=editor.draft.name?.ru||'';ru.disabled=!editorEditable();}
  if(desc){desc.value=label(editor.draft.description)||editor.draft.description?.tg||'';desc.disabled=!editorEditable();}
  setText('formEditorName',activeName()); setText('formEditorCode',editor.form?.code||c().newCode);
  const status=$('#formEditorStatus'); if(status) status.textContent=`v${editor.version.number} · ${statusText(editor.version.status)}`;
  /* the read-only/live distinction is this page's central concept */
  const live=$('#previewLive'); if(live){live.hidden=!(!editor.isNew&&editor.version.live&&editor.version.status==='published');live.textContent=c().liveNow;}
  const add=$('#addFormField'); if(add) add.hidden=!editorEditable();
  const palette=$('#formPaletteGrid'); if(palette) palette.innerHTML=FIELD_TYPES.map(type=>`<button class="form-type-option" type="button" data-form-add="${type}"><span><svg><use href="/design-system/assets/icons.svg#${typeIcon(type)}"/></svg></span><b>${esc(typeCopy(type))}</b></button>`).join('');
  renderVersionList(); renderEditorActions(); renderEditorFields(); renderEditorPreview();
}

function refreshDraftFromInputs(){
  editor.draft.name.tg=$('#formNameTg')?.value||''; editor.draft.name.ru=$('#formNameRu')?.value||'';
  const value=$('#formDescription')?.value||''; editor.draft.description[currentLang]=value;
}

function navigateToVersion(version){
  history.replaceState(null,'',`form-builder.html?id=${encodeURIComponent(editor.form.id)}&version=${version.number}&${editorContext()}`);
  editor.version=version; editor.draft={name:clone(editor.form.name),description:clone(editor.form.description),fields:(clone(version.fields)||[]).map(normalizeField)}; editor.isNew=false; composer?.close(); renderEditorChrome();
}

function saveEditor(){
  refreshDraftFromInputs();
  if(!(editor.draft.name.tg||editor.draft.name.ru).trim()){ toast(c().nameRequired); $('#formNameTg')?.focus(); return null; }
  if(editor.isNew){
    editor.form=createFormDraft(editor.draft); editor.version=editor.form.versions[0]; editor.isNew=false;
    if(editor.serviceDraftId)linkServiceDraftForm(editor.serviceDraftId,editor.form.id);
    history.replaceState(null,'',`form-builder.html?id=${encodeURIComponent(editor.form.id)}&version=1&${editorContext()}`);
  }else{
    editor.form=saveDraft(editor.form.id,editor.version.number,editor.draft)||editor.form;
    editor.version=getVersion(editor.form,editor.version.number)||editor.version;
  }
  toast(c().saved); renderEditorChrome(); return editor.form;
}

function openPublish(){
  if(!saveEditor()) return;
  if(!editor.draft.fields.length){ toast(c().fieldRequired); return; }
  setText('formPublishSummary',c().publishSummary(editor.version.number,editor.draft.fields.length));
  if(window.bpOpen) window.bpOpen('publishFormModal'); else $('#publishFormModal')?.classList.add('open');
}

function closeOverlay(element){
  const overlay=element?.closest('.overlay'); if(!overlay) return;
  if(window.EKHDialog) window.EKHDialog.closeExistingDialog(overlay); else overlay.classList.remove('open','is-open');
}

function initEditor(){
  if(!$('#independentFields')) return;
  hydrateEditor(); renderEditorChrome();
  const back=$('.form-editor-top .back'); if(back) back.href=editor.serviceDraftId?`services.html?${pageContext()}`:`forms.html?${pageContext()}`;
  ['formNameTg','formNameRu','formDescription'].forEach(id=>$('#'+id)?.addEventListener('input',()=>{refreshDraftFromInputs();setText('formEditorName',activeName());renderEditorPreview();}));
  $('#formVersionList')?.addEventListener('click',event=>{
    const button=event.target.closest('[data-version]'); if(!button||editor.isNew) return;
    const form=getForm(editor.form.id),version=getVersion(form,button.dataset.version); if(!version) return;
    editor.form=form; navigateToVersion(version);
  });
  $('#formPaletteGrid')?.addEventListener('click',event=>{
    const button=event.target.closest('[data-form-add]'); if(!button||!editorEditable()) return;
    const type=button.dataset.formAdd;
    const field={type,label:{tg:c().newField,ru:COPY.ru.newField,en:''},required:false};
    if(type==='select') field.options={tg:['Варианти 1','Варианти 2'],ru:['Вариант 1','Вариант 2']};
    if(type==='text'||type==='textarea') field.format='free';
    closeOverlay(button); ensureComposer()?.add(field);
  });
  $('#formEditorActions')?.addEventListener('click',event=>{
    const button=event.target.closest('[data-form-action]'); if(!button) return;
    const action=button.dataset.formAction;
    if(action==='save') saveEditor();
    if(action==='publish') openPublish();
    if(action==='new-version'){
      const result=createNextDraft(editor.form.id); if(!result) return;
      editor.form=result.form; navigateToVersion(result.version); toast(c().created);
    }
    if(action==='open-live'){ const form=getForm(editor.form.id),version=liveVersion(form); if(version){editor.form=form;navigateToVersion(version);} }
  });
  $('#confirmFormPublish')?.addEventListener('click',event=>{
    const form=publishDraft(editor.form.id,editor.version.number); if(!form) return;
    closeOverlay(event.target); editor.form=form; editor.version=getVersion(form,editor.version.number); editor.draft={name:clone(form.name),description:clone(form.description),fields:(clone(editor.version.fields)||[]).map(normalizeField)}; composer?.close(); toast(c().published); renderEditorChrome();
  });
}

document.addEventListener('bp:langchange',event=>{
  currentLang=event.detail?.lang||currentLang;
  if($('#formsList')) localizeLibrary();
  if($('#independentFields')) renderEditorChrome();
});

initLibrary();
initEditor();
