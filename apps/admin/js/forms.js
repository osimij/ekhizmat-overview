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
    forms:'Шаклҳо',eyebrow:'Китобхонаи мустақил',title:'Шаклҳо',lead:'Шаклро як бор созед, нусхаҳояшро идора кунед ва дар ҳар хизмати лозим истифода баред.',newForm:'Шакли нав',allForms:'Ҳамаи шаклҳо',all:'Ҳама',live:'Зинда',draft:'Сиёҳнавис',archived:'Бойгонӣ',empty:'Ягон шакл ёфт нашуд',emptyBody:'Ҷустуҷӯ ё филтрро тағйир диҳед.',search:'Ҷустуҷӯи шакл, идора ё рамз…',formsCount:n=>n+' шакл',versions:'нусха',fields:'майдон',services:'хизмат',usedBy:n=>n?`дар ${n} хизмат`:'ҳоло истифода намешавад',open:'Кушодан',publishedLive:'Нашршуда · зинда',archivedStatus:'Бойгонӣ',draftStatus:'Сиёҳнавис',hasDraft:'Бо сиёҳнавис',liveForms:'Шакли зинда',unused:'Бе хизмат',
    back:'Шаклҳо',backServices:'Хизматрасониҳо',history:'Таърих',versionTitle:'Нусхаҳои шакл',versionHelp:'Сиёҳнависро озодона тағйир диҳед. Хизматҳо танҳо нусхаи нашршударо истифода мебаранд.',editorEyebrow:'Муҳаррири мустақили шакл',createTitle:'Сохтани шакл',editTitle:'Таҳрири шакл',editorLead:'Ном ва майдонҳоро дар ин ҷо идора кунед. Пайваст кардани шакл ба хизмат қадами алоҳида аст.',detailsTitle:'Маълумоти шакл',detailsLead:'Ин ном дар китобхона ва ҳангоми интихоби шакл нишон дода мешавад.',nameTg:'Ном ба тоҷикӣ',nameRu:'Ном ба русӣ',description:'Тавсифи кӯтоҳ',fieldsTitle:'Майдонҳои шакл',fieldsLead:'Тартиб ва талаботи майдонҳо дар худи шакл нигоҳ дошта мешаванд.',addField:'Илова кардани майдон',preview:'Пешнамоиш',citizenView:'Чашми шаҳрванд',liveNow:'зинда',continue:'Идома',paletteTitle:'Навъи майдонро интихоб кунед',paletteLead:'Майдон ба охири шакл илова мешавад.',save:'Захира кардани сиёҳнавис',publish:'Нашри нусха',newDraft:'Сохтани нусхаи нав',openLive:'Кушодани нусхаи зинда',readOnly:'Ин нусха танҳо барои хондан аст.',required:'Ҳатмӣ',requiredHelp:'Шаҳрванд бояд ин майдонро пур кунад',optional:'Ихтиёрӣ',fieldTg:'Номи майдон ба тоҷикӣ',fieldRu:'Номи майдон ба русӣ',options:'Вариантҳо (бо вергул)',moveUp:'Боло',moveDown:'Поён',remove:'Нест кардан',noFields:'Ҳоло майдон нест. Майдони аввалро илова кунед.',untitled:'Шакли беном',newCode:'FORM-NEW',saved:'Сиёҳнавис захира шуд',published:'Нусха нашр шуд ва ҳоло зинда аст',created:'Нусхаи нави сиёҳнавис сохта шуд',nameRequired:'Аввал номи шаклро ворид кунед',fieldRequired:'Барои нашр ҳадди ақал як майдон лозим аст',publishTitle:'Нашри ин нусха?',publishLead:'Нусхаи зиндаи ҳозира бойгонӣ мешавад. Хизматҳои нав метавонанд ин нусхаро интихоб кунанд.',publishSummary:(v,n)=>`v${v} · ${n} майдон`,cancel:'Бекор',statusDraft:'Сиёҳнавис',statusPublished:'Нашршуда · зинда',statusArchived:'Бойгонӣ',typeText:'Матни кӯтоҳ',typeEmail:'Почтаи электронӣ',typeTextarea:'Матни дароз',typeSelect:'Рӯйхати интихоб',typeDate:'Сана',typeFile:'Файл',typeCheckbox:'Тасдиқ',choose:'Интихоб кунед',fileHint:'PDF, JPG ё PNG',yes:'Тасдиқ мекунам',newField:'Майдони нав',descriptionPlaceholder:'Шакл барои чӣ истифода мешавад?',savedVersion:'Захира шуд',draftVersion:'Дар таҳрир',liveVersion:'Дар хизматҳо дастрас',archivedVersion:'Нусхаи пешина',
  },
  ru:{
    forms:'Формы',eyebrow:'Независимая библиотека',title:'Формы',lead:'Создайте форму один раз, управляйте её версиями и используйте в нужных услугах.',newForm:'Новая форма',allForms:'Все формы',all:'Все',live:'Живые',draft:'Черновики',archived:'Архив',empty:'Формы не найдены',emptyBody:'Измените поиск или фильтр.',search:'Поиск формы, ведомства или кода…',formsCount:n=>`${n} форм`,versions:'версии',fields:'полей',services:'услугах',usedBy:n=>n?`в ${n} услугах`:'пока не используется',open:'Открыть',publishedLive:'Опубликована · живая',archivedStatus:'В архиве',draftStatus:'Черновик',hasDraft:'С черновиком',liveForms:'Живые формы',unused:'Без услуг',
    back:'Формы',backServices:'Услуги',history:'История',versionTitle:'Версии формы',versionHelp:'Черновик можно свободно менять. Услуги используют только опубликованную версию.',editorEyebrow:'Независимый редактор формы',createTitle:'Создание формы',editTitle:'Редактирование формы',editorLead:'Название и поля управляются здесь. Подключение формы к услуге — отдельный шаг.',detailsTitle:'Данные формы',detailsLead:'Это название видно в библиотеке и при выборе формы.',nameTg:'Название на таджикском',nameRu:'Название на русском',description:'Краткое описание',fieldsTitle:'Поля формы',fieldsLead:'Порядок и требования полей хранятся в самой форме.',addField:'Добавить поле',preview:'Предпросмотр',citizenView:'Глазами гражданина',liveNow:'вживую',continue:'Продолжить',paletteTitle:'Выберите тип поля',paletteLead:'Поле будет добавлено в конец формы.',save:'Сохранить черновик',publish:'Опубликовать версию',newDraft:'Создать новую версию',openLive:'Открыть живую версию',readOnly:'Эта версия доступна только для чтения.',required:'Обязательное',requiredHelp:'Гражданин должен заполнить это поле',optional:'Необязательное',fieldTg:'Название поля на таджикском',fieldRu:'Название поля на русском',options:'Варианты (через запятую)',moveUp:'Выше',moveDown:'Ниже',remove:'Удалить',noFields:'Полей пока нет. Добавьте первое поле.',untitled:'Форма без названия',newCode:'FORM-NEW',saved:'Черновик сохранён',published:'Версия опубликована и теперь живая',created:'Создан черновик новой версии',nameRequired:'Сначала укажите название формы',fieldRequired:'Для публикации нужно хотя бы одно поле',publishTitle:'Опубликовать эту версию?',publishLead:'Текущая живая версия уйдёт в архив. Новые услуги смогут выбрать эту версию.',publishSummary:(v,n)=>`v${v} · ${n} полей`,cancel:'Отмена',statusDraft:'Черновик',statusPublished:'Опубликована · живая',statusArchived:'В архиве',typeText:'Короткий текст',typeEmail:'Электронная почта',typeTextarea:'Длинный текст',typeSelect:'Список вариантов',typeDate:'Дата',typeFile:'Файл',typeCheckbox:'Подтверждение',choose:'Выберите',fileHint:'PDF, JPG или PNG',yes:'Подтверждаю',newField:'Новое поле',descriptionPlaceholder:'Для чего используется эта форма?',savedVersion:'Сохранена',draftVersion:'В работе',liveVersion:'Доступна услугам',archivedVersion:'Предыдущая версия',
  },
};

