import './builder-i18n.js';
import { initSidebar } from '/design-system/js/sidebar.js';

/* ===================== BUILDER — interactions =====================
   Standalone engine for the eKhizmat service-builder (Конструктор) bundle.
   Forked from the operator bundle's engine; same declarative, data-attribute
   contract so each page wires behaviour in markup: theme toggle, page-nav,
   language switcher + engine (tg↔ru), toast, modals/drawers (focus-trap),
   pressed groups, tabs (= the pipeline-stage switcher), multi-step wizard,
   demo upload, faux-QR, and the builder-console rail builder. The form/field
   composer state machine lives inline in builder.html (page-specific), the way
   the operator session did — this file stays generic. No citizen code here.
   ================================================================== */
(function(){
"use strict";
var $  = function(s,r){ return (r||document).querySelector(s); };
var $$ = function(s,r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); };
var reduce = matchMedia("(prefers-reduced-motion: reduce)");

/* ---------- kill spellcheck squiggles ----------
   Demo fields are pre-filled with Tajik/Russian text; the browser's spellchecker
   has no tg dictionary so it red-underlines nearly every word. One root toggle
   cascades to every input/textarea (they inherit unless they opt in). */
document.documentElement.spellcheck = false;

/* ---------- theme (shares the prototype's ekh-theme key) ---------- */
var THEME="ekh.preferences.theme", mq=matchMedia("(prefers-color-scheme: dark)"), systemTheme=document.documentElement.hasAttribute("data-system-theme");
function setTheme(){
  var s=null; if(!systemTheme)try{ s=new URLSearchParams(location.search).get('theme')||localStorage.getItem(THEME); }catch(e){}
  document.documentElement.dataset.theme = s || (mq.matches?"dark":"light");
}
setTheme();
mq.addEventListener("change", setTheme);
document.addEventListener("click", function(e){
  var t=e.target.closest("[data-theme-toggle]"); if(!t) return;
  if(systemTheme)return;
  var next=document.documentElement.dataset.theme==="dark"?"light":"dark";
  try{ localStorage.setItem(THEME,next); }catch(err){}
  document.documentElement.dataset.theme=next;
  profileThemeSource=next;
  syncThemeRow();
});

/* ---------- operator page nav (injected into every toolbar) ----------
   Each entry: [href, Tajik label, Russian label]. The bp-bar is excluded from the i18n
   DOM sweep, so these <option>s are re-labelled directly when the language switches. */
var PAGES=[
  ["",                   "— гузариш ба экран —",             "— переход к экрану —"],
  ["index.html",         "◆ Ҳама экранҳои конструктор",      "◆ Все экраны конструктора"],
  ["services.html",      "Конструктор · феҳристи хизматҳо",  "Конструктор · реестр услуг"],
  ["new-service.html",   "Конструктор · хизмати нав",        "Конструктор · новая услуга"],
  ["builder.html",       "Конструктор · раванди хизмат",     "Конструктор · процесс услуги"],
  ["forms.html",         "Китобхона · шаклҳо",               "Библиотека · формы"],
  ["form-builder.html",  "Китобхона · муҳаррири шакл",       "Библиотека · редактор формы"],
  ["review.html",        "Конструктор · санҷиш ва нашр",      "Конструктор · проверка и публикация"]
];
function navLang(){ var l="tg"; try{ l=new URLSearchParams(location.search).get('lang')||localStorage.getItem('ekh.preferences.lang')||'tg'; }catch(e){} return l; }
function navLabel(p, lang){ return (lang==="ru" && p[2]) ? p[2] : p[1]; }   /* en falls back to tg */
function navSetLang(lang){
  $$("[data-nav]").forEach(function(sel){
    $$("option", sel).forEach(function(o){
      for(var i=0;i<PAGES.length;i++){ if(PAGES[i][0]===o.value){ o.textContent=navLabel(PAGES[i],lang); break; } }
    });
  });
}
var here=location.pathname.split("/").pop()||"index.html";
$$("[data-nav]").forEach(function(sel){
  if(!sel.options.length){
    var lang=navLang();
    PAGES.forEach(function(p){
      var o=document.createElement("option"); o.value=p[0]; o.textContent=navLabel(p,lang);
      if(p[0]===here) o.selected=true;
      sel.appendChild(o);
    });
  }
  sel.addEventListener("change", function(){ if(sel.value && sel.value!==here) location.href=sel.value; });
});

/* ---------- dropdown menus (.dd): open/close, single-select, gliding highlight ---------- */
var LANG_SHORT={tg:"ТҶ",ru:"RU",en:"EN"};
function ddHl(menu){
  var hl=menu.querySelector(".dd-hl");
  if(!hl){ hl=document.createElement("div"); hl.className="dd-hl"; menu.insertBefore(hl, menu.firstChild); }
  return hl;
}
function ddMove(menu, btn, glide){
  if(!menu||!btn) return; var hl=ddHl(menu);
  if(glide) hl.classList.add("move"); else hl.classList.remove("move");
  hl.style.top=btn.offsetTop+"px"; hl.style.height=btn.offsetHeight+"px"; hl.style.opacity="1";
}
function ddFinePointer(){
  try{ return matchMedia("(hover: hover) and (pointer: fine)").matches; }catch(e){ return true; }
}
function ddCloseOne(dd){
  if(!dd) return;
  if(ddAimState&&ddAimState.dd===dd) ddAimClear();
  dd.classList.remove("open","dd-up","dd-right");
  dd._openByHover=false;
  var b=dd.querySelector(".dd-btn"); if(b) b.setAttribute("aria-expanded","false");
  ddAimHideBridge(dd);
}
function ddFlipMenu(dd){
  var menu=dd.querySelector(".dd-menu"), btn=dd.querySelector(".dd-btn");
  if(!menu||!btn) return;
  dd.classList.remove("dd-up","dd-right");
  var pop=dd.closest("#admProfilePop");
  if(pop&&pop.classList.contains("ekh-profile-pop--side")){ dd.classList.add("dd-right"); return; }
  var menuH=menu.offsetHeight||180, br=btn.getBoundingClientRect();
  if(br.bottom+8+menuH>window.innerHeight-8 && br.top-8-menuH>=8) dd.classList.add("dd-up");
}
function ddClose(){
  ddAimClear();
  $$(".dd.open").forEach(ddCloseOne);
}
/* Amazon / jquery-menu-aim safe triangle: keep the language flyout open while
   the pointer travels toward it (including over Theme). Overlay polygon is the
   hit target; JS hit-test is the fallback. */
var ddAimState=null, ddAimTimer=null;
function ddAimClearTimer(){
  if(ddAimTimer){ clearTimeout(ddAimTimer); ddAimTimer=null; }
}
function ddAimClear(){
  ddAimClearTimer();
  if(ddAimState&&ddAimState.dd) ddAimHideBridge(ddAimState.dd);
  ddAimState=null;
}
function ddAimPointInTri(px, py, x1, y1, x2, y2, x3, y3){
  var d=(y2-y3)*(x1-x3)+(x3-x2)*(y1-y3); if(!d) return false;
  var a=((y2-y3)*(px-x3)+(x3-x2)*(py-y3))/d;
  var b=((y3-y1)*(px-x3)+(x1-x3)*(py-y3))/d;
  return a>=0 && b>=0 && (a+b)<=1;
}
function ddAimBridge(dd){
  var el=dd.querySelector(":scope > .dd-aim-bridge");
  if(el) return el;
  el=document.createElementNS("http://www.w3.org/2000/svg","svg");
  el.setAttribute("class","dd-aim-bridge");
  el.setAttribute("aria-hidden","true");
  el.appendChild(document.createElementNS("http://www.w3.org/2000/svg","polygon"));
  dd.appendChild(el);
  return el;
}
function ddAimHideBridge(dd){
  if(!dd) return;
  var el=dd.querySelector(":scope > .dd-aim-bridge");
  if(!el) return;
  el.classList.remove("is-on");
  var p=el.querySelector("polygon");
  if(p) p.setAttribute("points","");
}
function ddAimCorners(dd){
  var menu=dd.querySelector(".dd-menu");
  if(!menu) return null;
  var mr=menu.getBoundingClientRect();
  if(dd.classList.contains("dd-right")){
    return {bx:mr.left, by:mr.top, cx:mr.left, cy:mr.bottom};
  }
  if(dd.classList.contains("dd-up")){
    return {bx:mr.left, by:mr.bottom, cx:mr.right, cy:mr.bottom};
  }
  return {bx:mr.left, by:mr.top, cx:mr.right, cy:mr.top};
}
function ddAimApex(dd, x, y){
  if(typeof x==="number" && typeof y==="number") return {x:x, y:y};
  if(typeof dd._aimX==="number") return {x:dd._aimX, y:dd._aimY};
  var btn=dd.querySelector(".dd-btn");
  if(!btn) return {x:0, y:0};
  var br=btn.getBoundingClientRect();
  if(dd.classList.contains("dd-right")) return {x:br.left+8, y:br.top+br.height/2};
  return {x:br.left+br.width/2, y:br.bottom-2};
}
function ddAimPaint(dd, x, y){
  if(!dd||!dd.classList.contains("open")) return;
  var corners=ddAimCorners(dd); if(!corners) return;
  var apex=ddAimApex(dd, x, y);
  ddAimState={dd:dd, ax:apex.x, ay:apex.y, bx:corners.bx, by:corners.by, cx:corners.cx, cy:corners.cy};
  var bridge=ddAimBridge(dd), poly=bridge.querySelector("polygon");
  poly.setAttribute("points", apex.x+","+apex.y+" "+corners.bx+","+corners.by+" "+corners.cx+","+corners.cy);
  bridge.classList.add("is-on");
}
function ddAimHit(el, dd){
  return !!(el && dd && dd.contains(el));
}
function ddAimCheck(x, y){
  var s=ddAimState; if(!s||!s.dd.classList.contains("open")){ ddAimClear(); return; }
  var dd=s.dd, el=document.elementFromPoint(x, y);
  if(ddAimHit(el, dd)){
    ddAimClearTimer();
    if(el.closest && el.closest(".dd-btn")){
      dd._aimX=x; dd._aimY=y;
      ddAimPaint(dd, x, y);
    }
    return;
  }
  var corners=ddAimCorners(dd);
  if(corners && ddAimPointInTri(x, y, s.ax, s.ay, corners.bx, corners.by, corners.cx, corners.cy)){
    ddAimClearTimer();
    return;
  }
  if(!ddAimTimer) ddAimTimer=setTimeout(function(){ ddCloseOne(dd); }, 80);
}
function ddAimProfileDd(target){
  return target&&target.closest&&target.closest("#admProfilePop .dd");
}
function ddOpen(dd, viaHover){
  var hover=!!viaHover;
  ddClose();
  dd.classList.add("open");
  dd._openByHover=hover;
  var b=dd.querySelector(".dd-btn"); if(b) b.setAttribute("aria-expanded","true");
  var menu=dd.querySelector(".dd-menu"); if(!menu) return;
  ddFlipMenu(dd);
  var sel=menu.querySelector("[aria-selected='true']")||menu.querySelector("button");
  ddMove(menu, sel, false);
  requestAnimationFrame(function(){
    ddMove(menu, sel, true);
    ddAimPaint(dd);
  });
}
document.addEventListener("click", function(e){
  var trig=e.target.closest(".dd-btn");
  if(trig){
    var dd=trig.closest(".dd");
    if(dd){
      e.preventDefault();
      if(dd._openByHover && dd.classList.contains("open")){ dd._openByHover=false; return; }
      if(dd.classList.contains("open")) ddClose(); else ddOpen(dd, false);
      return;
    }
  }
  var opt=e.target.closest(".dd-menu button");
  if(opt){
    var menu=opt.closest(".dd-menu");
    $$("button[role='option']",menu).forEach(function(x){ x.setAttribute("aria-selected", String(x===opt)); });
    var lang=opt.getAttribute("data-lang");
    if(lang){ if(window.bpSetLang){ window.bpSetLang(lang); } syncThemeRow(); }
    var acct=opt.getAttribute("data-acct");
    if(acct){ var label=(opt.querySelector("span")||opt).textContent.trim();
      var ac=$("#acctCur"); if(ac) ac.textContent=label;
      var ha=$("#hdrAcct"); if(ha) ha.textContent=label; }
    ddClose(); return;
  }
  if(e.target.closest(".dd-aim-bridge")) return;
  if(!e.target.closest(".dd")) ddClose();
});
document.addEventListener("mousemove", function(e){
  var btn=e.target.closest&&e.target.closest("#admProfilePop .dd.open .dd-btn");
  if(btn){
    var hoverDd=btn.closest(".dd");
    hoverDd._aimX=e.clientX; hoverDd._aimY=e.clientY;
    ddAimPaint(hoverDd, e.clientX, e.clientY);
  }
  if(ddAimState) ddAimCheck(e.clientX, e.clientY);
});
document.addEventListener("mouseout", function(e){
  var dd=ddAimProfileDd(e.target);
  if(!dd||!dd.classList.contains("open")) return;
  var rel=e.relatedTarget;
  if(rel&&dd.contains(rel)) return;
  ddAimPaint(dd, dd._aimX, dd._aimY);
  ddAimCheck(e.clientX, e.clientY);
});
document.addEventListener("mouseover", function(e){
  if(ddFinePointer()){
    var popDd=e.target.closest("#admProfilePop .dd.lang");
    if(popDd){
      var from=e.relatedTarget;
      if(!(from&&popDd.contains(from))){
        if(!popDd.classList.contains("open")) ddOpen(popDd, true);
        else ddAimClearTimer();
      }
    }
  }
  var b=e.target.closest(".dd.open .dd-menu button"); if(b) ddMove(b.closest(".dd-menu"), b, true);
});

/* ---------- language switcher (lives in the profile popover — one source of truth) ---------- */
var LANG_SWITCH='<div class="dd lang ekh-profile-pop__row-host">'+
  '<button class="dd-btn ekh-profile-pop__row" type="button" aria-haspopup="listbox" aria-expanded="false" aria-label="Забон / Language">'+
    '<span class="ekh-profile-pop__row-label">Забон</span>'+
    '<span id="langCur" data-no-i18n>Тоҷикӣ</span>'+
    '<svg class="ekh-profile-pop__chev" aria-hidden="true"><use href="/design-system/assets/icons.svg#i-chev-r"/></svg>'+
    '<svg class="ekh-profile-pop__compact-icon" aria-hidden="true"><use href="/design-system/assets/icons.svg#i-globe"/></svg></button>'+
  '<div class="dd-menu" role="listbox" aria-label="Забон / Language">'+
    '<div class="dd-label" aria-hidden="true">Забон</div>'+
    '<button role="option" data-lang="tg" aria-selected="true"><span data-no-i18n>Тоҷикӣ</span><svg><use href="/design-system/assets/icons.svg#i-check"/></svg></button>'+
    '<button role="option" data-lang="ru" aria-selected="false"><span data-no-i18n>Русский</span><svg><use href="/design-system/assets/icons.svg#i-check"/></svg></button>'+
    '<button role="option" data-lang="en" disabled aria-disabled="true" aria-selected="false"><span data-no-i18n>English</span><span class="dd-soon">ба зудӣ</span></button>'+
  '</div></div>';
var PROFILE_USER={name:"Аброр Каримов", role:"Маъмури платформа", initials:"АК"};
var profilePop=null, profileTrigger=null;
var PROFILE_TRIGGER_BTN='<button type="button" class="icon-btn adm-profile-trigger" data-admin-profile-trigger aria-haspopup="dialog" aria-expanded="false" aria-controls="admProfilePop" aria-label="Профил">'+
  '<span class="ekh-side__avatar adm-profile-trigger__avatar" aria-hidden="true">'+PROFILE_USER.initials+'</span></button>';
var THEME_LABEL={tg:{dark:"Темная",light:"Равшан",system:"Аз система"},ru:{dark:"Тёмная",light:"Светлая",system:"Система"}};
var profileThemeSource=(function(){
  if(systemTheme) return "system";
  var saved=null;
  try{ saved=new URLSearchParams(location.search).get("theme")||localStorage.getItem(THEME); }catch(e){}
  return saved==="dark"||saved==="light" ? saved : "system";
})();
function profileLangKey(){
  try{ return new URLSearchParams(location.search).get("lang")||localStorage.getItem("ekh.preferences.lang")||"tg"; }catch(e){ return "tg"; }
}
function profileThemeLabel(){
  var labels=THEME_LABEL[profileLangKey()]||THEME_LABEL.tg;
  return labels[profileThemeSource]||labels.system;
}
function profileThemeOptionHtml(value, icon){
  var active=profileThemeSource===value;
  var disabled=systemTheme?' disabled aria-disabled="true"':'';
  var label=profileThemeLabelFor(value);
  return '<button type="button" class="ekh-profile-pop__theme-choice ekh-profile-pop__theme-choice--'+value+'" data-admin-theme-choice="'+value+'" aria-pressed="'+active+'" aria-label="'+label+'" title="'+label+'"'+disabled+'>'+
    '<svg aria-hidden="true"><use href="/design-system/assets/icons.svg#'+icon+'"/></svg></button>';
}
function profileThemeLabelFor(value){
  var labels=THEME_LABEL[profileLangKey()]||THEME_LABEL.tg;
  return labels[value]||labels.system;
}
function profileThemeRowHtml(){
  return '<div class="ekh-profile-pop__row ekh-profile-pop__row--theme" data-admin-theme-row>'+
    '<span class="ekh-profile-pop__row-label">Тема</span>'+
    '<div class="ekh-profile-pop__theme-options" role="group" aria-label="Тема">'+
      profileThemeOptionHtml("system","i-theme-system")+
      profileThemeOptionHtml("light","i-sun")+
      profileThemeOptionHtml("dark","i-moon")+
    '</div></div>';
}
function syncThemeRow(){
  if(!profilePop) return;
  $$("[data-admin-theme-choice]",profilePop).forEach(function(choice){
    var value=choice.getAttribute("data-admin-theme-choice");
    var label=profileThemeLabelFor(value);
    choice.setAttribute("aria-pressed",String(value===profileThemeSource));
    choice.setAttribute("aria-label",label);
    choice.setAttribute("title",label);
  });
}
function setProfileTheme(value){
  if(systemTheme||!["system","light","dark"].includes(value)) return;
  profileThemeSource=value;
  try{
    if(value==="system") localStorage.removeItem(THEME);
    else localStorage.setItem(THEME,value);
  }catch(e){}
  document.documentElement.dataset.theme=value==="system"?(mq.matches?"dark":"light"):value;
  syncThemeRow();
}
function profilePopHtml(){
  return '<div class="ekh-profile-pop" id="admProfilePop" role="dialog" aria-modal="true" aria-labelledby="admProfileTitle" hidden>'+
    '<div class="ekh-profile-pop__card">'+
      '<span class="ekh-side__avatar" aria-hidden="true">'+PROFILE_USER.initials+'</span>'+
      '<div class="ekh-profile-pop__identity"><b id="admProfileTitle">'+PROFILE_USER.name+'</b><span>'+PROFILE_USER.role+'</span></div>'+
    '</div>'+
    '<div class="ekh-profile-pop__divider" aria-hidden="true"></div>'+
    '<div class="ekh-profile-pop__preferences">'+LANG_SWITCH+profileThemeRowHtml()+'</div>'+
  '</div>';
}
function mountProfilePop(){
  if(document.getElementById("admProfilePop")){ profilePop=document.getElementById("admProfilePop"); return; }
  document.body.insertAdjacentHTML("beforeend", profilePopHtml());
  profilePop=document.getElementById("admProfilePop");
}
function profilePopSideInset(side){
  var sideRect=side.getBoundingClientRect(), cs=getComputedStyle(side);
  var padL=parseFloat(cs.paddingLeft)||0, padR=parseFloat(cs.paddingRight)||0;
  return {left:sideRect.left+padL, right:sideRect.right-padR, width:sideRect.width-padL-padR};
}
function positionProfilePop(trigger){
  if(!profilePop||!trigger) return;
  profilePop.hidden=false;
  var rect=trigger.getBoundingClientRect(), side=trigger.closest(".ekh-side");
  var top, left, popRect;
  if(side){
    var inset=profilePopSideInset(side);
    profilePop.classList.add("ekh-profile-pop--side");
    profilePop.style.setProperty("--profile-pop-max-w", inset.width+"px");
    popRect=profilePop.getBoundingClientRect();
    top=rect.top-popRect.height-8;
    left=inset.left;
    if(top<8) top=rect.bottom+8;
    profilePop.style.transformOrigin="bottom left";
    left=Math.max(inset.left, Math.min(left, inset.right-popRect.width));
  } else {
    profilePop.classList.remove("ekh-profile-pop--side");
    profilePop.style.removeProperty("--profile-pop-max-w");
    popRect=profilePop.getBoundingClientRect();
    top=rect.bottom+8;
    left=rect.right-popRect.width;
    profilePop.style.transformOrigin="top right";
    left=Math.max(8, Math.min(left, window.innerWidth-popRect.width-8));
  }
  top=Math.max(8, Math.min(top, window.innerHeight-popRect.height-8));
  profilePop.style.top=top+"px";
  profilePop.style.left=left+"px";
}
function closeProfilePop(restore){
  if(!profilePop||profilePop.hidden) return;
  ddClose();
  profilePop.classList.remove("is-open");
  profilePop.hidden=true;
  if(profileTrigger){
    profileTrigger.setAttribute("aria-expanded","false");
    if(restore&&profileTrigger.focus) profileTrigger.focus();
    profileTrigger=null;
  }
}
function openProfilePop(trigger){
  mountProfilePop();
  if(profileTrigger===trigger&&!profilePop.hidden){ closeProfilePop(true); return; }
  closeProfilePop(false);
  profileTrigger=trigger;
  trigger.setAttribute("aria-expanded","true");
  profilePop.hidden=false;
  positionProfilePop(trigger);
  syncThemeRow();
  requestAnimationFrame(function(){ profilePop.classList.add("is-open"); });
  var f=focusables(profilePop); if(f.length) f[0].focus();
}
function ensureProfileTriggers(){
  $$(".hdr .hdr-in").forEach(function(hin){
    if(hin.querySelector(".hdr-acts")) return;
    var acts=document.createElement("div"); acts.className="hdr-acts";
    acts.innerHTML=PROFILE_TRIGGER_BTN;
    hin.appendChild(acts);
  });
  $$(".hdr-acts, .adm-top .at-right").forEach(function(host){
    host.querySelectorAll(":scope > [data-theme-toggle], :scope > .dd.lang").forEach(function(el){ el.remove(); });
    if(!host.querySelector("[data-admin-profile-trigger]")){
      host.insertAdjacentHTML("beforeend", PROFILE_TRIGGER_BTN);
    }
  });
}
ensureProfileTriggers();
window.addEventListener("resize", function(){
  if(profilePop&&!profilePop.hidden&&profileTrigger) positionProfilePop(profileTrigger);
});
new MutationObserver(function(){
  if(profilePop&&!profilePop.hidden&&profileTrigger) positionProfilePop(profileTrigger);
}).observe(document.documentElement,{attributes:true,attributeFilter:["class"]});
document.addEventListener("click", function(e){
  var trig=e.target.closest("[data-admin-profile-trigger]");
  if(trig){ e.preventDefault(); e.stopPropagation(); openProfilePop(trig); return; }
  if(profilePop&&!profilePop.hidden&&!e.target.closest("#admProfilePop")) closeProfilePop(true);
});
document.addEventListener("click", function(e){
  var choice=e.target.closest("[data-admin-theme-choice]");
  if(!choice) return;
  e.preventDefault();
  setProfileTheme(choice.getAttribute("data-admin-theme-choice"));
});
document.addEventListener("keydown", function(e){
  if(e.key!=="Tab"||!profilePop||profilePop.hidden) return;
  var f=focusables(profilePop); if(!f.length) return;
  var first=f[0], last=f[f.length-1];
  if(e.shiftKey&&document.activeElement===first){ e.preventDefault(); last.focus(); }
  else if(!e.shiftKey&&document.activeElement===last){ e.preventDefault(); first.focus(); }
});
document.addEventListener("keydown", function(e){
  if(e.key!=="Escape") return;
  if(profilePop&&!profilePop.hidden&&profilePop.querySelector(".dd.open")){
    e.preventDefault(); ddClose(); return;
  }
  if(profilePop&&!profilePop.hidden){ e.preventDefault(); closeProfilePop(true); return; }
  ddClose();
});

/* ---------- toast ---------- */
var toastEl;
function toast(msg){
  if(!toastEl){ toastEl=document.createElement("div"); toastEl.className="toast"; toastEl.setAttribute("role","status"); toastEl.setAttribute("aria-live","polite"); document.body.appendChild(toastEl); }
  toastEl.textContent=msg; toastEl.classList.add("show");
  clearTimeout(toastEl._t); toastEl._t=setTimeout(function(){ toastEl.classList.remove("show"); },2600);
}
window.bpToast=toast;

/* ---------- overlays & drawers (open/close + focus trap) ---------- */
var lastFocus=null;
var sharedLayers=new WeakMap();
function focusables(box){
  return $$("button,[href],input,select,textarea,[tabindex]:not([tabindex='-1'])",box)
    .filter(function(el){ return !el.disabled && el.offsetParent!==null; });
}
function openLayer(id){
  var box=document.getElementById(id); if(!box) return;
  lastFocus=document.activeElement;
  if(box.classList.contains('overlay') && window.EKHDialog){
    sharedLayers.set(box, window.EKHDialog.openExistingDialog(box, {trigger:lastFocus}));
  } else {
    box.classList.add('open');
    var f=focusables(box); if(f.length) f[0].focus();
  }
}
function closeLayer(box){
  var shared=sharedLayers.get(box);
  if(shared){ shared.close(); sharedLayers.delete(box); }
  else { box.classList.remove('open'); if(lastFocus && lastFocus.focus) lastFocus.focus(); }
}
document.addEventListener("click", function(e){
  var op=e.target.closest("[data-open]");
  if(op){ e.preventDefault(); openLayer(op.getAttribute("data-open")); return; }
  var cl=e.target.closest("[data-close]");
  if(cl){ var box=cl.closest(".overlay,.drawer-ov"); if(box) closeLayer(box); return; }
  /* backdrop click */
  if(e.target.classList && (e.target.classList.contains("overlay")||e.target.classList.contains("drawer-ov"))) closeLayer(e.target);
});
document.addEventListener("keydown", function(e){
  if(e.key==="Escape"){ var open=$(".overlay.open,.drawer-ov.open"); if(open){ closeLayer(open); return; } }
  if(e.key!=="Tab") return;
  var open=$(".overlay.open,.drawer-ov.open"); if(!open) return;
  var f=focusables(open); if(!f.length) return;
  var first=f[0], last=f[f.length-1];
  if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); }
  else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); }
});
window.bpOpen=openLayer;

