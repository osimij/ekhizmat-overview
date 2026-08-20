const icon = name => `<svg aria-hidden="true"><use href="/design-system/assets/icons.svg#${name}"/></svg>`;

export const GUEST_CATALOG = [
  { id:"gov", label:{tg:"Марказҳои хизматрасонӣ",ru:"Центры обслуживания",en:"Service centres"}, chip:{tg:"Марказҳо",ru:"Центры",en:"Centres"}, subs:[{ label:null, items:[
    ["Сабти қабул дар марказ", "Марказҳои хизматрасонӣ", 0, "Запись на приём в центр", "Центры обслуживания", "guest-appointment"],
    ["Машварат оид ба интихоби хизмат", "eKhizmat", 0, "Консультация по выбору услуги", "eKhizmat", "guest-info"]
  ]}]},
  { id:"docs", label:{tg:"Ҳуҷҷатҳо ва маълумотномаҳо",ru:"Документы и справки",en:"Documents & certificates"}, chip:{tg:"Ҳуҷҷатҳо",ru:"Документы",en:"Documents"}, subs:[{ label:null, items:[
    ["Рӯйхати ҳуҷҷатҳо барои ID-корт", "Вазорати корҳои дохилӣ", 0, "Список документов для ID-карты", "Министерство внутренних дел", "guest-info"],
    ["Санҷиши омодагии ҳуҷҷат", "eKhizmat", 0, "Проверка готовности документа", "eKhizmat", "guest-info"]
  ]}]},
  { id:"consult", label:{tg:"Машваратҳо",ru:"Консультации",en:"Consultations"}, chip:{tg:"Машварат",ru:"Консультации",en:"Consultations"}, subs:[{ label:null, items:[
    ["Феҳристи маълумотномаҳои дастрас", "eKhizmat", 0, "Каталог доступных справок", "eKhizmat", "guest-info"],
    ["Меъёрҳои умумии андоз", "Кумитаи андоз", 0, "Общие налоговые ставки", "Налоговый комитет", "guest-info"]
  ]}]},
  { id:"help", label:{tg:"Муроҷиатҳо ва кумак",ru:"Обращения и помощь",en:"Requests & help"}, chip:{tg:"Кумак",ru:"Помощь",en:"Help"}, subs:[{ label:null, items:[
    ["Ҷойгиршавии шуъбаҳои БДА", "БДА", 0, "Адреса отделений ГАИ", "ГАИ", "guest-info"],
    ["Саволҳои маъмул", "eKhizmat", 0, "Частые вопросы", "eKhizmat", "guest-info"]
  ]}]}
];

