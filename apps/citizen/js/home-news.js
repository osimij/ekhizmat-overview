/* ============================================================
   Home «news» band — a preview of the latest stories, one at a time:
   topic and date, title and summary on the left, with «read more» and the
   pager in one row under them; the story's illustration on the right. The pager turns the
   story in place and wraps around; nothing turns by itself. «Read more»
   opens the story's page and «all news» the list (news-page.js); the
   stories themselves live in news-data.js.
   ============================================================ */

import { NEWS as ALL_NEWS, newsDay } from "./news-data.js";

/* the band previews the six newest; the list has them all */
const NEWS = ALL_NEWS.slice(0, 6);

const PAGER = {
  prev:{ tg:"Хабари қаблӣ", ru:"Предыдущая новость", en:"Previous story" },
  next:{ tg:"Хабари навбатӣ", ru:"Следующая новость", en:"Next story" }
};
const ICONS = "/design-system/assets/icons.svg";

export function initHomeNews(ctx){
  const grid = document.getElementById("newsGrid");
  if (!grid) return null;
  const { t, esc } = ctx;
  const lang = () => ctx.getLang();
  const say = o => esc(o[lang()] || o.ru);
  const icon = id => `<svg aria-hidden="true" focusable="false"><use href="${ICONS}#${id}"/></svg>`;
  const two = n => String(n).padStart(2, "0");
  let current = 0, warmed = false;

  grid.innerHTML =
    `<div class="news-copy" id="newsCopy" aria-live="polite"></div>` +
    /* the foot: «read more» on the left, the pager on the right, one row */
    `<div class="news-foot">` +
      `<a class="btn btn-sec news-more" id="newsMore" data-route></a>` +
      `<div class="news-pager">` +
        `<button class="btn btn-sec btn--icon" type="button" data-news-step="-1">${icon("i-chev-l")}</button>` +
        `<span class="news-count" id="newsCount"></span>` +
        `<button class="btn btn-sec btn--icon" type="button" data-news-step="1">${icon("i-chev-r")}</button>` +
      `</div>` +
    `</div>` +
    `<span class="news-media" id="newsMedia"></span>`;
  const copy = grid.querySelector("#newsCopy"), media = grid.querySelector("#newsMedia");
  const count = grid.querySelector("#newsCount"), more = grid.querySelector("#newsMore");
  const [prev, next] = grid.querySelectorAll("[data-news-step]");

  function render(){
    const n = NEWS[current];
    copy.innerHTML =
      `<p class="news-meta">${say(n.cat)}</p>` +
      `<h3 class="news-title">${say(n.t)}</h3>` +
      /* the date opens the summary, set off by a quiet bar: when, then what */
      `<p class="news-sum"><time class="news-date" datetime="${n.date}">${newsDay(n.date, lang())}</time><span class="news-bar" aria-hidden="true">|</span>${say(n.s)}</p>`;
    more.href = "#/news/" + n.id;
    more.innerHTML = esc(t("news.more")) + icon("i-chev-r");
    media.innerHTML = `<img src="${n.img}" alt="" width="1280" height="720"${warmed ? "" : ' loading="lazy" decoding="async"'}>`;
    count.textContent = two(current + 1) + " / " + two(NEWS.length);
    prev.setAttribute("aria-label", o(PAGER.prev)); next.setAttribute("aria-label", o(PAGER.next));
  }
  const o = x => x[lang()] || x.ru;

  grid.addEventListener("click", e => {
    const b = e.target.closest("[data-news-step]");
    if (!b) return;
    /* Start loading the other covers on the first turn. */
    if (!warmed){ warmed = true; NEWS.forEach(n => { new Image().src = n.img; }); }
    current = (current + Number(b.dataset.newsStep) + NEWS.length) % NEWS.length;
    render();
  });

  render();
  return { render };
}
