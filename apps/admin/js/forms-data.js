const STORAGE_KEY = 'ekh.admin.forms.v1';
const SERVICE_FORM_KEY = 'ekh.admin.service-form.v1';

const DEFAULT_FORMS = [
  {
    id:'family-certificate', code:'FORM-FAM-01', owner:{tg:'САҲШ',ru:'ЗАГС'}, usedBy:3,
    name:{tg:'Маълумотнома — ҳайати оила',ru:'Справка — состав семьи'},
    description:{tg:'Маълумоти қабулкунанда ва мақсади дархост',ru:'Получатель и цель запроса'},
    versions:[
      {number:3,status:'draft',updated:{tg:'имрӯз, 10:42',ru:'сегодня, 10:42'},note:{tg:'Суроғаи почтаи электронӣ илова шуд',ru:'Добавлен адрес электронной почты'},fields:[
        {id:'purpose',type:'select',label:{tg:'Мақсади маълумотнома',ru:'Цель получения справки'},required:true,options:{tg:['Барои бонк','Барои мактаб','Барои суд','Дигар'],ru:['Для банка','Для школы','Для суда','Другое']}},
        {id:'recipient',type:'text',label:{tg:'Ташкилоти қабулкунанда',ru:'Организация-получатель'},required:false},
        {id:'email',type:'email',label:{tg:'Почтаи электронӣ',ru:'Электронная почта'},required:false},
      ]},
      {number:2,status:'published',live:true,updated:{tg:'18 июли 2026',ru:'18 июля 2026'},note:{tg:'Дар 3 хизмат истифода мешавад',ru:'Используется в 3 услугах'},fields:[
        {id:'purpose',type:'select',label:{tg:'Мақсади маълумотнома',ru:'Цель получения справки'},required:true,options:{tg:['Барои бонк','Барои мактаб','Барои суд','Дигар'],ru:['Для банка','Для школы','Для суда','Другое']}},
        {id:'recipient',type:'text',label:{tg:'Ташкилоти қабулкунанда',ru:'Организация-получатель'},required:false},
      ]},
      {number:1,status:'archived',updated:{tg:'2 июни 2026',ru:'2 июня 2026'},note:{tg:'Пас аз нашри v2 бойгонӣ шуд',ru:'Архивирована после публикации v2'},fields:[
        {id:'purpose',type:'text',label:{tg:'Мақсади маълумотнома',ru:'Цель получения справки'},required:true},
      ]},
    ],
  },
  {
    id:'organization-registration', code:'FORM-ORG-04', owner:{tg:'Вазорати адлия',ru:'Министерство юстиции'}, usedBy:1,
    name:{tg:'Бақайдгирии ташкилоти ҷамъиятӣ',ru:'Регистрация общественной организации'},
    description:{tg:'Маълумоти ташкилот, роҳбар ва ҳуҷҷатҳои замимашуда',ru:'Данные организации, руководителя и вложения'},
    versions:[
      {number:2,status:'draft',updated:{tg:'дирӯз, 16:15',ru:'вчера, 16:15'},note:{tg:'Шарҳи майдони роҳбар нав шуд',ru:'Обновлена подсказка для руководителя'},fields:[
        {id:'org-name',type:'text',label:{tg:'Номи ташкилот',ru:'Название организации'},required:true},
        {id:'leader',type:'text',label:{tg:'Роҳбари ташкилот',ru:'Руководитель организации'},required:true},
        {id:'address',type:'text',label:{tg:'Суроғаи ҳуқуқӣ',ru:'Юридический адрес'},required:true},
        {id:'charter',type:'file',label:{tg:'Оинномаи ташкилот',ru:'Устав организации'},required:true},
      ]},
      {number:1,status:'published',live:true,updated:{tg:'10 июли 2026',ru:'10 июля 2026'},note:{tg:'Дар 1 хизмат истифода мешавад',ru:'Используется в 1 услуге'},fields:[
        {id:'org-name',type:'text',label:{tg:'Номи ташкилот',ru:'Название организации'},required:true},
        {id:'leader',type:'text',label:{tg:'Роҳбари ташкилот',ru:'Руководитель организации'},required:true},
        {id:'address',type:'text',label:{tg:'Суроғаи ҳуқуқӣ',ru:'Юридический адрес'},required:true},
        {id:'charter',type:'file',label:{tg:'Оинномаи ташкилот',ru:'Устав организации'},required:true},
      ]},
    ],
  },
  {
    id:'land-extract', code:'FORM-LND-02', owner:{tg:'Кумитаи замин',ru:'Земельный комитет'}, usedBy:2,
    name:{tg:'Дархости иқтибос аз феҳристи замин',ru:'Запрос выписки из земельного реестра'},
    description:{tg:'Қитъаи замин ва мақсади гирифтани иқтибос',ru:'Земельный участок и цель получения выписки'},
    versions:[
      {number:1,status:'published',live:true,updated:{tg:'5 июли 2026',ru:'5 июля 2026'},note:{tg:'Дар 2 хизмат истифода мешавад',ru:'Используется в 2 услугах'},fields:[
        {id:'cadastre',type:'text',label:{tg:'Рақами кадастрӣ',ru:'Кадастровый номер'},required:true},
        {id:'purpose',type:'select',label:{tg:'Мақсади иқтибос',ru:'Цель получения выписки'},required:true,options:{tg:['Барои бонк','Барои нотариус','Дигар'],ru:['Для банка','Для нотариуса','Другое']}},
      ]},
    ],
  },
  {
    id:'appointment', code:'FORM-APT-07', owner:{tg:'Хадамоти шиноснома',ru:'Паспортная служба'}, usedBy:0,
    name:{tg:'Сабти қабул',ru:'Запись на приём'},
    description:{tg:'Интихоби марказ, сана ва вақти ташриф',ru:'Выбор центра, даты и времени визита'},
    versions:[
      {number:2,status:'draft',updated:{tg:'24 июли 2026',ru:'24 июля 2026'},note:{tg:'Интихоби равзанаи хизмат илова шуд',ru:'Добавлен выбор окна обслуживания'},fields:[
        {id:'centre',type:'select',label:{tg:'Маркази хизматрасонӣ',ru:'Центр обслуживания'},required:true,options:{tg:['Маркази Сино','Маркази Фирдавсӣ'],ru:['Центр Сино','Центр Фирдавси']}},
        {id:'date',type:'date',label:{tg:'Санаи ташриф',ru:'Дата визита'},required:true},
        {id:'time',type:'select',label:{tg:'Вақти ташриф',ru:'Время визита'},required:true,options:{tg:['09:00','10:30','14:00'],ru:['09:00','10:30','14:00']}},
      ]},
      {number:1,status:'archived',updated:{tg:'12 майи 2026',ru:'12 мая 2026'},note:{tg:'Дигар ба хизмат пайваст нест',ru:'Больше не подключена к услугам'},fields:[
        {id:'date',type:'date',label:{tg:'Санаи ташриф',ru:'Дата визита'},required:true},
      ]},
    ],
  },
];

