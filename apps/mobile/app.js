import { applyPreferences, getLang, getTheme, setLang, toggleTheme } from '/design-system/js/preferences.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const icon = name => `<svg aria-hidden="true"><use href="/design-system/assets/icons.svg#${name}"></use></svg>`;

const originalCopy = new Map();
$$('[data-copy]').forEach(element => {
  const directText = [...element.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.nodeValue.trim());
  originalCopy.set(element, directText ? directText.nodeValue.trim() : element.textContent.trim());
});
const originalPlaceholders = new Map($$('[data-copy-placeholder]').map(element => [element, element.placeholder]));

const tg = {
  skip: 'Ба мазмуни барнома гузаштан', greeting: 'Субҳ ба хайр', hello: 'Фируза', searchPlaceholder: 'Кадом хизмат ба шумо лозим аст?', inReview: 'Дар баррасӣ', updatedToday: 'Имрӯз нав шуд', continueLabel: 'Идома додан', birthTitle: 'Шаҳодатномаи таваллуд — Зарина', stepProgress: 'Қадами 3 аз 5 · санҷиши САҲШ', twoDays: 'то 2 рӯз', trackApplication: 'Пайгирии ариза', quickTitle: 'Зуд-зуд лозим', allServices: 'Ҳамаи хизматҳо', passport: 'Шиноснома', fines: 'Ҷаримаҳо', certificates: 'Маълумотнома', doctor: 'Духтур', attention: 'Таваҷҷуҳ лозим', vehicleTax: 'Андози нақлиёт', discountUntil: '20% тахфиф то 1 июл', somoni: 'сом.', moments: 'Лаҳзаҳои зиндагӣ', showAll: 'Ҳамааш', newChild: 'Фарзанд таваллуд шуд', fiveMinFree: '5 дақиқа · ройгон', moving: 'Кӯч мебарам', twelveMin: '12 дақиқа', newJob: 'Кор меҷӯям', eightMinFree: '8 дақиқа · ройгон', catalog: 'Феҳрист', services: 'Хизматҳо', searchServices: 'Ҷустуҷӯи хизматҳо', all: 'Ҳама', documents: 'Ҳуҷҷатҳо', family: 'Оила', transport: 'Нақлиёт', health: 'Тандурустӣ', nothingFound: 'Ҳеҷ чиз ёфт нашуд', tryAnother: 'Калимаи дигарро нависед ё бахшро интихоб кунед.', yourRequests: 'Муроҷиатҳои шумо', applications: 'Аризаҳо', active: 'Фаъол', completed: 'Анҷомшуда', updatedTwoHours: '2 соат пеш нав шуд', needAction: 'Амали шумо лозим', passportRenewal: 'Ивази шиноснома', today: 'имрӯз', ready: 'Омода', businessRegistration: 'Сабти соҳибкори инфиродӣ', digitalWallet: 'Ҳамёни рақамӣ', walletSecurity: 'Маълумот ҳифз шудааст. QR-рамз танҳо 10 дақиқа амал мекунад.', citizenPassport: 'Шиносномаи шаҳрванд', validUntil: 'То 14.10.2026 эътибор дорад', verified: 'Санҷида шуд', taxNumber: 'Рақами мушаххаси андозсупоранда', unlimited: 'Бемӯҳлат', addDocument: 'Илова кардани ҳуҷҷат', fromRegistry: 'Аз феҳристи давлатӣ', profile: 'Профил', identityVerified: 'Шахсият тасдиқ шудааст', account: 'Ҳисоб', personalData: 'Маълумоти шахсӣ', personalDataSub: 'Телефон, суроға, тамосҳо', security: 'Амният', securitySub: 'Face ID ва вуруди дуқадама', on: 'Фаъол', familySub: '2 профили пайваст', applicationSettings: 'Барнома', language: 'Забон', languageSub: 'Забони интерфейс', darkTheme: 'Мавзӯи торик', themeSub: 'Бо дастгоҳ мувофиқ мешавад', accessibility: 'Дастрасӣ', accessibilitySub: 'Матн, контраст ва ҳаракат', signOut: 'Баромадан', application: 'Ариза', whatHappens: 'Чӣ рӯй дода истодааст', applicationSent: 'Ариза фиристода шуд', juneTen: '10 июн · 10:24', dataVerified: 'Маълумот тасдиқ шуд', automatically: 'Ба таври худкор', zagReview: 'Санҷиш дар САҲШ', sinDistrict: 'Ноҳияи Сино · то 13 июн', documentsIssue: 'Омодасозии ҳуҷҷатҳо', afterReview: 'Баъд аз санҷиш', readyWallet: 'Дар ҳамён омода', pushWhenReady: 'Бо push хабар медиҳем', agency: 'Идора', zagSin: 'САҲШ-и ноҳияи Сино', result: 'Натиҷа', threeDocuments: '3 ҳуҷҷати рақамӣ', askQuestion: 'Савол додан', newApplication: 'Хизмати нав', passportIntro: 'Маълумоти шуморо ёфтем. Пеш аз фиристодан санҷед — аз нав пур кардан лозим нест.', applicant: 'Довталаб', continue: 'Идома', deliveryQuestion: 'Гирифтани ҳуҷҷат', whereReceive: 'Шиносномаи навро аз куҷо гирифтан мехоҳед?', chooseOne: 'Як вариантро интихоб кунед. То фиристодан онро иваз кардан мумкин аст.', serviceCenter: 'Маркази хизматрасонӣ', rudakiAddress: 'хиёбони Рӯдакӣ, 64 · 1,2 км', homeDelivery: 'Расонидан ба хона', deliveryFee: '2–3 рӯз · 20 сомонӣ', beforeSending: 'Пеш аз фиристодан', checkApplication: 'Аризаро санҷед', checkIntro: 'Хулосаи кӯтоҳ барои пешгирии хато кумак мекунад.', service: 'Хизмат', receiving: 'Гирифтан', fee: 'Арзиш', consent: 'Тасдиқ мекунам, ки маълумот дуруст аст', sendApplication: 'Аризаро фиристодан', applicationAccepted: 'Ариза қабул шуд', statusNotifications: 'Дар бораи ҳар тағйироти муҳим хабар медиҳем.', applicationNumber: 'Рақами ариза', goApplications: 'Ба аризаҳо', goHome: 'Ба саҳифаи асосӣ', home: 'Асосӣ', takes: 'Вақт', cost: 'Арзиш', autoData: 'Маълумоти шиносномаро аз феҳристҳои давлатӣ худкор мегирем.', startService: 'Оғози хизмат', updates: 'Навгониҳо', notifications: 'Огоҳиҳо', birthAccepted: 'Ариза ба кор қабул шуд', birthAcceptedSub: 'САҲШ-и ноҳияи Сино · 2 соат пеш', passportExpires: 'Муҳлати шиноснома ба охир мерасад', passportExpiresSub: 'Пас аз 2 моҳ · ҳоло иваз кардан мумкин', taxDiscount: 'Тахфифи андози нақлиёт', taxDiscountSub: '20% ҳангоми пардохт то 1 июл', shareDocument: 'Нишон додани ҳуҷҷат', qrIntro: 'Санҷанда танҳо ҳамин ҳуҷҷатро мебинад. Рамз пас аз 10 дақиқа нав мешавад.', done: 'Омода'
};

