/* ============================================================
   Home «news» band — a preview of the latest stories, one at a time:
   topic and date, title and summary on the left, with «read more» and the
   pager in one row under them; the story's illustration on the right. The pager turns the
   story in place and wraps around; nothing turns by itself.
   ============================================================ */

import presidentDayCover from "../assets/news/president-day.webp";
import amonatbankCover from "../assets/news/amonatbank.webp";
import civilRegistryCover from "../assets/news/civil-registry.webp";
import tajTechCover from "../assets/news/taj-tech.webp";
import inspectionCover from "../assets/news/inspection.webp";
import mobileAppCover from "../assets/news/mobile-app.webp";

const NEWS = [
  { id:"president-day", date:"2026-11-16", img:presidentDayCover,
    cat:{ tg:"Рӯйдодҳо", ru:"События", en:"Events" },
    t:{ tg:"16 ноябр: Рӯзи Президенти Ҷумҳурии Тоҷикистон",
        ru:"16 ноября: День Президента Республики Таджикистан",
        en:"16 November: Day of the President of the Republic of Tajikistan" },
    s:{ tg:"16 ноябр дар Тоҷикистон Рӯзи Президенти Ҷумҳурии Тоҷикистон ҷашн гирифта мешавад. Ин сана бо рӯйдодҳои муҳими таърихи муосири кишвар, таҳкими давлатдорӣ, ваҳдати миллӣ ва истиқлолият алоқаманд аст.",
        ru:"16 ноября в Таджикистане отмечается День Президента Республики Таджикистан. Эта дата связана с важными событиями современной истории страны, укреплением государственности, национального единства и независимости.",
        en:"On 16 November Tajikistan marks the Day of the President of the Republic of Tajikistan. The date is tied to key events in the country's modern history and to the strengthening of statehood, national unity and independence." } },
  { id:"amonatbank", date:"2026-11-12", img:amonatbankCover,
    cat:{ tg:"Ҳамкорӣ", ru:"Сотрудничество", en:"Partnership" },
    t:{ tg:"Амонатбонк ва ҶСК «Марказҳои тасдиқкунанда, хизматҳои давлатӣ ва таҳияи барномаҳои рақамӣ» дастрасии шаҳрвандонро ба хизматҳои давлатии электронӣ васеъ мекунанд",
        ru:"Амонатбанк и ОАО «Удостоверяющие центры, государственные услуги и разработка цифровых программ» расширят доступ граждан к электронным госуслугам",
        en:"Amonatbank and OJSC “Certification Centres, Public Services and Digital Software Development” will widen citizens' access to online public services" },
    s:{ tg:"Ҷонибҳо ташкили машваратҳоро дар филиалҳои Амонатбонк муҳокима карданд. Дар он ҷо шаҳрвандон дар насби барномаи мобилии eKhizmat, гузаштан аз мушаххасгардонӣ тавассути ИМЗО ва пешниҳоди аризаҳои электронӣ кумак мегиранд.",
        ru:"Стороны обсудили организацию консультаций в отделениях Амонатбанка. Там граждане смогут получить помощь в установке мобильного приложения eKhizmat, прохождении идентификации через ИМЗО и подаче электронных заявлений.",
        en:"The parties discussed setting up consultations in Amonatbank branches. There, citizens will get help installing the eKhizmat mobile app, verifying their identity through IMZO and filing applications online." } },
  { id:"civil-registry", date:"2026-11-05", img:civilRegistryCover,
    cat:{ tg:"Оила ва фарзандон", ru:"Семья и дети", en:"Family & children" },
    t:{ tg:"Дар eKhizmat хизматҳои нави сабти асноди ҳолати шаҳрвандӣ пайдо шуданд",
        ru:"На eKhizmat появились новые услуги ЗАГС",
        en:"New civil registry services on eKhizmat" },
    s:{ tg:"Дар бахши «Оила ва фарзандон» хизматҳои электронии бақайдгирии таваллуд, ақди никоҳ ва бекор кардани он, инчунин фавт дастрасанд. Барои истифодаи онҳо дар портал сабти ном шавед ва шахсияти худро тасдиқ кунед.",
        ru:"В разделе «Семья и дети» доступны электронные услуги по регистрации рождения, заключения и расторжения брака, а также смерти. Для их использования необходимо зарегистрироваться на портале и подтвердить личность.",
        en:"Under Family & children you can now register a birth, a marriage, a divorce and a death online. To use these services, sign up on the portal and confirm your identity." } },
  { id:"taj-tech", date:"2026-10-22", img:tajTechCover,
    cat:{ tg:"Рақамикунонӣ", ru:"Цифровизация", en:"Digitalisation" },
    t:{ tg:"Форуми байналмилалии технологии Тоҷикистон",
        ru:"Международный технологический форум Таджикистана",
        en:"Tajikistan International Technology Forum" },
    s:{ tg:"ҶСК «Марказҳои тасдиқкунанда, хизматҳои давлатӣ ва таҳияи барномаҳои рақамӣ» дар TAJ-TECH 2026 ҳамкориро дар соҳаи рақамикунонӣ васеъ мекунад.",
        ru:"ОАО «Удостоверяющие центры, государственные услуги и разработка цифровых программ» расширяет сотрудничество в сфере цифровизации на TAJ-TECH 2026.",
        en:"OJSC “Certification Centres, Public Services and Digital Software Development” is expanding its cooperation on digitalisation at TAJ-TECH 2026." } },
  { id:"inspection", date:"2026-09-11", img:inspectionCover,
    cat:{ tg:"Нақлиёт", ru:"Транспорт", en:"Transport" },
    t:{ tg:"Аз 15 сентябр талони муоинаи техникӣ танҳо тавассути Портали ягонаи хизматҳои давлатӣ eKhizmat.tj расмӣ карда мешавад",
        ru:"С 15 сентября талон техосмотра будет оформляться только через Единый портал государственных услуг eKhizmat.tj",
        en:"From 15 September, vehicle inspection tickets are issued only through the Unified Public Services Portal eKhizmat.tj" },
    s:{ tg:"Аз 15 сентябри соли 2026 талонҳои муоинаи техникии воситаҳои нақлиёт танҳо дар шакли электронӣ тавассути Портали ягонаи хизматҳои давлатӣ eKhizmat.tj расмӣ карда мешаванд.",
        ru:"С 15 сентября 2026 года талоны технического осмотра транспортных средств будут оформляться исключительно в электронном виде через Единый портал государственных услуг eKhizmat.tj.",
        en:"From 15 September 2026, vehicle inspection tickets are issued only electronically, through the Unified Public Services Portal eKhizmat.tj." } },
  { id:"mobile-app", date:"2026-09-01", img:mobileAppCover,
    cat:{ tg:"Барнома", ru:"Приложение", en:"App" },
    t:{ tg:"Барномаи мобилии eKhizmat",
        ru:"Мобильное приложение eKhizmat",
        en:"The eKhizmat mobile app" },
    s:{ tg:"Акнун гирифтани хизматҳои давлатӣ боз ҳам осонтар шуд! Барномаи eKhizmat-ро насб кунед ва ҳуҷҷатҳоро расмӣ кунед, ариза диҳед, боҷҳоро бевосита аз смартфон пардохт кунед: дар ҳар вақт, бе навбат ва бе рафтан ба идораҳо.",
        ru:"Теперь получать государственные услуги стало ещё проще! Скачайте приложение eKhizmat и оформляйте документы, подавайте заявления, оплачивайте сборы прямо со смартфона: в любое время, без очередей и визитов в ведомства.",
        en:"Getting public services is now even easier! Install the eKhizmat app to get documents, file applications and pay fees right from your smartphone: any time, with no queues and no visits to agencies." } }
];

const MONTHS = {
  tg:["январи","феврали","марти","апрели","майи","июни","июли","августи","сентябри","октябри","ноябри","декабри"],
  ru:["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"],
  en:["January","February","March","April","May","June","July","August","September","October","November","December"]
};

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
      `<button class="btn btn-sec news-more" id="newsMore" type="button" data-toast="toast.demo"></button>` +
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

  function day(iso){
    const [y, m, d] = iso.split("-").map(Number);
    return d + " " + MONTHS[lang()][m - 1] + " " + y;
  }

  function render(){
    const n = NEWS[current];
    /* «read more» opens the demo notice until the news page exists */
    copy.innerHTML =
      `<p class="news-meta">${say(n.cat)}</p>` +
      `<h3 class="news-title">${say(n.t)}</h3>` +
      /* the date opens the summary, set off by a quiet bar: when, then what */
      `<p class="news-sum"><time class="news-date" datetime="${n.date}">${day(n.date)}</time><span class="news-bar" aria-hidden="true">|</span>${say(n.s)}</p>`;
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