const c=()=>COPY[currentLang]||COPY.tg;
const label=value=>localized(value,currentLang);
const theme=()=>document.documentElement.dataset.theme||'light';
const pageContext=()=>`lang=${encodeURIComponent(currentLang)}&theme=${encodeURIComponent(theme())}`;
const statusText=status=>status==='draft'?c().statusDraft:status==='published'?c().statusPublished:c().statusArchived;
const statusTone=status=>status==='draft'?'draft':status==='published'?'published':'archived';
const toast=message=>window.bpToast?window.bpToast(message):null;

function setText(id,value){ const element=$('#'+id); if(element) element.textContent=value; }
function setPlaceholder(id,value){ const element=$('#'+id); if(element) element.placeholder=value; }

function versionPills(form){
  return form.versions.slice().sort((a,b)=>b.number-a.number).map(version=>
    `<span class="form-mini-version form-mini-version--${statusTone(version.status)}"><b>v${version.number}</b><span>${esc(statusText(version.status))}</span></span>`
  ).join('');
}

function renderLibrary(){
  const root=$('#formsList'); if(!root) return;
  const forms=getForms();
  const search=($('#formsSearch')?.value||'').trim().toLowerCase();
  const filter=$('[name="formStatus"]:checked')?.value||'all';
  const matches=forms.filter(form=>{
    const text=[label(form.name),label(form.description),label(form.owner),form.code].join(' ').toLowerCase();
    if(search&&!text.includes(search)) return false;
    if(filter==='live'&&!form.versions.some(version=>version.status==='published'&&version.live)) return false;
    if(filter==='draft'&&!form.versions.some(version=>version.status==='draft')) return false;
    if(filter==='archived'&&!form.versions.some(version=>version.status==='archived')) return false;
    return true;
  });
  root.innerHTML=matches.map(form=>{
    const latest=editableVersion(form)||newestVersion(form);
    const live=liveVersion(form);
    const fieldCount=(latest?.fields||[]).length;
    return `<article class="form-library-row">
      <a class="form-library-row__main" href="form-builder.html?id=${encodeURIComponent(form.id)}&version=${latest.number}&${pageContext()}">
        <span class="form-library-icon"><svg><use href="/design-system/assets/icons.svg#i-doc"/></svg></span>
        <span class="form-library-copy"><span class="form-library-meta"><b>${esc(form.code)}</b><span>${esc(label(form.owner))}</span></span><strong>${esc(label(form.name))}</strong><span>${esc(label(form.description))}</span></span>
        <span class="form-library-usage"><b>${fieldCount}</b><span>${esc(c().fields)}</span></span>
        <span class="form-library-usage"><b>${form.usedBy}</b><span>${esc(c().services)}</span></span>
      </a>
      <div class="form-library-row__versions"><div class="form-version-strip">${versionPills(form)}</div><a class="btn btn-ghost btn-sm" href="form-builder.html?id=${encodeURIComponent(form.id)}&version=${latest.number}&${pageContext()}">${esc(c().open)}<svg><use href="/design-system/assets/icons.svg#i-arrow-r"/></svg></a></div>
    </article>`;
  }).join('');
  const empty=$('#formsEmpty'); if(empty) empty.hidden=matches.length!==0;
  setText('formsCountLabel',c().formsCount(forms.length));
  const liveCount=forms.filter(form=>liveVersion(form)).length;
  const draftCount=forms.filter(form=>form.versions.some(version=>version.status==='draft')).length;
  const unused=forms.filter(form=>form.usedBy===0).length;
  const stats=$('#formsStats');
  if(stats) stats.innerHTML=`
    <div class="forms-stat"><span class="forms-stat__icon forms-stat__icon--blue"><svg><use href="/design-system/assets/icons.svg#i-doc"/></svg></span><span><b>${forms.length}</b><small>${esc(c().allForms)}</small></span></div>
    <div class="forms-stat"><span class="forms-stat__icon forms-stat__icon--green"><svg><use href="/design-system/assets/icons.svg#i-check"/></svg></span><span><b>${liveCount}</b><small>${esc(c().liveForms)}</small></span></div>
    <div class="forms-stat"><span class="forms-stat__icon forms-stat__icon--amber"><svg><use href="/design-system/assets/icons.svg#i-edit"/></svg></span><span><b>${draftCount}</b><small>${esc(c().hasDraft)}</small></span></div>
    <div class="forms-stat"><span class="forms-stat__icon"><svg><use href="/design-system/assets/icons.svg#i-minus"/></svg></span><span><b>${unused}</b><small>${esc(c().unused)}</small></span></div>`;
}