const toastText = {
  ru: { documentRequest: 'Запрос на добавление документа создан', personalData: 'Этот экран будет следующим в разработке', security: 'Настройки безопасности открыты в основном портале', family: 'Семейные профили будут доступны здесь', accessibility: 'Настройки доступности будут настроены здесь', signedOut: 'Демонстрационный выход — данные не изменены', help: 'Открываем безопасный чат поддержки', supportMessage: 'Сообщение в поддержку подготовлено' },
  tg: { documentRequest: 'Дархости иловаи ҳуҷҷат сохта шуд', personalData: 'Ин саҳифа дар марҳилаи навбатӣ сохта мешавад', security: 'Танзимоти амният дар портали асосӣ дастрас аст', family: 'Профилҳои оилавӣ дар ин ҷо дастрас мешаванд', accessibility: 'Танзимоти дастрасӣ дар ин ҷо ҷойгир мешавад', signedOut: 'Баромади намунавӣ — маълумот тағйир наёфт', help: 'Чати бехатари дастгириро мекушоем', supportMessage: 'Паём ба дастгирӣ омода шуд' }
};

const services = [
  { id: 'passport', category: 'documents', icon: 'i-cat-passport', tone: 't-blue', ru: 'Замена паспорта', tg: 'Ивази шиноснома', agencyRu: 'МВД Республики Таджикистан', agencyTg: 'Вазорати корҳои дохилӣ', timeRu: '8 минут', timeTg: '8 дақиқа', costRu: '250 сомони', costTg: '250 сомонӣ', descRu: 'Подайте заявление и выберите удобное место получения нового документа.', descTg: 'Ариза фиристед ва ҷойи мувофиқи гирифтани ҳуҷҷати навро интихоб кунед.' },
  { id: 'cert', category: 'documents', icon: 'i-cat-cert', tone: 't-teal', ru: 'Справка об отсутствии судимости', tg: 'Маълумотнома оид ба надоштани доғи судӣ', agencyRu: 'МВД Республики Таджикистан', agencyTg: 'Вазорати корҳои дохилӣ', timeRu: '5 минут', timeTg: '5 дақиқа', costRu: 'Бесплатно', costTg: 'Ройгон', descRu: 'Получите цифровую справку без посещения ведомства.', descTg: 'Маълумотномаи рақамиро бе рафтан ба идора гиред.' },
  { id: 'birth', category: 'family', icon: 'i-baby', tone: 't-rose', ru: 'Регистрация рождения ребёнка', tg: 'Сабти таваллуди кӯдак', agencyRu: 'ЗАГС района Сино', agencyTg: 'САҲШ-и ноҳияи Сино', timeRu: '5 минут', timeTg: '5 дақиқа', costRu: 'Бесплатно', costTg: 'Ройгон', descRu: 'Одна заявка на свидетельство, ИНН и пособие.', descTg: 'Як ариза барои шаҳодатнома, РМА ва кумакпулӣ.' },
  { id: 'fines', category: 'transport', icon: 'i-cat-tax', tone: 't-violet', ru: 'Проверка и оплата штрафов', tg: 'Санҷиш ва пардохти ҷаримаҳо', agencyRu: 'МВД Республики Таджикистан', agencyTg: 'Вазорати корҳои дохилӣ', timeRu: '2 минуты', timeTg: '2 дақиқа', costRu: 'По начислению', costTg: 'Аз рӯи ҳисоб', descRu: 'Проверьте штрафы по автомобилю и оплатите онлайн.', descTg: 'Ҷаримаҳои нақлиётро санҷед ва онлайн пардохт кунед.' },
  { id: 'vehicle-tax', category: 'transport', icon: 'i-money', tone: 't-amber', ru: 'Оплата транспортного налога', tg: 'Пардохти андози нақлиёт', agencyRu: 'Налоговый комитет', agencyTg: 'Кумитаи андоз', timeRu: '2 минуты', timeTg: '2 дақиқа', costRu: '86,40 сомони', costTg: '86,40 сомонӣ', descRu: 'Оплатите начисление со скидкой 20% до 1 июля.', descTg: 'Ҳисобро бо 20% тахфиф то 1 июл пардохт кунед.' },
  { id: 'doctor', category: 'health', icon: 'i-cat-health', tone: 't-green', ru: 'Запись к семейному врачу', tg: 'Номнависӣ назди духтури оилавӣ', agencyRu: 'Министерство здравоохранения', agencyTg: 'Вазорати тандурустӣ', timeRu: '3 минуты', timeTg: '3 дақиқа', costRu: 'Бесплатно', costTg: 'Ройгон', descRu: 'Выберите врача, день и удобное время приёма.', descTg: 'Духтур, рӯз ва вақти мувофиқро интихоб кунед.' },
  { id: 'move', category: 'family', icon: 'i-move', tone: 't-teal', ru: 'Регистрация по новому адресу', tg: 'Қайд дар суроғаи нав', agencyRu: 'МВД Республики Таджикистан', agencyTg: 'Вазорати корҳои дохилӣ', timeRu: '12 минут', timeTg: '12 дақиқа', costRu: 'Бесплатно', costTg: 'Ройгон', descRu: 'Обновите место жительства для всей семьи.', descTg: 'Ҷойи истиқомати тамоми оиларо нав кунед.' },
  { id: 'job', category: 'family', icon: 'i-job', tone: 't-amber', ru: 'Регистрация в качестве безработного', tg: 'Қайд ҳамчун бекор', agencyRu: 'Министерство труда', agencyTg: 'Вазорати меҳнат', timeRu: '8 минут', timeTg: '8 дақиқа', costRu: 'Бесплатно', costTg: 'Ройгон', descRu: 'Получите поддержку и доступ к подходящим вакансиям.', descTg: 'Дастгирӣ ва ҷойҳои кори мувофиқро дастрас кунед.' }
];

