/* ============================================================
   News: the one source for the home band (home-news.js), the «all news»
   list and the story pages (news-page.js). Newest first.

   A story is its topic, title and summary (the home band shows these), then
   a body of blocks — p (paragraph), h (subheading), ul (list), note (the one
   fact not to miss) — and `rel`, what the citizen can do about it on the
   portal: a registry service (cat + the start of its official Russian name,
   resolved like a life situation's rows), a life situation (life: its id,
   titled from life-data.js) or another portal page (href).

   The bodies are draft copy written for the prototype from each summary;
   the newsroom's own text replaces them. The last three stories (demo:true)
   are placeholders about the prototype's own sections, on placeholder
   photos: they exist so the list has an archive under its front page, and
   go when the newsroom has older stories of its own.
   ============================================================ */

import presidentDayCover from "../assets/news/president-day.webp";
import amonatbankCover from "../assets/news/amonatbank.webp";
import civilRegistryCover from "../assets/news/civil-registry.webp";
import tajTechCover from "../assets/news/taj-tech.webp";
import inspectionCover from "../assets/news/inspection.webp";
import mobileAppCover from "../assets/news/mobile-app.webp";
import archiveCoverA from "../assets/news/placeholder-1.webp";
import archiveCoverB from "../assets/news/placeholder-3.webp";
import archiveCoverC from "../assets/news/placeholder-5.webp";

