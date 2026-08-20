import '../services-data.js';
import { I18N } from './i18n.js';
import { GUEST_CATALOG, initCitizenExpansion } from './citizen-expansion.js';
import { presentAtLoginScale } from '/design-system/js/login-scale.js';

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
  /* a status glyph needs the same string in its tooltip as in its accessible name */
  $$("[data-i18n-title]").forEach(el => { el.title = t(el.dataset.i18nTitle); });
  $$("[data-lang][role='option']").forEach(b => b.setAttribute("aria-selected", String(b.dataset.lang === lang)));
  /* the popover row is "label + current value + chevron" — the value is the language's own name */
  $("#langCur").textContent = {tg:"Тоҷикӣ", ru:"Русский", en:"English"}[lang];
  if (acct === "guest") $("#acctCur").textContent = (COPY_GUEST[lang] || COPY_GUEST.tg).replace(/^./, ch => ch.toUpperCase());
  if (searchPop.classList.contains("open")) renderSearch(searchInput.value);
  renderCats();
  if (currentCat && !$("#scr-category").hidden) renderCategory(currentCat);
  expansion?.render();
  if (loginOverlay.classList.contains('open') || loginOverlay.classList.contains('is-open')) paintLoginStep();
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
/* Escape closes the top layer only: an open flyout first, the popover second */
document.addEventListener("keydown", e => { if (e.key === "Escape" && profilePop.hidden) closeAllDd(); });
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
  /* switching to guest while inside the cabinet: the personal route is gone, go home */
  if (needsAuth(currentRoute)){ navigate("#/", { replace:true }); return; }
  if (currentRoute.screen === "category"){
    if (findGroup(currentCat)) renderCategory(currentCat);
    else navigate("#/", { replace:true });
  }
}));