const applicationDetails = {
  birth: {
    icon: 'i-baby', tone: 't-rose', number: '№ТҶ-2026-184302', statusRu: 'На рассмотрении', statusTg: 'Дар баррасӣ', titleRu: 'Свидетельство о рождении — Зарина', titleTg: 'Шаҳодатномаи таваллуд — Зарина',
    stepsRu: [['Заявление отправлено', '10 июня · 10:24'], ['Данные подтверждены', 'Автоматически'], ['Проверка в ЗАГС', 'Район Сино · ожидаем до 13 июня'], ['Выпуск документов', 'После проверки'], ['Готово в кошельке', 'Сообщим push-уведомлением']],
    stepsTg: [['Ариза фиристода шуд', '10 июн · 10:24'], ['Маълумот тасдиқ шуд', 'Ба таври худкор'], ['Санҷиш дар САҲШ', 'Ноҳияи Сино · то 13 июн'], ['Омодасозии ҳуҷҷатҳо', 'Баъд аз санҷиш'], ['Дар ҳамён омода', 'Бо push хабар медиҳем']], current: 2
  },
  passport: {
    icon: 'i-cat-passport', tone: 't-blue', number: '№ТҶ-2026-183917', statusRu: 'Нужно ваше действие', statusTg: 'Амали шумо лозим', titleRu: 'Замена паспорта', titleTg: 'Ивази шиноснома',
    stepsRu: [['Заявление сохранено', 'Сегодня · 09:12'], ['Личные данные проверены', 'Автоматически'], ['Добавьте фотографию', 'Нужно ваше действие'], ['Проверка МВД', 'После загрузки'], ['Выдача паспорта', 'В выбранном центре']],
    stepsTg: [['Ариза нигоҳ дошта шуд', 'Имрӯз · 09:12'], ['Маълумоти шахсӣ санҷида шуд', 'Ба таври худкор'], ['Суратро илова кунед', 'Амали шумо лозим'], ['Санҷиши ВКД', 'Баъд аз боркунӣ'], ['Додани шиноснома', 'Дар маркази интихобшуда']], current: 2
  },
  business: {
    icon: 'i-biz', tone: 't-indigo', number: '№ТҶ-2026-179908', statusRu: 'Готово', statusTg: 'Омода', titleRu: 'Регистрация ИП', titleTg: 'Сабти соҳибкори инфиродӣ',
    stepsRu: [['Заявление отправлено', '2 июня'], ['Проверка данных', 'Автоматически'], ['Регистрация в налоговой', '3 июня'], ['Выпуск свидетельства', '4 июня'], ['Готово в кошельке', '4 июня · 15:40']],
    stepsTg: [['Ариза фиристода шуд', '2 июн'], ['Санҷиши маълумот', 'Ба таври худкор'], ['Қайд дар андоз', '3 июн'], ['Омодасозии шаҳодатнома', '4 июн'], ['Дар ҳамён омода', '4 июн · 15:40']], current: 4
  }
};