function localizeLibrary(){
  setText('formsTopTitle',c().forms); setText('formsEyebrow',c().eyebrow); setText('formsTitle',c().title); setText('formsLead',c().lead); setText('newFormLabel',c().newForm); setText('allFormsLabel',c().allForms); setText('filterAll',c().all); setText('filterLive',c().live); setText('filterDraft',c().draft); setText('filterArchived',c().archived); setText('formsEmptyTitle',c().empty); setText('formsEmptyBody',c().emptyBody); setPlaceholder('formsSearch',c().search);
  const create=$('#newFormLabel')?.closest('a'); if(create) create.href=`form-builder.html?new=1&${pageContext()}`;
  renderLibrary();
}

function initLibrary(){
  if(!$('#formsList')) return;
  $('#formsSearch')?.addEventListener('input',renderLibrary);
  $('#formsFilter')?.addEventListener('change',renderLibrary);
  localizeLibrary();
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
  editor.draft={name:clone(editor.form.name),description:clone(editor.form.description),fields:clone(editor.version.fields||[])};
}

function fieldTypeOptions(selected){ return FIELD_TYPES.map(type=>`<option value="${type}" ${type===selected?'selected':''}>${esc(typeCopy(type))}</option>`).join(''); }

function renderEditorFields(){
  const root=$('#independentFields'); if(!root) return;
  const editable=editorEditable();
  if(!editor.draft.fields.length){ root.innerHTML=`<div class="form-fields-empty"><svg><use href="/design-system/assets/icons.svg#i-edit"/></svg><b>${esc(c().noFields)}</b></div>`; return; }
  root.innerHTML=editor.draft.fields.map((field,index)=>{
    const optionsTg=(field.options?.tg||[]).join(', '),optionsRu=(field.options?.ru||[]).join(', ');
    return `<article class="independent-field" data-field-id="${esc(field.id)}">
      <div class="independent-field__head"><span class="form-field-number">${index+1}</span><span class="form-field-type-icon"><svg><use href="/design-system/assets/icons.svg#${typeIcon(field.type)}"/></svg></span><div><b>${esc(label(field.label)||c().newField)}</b><span>${esc(typeCopy(field.type))} · ${esc(field.required?c().required:c().optional)}</span></div>${editable?`<div class="independent-field__actions"><button class="rowact" type="button" data-field-act="up" title="${esc(c().moveUp)}" ${index===0?'disabled':''}><svg style="transform:rotate(180deg)"><use href="/design-system/assets/icons.svg#i-chev-d"/></svg></button><button class="rowact" type="button" data-field-act="down" title="${esc(c().moveDown)}" ${index===editor.draft.fields.length-1?'disabled':''}><svg><use href="/design-system/assets/icons.svg#i-chev-d"/></svg></button><button class="rowact rowact--danger" type="button" data-field-act="remove" title="${esc(c().remove)}"><svg><use href="/design-system/assets/icons.svg#i-trash"/></svg></button></div>`:''}</div>
      <div class="independent-field__body">
        <div class="field"><label>${esc(typeCopy(field.type))}</label><div class="select"><select data-field-prop="type" ${editable?'':'disabled'}>${fieldTypeOptions(field.type)}</select></div></div>
        <div class="field"><label>${esc(c().fieldTg)}</label><input class="input" data-field-prop="label.tg" value="${esc(field.label?.tg||'')}" ${editable?'':'disabled'}></div>
        <div class="field"><label>${esc(c().fieldRu)}</label><input class="input" data-field-prop="label.ru" value="${esc(field.label?.ru||'')}" ${editable?'':'disabled'}></div>
        ${field.type==='select'?`<div class="field"><label>${esc(c().options)} · TG</label><input class="input" data-field-prop="options.tg" value="${esc(optionsTg)}" ${editable?'':'disabled'}></div><div class="field"><label>${esc(c().options)} · RU</label><input class="input" data-field-prop="options.ru" value="${esc(optionsRu)}" ${editable?'':'disabled'}></div>`:''}
        <label class="pr independent-field__required"><div class="tt"><span class="v">${esc(c().required)}</span><span class="k">${esc(c().requiredHelp)}</span></div><span class="sw"><input type="checkbox" data-field-prop="required" ${field.required?'checked':''} ${editable?'':'disabled'}><span class="knob"></span></span></label>
      </div>
    </article>`;
  }).join('');
}

