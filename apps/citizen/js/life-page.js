/* ============================================================
   Life situations: the home cards, the «see all» list and one page per
   situation (design-guide §3 «Citizen life situations»). A card does not
   jump into a service — it opens a page that says, step by step, which
   services the moment needs and in what order, what to bring, and what
   happens in person; every service on it opens the same overview the
   catalogue does, so Apply stays an informed choice (rule 54).
   ============================================================ */
import { LIFE } from './life-data.js';

const SPRITE = "/design-system/assets/icons.svg#";
const ART = "/design-system/assets/illustrations.svg#ill-";
const icon = (name, cls) => `<svg${cls ? ` class="${cls}"` : ""} aria-hidden="true"><use href="${SPRITE}${name}"/></svg>`;
const art = (name, cls) => `<svg class="ekh-ill${cls ? " " + cls : ""}" aria-hidden="true" focusable="false"><use href="${ART}${name}"/></svg>`;

const COPY = {
  tg:{ crumbs:"Роҳи саҳифа", home:"Асосӣ", lead:"Хизматҳое, ки одатан якҷоя лозим мешаванд — қадам ба қадам ва бо ҳамон тартибе, ки ба шумо лозим мешаванд.",
       toc:"Мундариҷа", step:"Қадами {n}", need:"Лозим мешавад", services:"Хизматҳо", faq:"Донистан муфид аст", more:"Дигар лаҳзаҳои зиндагӣ", kind:"Лаҳзаи зиндагӣ" },
  ru:{ crumbs:"Навигационная цепочка", home:"Главная", lead:"Услуги, которые обычно нужны вместе, — по шагам и в том порядке, в котором они понадобятся.",
       toc:"Содержание", step:"Шаг {n}", need:"Понадобится", services:"Услуги", faq:"Полезно знать", more:"Другие жизненные ситуации", kind:"Жизненная ситуация" },
  en:{ crumbs:"Breadcrumb", home:"Home", lead:"Services you usually need together — step by step, in the order you'll need them.",
       toc:"Contents", step:"Step {n}", need:"You'll need", services:"Services", faq:"Good to know", more:"Other life moments", kind:"Life moment" }
};

export const LIFE_IDS = LIFE.map(l => l.id);
/* a one- or two-letter word («в», «и», «ба») never ends a line: it travels with the next word */
const bind = str => str.replace(/(^|\s)([^\s]{1,2})\s/gu, "$1$2\u00a0");