let language = getLang() === 'tg' ? 'tg' : 'ru';
let currentScreen = 'home';
let previousScreen = 'home';
let currentCategory = 'all';
let currentService = services[0];
let flowStep = 1;
let toastTimer;
let lastFocused;

function translate(key) {
  if (language === 'tg' && tg[key]) return tg[key];
  const match = [...originalCopy.entries()].find(([element]) => element.dataset.copy === key);
  return match ? match[1] : key;
}

function renderCopy() {
  $$('[data-copy]').forEach(element => {
    const value = language === 'tg' ? (tg[element.dataset.copy] || originalCopy.get(element)) : originalCopy.get(element);
    const directText = [...element.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.nodeValue.trim());
    if (directText) directText.nodeValue = `${value} `;
    else element.textContent = value;
  });
  $$('[data-copy-placeholder]').forEach(element => {
    element.placeholder = language === 'tg' ? (tg[element.dataset.copyPlaceholder] || originalPlaceholders.get(element)) : originalPlaceholders.get(element);
  });
  $('#currentLanguage').textContent = language === 'tg' ? 'Тоҷикӣ' : 'Русский';
  $('.concept-open').href = `/mobile/?mode=app&theme=${getTheme()}&lang=${language}`;
  document.title = language === 'tg' ? 'eKhizmat Mobile — консепсияи интерактивӣ' : 'eKhizmat Mobile — интерактивная концепция';
  renderServices();
  updateThemeControl();
}