/* ---------- single-select pressed groups (segments, slots, calendar, methods) ---------- */
document.addEventListener("click", function(e){
  var b=e.target.closest("[data-val]"); if(!b) return;
  var group=b.closest("[data-select]"); if(!group) return;
  $$("[data-val]",group).forEach(function(x){ x.setAttribute("aria-pressed", String(x===b)); });
  var outSel=group.getAttribute("data-select-out");
  if(outSel){ var out=$(outSel); if(out) out.textContent=b.getAttribute("data-val"); }
  var enable=group.getAttribute("data-select-enable");
  if(enable){ var btn=$(enable); if(btn) btn.disabled=false; }
});

/* ---------- tabs ---------- */
document.addEventListener("click", function(e){
  var tab=e.target.closest("[data-tab]"); if(!tab) return;
  var list=tab.closest("[data-tabs]"); if(!list) return;
  var key=tab.getAttribute("data-tab");
  $$("[data-tab]",list).forEach(function(x){
    var on=x===tab; x.setAttribute("aria-selected",String(on)); x.tabIndex=on?0:-1;
  });
  var scope=list.getAttribute("data-tabs-scope");
  var root=scope?document.querySelector(scope):document;
  $$("[data-panel]",root).forEach(function(p){
    if(list.contains(p)) return;
    p.hidden = p.getAttribute("data-panel")!==key;
  });
});