/* ---------- theme: system / light / dark, chosen in the profile popover (§3) ---------- */
const THEME_KEY = "ekh.preferences.theme";
const themeMq = matchMedia("(prefers-color-scheme: dark)");
let themeChoice = "system";
try {
  const stored = new URLSearchParams(location.search).get("theme") || localStorage.getItem(THEME_KEY);
  if (stored === "dark" || stored === "light") themeChoice = stored;
} catch(e){ /* storage may be blocked */ }
function paintTheme(){
  document.documentElement.dataset.theme = themeChoice === "system" ? (themeMq.matches ? "dark" : "light") : themeChoice;
  $$("[data-theme-choice]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.themeChoice === themeChoice)));
}
function setTheme(choice){
  if (!["system", "light", "dark"].includes(choice)) return;
  themeChoice = choice;
  /* only an explicit click persists — a demo ?theme= never overwrites the preference */
  try {
    if (choice === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, choice);
  } catch(e){}
  paintTheme();
}
paintTheme();
themeMq.addEventListener("change", () => { if (themeChoice === "system") paintTheme(); });

/* ---------- mock auth ----------
   Signed out: pitch + search, no personal feed.
   Signed in: no pitch, categories above search, feed visible. */
const AUTH_KEY = "ekh.citizen.auth";
let authed = false;
try { authed = localStorage.getItem(AUTH_KEY) === "1"; } catch(e){ /* storage may be blocked */ }
const loginOverlay = $("#loginOverlay"), loginBtn = $("#loginBtn"), loginPhone = $("#loginPhone");
const loginScale = $("#loginScale"), loginBody = $("#loginBody"), loginForm = $("#loginForm");
const GUEST_LOGIN_HINT = {
  tg:'Барои кушодани кабинети шахсӣ ворид шавед. Реҷаи меҳмон маълумоти шахсиро нишон намедиҳад.',
  ru:'Войдите, чтобы открыть личный кабинет. Гостевой режим не показывает персональные данные.',
  en:'Sign in to open your personal cabinet. Guest mode does not show personal data.',
};
let loginStep = 0; /* 0 phone · 1 OTP */
let loginOtpCells = [];
function applyAuth(){
  const isIn = authed && acct !== "guest";
  document.documentElement.dataset.auth = isIn ? "in" : "out";
  document.documentElement.dataset.audience = acct;
  loginBtn.hidden = isIn;
  $("#bellBtn").hidden = !isIn;
  $("#profileTrigger").hidden = !isIn;
  $("#guestAvatar").hidden = acct !== "guest";
  $("#guestStrip").hidden = acct !== "guest";
  $("#feedSect").hidden = !isIn;
  /* the h1 stays the focus target of go("home"); only its text swaps */
  $("#heroTitle").hidden = isIn;
  $("#heroHi").hidden = !isIn;
  $("#heroSub").hidden = isIn;
  const heroIn = $(".hero-in"), cats = $("#cats"), search = $("#searchWrap");
  if (isIn) heroIn.insertBefore(cats, search);
  else heroIn.insertBefore(search, cats);
  syncProfilePop();
}
let loginLastFocus = null;
let loginDialog = null;
let pendingAction = null; /* what the user was trying to do when sign-in was required */
function requireLogin(fn){ pendingAction = fn; openLogin(); }
function setPortalBlur(on){
  $$("header, main").forEach(el => el.classList.toggle("is-blurred", on));
}
function fitLoginScale(){ presentAtLoginScale(loginScale, loginBody); }
function loginOtpValue(){ return loginOtpCells.map(cell => cell.value).join(""); }
function paintLoginOtpLabels(){
  loginOtpCells.forEach((cell, i) => {
    cell.setAttribute("aria-label", t("auth.otpDigit").replace("{n}", String(i + 1)));
  });
}
function buildLoginOtp(){
  const host = $("#loginOtp");
  if (!host || host.children.length) {
    loginOtpCells = $$(".otp__cell", host);
    paintLoginOtpLabels();
    return;
  }
  loginOtpCells = Array.from({ length: 6 }, (_, i) => {
    const cell = document.createElement("input");
    cell.className = "otp__cell";
    cell.maxLength = 1;
    cell.inputMode = "numeric";
    cell.autocomplete = i === 0 ? "one-time-code" : "off";
    host.append(cell);
    return cell;
  });
  paintLoginOtpLabels();
  loginOtpCells.forEach((cell, i) => {
    cell.addEventListener("input", () => {
      cell.value = cell.value.replace(/\D/g, "").slice(0, 1);
      if (cell.value && i < 5) loginOtpCells[i + 1].focus();
      if (loginOtpValue().length === 6) loginForm.requestSubmit();
    });
    cell.addEventListener("keydown", e => {
      if (e.key === "Backspace" && !cell.value && i > 0) loginOtpCells[i - 1].focus();
      if (e.key === "ArrowLeft" && i > 0) loginOtpCells[i - 1].focus();
      if (e.key === "ArrowRight" && i < 5) loginOtpCells[i + 1].focus();
    });
    cell.addEventListener("paste", e => {
      e.preventDefault();
      const digits = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6);
      digits.split("").forEach((d, k) => { if (loginOtpCells[k]) loginOtpCells[k].value = d; });
      loginOtpCells[Math.min(digits.length, 5)].focus();
      if (loginOtpValue().length === 6) loginForm.requestSubmit();
    });
  });
}
function clearLoginError(){
  const err = $("#loginError"), otpErr = $("#loginOtpError");
  err.hidden = true; err.textContent = "";
  otpErr.hidden = true; otpErr.textContent = "";
  loginPhone.removeAttribute("aria-invalid");
  $("#loginOtp").classList.remove("otp--error");
}
function shakeLogin(){
  const card = $("#loginForm");
  card.classList.remove("is-shake");
  void card.offsetWidth;
  card.classList.add("is-shake");
}
function paintLoginStep(){
  const otp = loginStep === 1;
  $("#loginPhoneStep").hidden = otp;
  $("#loginOtpStep").hidden = !otp;
  $("#loginH").textContent = t(otp ? "auth.mfa" : "auth.h");
  $("#loginSub").textContent = otp
    ? t("auth.mfaHint")
    : (acct === "guest" ? GUEST_LOGIN_HINT[lang] : t("auth.sub"));
  $("#loginGo").textContent = t(otp ? "auth.login" : "btn.next");
  $("#loginCancel").textContent = t(otp ? "btn.back" : "btn.close");
  paintLoginOtpLabels();
  fitLoginScale();
}
function resetLoginForm(){
  loginStep = 0;
  loginPhone.value = "";
  loginOtpCells.forEach(cell => { cell.value = ""; });
  clearLoginError();
  paintLoginStep();
}
function openLogin(){
  loginLastFocus = document.activeElement;
  buildLoginOtp();
  loginStep = 0;
  clearLoginError();
  paintLoginStep();
  setPortalBlur(true);
  loginDialog = window.EKHDialog?.openExistingDialog(loginOverlay, {
    initialFocus: "#loginPhone",
    trigger: loginLastFocus,
    onClosed: () => {
      loginDialog = null;
      setPortalBlur(false);
      resetLoginForm();
    },
  }) || null;
  if (!loginDialog) { loginOverlay.classList.add("open"); loginPhone.focus(); }
  requestAnimationFrame(fitLoginScale);
}
function closeLogin(){
  pendingAction = null;
  if (loginDialog) { loginDialog.close(); loginDialog = null; }
  else {
    loginOverlay.classList.remove("open");
    setPortalBlur(false);
    resetLoginForm();
    if (loginLastFocus && !loginLastFocus.hidden) loginLastFocus.focus();
  }
}
/* after signing in the trigger button is gone — hand focus to the visible screen's heading */
function focusScreenHeading(){
  const scr = $$(".screen").find(s => !s.hidden);
  const h = scr && scr.querySelector("h1, h2");
  if (h){ h.setAttribute("tabindex", "-1"); h.focus({ preventScroll:true }); }
}
function finishSignIn(){
  authed = true;
  if (acct === "guest"){
    acct = "person";
    $$("[data-acct]").forEach(x => x.setAttribute("aria-selected", String(x.dataset.acct === "person")));
    $("#acctCur").dataset.i18n = "acct.person";
    $("#acctCur").textContent = t("acct.person");
    renderCats();
  }
  try { localStorage.setItem(AUTH_KEY, "1"); } catch(e){}
  applyAuth();
  const after = pendingAction;
  pendingAction = null;
  setPortalBlur(false);
  if (loginDialog) { loginDialog.close(); loginDialog = null; }
  else { loginOverlay.classList.remove("open"); resetLoginForm(); }
  toast("toast.hi");
  if (after) after();
  else focusScreenHeading();
}
loginBtn.addEventListener("click", openLogin);
$("#guestAvatar").addEventListener("click", openLogin);
$("#loginCancel").addEventListener("click", () => {
  if (loginStep === 1){
    loginStep = 0;
    loginOtpCells.forEach(cell => { cell.value = ""; });
    clearLoginError();
    paintLoginStep();
    loginPhone.focus();
    return;
  }
  closeLogin();
});
loginOverlay.addEventListener("click", e => { if (e.target === loginOverlay) closeLogin(); });
loginForm.addEventListener("submit", e => {
  e.preventDefault();
  if (loginStep === 0){
    if (!loginPhone.value.trim()){
      const err = $("#loginError");
      err.hidden = false;
      err.textContent = t("auth.phoneRequired");
      loginPhone.setAttribute("aria-invalid", "true");
      shakeLogin();
      loginPhone.focus();
      fitLoginScale();
      return;
    }
    loginStep = 1;
    clearLoginError();
    paintLoginStep();
    loginOtpCells[0]?.focus();
    return;
  }
  const code = loginOtpValue();
  if (!/^\d{6}$/.test(code)){
    const err = $("#loginOtpError");
    err.hidden = false;
    err.textContent = t("auth.otpRequired");
    $("#loginOtp").classList.add("otp--error");
    shakeLogin();
    (loginOtpCells.find(cell => !cell.value) || loginOtpCells[0])?.focus();
    fitLoginScale();
    return;
  }
  finishSignIn();
});
buildLoginOtp();
new ResizeObserver(fitLoginScale).observe(loginBody);
function logout(){
  authed = false;
  try { localStorage.setItem(AUTH_KEY, "0"); } catch(e){}
  closeNotifPop(false);
  closeProfilePop(false);
  applyAuth();
  navigate("#/", { replace:true });
  toast("toast.bye");
}
$("#logoutBtn").addEventListener("click", logout);

