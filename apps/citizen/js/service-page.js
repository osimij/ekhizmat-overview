/* ============================================================
   Service overview, catalogue search and the help guide.
   A citizen must be able to answer three questions before pressing
   Apply: is this the right service, what do I need, and what happens
   next (design-guide §3 «Citizen service page»). The registry
   (services-data.js) gives each service a name, an agency and whether it
   is paid; the essentials below are derived from those facts, and a few
   everyday services carry a hand-written profile on top.
   ============================================================ */

const SPRITE = "/design-system/assets/icons.svg#";
const icon = (name, cls) => `<svg${cls ? ` class="${cls}"` : ""} aria-hidden="true"><use href="${SPRITE}${name}"/></svg>`;
const SUPPORT_PHONE = { href:"tel:+992446607177", text:"+992 44 660-71-77" };

const COPY = {
  tg:{
    crumbs:"Роҳи саҳифа", home:"Асосӣ", agency:"Идора",
    fResult:"Шумо мегиред", fCost:"Арзиш", fTime:"Муҳлат", fDocs:"Ҳуҷҷатҳо лозим",
    free:"Ройгон", paid:"Боҷи давлатӣ", paidNote:"маблағ пеш аз пардохт нишон дода мешавад",
    docsNote:"Нусха лозим нест — маълумотро аз феҳрист худамон мегирем",
    wallet:"ба ҳамёни ҳуҷҷатҳо меояд", centre:"аз маркази хизматрасонӣ мегиред",
    apply:"Ариза додан",
    applyOut:"Онлайн, тақрибан {m} дақиқа. Бо рақами телефон ворид мешавед — ҳисоб бори аввал худкор сохта мешавад.",
    applyIn:"Онлайн, тақрибан {m} дақиқа. Маълумоти шумо аз профил пур мешавад.",
    inPersonH:"Дар маркази хизматрасонӣ", inPersonP:"Бо шиноснома биёед. Вақтро пешакӣ гиред — бе навбат қабул мешавед.", inPersonCta:"Вақт гирифтан",
    helpH:"Савол доред?", helpHow:"Чӣ тавр ариза додан", helpLine:"Хатти дастгирӣ",
    nextH:"Пас аз ариза чӣ мешавад", moreH:"Тафсилот", relatedH:"Хизматҳои монанд",
    stepApply:"Ариза медиҳед — тақрибан {m} дақиқа", stepApplyP:"Маълумоти шахсӣ аз профил пур мешавад — танҳо месанҷед.",
    stepPay:"Боҷро онлайн пардохт мекунед", stepPayP:"Бо корт ё бонки мобилӣ. Квитансия ба идора худкор мерасад.",
    stepReview:"Идора месанҷад — {time}", stepReviewP:"Ҳолатро дар «Аризаҳои ман» мебинед, дар бораи ҳар тағйир SMS меояд.",
    stepAuto:"Санҷиши худкор — дарҳол", stepAutoP:"Система маълумотро бо феҳристҳо месанҷад; ба идора рафтан лозим нест.",
    stepWallet:"Натиҷа ба ҳамёни ҳуҷҷатҳо меояд", stepWalletP:"Ҳуҷҷати электронӣ бо мӯҳри электронӣ эътибори аслиро дорад.",
    stepCollect:"Ҳуҷҷатро аз марказ мегиред", stepCollectP:"Вақте омода шавад, SMS меояд. Шиносномаатонро гиред.",
    stepVisit:"Як бор ба марказ меоед", stepVisitP:"Сурат ва изи ангуштон — тақрибан 15 дақиқа, дар вақти интихобкардаатон.",
    stepStation:"Мошинро ба нуқтаи муоина меоред", stepStationP:"Натиҷаи муоина ба ариза худкор илова мешавад.",
    whoH:"Кӣ метавонад ариза диҳад",
    whoPerson:"Шаҳрвандони Ҷумҳурии Тоҷикистон аз 18-солагӣ — барои худ. Барои кӯдак падар, модар ё сарпараст ариза медиҳад; барои шахси дигар — бо ваколатномаи нотариалӣ.",
    whoBiz:"Шахсони ҳуқуқӣ ва соҳибкорони инфиродии ба қайд гирифташуда. Аризаро роҳбар ё намояндаи дорои ваколатнома медиҳад.",
    reqH:"Талабот ба ҳуҷҷатҳо",
    reqP:"Ҳуҷҷатҳо бояд эътибор дошта бошанд. Нусхаҳоро бор кардан лозим нест — портал маълумотро аз феҳристҳои давлатӣ худ мегирад. Агар ҳуҷҷат дар феҳрист набошад, акс ё PDF-и онро то 10 МБ замима мекунед.",
    payH:"Пардохт",
    payP:"Маблағи боҷ дар қадами охир, пеш аз пардохт, нишон дода мешавад. Пардохт бо корти бонкӣ ё бонки мобилӣ; квитансия дар «Пардохтҳои ман» мемонад. Агар ариза ба баррасӣ қабул нашавад, маблағ бармегардад.",
    refuseH:"Агар рад кунанд",
    refuseP:"Сабаби радкуниро дар «Аризаҳои ман» мебинед. Аксар вақт кофист камбудиро ислоҳ карда, аризаро аз нав фиристед. Агар бо қарор розӣ набошед, метавонед ба мақомоти болоӣ ё ба суд шикоят кунед.",
    legalH:"Асоси ҳуқуқӣ", legalNote:"Регламенти пурраи хизмат дар Феҳристи ягонаи хизматҳои давлатӣ.",
    searchOften:"Зуд-зуд меҷӯянд", searchServices:"Хизматҳо",
    helpTitle:"Кумак", helpLead:"Ҷавобҳои кӯтоҳ ба саволҳои маъмул — аз ёфтани хизмат то гирифтани натиҷа.", toc:"Мундариҷа",
    bookVisit:"Вақт гирифтан"
  },
  ru:{
    crumbs:"Навигационная цепочка", home:"Главная", agency:"Ведомство",
    fResult:"Вы получите", fCost:"Стоимость", fTime:"Срок", fDocs:"Нужны документы",
    free:"Бесплатно", paid:"Госпошлина", paidNote:"сумма видна до оплаты",
    docsNote:"Копии не нужны — данные возьмём из реестра сами",
    wallet:"придёт в кошелёк документов", centre:"забираете в центре обслуживания",
    apply:"Подать заявление",
    applyOut:"Онлайн, около {m} минут. Вход по номеру телефона — при первом входе аккаунт создаётся сам.",
    applyIn:"Онлайн, около {m} минут. Данные подставятся из вашего профиля.",
    inPersonH:"В центре обслуживания", inPersonP:"Приходите с паспортом. Запишитесь заранее — примут без очереди.", inPersonCta:"Записаться",
    helpH:"Есть вопросы?", helpHow:"Как подать заявление", helpLine:"Линия поддержки",
    nextH:"Что будет после подачи", moreH:"Подробнее", relatedH:"Похожие услуги",
    stepApply:"Подаёте заявление — около {m} минут", stepApplyP:"Личные данные подставятся из профиля — останется проверить.",
    stepPay:"Оплачиваете пошлину онлайн", stepPayP:"Картой или через мобильный банк. Чек сам уйдёт в ведомство.",
    stepReview:"Ведомство рассматривает — {time}", stepReviewP:"Статус виден в «Моих заявлениях», о каждом изменении придёт SMS.",
    stepAuto:"Автоматическая проверка — сразу", stepAutoP:"Система сверит данные с реестрами; идти в ведомство не нужно.",
    stepWallet:"Результат придёт в кошелёк документов", stepWalletP:"Электронный документ с электронной печатью имеет силу оригинала.",
    stepCollect:"Забираете документ в центре", stepCollectP:"Когда будет готов, придёт SMS. Возьмите с собой паспорт.",
    stepVisit:"Один раз приходите в центр", stepVisitP:"Фото и отпечатки пальцев — около 15 минут, в выбранное вами время.",
    stepStation:"Проходите осмотр на пункте техосмотра", stepStationP:"Результат осмотра сам добавится к заявлению.",
    whoH:"Кто может подать",
    whoPerson:"Граждане Таджикистана с 18 лет — за себя. За ребёнка подаёт родитель или опекун; за другого человека — по нотариальной доверенности.",
    whoBiz:"Зарегистрированные юридические лица и индивидуальные предприниматели. Подаёт руководитель или представитель по доверенности.",
    reqH:"Требования к документам",
    reqP:"Документы должны быть действительны. Загружать копии не нужно — портал сам получит данные из госреестров. Если документа в реестре нет, приложите фото или PDF до 10 МБ.",
    payH:"Оплата",
    payP:"Сумма пошлины видна на последнем шаге, до оплаты. Платите картой или через мобильный банк; чек сохранится в «Моих платежах». Если заявление не примут к рассмотрению, деньги вернутся.",
    refuseH:"Если откажут",
    refuseP:"Причину отказа вы увидите в «Моих заявлениях». Чаще всего достаточно исправить недочёт и отправить заявление снова. Если не согласны с решением, его можно обжаловать в вышестоящем органе или в суде.",
    legalH:"Правовое основание", legalNote:"Полный регламент услуги — в Едином реестре государственных услуг.",
    searchOften:"Часто ищут", searchServices:"Услуги",
    helpTitle:"Помощь", helpLead:"Короткие ответы на частые вопросы — от поиска услуги до получения результата.", toc:"Содержание",
    bookVisit:"Записаться"
  },
  en:{
    crumbs:"Breadcrumb", home:"Home", agency:"Agency",
    fResult:"You receive", fCost:"Cost", fTime:"Processing time", fDocs:"You need",
    free:"Free", paid:"State fee", paidNote:"amount shown before you pay",
    docsNote:"No copies needed — we fetch the data from registers",
    wallet:"arrives in your document wallet", centre:"collected at a service centre",
    apply:"Apply",
    applyOut:"Online, about {m} minutes. You sign in with your phone number — an account is created on first sign-in.",
    applyIn:"Online, about {m} minutes. Your details come from your profile.",
    inPersonH:"At a service centre", inPersonP:"Bring your ID. Book a time and you'll be seen without queuing.", inPersonCta:"Book a visit",
    helpH:"Questions?", helpHow:"How to apply", helpLine:"Support line",
    nextH:"What happens after you apply", moreH:"Details", relatedH:"Similar services",
    stepApply:"You apply — about {m} minutes", stepApplyP:"Your details are filled in from your profile — you just check them.",
    stepPay:"You pay the fee online", stepPayP:"By card or mobile banking. The receipt reaches the agency automatically.",
    stepReview:"The agency reviews it — {time}", stepReviewP:"Follow it in My applications; you get an SMS at every change.",
    stepAuto:"Automatic check — immediately", stepAutoP:"The system checks your data against the registers; no office visit needed.",
    stepWallet:"The result arrives in your document wallet", stepWalletP:"With its e-seal, the electronic document counts as the original.",
    stepCollect:"You collect the document at a centre", stepCollectP:"We'll text you when it's ready. Bring your ID.",
    stepVisit:"You visit a centre once", stepVisitP:"Photo and fingerprints — about 15 minutes, at a time you choose.",
    stepStation:"You take the car to an inspection station", stepStationP:"The inspection result is added to your application automatically.",
    whoH:"Who can apply",
    whoPerson:"Citizens of Tajikistan aged 18 or over, for themselves. A parent or guardian applies for a child; for anyone else you need a notarised power of attorney.",
    whoBiz:"Registered companies and sole proprietors. The director or an authorised representative applies.",
    reqH:"Document requirements",
    reqP:"Documents must be valid. You don't upload copies — the portal fetches the data from state registers. If a document isn't in a register, attach a photo or PDF of it, up to 10 MB.",
    payH:"Payment",
    payP:"The fee is shown on the last step, before you pay. Pay by bank card or mobile banking; the receipt stays in My payments. If the application isn't accepted for review, the money is returned.",
    refuseH:"If you're refused",
    refuseP:"You'll see the reason in My applications. Usually it's enough to fix the issue and send the application again. If you disagree with the decision, you can appeal to the higher authority or to a court.",
    legalH:"Legal basis", legalNote:"The full service regulation is in the Unified Register of State Services.",
    searchOften:"Popular searches", searchServices:"Services",
    helpTitle:"Help", helpLead:"Short answers to common questions — from finding a service to getting the result.", toc:"Contents",
    bookVisit:"Book a visit"
  }
};