/* ---------- multi-step flows (operator session wizard) ---------- */
function flowGoto(flow, n){
  var steps=$$(".j-step,[data-step]",flow).filter(function(s){return s.hasAttribute("data-step");});
  var total=steps.length;
  steps.forEach(function(s){ s.hidden = Number(s.getAttribute("data-step"))!==n; });
  $$(".j-prog .st",flow).forEach(function(s,i){ s.classList.toggle("on", i<n); });
  $$(".j-prog .bar",flow).forEach(function(b,i){ b.classList.toggle("on", i<n-1); });
  $$(".wz-step",flow).forEach(function(s,i){
    s.classList.toggle("done", i<n-1); s.classList.toggle("active", i===n-1);
    if(i===n-1) s.setAttribute("aria-current","step"); else s.removeAttribute("aria-current");
  });
  var lbl=$("[data-step-label]",flow);
  if(lbl){ var tpl=lbl.getAttribute("data-step-tpl")||"{n}/{t}"; lbl.textContent=tpl.replace("{n}",n).replace("{t}",total); }
  flow._step=n;
  var cur=steps.find(function(s){return Number(s.getAttribute("data-step"))===n;});
  /* the stepper header is noise on a terminal success step — hide it there */
  var head=$(".j-head",flow);
  if(head){ head.hidden = !!(cur && cur.querySelector(".success")); }
  var h=cur&&cur.querySelector("h2,h3");
  if(h){ h.setAttribute("tabindex","-1"); h.focus({preventScroll:true}); }
  window.scrollTo({top:0,left:0,behavior:reduce.matches?"instant":"smooth"});
}
window.bpFlowGoto=function(sel,n){ var f=$(sel); if(f) flowGoto(f,n); };
document.addEventListener("click", function(e){
  var nx=e.target.closest("[data-next]");
  if(nx){ var f=nx.closest("[data-flow]"); if(f) flowGoto(f,(f._step||1)+1); return; }
  var bk=e.target.closest("[data-back]");
  if(bk){ var f2=bk.closest("[data-flow]"); if(f2) flowGoto(f2,Math.max(1,(f2._step||1)-1)); return; }
  var gt=e.target.closest("[data-goto]");
  if(gt){ var f3=gt.closest("[data-flow]"); if(f3) flowGoto(f3,Number(gt.getAttribute("data-goto"))); return; }
});
$$("[data-flow]").forEach(function(f){ flowGoto(f, 1); });

