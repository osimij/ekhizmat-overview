/* ============================================================
   Home «questions» and the support sheet. The common questions answer
   first, as one open list; under the band's title one way on for whatever
   they miss — the help guide, or «write to us», which opens the message
   form as a full-viewport sheet (one task on a plain page). The form reads
   the list while the citizen types, so an answer that already exists is one
   click away: it closes the sheet and opens that answer.
   The answers say what the help guide says (service-page.js HELP), in
   fewer words, and link into it for the rest.
   ============================================================ */

/* k: word stems that point a support message at this answer — every
   language's, since people often write in Russian on a Tajik page */
const FAQ = [
  { id:"account", help:"sign-in",
    q:{ tg:"Оё дар портал бақайдгирӣ лозим аст?",
        ru:"Нужно ли регистрироваться на портале?",
        en:"Do I need to register on the portal?" },
    a:{ tg:"Бақайдгирии алоҳида лозим нест: бо рақами телефон ва рамзи SMS ворид шавед ва ҳисоб худкор сохта мешавад. Барои дидани ҳуҷҷатҳо ва аризаҳо шахсияти худро як бор дар маркази хизматрасонӣ ё бо ID-корт тасдиқ мекунед.",
        ru:"Отдельной регистрации нет: войдите по номеру телефона и коду из SMS, и аккаунт создастся сам. Чтобы видеть документы и заявления, один раз подтвердите личность в центре обслуживания или по ID-карте.",
        en:"There's no separate sign-up: sign in with your phone number and the SMS code, and your account is created automatically. To see documents and applications, confirm your identity once, at a service centre or with your ID card." },
    k:{ tg:["бақайд","ҳисоб","вуруд","ворид"], ru:["регистр","аккаунт","учетн","учётн","войти","вход","логин"], en:["regist","sign","account","login","log in"] } },
  { id:"sms", help:"sign-in",
    q:{ tg:"Рамзи SMS намеояд. Чӣ кор кунам?",
        ru:"Не приходит код из SMS. Что делать?",
        en:"The SMS code doesn't arrive. What do I do?" },
    a:{ tg:"Як дақиқа интизор шавед ва дар зери майдони рамз «Аз нав фиристодан»-ро пахш кунед. Санҷед, ки рақам дуруст ворид шудааст. Агар рақами телефон иваз шуда бошад, ба хатти дастгирӣ занг занед.",
        ru:"Подождите минуту и нажмите «Отправить ещё раз» под полем кода. Проверьте, что номер введён без ошибок. Если номер телефона сменился, позвоните на линию поддержки.",
        en:"Wait a minute, then press “Send again” under the code field. Check the number is typed correctly. If your phone number has changed, call the support line." },
    k:{ tg:["рамз","смс","sms","намеояд","наомад"], ru:["код","смс","sms","приход","пришел","пришёл"], en:["code","sms","text message","arriv"] } },
  { id:"cost", help:"pay",
    q:{ tg:"Хизматҳо чанд пул меистанд ва чӣ тавр пардохт кунам?",
        ru:"Сколько стоят услуги и как их оплатить?",
        en:"How much do services cost, and how do I pay?" },
    a:{ tg:"Арзиш дар саҳифаи ҳар хизмат пеш аз ариза нишон дода мешавад; бисёр хизматҳо ройгонанд. Боҷро бо корти бонкӣ ё бонки мобилӣ пардохт мекунед ва квитансияи электронӣ худкор ба идора мерасад.",
        ru:"Стоимость видна на странице каждой услуги ещё до подачи; многие услуги бесплатны. Пошлину можно оплатить картой или через мобильный банк, и электронный чек сам уйдёт в ведомство.",
        en:"Each service page shows the cost before you apply; many services are free. Pay the fee by bank card or mobile banking, and the e-receipt reaches the agency automatically." },
    k:{ tg:["арзиш","пардохт","пул","боҷ","корт","нарх"], ru:["стоим","цен","оплат","плат","пошлин","деньг","карт"], en:["cost","price","pay","fee","card","money"] } },
  { id:"track", help:"track",
    q:{ tg:"Чӣ тавр бифаҳмам, ки аризаам дар кадом марҳила аст?",
        ru:"Как узнать, на каком этапе моё заявление?",
        en:"How do I see where my application is?" },
    a:{ tg:"«Аризаҳои ман»-ро кушоед: дар он ҷо ҳолат, идорае, ки ҳоло бо он кор мекунад, ва санаи интизорӣ ҳаст. Дар бораи ҳар тағйир SMS ва огоҳӣ дар портал меояд.",
        ru:"Откройте «Мои заявления»: там видно статус, ведомство, у которого оно сейчас, и ожидаемую дату. О каждом изменении придёт SMS и уведомление на портале.",
        en:"Open My applications: it shows the status, which agency has it now and the expected date. Each change brings an SMS and a portal notification." },
    k:{ tg:["ҳолат","марҳила","пайгир","куҷо","мӯҳлат"], ru:["статус","этап","отслед","рассмотр","долго","срок"], en:["status","track","stage","where","long","wait"] } },
  { id:"fix", help:"track",
    q:{ tg:"Аризаро барои ислоҳ баргардонданд. Чӣ кор кунам?",
        ru:"Заявление вернули на исправление. Что делать?",
        en:"My application was sent back for changes. What now?" },
    a:{ tg:"Ҳолати «Ислоҳ лозим» маънои онро дорад, ки идора чизеро пурсидааст. Сабабро дар ариза хонед, ислоҳ кунед ва аз нав фиристед. Навбати шумо гум намешавад.",
        ru:"Статус «Нужно исправить» значит, что ведомство что-то уточняет. Прочитайте причину в заявлении, исправьте и отправьте снова. Очередь при этом не теряется.",
        en:"“Needs fixing” means the agency is asking for something. Read the reason in the application, fix it and send it again. You keep your place in the queue." },
    k:{ tg:["ислоҳ","баргардон","рад","хато"], ru:["исправ","вернул","отказ","отклон","ошибк"], en:["fix","sent back","reject","refus","error","mistake"] } },
  { id:"docs", help:"result",
    q:{ tg:"Оё ҳуҷҷатҳои электронӣ мисли коғазӣ эътибор доранд?",
        ru:"Электронные документы действуют так же, как бумажные?",
        en:"Are electronic documents as valid as paper ones?" },
    a:{ tg:"Бале. Ҳуҷҷатҳои «Ҳамёни ҳуҷҷатҳо» мӯҳри электронӣ доранд ва эътибори аслиро доранд. Барои нишон додани ҳуҷҷат QR-ро кушоед: ҳавола 10 дақиқа эътибор дорад ва танҳо ҳамон ҳуҷҷатро мекушояд.",
        ru:"Да. Документы из «Кошелька документов» заверены электронной печатью и имеют силу оригинала. Чтобы показать документ, откройте его QR: ссылка действует 10 минут и открывает только этот документ.",
        en:"Yes. Documents in your Document wallet carry an e-seal and count as originals. To show one, open its QR: the link works for 10 minutes and opens only that document." },
    k:{ tg:["электрон","коғаз","ҳамён","мӯҳр","эътибор","qr"], ru:["электрон","бумаж","оригинал","кошел","печат","действ","qr"], en:["electronic","paper","original","wallet","seal","valid","qr"] } },
  { id:"data", help:null,
    q:{ tg:"Маълумоти шахсии маро кӣ мебинад?",
        ru:"Кто видит мои личные данные?",
        en:"Who can see my personal data?" },
    a:{ tg:"Танҳо идораҳое, ки хизмати шуморо мерасонанд, ва танҳо он чизе, ки барои он лозим аст. Агар бонк ё ташкилоти дигар дастрасӣ пурсад, огоҳӣ мегиред ва худатон иҷозат медиҳед ё рад мекунед.",
        ru:"Только ведомства, которые оказывают вашу услугу, и только то, что для неё нужно. Если банк или другая организация запросит доступ, придёт уведомление, и вы сами решите, разрешить или отказать.",
        en:"Only the agencies providing your service, and only what that service needs. If a bank or another organisation asks for access, you get a notification and decide yourself whether to allow it." },
    k:{ tg:["маълумот","махфи","бехатар","дастрас"], ru:["данн","личн","безопас","конфиденц","доступ","защищ"], en:["data","privacy","personal","secur","access"] } },
  { id:"offline", help:"centres",
    q:{ tg:"Агар смартфон ё интернет надошта бошам, чӣ кор кунам?",
        ru:"Что если у меня нет смартфона или интернета?",
        en:"What if I don't have a smartphone or internet?" },
    a:{ tg:"Ба маркази хизматрасонӣ биёед: корманд дар пур кардани ариза кумак мекунад. Вақтро пешакӣ гиред, то бе навбат қабул шавед.",
        ru:"Приходите в центр обслуживания: сотрудник поможет заполнить заявление. Запишитесь заранее, и вас примут без очереди.",
        en:"Come to a service centre: staff will help you fill in the application. Book a time and you'll be seen without queuing." },
    k:{ tg:["интернет","смартфон","компютер","марказ","шахсан"], ru:["интернет","смартфон","компьютер","центр","лично","офис"], en:["internet","smartphone","computer","centre","center","in person","office"] } }
];