/* ---------- profile popover: identity + preferences (§3 "Global preferences") ----------
   Signed in the avatar opens it; signed out and in guest mode the quiet gear
   opens the same layer minus the identity. Language and theme never return to
   permanent chrome. */
const profilePop = $("#citizenProfilePop");
let popTrigger = null;
function syncProfilePop(){
  const isIn = authed && acct !== "guest";
  $$("[data-pop-auth]", profilePop).forEach(el => { el.hidden = !isIn; });
}
function positionProfilePop(trigger){
  profilePop.hidden = false;
  const rect = trigger.getBoundingClientRect(), box = profilePop.getBoundingClientRect();
  let left = Math.max(8, Math.min(rect.right - box.width, window.innerWidth - box.width - 8));
  let top = Math.min(rect.bottom + 8, window.innerHeight - box.height - 8);
  profilePop.style.transformOrigin = "top right";
  profilePop.style.left = left + "px";
  profilePop.style.top = Math.max(8, top) + "px";
}
function closeProfilePop(restoreFocus){
  if (!profilePop || profilePop.hidden) return;
  closeAllDd();
  profilePop.classList.remove("is-open");
  profilePop.hidden = true;
  const trigger = popTrigger;
  popTrigger = null;
  if (trigger){
    trigger.setAttribute("aria-expanded", "false");
    if (restoreFocus && !trigger.hidden) trigger.focus();
  }
}
function openProfilePop(trigger){
  if (popTrigger === trigger && !profilePop.hidden){ closeProfilePop(true); return; }
  closeNotifPop(false);
  closeProfilePop(false);
  syncProfilePop();
  popTrigger = trigger;
  trigger.setAttribute("aria-expanded", "true");
  positionProfilePop(trigger);
  paintTheme();
  requestAnimationFrame(() => profilePop.classList.add("is-open"));
  const first = $$("button:not([hidden])", profilePop).find(b => b.offsetParent !== null);
  if (first) first.focus();
}
$("#profileTrigger").addEventListener("click", e => { e.stopPropagation(); openProfilePop(e.currentTarget); });
$("#prefsBtn").addEventListener("click", e => { e.stopPropagation(); openProfilePop(e.currentTarget); });
profilePop.addEventListener("click", e => {
  const choice = e.target.closest("[data-theme-choice]");
  if (choice){ setTheme(choice.dataset.themeChoice); return; }
  /* navigation and sign-out leave the layer behind them */
  if (e.target.closest("[data-go],[data-logout]")) closeProfilePop(false);
});
document.addEventListener("click", e => {
  if (profilePop.hidden || e.target.closest("#citizenProfilePop")) return;
  closeProfilePop(false);
});
window.addEventListener("resize", () => { if (!profilePop.hidden && popTrigger) positionProfilePop(popTrigger); });
document.addEventListener("keydown", e => {
  if (profilePop.hidden) return;
  if (e.key === "Escape"){
    if ($(".dd.open", profilePop)){ closeAllDd(); return; }
    e.preventDefault(); closeProfilePop(true); return;
  }
  if (e.key !== "Tab") return;
  const f = $$("button, [href], input, [tabindex]:not([tabindex='-1'])", profilePop)
    .filter(el => !el.disabled && el.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
});
document.addEventListener("click", e => { if (e.target.closest("[data-logout]")) logout(); });

/* ---------- notification preview ---------- */
const notifPop = $("#citizenNotifPop");
let notifTrigger = null;
function positionNotifPop(trigger){
  notifPop.hidden = false;
  const rect = trigger.getBoundingClientRect(), box = notifPop.getBoundingClientRect();
  const left = Math.max(8, Math.min(rect.right - box.width, window.innerWidth - box.width - 8));
  const top = Math.min(rect.bottom + 8, window.innerHeight - box.height - 8);
  notifPop.style.transformOrigin = "top right";
  notifPop.style.left = left + "px";
  notifPop.style.top = Math.max(8, top) + "px";
}
function closeNotifPop(restoreFocus){
  if (!notifPop || notifPop.hidden) return;
  notifPop.classList.remove("is-open");
  notifPop.hidden = true;
  const trigger = notifTrigger;
  notifTrigger = null;
  if (trigger){
    trigger.setAttribute("aria-expanded", "false");
    if (restoreFocus && !trigger.hidden) trigger.focus();
  }
}
function openNotifPop(trigger){
  if (notifTrigger === trigger && !notifPop.hidden){ closeNotifPop(true); return; }
  closeProfilePop(false);
  notifTrigger = trigger;
  trigger.setAttribute("aria-expanded", "true");
  positionNotifPop(trigger);
  requestAnimationFrame(() => notifPop.classList.add("is-open"));
  const first = $("button", notifPop);
  if (first) first.focus();
}
notifPop.addEventListener("click", e => {
  if (e.target.closest("[data-go],[data-toast]")) closeNotifPop(false);
});
document.addEventListener("click", e => {
  if (notifPop.hidden || e.target.closest("#citizenNotifPop,#bellBtn")) return;
  closeNotifPop(false);
});
window.addEventListener("resize", () => { if (!notifPop.hidden && notifTrigger) positionNotifPop(notifTrigger); });
document.addEventListener("keydown", e => {
  if (notifPop.hidden) return;
  if (e.key === "Escape"){ e.preventDefault(); closeNotifPop(true); return; }
  if (e.key !== "Tab") return;
  const f = $$("button", notifPop).filter(el => !el.disabled && el.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
});

/* ---------- routing ----------
   Every screen, profile pane and application detail is a hash route, so Back,
   reload and a shared link all land on what the user was looking at (§7).
   go()/navigate() only ever write a URL; applyRoute() paints what it says. */
const SCREENS = { home:"scr-home", category:"scr-category", journey:"scr-journey",
                  emergency:"scr-emergency", profile:"scr-profile", notifs:"scr-notifs", guestService:"scr-guest-service" };
/* screens that only exist for a signed-in citizen */
const PERSONAL = ["profile", "notifs", "journey"];
/* route slug <-> pane id: the URL speaks the user's language, the DOM keeps its ids */
const PANE_ROUTE = { data:"data", docs:"wallet", apps:"apps", payments:"payments",
                     contact:"contact", family:"family", sec:"security", access:"access" };
const ROUTE_PANE = Object.fromEntries(Object.entries(PANE_ROUTE).map(([pane, slug]) => [slug, pane]));
/* allow-listed, non-personal, ASCII filter params only (§7) */
const ROUTE_PARAMS = ["pay", "status", "agency", "own"];
const PARAM_VALUES = {
  pay:["all", "free", "paid"],
  own:["me", "kids", "parents"],
  status:["all", "active", "done", "action", "draft", "submitted", "review", "approved", "rejected", "completed", "expired"]
};
let navDepth = 0;
let lastHref = null;
let currentRoute = { screen:"home" };
const signedIn = () => authed && acct !== "guest";

function parseRoute(hash){
  const raw = String(hash || "").replace(/^#/, "").split("?")[0];
  const parts = raw.split("/").filter(Boolean).map(decodeURIComponent);
  if (!parts.length) return { screen:"home" };
  if (parts[0] === "category") return { screen:"category", cat:parts[1] || null };
  if (parts[0] === "emergency"){
    const step = ["documents", "done"].includes(parts[1]) ? parts[1] : "pitch";
    return { screen:"emergency", step };
  }
  if (parts[0] === "profile"){
    const pane = ROUTE_PANE[parts[1]] || "data";
    return { screen:"profile", pane, appId:(pane === "apps" && parts[2]) ? parts[2] : null };
  }
  const named = { journey:"journey", emergency:"emergency", notifs:"notifs", "guest-appointment":"guestService" }[parts[0]];
  return named ? { screen:named } : { screen:"home" };
}
function hashFor(route){
  if (route.screen === "category") return "#/category/" + encodeURIComponent(route.cat || "");
  if (route.screen === "profile"){
    const slug = PANE_ROUTE[route.pane] || "data";
    return "#/profile/" + slug + (route.appId ? "/" + encodeURIComponent(route.appId) : "");
  }
  if (route.screen === "emergency") return "#/emergency" + (route.step && route.step !== "pitch" ? "/" + route.step : "");
  return { home:"#/", journey:"#/journey", notifs:"#/notifs",
           guestService:"#/guest-appointment" }[route.screen] || "#/";
}
/* which filter params this route is allowed to carry; everything else is dropped */
function allowedParams(route){
  if (route.screen === "category") return ["pay"];
  if (route.screen === "profile" && route.pane === "docs") return ["own"];
  if (route.screen === "profile" && route.pane === "apps") return ["status", "agency"];
  return [];
}
function routeParams(){
  const merged = new URLSearchParams(location.search);
  const hashQuery = String(location.hash || "").split("?")[1];
  if (hashQuery) new URLSearchParams(hashQuery).forEach((v, k) => merged.set(k, v));
  return merged;
}
function readParam(key, fallback){
  const raw = routeParams().get(key);
  if (!raw || !/^[\w,-]{1,40}$/.test(raw)) return fallback;
  const allow = PARAM_VALUES[key];
  return (!allow || allow.includes(raw)) ? raw : fallback;
}
function needsAuth(route){
  /* the emergency pitch is public; revoking documents is not */
  if (route.screen === "emergency") return route.step === "documents" && !signedIn();
  return PERSONAL.includes(route.screen) && !signedIn();
}
function writeUrl(url, replace){
  const href = url.pathname + url.search + url.hash;
  if (replace) history.replaceState({ ekh:true, d:navDepth }, "", href);
  else { navDepth += 1; history.pushState({ ekh:true, d:navDepth }, "", href); }
  lastHref = location.href;
}
function navigate(hash, opts){
  opts = opts || {};
  const route = parseRoute(hash);
  if (needsAuth(route)){ requireLogin(() => navigate(hash, opts)); return; }
  const url = new URL(location.href);
  url.hash = hash;
  const allow = allowedParams(route);
  ROUTE_PARAMS.forEach(k => { if (!allow.includes(k)) url.searchParams.delete(k); });
  Object.entries(opts.params || {}).forEach(([k, v]) => {
    if (!allow.includes(k) || v == null || v === "all") url.searchParams.delete(k);
    else url.searchParams.set(k, v);
  });
  /* re-selecting the screen you are already on must not stack a history entry */
  const href = url.pathname + url.search + url.hash;
  const same = href === (location.pathname + location.search + location.hash);
  writeUrl(url, opts.replace || same);
  applyRoute(route);
}
function showScreen(id, opts){
  const scr = $("#" + id);
  if (!scr) return;
  const changed = scr.hidden;
  $$(".screen").forEach(s => { s.hidden = s.id !== id; });
  if (changed && !reduceMotion() && !opts.initial){
    scr.classList.remove("enter"); void scr.offsetWidth;
    scr.classList.add("enter");
    scr.addEventListener("animationend", () => scr.classList.remove("enter"), { once:true });
  }
  if (opts.initial) return;
  window.scrollTo({ top:0, left:0, behavior:"instant" });
  const h = scr.querySelector("h1, h2");
  if (h){ h.setAttribute("tabindex", "-1"); h.focus({ preventScroll:true }); }
}
function applyRoute(route, opts){
  opts = opts || {};
  if (needsAuth(route)){ navigate("#/", { replace:true }); return; }
  if (route.screen === "category"){
    if (!route.cat || !findGroup(route.cat)){ navigate("#/", { replace:true }); return; }
    setPay(readParam("pay", "all"));
    renderCategory(route.cat);
  }
  if (route.screen === "emergency") emergView(route.step || "pitch");
  if (route.screen === "profile"){
    selectPane(route.pane, { animate:!opts.initial });
    if (route.pane === "docs") applyFilter(readParam("own", "me"));
    if (route.pane === "apps") expansion?.openApplication(route.appId);
  }
  currentRoute = route;
  showScreen(SCREENS[route.screen], opts);
  closeSearch();
}
/* one back affordance per screen: the browser's own history, home as the floor */
function goBack(){
  if (navDepth > 0) history.back();
  else navigate("#/", { replace:true });
}
function go(name, own){
  if (name === "guestService") expansion?.resetGuestFlow();
  const route = name === "wallet" ? { screen:"profile", pane:"docs" }
              : name === "tracking" ? { screen:"profile", pane:"apps" }
              : name === "payments" ? { screen:"profile", pane:"payments" }
              : name === "profile" ? { screen:"profile", pane:"data" }
              : SCREENS[name] ? { screen:name } : null;
  if (!route) return;
  if (route.screen === "category") route.cat = currentCat;
  navigate(hashFor(route), own ? { params:{ own } } : undefined);
}
window.addEventListener("popstate", e => {
  navDepth = (e.state && e.state.d) || 0;
  lastHref = location.href;
  applyRoute(parseRoute(location.hash));
});
window.addEventListener("hashchange", () => {
  if (location.href === lastHref) return;
  lastHref = location.href;
  applyRoute(parseRoute(location.hash));
});

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
/* One row = one service. The payment fact is a chip only where it is the
   exception (free); "музднок" repeated on 37 rows is noise, so it joins the
   quiet meta line instead (rule 6). showOrg is false when the whole group
   shares one agency — then the agency is printed once, in the subheading. */
function svcRow(it, showOrg, showPaid){
  const paid = it[2] & 4;
  const action = it[5] === "guest-appointment" ? ' data-go="guestService"' : ' data-toast="toast.demo"';
  const guestBadge = acct === "guest" ? '<span class="audience-badge audience-badge--guest">' + t("meta.free") + ' · ' + ((COPY_GUEST[lang]) || COPY_GUEST.tg) + '</span>' : '';
  const meta = [];
  if (showOrg) meta.push(esc(svcOrg(it)));
  if (paid && showPaid) meta.push(t("meta.paid"));
  return '<button class="svc-row"' + action + '>' +
    '<span class="tt"><b>' + esc(svcName(it)) + '</b>' +
      (meta.length ? '<span class="org">' + meta.join(" · ") + '</span>' : '') + '</span>' +
    guestBadge +
    (paid ? '' : '<span class="tag free">' + t("meta.free") + '</span>') +
    '<svg class="svc-go" aria-hidden="true"><use href="/design-system/assets/icons.svg#i-chev-r"/></svg>' +
  '</button>';
}
/* A fact the whole group shares belongs above the group, not on every row: the
   agency, and "музднок" when the section is paid throughout (rule 6). */
function svcGroup(items, label, org){
  const allPaid = items.every(it => it[2] & 4);
  const head = [label, org, allPaid ? t("meta.paid") : null].filter(Boolean).join(" · ");
  return (head ? '<h3 class="svc-sub">' + esc(head) + '</h3>' : '') +
    '<div class="rows">' + items.map(it => svcRow(it, !org, !allPaid)).join("") + '</div>';
}
function renderCatList(){
  const g = findGroup(currentCat); if (!g) return;
  const q = $("#cpSearch").value.trim().toLowerCase();
  let html = "", shown = 0;
  g.subs.forEach(s => {
    const items = s.items.filter(it =>
      paySel(it) && (!q || (svcName(it) + " " + svcOrg(it)).toLowerCase().includes(q)));
    if (!items.length) return;
    /* the same agency repeats on almost every row: print it once as the group's
       subheading instead of 37 times down the list (rule 6). A labelled section
       keeps its label; an unlabelled one is grouped by agency. */
    const label = s.label ? s.label[lang] : null;
    const orgs = [...new Set(items.map(svcOrg))];
    if (label || orgs.length === 1) html += svcGroup(items, label, orgs.length === 1 ? orgs[0] : null);
    else orgs.forEach(org => { html += svcGroup(items.filter(it => svcOrg(it) === org), null, org); });
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
  payFilter = PARAM_VALUES.pay.includes(val) ? val : "all";
  $("#cpPay").value = payFilter;
}
function openCat(id){
  $("#cpSearch").value = "";
  navigate("#/category/" + encodeURIComponent(id));
}
$("#cpPay").addEventListener("change", e => {
  setPay(e.target.value);
  renderCatList();
  navigate(hashFor(currentRoute), { params:{ pay:payFilter }, replace:true });
});
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
  const backBtn = e.target.closest("[data-back]");
  if (backBtn){ goBack(); return; }
  const goBtn = e.target.closest("[data-go]");
  if (goBtn){ go(goBtn.dataset.go, goBtn.dataset.own); return; }
  const catBtn = e.target.closest("[data-cat]");
  if (catBtn){ openCat(catBtn.dataset.cat); return; }
  const tBtn = e.target.closest("[data-toast]");
  if (tBtn){ toast(tBtn.dataset.toast); return; }
  const back = e.target.closest("[data-jback]");
  if (back){ jstep(Number(back.dataset.jback)); return; }
  const qrBtn = e.target.closest("[data-qr]");
  if (qrBtn){ openQr(qrBtn.dataset.qr); return; }
  const docCard = e.target.closest("#docGrid .doc");
  if (docCard){ openDocumentDetail(docCard.dataset.docId); return; }
  const chip = e.target.closest(".filters .chip");
  if (chip){
    applyFilter(chip.dataset.own);
    navigate(hashFor(currentRoute), { params:{ own:chip.dataset.own }, replace:true });
    return;
  }
  if (!e.target.closest("#searchWrap")) closeSearch();
});
$("#bellBtn").addEventListener("click", e => { e.stopPropagation(); openNotifPop(e.currentTarget); });
/* the dot is a fact, not decoration: it shows only while the "new" group has rows */
(function syncBellDot(){
  const group = $("#scr-notifs .n-group + .fpane");
  const dot = $("#bellBtn .dot");
  if (dot) dot.hidden = !group || !group.children.length;
})();

/* ---------- journey ---------- */
let step = 1;
const childName = $("#childName"), toStep2 = $("#toStep2"), toStep3 = $("#toStep3"),
      consent = $("#consent"), submitAll = $("#submitAll");
function jstep(n){
  step = n;
  for (let i = 1; i <= 4; i++) $("#jstep-" + i).hidden = i !== n;
  $$("#jprog .stepper__step").forEach(el => {
    const i = Number(el.dataset.jstep);
    /* step 4 is the success screen: every step is behind the user by then */
    el.classList.toggle("done", n === 4 || i < n);
    if (i === n && n < 4) el.setAttribute("aria-current", "step");
    else el.removeAttribute("aria-current");
  });
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
  if (!PARAM_VALUES.own.includes(own)) own = "me";
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

/* ---------- emergency: pick what was lost, revoke it, get a temporary ID ---------- */
const emergPitch = $("#emergPitch"), emergForm = $("#emergForm"), emergDone = $("#emergDone");
function emergView(step){
  /* a reloaded #/emergency/done has nothing to report — start over from the pitch */
  if (step === "done" && !$("#emergRevoked").children.length){ navigate("#/emergency", { replace:true }); return; }
  emergPitch.hidden = step !== "pitch";
  emergForm.hidden = step !== "documents";
  emergDone.hidden = step !== "done";
}
$("#emergStart").addEventListener("click", () => navigate("#/emergency/documents"));
emergForm.addEventListener("submit", e => {
  e.preventDefault();
  const picked = $$("#emergForm input[type=checkbox]").filter(b => b.checked);
  if (!picked.length){
    $("#emergError").textContent = t("e.f.none");
    $("#emergError").hidden = false;
    return;
  }
  $("#emergError").hidden = true;
  $("#emergRevoked").innerHTML = picked.map(b =>
    '<div class="s-row"><svg aria-hidden="true"><use href="/design-system/assets/icons.svg#i-check"/></svg>' +
    '<span>' + esc(t(b.value === "driver" ? "d.drv.k" : "d.pass.k")) + '</span>' +
    '<span class="st-l">' + esc(t("e.d.revoked")) + '</span></div>').join("");
  delete docTemp.dataset.locked;
  navigate("#/emergency/done", { replace:true });
  toast("toast.temp");
});

/* ---------- profile ---------- */
function selectPane(key, opts){
  opts = opts || {};
  $$(".pn").forEach(b => b.setAttribute("aria-current", String(b.dataset.pane === key)));
  $$(".pane").forEach(p => { p.hidden = p.id !== "pane-" + key; });
  const pane = $("#pane-" + key);
  if (!pane || reduceMotion() || opts.animate === false) return;
  pane.classList.remove("enter"); void pane.offsetWidth;
  pane.classList.add("enter");
  pane.addEventListener("animationend", () => pane.classList.remove("enter"), { once:true });
}
$$(".pn[data-pane]").forEach(btn => btn.addEventListener("click", () => {
  navigate("#/profile/" + (PANE_ROUTE[btn.dataset.pane] || "data"));
}));
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
  if (qrOverlay.classList.contains("open") || loginOverlay.classList.contains("open") || !profilePop.hidden) return; /* shortcuts stay inside the open layer */
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
  /* the pane never reads or writes the URL itself — it asks the router to */
  readParam,
  syncQuery:params => navigate(hashFor(currentRoute), { params, replace:true }),
  openApp:id => navigate("#/profile/apps" + (id ? "/" + encodeURIComponent(id) : "")),
  openReceivedFile:file=>openDocumentDetail(file.id,file)
});
applyAuth();
applyLang();
jstep(1);
feedTab("notif");

/* first paint restores the screen, pane, detail and filters the URL asks for */
(function boot(){
  const route = parseRoute(location.hash);
  const url = new URL(location.href);
  const incoming = routeParams();
  url.hash = hashFor(route);
  const allow = allowedParams(route);
  ROUTE_PARAMS.forEach(k => {
    const value = allow.includes(k) ? incoming.get(k) : null;
    if (value) url.searchParams.set(k, value); else url.searchParams.delete(k);
  });
  history.replaceState({ ekh:true, d:0 }, "", url.pathname + url.search + url.hash);
  navDepth = 0;
  lastHref = location.href;
  applyFilter(route.screen === "profile" && route.pane === "docs" ? readParam("own", "me") : "me");
  if (needsAuth(route)){
    applyRoute({ screen:"home" }, { initial:true });
    requireLogin(() => navigate(hashFor(route)));
    return;
  }
  applyRoute(route, { initial:true });
})();
})();