const COPY = {
  tg:{
    guest:"Меҳмон", login:"Ворид шудан", guestStrip:"Шумо бе воридшавӣ хизматҳоро мебинед. Танҳо хизматҳои бе маълумоти шахсӣ дастрасанд.",
    accessible:"Дастрас бе воридшавӣ", back:"Бозгашт", guestTitle:"Сабти қабул дар марказ", guestLead:"Танҳо маълумоти зарурӣ барои сабт. Маълумоти шахсӣ дар кабинет нигоҳ дошта намешавад.",
    center:"Марказ", choose:"Интихоб кунед", sino:"Маркази ноҳияи Сино", firdavsi:"Маркази ноҳияи Фирдавсӣ", date:"Сана", dateHint:"рӯз.моҳ.сол", email:"Почтаи электронӣ барои талон", emailHelp:"Талони намунавӣ ба ин суроға фиристода мешавад.", consent:"Розӣ ҳастам, ки ин маълумот барои сохтани талони намоишӣ истифода шавад.", make:"Сохтани талон", required:"Марказ, сана ва почтаи дурустро пур кунед.", success:"Демо-заявка сформирована", successText:"Талони намоишӣ омода аст. Барои идора кардани аризаҳои шахсӣ ворид шавед.", home:"Ба саҳифаи асосӣ",
    appsLead:"Ҳамаи аризаҳои шумо ва ҳолати ҳозираи онҳо.", allApps:"Ҳамаи аризаҳо", applications:"Аризаҳо", app:"ариза", status:"Ҳолат", all:"Ҳама", emptyApps:"Ба ин филтр ягон ариза мувофиқ нест.", devEmpty:"Намоиши ҳолати холӣ", restore:"Барқарор кардан", reason:"Сабаби радкунӣ", history:"Таърихи шаффоф", received:"Қабул шуд", checked:"Санҷиши худкор гузашт", updated:"Ҳолат нав шуд", open:"Кушодан", ref:"ариза", submitted:"Фиристода шуд", review:"Дар баррасӣ", action:"Ислоҳ лозим", approved:"Тасдиқ шуд", rejected:"Рад шуд", completed:"Иҷро шуд", expired:"Муҳлат гузашт", draft:"Сиёҳнавис", agency:"Идора", type:"Навъи ариза", reset:"Филтрҳоро тоза кардан", results:"{n} ариза", newest:"Аввал навтарин", currentAgency:"Ҳоло дар", expected:"интизорӣ то", trackTitle:"Дар баррасӣ", trackLead:"Роҳи хизмат ва идораи масъулро пайгирӣ кунед.", submittedStage:"Фиристода", autoStage:"Санҷиши худкор", reviewStage:"Баррасии идора", issueStage:"Додани натиҷа", doneStage:"Анҷом",
    kpiAll:"Ҳама", kpiActive:"Дар баррасӣ", kpiAction:"Ислоҳ лозим", kpiDone:"Иҷро шуд",
    activeTitle:"Дар ҷараён", fix:"Ислоҳ кардан", resultInWallet:"Натиҷа дар ҳамён", resend:"Такроран фиристодан",
    fixToast:"Дар версияи намоишӣ ислоҳ дастрас нест.", resendToast:"Ариза такроран фиристода шуд (намоишӣ).",
    toPay:"Ба пардохт", paidTotal:"Пардохт шуд", payNow:"Пардохт кардан", payDone:"Пардохт иҷро шуд (намоишӣ).", noPending:"Ҳисоби пардохтнашуда нест.",
    payments:"Пардохтҳои ман", paymentsLead:"Сана ва ҳолати ҳамаи пардохтҳо дар як ҷо.", issued:"Содир шуд", paid:"Пардохт шуд", attempted:"Кӯшиш шуд", pending:"Интизори пардохт", failed:"Хатои пардохт", receipt:"Квитансия", retry:"Такроран пардохт кардан", electronicReceipt:"Квитансияи электронӣ", payment:"Пардохт", service:"Хизмат", application:"Ариза", receivingAgency:"Идораи қабулкунанда", payer:"Пардохткунанда", paymentDate:"Санаи пардохт", method:"Тарзи пардохт", amount:"Маблағ", fee:"Комиссия", total:"Ҳамагӣ", transaction:"Рақами амалиёт", cardMethod:"Алиф мобайл · корт ···· 4821", download:"PDF-ро боргирӣ кардан",
    filesEmpty:"Ҳоло ҳуҷҷати гирифташуда нест — онҳо пас аз анҷоми хизмат пайдо мешаванд.", fileOpen:"Кушодан", fileDownload:"Боргирӣ", birthFile:"Шаҳодатномаи таваллуд — Зарина", receiptFile:"Квитансияи боҷи давлатӣ", newBadge:"нав",
    childrenLead:"Дар ин ҷо танҳо фарзандони то 18-сола нишон дода мешаванд. Ҳамсар ва падару модар ҳисобҳои худро доранд.", children:"Фарзандон", addChild:"Илова кардани фарзанд", childDocs:"Ҳуҷҷатҳо дар ҳамён", childEmpty:"Ҳоло фарзанд пайваст нест.", childName:"Ному насаб", childDob:"Санаи таваллуд", childDocument:"Рақами шаҳодатнома ё ҳуҷҷат", childRelation:"Робита бо довталаб", parent:"Падар ё модар", guardian:"Сарпараст", childSub:"Танҳо фарзандони то 18-сола метавонанд ба кабинети шумо пайваст шаванд.", childAdult:"Шахси 18-сола ё калонтар бояд ҳисоби шахсии худро истифода барад.", childRequired:"Ҳамаи майдонҳои ҳатмиро пур кунед.", childAdded:"Фарзанд ба кабинети намоишӣ илова шуд.", add:"Илова кардан", close:"Пӯшидан",
    bioTitle:"Вуруд бо шинохти чеҳра", bioOff:"Барои ин дастгоҳ омода нест", bioOn:"Фаъол · танҳо дар ин дастгоҳ", setup:"Танзим кардан", remove:"Хомӯш кардан", demo:"Намоишӣ · камера истифода намешавад", look:"Ба маркази чорчӯба нигоҳ кунед", noCamera:"Ин аниматсияи намунавӣ аст ва камераро намекушояд.", start:"Оғоз", scanning:"Санҷиши намунавӣ…", scanOk:"Шинохти чеҳра фаъол шуд", scanOkHint:"Ҳангоми вуруди нав метавонед ин роҳро истифода баред.", scanFail:"Шинохтан муяссар нашуд", scanFailHint:"Равшаниро санҷед ва бори дигар кӯшиш кунед.", showError:"Намоиши хатогӣ", twoOn:"Фаъол", twoOff:"Хомӯш", twoDefault:"бо нобаёнӣ фаъол", twoH:"Вуруди дуқадамаро хомӯш мекунед?", twoText:"Ин ҳифзи ҳисобро кам мекунад. Шумо метавонед онро ҳар вақт дубора фаъол кунед.", turnOff:"Хомӯш кардан", keep:"Нигоҳ доштан"
  },
  ru:{
    guest:"Гость", login:"Войти", guestStrip:"Вы просматриваете услуги без входа. Доступны только услуги без персональных данных.",
    accessible:"Доступно без входа", back:"Назад", guestTitle:"Запись на приём в центр", guestLead:"Только данные, необходимые для записи. Персональные данные не сохраняются в кабинете.",
    center:"Центр", choose:"Выберите", sino:"Центр района Сино", firdavsi:"Центр района Фирдавси", date:"Дата", dateHint:"дд.мм.гггг", email:"Электронная почта для талона", emailHelp:"Демо-талон будет отправлен на этот адрес.", consent:"Согласен использовать эти данные для создания демонстрационного талона.", make:"Создать талон", required:"Заполните центр, дату и корректную почту.", success:"Демо-заявка сформирована", successText:"Демо-талон готов. Войдите, чтобы управлять личными заявлениями.", home:"На главную",
    appsLead:"Все ваши заявления и их текущий статус.", allApps:"Все заявления", applications:"Заявления", app:"заявлений", status:"Статус", all:"Все", emptyApps:"Нет заявлений, соответствующих этим фильтрам.", devEmpty:"Показать пустое состояние", restore:"Восстановить", reason:"Причина отказа", history:"Прозрачная история", received:"Получено", checked:"Автопроверка пройдена", updated:"Статус обновлён", open:"Открыть", ref:"заявление", submitted:"Отправлено", review:"На рассмотрении", action:"Нужно исправить", approved:"Одобрено", rejected:"Отклонено", completed:"Выполнено", expired:"Срок истёк", draft:"Черновик", agency:"Ведомство", type:"Тип заявления", reset:"Сбросить фильтры", results:"{n} заявлений", newest:"Сначала новые", currentAgency:"Сейчас в", expected:"ожидается до", trackTitle:"На рассмотрении", trackLead:"Следите за маршрутом услуги и ответственным ведомством.", submittedStage:"Подано", autoStage:"Автопроверка", reviewStage:"Проверка ведомства", issueStage:"Выдача результата", doneStage:"Готово",
    kpiAll:"Все", kpiActive:"На рассмотрении", kpiAction:"Нужно исправить", kpiDone:"Выполнено",
    activeTitle:"В работе", fix:"Исправить", resultInWallet:"Результат в кошельке", resend:"Отправить повторно",
    fixToast:"В демоверсии исправление недоступно.", resendToast:"Заявление отправлено повторно (демо).",
    toPay:"К оплате", paidTotal:"Оплачено", payNow:"Оплатить", payDone:"Платёж выполнен (демо).", noPending:"Неоплаченных начислений нет.",
    payments:"Мои платежи", paymentsLead:"Дата и статус каждого платежа в одном месте.", issued:"Выставлен", paid:"Оплачен", attempted:"Попытка", pending:"Ожидает оплаты", failed:"Ошибка оплаты", receipt:"Чек", retry:"Повторить платёж", electronicReceipt:"Электронный чек", payment:"Платёж", service:"Услуга", application:"Заявление", receivingAgency:"Ведомство-получатель", payer:"Плательщик", paymentDate:"Дата оплаты", method:"Способ оплаты", amount:"Сумма", fee:"Комиссия", total:"Итого", transaction:"Номер транзакции", cardMethod:"Алиф мобайл · карта ···· 4821", download:"Скачать PDF",
    filesEmpty:"Полученных документов пока нет — они появятся после завершения услуг.", fileOpen:"Открыть", fileDownload:"Скачать", birthFile:"Свидетельство о рождении — Зарина", receiptFile:"Квитанция госпошлины", newBadge:"новый",
    childrenLead:"Здесь показываются только дети до 18 лет. Супруги и родители используют собственные аккаунты.", children:"Дети", addChild:"Добавить ребёнка", childDocs:"Документы в кошельке", childEmpty:"Пока ни один ребёнок не подключён.", childName:"Имя и фамилия", childDob:"Дата рождения", childDocument:"Номер свидетельства или документа", childRelation:"Связь с заявителем", parent:"Родитель", guardian:"Опекун", childSub:"К кабинету можно подключить только ребёнка младше 18 лет.", childAdult:"Человек 18 лет или старше должен использовать собственный аккаунт.", childRequired:"Заполните все обязательные поля.", childAdded:"Ребёнок добавлен в демонстрационный кабинет.", add:"Добавить", close:"Закрыть",
    bioTitle:"Вход по распознаванию лица", bioOff:"Не настроено для этого устройства", bioOn:"Включено · только на этом устройстве", setup:"Настроить", remove:"Отключить", demo:"Демо · камера не используется", look:"Посмотрите в центр рамки", noCamera:"Это демонстрационная анимация — камера не включается.", start:"Начать", scanning:"Демонстрационная проверка…", scanOk:"Распознавание лица включено", scanOkHint:"Теперь этот способ доступен при новом входе.", scanFail:"Не удалось распознать лицо", scanFailHint:"Проверьте освещение и попробуйте ещё раз.", showError:"Показать ошибку", twoOn:"Включено", twoOff:"Выключено", twoDefault:"включено по умолчанию", twoH:"Отключить двухэтапный вход?", twoText:"Это снизит защиту аккаунта. Его можно включить снова в любое время.", turnOff:"Отключить", keep:"Оставить"
  }
};
COPY.en = COPY.ru;

