/* ============================================================
   News: the «all news» list and one page per story (design-guide §3
   «Citizen news»). Both continue the home band — white paper, hairlines
   instead of cards, a near-square photo, and the home's 5fr : 8fr line:
   what a story is filed under sits in the narrow column, the story itself
   in the wide one, so the list's titles, a story's photo and text, and the
   footer's columns share one left edge.

   #/news        a front page of the six newest (the newest in the wide
                 middle column; two on its left, the first with its photo;
                 three as words on its right), then every older story as a
                 row: date and topic · title and summary · the photo, small.
   #/news/<id>   title on the content edge; under one hairline the date and
                 topic, «copy link» and what the citizen can do about the
                 story on the portal (beside the text, sticky); the photo
                 and the text in the wide column; three more stories last.
   ============================================================ */
import { NEWS, newsDay } from './news-data.js';
import { LIFE } from './life-data.js';

const SPRITE = "/design-system/assets/icons.svg#";
const icon = (name, cls) => `<svg${cls ? ` class="${cls}"` : ""} aria-hidden="true" focusable="false"><use href="${SPRITE}${name}"/></svg>`;

const COPY = {
  tg:{ crumbs:"Роҳи саҳифа", home:"Асосӣ", list:"Ҳамаи хабарҳо", rel:"Дар ин мавзӯъ", next:"Дигар хабарҳо",
       share:"Нусхаи пайванд", shared:"Пайванд нусхабардорӣ шуд", life:"Лаҳзаи зиндагӣ" },
  ru:{ crumbs:"Навигационная цепочка", home:"Главная", list:"Все новости", rel:"По теме", next:"Другие новости",
       share:"Скопировать ссылку", shared:"Ссылка скопирована", life:"Жизненная ситуация" },
  en:{ crumbs:"Breadcrumb", home:"Home", list:"All news", rel:"On this topic", next:"More news",
       share:"Copy link", shared:"Link copied", life:"Life moment" }
};

/* a one- or two-letter word («в», «и», «ба») never ends a line: it travels with the next word */
const bind = str => str.replace(/(^|\s)([^\s]{1,2})\s/gu, "$1$2 ");

