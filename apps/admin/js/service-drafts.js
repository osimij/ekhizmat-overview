const STORAGE_KEY='ekh.admin.service-drafts.v1';

const AGENCIES={
  sahsh:{tg:'САҲШ',ru:'ЗАГС'},
  tax:{tg:'Кумитаи андоз',ru:'Налоговый комитет'},
  passport:{tg:'ВКД',ru:'МВД'},
  land:{tg:'Кумитаи замин',ru:'Земельный комитет'},
  labor:{tg:'Вазорати меҳнат',ru:'Министерство труда'},
};

const CATEGORY_STYLE={
  docs:['t-blue','i-cat-passport'],family:['t-rose sh-c','i-cat-family'],edu:['t-amber sh-r','i-cat-edu'],
  health:['t-green sh-c','i-cat-health'],transport:['t-indigo','i-cat-transport'],land:['t-terra sh-r','i-cat-land'],
  tax:['t-violet','i-cat-tax'],justice:['t-slate sh-c','i-cat-justice'],certs:['t-teal sh-r','i-cat-cert'],
  culture:['t-pink sh-l','i-cat-culture'],gov:['t-steel','i-cat-gov'],license:['t-cyan sh-r','i-cat-license'],
  accred:['t-olive','i-cat-accred'],other:['t-gray sh-c','i-cat-other'],
};

const COPY={
  tg:{draft:'сиёҳнавис',fields:'майдон',free:'ройгон',updated:'таҳрир: ҳозир',saved:'Сиёҳнависи хизмат захира шуд',untitled:'Хизмати беном',person:'шахси воқеӣ',business:'шахси ҳуқуқӣ',guest:'меҳмон'},
  ru:{draft:'черновик',fields:'полей',free:'бесплатно',updated:'изменено: только что',saved:'Черновик услуги сохранён',untitled:'Услуга без названия',person:'физлицо',business:'юрлицо',guest:'гость'},
};

const clone=value=>JSON.parse(JSON.stringify(value));
const esc=value=>String(value==null?'':value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const lang=()=>{try{return new URLSearchParams(location.search).get('lang')||localStorage.getItem('ekh.preferences.lang')||'tg';}catch(_){return 'tg';}};
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
  const saveButton=document.querySelector('#saveServiceDraft'),createForm=document.querySelector('#createServiceForm');
  if(!saveButton||!createForm)return;
  let draftId=new URLSearchParams(location.search).get('draft')||null;
  const persist=()=>{const draft=saveServiceDraft(serviceFromWizard(draftId));draftId=draft.id;return draft;};
  saveButton.addEventListener('click',()=>{
    const draft=persist();location.href=targetUrl('services.html',{saved:draft.id})+'#serviceRegistry';
  });
  createForm.addEventListener('click',event=>{
    event.preventDefault();const draft=persist();
    location.href=targetUrl('form-builder.html',{new:'1',service:draft.id});
  });
}

function registryRow(draft){
  const l=lang(),c=copy(),agency=AGENCIES[draft.agencyId]||AGENCIES.sahsh;
  const style=CATEGORY_STYLE[draft.category]||CATEGORY_STYLE.other;
  const name=draft.name?.[l]||draft.name?.tg||draft.name?.ru||c.untitled;
  const audience=(draft.audience||[]).map(value=>c[value]).filter(Boolean).join(' · ');
  const price=draft.cost==='paid'?`${draft.amount||'0,00'} смн.`:c.free;
  const href=draft.formId
    ?targetUrl('form-builder.html',{id:draft.formId,service:draft.id})
    :targetUrl('form-builder.html',{new:'1',service:draft.id});
  return `<a class="svc-row" href="${esc(href)}" data-created-service="${esc(draft.id)}" data-audience="${esc((draft.audience||[]).join(' '))}">
    <span class="tile ${esc(style[0])}" style="width:38px;height:38px"><svg style="width:18px;height:18px"><use href="/design-system/assets/icons.svg#${esc(style[1])}"/></svg></span>
    <span class="nm"><b>${esc(name)}</b><span class="k">${esc(agency[l]||agency.tg)}${audience?' · '+esc(audience):''} · ${esc(draft.code)}</span></span>
    <span class="cols"><span><b>0</b> ${esc(c.fields)}</span><span>${esc(price)}</span><span>${esc(c.updated)}</span></span>
    <span class="pill-st warn">${esc(c.draft)}</span>
  </a>`;
}

function renderRegistry(){
  const root=document.querySelector('#createdServiceRows');if(!root)return;
  const drafts=getServiceDrafts();root.innerHTML=drafts.map(registryRow).join('');
  const draftCount=document.querySelector('#draftServiceCount');if(draftCount)draftCount.textContent=String(8+drafts.length);
  const railCount=document.querySelector('[data-bld-rail] .an[href="services.html"] .cnt');if(railCount)railCount.textContent=String(612+drafts.length);
  window.dispatchEvent(new CustomEvent('ekh:servicedraftsrendered'));
  const savedId=new URLSearchParams(location.search).get('saved');
  if(savedId&&drafts.some(draft=>draft.id===savedId))window.bpToast?.(copy().saved);
}

document.addEventListener('bp:langchange',renderRegistry);
window.addEventListener('ekh:servicedraftschange',renderRegistry);
initWizard();
renderRegistry();