const appNames = {
  tg:["Нав кардани ID-корт","Шиносномаи хориҷӣ","Маълумотномаи доғи судӣ","Қайди ҷои истиқомат","Нусхаи шаҳодатномаи таваллуд","Шаҳодатномаи таваллуди Зарина","Кумакпулӣ барои кӯдак","Аризаи ақди никоҳ","Иваз кардани шаҳодатномаи ронандагӣ","Сабти воситаи нақлиёт","Шикоят аз ҷаримаи роҳ","Иқтибос аз феҳристи манзил","Қайди қитъаи замин","Маълумотномаи андоз","Санҷиши қарзи андоз барои давраи гузашта","Кумакпулии бекорӣ"],
  ru:["Обновление ID-карты","Заграничный паспорт","Справка о несудимости","Регистрация места жительства","Копия свидетельства о рождении","Свидетельство о рождении Зарины","Пособие на ребёнка","Заявление о браке","Замена водительского удостоверения","Регистрация транспорта","Обжалование дорожного штрафа","Выписка из реестра жилья","Регистрация земельного участка","Налоговая справка","Проверка налоговой задолженности за предыдущий период","Пособие по безработице"]
};
appNames.en = appNames.ru;
const statusSequence = ["review","submitted","completed","action","expired","review","approved","completed","completed","rejected","submitted","action","approved","review","draft","rejected"];
const agencySequence = ["mvd","mvd","mvd","mvd","zags","zags","social","zags","gai","gai","gai","housing","land","tax","tax","social"];
const AGENCIES = {
  mvd:{tg:"ВКД",ru:"МВД",en:"MVD"},zags:{tg:"САҲШ",ru:"ЗАГС",en:"Civil Registry"},gai:{tg:"БДА",ru:"ГАИ",en:"Traffic Police"},
  tax:{tg:"Кумитаи андоз",ru:"Налоговый комитет",en:"Tax Committee"},land:{tg:"Кумитаи замин",ru:"Земельный комитет",en:"Land Committee"},housing:{tg:"Феҳристи манзил",ru:"Реестр жилья",en:"Housing Registry"},social:{tg:"Агентии ҳифзи иҷтимоӣ",ru:"Агентство соцзащиты",en:"Social Protection Agency"}
};

function statusClass(status){ return ({completed:"success",approved:"success",rejected:"danger",action:"warning",expired:"neutral",review:"info",submitted:"info",draft:"neutral",paid:"success",pending:"warning",failed:"danger",enabled:"success",disabled:"danger"})[status] || "neutral"; }
function statusIcon(status,label){ const tone=statusClass(status),iconName=({completed:'i-check',approved:'i-check',rejected:'i-x',action:'i-edit',expired:'i-clock',review:'i-clock',submitted:'i-clock',draft:'i-edit',paid:'i-check',pending:'i-clock',failed:'i-x',enabled:'i-check',disabled:'i-x'})[status]||'i-dots';return `<span class="status-icon status-icon--${tone}" role="img" aria-label="${label}" title="${label}">${icon(iconName)}</span>`; }
/* The runtime has no tg-TJ calendar data, so Intl rendered 8/12/2026 (US order)
   on a Tajik page. Dates are ours to format: dd.mm.yyyy in rows, a month table
   where a long date reads better (WP7.7). */