export function initNewsPage(ctx){
  const $ = (s, r = document) => r.querySelector(s);
  const lang = () => ctx.getLang();
  const C = () => COPY[lang()] || COPY.tg;
  const pick = obj => obj ? (obj[lang()] || obj.ru || obj.tg) : "";
  const esc = ctx.esc;
  const say = obj => esc(bind(pick(obj)));
  const byId = id => NEWS.find(n => n.id === id) || null;
  const href = n => "#/news/" + n.id;
  const when = n => `<time datetime="${n.date}">${esc(newsDay(n.date, lang()))}</time>`;
  /* decorative: the title beside it names the story */
  const photo = (n, eager) => `<img src="${n.img}" alt="" width="1280" height="720"${eager ? "" : ' loading="lazy" decoding="async"'}>`;

  const crumbs = trail => `<nav class="ekh-crumbs" aria-label="${esc(C().crumbs)}"><ol>` +
    trail.map(([to, label]) => `<li><a href="${to}" data-route>${esc(label)}</a></li>`).join("") + `</ol></nav>`;

  /* ---------- one story in a list: what it is filed under, the story, its photo ----------
     The title is the row's one link and its target covers the whole row; `h`
     is its heading level under whatever titles the list. */
  function rowHtml(n, h){
    return `<li class="news-row">` +
      `<p class="news-row__meta">${when(n)}<span>${say(n.cat)}</span></p>` +
      `<div class="news-row__main">` +
        `<div class="news-row__copy"><${h}><a href="${href(n)}" data-route>${say(n.t)}</a></${h}><p>${say(n.s)}</p></div>` +
        `<span class="news-row__media">${photo(n)}</span>` +
      `</div>` +
    `</li>`;
  }

  /* ---------- a story on the front page: the big one is its photo, title and summary;
     a small one adds its topic and date beside the thumbnail ---------- */
  function cardHtml(n, kind){
    return `<article class="news-card news-card--${kind}">` +
      (kind === "lead" ? "" : `<p class="news-card__meta"><span>${say(n.cat)}</span>${when(n)}</p>`) +
      `<span class="news-media">${photo(n, true)}</span>` +
      `<h2><a href="${href(n)}" data-route>${say(n.t)}</a></h2>` +
      (kind === "lead" ? `<p class="news-card__sum">${say(n.s)}</p>` : "") +
    `</article>`;
  }

  /* ---------- «all news» ----------
     The first view is a front page of the six newest: the newest big on the
     left, its photo taking up what the column leaves; the next five small on
     the right, a thumbnail beside each title. Every older story is a row
     below. */
  function renderIndex(){
    const [lead, ...others] = NEWS;
    const side = others.slice(0, 5), rest = others.slice(5);
    $("#newsRoot").innerHTML =
      `<header class="news-head">${crumbs([["#/", C().home]])}<h1 id="newsTitle">${esc(ctx.t("news.t"))}</h1></header>` +
      `<div class="news-front">` +
        cardHtml(lead, "lead") +
        (side.length ? `<div class="news-front__side">${side.map(n => cardHtml(n, "side")).join("")}</div>` : "") +
      `</div>` +
      (rest.length ? `<ul class="news-list" aria-label="${esc(C().list)}">${rest.map(n => rowHtml(n, "h2")).join("")}</ul>` : "");
  }

  /* ---------- a story's text ---------- */
  function blockHtml(b){
    if (b.h) return `<h2>${say(b.h)}</h2>`;
    if (b.ul) return `<ul>${(b.ul[lang()] || b.ul.ru).map(x => `<li>${esc(bind(x))}</li>`).join("")}</ul>`;
    if (b.note) return `<p class="banner banner--info news-note">${icon("i-info")}<span class="banner__text">${say(b.note)}</span></p>`;
    return `<p>${say(b.p)}</p>`;
  }

  /* ---------- what the citizen can do about it: the life situations' quiet rows ---------- */
  function relHtml(ref){
    let to, name, meta, paid = null;
    if (ref.life){
      const l = LIFE.find(x => x.id === ref.life);
      if (!l) return "";
      to = "#/life/" + l.id; name = pick(l.t); meta = C().life;
    } else if (ref.href){
      to = ref.href; name = pick(ref.t); meta = pick(ref.meta);
    } else {
      const s = ctx.lookup(ref.cat, ref.re);
      if (!s) return ""; /* this audience's catalogue does not carry it */
      to = s.hash; name = pick(ref.t); meta = s.time + " · " + s.org; paid = s.paid;
    }
    return `<li><a class="life-svc" href="${to}" data-route>` +
      `<span class="life-svc__copy"><b>${esc(bind(name))}</b><span>${esc(meta)}</span></span>` +
      (paid === null ? "" : `<span class="tag ${paid ? "pay" : "free"}">${esc(ctx.t(paid ? "meta.paid" : "meta.free"))}</span>`) +
      icon("i-chev-r", "life-svc__go") +
    `</a></li>`;
  }

  function renderStory(n){
    const c = C();
    const rel = (n.rel || []).map(relHtml).join("");
    /* the three newest of the rest */
    const next = NEWS.filter(x => x !== n).slice(0, 3);
    $("#newsRoot").innerHTML =
      `<article aria-labelledby="newsTitle">` +
        `<header class="news-head">${crumbs([["#/", c.home], ["#/news", ctx.t("news.t")]])}<h1 id="newsTitle">${say(n.t)}</h1></header>` +
        `<div class="news-art">` +
          `<div class="news-art__meta">` +
            `<p class="news-art__when">${when(n)}<span>${say(n.cat)}</span></p>` +
            `<button class="btn btn-sec btn--s news-share" type="button" data-news-share>${icon("i-copy")}<span aria-live="polite">${esc(c.share)}</span></button>` +
          `</div>` +
          `<div class="news-art__main">` +
            `<span class="news-media">${photo(n, true)}</span>` +
            `<div class="news-body"><p class="news-body__lead">${say(n.s)}</p>${(n.body || []).map(blockHtml).join("")}</div>` +
          `</div>` +
          (rel ? `<aside class="news-art__rel" aria-labelledby="newsRelH"><h2 id="newsRelH">${esc(c.rel)}</h2><ul class="life-svcs">${rel}</ul></aside>` : "") +
        `</div>` +
      `</article>` +
      `<section class="news-next" aria-labelledby="newsNextH">` +
        `<div class="sect-h"><h2 id="newsNextH">${esc(c.next)}</h2><a class="sect-more" href="#/news" data-route>${esc(ctx.t("news.all"))}</a></div>` +
        `<ul class="news-list">${next.map(x => rowHtml(x, "h3")).join("")}</ul>` +
      `</section>`;
  }

  function renderNews(route){
    if (!route.id){ renderIndex(); return true; }
    const n = byId(route.id);
    if (!n) return false;
    renderStory(n);
    return true;
  }

  /* «copy link»: the address of this story; the button says it worked, in place */
  let shareTimer = 0;
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-news-share]");
    if (!b) return;
    const label = b.querySelector("span"), mark = b.querySelector("use");
    const done = () => {
      label.textContent = C().shared; mark.setAttribute("href", SPRITE + "i-check");
      clearTimeout(shareTimer);
      shareTimer = setTimeout(() => {
        if (!b.isConnected) return;
        label.textContent = C().share; mark.setAttribute("href", SPRITE + "i-copy");
      }, 2400);
    };
    /* the address without the prototype's own query (?lang, ?theme) */
    copyText(location.origin + location.pathname + location.hash.split("?")[0]).then(ok => { if (ok) done(); });
  });
  /* the clipboard API needs a secure page and permission; a selected field is the way round */
  async function copyText(text){
    try { await navigator.clipboard.writeText(text); return true; } catch (e){ /* fall through */ }
    const field = document.createElement("textarea");
    field.value = text; field.readOnly = true; field.className = "sr-only";
    document.body.append(field); field.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e){ ok = false; }
    field.remove();
    return ok;
  }

  return { renderNews, has:id => Boolean(byId(id)) };
}