function previewControl(field){
  const name=esc(label(field.label)||c().newField),required=field.required?' <span class="req">*</span>':'';
  if(field.type==='select') return `<div class="field"><label>${name}${required}</label><div class="select"><select disabled><option>${esc(c().choose)}</option>${(field.options?.[currentLang]||field.options?.tg||[]).map(option=>`<option>${esc(option)}</option>`).join('')}</select></div></div>`;
  if(field.type==='textarea') return `<div class="field"><label>${name}${required}</label><textarea class="input" rows="3" disabled></textarea></div>`;
  if(field.type==='file') return `<div class="field"><label>${name}${required}</label><div class="form-preview-upload"><svg><use href="/design-system/assets/icons.svg#i-upload"/></svg><span>${esc(c().fileHint)}</span></div></div>`;
  if(field.type==='checkbox') return `<label class="consent"><input type="checkbox" disabled><span>${name||esc(c().yes)}</span></label>`;
  return `<div class="field"><label>${name}${required}</label><input class="input" type="${field.type==='email'?'email':field.type==='date'?'date':'text'}" disabled></div>`;
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
    const note=version.status==='draft'?c().draftVersion:version.status==='published'?c().liveVersion:c().archivedVersion;
    return `<button class="form-version-item form-version-item--${statusTone(version.status)} ${selected?'is-selected':''}" type="button" data-version="${version.number}" ${editor.isNew?'disabled':''}><span class="form-version-line"><i></i></span><span class="form-version-item__copy"><span><b>v${version.number}</b><em>${esc(statusText(version.status))}</em></span><small>${esc(label(version.updated)||'')}</small><small>${esc(label(version.note)||note)}</small></span>${selected?'<svg class="form-version-check"><use href="/design-system/assets/icons.svg#i-check"/></svg>':''}</button>`;
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
  setText('formBackLabel',editor.serviceDraftId?c().backServices:c().back); setText('versionsEyebrow',c().history); setText('versionsTitle',c().versionTitle); setText('versionsHelp',c().versionHelp); setText('editorEyebrow',c().editorEyebrow); setText('editorTitle',editor.isNew?c().createTitle:c().editTitle); setText('editorLead',c().editorLead); setText('detailsTitle',c().detailsTitle); setText('detailsLead',c().detailsLead); setText('formNameTgLabel',c().nameTg); setText('formNameRuLabel',c().nameRu); setText('formDescriptionLabel',c().description); setText('fieldsTitle',c().fieldsTitle); setText('fieldsLead',c().fieldsLead); setText('addFieldLabel',c().addField); setText('previewEyebrow',c().preview); setText('previewTitle',c().citizenView); setText('previewLive',c().liveNow); setText('previewContinue',c().continue); setText('formPaletteTitle',c().paletteTitle); setText('formPaletteLead',c().paletteLead); setText('publishFormTitle',c().publishTitle); setText('publishFormLead',c().publishLead); setText('confirmFormPublish',c().publish); setText('cancelFormPublish',c().cancel); setPlaceholder('formDescription',c().descriptionPlaceholder);
  const name=$('#formNameTg'),ru=$('#formNameRu'),desc=$('#formDescription');
  if(name){name.value=editor.draft.name?.tg||'';name.disabled=!editorEditable();}
  if(ru){ru.value=editor.draft.name?.ru||'';ru.disabled=!editorEditable();}
  if(desc){desc.value=label(editor.draft.description)||editor.draft.description?.tg||'';desc.disabled=!editorEditable();}
  setText('formEditorName',activeName()); setText('formEditorCode',editor.form?.code||c().newCode);
  const status=$('#formEditorStatus'); if(status){status.className=`form-version-badge form-version-badge--${statusTone(editor.version.status)}`;status.textContent=`v${editor.version.number} · ${statusText(editor.version.status)}`;}
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
  editor.version=version; editor.draft={name:clone(editor.form.name),description:clone(editor.form.description),fields:clone(version.fields||[])}; editor.isNew=false; renderEditorChrome();
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
    const type=button.dataset.formAdd,id='field-'+Date.now();
    const field={id,type,label:{tg:c().newField,ru:COPY.ru.newField},required:false};
    if(type==='select') field.options={tg:['Варианти 1','Варианти 2'],ru:['Вариант 1','Вариант 2']};
    editor.draft.fields.push(field); closeOverlay(button); renderEditorFields(); renderEditorPreview();
  });
  $('#independentFields')?.addEventListener('input',event=>{
    const input=event.target.closest('[data-field-prop]'),row=input?.closest('[data-field-id]'); if(!input||!row) return;
    const field=editor.draft.fields.find(item=>item.id===row.dataset.fieldId),prop=input.dataset.fieldProp; if(!field) return;
    if(prop==='type') field.type=input.value;
    else if(prop==='required') field.required=input.checked;
    else if(prop.startsWith('label.')) field.label[prop.split('.')[1]]=input.value;
    else if(prop.startsWith('options.')){field.options=field.options||{tg:[],ru:[]};field.options[prop.split('.')[1]]=input.value.split(',').map(item=>item.trim()).filter(Boolean);}
    renderEditorFields(); renderEditorPreview();
    const next=$(`[data-field-id="${CSS.escape(field.id)}"] [data-field-prop="${CSS.escape(prop)}"]`); if(next&&prop!=='type'&&prop!=='required'){next.focus();next.setSelectionRange?.(next.value.length,next.value.length);}
  });
  $('#independentFields')?.addEventListener('click',event=>{
    const button=event.target.closest('[data-field-act]'),row=button?.closest('[data-field-id]'); if(!button||!row) return;
    const index=editor.draft.fields.findIndex(item=>item.id===row.dataset.fieldId),action=button.dataset.fieldAct; if(index<0) return;
    if(action==='remove') editor.draft.fields.splice(index,1);
    if(action==='up'&&index>0) editor.draft.fields.splice(index-1,0,editor.draft.fields.splice(index,1)[0]);
    if(action==='down'&&index<editor.draft.fields.length-1) editor.draft.fields.splice(index+1,0,editor.draft.fields.splice(index,1)[0]);
    renderEditorFields(); renderEditorPreview();
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
    closeOverlay(event.target); editor.form=form; editor.version=getVersion(form,editor.version.number); editor.draft={name:clone(form.name),description:clone(form.description),fields:clone(editor.version.fields)}; toast(c().published); renderEditorChrome();
  });
}

document.addEventListener('bp:langchange',event=>{
  currentLang=event.detail?.lang||currentLang;
  if($('#formsList')) localizeLibrary();
  if($('#independentFields')) renderEditorChrome();
});

initLibrary();
initEditor();