const MONTHS = {
  tg:["январ","феврал","март","апрел","май","июн","июл","август","сентябр","октябр","ноябр","декабр"],
  ru:["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"],
  en:["January","February","March","April","May","June","July","August","September","October","November","December"]
};
const pad2 = n => String(n).padStart(2, "0");
function asDate(value){ return value instanceof Date ? value : new Date(value); }
function formatDate(value){
  const d = asDate(value);
  return Number.isNaN(d.getTime()) ? "" : `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
}
const shortDate = value => String(value).split(".").slice(0, 2).join(".");
function formatLongDate(value, lang){
  const d = asDate(value);
  if (Number.isNaN(d.getTime())) return "";
  const months = MONTHS[lang] || MONTHS.tg;
  return lang === "en" ? `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
                       : `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
/* the four KPI cards group statuses the way a citizen thinks about them */
function statusGroup(status){
  if (status === "submitted" || status === "review") return "active";
  if (status === "action") return "action";
  if (status === "approved" || status === "completed") return "done";
  return status;
}
function matchesStatus(app, filter){
  if (filter === "all") return true;
  if (filter === "active" || filter === "action" || filter === "done") return statusGroup(app.status) === filter;
  return app.status === filter;
}

function ageOnToday(value){
  const dob = new Date(`${value}T00:00:00`); if (Number.isNaN(dob.getTime())) return NaN;
  const now = new Date(); let age = now.getFullYear() - dob.getFullYear();
  const beforeBirthday = now.getMonth() < dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate());
  return age - (beforeBirthday ? 1 : 0);
}

export function initCitizenExpansion(ctx){
  const $ = (s,r=document) => r.querySelector(s);
  const $$ = (s,r=document) => Array.from(r.querySelectorAll(s));
  const query = new URLSearchParams(location.search);
  const STATUS_FILTERS = ["all","active","action","done","rejected","draft","expired"];
  /* filters come from the router, which accepts them before or after the hash */
  const readFilter = (key, allowed) => {
    const raw = ctx.readParam ? ctx.readParam(key, "all") : query.get(key);
    return raw && (!allowed || allowed.includes(raw)) ? raw : "all";
  };
  const isDev = query.has("dev");
  const state = { appView:"list", status:readFilter("status", STATUS_FILTERS), agency:readFilter("agency"), selected:null,
                  appsEmpty:false, childrenEmpty:false, children:[{name:"Зарина Раҳимова",dob:"2026-06-08"}],
                  biometric:false, twoFactor:true, owner:"me", journeyComplete:false, selectedPayment:null, paidPending:false };
  const text = () => COPY[ctx.getLang()] || COPY.tg;
  const appList = () => appNames[ctx.getLang()].map((name,i) => {
    const updatedAt=new Date(2026,7,12-i,14-(i%5),10);
    const createdAt=new Date(updatedAt.getTime()-(i%3)*86400000);
    const status=statusSequence[i], stage=status==='submitted'?1:status==='review'||status==='action'?2:status==='approved'?3:status==='completed'?4:0;
    return {id:`TJ-2026-${184302-i*317}`,name,type:`service-${i+1}`,status,agency:agencySequence[i],agencyLabel:AGENCIES[agencySequence[i]]?.[ctx.getLang()]||agencySequence[i],createdAt:createdAt.toISOString(),updatedAt:updatedAt.toISOString(),date:formatDate(updatedAt),stage,currentAgency:AGENCIES[agencySequence[i]]?.[ctx.getLang()]||agencySequence[i],eta:i<5?'13.08.2026':'16.08.2026',reason:i===9||i===15?(ctx.getLang()==="tg"?"Ҳуҷҷати тасдиқкунанда замима нашудааст.":"Не приложен подтверждающий документ."):""};
  }).sort((a,b)=>Math.max(Date.parse(b.createdAt),Date.parse(b.updatedAt))-Math.max(Date.parse(a.createdAt),Date.parse(a.updatedAt)));
  let openHandle = null;
  function openOverlay(overlay,focus){
    openHandle = window.EKHDialog?.openExistingDialog(overlay,{initialFocus:focus,trigger:document.activeElement}) || null;
    if(!openHandle){ overlay.classList.add("open"); $(focus,overlay)?.focus(); }
  }
  function closeOverlay(overlay){ if(openHandle){openHandle.close();openHandle=null;} else overlay.classList.remove("open"); }

  /* ---------- Applications: one list view and one detail view (WP7) ----------
     The category chooser is gone: reaching an application is one click from the
     profile. The four KPI cards are the shortcuts that used to be a hub, and
     they set the same status filter the dropdown does (§3 KPI canon, rule 10). */
  const KPI_CARDS = [
    { key:"all",    label:"kpiAll" },
    { key:"active", label:"kpiActive" },
    { key:"action", label:"kpiAction" },
    { key:"done",   label:"kpiDone" }
  ];
  function filterSelect(key, label, iconName, options){
    return `<div class="ekh-filter"><span class="ekh-filter__label">${icon(iconName)}<span>${label}</span></span>` +
      `<span class="ekh-filter__field"><select data-app-filter="${key}" aria-label="${label}">${options}</select>` +
      `${icon("i-chev-d")}</span></div>`;
  }
  function applicationRow(a, c){
    return `<button class="application-row" data-app-id="${a.id}" data-updated-at="${a.updatedAt}">` +
      `<span class="application-row__text"><b title="${a.name}">${a.name}</b>` +
      `<small>${a.agencyLabel} · №${a.id} · ${a.date}</small></span>` +
      `${statusIcon(a.status, c[a.status])}${icon("i-chev-r")}</button>`;
  }
  function activeStrip(apps, c){
    /* Up to three single-line rows. Progress detail belongs in the detail view,
       not in a five-step mini stepper on a card (rule 22). */
    const active = apps.filter(a => statusGroup(a.status) === "active" || a.status === "action").slice(0, 3);
    if (!active.length) return "";
    return `<section class="app-active" aria-labelledby="appActiveH">` +
      `<h3 id="appActiveH" class="app-active__title">${c.activeTitle}</h3>` +
      active.map(a => `<button class="app-active__row" data-app-id="${a.id}">` +
        `<span class="app-active__name">${a.name}</span>` +
        `<span class="app-active__meta">${a.currentAgency} · ${c.expected} ${shortDate(a.eta)}</span>` +
        `${statusIcon(a.status, c[a.status])}${icon("i-chev-r")}</button>`).join("") +
      `</section>`;
  }
  function detailActions(a, c){
    if (a.status === "action") return `<button class="btn btn-pri" data-app-fix="${a.id}">${c.fix}</button>`;
    if (a.status === "completed" || a.status === "approved") return `<button class="btn btn-sec" data-app-wallet>${c.resultInWallet}</button>`;
    if (a.status === "rejected") return `<button class="btn btn-sec" data-app-resend="${a.id}">${c.resend}</button>`;
    return "";
  }
  function renderApplications(){
    const root = $("#applicationsRoot"); if(!root) return;
    const c=text(), apps=appList();
    const devBtn = isDev ? `<button class="btn btn-ghost btn-sm" data-app-action="empty">${c.devEmpty}</button>` : "";
    if(state.appsEmpty){
      root.innerHTML=`<div class="empty-state"><span class="empty-state__icon">${icon("i-doc")}</span><h3>${c.emptyApps}</h3><button class="btn btn-sec" data-app-action="restore">${c.restore}</button></div>`;
      return;
    }
    if(state.appView==="detail"){
      const a=apps.find(x=>x.id===state.selected);
      if(!a){ state.appView="list"; renderApplications(); return; }
      const stages=[c.submittedStage,c.autoStage,c.reviewStage,c.issueStage,c.doneStage];
      const actions=detailActions(a,c);
      root.innerHTML=`<article class="application-detail"><div class="application-detail__head"><div>` +
        `<span class="eyebrow">${a.agencyLabel}</span><h2>${a.name}</h2><p class="muted">${c.ref} №${a.id} · ${a.date}</p></div>` +
        `${statusIcon(a.status,c[a.status])}</div>` +
        `<div class="application-path"><span>${icon('i-building')}</span><div><small>${c.currentAgency}</small><strong>${a.currentAgency}</strong><small>${c.expected} ${a.eta}</small></div></div>` +
        `<h3>${c.history}</h3><ol class="application-history">` +
        stages.map((label,index)=>`<li class="${index<a.stage?'done':index===a.stage?'current':''}">` +
          `<span>${icon(index<a.stage?'i-check':index===a.stage?'i-clock':'i-dots')}</span>` +
          `<div><b>${label}</b><small>${index<=a.stage?`${a.date}, ${String(9+index).padStart(2,'0')}:1${index}`:'—'}</small></div></li>`).join('') +
        `</ol>` +
        (a.reason?`<div class="note-warn note-warn--reason"><svg aria-hidden="true"><use href="/design-system/assets/icons.svg#i-info"/></svg><p><b>${c.reason}</b> ${a.reason}</p></div>`:"") +
        (actions?`<div class="application-actions">${actions}</div>`:"") +
        `</article>`;
      return;
    }
    const filtered=apps.filter(a=>matchesStatus(a,state.status)&&(state.agency==='all'||a.agency===state.agency));
    const agencies=[...new Map(apps.map(a=>[a.agency,a.agencyLabel])).entries()];
    const counts={all:apps.length,active:0,action:0,done:0};
    apps.forEach(a=>{ const g=statusGroup(a.status); if(counts[g]!==undefined) counts[g]+=1; });
    const kpis=KPI_CARDS.map(card=>`<button class="app-kpi" data-app-status="${card.key}" aria-pressed="${state.status===card.key}">` +
      `<strong>${counts[card.key]}</strong><span>${c[card.label]}</span></button>`).join("");
    const statusOptions=STATUS_FILTERS.map(key=>{
      const label=key==="all"?c.all:key==="active"?c.kpiActive:key==="action"?c.kpiAction:key==="done"?c.kpiDone:c[key];
      return `<option value="${key}" ${state.status===key?'selected':''}>${label}</option>`;
    }).join("");
    const agencyOptions=`<option value="all">${c.all}</option>`+agencies.map(([id,label])=>`<option value="${id}" ${state.agency===id?'selected':''}>${label}</option>`).join('');
    root.innerHTML=`<div class="pane-heading applications-heading"><div><h2>${c.applications}</h2><p class="lead-s">${c.appsLead}</p></div>${devBtn}</div>` +
      `<div class="app-kpis">${kpis}</div>` +
      `<div class="application-filter-panel">${filterSelect('status',c.status,'i-filter',statusOptions)}${filterSelect('agency',c.agency,'i-building',agencyOptions)}</div>` +
      (state.status==='all'&&state.agency==='all'?activeStrip(apps,c):"") +
      `<p class="app-results" role="status" aria-live="polite">${c.results.replace('{n}',filtered.length)} · ${c.newest}</p>` +
      (filtered.length?`<div class="application-list">${filtered.map(a=>applicationRow(a,c)).join("")}</div>`
        :`<div class="empty-state"><span class="empty-state__icon">${icon("i-search")}</span><h3>${c.emptyApps}</h3><button class="btn btn-sec" data-app-action="reset">${c.reset}</button></div>`);
  }

  /* filter state lives in the URL, merged with the router's hash (§7) */
  function syncApplicationQuery(){
    ctx.syncQuery?.({ status:state.status, agency:state.agency });
  }

  /* One pending bill, one story: the transport tax the home aside shows is the
     same record the pane lists, so the two can never disagree again (WP9.2). */
  const payments = () => {
    const tg = ctx.getLang()==='tg';
    return [
      {id:'PAY-2026-000143',app:'АН-44213',service:tg?'Андози нақлиёт барои соли 2026':'Транспортный налог за 2026 год',agency:tg?'Кумитаи андоз':'Налоговый комитет',status:state.paidPending?'paid':'pending',amount:86.40,date:state.paidPending?'12.08.2026':'06.08.2026',time:state.paidPending?'10:24':'09:10',transaction:'TXN-260812-441003',note:true},
      {id:'PAY-2026-000098',app:'TJ-2026-179908',service:tg?'Сабти соҳибкори инфиродӣ':'Регистрация индивидуального предпринимателя',agency:tg?'Кумитаи андоз':'Налоговый комитет',status:'paid',amount:35,date:'04.08.2026',time:'14:32',transaction:'TXN-240804-883104'},
      {id:'PAY-2026-000072',app:'TJ-2026-176421',service:tg?'Маълумотномаи андоз':'Налоговая справка',agency:tg?'Кумитаи андоз':'Налоговый комитет',status:'failed',amount:20,date:'04.08.2026',time:'11:05'}
    ];
  };
  const money = value => `${new Intl.NumberFormat(ctx.getLang()==='en'?'en-US':'ru-RU',{minimumFractionDigits:2,maximumFractionDigits:2}).format(value)} ${ctx.getLang()==='en'?'TJS':'смн.'}`;
  const pendingItems = () => payments().filter(p=>p.status==='pending');
  const pendingTotal = () => pendingItems().reduce((sum,p)=>sum+p.amount,0);
  const paidTotal = () => payments().filter(p=>p.status==='paid').reduce((sum,p)=>sum+p.amount,0);
  function payPending(){
    if(!pendingItems().length) return;
    state.paidPending=true;
    renderPayments();
    renderPayCard();
    ctx.toastText(text().payDone);
  }
  /* the home aside reads from the same source as the pane — never a second story */
  function renderPayCard(){
    const card=$("#payCard"); if(!card) return;
    const c=text(), pending=pendingItems()[0];
    card.hidden=!pending;
    const row=$("#feedPayRow"), empty=$("#feedPayEmpty");
    if(row) row.hidden=!pending;
    if(empty) empty.hidden=Boolean(pending);
    const badge=$("#ftab-pay .fbadge");
    if(badge){ badge.textContent=String(pendingItems().length); badge.hidden=!pending; }
    if(!pending) return;
    $("#paySum").textContent=money(pending.amount);
    $("#payLabel").textContent=pending.service;
  }
  function paymentActions(p,c){
    if(p.status==='pending') return `<button class="btn btn-pri btn-sm" data-pay-pending>${c.payNow}</button>`;
    if(p.status==='paid') return `<button class="btn btn-sec btn-sm" data-receipt-id="${p.id}">${icon('i-doc')}${c.receipt}</button>`;
    if(p.status==='failed') return `<button class="btn btn-sec btn-sm" data-retry-payment="${p.id}">${icon('i-refresh')}${c.retry}</button>`;
    return '';
  }
  function renderPayments(){
    const root=$("#paymentsRoot");if(!root)return;const c=text();
    const due=pendingTotal();
    root.innerHTML=`<div class="pane-heading"><div><h2>${c.payments}</h2><p class="lead-s">${c.paymentsLead}</p></div></div>` +
      `<div class="app-kpis pay-kpis"><div class="app-kpi"><strong>${due?money(due):money(0)}</strong><span>${c.toPay}</span></div>` +
      `<div class="app-kpi"><strong>${money(paidTotal())}</strong><span>${c.paidTotal}</span></div></div>` +
      `<div class="payment-list">${payments().map(p=>`<article class="payment-item"><div class="payment-item__main"><div>` +
        `<span class="eyebrow">${p.id}</span><h3>${p.service}</h3><p>${c.application} №${p.app} · ${p.agency}</p></div>` +
        `<strong class="payment-amount">${money(p.amount)}</strong></div>` +
        `<div class="payment-item__foot"><div>${statusIcon(p.status,c[p.status])}` +
        `<span class="payment-date">${p.status==='paid'?c.paid:p.status==='pending'?c.issued:c.attempted} ${p.date}, ${p.time}</span></div>` +
        `<div>${paymentActions(p,c)}</div></div></article>`).join('')}</div>`;
  }

  function openReceipt(id){
    const p=payments().find(item=>item.id===id);if(!p)return;const c=text(),root=$("#receiptRoot");state.selectedPayment=id;
    root.innerHTML=`<div class="receipt-head"><span class="eyebrow">${c.electronicReceipt}</span><h3 id="receiptH">${p.id}</h3></div><div class="receipt-rows"><div class="rv"><span class="k">${c.service}</span><span class="v">${p.service}</span></div><div class="rv"><span class="k">${c.application}</span><span class="v">№${p.app}</span></div><div class="rv"><span class="k">${c.receivingAgency}</span><span class="v">${p.agency}</span></div><div class="rv"><span class="k">${c.payer}</span><span class="v">Фируза Раҳимова</span></div><div class="rv"><span class="k">${c.paymentDate}</span><span class="v">${p.date}, ${p.time}</span></div><div class="rv"><span class="k">${c.method}</span><span class="v">${c.cardMethod}</span></div><div class="rv"><span class="k">${c.amount}</span><span class="v">${money(p.amount)}</span></div><div class="rv"><span class="k">${c.fee}</span><span class="v">${money(0)}</span></div><div class="rv receipt-total"><span class="k">${c.total}</span><span class="v">${money(p.amount)}</span></div></div><div class="receipt-fiscal"><div><small>${c.transaction}</small><strong>${p.transaction}</strong></div><svg id="receiptQr" viewBox="0 0 29 29" shape-rendering="crispEdges" aria-label="QR"></svg></div>`;
    ctx.renderQr?.($("#receiptQr"),p.transaction);openOverlay($("#receiptOverlay"),'#receiptClose');
  }

  const downloadStub=(name,lines)=>{const blob=new Blob([lines.join('\n')],{type:'application/pdf'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  function receivedFiles(){const c=text();return state.journeyComplete?[{id:'birth-file',owner:'kids',title:c.birthFile,format:'PDF',meta:'САҲШ · 12.08.2026 · 284 КБ · бемӯҳлат',new:true},{id:'fee-receipt',owner:'me',title:c.receiptFile,format:'PDF',meta:`${ctx.getLang()==='tg'?'Кумитаи андоз':'Налоговый комитет'} · 12.08.2026 · 96 КБ`,new:true}]:[];}
  function renderFiles(){const root=$("#receivedFilesRoot");if(!root)return;const c=text(),files=receivedFiles().filter(f=>f.owner===state.owner);root.innerHTML=files.length?`<div class="received-file-list">${files.map(f=>`<article class="received-file-row"><span class="format-tile format-tile--${f.format.toLowerCase()}">${f.format}</span><div><h3>${f.title}${f.new?` <span class="badge-new">${c.newBadge}</span>`:''}</h3><p>${f.meta}</p></div><div class="received-file-actions"><button class="btn btn-ghost btn-sm" data-file-open="${f.id}">${c.fileOpen}</button><button class="btn btn-sec btn-sm" data-file-download="${f.id}">${icon('i-download')}${c.fileDownload}</button></div></article>`).join('')}</div>`:`<div class="empty-state received-empty"><span class="empty-state__icon">${icon('i-doc')}</span><p>${c.filesEmpty}</p></div>`;return files.length;}

  function renderChildren(){
    const root=$("#childrenRoot"); if(!root)return; const c=text();
    const children=state.childrenEmpty?[]:state.children;
    root.innerHTML=`<div class="pane-heading"><div><h2>${c.children}</h2><p class="lead-s">${c.childrenLead}</p></div><div class="pane-actions">${isDev?`<button class="btn btn-ghost btn-sm" data-child-action="empty">${state.childrenEmpty?c.restore:c.devEmpty}</button>`:''}<button class="btn btn-pri" data-child-action="add">${icon("i-plus")}<span>${c.addChild}</span></button></div></div>${children.length?`<div class="plist">${children.map(ch=>`<div class="pr"><span class="pav earth" aria-hidden="true">${ch.name.slice(0,1)}</span><div class="tt"><span class="v">${ch.name}</span><span class="k">${formatLongDate(`${ch.dob}T00:00:00`, ctx.getLang())}</span></div><button class="btn btn-sec btn-sm act" data-go="wallet" data-own="kids">${c.childDocs}</button></div>`).join("")}</div>`:`<div class="empty-state"><span class="empty-state__icon">${icon("i-cat-family")}</span><h3>${c.childEmpty}</h3><button class="btn btn-pri" data-child-action="add">${c.addChild}</button></div>`}`;
  }

  function renderStaticCopy(){
    const c=text();
    const pairs={acctGuestLabel:c.guest,guestStripBadge:c.guest,guestStripText:c.guestStrip,guestLoginBtn:c.login,guestBack:c.back,guestServiceBadge:c.accessible,guestServiceTitle:c.guestTitle,guestServiceLead:c.guestLead,guestCenterLabel:c.center,guestDateLabel:c.date,guestDateHelp:c.dateHint,familyDobHelp:c.dateHint,guestEmailLabel:c.email,guestEmailHelp:c.emailHelp,guestConsentText:c.consent,guestSubmit:c.make,guestSuccessTitle:c.success,guestSuccessText:c.successText,guestSuccessHome:c.home,guestSuccessLogin:c.login,childH:c.addChild,childSub:c.childSub,familyNameLabel:c.childName,familyDobLabel:c.childDob,familyDocumentLabel:c.childDocument,familyRelationLabel:c.childRelation,childSave:c.add,childCancel:c.close,biometricTitle:c.bioTitle,biometricSubtitle:state.biometric?c.bioOn:c.bioOff,biometricSetup:state.biometric?c.remove:c.setup,biometricDemoBadge:c.demo,biometricH:c.bioTitle,biometricScanTitle:c.look,biometricScanHint:c.noCamera,biometricStart:c.start,biometricFail:c.showError,biometricClose:c.close,twoFactorStatus:state.twoFactor?c.twoOn:c.twoOff,twoFactorDefault:c.twoDefault,twoFactorH:c.twoH,twoFactorText:c.twoText,twoFactorConfirm:c.turnOff,twoFactorCancel:c.keep};
    Object.entries(pairs).forEach(([id,value])=>{const el=$(`#${id}`);if(el)el.textContent=value;});
    const options=$$("#guestCenter option"); if(options[0])options[0].textContent=c.choose;if(options[1])options[1].textContent=c.sino;if(options[2])options[2].textContent=c.firdavsi;
    const relations=$$("#familyRelation option");if(relations[0])relations[0].textContent=c.choose;if(relations[1])relations[1].textContent=c.parent;if(relations[2])relations[2].textContent=c.guardian;
    renderApplications();renderChildren();renderPayments();renderPayCard();renderFiles();
  }

  function setGuestSubmit(){ const form=$("#guestServiceForm"); $("#guestSubmit").disabled=!(form.checkValidity()&&$("#guestConsent").checked); }
  $("#guestServiceForm")?.addEventListener("input",setGuestSubmit);
  $("#guestServiceForm")?.addEventListener("change",setGuestSubmit);
  $("#guestServiceForm")?.addEventListener("submit",e=>{e.preventDefault();const c=text();if(!e.currentTarget.checkValidity()||!$("#guestConsent").checked){$("#guestFormError").textContent=c.required;$("#guestFormError").hidden=false;return;}$("#guestFormError").hidden=true;e.currentTarget.hidden=true;$("#guestServiceSuccess").hidden=false;$("#guestServiceSuccess h2").focus?.();});
  $("#guestLoginBtn")?.addEventListener("click",ctx.openLogin);$("#guestSuccessLogin")?.addEventListener("click",ctx.openLogin);

  $("#applicationsRoot")?.addEventListener("click",e=>{
    const id=e.target.closest("[data-app-id]");
    const st=e.target.closest("[data-app-status]");
    const action=e.target.closest("[data-app-action]");
    const fix=e.target.closest("[data-app-fix]");
    const resend=e.target.closest("[data-app-resend]");
    const wallet=e.target.closest("[data-app-wallet]");
    if(fix){ ctx.toastText(text().fixToast); return; }
    if(resend){ ctx.toastText(text().resendToast); return; }
    if(wallet){ ctx.go("wallet","me"); return; }
    if(id){ ctx.openApp(id.dataset.appId); return; }
    if(st){ state.status=st.dataset.appStatus; syncApplicationQuery(); renderApplications(); return; }
    if(action){
      const a=action.dataset.appAction;
      if(a==="empty") state.appsEmpty=true;
      if(a==="restore") state.appsEmpty=false;
      if(a==="reset"){ state.status="all"; state.agency="all"; syncApplicationQuery(); }
      renderApplications();
    }
  });
  $("#applicationsRoot")?.addEventListener("change",e=>{
    const filter=e.target.closest('[data-app-filter]');if(!filter)return;
    const key=filter.dataset.appFilter;
    state[key]=filter.value;
    syncApplicationQuery();
    renderApplications();
    /* a re-render must not drop the keyboard: focus returns to the control just used (§9) */
    $(`[data-app-filter="${key}"]`)?.focus();
  });
  document.addEventListener("click",e=>{
    if(!e.target.closest('[data-pay-pending]'))return;
    payPending();
  });
  $("#paymentsRoot")?.addEventListener("click",e=>{const receipt=e.target.closest('[data-receipt-id]');const retry=e.target.closest('[data-retry-payment]');if(receipt)openReceipt(receipt.dataset.receiptId);else if(retry)ctx.toastText(text().retry);});
  $("#receiptClose")?.addEventListener('click',()=>closeOverlay($("#receiptOverlay")));
  $("#receiptOverlay")?.addEventListener('click',e=>{if(e.target===e.currentTarget)closeOverlay(e.currentTarget);});
  $("#receiptDownload")?.addEventListener('click',()=>{const p=payments().find(item=>item.id===state.selectedPayment);if(p)downloadStub(`${p.id}.pdf`,[text().electronicReceipt,p.id,p.transaction,money(p.amount)]);});
  $("#receivedFilesRoot")?.addEventListener('click',e=>{const open=e.target.closest('[data-file-open]');const download=e.target.closest('[data-file-download]');const file=receivedFiles().find(item=>item.id===(open?.dataset.fileOpen||download?.dataset.fileDownload));if(!file)return;if(open)ctx.openReceivedFile?.(file);else downloadStub(`${file.id}.pdf`,[file.title,file.meta]);});
  $("#childrenRoot")?.addEventListener("click",e=>{const b=e.target.closest("[data-child-action]");if(!b)return;if(b.dataset.childAction==="empty"){state.childrenEmpty=!state.childrenEmpty;renderChildren();}else{$("#childForm").reset();$("#childError").hidden=true;openOverlay($("#childOverlay"),"#familyName");}});
  $("#childCancel")?.addEventListener("click",()=>closeOverlay($("#childOverlay")));
  $("#childForm")?.addEventListener("submit",e=>{e.preventDefault();const c=text(),name=$("#familyName").value.trim(),dob=$("#familyDob").value,documentNo=$("#familyDocument").value.trim(),relation=$("#familyRelation").value,age=ageOnToday(dob);if(!name||!dob||!documentNo||!relation||Number.isNaN(age)){$("#childError").textContent=c.childRequired;$("#childError").hidden=false;return;}if(age>=18||age<0){$("#childError").textContent=c.childAdult;$("#childError").hidden=false;return;}state.children.push({name,dob,documentNo,relation});state.childrenEmpty=false;closeOverlay($("#childOverlay"));renderChildren();ctx.toastText(c.childAdded);});

  $("#twoFactorToggle")?.addEventListener("change",e=>{if(!e.target.checked){e.target.checked=true;openOverlay($("#twoFactorOverlay"),"#twoFactorCancel");}else{state.twoFactor=true;renderStaticCopy();}});
  $("#twoFactorCancel")?.addEventListener("click",()=>closeOverlay($("#twoFactorOverlay")));
  $("#twoFactorConfirm")?.addEventListener("click",()=>{state.twoFactor=false;$("#twoFactorToggle").checked=false;closeOverlay($("#twoFactorOverlay"));renderStaticCopy();});
  function resetScan(){const scan=$("#biometricScan"),c=text();scan.className="facescan facescan--idle";$("#biometricScanTitle").textContent=c.look;$("#biometricScanHint").textContent=c.noCamera;$("#biometricStart").hidden=false;}
  $("#biometricSetup")?.addEventListener("click",()=>{if(state.biometric){state.biometric=false;renderStaticCopy();return;}resetScan();openOverlay($("#biometricOverlay"),"#biometricStart");});
  $("#biometricStart")?.addEventListener("click",()=>{const scan=$("#biometricScan"),c=text();scan.className="facescan facescan--scanning";$("#biometricScanTitle").textContent=c.scanning;$("#biometricStart").hidden=true;setTimeout(()=>{scan.className="facescan facescan--success";state.biometric=true;renderStaticCopy();$("#biometricScanTitle").textContent=c.scanOk;$("#biometricScanHint").textContent=c.scanOkHint;},window.matchMedia("(prefers-reduced-motion: reduce)").matches?50:1500);});
  $("#biometricFail")?.addEventListener("click",()=>{const scan=$("#biometricScan"),c=text();scan.className="facescan facescan--error";$("#biometricScanTitle").textContent=c.scanFail;$("#biometricScanHint").textContent=c.scanFailHint;$("#biometricStart").hidden=false;});
  $("#biometricClose")?.addEventListener("click",()=>closeOverlay($("#biometricOverlay")));
  ["#childOverlay","#twoFactorOverlay","#biometricOverlay"].forEach(sel=>$(sel)?.addEventListener("click",e=>{if(e.target===e.currentTarget)closeOverlay(e.currentTarget);}));

  renderStaticCopy();setGuestSubmit();
  return {
    render:renderStaticCopy,
    setOwner(owner){state.owner=owner;return renderFiles();},
    completeBabyJourney(){state.journeyComplete=true;renderFiles();},
    /* the route decides which application view is on screen */
    openApplication(id){
      const next=id?"detail":"list";
      if(state.appView===next&&state.selected===(id||null))return;
      state.appView=next;state.selected=id||null;renderApplications();
    },
    pendingTotal,
    resetGuestFlow(){ $("#guestServiceForm").reset();$("#guestServiceForm").hidden=false;$("#guestServiceSuccess").hidden=true;setGuestSubmit(); }
  };
}