/* ---------- demo file upload ---------- */
var fileSeq=0;
document.addEventListener("click", function(e){
  var dz=e.target.closest("[data-upload]"); if(dz){ addFile(dz); return; }
  var rm=e.target.closest("[data-file-remove]");
  if(rm){ var row=rm.closest(".filerow"); if(row) row.remove(); return; }
});
function addFile(dz){
  var listSel=dz.getAttribute("data-upload"); var list=listSel?$(listSel):dz.parentNode.querySelector(".filelist");
  if(!list) return;
  var names=["scan_pasport.pdf","ariza.jpg","shartnoma.pdf","kvitansiya.png"];
  var nm=names[fileSeq++ % names.length];
  var row=document.createElement("div"); row.className="filerow";
  row.innerHTML='<span class="fi"><svg><use href="/design-system/assets/icons.svg#i-paperclip"/></svg></span>'+
    '<div class="fn"><b>'+nm+'</b><span>бор мешавад…</span><div class="prog"><i style="width:8%"></i></div></div>'+
    '<button class="fx" data-file-remove aria-label="Бекор кардан"><svg><use href="/design-system/assets/icons.svg#i-x"/></svg></button>';
  list.appendChild(row);
  var bar=row.querySelector(".prog i"), sub=row.querySelector(".fn span"), p=8;
  var iv=setInterval(function(){
    p+=Math.random()*26; if(p>=100){ p=100; clearInterval(iv);
      row.classList.add("done"); row.querySelector(".fi use").setAttribute("href","#i-check");
      sub.textContent="2.1 МБ · омода"; bar.parentNode.remove();
    } else { bar.style.width=p.toFixed(0)+"%"; }
  }, reduce.matches?1:260);
}