export function initLifePage(ctx){
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const lang = () => ctx.getLang();
  const C = () => COPY[lang()] || COPY.tg;
  const pick = obj => obj ? (obj[lang()] || obj.ru || obj.tg) : "";
  const esc = ctx.esc;
  const say = obj => esc(bind(pick(obj)));
  const byId = id => LIFE.find(l => l.id === id) || null;

  /* ---------- the card: the home row, the full list and «other situations» share it ---------- */
  function cardHtml(l){
    return `<a class="moment" href="#/life/${l.id}" data-route>` +
      `<span class="moment-copy"><span class="moment-title">${say(l.t)}</span><span class="moment-text">${say(l.p)}</span></span>` +
      `<span class="moment-go" aria-hidden="true">${icon("i-chev-r")}</span>` +
      art(l.art, "moment-art") +
    `</a>`;
  }
  function renderHome(){
    const row = $("#moments");
    if (row) row.innerHTML = LIFE.filter(l => l.home).map(cardHtml).join("");
  }

  const crumbs = trail => `<nav class="ekh-crumbs" aria-label="${esc(C().crumbs)}"><ol>` +
    trail.map(([href, label]) => `<li><a href="${href}" data-route>${esc(label)}</a></li>`).join("") + `</ol></nav>`;

  /* ---------- «see all»: every situation, the same cards on the same paper ---------- */
  function renderIndex(){
    const c = C();
    $("#lifeRoot").innerHTML =
      `<div class="life-band"><div class="life-wrap life-hero life-hero--index">` +
        `<div class="life-hero__copy">${crumbs([["#/", c.home]])}` +
          `<h1 id="lifeTitle">${esc(ctx.t("mom.t"))}</h1><p class="life-hero__lead">${esc(c.lead)}</p></div>` +
      `</div></div>` +
      `<div class="life-wrap life-all"><div class="moments" id="lifeAll">${LIFE.map(cardHtml).join("")}</div></div>`;
  }

  /* ---------- one step's services: the registry overview, or a built flow ---------- */
  function svcHtml(ref){
    let hash, name, meta, paid;
    if (ref.href){
      hash = ref.href; name = pick(ref.t); meta = pick(ref.meta); paid = false;
    } else {
      const s = ctx.lookup(ref.cat, ref.re);
      if (!s) return ""; /* this audience's catalogue does not carry it */
      hash = s.hash; name = pick(ref.t); paid = s.paid;
      meta = s.time + " · " + s.org;
    }
    return `<li><a class="life-svc" href="${hash}" data-route>` +
      `<span class="life-svc__copy"><b>${esc(bind(name))}</b><span>${esc(meta)}</span></span>` +
      `<span class="tag ${paid ? "pay" : "free"}">${esc(ctx.t(paid ? "meta.paid" : "meta.free"))}</span>` +
      icon("i-chev-r", "life-svc__go") +
    `</a></li>`;
  }
  function stepHtml(s, i){
    const c = C(), n = i + 1;
    const rows = (s.svc || []).map(svcHtml).join("");
    const need = s.need ? (s.need[lang()] || s.need.ru) : null;
    return `<section class="life-step" id="life-s${n}" aria-labelledby="life-s${n}-h">` +
      `<div class="life-step__head"><span class="life-step__n" aria-hidden="true">${n}</span>` +
        `<h2 id="life-s${n}-h"><span class="sr-only">${esc(c.step.replace("{n}", n))}. </span>${say(s.t)}</h2></div>` +
      `<div class="life-step__body">` +
        `<p class="life-step__text">${say(s.p)}</p>` +
        (need ? `<div class="life-need"><b>${esc(c.need)}</b><ul>${need.map(x => `<li>${esc(bind(x))}</li>`).join("")}</ul></div>` : "") +
        (s.note ? `<p class="banner banner--info life-note">${icon("i-info")}<span class="banner__text">${say(s.note)}</span></p>` : "") +
        (rows ? `<ul class="life-svcs" aria-label="${esc(c.services)}">${rows}</ul>` : "") +
      `</div>` +
    `</section>`;
  }
  function sections(l){
    return l.steps.map((s, i) => ({ id:"s" + (i + 1), n:i + 1, label:pick(s.t) }))
      .concat(l.faq ? [{ id:"faq", n:null, label:C().faq }] : []);
  }

  let current = null;
  function renderLife(route){
    if (!route.id){ current = null; renderIndex(); return true; }
    const l = byId(route.id);
    if (!l) return false;
    current = l;
    const c = C();
    const toc = sections(l);
    $("#lifeRoot").innerHTML =
      /* the page opens on the card it came from: the same wash, the same scene */
      `<div class="life-band"><div class="life-wrap life-hero">` +
        `<div class="life-hero__copy">${crumbs([["#/", c.home], ["#/life", ctx.t("mom.t")]])}` +
          `<h1 id="lifeTitle">${say(l.t)}</h1>` +
          `<p class="life-hero__lead">${say(l.lead)}</p>` +
          (l.act ? `<div class="life-hero__act"><a class="btn btn-pri" href="${l.act.href}" data-route>${say(l.act.t)}</a><span>${say(l.act.meta)}</span></div>` : "") +
        `</div>` +
        art(l.art, "life-hero__art") +
      `</div></div>` +
      `<div class="life-wrap prof-grid life-grid">` +
        `<nav class="prof-nav life-toc" aria-label="${esc(c.toc)}">` +
          toc.map(s => `<a class="pn" href="#/life/${l.id}/${s.id}" data-route data-replace data-life-link="${s.id}">` +
            (s.n ? `<span class="life-toc__n" aria-hidden="true">${s.n}</span>` : `<span class="life-toc__n" aria-hidden="true"></span>`) +
            `<span>${esc(bind(s.label))}</span></a>`).join("") +
        `</nav>` +
        `<div class="life-body">` +
          l.steps.map(stepHtml).join("") +
          (l.faq ? `<section class="life-faq" id="life-faq" aria-labelledby="life-faq-h"><h2 id="life-faq-h">${esc(c.faq)}</h2>` +
            `<div class="ekh-disclosures">` + l.faq.map((f, i) =>
              `<details class="ekh-disclosure" id="life-q${i + 1}"><summary>${say(f.q)}${icon("i-chev-d", "ekh-disclosure__chev")}</summary>` +
              `<div class="ekh-disclosure__body"><p>${say(f.a)}</p></div></details>`).join("") +
            `</div></section>` : "") +
          `<section class="life-more" aria-labelledby="life-more-h"><h2 id="life-more-h">${esc(c.more)}</h2>` +
            `<div class="moments life-more__grid">${l.next.map(byId).filter(Boolean).map(cardHtml).join("")}</div></section>` +
        `</div>` +
      `</div>`;
    syncToc();
    return true;
  }

  /* ---------- the contents menu follows the reading position (the help guide's model) ---------- */
  function syncToc(){
    const scr = $("#scr-life");
    if (!scr || scr.hidden || !current) return;
    const ids = sections(current).map(s => s.id);
    const line = (ctx.headerHeight() || 64) + 32;
    let at = ids[0];
    ids.forEach(id => {
      const el = $("#life-" + id);
      if (el && el.getBoundingClientRect().top <= line) at = id;
    });
    /* the last section can be too short to reach the line: at the page foot it is the one being read */
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) at = ids[ids.length - 1];
    $$("[data-life-link]").forEach(a => a.setAttribute("aria-current", String(a.dataset.lifeLink === at)));
  }
  window.addEventListener("scroll", syncToc, { passive:true });
  function focusSection(id, opts){
    const el = id && $("#life-" + id);
    if (!el) return false;
    const h = $("h2", el);
    const instant = opts?.instant || ctx.reduceMotion();
    el.scrollIntoView({ block:"start", behavior:instant ? "instant" : "smooth" });
    h.setAttribute("tabindex", "-1");
    h.focus({ preventScroll:true });
    $$("[data-life-link]").forEach(a => a.setAttribute("aria-current", String(a.dataset.lifeLink === id)));
    /* a deep link scrolls before the web font has loaded; the font reflows the
       steps, so land on the step again once it has */
    if (instant && document.fonts && document.fonts.status !== "loaded"){
      document.fonts.ready.then(() => { if (el.isConnected && document.activeElement === h){ el.scrollIntoView({ block:"start", behavior:"instant" }); syncToc(); } });
    }
    return true;
  }

  /* ---------- search: each situation is an intent that opens its page ---------- */
  function intents(){
    return LIFE.map(l => ({ icon:l.glyph, kw:l.kw, label:l.t,
      meta:{ tg:COPY.tg.kind, ru:COPY.ru.kind, en:COPY.en.kind }, act:{ type:"nav", hash:"#/life/" + l.id } }));
  }

  return { renderHome, renderLife, focusSection, syncToc, intents, has:id => Boolean(byId(id)) };
}
