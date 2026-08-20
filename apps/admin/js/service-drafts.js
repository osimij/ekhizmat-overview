const STORAGE_KEY='ekh.admin.service-drafts.v1';

const AGENCIES={
  sahsh:{tg:'САҲШ',ru:'ЗАГС'},
  tax:{tg:'Кумитаи андоз',ru:'Налоговый комитет'},
  passport:{tg:'ВКД',ru:'МВД'},
  land:{tg:'Кумитаи замин',ru:'Земельный комитет'},
  labor:{tg:'Вазорати меҳнат',ru:'Министерство труда'},
};

const COPY={
  tg:{draft:'сиёҳнавис',fields:'майдон',free:'ройгон',updated:'таҳрир: ҳозир',saved:'Сиёҳнависи хизмат захира шуд',untitled:'Хизмати беном',person:'шахси воқеӣ',business:'шахси ҳуқуқӣ',guest:'меҳмон',guestBadge:'Меҳмон'},
  ru:{draft:'черновик',fields:'полей',free:'бесплатно',updated:'изменено: только что',saved:'Черновик услуги сохранён',untitled:'Услуга без названия',person:'физлицо',business:'юрлицо',guest:'гость',guestBadge:'Гость'},
};

const clone=value=>JSON.parse(JSON.stringify(value));
const esc=value=>String(value==null?'':value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
/* the URL's ?lang= only reflects how the page was first opened — once the switcher
   fires bp:langchange, that's the live language, even if the URL never changes */
let langOverride=null;
document.addEventListener('bp:langchange',event=>{langOverride=(event.detail&&event.detail.lang)||langOverride;});
const lang=()=>{if(langOverride)return langOverride;try{return new URLSearchParams(location.search).get('lang')||localStorage.getItem('ekh.preferences.lang')||'tg';}catch(_){return 'tg';}};
const theme=()=>document.documentElement.dataset.theme||'light';
const copy=()=>COPY[lang()]||COPY.tg;

function read(){
  try{
    const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
    return Array.isArray(value)?value:[];
  }catch(_){return [];}
}

function write(drafts){
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(drafts));}catch(_){}
  window.dispatchEvent(new CustomEvent('ekh:servicedraftschange',{detail:{drafts:clone(drafts)}}));
  return drafts;
}

export function getServiceDrafts(){return clone(read());}
export function getServiceDraft(id){return getServiceDrafts().find(draft=>draft.id===id)||null;}

export function saveServiceDraft(payload){
  const drafts=read(),index=payload.id?drafts.findIndex(draft=>draft.id===payload.id):-1;
  const previous=index>=0?drafts[index]:null;
  const stamp=Date.now();
  const draft={
    ...previous,...clone(payload),
    id:payload.id||`service-${stamp}`,
    code:previous?.code||`SVC-NEW-${String(drafts.length+1).padStart(2,'0')}`,
    status:'draft',updatedAt:stamp,createdAt:previous?.createdAt||stamp,
  };
  if(index>=0) drafts.splice(index,1);
  drafts.unshift(draft);write(drafts);return clone(draft);
}

export function linkServiceDraftForm(serviceId,formId){
  if(!serviceId||!formId)return null;
  const drafts=read(),index=drafts.findIndex(draft=>draft.id===serviceId);
  if(index<0)return null;
  drafts[index]={...drafts[index],formId,updatedAt:Date.now()};
  write(drafts);return clone(drafts[index]);
}

function serviceFromWizard(id){
  const selected=(selector)=>document.querySelector(selector);
  const method=selected('[name="method"]:checked')?.value||'template';
  const audience=Array.from(document.querySelectorAll('[name="audience"]:checked')).map(input=>input.dataset.lcAudience).filter(Boolean);
  const paid=selected('[name="cost"]:checked')?.value==='paid';
  return {
    id,
    name:{tg:selected('#ntg')?.value.trim()||'',ru:selected('#nru')?.value.trim()||''},
    agencyId:selected('#org')?.value||'sahsh',category:selected('#serviceCategory')?.value||'other',audience,
    sla:selected('#sla')?.value||'',cost:paid?'paid':'free',amount:paid?(selected('#amt')?.value||'0,00'):'',
    source:method,sourceService:selected('[name="copyService"]:checked')?.value||null,
    template:selected('[name="tpl"]:checked')?.dataset.val||null,
  };
}