/* ---------- demo toast hooks ---------- */
document.addEventListener("click", function(e){
  var t=e.target.closest("[data-toast]"); if(t) toast(t.getAttribute("data-toast"));
});

/* ---------- builder-console rail (services + independent form library) ---------- */
/* Four permanent destinations. Creating a service is an occasional task, not a
   place — it is launched from the registry header (design-guide rule 45). */
var BLD_NAV = [
  ["__label","Конструктор"],
  ["overview",  "Лавҳаи идора",     "i-star8"],
  ["services",  "Хизматрасониҳо", "i-cat-cert", "612"],
  ["review",    "Санҷиш ва нашр", "i-check", "", "review"],
  ["__label","Кутубхона"],
  ["forms",     "Шаклҳо",         "i-doc", "", "forms"]
];
var BLD_HREF = { overview:"index.html", services:"services.html", "new":"new-service.html", review:"review.html", forms:"forms.html" };
/* collapsible-rail state: icon-only when collapsed, persisted across pages.
   The state class lives on <html> so each page's inline head script can
   restore it before first paint — navigation never flashes or animates. */
var RAIL_KEY='ekh.admin.rail';
/* tiny standalone translator (the toggle is data-no-i18n, so its labels are set
   here in the active language rather than by the DOM sweep/observer) */