/* processing time: one vocabulary, so «up to 3 working days» reads the same on every page */
const TIMES = {
  instant:{tg:"Фавран, онлайн",ru:"Сразу, онлайн",en:"Instantly, online"},
  d1:{tg:"1 рӯзи корӣ",ru:"1 рабочий день",en:"1 working day"},
  d3:{tg:"То 3 рӯзи корӣ",ru:"До 3 рабочих дней",en:"Up to 3 working days"},
  d5:{tg:"То 5 рӯзи корӣ",ru:"До 5 рабочих дней",en:"Up to 5 working days"},
  d10:{tg:"То 10 рӯзи корӣ",ru:"До 10 рабочих дней",en:"Up to 10 working days"},
  d15:{tg:"То 15 рӯзи корӣ",ru:"До 15 рабочих дней",en:"Up to 15 working days"},
  d30:{tg:"То 30 рӯз",ru:"До 30 дней",en:"Up to 30 days"}
};

/* what the citizen walks away with, read from the registry name */
const KINDS = {
  certificate:{ result:{tg:"Маълумотномаи электронӣ",ru:"Электронная справка",en:"Electronic certificate"}, time:"d3", minutes:5, delivery:"wallet" },
  permit:{ result:{tg:"Иҷозат",ru:"Разрешение",en:"Permit"}, time:"d10", minutes:10, delivery:"wallet" },
  license:{ result:{tg:"Иҷозатнома",ru:"Лицензия",en:"Licence"}, time:"d15", minutes:20, delivery:"wallet" },
  registration:{ result:{tg:"Сабт дар феҳрист ва шаҳодатнома",ru:"Запись в реестре и свидетельство",en:"Register entry and certificate"}, time:"d5", minutes:10, delivery:"wallet" },
  document:{ result:{tg:"Ҳуҷҷат дар варақаи расмӣ",ru:"Документ на бланке",en:"Official document"}, time:"d10", minutes:10, delivery:"centre" },
  decision:{ result:{tg:"Қарори идора",ru:"Решение ведомства",en:"Agency decision"}, time:"d30", minutes:15, delivery:"wallet" }
};
const KIND_RULES = [
  [/лицензи/i, "license"],
  [/^(справк|выписк|информаци|сведени|копи)/i, "certificate"],
  [/паспорт|удостоверени|аттестат|диплом/i, "document"],
  [/регистрац|учет|учёт|постановк|внесени/i, "registration"],
  [/разрешени|талон|допуск|согласовани|заключени|сертификат|виз[аы]/i, "permit"]
];