function updateThemeControl() {
  const themeSwitch = $('#themeToggle .switch-control');
  themeSwitch.setAttribute('aria-checked', String(getTheme() === 'dark'));
}

function navigate(name, { focusSearch = false } = {}) {
  const target = $(`#screen-${name}`);
  if (!target) return;
  if (name !== currentScreen) previousScreen = currentScreen;
  $$('.m-screen').forEach(screen => { screen.hidden = screen !== target; screen.classList.remove('is-entering'); });
  target.hidden = false;
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    requestAnimationFrame(() => target.classList.add('is-entering'));
  }
  currentScreen = name;
  const isDetail = name === 'application-detail' || name === 'service-flow';
  $('.bottom-nav').hidden = isDetail;
  $$('.bottom-nav [data-nav]').forEach(button => button.toggleAttribute('aria-current', button.dataset.nav === name));
  $$('[data-preview-screen]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.previewScreen === name)));
  $('.mobile-scroll').scrollTop = 0;
  if (focusSearch) setTimeout(() => $('#serviceSearch').focus(), 0);
  else {
    const heading = target.querySelector('h2');
    if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
  }
}

function renderServices() {
  const query = $('#serviceSearch').value.trim().toLocaleLowerCase(language === 'tg' ? 'tg-TJ' : 'ru-RU');
  const filtered = services.filter(service => {
    const categoryMatches = currentCategory === 'all' || service.category === currentCategory;
    const text = `${service.ru} ${service.tg} ${service.agencyRu} ${service.agencyTg}`.toLocaleLowerCase();
    return categoryMatches && (!query || text.includes(query));
  });
  $('#serviceList').innerHTML = filtered.map(service => {
    const name = language === 'tg' ? service.tg : service.ru;
    const agency = language === 'tg' ? service.agencyTg : service.agencyRu;
    const cost = language === 'tg' ? service.costTg : service.costRu;
    return `<button class="service-row" type="button" data-service="${service.id}"><span class="quick-icon ${service.tone}">${icon(service.icon)}</span><span class="service-row-copy"><strong>${name}</strong><span>${agency}</span><span class="service-meta"><span>${cost}</span></span></span>${icon('i-chev-r')}</button>`;
  }).join('');
  $('#serviceResultCount').textContent = language === 'tg' ? `${filtered.length} хизмат` : `${filtered.length} ${filtered.length === 1 ? 'услуга' : filtered.length < 5 ? 'услуги' : 'услуг'}`;
  $('#serviceEmpty').hidden = filtered.length > 0;
  $('#clearSearch').hidden = !$('#serviceSearch').value;
}