function railTr(s){ try{ var l=navLang(); var D=window.BP_DICT; if(l&&l!=='tg'&&D&&D[l]&&D[l][s]) return D[l][s]; }catch(e){} return s; }
$$("[data-bld-rail]").forEach(function(rail){
  if(!rail.id) rail.id="admRail";
  var active = rail.getAttribute("data-active");
  var h = '<div class="ekh-side__head">'+
            '<a class="ekh-side__brand" href="services.html" title="eKhizmat · Конструктор"><svg class="mark" aria-hidden="true"><use href="/design-system/assets/icons.svg#i-logo"/></svg><b>eKhizmat</b></a>'+
          '</div>';
  BLD_NAV.forEach(function(it){
    if (it[0]==="__label"){ h += '<div class="ekh-side__label">'+it[1]+'</div>'; return; }
    var cur = it[0]===active;
    var icon = '<svg><use href="/design-system/assets/icons.svg#'+it[2]+'"/></svg>';
    h += '<a class="ekh-side__item" href="'+(BLD_HREF[it[0]]||"#")+'"'+(cur?' aria-current="true"':'')+' title="'+it[1]+'">'+
         icon+'<span class="ekh-side__text">'+it[1]+'</span>'+
         (it[3]||it[4]?'<span class="ekh-side__count"'+(it[4]?' data-rail-count="'+it[4]+'"':'')+'>'+it[3]+'</span>':'')+'</a>';
  });
  h += '<div class="ekh-side__spacer"></div>';
  h += '<button type="button" class="ekh-side__user" data-admin-profile-trigger aria-haspopup="dialog" aria-expanded="false" aria-controls="admProfilePop" title="Аброр Каримов · Маъмури платформа">'+
       '<span class="ekh-side__avatar" aria-hidden="true">АК</span><span class="ekh-side__identity"><b>Аброр Каримов</b><span>Маъмури платформа</span></span></button>';
  rail.innerHTML = h;
  /* Keep the collapse control in the stable top bar. It remains in the same
     task-level chrome on every screen and is never confused with page content. */
  var adm = rail.closest(".adm");
  if(adm && !adm.querySelector("[data-ekh-side-toggle]")){
    adm.classList.add("ekh-side-shell");
    var btn=document.createElement("button");
    btn.className="ekh-side-toggle"; btn.type="button";
    btn.setAttribute("data-ekh-side-toggle",""); btn.setAttribute("data-no-i18n","");
    btn.setAttribute("aria-controls", rail.id);
    btn.setAttribute("aria-label","Ҷамъ кардани панел");
    btn.innerHTML='<svg aria-hidden="true"><use href="/design-system/assets/icons.svg#i-chev-l"/></svg>';
    var top=adm.querySelector(".adm-top");
    if(top) top.insertBefore(btn, top.firstChild);
    else adm.appendChild(btn);
  }
});
/* A badge that never changes when the state machine moves reads as a bug in a
   demo. Both counts are selectors over the same data the pages render. */