function clone(value){ return JSON.parse(JSON.stringify(value)); }
function safeRead(key, fallback){
  try{
    const value=JSON.parse(localStorage.getItem(key)||'null');
    return value==null?clone(fallback):value;
  }catch(_){ return clone(fallback); }
}
function safeWrite(key, value){
  try{ localStorage.setItem(key,JSON.stringify(value)); }catch(_){}
}

export function getForms(){
  const forms=safeRead(STORAGE_KEY,DEFAULT_FORMS);
  return Array.isArray(forms)?forms:clone(DEFAULT_FORMS);
}
export function saveForms(forms){
  safeWrite(STORAGE_KEY,forms);
  window.dispatchEvent(new CustomEvent('ekh:formschange',{detail:{forms:clone(forms)}}));
  return forms;
}
export function resetForms(){ localStorage.removeItem(STORAGE_KEY); return getForms(); }
export function getForm(id){ return getForms().find(form=>form.id===id)||null; }
export function getVersion(form, number){
  if(!form) return null;
  return form.versions.find(version=>Number(version.number)===Number(number))||null;
}
export function liveVersion(form){ return form?.versions.find(version=>version.status==='published'&&version.live)||null; }
export function newestVersion(form){ return form?.versions.slice().sort((a,b)=>b.number-a.number)[0]||null; }
export function editableVersion(form){ return form?.versions.find(version=>version.status==='draft')||newestVersion(form); }
export function publishedForms(){ return getForms().map(form=>({form,version:liveVersion(form)})).filter(item=>item.version); }