const DOCS = {
  id:{tg:"Шиноснома ё ID-корт",ru:"Паспорт или ID-карта",en:"Passport or ID card"},
  directorId:{tg:"Шиносномаи роҳбар",ru:"Паспорт руководителя",en:"Director's ID"},
  bizReg:{tg:"Шаҳодатномаи бақайдгирии давлатӣ",ru:"Свидетельство о госрегистрации",en:"State registration certificate"},
  licenseReq:{tg:"Ҳуҷҷатҳо оид ба мутобиқат ба талабот",ru:"Документы о соответствии требованиям",en:"Proof of meeting the requirements"},
  vehicle:{tg:"Шаҳодатномаи қайди нақлиёт",ru:"Техпаспорт",en:"Vehicle registration certificate"},
  property:{tg:"Ҳуҷҷати ҳуқуқ ба амвол",ru:"Документ о праве на имущество",en:"Property title document"},
  civil:{tg:"Шаҳодатномаҳои САҲШ",ru:"Свидетельства ЗАГС",en:"Civil registry certificates"},
  edu:{tg:"Ҳуҷҷат дар бораи таҳсилот",ru:"Документ об образовании",en:"Education document"},
  oldPassport:{tg:"Шиносномаи кӯҳна, агар бошад",ru:"Старый паспорт, если есть",en:"Your old passport, if you have one"},
  parentsId:{tg:"Шиносномаҳои падару модар",ru:"Паспорта родителей",en:"Both parents' IDs"},
  marriage:{tg:"Шаҳодатномаи ақди никоҳ, агар бошад",ru:"Свидетельство о браке, если есть",en:"Marriage certificate, if any"}
};
const DOC_RULES = [
  [/транспортн|автомобил|мотоцикл|прицеп|тонир/i, "vehicle"],
  [/недвижим|земельн|жилищ|жилого|квартир|строени|здани/i, "property"],
  [/брак|рожден|смерт|усынов|отцовств|фамили|семейн/i, "civil"],
  [/образовани|диплом|аттестат|нострифик/i, "edu"]
];

const LEGAL = {
  procedures:{tg:"Кодекси Ҷумҳурии Тоҷикистон дар бораи расмиёти маъмурӣ",ru:"Кодекс Республики Таджикистан об административных процедурах",en:"Code of Administrative Procedures of the Republic of Tajikistan"},
  tax:{tg:"Кодекси андози Ҷумҳурии Тоҷикистон — боҷи давлатӣ",ru:"Налоговый кодекс Республики Таджикистан — государственная пошлина",en:"Tax Code of the Republic of Tajikistan — state fee"},
  permit:{tg:"Қонуни Ҷумҳурии Тоҷикистон «Дар бораи низоми иҷозатдиҳӣ»",ru:"Закон Республики Таджикистан «О разрешительной системе»",en:"Law of the Republic of Tajikistan “On the Permit System”"},
  license:{tg:"Қонуни Ҷумҳурии Тоҷикистон «Дар бораи иҷозатномадиҳӣ ба баъзе намудҳои фаъолият»",ru:"Закон Республики Таджикистан «О лицензировании отдельных видов деятельности»",en:"Law of the Republic of Tajikistan “On Licensing of Certain Types of Activity”"},
  edoc:{tg:"Қонуни Ҷумҳурии Тоҷикистон «Дар бораи ҳуҷҷати электронӣ»",ru:"Закон Республики Таджикистан «Об электронном документе»",en:"Law of the Republic of Tajikistan “On the Electronic Document”"}
};

/* Everyday services with a hand-written profile. `aliases` carry the words
   citizens actually type («несудимость», «тонировка») — the registry only
   knows the official names. The first five are the search shortcuts. */