function setRailCount(key, value){
  $$('[data-rail-count="'+key+'"]').forEach(function(el){
    el.textContent = value ? String(value) : '';
    el.hidden = !value;
  });
}
if($$("[data-bld-rail]").length){
  Promise.all([
    import('./lowcode.js').then(function(m){ return m; }).catch(function(){ return null; }),
    import('./forms-data.js').catch(function(){ return null; })
  ]).then(function(mods){
    var lc=mods[0], formsData=mods[1];
    function sync(){
      if(lc) setRailCount('review', lc.getReviewQueue(lc.getLowCodeState().role).length);
      if(formsData) setRailCount('forms', formsData.getForms().length);
    }
    if(lc) lc.subscribeLowCode(sync);
    sync();
  });
}

var railHandle=null;
if($$("[data-bld-rail]").length){
  railHandle=initSidebar({
    shell: document.documentElement,
    key: RAIL_KEY,
    labels: function(c){ return { action: railTr(c ? "Кушодани панел" : "Ҷамъ кардани панел") }; }
  });
}

/* ---------- seeded faux-QR (ported from app.js) ---------- */
function seeded(str){ var h=2166136261; for(var i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,16777619);} return function(){ h^=h<<13; h^=h>>>17; h^=h<<5; return ((h>>>0)/4294967296); }; }
window.bpQR=function(svg, key){
  if(!svg) return; var N=29, rnd=seeded(key||"ekhizmat"), m=[];
  for(var y=0;y<N;y++){ m[y]=[]; for(var x=0;x<N;x++) m[y][x]=0; }
  function reserved(x,y){ return (x<=7&&y<=7)||(x>=N-8&&y<=7)||(x<=7&&y>=N-8); }
  function finder(fx,fy){ for(var y=-1;y<=7;y++) for(var x=-1;x<=7;x++){ var X=fx+x,Y=fy+y; if(X<0||Y<0||X>=N||Y>=N) continue; var ring=(x>=0&&x<=6&&y>=0&&y<=6)&&(x===0||x===6||y===0||y===6||(x>=2&&x<=4&&y>=2&&y<=4)); m[Y][X]=ring?1:0; } }
  for(var y=0;y<N;y++) for(var x=0;x<N;x++) if(!reserved(x,y)){ if(x===6||y===6) m[y][x]=(x+y)%2===0?1:0; else m[y][x]=rnd()<0.46?1:0; }
  finder(0,0); finder(N-7,0); finder(0,N-7);
  var r=""; for(var y2=0;y2<N;y2++) for(var x2=0;x2<N;x2++) if(m[y2][x2]) r+='<rect x="'+x2+'" y="'+y2+'" width="1" height="1" fill="currentColor"/>';
  svg.setAttribute("viewBox","0 0 "+N+" "+N); svg.setAttribute("shape-rendering","crispEdges"); svg.innerHTML=r;
};
$$("[data-qr]").forEach(function(svg){ window.bpQR(svg, svg.getAttribute("data-qr")); });

