import '../services-data.js';
import { I18N } from './i18n.js';
import { GUEST_CATALOG, initCitizenExpansion } from './citizen-expansion.js';

/* ===================== APP ===================== */
(function(){
"use strict";
const $  = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const motionMq = matchMedia("(prefers-reduced-motion: reduce)");
const reduceMotion = () => motionMq.matches;
const htmlKeys = ["tl.3d"];

/* ---------- language / audience ---------- */
let lang = new URLSearchParams(location.search).get("lang") || "tg";
try { lang = new URLSearchParams(location.search).get("lang") || localStorage.getItem("ekh.preferences.lang") || "tg"; } catch(e){}
if (!["tg", "ru", "en"].includes(lang)) lang = "tg";
let acct = "person";
let expansion = null;
function t(k){
  const d = I18N[lang] || I18N.tg;
  if (d[k] !== undefined) return d[k];
  if (I18N.tg[k] !== undefined) return I18N.tg[k];
  return k;
}
function applyLang(){
  document.documentElement.lang = lang;
  $$("[data-i18n]").forEach(el => {
    const k = el.dataset.i18n, v = t(k);
    if (htmlKeys.includes(k)) el.innerHTML = v; else el.textContent = v;
  });
  $$("[data-i18n-ph]").forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  $$("[data-i18n-aria]").forEach(el => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
  $$("[data-lang][role='option']").forEach(b => b.setAttribute("aria-selected", String(b.dataset.lang === lang)));
  $("#langCur").textContent = {tg:"ТҶ", ru:"РУ", en:"EN"}[lang];
  if (acct === "guest") $("#acctCur").textContent = (COPY_GUEST[lang] || COPY_GUEST.tg).replace(/^./, ch => ch.toUpperCase());
  updateProgLbl();
  if (searchPop.classList.contains("open")) renderSearch(searchInput.value);
  renderCats();
  if (currentCat && !$("#scr-category").hidden) renderCategory(currentCat);
  expansion?.render();
}
/* ---------- header dropdowns (language + account type) ---------- */
function closeDd(dd){
  dd.classList.remove("open");
  const btn = $(".dd-btn", dd);
  btn.setAttribute("aria-expanded", "false");
  const hl = $(".dd-hl", dd);
  if (hl){ hl.style.opacity = "0"; hl.classList.remove("move"); }
  /* don't strand keyboard focus inside a hidden menu */
  if (dd.contains(document.activeElement) && document.activeElement !== btn) btn.focus();
}
function closeAllDd(){ $$(".dd.open").forEach(closeDd); }
$$(".dd").forEach(dd => {
  $(".dd-btn", dd).addEventListener("click", e => {
    e.stopPropagation();
    const willOpen = !dd.classList.contains("open");
    closeAllDd();
    if (willOpen){ dd.classList.add("open"); $(".dd-btn", dd).setAttribute("aria-expanded", "true"); }
  });
});
document.addEventListener("click", closeAllDd);
document.addEventListener("keydown", e => { if (e.key === "Escape") closeAllDd(); });
/* one highlight rect per menu glides between items (jumps in on first hover) */
$$(".dd-menu").forEach(menu => {
  const hl = document.createElement("div");
  hl.className = "dd-hl";
  menu.prepend(hl);
  const place = e => {
    const it = e.target.closest("button[role='option']");
    if (!it || !menu.contains(it)) return;
    hl.classList.toggle("move", hl.style.opacity === "1" && !reduceMotion());
    hl.style.top = it.offsetTop + "px";
    hl.style.height = it.offsetHeight + "px";
    hl.style.opacity = "1";
  };
  menu.addEventListener("mouseover", place);
  menu.addEventListener("focusin", place);
  menu.addEventListener("mouseleave", () => { hl.style.opacity = "0"; hl.classList.remove("move"); });
});
$$('[data-lang][role="option"]').forEach(b => b.addEventListener('click', () => {
  lang = b.dataset.lang;
  try { localStorage.setItem('ekh.preferences.lang', lang); } catch(e){}
  applyLang();
}));
$$("[data-acct]").forEach(b => b.addEventListener("click", () => {
  $$("[data-acct]").forEach(x => x.setAttribute("aria-selected", String(x === b)));
  const cur = $("#acctCur");
  if (b.dataset.acct === "guest"){
    delete cur.dataset.i18n;
    cur.textContent = (COPY_GUEST[lang] || COPY_GUEST.tg).replace(/^./, ch => ch.toUpperCase());
  } else {
    cur.dataset.i18n = "acct." + b.dataset.acct;
    cur.textContent = t("acct." + b.dataset.acct);
  }
  if (b.dataset.acct === acct) return;
  acct = b.dataset.acct;
  document.documentElement.dataset.audience = acct;
  applyAuth();
  expansion?.render();
  renderCats();
  if (!$("#scr-category").hidden){
    if (findGroup(currentCat)) renderCategory(currentCat);
    else go("home");
  }
}));

/* ---------- theme: stored choice wins, else follows the device ---------- */
const THEME_KEY = "ekh.preferences.theme";
const themeMq = matchMedia("(prefers-color-scheme: dark)");
function setTheme(){
  let stored = null;
  try { stored = new URLSearchParams(location.search).get('theme') || localStorage.getItem(THEME_KEY); } catch(e){ /* storage may be blocked */ }
  document.documentElement.dataset.theme = stored || (themeMq.matches ? "dark" : "light");
}
setTheme();
themeMq.addEventListener("change", setTheme);
$("#themeBtn").addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  try { localStorage.setItem(THEME_KEY, next); } catch(e){}
  document.documentElement.dataset.theme = next;
});

/* ---------- mock auth ----------
   Signed out: pitch + search, no personal feed.
   Signed in: no pitch, categories above search, feed visible. */
const AUTH_KEY = "ekh.citizen.auth";
let authed = false;
try { authed = localStorage.getItem(AUTH_KEY) === "1"; } catch(e){ /* storage may be blocked */ }
const loginOverlay = $("#loginOverlay"), loginBtn = $("#loginBtn"), loginPhone = $("#loginPhone");
function applyAuth(){
  const signedIn = authed && acct !== "guest";
  document.documentElement.dataset.auth = signedIn ? "in" : "out";
  document.documentElement.dataset.audience = acct;
  loginBtn.hidden = signedIn;
  $("#bellBtn").hidden = !signedIn;
  $(".avatar").hidden = !signedIn;
  $("#guestAvatar").hidden = acct !== "guest";
  $("#guestStrip").hidden = acct !== "guest";
  $("#feedSect").hidden = !signedIn;
  /* the h1 stays the focus target of go("home"); only its text swaps */
  $("#heroTitle").hidden = signedIn;
  $("#heroHi").hidden = !signedIn;
  $("#heroSub").hidden = signedIn;
  const heroIn = $(".hero-in"), cats = $("#cats"), search = $("#searchWrap");
  if (signedIn) heroIn.insertBefore(cats, search);
  else heroIn.insertBefore(search, cats);
}
let loginLastFocus = null;
let loginDialog = null;
let pendingAction = null; /* what the user was trying to do when sign-in was required */
function requireLogin(fn){ pendingAction = fn; openLogin(); }
function openLogin(){
  loginLastFocus = document.activeElement;
  const sub = $('#loginOverlay .sub');
  if (sub) sub.textContent = acct === 'guest'
    ? ({ tg:'Барои кушодани кабинети шахсӣ ворид шавед. Реҷаи меҳмон маълумоти шахсиро нишон намедиҳад.', ru:'Войдите, чтобы открыть личный кабинет. Гостевой режим не показывает персональные данные.', en:'Sign in to open your personal cabinet. Guest mode does not show personal data.' }[lang])
    : t('auth.sub');
  loginDialog = window.EKHDialog?.openExistingDialog(loginOverlay, { initialFocus:'#loginPhone', trigger:loginLastFocus }) || null;
  if (!loginDialog) { loginOverlay.classList.add('open'); loginPhone.focus(); }
}
function closeLogin(){
  pendingAction = null;
  if (loginDialog) { loginDialog.close(); loginDialog = null; }
  else { loginOverlay.classList.remove('open'); if (loginLastFocus && !loginLastFocus.hidden) loginLastFocus.focus(); }
}
/* after signing in the trigger button is gone — hand focus to the visible screen's heading */
function focusScreenHeading(){
  const scr = $$(".screen").find(s => !s.hidden);
  const h = scr && scr.querySelector("h1, h2");
  if (h){ h.setAttribute("tabindex", "-1"); h.focus({ preventScroll:true }); }
}
loginBtn.addEventListener("click", openLogin);
$("#guestAvatar").addEventListener("click", openLogin);
$("#loginCancel").addEventListener("click", closeLogin);
loginOverlay.addEventListener("click", e => { if (e.target === loginOverlay) closeLogin(); });
loginPhone.addEventListener("keydown", e => { if (e.key === "Enter") $("#loginGo").click(); });
$("#loginGo").addEventListener("click", () => {
  authed = true;
  if (acct === "guest"){
    acct = "person";
    $$('[data-acct]').forEach(x => x.setAttribute('aria-selected', String(x.dataset.acct === 'person')));
    $("#acctCur").dataset.i18n = "acct.person";
    $("#acctCur").textContent = t("acct.person");
    renderCats();
  }
  try { localStorage.setItem(AUTH_KEY, "1"); } catch(e){}
  loginPhone.value = "";
  applyAuth();
  if (loginDialog) { loginDialog.close(); loginDialog = null; }
  else loginOverlay.classList.remove('open');
  toast("toast.hi");
  const after = pendingAction;
  pendingAction = null;
  if (after) after();
  else focusScreenHeading();
});
$("#logoutBtn").addEventListener("click", () => {
  authed = false;
  try { localStorage.setItem(AUTH_KEY, "0"); } catch(e){}
  applyAuth();
  go("home");
  toast("toast.bye");
});

/* ---------- navigation ---------- */
const SCREENS = { home:"scr-home", category:"scr-category", journey:"scr-journey",
                  emergency:"scr-emergency", profile:"scr-profile", notifs:"scr-notifs", guestService:"scr-guest-service" };
const PERSONAL = ["profile", "wallet", "tracking", "notifs", "journey"];
function go(name, own){
  /* personal screens ask for sign-in first, then continue where the user was headed */
  if ((!authed || acct === "guest") && PERSONAL.includes(name)){ requireLogin(() => go(name, own)); return; }
  if (name === "guestService") expansion?.resetGuestFlow();
  if (name === "wallet" || name === "tracking"){ /* panes inside the profile since the cabinet layout */
    selectPane(name === "wallet" ? "docs" : "apps");
    if (own) applyFilter(own);
    name = "profile";
  }
  const id = SCREENS[name]; if (!id) return;
  $$(".screen").forEach(s => { s.hidden = s.id !== id; });
  const scr = $("#" + id);
  if (!reduceMotion()){
    scr.classList.remove("enter"); void scr.offsetWidth;
    scr.classList.add("enter");
    scr.addEventListener("animationend", () => scr.classList.remove("enter"), { once:true });
  }
  window.scrollTo({ top:0, left:0, behavior:"instant" });
  const h = scr.querySelector("h1, h2");
  if (h){ h.setAttribute("tabindex", "-1"); h.focus({ preventScroll:true }); }
  closeSearch();
}

/* ---------- service catalogue (services-data.js, official registry) ---------- */
const CATALOG = { ...(window.EKHIZMAT_DATA || { person:[], biz:[] }), guest:GUEST_CATALOG };
const CAT_ICONS = {
  docs:"i-cat-passport", family:"i-cat-family", edu:"i-cat-edu", health:"i-cat-health",
  transport:"i-cat-transport", land:"i-cat-land", tax:"i-cat-tax", justice:"i-cat-justice",
  certs:"i-cat-cert", culture:"i-cat-culture", gov:"i-cat-gov", other:"i-cat-other",
  license:"i-cat-license", accred:"i-cat-accred"
};
/* each category tile gets its own hue and silhouette */
const CAT_TILES = {
  docs:"t-blue", family:"t-rose sh-c", edu:"t-amber sh-r", health:"t-green sh-c",
  transport:"t-indigo", land:"t-terra sh-r", tax:"t-violet", justice:"t-slate sh-c",
  certs:"t-teal sh-r", culture:"t-pink sh-l", gov:"t-steel", other:"t-gray sh-c",
  license:"t-cyan sh-r", accred:"t-olive"
};
const COPY_GUEST = { tg:"меҳмон", ru:"гость", en:"guest" };
let currentCat = null;
let payFilter = "all";
function esc(s){ return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function findGroup(id){ return CATALOG[acct].find(g => g.id === id); }
function groupTotal(g){ return g.subs.reduce((a, s) => a + s.items.length, 0); }
/* item: [name_tg, org_tg, flags, name_ru, org_ru] - the registry has no English, so ru/en show the Russian text */
function svcName(it){ return (lang !== "tg" && it[3]) || it[0]; }
function svcOrg(it){ return (lang !== "tg" && it[4]) || it[1]; }
function paySel(it){ return payFilter === "all" || ((it[2] & 4) ? "paid" : "free") === payFilter; }
function renderCats(){
  $("#cats").innerHTML = CATALOG[acct].map(g =>
    '<button class="cat" data-cat="' + g.id + '">' +
      '<span class="tile ' + (CAT_TILES[g.id] || "t-gray") + '"><svg><use href="/design-system/assets/icons.svg#' + (CAT_ICONS[g.id] || "i-cat-other") + '"/></svg></span>' +
      '<span>' + esc((g.chip && g.chip[lang]) || g.label[lang]) + '</span>' +
    '</button>').join("");
}
function svcRow(it){
  const paid = it[2] & 4;
  const action = it[5] === "guest-appointment" ? ' data-go="guestService"' : ' data-toast="toast.demo"';
  const guestBadge = acct === "guest" ? '<span class="audience-badge audience-badge--guest">' + t("meta.free") + ' · ' + ((COPY_GUEST[lang]) || COPY_GUEST.tg) + '</span>' : '';
  return '<button class="svc-row"' + action + '>' +
    '<span class="tt"><b>' + esc(svcName(it)) + '</b><span class="org">' + esc(svcOrg(it)) + '</span></span>' +
    guestBadge + '<span class="tag' + (paid ? ' pay' : '') + '">' + t(paid ? "meta.paid" : "meta.free") + '</span>' +
  '</button>';
}
function renderCatList(){
  const g = findGroup(currentCat); if (!g) return;
  const q = $("#cpSearch").value.trim().toLowerCase();
  let html = "", shown = 0;
  g.subs.forEach(s => {
    const items = s.items.filter(it =>
      paySel(it) && (!q || (svcName(it) + " " + svcOrg(it)).toLowerCase().includes(q)));
    if (!items.length) return;
    if (s.label) html += '<h3 class="svc-sub">' + esc(s.label[lang]) + '</h3>';
    html += '<div class="rows">' + items.map(svcRow).join("") + '</div>';
    shown += items.length;
  });
  $("#cpList").innerHTML = html;
  $("#cpEmpty").hidden = shown > 0;
  $("#cpCount").textContent = (q || payFilter !== "all")
    ? t("cp.found").replace("{n}", shown)
    : t("cp.count").replace("{n}", groupTotal(g));
}
function renderCategory(id){
  const g = findGroup(id); if (!g) return false;
  currentCat = id;
  $("#cpTitle").textContent = g.label[lang];
  /* "popular" pills: the shortest names read as the most common everyday services */
  const pop = g.subs.flatMap(s => s.items).sort((a, b) => svcName(a).length - svcName(b).length).slice(0, 3);
  $("#cpPills").innerHTML = '<span class="plabel"><svg aria-hidden="true"><use href="/design-system/assets/icons.svg#i-fire"/></svg>' + t("cp.popular") + '</span>' +
    pop.map(it => '<button class="pill">' + esc(svcName(it)) + '</button>').join("");
  renderCatList();
  return true;
}
function setPay(val){
  payFilter = val;
  $$("#cpFilters .chip").forEach(c => c.setAttribute("aria-pressed", String(c.dataset.pay === val)));
}
function openCat(id){
  $("#cpSearch").value = "";
  setPay("all");
  if (renderCategory(id)) go("category");
}
$("#cpSearch").addEventListener("input", renderCatList);
$("#cpPills").addEventListener("click", e => {
  const p = e.target.closest(".pill"); if (!p) return;
  $("#cpSearch").value = p.textContent;
  renderCatList();
});

/* ---------- delegated clicks ---------- */
/* ---------- "for you" feed tabs ---------- */
const FPANES = { notif:"fpane-notif", apps:"fpane-apps", pay:"fpane-pay" };
function feedTab(id){
  $$(".ftab").forEach(b => {
    const on = b.dataset.ftab === id;
    b.setAttribute("aria-selected", String(on));
    b.tabIndex = on ? 0 : -1; /* roving tabindex per the tabs pattern */
  });
  Object.entries(FPANES).forEach(([k, pid]) => { const p = $("#" + pid); if (p) p.hidden = k !== id; });
}
/* arrow keys move between feed tabs */
$$(".ftabs").forEach(list => list.addEventListener("keydown", e => {
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  const tabs = $$(".ftab", list);
  const cur = tabs.findIndex(b => b.getAttribute("aria-selected") === "true");
  const next = (cur + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
  e.preventDefault();
  feedTab(tabs[next].dataset.ftab);
  tabs[next].focus();
}));

document.addEventListener("click", e => {
  const fTab = e.target.closest("[data-ftab]");
  if (fTab){ feedTab(fTab.dataset.ftab); return; }
  const goBtn = e.target.closest("[data-go]");
  if (goBtn){ go(goBtn.dataset.go, goBtn.dataset.own); return; }
  const catBtn = e.target.closest("[data-cat]");
  if (catBtn){ openCat(catBtn.dataset.cat); return; }
  const payBtn = e.target.closest("[data-pay]");
  if (payBtn){ setPay(payBtn.dataset.pay); renderCatList(); return; }
  const tBtn = e.target.closest("[data-toast]");
  if (tBtn){ toast(tBtn.dataset.toast); return; }
  const back = e.target.closest("[data-jback]");
  if (back){ jstep(Number(back.dataset.jback)); return; }
  const qrBtn = e.target.closest("[data-qr]");
  if (qrBtn){ openQr(qrBtn.dataset.qr); return; }
  const docCard = e.target.closest("#docGrid .doc");
  if (docCard){ openDocumentDetail(docCard.dataset.docId); return; }
  const chip = e.target.closest(".filters .chip");
  if (chip){ applyFilter(chip.dataset.own); return; }
  if (!e.target.closest("#searchWrap")) closeSearch();
});
$("#bellBtn").addEventListener("click", () => go("notifs"));

/* ---------- journey ---------- */
let step = 1;
const childName = $("#childName"), toStep2 = $("#toStep2"), toStep3 = $("#toStep3"),
      consent = $("#consent"), submitAll = $("#submitAll");
function updateProgLbl(){
  $("#jprogLbl").textContent = t("j.step").replace("{n}", step);
}
function jstep(n){
  step = n;
  for (let i = 1; i <= 4; i++) $("#jstep-" + i).hidden = i !== n;
  $$("#jprog .st").forEach((s, i) => s.classList.toggle("on", i < n));
  $$("#jprog .bar").forEach((b, i) => b.classList.toggle("on", i < n - 1));
  updateProgLbl();
  const h = $("#jstep-" + n + " h2");
  if (h && !$("#scr-journey").hidden){ h.setAttribute("tabindex", "-1"); h.focus({ preventScroll:true }); }
  window.scrollTo({ top:0, left:0, behavior:"instant" });
}
childName.addEventListener("input", () => {
  toStep2.disabled = childName.value.trim().length < 2;
});
toStep2.addEventListener("click", () => jstep(2));
const svcBoxes = ["#svc1", "#svc2", "#svc3"].map(s => $(s));
svcBoxes.forEach(b => b.addEventListener("change", () => {
  toStep3.disabled = !svcBoxes.some(x => x.checked);
}));
function childFullName(){
  const fem = ($('input[name="sex"]:checked') || {}).value !== "m";
  const sur = lang === "en" ? (fem ? "Rahimova" : "Rahimov")
            : lang === "ru" ? (fem ? "Рахимова" : "Рахимов")
                            : (fem ? "Раҳимова" : "Раҳимов");
  return childName.value.trim() + " " + sur;
}
toStep3.addEventListener("click", () => {
  $("#rvName").textContent = childFullName();
  $("#rvSvc").textContent = String(svcBoxes.filter(b => b.checked).length);
  jstep(3);
});
consent.addEventListener("change", () => { submitAll.disabled = !consent.checked; });
submitAll.addEventListener("click", () => {
  const dB = $("#docBirth");
  delete dB.dataset.locked;
  $("#docBirthName").textContent = childFullName();
  expansion?.completeBabyJourney(childFullName());
  jstep(4);
});

/* ---------- wallet ---------- */
const docBirth = $("#docBirth"), docTemp = $("#docTemp");
docBirth.dataset.locked = "1";
docTemp.dataset.locked = "1";
function applyFilter(own){
  $$(".filters .chip").forEach(c => c.setAttribute("aria-pressed", String(c.dataset.own === own)));
  let visible = 0;
  $$("#docGrid .doc").forEach(d => {
    const show = d.dataset.locked !== "1" && d.dataset.owner === own;
    d.hidden = !show;
    if (show) visible++;
  });
  const visibleFiles = expansion?.setOwner(own) || 0;
  $("#walletEmpty").hidden = visible > 0 || visibleFiles > 0;
}

/* ---------- emergency ---------- */
$("#emergStart").addEventListener("click", () => {
  const issue = () => {
    delete docTemp.dataset.locked;
    toast("toast.temp");
    go("wallet", "me");
  };
  if (authed) issue(); else requireLogin(issue);
});

/* ---------- profile ---------- */
function selectPane(key){
  $$(".pn").forEach(b => b.setAttribute("aria-current", String(b.dataset.pane === key)));
  $$(".pane").forEach(p => { p.hidden = p.id !== "pane-" + key; });
  const pane = $("#pane-" + key);
  if (!pane || reduceMotion()) return;
  pane.classList.remove("enter"); void pane.offsetWidth;
  pane.classList.add("enter");
  pane.addEventListener("animationend", () => pane.classList.remove("enter"), { once:true });
}
$$(".pn").forEach(btn => btn.addEventListener("click", () => selectPane(btn.dataset.pane)));
$$(".sw input").forEach(sw => sw.addEventListener("change", () => toast("toast.saved")));
$("#devOut").addEventListener("click", () => { $("#devRow2").remove(); toast("toast.out"); });
$("#revokeBtn").addEventListener("click", () => {
  $("#revokeBtn").hidden = true;
  $("#revokedTag").hidden = false;
  toast("toast.revoked");
});

/* ---------- session-only profile photo ---------- */
const photoOverlay=$("#profilePhotoOverlay"),photoInput=$("#profilePhotoInput"),photoError=$("#profilePhotoError"),photoSave=$("#profilePhotoSave");
let activePhotoUrl=null,pendingPhotoUrl=null,photoDialog=null;
function paintAvatar(root,url){const img=$(".avatar-image",root),fallback=$(".avatar-fallback",root);if(!img||!fallback)return;img.hidden=!url;fallback.hidden=Boolean(url);if(url)img.src=url;else img.removeAttribute('src');}
function paintAllAvatars(url){$$('.profile-avatar,.profile-photo-trigger,#profilePhotoPreview').forEach(root=>paintAvatar(root,url));}
function closePhoto(){if(pendingPhotoUrl&&pendingPhotoUrl!==activePhotoUrl)URL.revokeObjectURL(pendingPhotoUrl);pendingPhotoUrl=null;if(photoDialog){photoDialog.close();photoDialog=null;}else{photoOverlay.classList.remove('open');$("#profilePhotoTrigger").focus();}}
function openPhoto(){photoInput.value='';photoError.hidden=true;photoSave.disabled=true;pendingPhotoUrl=null;paintAvatar($("#profilePhotoPreview"),activePhotoUrl);$("#profilePhotoRemove").disabled=!activePhotoUrl;photoDialog=window.EKHDialog?.openExistingDialog(photoOverlay,{initialFocus:'#profilePhotoCancel',trigger:$("#profilePhotoTrigger")})||null;if(!photoDialog){photoOverlay.classList.add('open');$("#profilePhotoCancel").focus();}}
$("#profilePhotoTrigger").addEventListener('click',openPhoto);
photoInput.addEventListener('change',()=>{const file=photoInput.files?.[0];photoError.hidden=true;photoSave.disabled=true;if(pendingPhotoUrl&&pendingPhotoUrl!==activePhotoUrl)URL.revokeObjectURL(pendingPhotoUrl);pendingPhotoUrl=null;if(!file)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type)){photoError.textContent=t('p.photo.type');photoError.hidden=false;return;}if(file.size>5*1024*1024){photoError.textContent=t('p.photo.size');photoError.hidden=false;return;}pendingPhotoUrl=URL.createObjectURL(file);paintAvatar($("#profilePhotoPreview"),pendingPhotoUrl);photoSave.disabled=false;});
$("#profilePhotoForm").addEventListener('submit',e=>{e.preventDefault();if(!pendingPhotoUrl)return;if(activePhotoUrl)URL.revokeObjectURL(activePhotoUrl);activePhotoUrl=pendingPhotoUrl;pendingPhotoUrl=null;paintAllAvatars(activePhotoUrl);closePhoto();});
$("#profilePhotoRemove").addEventListener('click',()=>{if(activePhotoUrl)URL.revokeObjectURL(activePhotoUrl);activePhotoUrl=null;paintAllAvatars(null);closePhoto();});
$("#profilePhotoCancel").addEventListener('click',closePhoto);
photoOverlay.addEventListener('click',e=>{if(e.target===photoOverlay)closePhoto();});

/* ---------- document detail viewer ---------- */
const documentOverlay=$("#documentDetailOverlay"),documentRoot=$("#documentDetailRoot");
const DOCUMENTS={
  passport:{titleKey:'d.pass.k',number:'Т 4018236',issuedBy:{tg:'ВКД Ҷумҳурии Тоҷикистон',ru:'МВД Республики Таджикистан',en:'Ministry of Internal Affairs'},issuedAt:'14.10.2016',validUntil:'14.10.2026',sourceKey:'p.src.mvd',pages:['front','back']},
  birth:{titleKey:'d.birth.k',number:'СТ 0931184',issuedBy:{tg:'САҲШ-и ноҳияи Сино',ru:'ЗАГС района Сино',en:'Sino Civil Registry'},issuedAt:'12.08.2026',validUntil:'—',sourceKey:'p.src.zags',pages:['front']},
  tax:{titleKey:'d.inn.k',number:'6404 1893 0021',issuedBy:{tg:'Кумитаи андоз',ru:'Налоговый комитет',en:'Tax Committee'},issuedAt:'19.03.2012',validUntil:'—',sourceKey:'p.src.tax',pages:['front']},
  driver:{titleKey:'d.drv.k',number:'AB 552901',issuedBy:{tg:'БДА',ru:'ГАИ',en:'Traffic Police'},issuedAt:'03.03.2019',validUntil:'03.03.2029',sourceKey:'p.src.bdd',pages:['front']},
  temporary:{titleKey:'d.temp.k',number:'ВМ 110476',issuedBy:{tg:'ВКД Ҷумҳурии Тоҷикистон',ru:'МВД Республики Таджикистан',en:'Ministry of Internal Affairs'},issuedAt:'12.08.2026',validUntil:'11.09.2026',sourceKey:'p.src.mvd',pages:['front']}
};
let detailDialog=null,detailLastFocus=null,currentDocument=null;
function documentPage(doc,side){
  return `<figure class="document-page"><span class="document-page__side">${t(side==='back'?'d.detail.back':'d.detail.front')}</span><svg aria-hidden="true"><use href="/design-system/assets/icons.svg#i-girih-tile"/></svg><div><small>eKhizmat · TJ</small><strong>${t(doc.titleKey)}</strong><span>Фируза Раҳимова</span><b>${doc.number}</b></div></figure>`;
}
function openDocumentDetail(id,received){
  const doc=received?{titleKey:'d.birth.k',rawTitle:received.title,number:received.format,issuedBy:{tg:received.meta,ru:received.meta,en:received.meta},issuedAt:'12.08.2026',validUntil:'—',sourceKey:'p.src.zags',pages:['front'],file:received}:DOCUMENTS[id];
  if(!doc)return;currentDocument=doc;detailLastFocus=document.activeElement;
  const title=doc.rawTitle||t(doc.titleKey),issuer=doc.issuedBy[lang]||doc.issuedBy.ru;
  documentRoot.innerHTML=`<div class="document-detail-head"><div><span class="eyebrow">eKhizmat Wallet</span><h3 id="documentDetailH">${title}</h3><p>${doc.number}</p></div><span class="src-tag"><svg><use href="/design-system/assets/icons.svg#i-check"/></svg>${t('d.detail.verified')} · ${t(doc.sourceKey)}</span></div><div class="document-viewer ${doc.pages.length>1?'document-viewer--two':''}">${doc.pages.map(side=>documentPage(doc,side)).join('')}</div><div class="document-meta"><div><span>${t('d.detail.issuedBy')}</span><strong>${issuer}</strong></div><div><span>${t('d.detail.issuedAt')}</span><strong>${doc.issuedAt}</strong></div><div><span>${t('d.detail.validUntil')}</span><strong>${doc.validUntil}</strong></div></div><div class="document-actions"><button class="btn btn-sec" data-detail-qr="${doc.titleKey}"><svg><use href="/design-system/assets/icons.svg#i-qr"/></svg>${t('d.detail.qr')}</button><button class="btn btn-sec" data-detail-download><svg><use href="/design-system/assets/icons.svg#i-download"/></svg>${t('d.detail.pdf')}</button><button class="btn btn-ghost" data-detail-share="${doc.titleKey}">${t('d.detail.share')}</button></div>`;
  detailDialog=window.EKHDialog?.openExistingDialog(documentOverlay,{initialFocus:'#documentDetailClose',trigger:detailLastFocus})||null;
  if(!detailDialog){documentOverlay.classList.add('open');$("#documentDetailClose").focus();}
}
function closeDocumentDetail(){if(detailDialog){detailDialog.close();detailDialog=null;}else{documentOverlay.classList.remove('open');detailLastFocus?.focus();}}
function downloadDemoPdf(name,lines){const blob=new Blob([lines.join('\n')],{type:'application/pdf'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${name.replace(/[^a-zA-Z0-9_-]+/g,'-')||'document'}.pdf`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$("#documentDetailClose").addEventListener('click',closeDocumentDetail);
documentOverlay.addEventListener('click',e=>{if(e.target===documentOverlay)closeDocumentDetail();const qr=e.target.closest('[data-detail-qr],[data-detail-share]');if(qr){const key=qr.dataset.detailQr||qr.dataset.detailShare;closeDocumentDetail();openQr(key,detailLastFocus);}if(e.target.closest('[data-detail-download]')&&currentDocument)downloadDemoPdf(currentDocument.number,[currentDocument.rawTitle||t(currentDocument.titleKey),currentDocument.number,currentDocument.issuedAt]);});

/* ---------- QR modal ---------- */
const qrOverlay = $("#qrOverlay"), qrSvg = $("#qrSvg");
let lastFocus = null;
let qrDialog = null;
function seeded(str){
  let h = 2166136261;
  for (let i = 0; i < str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return function(){ h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) / 4294967296); };
}
function renderQr(svg,key){
  const N = 29, rnd = seeded(key), m = [];
  for (let y = 0; y < N; y++){ m[y] = []; for (let x = 0; x < N; x++) m[y][x] = 0; }
  function finder(fx, fy){
    for (let y = -1; y <= 7; y++) for (let x = -1; x <= 7; x++){
      const X = fx + x, Y = fy + y;
      if (X < 0 || Y < 0 || X >= N || Y >= N) continue;
      const ring = (x >= 0 && x <= 6 && y >= 0 && y <= 6) &&
                   (x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4));
      m[Y][X] = ring ? 1 : 0;
    }
  }
  /* mark reserved zones first so noise never enters them */
  const reserved = (x, y) =>
    (x <= 7 && y <= 7) || (x >= N - 8 && y <= 7) || (x <= 7 && y >= N - 8);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++)
      if (!reserved(x, y)){
        if (x === 6 || y === 6) m[y][x] = (x + y) % 2 === 0 ? 1 : 0;  /* timing */
        else m[y][x] = rnd() < 0.46 ? 1 : 0;
      }
  finder(0, 0); finder(N - 7, 0); finder(0, N - 7);
  let rects = "";
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++)
      if (m[y][x] === 1) rects += '<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="currentColor"/>';
  svg.innerHTML = rects;
}
function openQr(key,trigger){
  $("#qrDocName").textContent = t(key);
  renderQr(qrSvg,key);
  lastFocus = trigger || document.activeElement;
  qrDialog = window.EKHDialog?.openExistingDialog(qrOverlay, { initialFocus:'#qrClose', trigger:lastFocus }) || null;
  if (!qrDialog) { qrOverlay.classList.add('open'); $('#qrClose').focus(); }
}
function closeQr(){
  if (qrDialog) { qrDialog.close(); qrDialog = null; }
  else { qrOverlay.classList.remove('open'); if (lastFocus) lastFocus.focus(); }
}
$("#qrClose").addEventListener("click", closeQr);
qrOverlay.addEventListener("click", e => { if (e.target === qrOverlay) closeQr(); });
/* keep Tab inside a dialog while it is open */
function trapTab(overlay){
  overlay.addEventListener("keydown", e => {
    if (e.key !== "Tab") return;
    const focusables = $$("button, [href], input, [tabindex]:not([tabindex='-1'])", overlay)
      .filter(el => !el.disabled && el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
  });
}
trapTab(qrOverlay);
trapTab(loginOverlay);

/* ---------- toast ---------- */
const toastEl = $("#toast");
let toastTimer = null;
function toast(key){
  toastEl.textContent = t(key);
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2600);
}
function toastText(message){
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2600);
}

/* ---------- search with intent recognition ---------- */
const searchInput = $("#searchInput"), searchPop = $("#searchPop"), searchItems = $("#searchItems");
const INTENTS = [
  { icon:"i-baby",   act:{ type:"go", target:"journey" },
    kw:"таваллуд кудак кӯдак фарзанд шаҳодатнома ребенок ребёнок родился рождение свидетельство малыш baby born birth certificate child",
    label:{ tg:"Фарзанддор шудам - ҳуҷҷатҳои кӯдак", ru:"Родился ребёнок - документы малыша", en:"I just had a baby - child documents" },
    meta:{ tg:"5 дақиқа - ройгон", ru:"5 минут - бесплатно", en:"5 minutes - free" } },
  { icon:"i-doc",    act:{ type:"toast" },
    kw:"шиноснома нав кардан паспорт обновить продлить заграничный passport renew id",
    label:{ tg:"Нав кардани шиноснома", ru:"Обновить паспорт", en:"Renew my passport" },
    meta:{ tg:"8 дақиқа", ru:"8 минут", en:"8 minutes" } },
  { icon:"i-biz",    act:{ type:"toast" },
    kw:"тиҷорат тичорат соҳибкор сабт бизнес ип ооо регистрация открыть фирма business register company startup sole proprietor",
    label:{ tg:"Кушодани тиҷорат", ru:"Открыть бизнес", en:"Start a business" },
    meta:{ tg:"то 20 дақиқа", ru:"до 20 минут", en:"up to 20 minutes" } },
  { icon:"i-rings",  act:{ type:"toast" },
    kw:"издивоҷ никоҳ туй брак загс жениться замуж свадьба marriage marry wedding",
    label:{ tg:"Издивоҷ - ариза ба САҲШ", ru:"Вступить в брак - заявление в ЗАГС", en:"Get married - registry application" },
    meta:{ tg:"10 дақиқа", ru:"10 минут", en:"10 minutes" } },
  { icon:"i-wallet", act:{ type:"go", target:"wallet" },
    kw:"ҳамён хамён ҳуҷҷат хуччат кошелек кошелёк документы мои wallet documents my papers",
    label:{ tg:"Ҳамёни ҳуҷҷатҳо", ru:"Документы", en:"Document wallet" },
    meta:{ tg:"ҳамааш дар як ҷо", ru:"всё в одном месте", en:"all in one place" } },
  { icon:"i-shield", act:{ type:"go", target:"emergency" },
    kw:"гум дузд дуздида шуд ҳуҷҷат ҳуҷҷатҳо украли потерял пропали кража документ документы stolen lost emergency documents помощь",
    label:{ tg:"Ҳуҷҷатҳо гум шуданд - реҷаи фаврӣ", ru:"Документы пропали - экстренный режим", en:"Lost documents - emergency mode" },
    meta:{ tg:"тақрибан 10 дақиқа", ru:"около 10 минут", en:"about 10 minutes" } },
  { icon:"i-check",  act:{ type:"toast" },
    kw:"пардохт андоз ҷарима карз қарз оплатить налоги штрафы коммунальные долги pay bills taxes fines utilities",
    label:{ tg:"Пардохти ҳамаи ҳисобҳо", ru:"Оплатить все начисления", en:"Pay all my bills" },
    meta:{ tg:"2 дақиқа", ru:"2 минуты", en:"2 minutes" } }
];
let selIdx = -1, current = [];
function renderSearch(q){
  q = q.trim().toLowerCase();
  if (q.length < 2){ closeSearch(); return; }
  const tokens = q.split(/\s+/);
  current = INTENTS.map(it => {
    const hay = (it.kw + " " + it.label[lang]).toLowerCase();
    const score = tokens.reduce((a, tok) => a + (hay.includes(tok) ? 1 : 0), 0);
    return { it, score };
  }).filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(r => r.it);
  if (!current.length){ closeSearch(); return; }
  selIdx = -1;
  searchItems.innerHTML = current.map((it, i) =>
    '<button class="s-item" id="s-opt-' + i + '" role="option" aria-selected="false" data-idx="' + i + '">' +
      '<svg aria-hidden="true"><use href="/design-system/assets/icons.svg#' + it.icon + '"/></svg>' +
      '<span>' + it.label[lang] + '</span>' +
      '<span class="meta">' + it.meta[lang] + '</span>' +
    '</button>').join("");
  searchPop.classList.add("open");
  searchInput.setAttribute("aria-expanded", "true");
}
/* visual highlight + SR announcement for the active option */
function markSel(items){
  items.forEach((el, i) => {
    el.classList.toggle("sel", i === selIdx);
    el.setAttribute("aria-selected", String(i === selIdx));
  });
  if (selIdx >= 0) searchInput.setAttribute("aria-activedescendant", "s-opt-" + selIdx);
  else searchInput.removeAttribute("aria-activedescendant");
}
function closeSearch(){
  searchPop.classList.remove("open");
  searchInput.setAttribute("aria-expanded", "false");
  searchInput.removeAttribute("aria-activedescendant");
  selIdx = -1;
}
function pick(i){
  const it = current[i]; if (!it) return;
  closeSearch();
  searchInput.value = "";
  if (it.act.type === "go") go(it.act.target);
  else toast("toast.demo");
}
searchInput.addEventListener("input", () => renderSearch(searchInput.value));
searchInput.addEventListener("keydown", e => {
  const items = $$(".s-item", searchItems);
  if (e.key === "ArrowDown" || e.key === "ArrowUp"){
    if (!items.length) return;
    e.preventDefault();
    selIdx = e.key === "ArrowDown"
      ? (selIdx + 1) % items.length
      : (selIdx - 1 + items.length) % items.length;
    markSel(items);
  } else if (e.key === "Enter"){
    if (items.length){ e.preventDefault(); pick(selIdx >= 0 ? selIdx : 0); }
  } else if (e.key === "Escape"){
    closeSearch(); searchInput.blur();
  }
});
searchItems.addEventListener("click", e => {
  const b = e.target.closest(".s-item");
  if (b) pick(Number(b.dataset.idx));
});
$("#searchGo").addEventListener("click", () => {
  if (searchInput.value.trim().length >= 2) renderSearch(searchInput.value);
  else toast("toast.demo");
  searchInput.focus();
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && qrOverlay.classList.contains("open")){ closeQr(); return; }
  if (e.key === "Escape" && loginOverlay.classList.contains("open")){ closeLogin(); return; }
  if (e.key === "Escape" && searchPop.classList.contains("open")){ closeSearch(); searchInput.focus(); return; }
  if (qrOverlay.classList.contains("open") || loginOverlay.classList.contains("open")) return; /* shortcuts stay inside the dialog */
  if (e.key === "/" && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)){
    e.preventDefault(); searchInput.focus();
  }
});

/* ---------- init ---------- */
expansion = initCitizenExpansion({
  getLang:() => lang,
  getAccount:() => acct,
  getAuthed:() => authed,
  openLogin,
  go,
  toastText,
  renderQr,
  openReceivedFile:file=>openDocumentDetail(file.id,file)
});
applyAuth();
applyLang();
jstep(1);
applyFilter("me");
feedTab("notif");
})();