const CURATED = [
  { id:"crim", cat:"certs", match:/наличии или отсутствии судимости/i,
    aliases:"несудимость несудимости судимость судимости справка о несудимости доғи судӣ доғ судӣ criminal record police certificate",
    short:{tg:"Маълумотнома дар бораи доғи судӣ",ru:"Справка о несудимости",en:"Criminal record certificate"},
    lead:{tg:"Тасдиқ мекунад, ки шумо доғи судӣ доред ё не — онро барои кор, раводид ва таҳсил дар хориҷа талаб мекунанд.",
          ru:"Подтверждает, есть ли у вас судимость, — её просят при трудоустройстве, для визы и учёбы за рубежом.",
          en:"Confirms whether you have a criminal record — employers ask for it, as do visa offices and universities abroad."},
    kind:"certificate", time:"d3", docs:["id"],
    validity:{tg:"эътибор 90 рӯз",ru:"действует 90 дней",en:"valid for 90 days"} },
  { id:"tint", cat:"transport", match:/тонированными стеклами/i,
    aliases:"тонировка тонировку тонировки тонированные затемнение стекол шишаи сиёҳ шишаҳои сиёҳ сиёҳ tint tinted windows",
    short:{tg:"Иҷозат барои шишаҳои сиёҳ",ru:"Разрешение на тонировку",en:"Window tint permit"},
    lead:{tg:"Талон барои истифодаи мошин бо шишаҳои сиёҳи паҳлӯ ва ақиб. Шишаи пешро сиёҳ кардан мумкин нест.",
          ru:"Талон на эксплуатацию автомобиля с тонированными боковыми и задними стёклами. Лобовое стекло тонировать нельзя.",
          en:"A talon to drive a car with tinted side and rear windows. The windscreen may not be tinted."},
    kind:"permit", time:"instant", docs:["id", "vehicle"],
    cost:{tg:"Аз соли истеҳсол вобаста",ru:"Зависит от года выпуска",en:"Depends on the car's year"},
    validity:{tg:"эътибор 1 сол",ru:"действует 1 год",en:"valid for 1 year"} },
  { id:"passport", cat:"docs", match:/^Общегражданский заграничный паспорт/i,
    aliases:"загранпаспорт загран заграничный паспорт для выезда шиносномаи хориҷӣ хориҷӣ шиноснома passport travel passport foreign",
    short:{tg:"Шиносномаи хориҷӣ",ru:"Загранпаспорт",en:"Travel passport"},
    lead:{tg:"Шиносномаи биометрӣ барои сафар ба хориҷа. Аризаро онлайн медиҳед ва танҳо барои сурат ва изи ангуштон як бор ба марказ меоед.",
          ru:"Биометрический паспорт для поездок за границу. Заявление подаётся онлайн, в центр нужно прийти один раз — для фото и отпечатков.",
          en:"A biometric passport for travel abroad. You apply online and visit a centre once, for your photo and fingerprints."},
    kind:"document", time:"d10", docs:["id", "oldPassport"], visit:true,
    validity:{tg:"эътибор 10 сол",ru:"действует 10 лет",en:"valid for 10 years"} },
  { id:"inspection", cat:"transport", match:/^Талон \(листовка\) технического осмотра/i,
    aliases:"техосмотр техосмотра технический осмотр осмотр машины муоина муоинаи техникӣ талони муоина inspection mot roadworthiness",
    short:{tg:"Талони муоинаи техникӣ",ru:"Талон техосмотра",en:"Vehicle inspection talon"},
    lead:{tg:"Аз 15 сентябр талон танҳо тавассути eKhizmat дода мешавад: аризаро онлайн медиҳед, мошинро дар нуқтаи муоина нишон медиҳед ва талон ба ҳамён меояд.",
          ru:"С 15 сентября талон оформляется только через eKhizmat: подаёте заявление онлайн, проходите осмотр на пункте — и талон приходит в кошелёк.",
          en:"From 15 September the talon is issued only through eKhizmat: apply online, pass the check at a station and the talon arrives in your wallet."},
    kind:"permit", time:"d1", docs:["id", "vehicle"], station:true },
  { id:"residence", cat:"certs", match:/^Справка с места жительства/i,
    aliases:"справка с места жительства прописка прописке адресная справка ҷойи зист маълумотнома аз ҷойи зист суроға residence address proof of address",
    short:{tg:"Маълумотнома аз ҷойи зист",ru:"Справка с места жительства",en:"Proof of residence"},
    lead:{tg:"Суроғаи қайди шуморо тасдиқ мекунад — барои мактаб, бонк ва идораҳо.",
          ru:"Подтверждает адрес вашей регистрации — для школы, банка и ведомств.",
          en:"Confirms your registered address — for schools, banks and agencies."},
    kind:"certificate", time:"d1", docs:["id"] },
  { id:"birth", cat:"family", match:/^Государственная регистрация рождения/i,
    aliases:"свидетельство о рождении рождение ребёнка ребенка родился таваллуд шаҳодатномаи таваллуд кӯдак birth certificate baby",
    short:{tg:"Шаҳодатномаи таваллуд",ru:"Свидетельство о рождении",en:"Birth certificate"},
    lead:{tg:"Шаҳодатномаи таваллуди кӯдак. Агар кӯдак дар таваллудхона таваллуд шуда бошад, маълумот аллакай дар система ҳаст — танҳо тасдиқ мекунед.",
          ru:"Свидетельство о рождении ребёнка. Если малыш родился в роддоме, данные уже в системе — останется подтвердить.",
          en:"Your child's birth certificate. If the baby was born in a maternity hospital, the data is already in the system — you only confirm it."},
    kind:"registration", time:"d3", docs:["parentsId", "marriage"], go:"journey" }
];
const SHORTCUT_IDS = ["crim", "tint", "passport", "inspection", "residence"];