export function createFormDraft(payload){
  const forms=getForms();
  const stamp=Date.now();
  const form={
    id:'form-'+stamp,
    code:'FORM-'+String(forms.length+1).padStart(3,'0'),
    owner:{tg:'Идораи ман',ru:'Моё ведомство'},
    serviceId:payload.serviceId||null,
    usedBy:0,
    name:payload.name,
    description:payload.description,
    versions:[{number:1,status:'draft',updated:{tg:'ҳозир',ru:'только что'},note:{tg:'Сиёҳнависи аввал',ru:'Первый черновик'},fields:clone(payload.fields||[])}],
  };
  forms.unshift(form); saveForms(forms); return form;
}

export function saveDraft(formId, versionNumber, payload){
  const forms=getForms();
  const form=forms.find(item=>item.id===formId);
  const version=getVersion(form,versionNumber);
  if(!form||!version||version.status!=='draft') return null;
  form.name=clone(payload.name); form.description=clone(payload.description);
  version.fields=clone(payload.fields||[]);
  version.updated={tg:'ҳозир',ru:'только что'};
  version.note={tg:'Тағйироти захирашуда',ru:'Изменения сохранены'};
  saveForms(forms); return form;
}

export function publishDraft(formId, versionNumber){
  const forms=getForms();
  const form=forms.find(item=>item.id===formId);
  const version=getVersion(form,versionNumber);
  if(!form||!version||version.status!=='draft'||!version.fields.length) return null;
  form.versions.forEach(item=>{
    if(item.status==='published'&&item.live){ item.status='archived'; item.live=false; item.note={tg:'Пас аз нашри v'+version.number+' бойгонӣ шуд',ru:'Архивирована после публикации v'+version.number}; }
  });
  version.status='published'; version.live=true;
  version.updated={tg:'ҳозир нашр шуд',ru:'опубликована только что'};
  version.note={tg:'Нусхаи зинда',ru:'Текущая живая версия'};
  saveForms(forms); return form;
}

export function createNextDraft(formId){
  const forms=getForms();
  const form=forms.find(item=>item.id===formId);
  if(!form) return null;
  const existing=form.versions.find(item=>item.status==='draft');
  if(existing) return {form,version:existing};
  const source=liveVersion(form)||newestVersion(form);
  const next={number:Math.max(...form.versions.map(item=>item.number))+1,status:'draft',updated:{tg:'ҳозир',ru:'только что'},note:{tg:'Сиёҳнависи нав аз v'+source.number,ru:'Новый черновик из v'+source.number},fields:clone(source.fields)};
  form.versions.unshift(next); saveForms(forms); return {form,version:next};
}

export function getServiceFormReference(){
  const fallback={formId:'family-certificate',version:2};
  const reference=safeRead(SERVICE_FORM_KEY,fallback);
  return reference&&reference.formId?reference:fallback;
}
export function setServiceFormReference(reference){
  safeWrite(SERVICE_FORM_KEY,reference);
  window.dispatchEvent(new CustomEvent('ekh:serviceformchange',{detail:reference}));
  return reference;
}

export function localized(value, lang='tg'){
  if(typeof value==='string') return value;
  return value?.[lang]||value?.tg||value?.ru||'';
}