/* ---------- language engine (real tg↔ru switching; en deferred) ----------
   Source-keyed: harvests the rendered DOM (post chrome-injection), swaps text by
   matching the trimmed Tajik source against window.BP_DICT[lang]. No screen markup
   carries translation keys — the screens stay exactly as designed; this is a pure
   runtime layer. Choice persists in localStorage so it holds across page nav. */
var I18N_KEY='ekh.preferences.lang';
var DICT=(window.BP_DICT||{});
var LANG_NAMES={tg:"Тоҷикӣ",ru:"Русский",en:"English"};
var _txt=null, _att=null, _title=null;          /* harvested originals (lazy, once) */
function i18nHarvest(){
  _txt=[]; _att=[]; _title=document.title;
  var w=document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode:function(n){
      var v=n.nodeValue; if(!v||!v.trim()) return NodeFilter.FILTER_REJECT;
      var p=n.parentNode; if(!p) return NodeFilter.FILTER_REJECT;
      var nm=p.nodeName; if(nm==="SCRIPT"||nm==="STYLE") return NodeFilter.FILTER_REJECT;
      if(p.closest&&p.closest(".bp-bar,[data-no-i18n]")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  var n; while((n=w.nextNode())){ _txt.push([n, n.nodeValue]); }
  $$("[placeholder],[aria-label],[title]").forEach(function(el){
    if(el.closest&&el.closest(".bp-bar,[data-no-i18n]")) return;
    ["placeholder","aria-label","title"].forEach(function(a){
      if(el.hasAttribute(a)) _att.push([el, a, el.getAttribute(a)]);
    });
  });
}
function i18nSwap(raw, d){
  var k=raw.trim(); if(!k) return raw;
  var v=d[k]; if(v===undefined) return raw;     /* untranslated → leave Tajik */
  return raw.replace(k, v);                      /* keep surrounding whitespace */
}
function i18nApply(lang){
  if(_txt===null) i18nHarvest();
  var d=(lang!=="tg" && DICT[lang]) ? DICT[lang] : null;
  _txt.forEach(function(r){ r[0].nodeValue = d ? i18nSwap(r[1],d) : r[1]; });
  _att.forEach(function(r){ r[0].setAttribute(r[1], d ? i18nSwap(r[2],d) : r[2]); });
  document.title = d ? i18nSwap(_title,d) : _title;
  document.documentElement.lang = lang;
}
function i18nReflect(lang){
  var lc=$("#langCur"); if(lc) lc.textContent=LANG_NAMES[lang]||lang.toUpperCase();
  $$(".dd.lang [role='option']").forEach(function(o){
    o.setAttribute("aria-selected", String(o.getAttribute("data-lang")===lang));
  });
}
function i18nTransNode(node, d){
  var raw=node.nodeValue; if(!raw||!raw.trim()) return;
  var p=node.parentNode; if(p&&p.closest&&p.closest(".bp-bar,[data-no-i18n]")) return;
  var out=i18nSwap(raw,d); if(out!==raw) node.nodeValue=out;
}
/* dynamic content (modals, toasts) is set AFTER initial apply — re-translate it as
   it appears. ru→tg values aren't keys, so no loop. */
var _obs=null;
function i18nObserve(lang){
  if(_obs){ _obs.disconnect(); _obs=null; }
  var d=(lang!=="tg" && DICT[lang]) ? DICT[lang] : null; if(!d) return;
  _obs=new MutationObserver(function(muts){
    for(var i=0;i<muts.length;i++){
      var m=muts[i];
      if(m.type==="characterData"){ i18nTransNode(m.target, d); continue; }
      for(var j=0;j<m.addedNodes.length;j++){
        var nd=m.addedNodes[j];
        if(nd.nodeType===3){ i18nTransNode(nd, d); }
        else if(nd.nodeType===1){
          if(nd.closest&&nd.closest(".bp-bar,[data-no-i18n]")) continue;
          var w=document.createTreeWalker(nd, NodeFilter.SHOW_TEXT, null), t;
          while((t=w.nextNode())){ i18nTransNode(t, d); }
        }
      }
    }
  });
  _obs.observe(document.body, {childList:true, subtree:true, characterData:true});
}
window.bpSetLang=function(lang){
  if(lang==="en" && !(DICT.en)) return;          /* en deferred — guard */
  try{ localStorage.setItem(I18N_KEY,lang); }catch(e){}
  i18nReflect(lang); i18nApply(lang); i18nObserve(lang); navSetLang(lang);
  if(railHandle) railHandle.sync();  /* refresh data-no-i18n rail toggle labels — only where a rail exists */
  document.dispatchEvent(new CustomEvent("bp:langchange",{detail:{lang:lang}}));
  syncThemeRow();
};
function i18nInit(){
  var l='tg'; try{ l=new URLSearchParams(location.search).get('lang')||localStorage.getItem(I18N_KEY)||'tg'; }catch(e){}
  if(l==="en" && !(DICT.en)) l="tg";
  i18nReflect(l); navSetLang(l);
  if(l!=="tg"){ i18nApply(l); i18nObserve(l); }
  document.dispatchEvent(new CustomEvent("bp:langchange",{detail:{lang:l}}));
}
/* run after page inline scripts (which populate dynamic content) have executed */
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", i18nInit); else i18nInit();
})();