/* the help guide: short sections a contents menu jumps between */
const HELP = [
  { id:"find", t:{tg:"Чӣ тавр хизматро ёфтан",ru:"Как найти услугу",en:"Finding a service"}, p:{
    tg:["Дар ҷустуҷӯи саҳифаи асосӣ бо суханони худ нависед: «шиносномаи хориҷӣ», «маълумотнома барои кор». Номи расмии хизматро донистан шарт нест.",
        "Ё бахшро интихоб кунед — дар дохили он хизматҳо аз рӯи идора гурӯҳбандӣ шудаанд, ва филтри «Арзиш» танҳо ройгон ё музднокро мемонад.",
        "Дар саҳифаи хизмат пеш аз ариза мебинед, ки чӣ мегиред, чанд пул ва чанд вақт лозим аст ва кадом ҳуҷҷатҳо даркоранд."],
    ru:["Пишите в поиске на главной своими словами: «загранпаспорт», «справка для работы». Знать официальное название услуги не нужно.",
        "Или выберите раздел — внутри услуги сгруппированы по ведомствам, а фильтр «Стоимость» оставит только бесплатные или платные.",
        "На странице услуги ещё до подачи видно, что вы получите, сколько это стоит и занимает времени и какие документы нужны."],
    en:["Type in your own words in the search on the home page: “travel passport”, “certificate for work”. You don't need the official name.",
        "Or pick a section — inside, services are grouped by agency, and the Cost filter narrows them to free or paid.",
        "Each service page shows, before you apply, what you'll receive, what it costs, how long it takes and which documents you need."] } },
  { id:"sign-in", t:{tg:"Вуруд ба портал",ru:"Вход на портал",en:"Signing in"}, p:{
    tg:["Рақами телефони худро ворид кунед ва рамзи шашрақамаро аз SMS нависед.",
        "Бори аввал ҳисоб худкор сохта мешавад. Барои дидани ҳуҷҷатҳо ва аризаҳо шахсияти худро як бор тасдиқ мекунед — дар маркази хизматрасонӣ ё бо ID-корт.",
        "Рамз наомад? Дар зери майдон «Аз нав фиристодан»-ро пахш кунед. Агар рақами телефон иваз шуда бошад, ба хатти дастгирӣ занг занед."],
    ru:["Введите номер телефона и шестизначный код из SMS.",
        "При первом входе аккаунт создаётся сам. Чтобы видеть документы и заявления, один раз подтвердите личность — в центре обслуживания или по ID-карте.",
        "Код не пришёл? Нажмите «Отправить ещё раз» под полем. Если номер телефона сменился, позвоните на линию поддержки."],
    en:["Enter your phone number and the six-digit code from the SMS.",
        "On first sign-in your account is created automatically. To see documents and applications, confirm your identity once — at a service centre or with your ID card.",
        "No code? Press “Send again” under the field. If your phone number has changed, call the support line."] } },
  { id:"apply", t:{tg:"Ариза додан",ru:"Подача заявления",en:"Applying"}, p:{
    tg:["Дар саҳифаи хизмат «Ариза додан»-ро пахш кунед. Маълумоти шахсӣ аз профил пур мешавад — онро санҷед ва чизҳои намерасидаро илова кунед.",
        "Сиёҳнавис худкор нигоҳ дошта мешавад: метавонед баъдтар аз «Аризаҳои ман» идома диҳед.",
        "Пас аз фиристодан рақами ариза мегиред — ҳангоми тамос бо идора онро гӯед."],
    ru:["Нажмите «Подать заявление» на странице услуги. Личные данные подставятся из профиля — проверьте их и добавьте недостающее.",
        "Черновик сохраняется автоматически: продолжить можно позже из «Моих заявлений».",
        "После отправки вы получите номер заявления — называйте его, когда обращаетесь в ведомство."],
    en:["Press Apply on the service page. Your details are filled in from your profile — check them and add anything missing.",
        "Drafts save automatically: you can carry on later from My applications.",
        "Once sent, you get an application number — quote it when you contact the agency."] } },
  { id:"pay", t:{tg:"Пардохти боҷ",ru:"Оплата пошлины",en:"Paying fees"}, p:{
    tg:["Маблағ дар қадами охир, пеш аз пардохт, нишон дода мешавад. Бо корти бонкӣ ё бонки мобилӣ пардохт мекунед.",
        "Квитансияи электронӣ дар «Пардохтҳои ман» мемонад ва ба идора худкор мерасад — онро чоп кардан лозим нест.",
        "Пардохт нагузашт? Маблағ дар давоми 3 рӯзи корӣ ба корт бармегардад; аз «Пардохтҳои ман» такроран пардохт кунед."],
    ru:["Сумма видна на последнем шаге, до оплаты. Оплатить можно картой или через мобильный банк.",
        "Электронный чек хранится в «Моих платежах» и сам уходит в ведомство — распечатывать его не нужно.",
        "Платёж не прошёл? Деньги вернутся на карту в течение 3 рабочих дней; повторите оплату из «Моих платежей»."],
    en:["The amount is shown on the last step, before you pay. Pay by bank card or mobile banking.",
        "The e-receipt is kept in My payments and reaches the agency automatically — there's no need to print it.",
        "Payment failed? The money returns to your card within 3 working days; pay again from My payments."] } },
  { id:"track", t:{tg:"Пайгирии ариза",ru:"Как следить за заявлением",en:"Tracking an application"}, p:{
    tg:["Ҳамаи аризаҳо дар «Аризаҳои ман»-анд: ҳолат, идорае, ки ҳоло бо он кор мекунад, ва санаи интизорӣ.",
        "Дар бораи ҳар тағйир SMS ва огоҳӣ дар портал меояд.",
        "Ҳолати «Ислоҳ лозим» маънои онро дорад, ки идора чизеро пурсидааст: сабабро хонед, ислоҳ кунед ва аз нав фиристед — навбати шумо гум намешавад."],
    ru:["Все заявления — в «Моих заявлениях»: статус, ведомство, у которого оно сейчас, и ожидаемая дата.",
        "О каждом изменении придёт SMS и уведомление на портале.",
        "Статус «Нужно исправить» значит, что ведомство что-то уточняет: прочитайте причину, исправьте и отправьте снова — очередь не теряется."],
    en:["Every application is in My applications: its status, which agency has it now and the expected date.",
        "Each change brings an SMS and a portal notification.",
        "“Needs fixing” means the agency is asking for something: read the reason, fix it and send it again — you keep your place."] } },
  { id:"result", t:{tg:"Гирифтани натиҷа",ru:"Получение результата",en:"Getting the result"}, p:{
    tg:["Ҳуҷҷатҳои электронӣ ба «Ҳамёни ҳуҷҷатҳо» меоянд ва бо мӯҳри электронӣ эътибори аслиро доранд.",
        "Барои нишон додани ҳуҷҷат QR-ро кушоед — ҳавола 10 дақиқа эътибор дорад ва танҳо ҳамон ҳуҷҷатро мекушояд.",
        "Ҳуҷҷатҳои коғазӣ (шиноснома, шаҳодатномаи ронандагӣ) аз маркази интихобкардаатон гирифта мешаванд — вақти омода шуданашонро бо SMS хабар медиҳем."],
    ru:["Электронные документы приходят в «Кошелёк документов» и с электронной печатью имеют силу оригинала.",
        "Чтобы показать документ, откройте его QR — ссылка действует 10 минут и открывает только этот документ.",
        "Бумажные документы (паспорт, водительское удостоверение) забираете в выбранном центре — о готовности сообщим по SMS."],
    en:["Electronic documents arrive in your Document wallet and, with their e-seal, count as originals.",
        "To show a document, open its QR — the link works for 10 minutes and opens only that document.",
        "Paper documents (passport, driving licence) are collected at the centre you chose — we'll text you when they're ready."] } },
  { id:"centres", t:{tg:"Марказҳо ва тамос",ru:"Центры и контакты",en:"Centres and contact"}, p:{
    tg:["Агар онлайн муяссар нашавад, дар маркази хизматрасонӣ корманд дар пур кардани ариза кумак мекунад. Вақтро пешакӣ гиред — бе навбат қабул мешавед."],
    ru:["Если онлайн не получается, в центре обслуживания сотрудник поможет заполнить заявление. Запишитесь заранее — примут без очереди."],
    en:["If online doesn't work for you, staff at a service centre will help you fill in the application. Book a time and you'll be seen without queuing."] },
    contact:true }
];
export const HELP_IDS = HELP.map(s => s.id);