export const NEWS = [
  { id:"president-day", date:"2026-11-16", img:presidentDayCover,
    cat:{ tg:"Рӯйдодҳо", ru:"События", en:"Events" },
    t:{ tg:"16 ноябр: Рӯзи Президенти Ҷумҳурии Тоҷикистон",
        ru:"16 ноября: День Президента Республики Таджикистан",
        en:"16 November: Day of the President of the Republic of Tajikistan" },
    s:{ tg:"16 ноябр дар Тоҷикистон Рӯзи Президенти Ҷумҳурии Тоҷикистон ҷашн гирифта мешавад. Ин сана бо рӯйдодҳои муҳими таърихи муосири кишвар, таҳкими давлатдорӣ, ваҳдати миллӣ ва истиқлолият алоқаманд аст.",
        ru:"16 ноября в Таджикистане отмечается День Президента Республики Таджикистан. Эта дата связана с важными событиями современной истории страны, укреплением государственности, национального единства и независимости.",
        en:"On 16 November Tajikistan marks the Day of the President of the Republic of Tajikistan. The date is tied to key events in the country's modern history and to the strengthening of statehood, national unity and independence." },
    body:[
      { p:{ tg:"Ин ҷашн ҳамасола қайд карда мешавад. Дар ин рӯз дар пойтахт ва минтақаҳои кишвар чорабиниҳои тантанавӣ ва фарҳангӣ баргузор мегарданд.",
            ru:"Праздник отмечается ежегодно. В этот день в столице и регионах страны проходят торжественные и культурные мероприятия.",
            en:"The holiday is marked every year. Ceremonies and cultural events take place in the capital and across the regions on this day." } },
      { h:{ tg:"Портал дар рӯзҳои ид чӣ гуна кор мекунад", ru:"Как портал работает в праздничные дни", en:"How the portal works on public holidays" } },
      { p:{ tg:"Хизматҳои электронии eKhizmat шабонарӯзӣ, аз ҷумла дар рӯзҳои ид дастрасанд: аризаро дар ҳар вақт пешниҳод кардан ва боҷро пардохт кардан мумкин аст.",
            ru:"Электронные услуги eKhizmat доступны круглосуточно, в том числе в праздничные дни: подать заявление и оплатить сбор можно в любое время.",
            en:"eKhizmat's online services are available around the clock, holidays included: you can file an application and pay a fee at any time." } },
      { ul:{ tg:["Аризаҳое, ки дар рӯзи ид пешниҳод шудаанд, аз рӯзи кории наздиктарин баррасӣ мешаванд.",
                 "Муҳлати хизматрасонӣ бо рӯзҳои корӣ ҳисоб карда мешавад.",
                 "Ҳуҷҷатҳои электронии тайёр дар кабинети шахсӣ пайдо мешаванд, барои гирифтани онҳо рафтан лозим нест."],
             ru:["Заявления, поданные в праздничный день, ведомства начинают рассматривать в ближайший рабочий день.",
                 "Срок оказания услуги считается в рабочих днях.",
                 "Готовые электронные документы появляются в личном кабинете, идти за ними не нужно."],
             en:["Agencies start reviewing applications filed on a holiday on the next working day.",
                 "Service times are counted in working days.",
                 "Finished electronic documents appear in your account, so there is nothing to collect in person."] } },
      { p:{ tg:"Дастаи eKhizmat сокинони кишварро бо ин ҷашн табрик мегӯяд.",
            ru:"Команда eKhizmat поздравляет жителей страны с праздником.",
            en:"The eKhizmat team wishes everyone a happy holiday." } }
    ] },

  { id:"amonatbank", date:"2026-11-12", img:amonatbankCover,
    cat:{ tg:"Ҳамкорӣ", ru:"Сотрудничество", en:"Partnership" },
    t:{ tg:"Амонатбонк ва ҶСК «Марказҳои тасдиқкунанда, хизматҳои давлатӣ ва таҳияи барномаҳои рақамӣ» дастрасии шаҳрвандонро ба хизматҳои давлатии электронӣ васеъ мекунанд",
        ru:"Амонатбанк и ОАО «Удостоверяющие центры, государственные услуги и разработка цифровых программ» расширят доступ граждан к электронным госуслугам",
        en:"Amonatbank and OJSC “Certification Centres, Public Services and Digital Software Development” will widen citizens' access to online public services" },
    s:{ tg:"Ҷонибҳо ташкили машваратҳоро дар филиалҳои Амонатбонк муҳокима карданд. Дар он ҷо шаҳрвандон дар насби барномаи мобилии eKhizmat, гузаштан аз мушаххасгардонӣ тавассути ИМЗО ва пешниҳоди аризаҳои электронӣ кумак мегиранд.",
        ru:"Стороны обсудили организацию консультаций в отделениях Амонатбанка. Там граждане смогут получить помощь в установке мобильного приложения eKhizmat, прохождении идентификации через ИМЗО и подаче электронных заявлений.",
        en:"The parties discussed setting up consultations in Amonatbank branches. There, citizens will get help installing the eKhizmat mobile app, verifying their identity through IMZO and filing applications online." },
    body:[
      { p:{ tg:"Машваратҳо барои онҳое пешбинӣ шудаанд, ки мустақилона оғоз кардани кор бо портал барояшон душвор аст: одамони калонсол, сокинони ноҳияҳои дурдаст ва онҳое, ки бори аввал хизматро онлайн мегиранд.",
            ru:"Консультации рассчитаны на тех, кому трудно начать пользоваться порталом самостоятельно: людей старшего возраста, жителей отдалённых районов и тех, кто впервые получает услугу онлайн.",
            en:"The consultations are meant for people who find it hard to start using the portal on their own: older people, residents of remote districts and anyone using an online service for the first time." } },
      { h:{ tg:"Дар филиал дар чӣ кумак мекунанд", ru:"С чем помогут в отделении", en:"What branch staff will help with" } },
      { ul:{ tg:["Насб кардани барномаи мобилии eKhizmat ва ворид шудан бо рақами телефон.",
                 "Як маротиба тасдиқ кардани шахсият тавассути ИМЗО.",
                 "Ёфтани хизмати лозима, пур кардан ва фиристодани аризаи электронӣ."],
             ru:["Установить мобильное приложение eKhizmat и войти по номеру телефона.",
                 "Один раз подтвердить личность через ИМЗО.",
                 "Найти нужную услугу, заполнить и отправить электронное заявление."],
             en:["Installing the eKhizmat mobile app and signing in with a phone number.",
                 "Confirming your identity once through IMZO.",
                 "Finding the right service, then filling in and sending an online application."] } },
      { p:{ tg:"Кумаки мушовир ройгон аст. Бо худ шиноснома ва телефонро гиред.",
            ru:"Помощь консультанта бесплатна. С собой возьмите паспорт и телефон.",
            en:"The consultant's help is free. Bring your passport and your phone." } },
      { note:{ tg:"Филиалҳое, ки дар онҳо мушовирон кор мекунанд, ва санаи оғоз иловатан эълон карда мешаванд.",
               ru:"Отделения, в которых начнут работать консультанты, и дату запуска стороны объявят дополнительно.",
               en:"The branches where consultants will work and the start date will be announced separately." } }
    ],
    rel:[
      { href:"#/help/sign-in", t:{ tg:"Вуруд ба портал", ru:"Вход на портал", en:"Signing in" },
        meta:{ tg:"Бахши «Кумак»", ru:"Раздел «Помощь»", en:"Help guide" } }
    ] },

  { id:"civil-registry", date:"2026-11-05", img:civilRegistryCover,
    cat:{ tg:"Оила ва фарзандон", ru:"Семья и дети", en:"Family & children" },
    t:{ tg:"Дар eKhizmat хизматҳои нави сабти асноди ҳолати шаҳрвандӣ пайдо шуданд",
        ru:"На eKhizmat появились новые услуги ЗАГС",
        en:"New civil registry services on eKhizmat" },
    s:{ tg:"Дар бахши «Оила ва фарзандон» хизматҳои электронии бақайдгирии таваллуд, ақди никоҳ ва бекор кардани он, инчунин фавт дастрасанд. Барои истифодаи онҳо дар портал сабти ном шавед ва шахсияти худро тасдиқ кунед.",
        ru:"В разделе «Семья и дети» доступны электронные услуги по регистрации рождения, заключения и расторжения брака, а также смерти. Для их использования необходимо зарегистрироваться на портале и подтвердить личность.",
        en:"Under Family & children you can now register a birth, a marriage, a divorce and a death online. To use these services, sign up on the portal and confirm your identity." },
    body:[
      { p:{ tg:"Пештар барои ҳар як сабти асноди ҳолати шаҳрвандӣ шахсан ба шуъбаи САҲШ рафтан лозим буд. Акнун ариза онлайн пешниҳод мешавад ва ба шуъба як маротиба, дар вақти таъиншуда меоянд.",
            ru:"Раньше для каждой записи акта гражданского состояния нужно было лично прийти в отдел ЗАГС. Теперь заявление подаётся онлайн, а в отдел приходят один раз, в назначенное время.",
            en:"Until now, every civil status record meant a visit to the registry office in person. Now you apply online and come to the office once, at the appointed time." } },
      { h:{ tg:"Аризаро чӣ тавр бояд дод", ru:"Как подать заявление", en:"How to apply" } },
      { ul:{ tg:["Ба портал ворид шавед ва як маротиба шахсияти худро тасдиқ кунед.",
                 "Дар бахши «Оила ва фарзандон» хизматро интихоб кунед ва аризаро пур кунед: маълумоти профил худкор гузошта мешавад.",
                 "Агар боҷи давлатӣ пешбинӣ шуда бошад, онро онлайн пардохт кунед.",
                 "Ҳолати аризаро дар кабинети шахсӣ пайгирӣ кунед. Шаҳодатнома дар бахши «Ҳуҷҷатҳо» пайдо мешавад."],
             ru:["Войдите на портал и один раз подтвердите личность.",
                 "Выберите услугу в разделе «Семья и дети» и заполните заявление: данные профиля подставятся сами.",
                 "Оплатите государственную пошлину онлайн, если она предусмотрена.",
                 "Следите за статусом в личном кабинете. Свидетельство появится в разделе «Документы»."],
             en:["Sign in to the portal and confirm your identity once.",
                 "Choose the service under Family & children and fill in the application: your profile details are filled in for you.",
                 "Pay the state fee online, if one applies.",
                 "Follow the status in your account. The certificate will appear under Documents."] } },
      { p:{ tg:"Агар якчанд хизмат лозим бошад, аз лаҳзаи зиндагӣ оғоз кардан қулайтар аст: дар он ҷо онҳо қадам ба қадам ва бо тартиби лозима ҷамъ оварда шудаанд.",
            ru:"Если нужных услуг несколько, удобнее начать с жизненной ситуации: там они собраны по шагам и в нужном порядке.",
            en:"If you need several services, start from a life situation: it lists them step by step, in the right order." } }
    ],
    rel:[
      { cat:"family", re:/^Государственная регистрация рождения/, t:{ tg:"Бақайдгирии таваллуд", ru:"Регистрация рождения", en:"Birth registration" } },
      { cat:"family", re:/^Государственная регистрация брака/, t:{ tg:"Бақайдгирии никоҳ", ru:"Регистрация брака", en:"Marriage registration" } },
      { life:"wedding" }
    ] },

  { id:"taj-tech", date:"2026-10-22", img:tajTechCover,
    cat:{ tg:"Рақамикунонӣ", ru:"Цифровизация", en:"Digitalisation" },
    t:{ tg:"Форуми байналмилалии технологии Тоҷикистон",
        ru:"Международный технологический форум Таджикистана",
        en:"Tajikistan International Technology Forum" },
    s:{ tg:"ҶСК «Марказҳои тасдиқкунанда, хизматҳои давлатӣ ва таҳияи барномаҳои рақамӣ» дар TAJ-TECH 2026 ҳамкориро дар соҳаи рақамикунонӣ васеъ мекунад.",
        ru:"ОАО «Удостоверяющие центры, государственные услуги и разработка цифровых программ» расширяет сотрудничество в сфере цифровизации на TAJ-TECH 2026.",
        en:"OJSC “Certification Centres, Public Services and Digital Software Development” is expanding its cooperation on digitalisation at TAJ-TECH 2026." },
    body:[
      { p:{ tg:"Форум идораҳои давлатӣ, бонкҳо, операторони алоқа ва ширкатҳои технологиро ҷамъ меорад. Дар ғурфаи ҷамъият меҳмонон портали eKhizmat ва барномаи мобилиро дар амал диданд.",
            ru:"Форум собирает государственные ведомства, банки, операторов связи и технологические компании. На стенде общества гости увидели портал eKhizmat и мобильное приложение в работе.",
            en:"The forum brings together government agencies, banks, telecom operators and technology companies. At the company's stand, visitors saw the eKhizmat portal and the mobile app at work." } },
      { p:{ tg:"Дар вохӯриҳо бо шарикон пайваст кардани идораҳои нав ба портал, табодули маълумот байни низомҳои давлатӣ ва имзои электронии ИМЗО муҳокима шуданд.",
            ru:"На встречах с партнёрами обсуждали подключение новых ведомств к порталу, обмен данными между государственными системами и электронную подпись ИМЗО.",
            en:"Meetings with partners covered connecting more agencies to the portal, data exchange between government systems and the IMZO electronic signature." } },
      { h:{ tg:"Ин барои шаҳрвандон чӣ маъно дорад", ru:"Что это значит для граждан", en:"What it means for citizens" } },
      { p:{ tg:"Ҳар қадар идораҳои бештар ба портал пайваст шаванд, ҳамон қадар маълумотномаҳои камтарро худатон ҷамъ мекунед: маълумоте, ки давлат аллакай дорад, байни низомҳо худкор дархост мешавад.",
            ru:"Чем больше ведомств подключено к порталу, тем меньше справок приходится собирать самому: сведения, которые уже есть у государства, запрашиваются между системами автоматически.",
            en:"The more agencies are connected to the portal, the fewer certificates you collect yourself: what the state already holds is requested between systems automatically." } }
    ] },

  { id:"inspection", date:"2026-09-11", img:inspectionCover,
    cat:{ tg:"Нақлиёт", ru:"Транспорт", en:"Transport" },
    t:{ tg:"Аз 15 сентябр талони муоинаи техникӣ танҳо тавассути Портали ягонаи хизматҳои давлатӣ eKhizmat.tj расмӣ карда мешавад",
        ru:"С 15 сентября талон техосмотра будет оформляться только через Единый портал государственных услуг eKhizmat.tj",
        en:"From 15 September, vehicle inspection tickets are issued only through the Unified Public Services Portal eKhizmat.tj" },
    s:{ tg:"Аз 15 сентябри соли 2026 талонҳои муоинаи техникии воситаҳои нақлиёт танҳо дар шакли электронӣ тавассути Портали ягонаи хизматҳои давлатӣ eKhizmat.tj расмӣ карда мешаванд.",
        ru:"С 15 сентября 2026 года талоны технического осмотра транспортных средств будут оформляться исключительно в электронном виде через Единый портал государственных услуг eKhizmat.tj.",
        en:"From 15 September 2026, vehicle inspection tickets are issued only electronically, through the Unified Public Services Portal eKhizmat.tj." },
    body:[
      { p:{ tg:"Талонҳои коғазие, ки то 15 сентябр дода шудаанд, то анҷоми муҳлати дар онҳо зикршуда эътибор доранд. Талонҳои нав танҳо дар шакли электронӣ расмӣ карда мешаванд.",
            ru:"Бумажные талоны, выданные до 15 сентября, действуют до окончания указанного в них срока. Новые талоны оформляются только в электронном виде.",
            en:"Paper tickets issued before 15 September stay valid until the date printed on them. New tickets are issued only electronically." } },
      { h:{ tg:"Талонро чӣ тавр бояд гирифт", ru:"Как оформить талон", en:"How to get a ticket" } },
      { ul:{ tg:["Ба портал ворид шавед ва дар бахши «Нақлиёт ва ронандагӣ» хизмати «Талони муоинаи техникӣ»-ро интихоб кунед.",
                 "Маълумоти воситаи нақлиётро нишон диҳед ва боҷро онлайн пардохт кунед.",
                 "Дар нуқтаи муоинаи техникӣ аз муоина гузаред.",
                 "Талони электронӣ дар кабинети шахсӣ, дар бахши «Ҳуҷҷатҳо» пайдо мешавад."],
             ru:["Войдите на портал и выберите услугу «Талон технического осмотра» в разделе «Транспорт и права».",
                 "Укажите данные транспортного средства и оплатите сбор онлайн.",
                 "Пройдите осмотр на станции технического осмотра.",
                 "Электронный талон появится в личном кабинете, в разделе «Документы»."],
             en:["Sign in to the portal and choose “Vehicle inspection ticket” under Transport & driving.",
                 "Enter the vehicle's details and pay the fee online.",
                 "Pass the inspection at an inspection station.",
                 "The electronic ticket will appear in your account, under Documents."] } },
      { note:{ tg:"Чоп кардани талон лозим нест: ҳангоми санҷиш онро дар экрани телефон нишон додан кифоя аст.",
               ru:"Распечатывать талон не нужно: при проверке достаточно показать его на экране телефона.",
               en:"There is no need to print the ticket: at a check, showing it on your phone screen is enough." } }
    ],
    rel:[
      { cat:"transport", re:/^Талон \(листовка\) технического осмотра/, t:{ tg:"Талони муоинаи техникӣ", ru:"Талон технического осмотра", en:"Vehicle inspection ticket" } },
      { life:"car" }
    ] },

  { id:"mobile-app", date:"2026-09-01", img:mobileAppCover,
    cat:{ tg:"Барнома", ru:"Приложение", en:"App" },
    t:{ tg:"Барномаи мобилии eKhizmat",
        ru:"Мобильное приложение eKhizmat",
        en:"The eKhizmat mobile app" },
    s:{ tg:"Акнун гирифтани хизматҳои давлатӣ боз ҳам осонтар шуд! Барномаи eKhizmat-ро насб кунед ва ҳуҷҷатҳоро расмӣ кунед, ариза диҳед, боҷҳоро бевосита аз смартфон пардохт кунед: дар ҳар вақт, бе навбат ва бе рафтан ба идораҳо.",
        ru:"Теперь получать государственные услуги стало ещё проще! Скачайте приложение eKhizmat и оформляйте документы, подавайте заявления, оплачивайте сборы прямо со смартфона: в любое время, без очередей и визитов в ведомства.",
        en:"Getting public services is now even easier! Install the eKhizmat app to get documents, file applications and pay fees right from your smartphone: any time, with no queues and no visits to agencies." },
    body:[
      { p:{ tg:"Барнома имкониятҳои порталро такрор мекунад: ҳамон феҳристи хизматҳо, ҳамон кабинети шахсӣ ва ҳамон аризаҳо.",
            ru:"Приложение повторяет возможности портала: тот же каталог услуг, тот же личный кабинет и те же заявления.",
            en:"The app mirrors the portal: the same catalogue of services, the same account and the same applications." } },
      { h:{ tg:"Дар барнома чӣ ҳаст", ru:"Что есть в приложении", en:"What the app offers" } },
      { ul:{ tg:["Вуруд бо рақами телефон ва тасдиқи шахсият тавассути ИМЗО.",
                 "Ҳуҷҷатҳо дар ҳамёни электронӣ: онҳоро аз экрани телефон нишон додан мумкин аст.",
                 "Огоҳиҳо дар бораи ҳолати аризаҳо ва муҳлати ҳуҷҷатҳо.",
                 "Пардохти боҷҳо ва хироҷҳои давлатӣ."],
             ru:["Вход по номеру телефона и подтверждение личности через ИМЗО.",
                 "Документы в электронном кошельке: их можно показать с экрана телефона.",
                 "Уведомления о статусе заявлений и сроках документов.",
                 "Оплата государственных пошлин и сборов."],
             en:["Sign-in with a phone number and identity confirmation through IMZO.",
                 "Documents in an electronic wallet, ready to show from your phone screen.",
                 "Notifications about application status and document expiry dates.",
                 "Payment of state fees and charges."] } },
      { p:{ tg:"Барнома ройгон аст ва барои iOS ва Android дастрас мебошад. Маълумот дар барнома ва дар портал якхела аст: кореро, ки дар компютер оғоз кардед, дар телефон анҷом додан мумкин аст.",
            ru:"Приложение бесплатное и доступно для iOS и Android. Данные в приложении и на портале общие: начатое на компьютере можно закончить в телефоне.",
            en:"The app is free and available for iOS and Android. It shares its data with the portal: what you start on a computer, you can finish on your phone." } }
    ] },

  { id:"life-moments", date:"2026-08-20", img:archiveCoverA, demo:true,
    cat:{ tg:"Портал", ru:"Портал", en:"Portal" },
    t:{ tg:"Дар портал бахши «Лаҳзаҳои зиндагӣ» пайдо шуд",
        ru:"На портале появился раздел «Жизненные ситуации»",
        en:"Life moments: a new section on the portal" },
    s:{ tg:"Хизматҳое, ки одатан якҷоя лозим мешаванд, акнун қадам ба қадам ҷамъ оварда шудаанд: тӯй, таваллуди фарзанд, кӯчидан, хариди мошин ва дигар лаҳзаҳо.",
        ru:"Услуги, которые обычно нужны вместе, теперь собраны по шагам: свадьба, рождение ребёнка, переезд, покупка автомобиля и другие ситуации.",
        en:"Services you usually need together are now listed step by step: a wedding, a new baby, a move, buying a car and other moments." },
    body:[
      { p:{ tg:"Дар саҳифаи ҳар лаҳза хизматҳо бо ҳамон тартибе меоянд, ки лозим мешаванд, ва дарҳол маълум аст, ки бо худ чӣ бояд гирифт ва чӣ шахсан анҷом дода мешавад.",
            ru:"На странице каждой ситуации услуги идут в том порядке, в котором они понадобятся, и сразу видно, что взять с собой и что происходит лично.",
            en:"On each moment's page the services come in the order you'll need them, and you can see at once what to bring and what happens in person." } }
    ],
    rel:[
      { href:"#/life", t:{ tg:"Лаҳзаҳои зиндагӣ", ru:"Жизненные ситуации", en:"Life moments" },
        meta:{ tg:"Ҳамаи лаҳзаҳо", ru:"Все ситуации", en:"Every moment" } }
    ] },

  { id:"help-guide", date:"2026-08-05", img:archiveCoverB, demo:true,
    cat:{ tg:"Кумак", ru:"Помощь", en:"Help" },
    t:{ tg:"Дар бахши «Кумак» ҷавобҳо ба саволҳои маъмул ҷамъ оварда шуданд",
        ru:"В разделе «Помощь» собраны ответы на частые вопросы",
        en:"The Help section now answers the most common questions" },
    s:{ tg:"Дастурҳои кӯтоҳ дар як ҷо: чӣ тавр ба портал ворид шудан, шахсиятро тасдиқ кардан, ариза додан ва боҷро пардохт кардан.",
        ru:"Короткие инструкции в одном месте: как войти на портал, подтвердить личность, подать заявление и оплатить сбор.",
        en:"Short instructions in one place: how to sign in, confirm your identity, file an application and pay a fee." },
    body:[
      { p:{ tg:"Агар ҷавоб набошад, аз саҳифаи асосӣ ба мо нависед: дар давоми рӯзи корӣ ҷавоб медиҳем.",
            ru:"Если ответа нет, напишите нам с главной страницы: ответим в течение рабочего дня.",
            en:"If the answer isn't there, write to us from the home page: we reply within a working day." } }
    ],
    rel:[
      { href:"#/help", t:{ tg:"Бахши «Кумак»", ru:"Раздел «Помощь»", en:"Help guide" },
        meta:{ tg:"Дастурҳои кӯтоҳ", ru:"Короткие инструкции", en:"Short instructions" } }
    ] },

  { id:"wallet", date:"2026-07-21", img:archiveCoverC, demo:true,
    cat:{ tg:"Ҳуҷҷатҳо", ru:"Документы", en:"Documents" },
    t:{ tg:"Ҳуҷҷатҳои электронӣ акнун дар ҳамёни кабинети шахсӣ нигоҳ дошта мешаванд",
        ru:"Электронные документы теперь хранятся в кошельке личного кабинета",
        en:"Electronic documents are now kept in your account's wallet" },
    s:{ tg:"Шаҳодатномаҳо, маълумотномаҳо ва талонҳое, ки тавассути портал гирифта шудаанд, дар бахши «Ҳуҷҷатҳо» пайдо мешаванд. Онҳоро аз экрани телефон нишон додан мумкин аст.",
        ru:"Свидетельства, справки и талоны, полученные через портал, появляются в разделе «Документы». Их можно показать с экрана телефона.",
        en:"Certificates, statements and tickets you get through the portal appear under Documents. You can show them from your phone screen." },
    body:[
      { p:{ tg:"Ҳар ҳуҷҷат QR-код дорад: бо он ҳаққонияти ҳуҷҷатро месанҷанд.",
            ru:"У каждого документа есть QR-код: по нему проверяют подлинность.",
            en:"Each document carries a QR code used to check that it is genuine." } }
    ] }
];

export const NEWS_IDS = NEWS.map(n => n.id);

const MONTHS = {
  tg:["январи","феврали","марти","апрели","майи","июни","июли","августи","сентябри","октябри","ноябри","декабри"],
  ru:["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"],
  en:["January","February","March","April","May","June","July","August","September","October","November","December"]
};
/* «16 ноября 2026»: a story's date, the same words on the home, in the list and on its page */
export function newsDay(iso, lang){
  const [y, m, d] = iso.split("-").map(Number);
  return d + " " + (MONTHS[lang] || MONTHS.ru)[m - 1] + " " + y;
}