function targetUrl(path,params={}){
  const query=new URLSearchParams({lang:lang(),theme:theme(),...params});
  return `${path}?${query.toString()}`;
}

function initWizard(){
  const saveButton=document.querySelector('#saveServiceDraft'),openBuilder=document.querySelector('#openServiceBuilder');
  if(!saveButton||!openBuilder)return;
  let draftId=new URLSearchParams(location.search).get('draft')||null;
  const persist=()=>{const draft=saveServiceDraft(serviceFromWizard(draftId));draftId=draft.id;return draft;};
  /* the saved draft has to be visible somewhere: the registry, filtered to drafts */
  saveButton.addEventListener('click',()=>{
    const draft=persist();location.href=targetUrl('services.html',{status:'draft',saved:draft.id})+'#serviceRegistry';
  });
  /* the primary action opens the object the wizard just created */
  openBuilder.addEventListener('click',event=>{
    event.preventDefault();const draft=persist();
    const source=document.querySelector('[name="method"]:checked')?.value||'template';
    location.href=targetUrl('builder.html',{source,service:draft.id});
  });
}

function registryRow(draft){
  const l=lang(),c=copy(),agency=AGENCIES[draft.agencyId]||AGENCIES.sahsh;
  const name=draft.name?.[l]||draft.name?.tg||draft.name?.ru||c.untitled;
  const price=draft.cost==='paid'?`${draft.amount||'0,00'} смн.`:c.free;
  const href=draft.formId
    ?targetUrl('form-builder.html',{id:draft.formId,service:draft.id})
    :targetUrl('form-builder.html',{new:'1',service:draft.id});
  /* same anatomy as the static registry rows — two templates, one grid */
  const audienceCell=(draft.audience||[]).map(value=>{
    const icon=value==='business'?'i-biz':value==='guest'?'i-user':'i-role';
    const label=c[value]||value;
    return `<span class="audience-badge audience-badge--${esc(value)} lc-icon-badge" role="img" aria-label="${esc(label)}" title="${esc(label)}"><svg aria-hidden="true"><use href="/design-system/assets/icons.svg#${icon}"/></svg></span>`;
  }).join('');
  return `<a class="ekh-list-row" href="${esc(href)}" data-created-service="${esc(draft.id)}" data-status="draft" data-audience="${esc((draft.audience||[]).join(' '))}">
    <span class="nm"><b>${esc(name)}</b><span class="k">${esc(agency[l]||agency.tg)} · ${esc(draft.code)}</span></span>
    <span class="ekh-list-cell svc-audience">${audienceCell}</span>
    <span class="ekh-list-cell"><b>0</b></span>
    <span class="ekh-list-cell">${esc(price)}</span>
    <span class="ekh-list-cell">${esc(c.updated)}</span>
    <span class="status-icon status-icon--warning" role="img" aria-label="${esc(c.draft)}" title="${esc(c.draft)}"><svg aria-hidden="true"><use href="/design-system/assets/icons.svg#i-edit"/></svg></span>
  </a>`;
}

function renderRegistry(){
  const root=document.querySelector('#createdServiceRows');if(!root)return;
  const drafts=getServiceDrafts();root.innerHTML=drafts.map(registryRow).join('');
  const draftCount=document.querySelector('#draftServiceCount');if(draftCount)draftCount.textContent=String(8+drafts.length);
  const railCount=document.querySelector('[data-bld-rail] .ekh-side__item[href="services.html"] .ekh-side__count');if(railCount)railCount.textContent=String(612+drafts.length);
  window.dispatchEvent(new CustomEvent('ekh:servicedraftsrendered'));
  const savedId=new URLSearchParams(location.search).get('saved');
  if(savedId&&drafts.some(draft=>draft.id===savedId))window.bpToast?.(copy().saved);
}

document.addEventListener('bp:langchange',renderRegistry);
window.addEventListener('ekh:servicedraftschange',renderRegistry);
initWizard();
renderRegistry();