/* FNV-1a over name + agency: a short, stable, ASCII key for the URL */
function hashKey(str){
  let h = 2166136261;
  for (let i = 0; i < str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}
export const svcKey = it => hashKey(it[0] + "|" + it[1]);

/* everyday words that carry no meaning for matching */
const STOP = new Set(("мехоҳам хоҳам гирам гирифтан кардан намудан чӣ тавр барои дар бо аз ба ман мо худ куҷо " +
  "хочу хотим получить оформить сделать как для мне меня мой моя моё мои нужно нужна нужен где можно " +
  "want get the how for need where can my apply").split(" "));
/* strip inflection so «справку» meets «справка», «брака» meets «брак» and
   «шиносномаи» meets «шиноснома» */
const stem = tok => tok.length > 5 ? tok.slice(0, tok.length - 2) : tok.length === 5 ? tok.slice(0, 4) : tok;
function tokens(q){
  const all = q.toLowerCase().replace(/[«»"(),.!?]/g, " ").split(/\s+/).filter(Boolean);
  const meaningful = all.filter(w => w.length >= 3 && !STOP.has(w));
  return meaningful.map(stem);
}
/* Every word must match; when nothing does, the candidates matching most of
   the longer words — a stray word should not empty the list, and a single
   shared word («регистрация») should not fill it with noise. */
export function rankByWords(items, hayOf, q){
  const toks = tokens(q);
  if (!toks.length) return [];
  const all = items.filter(x => toks.every(tk => hayOf(x).includes(tk)));
  if (all.length) return all.map(x => ({ x, n:toks.length, all:true }));
  const long = toks.filter(tk => tk.length >= 4);
  if (long.length < 2) return [];
  return items.map(x => ({ x, n:long.filter(tk => hayOf(x).includes(tk)).length }))
    .filter(({ n }) => n >= Math.ceil(long.length / 2));
}

export function initServicePage(ctx){
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const lang = () => ctx.getLang();
  const L = () => COPY[lang()] || COPY.tg;
  const pick = obj => obj ? (obj[lang()] || obj.ru || obj.tg) : "";
  const esc = ctx.esc;

  /* ---------- the catalogue as a flat, keyed index (per audience) ---------- */
  const indexCache = {};
  function index(){
    const acct = ctx.getAccount();
    if (indexCache[acct]) return indexCache[acct];
    const rows = [];
    ctx.catalog().forEach(g => g.subs.forEach(s => s.items.forEach(it => {
      if (it[5]) return; /* guest catalogue items are notes, not services */
      const cur = CURATED.find(c => c.cat === g.id && c.match.test(it[3] || it[0]));
      rows.push({ g, it, key:svcKey(it), cur,
        hay:(it[0] + " " + (it[3] || "") + " " + (cur ? cur.aliases : "")).toLowerCase() });
    })));
    indexCache[acct] = rows;
    return rows;
  }
  function find(cat, key){ return index().find(r => r.g.id === cat && r.key === key) || null; }
  function findCurated(id){ return index().find(r => r.cur && r.cur.id === id) || null; }
  const hashOf = row => "#/service/" + row.g.id + "/" + row.key;
  const nameOf = it => (lang() !== "tg" && it[3]) || it[0];
  const orgOf = it => (lang() !== "tg" && it[4]) || it[1];
  const isPaid = it => Boolean(it[2] & 4);

  /* ---------- a service's profile: curated where we have one, derived otherwise ---------- */
  function profile(row){
    const { it, g, cur } = row;
    const ru = it[3] || it[0];
    const kindId = cur?.kind || (KIND_RULES.find(([re]) => re.test(ru)) || [null, "decision"])[1];
    const kind = KINDS[kindId];
    const biz = ctx.getAccount() === "biz";
    let docs = cur?.docs;
    if (!docs){
      docs = biz ? ["directorId", "bizReg"] : ["id"];
      if (kindId === "license") docs.push("licenseReq");
      const extra = DOC_RULES.find(([re]) => re.test(ru));
      if (extra && !docs.includes(extra[1])) docs.push(extra[1]);
    }
    return {
      kindId, kind, biz, paid:isPaid(it), docs,
      time:cur?.time || kind.time, minutes:kind.minutes,
      delivery:kind.delivery, visit:Boolean(cur?.visit), station:Boolean(cur?.station),
      validity:cur?.validity || null, cost:cur?.cost || null, lead:cur?.lead || null, go:cur?.go || null
    };
  }

  function factsHtml(p){
    const c = L();
    const result =[pick(p.kind.result), [c[p.delivery], p.validity && pick(p.validity)].filter(Boolean).join(" · ")];
    const cost = p.cost ? [pick(p.cost), c.paidNote] : p.paid ? [c.paid, c.paidNote] : [c.free, ""];
    const time = [pick(TIMES[p.time]), ""];
    const fact = (label, value, note) =>
      `<div class="svc-fact"><dt>${label}</dt><dd><b>${esc(value)}</b>${note ? `<span>${esc(note)}</span>` : ""}</dd></div>`;
    return `<dl class="svc-facts">` +
      fact(c.fResult, result[0], result[1]) +
      fact(c.fCost, cost[0], cost[1]) +
      fact(c.fTime, time[0], time[1]) +
      `<div class="svc-fact"><dt>${c.fDocs}</dt><dd><ul class="svc-fact__docs">${p.docs.map(d => `<li>${esc(pick(DOCS[d]))}</li>`).join("")}</ul><span>${esc(c.docsNote)}</span></dd></div>` +
    `</dl>`;
  }

  function stepsHtml(p){
    const c = L();
    const timeText = pick(TIMES[p.time]);
    const steps = [[c.stepApply.replace("{m}", p.minutes), c.stepApplyP]];
    if (p.paid || p.cost) steps.push([c.stepPay, c.stepPayP]);
    if (p.station) steps.push([c.stepStation, c.stepStationP]);
    if (p.visit) steps.push([c.stepVisit, c.stepVisitP]);
    steps.push(p.time === "instant" ? [c.stepAuto, c.stepAutoP]
      : [c.stepReview.replace("{time}", timeText.charAt(0).toLowerCase() + timeText.slice(1)), c.stepReviewP]);
    steps.push(p.delivery === "centre" ? [c.stepCollect, c.stepCollectP] : [c.stepWallet, c.stepWalletP]);
    return `<ol class="e-steps svc-steps">` + steps.map(([t, d], i) =>
      `<li class="e-step"><span class="n" aria-hidden="true">${i + 1}</span><div><b>${esc(t)}</b><p>${esc(d)}</p></div></li>`).join("") +
    `</ol>`;
  }

  function disclosure(id, title, body){
    return `<details class="ekh-disclosure" id="svc-d-${id}">` +
      `<summary>${esc(title)}${icon("i-chev-d", "ekh-disclosure__chev")}</summary>` +
      `<div class="ekh-disclosure__body">${body}</div></details>`;
  }
  function detailsHtml(p){
    const c = L();
    const legal = ["procedures"];
    if (p.paid || p.cost) legal.push("tax");
    if (p.kindId === "permit") legal.push("permit");
    if (p.kindId === "license") legal.push("license");
    if (p.delivery === "wallet") legal.push("edoc");
    return `<div class="ekh-disclosures">` +
      disclosure("who", c.whoH, `<p>${esc(p.biz ? c.whoBiz : c.whoPerson)}</p>`) +
      disclosure("req", c.reqH, `<p>${esc(c.reqP)}</p>`) +
      ((p.paid || p.cost) ? disclosure("pay", c.payH, `<p>${esc(c.payP)}</p>`) : "") +
      disclosure("refuse", c.refuseH, `<p>${esc(c.refuseP)}</p>`) +
      disclosure("legal", c.legalH, `<ul>${legal.map(k => `<li>${esc(pick(LEGAL[k]))}</li>`).join("")}</ul><p>${esc(c.legalNote)}</p>`) +
    `</div>`;
  }

  /* «is this the right one?» — the nearest neighbours in the same group. A
     shared word counts by how rare it is there: «транспортного средства» is in
     most transport services and says nothing, «техосмотр» is in four and says
     a lot. A neighbour must share a good part of what makes this one distinct,
     otherwise the section stays away rather than suggesting noise. */
  function related(row){
    const words = r => new Set((r.it[3] || r.it[0]).toLowerCase().split(/[^a-zа-яёҳқғӯҷӣ]+/i).filter(w => w.length >= 5).map(w => w.slice(0, 5)));
    const group = index().filter(r => r.g.id === row.g.id);
    const sets = new Map(group.map(r => [r, words(r)]));
    const df = new Map();
    sets.forEach(set => set.forEach(w => df.set(w, (df.get(w) || 0) + 1)));
    const weight = w => Math.log(group.length / df.get(w));
    const mine = sets.get(row);
    const self = [...mine].reduce((a, w) => a + weight(w), 0);
    if (!self) return [];
    return group.filter(r => r !== row)
      .map(r => {
        let score = 0;
        sets.get(r).forEach(w => { if (mine.has(w)) score += weight(w); });
        return { r, score };
      })
      .filter(x => x.score >= Math.max(2, self * .35))
      .sort((a, b) => b.score - a.score || nameOf(a.r.it).length - nameOf(b.r.it).length)
      .slice(0, 3).map(x => x.r);
  }
  function svcRowHtml(r){
    const paid = isPaid(r.it);
    return `<a class="svc-row" href="${hashOf(r)}" data-route>` +
      `<span class="tt"><b>${esc(nameOf(r.it))}</b></span>` +
      `<span class="tag ${paid ? "pay" : "free"}">${ctx.t(paid ? "meta.paid" : "meta.free")}</span>` +
      icon("i-chev-r", "svc-go") + `</a>`;
  }

  function asideHtml(p){
    const c = L();
    const meta = (ctx.signedIn() ? c.applyIn : c.applyOut).replace("{m}", p.minutes);
    return `<aside class="svc-aside" aria-labelledby="svcApplyH">` +
      `<div class="svc-apply">` +
        `<h2 class="sr-only" id="svcApplyH">${esc(c.apply)}</h2>` +
        `<button class="btn btn-pri btn-lg btn-block" type="button" data-svc-apply>${esc(c.apply)}</button>` +
        `<p class="svc-apply__meta">${esc(meta)}</p>` +
        `<div class="svc-apply__alt">` +
          `<b>${esc(c.inPersonH)}</b><p>${esc(c.inPersonP)}</p>` +
          `<button class="btn btn-sec btn-block" type="button" data-go="guestService">${esc(c.inPersonCta)}</button>` +
        `</div>` +
      `</div>` +
      `<div class="svc-help">` +
        `<b>${esc(c.helpH)}</b>` +
        `<a class="svc-help__link" href="#/help/apply" data-route>${icon("i-info")}<span>${esc(c.helpHow)}</span></a>` +
        `<a class="svc-help__link" href="${SUPPORT_PHONE.href}">${icon("i-call")}<span>${SUPPORT_PHONE.text}<small>${esc(c.helpLine)}</small></span></a>` +
      `</div>` +
    `</aside>`;
  }

  let currentRow = null;
  function renderService(route){
    const row = route.cat && route.key ? find(route.cat, route.key) : null;
    if (!row) return false;
    currentRow = row;
    const c = L(), p = profile(row);
    const near = related(row);
    $("#svcRoot").innerHTML =
      `<nav class="ekh-crumbs" aria-label="${esc(c.crumbs)}"><ol>` +
        `<li><a href="#/" data-route>${esc(c.home)}</a></li>` +
        `<li><a href="#/category/${row.g.id}" data-route>${esc(row.g.label[lang()] || row.g.label.ru)}</a></li>` +
      `</ol></nav>` +
      `<header class="svc-head">` +
        `<h1 id="svcTitle">${esc(nameOf(row.it))}</h1>` +
        `<p class="svc-agency">${icon("i-building")}<span><span class="sr-only">${esc(c.agency)}: </span>${esc(orgOf(row.it))}</span></p>` +
        (p.lead ? `<p class="svc-lead">${esc(pick(p.lead))}</p>` : "") +
      `</header>` +
      factsHtml(p) +
      asideHtml(p) +
      `<section class="svc-sect svc-next" aria-labelledby="svcNextH"><h2 id="svcNextH">${esc(c.nextH)}</h2>${stepsHtml(p)}</section>` +
      `<section class="svc-sect svc-more" aria-labelledby="svcMoreH"><h2 id="svcMoreH">${esc(c.moreH)}</h2>${detailsHtml(p)}</section>` +
      (near.length ? `<section class="svc-sect svc-related" aria-labelledby="svcRelH"><h2 id="svcRelH">${esc(c.relatedH)}</h2><div class="rows">${near.map(svcRowHtml).join("")}</div></section>` : "");
    return true;
  }
  /* what Apply does: a service with a built flow opens it; the rest is a demo step */
  function apply(){
    if (!currentRow) return;
    const p = profile(currentRow);
    const run = () => { if (p.go) ctx.go(p.go); else ctx.toast("toast.demo"); };
    if (ctx.signedIn()) run(); else ctx.requireLogin(run);
  }
  document.addEventListener("click", e => { if (e.target.closest("[data-svc-apply]")) apply(); });

  /* ---------- search: registry services by everyday words ---------- */
  function searchServices(q, limit){
    /* a curated service (everyday words matched) first, then names that start
       with the first word, then the shortest — the most general — names */
    const lead = tokens(q)[0];
    const rank = r => r.cur ? 0 : nameOf(r.it).toLowerCase().startsWith(lead) ? 1 : 2;
    return rankByWords(index(), r => r.hay, q)
      .map(({ x:r, n }) => ({ r, n, rank:rank(r) }))
      .sort((a, b) => a.rank - b.rank || b.n - a.n || nameOf(a.r.it).length - nameOf(b.r.it).length)
      .slice(0, limit || 5)
      .map(({ r }) => ({ hash:hashOf(r), label:nameOf(r.it), meta:r.g.label[lang()] || r.g.label.ru, cat:r.g.id }));
  }
  /* the zero-query state of the search: requests citizens recognise, in their words */
  function shortcuts(){
    return SHORTCUT_IDS.map(findCurated).filter(Boolean)
      .map(r => ({ hash:hashOf(r), label:pick(r.cur.short), meta:r.g.label[lang()] || r.g.label.ru, cat:r.g.id }));
  }
  /* the category page's «popular» row: curated first, in everyday words */
  function popularFor(catId){
    return index().filter(r => r.g.id === catId && r.cur)
      .map(r => ({ hash:hashOf(r), label:nameOf(r.it), it:r.it }));
  }

  /* ---------- help: short sections with a contents menu ---------- */
  function renderHelp(){
    const c = L();
    const sect = s => `<section class="help-sect" id="help-${s.id}" aria-labelledby="help-${s.id}-h">` +
      `<h2 id="help-${s.id}-h">${esc(pick(s.t))}</h2>` +
      (s.p[lang()] || s.p.ru).map(par => `<p>${esc(par)}</p>`).join("") +
      (s.contact ? `<div class="help-contact">` +
        `<button class="btn btn-sec" type="button" data-go="guestService">${esc(c.bookVisit)}</button>` +
        `<a class="svc-help__link" href="${SUPPORT_PHONE.href}">${icon("i-call")}<span>${SUPPORT_PHONE.text}<small>${esc(c.helpLine)}</small></span></a>` +
        `<a class="svc-help__link" href="mailto:khizmat.ehukumat@cpd.tj">${icon("i-mail")}<span>khizmat.ehukumat@cpd.tj</span></a>` +
      `</div>` : "") +
    `</section>`;
    $("#helpRoot").innerHTML =
      `<nav class="ekh-crumbs" aria-label="${esc(c.crumbs)}"><ol><li><a href="#/" data-route>${esc(c.home)}</a></li></ol></nav>` +
      `<header class="help-head"><h1 id="helpTitle">${esc(c.helpTitle)}</h1><p class="help-lead">${esc(c.helpLead)}</p></header>` +
      `<div class="prof-grid help-grid">` +
        `<nav class="prof-nav help-toc" aria-label="${esc(c.toc)}">` +
          HELP.map(s => `<a class="pn" href="#/help/${s.id}" data-route data-replace data-help-link="${s.id}">${esc(pick(s.t))}</a>`).join("") +
        `</nav>` +
        `<div class="help-body">${HELP.map(sect).join("")}</div>` +
      `</div>`;
    syncToc();
  }
  /* the contents menu marks the section being read */
  function syncToc(){
    const scr = $("#scr-help");
    if (!scr || scr.hidden) return;
    const line = (ctx.headerHeight() || 64) + 32;
    let current = HELP[0].id;
    HELP.forEach(s => {
      const el = $("#help-" + s.id);
      if (el && el.getBoundingClientRect().top <= line) current = s.id;
    });
    /* the last section can be too short to reach the line: at the page foot it is the one being read */
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) current = HELP[HELP.length - 1].id;
    $$("[data-help-link]").forEach(a => a.setAttribute("aria-current", String(a.dataset.helpLink === current)));
  }
  window.addEventListener("scroll", syncToc, { passive:true });
  function focusHelpSection(id, opts){
    const el = id && $("#help-" + id);
    if (!el) return false;
    const h = $("h2", el);
    el.scrollIntoView({ block:"start", behavior:(opts?.instant || ctx.reduceMotion()) ? "instant" : "smooth" });
    h.setAttribute("tabindex", "-1");
    h.focus({ preventScroll:true });
    $$("[data-help-link]").forEach(a => a.setAttribute("aria-current", String(a.dataset.helpLink === id)));
    return true;
  }

  return {
    renderService, renderHelp, focusHelpSection, syncToc,
    searchServices, shortcuts, popularFor, find,
    copy:() => L(),
    resetIndex:() => { Object.keys(indexCache).forEach(k => delete indexCache[k]); }
  };
}