const PHONE_DIGITS = /^\+?[\d\s()-]+$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SEND_MS = 900; /* the demo's pretend round trip, long enough to read «Sending…» */

export function initHomeSupport(ctx){
  const $ = (s, r) => (r || document).querySelector(s);
  const list = $("#faqList");
  const form = $("#supForm");
  if (!list || !form) return null;
  const card = $("#supCard"), body = $("#supBody"), done = $("#supDone");
  const overlay = $("#supOverlay"), opener = $("#supOpen");
  const name = $("#supName"), contact = $("#supContact"), msg = $("#supMsg");
  const send = $("#supSend"), match = $("#supMatch"), matchBtn = $("#supMatchBtn");
  const fields = [name, contact, msg];
  const lang = () => ctx.getLang();
  const pick = o => o[lang()] || o.ru;
  let sending = false, matchTimer = 0, prefilled = null, ticket = "", replyTo = "", sheet = null;

  /* ---------- the questions ---------- */
  function renderFaq(){
    const open = list.querySelector("details[open]")?.dataset.faq;
    list.innerHTML = FAQ.map(f =>
      `<details class="faq-item" name="faq" id="faq-${f.id}" data-faq="${f.id}"${f.id === open ? " open" : ""}>` +
        `<summary><span class="faq-q">${ctx.esc(pick(f.q))}</span>` +
          `<span class="faq-chev" aria-hidden="true"><svg><use href="/design-system/assets/icons.svg#i-chev-d"/></svg></span></summary>` +
        `<div class="faq-a"><p>${ctx.esc(pick(f.a))}</p>` +
          (f.help ? `<a class="faq-more" href="#/help/${f.help}" data-route>${ctx.esc(ctx.t("faq.more"))}</a>` : "") +
        `</div>` +
      `</details>`).join("");
  }
  function openFaq(id){
    const item = $("#faq-" + id);
    if (!item) return;
    item.open = true; /* a named <details> closes its siblings itself */
    const summary = $("summary", item);
    item.scrollIntoView({ block:"center", behavior:ctx.reduceMotion() ? "instant" : "smooth" });
    summary.focus({ preventScroll:true });
  }

  /* ---------- «this may already be answered» ---------- */
  function suggest(text){
    const words = text.toLowerCase().replace(/ё/g, "е").split(/[^\p{L}\p{N}]+/u).filter(w => w.length > 1);
    if (!words.length) return null;
    const flat = " " + words.join(" ") + " ";
    let best = null, bestScore = 0;
    FAQ.forEach(f => {
      const stems = Object.values(f.k).flat().map(s => s.toLowerCase().replace(/ё/g, "е"));
      const score = new Set(stems.filter(s => s.includes(" ") ? flat.includes(" " + s) : words.some(w => w.startsWith(s)))).size;
      if (score > bestScore){ best = f; bestScore = score; }
    });
    return best;
  }
  function syncMatch(){
    const f = suggest(msg.value);
    match.hidden = !f;
    if (!f) return;
    matchBtn.dataset.faq = f.id;
    matchBtn.textContent = pick(f.q);
  }
  /* the answer lives in the list behind the sheet: close it, then open that one */
  matchBtn.addEventListener("click", async () => {
    const id = matchBtn.dataset.faq;
    await closeSheet();
    openFaq(id);
  });

  /* ---------- the sheet ---------- */
  function openSheet(){
    if (sheet) return;
    /* the first field still to fill takes focus: signed in, that is the message */
    const first = fields.find(input => !input.value.trim()) || msg;
    sheet = window.EKHDialog?.openExistingDialog(overlay, {
      initialFocus:"#" + first.id, trigger:opener, closeOnBackdrop:false,
      onClosed:() => { if (!done.hidden) reset(); }
    }) || null;
    if (!sheet){ overlay.classList.add("open"); first.focus(); }
  }
  function closeSheet(){
    const current = sheet;
    sheet = null;
    if (current) return current.close();
    overlay.classList.remove("open");
    if (!done.hidden) reset();
    opener.focus();
    return Promise.resolve();
  }
  opener.addEventListener("click", openSheet);
  $("#supClose").addEventListener("click", closeSheet);
  /* Esc closes through the shared dialog; keep our handle in step with it */
  overlay.addEventListener("keydown", e => { if (e.key === "Escape") sheet = null; });

  /* ---------- validation: said once, on send; cleared as soon as it's right ---------- */
  function problem(input){
    const v = input.value.trim();
    if (input === name) return v ? "" : "sup.err.name";
    if (input === contact){
      if (!v) return "sup.err.contact";
      if (v.includes("@")) return EMAIL.test(v) ? "" : "sup.err.contactFmt";
      const digits = v.replace(/\D/g, "").length;
      return PHONE_DIGITS.test(v) && digits >= 9 && digits <= 12 ? "" : "sup.err.contactFmt";
    }
    return v.split(/\s+/).filter(Boolean).length >= 2 ? "" : "sup.err.msg";
  }
  function paintError(input, key){
    const err = $("#" + input.id + "Err");
    input.dataset.err = key || "";
    input.setAttribute("aria-invalid", String(!!key));
    err.hidden = !key;
    if (key) $("span", err).textContent = ctx.t(key);
  }
  fields.forEach(input => input.addEventListener("input", () => {
    if (input.dataset.err) paintError(input, problem(input));
    if (input === msg){ clearTimeout(matchTimer); matchTimer = setTimeout(syncMatch, 250); }
  }));

  /* ---------- send ---------- */
  form.addEventListener("submit", e => {
    e.preventDefault();
    if (sending) return;
    const bad = fields.map(input => { const key = problem(input); paintError(input, key); return key ? input : null; }).filter(Boolean);
    if (bad.length){ bad[0].focus(); return; }
    sending = true;
    form.setAttribute("aria-busy", "true");
    send.textContent = ctx.t("sup.sending");
    setTimeout(() => {
      sending = false;
      form.removeAttribute("aria-busy");
      send.textContent = ctx.t("sup.send");
      ticket = "SUP-2026-" + String(1000 + Math.floor(Math.random() * 9000));
      replyTo = contact.value.trim();
      /* the card keeps its height, so the page under the pointer doesn't move */
      card.style.minHeight = card.offsetHeight + "px";
      body.hidden = true;
      done.hidden = false;
      paintDone();
      $("#supDoneH").focus({ preventScroll:true });
    }, SEND_MS);
  });
  /* the number and the address never break across lines: each is one thing to read back */
  function paintDone(){
    const values = { id:ticket, to:replyTo };
    $("#supDoneP").replaceChildren(...ctx.t("sup.ok.p").split(/(\{id\}|\{to\})/).filter(Boolean).map(part => {
      const key = part.slice(1, -1);
      if (!(part.startsWith("{") && key in values)) return document.createTextNode(part);
      const span = document.createElement("span");
      span.className = "sup-done__" + key;
      span.textContent = values[key];
      return span;
    }));
  }
  /* a sent message clears for the next one; who is writing stays */
  function reset(){
    msg.value = "";
    match.hidden = true;
    done.hidden = true;
    body.hidden = false;
    card.style.minHeight = "";
  }
  $("#supAgain").addEventListener("click", () => { reset(); msg.focus(); });

  /* ---------- signed in: who is writing is already known ---------- */
  function identity(){
    const id = document.querySelector(".ekh-profile-pop__identity");
    return id ? { name:$("b", id)?.textContent.trim() || "", phone:$("span", id)?.textContent.trim() || "" } : null;
  }
  function syncAuth(){
    const me = ctx.signedIn() ? identity() : null;
    if (me && !prefilled){
      if (!name.value) name.value = me.name;
      if (!contact.value) contact.value = me.phone;
      prefilled = me;
    } else if (!me && prefilled){
      /* signing out takes the profile's details off the page with it */
      if (name.value === prefilled.name) name.value = "";
      if (contact.value === prefilled.phone) contact.value = "";
      prefilled = null;
    }
  }

  function render(){
    renderFaq();
    if (!match.hidden) syncMatch();
    fields.forEach(input => { if (input.dataset.err) paintError(input, input.dataset.err); });
    if (!done.hidden) paintDone();
    if (sending) send.textContent = ctx.t("sup.sending");
  }


  return { render, syncAuth };
}