function showToast(message) {
  clearTimeout(toastTimer);
  const toast = $('#mobileToast');
  toast.textContent = message;
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function openSheet(sheet) {
  lastFocused = document.activeElement;
  $('#sheetOverlay').hidden = false;
  sheet.hidden = false;
  requestAnimationFrame(() => sheet.querySelector('button')?.focus({ preventScroll: true }));
}

function closeSheets({ restoreFocus = true, immediate = false } = {}) {
  const openSheets = $$('.bottom-sheet:not([hidden])');
  if (!openSheets.length) return;
  if (immediate) {
    openSheets.forEach(sheet => { sheet.hidden = true; sheet.classList.remove('is-closing'); });
    $('#sheetOverlay').hidden = true;
    $('#sheetOverlay').classList.remove('is-closing');
    if (restoreFocus) lastFocused?.focus?.({ preventScroll: true });
    return;
  }
  $('#sheetOverlay').classList.add('is-closing');
  openSheets.forEach(sheet => sheet.classList.add('is-closing'));
  setTimeout(() => {
    openSheets.forEach(sheet => { sheet.hidden = true; sheet.classList.remove('is-closing'); });
    $('#sheetOverlay').hidden = true;
    $('#sheetOverlay').classList.remove('is-closing');
    if (restoreFocus) lastFocused?.focus?.({ preventScroll: true });
  }, 170);
}

function openService(id) {
  const service = services.find(item => item.id === id);
  if (!service) return;
  currentService = service;
  $('#serviceSheetIcon').className = `sheet-icon ${service.tone}`;
  $('#serviceSheetIcon').innerHTML = icon(service.icon);
  $('#serviceSheetAgency').textContent = language === 'tg' ? service.agencyTg : service.agencyRu;
  $('#serviceSheetTitle').textContent = language === 'tg' ? service.tg : service.ru;
  $('#serviceSheetDescription').textContent = language === 'tg' ? service.descTg : service.descRu;
  $('#serviceSheetTime').textContent = language === 'tg' ? service.timeTg : service.timeRu;
  $('#serviceSheetCost').textContent = language === 'tg' ? service.costTg : service.costRu;
  openSheet($('#serviceSheet'));
}

function renderApplicationDetail(id) {
  const detail = applicationDetails[id] || applicationDetails.birth;
  $('#applicationDetailIcon').className = `application-icon ${detail.tone}`;
  $('#applicationDetailIcon').innerHTML = icon(detail.icon);
  $('#applicationDetailStatus').textContent = language === 'tg' ? detail.statusTg : detail.statusRu;
  $('#applicationDetailTitle').textContent = language === 'tg' ? detail.titleTg : detail.titleRu;
  $('#applicationDetailNumber').textContent = detail.number;
  const agency = id === 'passport'
    ? (language === 'tg' ? 'Вазорати корҳои дохилӣ' : 'МВД Республики Таджикистан')
    : id === 'business'
      ? (language === 'tg' ? 'Кумитаи андоз' : 'Налоговый комитет')
      : translate('zagSin');
  const result = id === 'passport'
    ? (language === 'tg' ? 'Шиносномаи нав' : 'Новый паспорт')
    : id === 'business'
      ? (language === 'tg' ? 'Шаҳодатномаи рақамӣ' : 'Цифровое свидетельство')
      : translate('threeDocuments');
  $('.detail-info-card strong').textContent = agency;
  $$('.detail-info-card strong')[1].textContent = result;
  $('#applicationDetailStatus').closest('.status-chip').style.setProperty('background', id === 'passport' ? 'var(--amber-tint)' : 'var(--green-tint)');
  $('#applicationDetailStatus').closest('.status-chip').style.setProperty('color', id === 'passport' ? 'var(--amber)' : 'var(--green)');
  const steps = language === 'tg' ? detail.stepsTg : detail.stepsRu;
  $('#applicationTimeline').innerHTML = steps.map((step, index) => {
    const state = index < detail.current ? 'is-done' : index === detail.current ? 'is-current' : '';
    const marker = index < detail.current ? icon('i-check') : String(index + 1);
    return `<li class="${state}"><span>${marker}</span><div><strong>${step[0]}</strong><small>${step[1]}</small></div></li>`;
  }).join('');
  navigate('application-detail');
}

function resetFlow() {
  flowStep = 1;
  ['#flowStep1', '#flowStep2', '#flowStep3', '#flowSuccess'].forEach((selector, index) => { $(selector).hidden = index !== 0; });
  $('#flowProgressLabel').textContent = language === 'tg' ? 'Қадами 1 аз 3' : 'Шаг 1 из 3';
  $('#flowProgressBar').style.width = '33.333%';
  $('.flow-progress').hidden = false;
  $('#flowConsent').checked = false;
  $('#submitApplication').disabled = true;
}

function advanceFlow() {
  if (flowStep >= 3) return;
  $(`#flowStep${flowStep}`).hidden = true;
  flowStep += 1;
  $(`#flowStep${flowStep}`).hidden = false;
  $('#flowProgressLabel').textContent = language === 'tg' ? `Қадами ${flowStep} аз 3` : `Шаг ${flowStep} из 3`;
  $('#flowProgressBar').style.width = `${flowStep * 33.333}%`;
  if (flowStep === 3) {
    const delivery = $('input[name="delivery"]:checked').value;
    $('#deliverySummary').textContent = delivery === 'home' ? translate('homeDelivery') : translate('serviceCenter');
  }
  $('.mobile-scroll').scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  $(`#flowStep${flowStep} h2`)?.focus?.({ preventScroll: true });
}

function submitFlow() {
  $('#flowStep3').hidden = true;
  $('#flowSuccess').hidden = false;
  $('.flow-progress').hidden = true;
  $('.nav-badge').textContent = '3';
  if (!$('#newApplicationCard')) {
    const card = document.createElement('button');
    card.type = 'button';
    card.id = 'newApplicationCard';
    card.className = 'application-card';
    card.dataset.appStatus = 'active';
    card.dataset.openApplication = 'passport';
    card.innerHTML = `<span class="application-icon t-blue">${icon('i-cat-passport')}</span><span class="application-copy"><span class="status-label">${language === 'tg' ? 'Фиристода шуд' : 'Отправлено'}</span><strong>${translate('passportRenewal')}</strong><span>№ТҶ-2026-184551 · ${translate('today')}</span></span>${icon('i-chev-r')}`;
    $('#applicationList').prepend(card);
  }
}

function showQr() {
  lastFocused = document.activeElement;
  $('#qrModal').hidden = false;
  $('#qrModal [data-close-qr]').focus({ preventScroll: true });
}

function closeQr() {
  $('#qrModal').hidden = true;
  lastFocused?.focus?.({ preventScroll: true });
}

function buildQr() {
  const svg = $('#qrGraphic');
  const ns = 'http://www.w3.org/2000/svg';
  const modules = new Set();
  const finder = (x, y) => {
    for (let row = 0; row < 7; row += 1) for (let col = 0; col < 7; col += 1) {
      if (row === 0 || row === 6 || col === 0 || col === 6 || (row >= 2 && row <= 4 && col >= 2 && col <= 4)) modules.add(`${x + col},${y + row}`);
    }
  };
  finder(1, 1); finder(21, 1); finder(1, 21);
  for (let y = 1; y < 28; y += 1) for (let x = 1; x < 28; x += 1) {
    if (((x * 7 + y * 11 + x * y) % 9 < 3) && !((x < 9 && y < 9) || (x > 19 && y < 9) || (x < 9 && y > 19))) modules.add(`${x},${y}`);
  }
  modules.forEach(value => {
    const [x, y] = value.split(',').map(Number);
    const rect = document.createElementNS(ns, 'rect');
    rect.setAttribute('x', x); rect.setAttribute('y', y); rect.setAttribute('width', 1); rect.setAttribute('height', 1); rect.setAttribute('fill', 'currentColor');
    svg.append(rect);
  });
}

document.addEventListener('click', event => {
  const nav = event.target.closest('[data-nav]');
  if (nav) { closeSheets({ restoreFocus: false }); navigate(nav.dataset.nav); return; }

  const preview = event.target.closest('[data-preview-screen]');
  if (preview) { navigate(preview.dataset.previewScreen); return; }

  const service = event.target.closest('[data-service]');
  if (service) { if (event.target.closest('[data-close-sheet]')) closeSheets({ restoreFocus: false, immediate: true }); openService(service.dataset.service); return; }

  const application = event.target.closest('[data-open-application]');
  if (application) { closeSheets({ restoreFocus: false, immediate: true }); renderApplicationDetail(application.dataset.openApplication); return; }

  if (event.target.closest('[data-open-notifications]')) { openSheet($('#notificationSheet')); return; }
  if (event.target.closest('[data-close-sheet]') || event.target === $('#sheetOverlay')) { closeSheets(); return; }
  if (event.target.closest('[data-back]')) { navigate(previousScreen === 'application-detail' || previousScreen === 'service-flow' ? 'home' : previousScreen); return; }
  if (event.target.closest('[data-close-flow]')) { navigate('services'); return; }
  if (event.target.closest('[data-flow-next]')) { advanceFlow(); return; }
  if (event.target.closest('[data-show-qr]') || event.target.closest('[data-document]')) { showQr(); return; }
  if (event.target.closest('[data-close-qr]')) { closeQr(); return; }
  const toastButton = event.target.closest('[data-toast-copy]');
  if (toastButton) showToast(toastText[language][toastButton.dataset.toastCopy] || toastButton.dataset.toastCopy);
});

$('#startService').addEventListener('click', () => {
  closeSheets({ restoreFocus: false });
  if (currentService.id === 'passport') { resetFlow(); navigate('service-flow'); }
  else if (currentService.id === 'birth') renderApplicationDetail('birth');
  else showToast(language === 'tg' ? 'Ин ҷараён дар марҳилаи навбатии прототип илова мешавад' : 'Этот сценарий появится в следующей итерации прототипа');
});

$('#serviceSearch').addEventListener('input', renderServices);
$('#clearSearch').addEventListener('click', () => { $('#serviceSearch').value = ''; renderServices(); $('#serviceSearch').focus(); });
$$('[data-category]').forEach(button => button.addEventListener('click', () => {
  currentCategory = button.dataset.category;
  $$('[data-category]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  renderServices();
}));
$$('[data-app-filter]').forEach(button => button.addEventListener('click', () => {
  $$('[data-app-filter]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  $$('[data-app-status]').forEach(card => { card.hidden = card.dataset.appStatus !== button.dataset.appFilter; });
}));
$$('[data-focus-search]').forEach(button => button.addEventListener('click', () => setTimeout(() => $('#serviceSearch').focus(), 0)));

$('#flowConsent').addEventListener('change', event => { $('#submitApplication').disabled = !event.target.checked; });
$('#submitApplication').addEventListener('click', submitFlow);
$('input[name="delivery"]').closest('.choice-list').addEventListener('change', () => {
  const checked = $('input[name="delivery"]:checked');
  $('#deliverySummary').textContent = checked.value === 'home' ? translate('homeDelivery') : translate('serviceCenter');
});

$('#languageToggle').addEventListener('click', () => {
  language = language === 'ru' ? 'tg' : 'ru';
  setLang(language);
  renderCopy();
});
$('#themeToggle').addEventListener('click', () => { toggleTheme(); renderCopy(); });

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  if (!$('#qrModal').hidden) closeQr();
  else if ($$('.bottom-sheet:not([hidden])').length) closeSheets();
  else if (currentScreen === 'application-detail' || currentScreen === 'service-flow') navigate(previousScreen);
});

if (!['tg', 'ru'].includes(getLang())) setLang('ru');
if (new URLSearchParams(location.search).get('mode') === 'app') document.body.classList.add('is-app-mode');
applyPreferences();
buildQr();
renderCopy();
navigate('home');
