const STORAGE_KEY = 'ekh.demo.lowcode.v2';
const PRIMARY_SERVICE_ID = 'ngo-registration';

const MAIN_AUDIT = [
  { type:'created', at:'12.08.2026 · 10:18', title:{ru:'Услуга создана',tg:'Хизмат сохта шуд'}, text:{ru:'Фаррух Ниёзов создал черновик услуги',tg:'Фаррух Ниёзов сиёҳнависи хизматро сохт'} },
  { type:'edited', at:'12.08.2026 · 16:05', title:{ru:'Настроены поля и маршрут',tg:'Майдонҳо ва масир танзим шуданд'}, text:{ru:'Добавлены 6 полей, сроки и уведомления',tg:'6 майдон, муҳлат ва огоҳиҳо илова шуданд'} },
  { type:'submitted', at:'13.08.2026 · 09:42', title:{ru:'Отправлено на рассмотрение',tg:'Ба баррасӣ фиристода шуд'}, text:{ru:'Версия 1.0 передана Service Approver',tg:'Версияи 1.0 ба Service Approver супурда шуд'} },
];

const DEFAULT_STATE = {
  role:'reviewer',
  serviceVersion:'1.0',
  audience:['person','guest'],
  status:'in_review',
  comments:[],
  changedSections:['Описание','Поля заявления','Маршрут','Уведомления'],
  serviceName:{ru:'Регистрация некоммерческой организации',tg:'Бақайдгирии ташкилоти ғайритиҷоратӣ'},
  agencyName:{ru:'Министерство юстиции',tg:'Вазорати адлия'},
  formFields:[
    {id:'org-name',label:{ru:'Название организации',tg:'Номи ташкилот'},type:'text',required:true},
    {id:'legal-form',label:{ru:'Организационно-правовая форма',tg:'Шакли ташкилию ҳуқуқӣ'},type:'select',required:true},
    {id:'contact',label:{ru:'Контактное лицо',tg:'Шахси тамос'},type:'text',required:true},
    {id:'phone',label:{ru:'Номер телефона',tg:'Рақами телефон'},type:'text',required:true},
    {id:'charter',label:{ru:'Устав организации',tg:'Оинномаи ташкилот'},type:'file',required:true},
    {id:'address',label:{ru:'Юридический адрес',tg:'Суроғаи ҳуқуқӣ'},type:'text',required:true},
  ],
  review:null,
  publishedAt:null,
  audit:MAIN_AUDIT,
  queueStates:{},
};

const INITIAL_QUEUE_STATES = {
  'land-extract':{
    status:'resubmitted', version:'1.2', review:null, publishedAt:null,
    comments:[
      {id:'land-c1',author:'reviewer',body:{ru:'Укажите источник данных и срок актуальности выписки.',tg:'Манбаи маълумот ва муҳлати эътибори иқтибосро нишон диҳед.'},anchor:{ru:'Результат услуги',tg:'Натиҷаи хизмат'},at:'12.08 · 11:16'},
      {id:'land-c2',author:'agency-author',body:{ru:'Источник и срок добавлены в описание результата.',tg:'Манбаъ ва муҳлат ба тавсифи натиҷа илова шуданд.'},anchor:{ru:'Результат услуги',tg:'Натиҷаи хизмат'},at:'13.08 · 08:54',reply:true},
    ],
    audit:[
      {type:'created',at:'08.08.2026 · 09:12',title:{ru:'Услуга создана',tg:'Хизмат сохта шуд'},text:{ru:'Мехринисо Саидова создала черновик',tg:'Меҳринисо Саидова сиёҳнависро сохт'}},
      {type:'submitted',at:'11.08.2026 · 15:30',title:{ru:'Версия 1.1 отправлена на проверку',tg:'Версияи 1.1 ба санҷиш фиристода шуд'},text:{ru:'Все обязательные поля заполнены',tg:'Ҳамаи майдонҳои ҳатмӣ пур шуданд'}},
      {type:'changes',at:'12.08.2026 · 11:16',title:{ru:'Запрошена доработка',tg:'Такмил дархост шуд'},text:{ru:'Комментарий к результату услуги',tg:'Шарҳ ба натиҷаи хизмат'}},
      {type:'resubmitted',at:'13.08.2026 · 08:55',title:{ru:'Версия 1.2 отправлена повторно',tg:'Версияи 1.2 такроран фиристода шуд'},text:{ru:'Автор внёс исправления',tg:'Муаллиф ислоҳот ворид кард'}},
    ],
  },
  'construction-permit':{
    status:'approved', version:'2.1', publishedAt:null,
    review:{by:'Зарина Хакимова',at:'13.08.2026 · 10:05'},
    comments:[
      {id:'permit-c1',author:'reviewer',body:{ru:'Исправлена формулировка основания для отказа.',tg:'Ибораи асос барои рад ислоҳ шуд.'},anchor:{ru:'Условия отказа',tg:'Шартҳои рад'},at:'12.08 · 14:08'},
    ],
    audit:[
      {type:'created',at:'03.08.2026 · 13:40',title:{ru:'Услуга создана',tg:'Хизмат сохта шуд'},text:{ru:'Далер Шарипов создал новую версию действующей услуги',tg:'Далер Шарипов версияи нави хизмати амалкунандаро сохт'}},
      {type:'submitted',at:'11.08.2026 · 09:20',title:{ru:'Версия 2.0 отправлена на проверку',tg:'Версияи 2.0 ба санҷиш фиристода шуд'},text:{ru:'Изменены маршрут и перечень документов',tg:'Масир ва рӯйхати ҳуҷҷатҳо тағйир ёфт'}},
      {type:'changes',at:'12.08.2026 · 14:08',title:{ru:'Запрошена доработка',tg:'Такмил дархост шуд'},text:{ru:'Уточнить условия отказа',tg:'Шартҳои радро дақиқ кардан'}},
      {type:'resubmitted',at:'13.08.2026 · 09:18',title:{ru:'Версия 2.1 отправлена повторно',tg:'Версияи 2.1 такроран фиристода шуд'},text:{ru:'Замечание исправлено автором',tg:'Эзоҳ аз ҷониби муаллиф ислоҳ шуд'}},
      {type:'approved',at:'13.08.2026 · 10:05',title:{ru:'Услуга подтверждена',tg:'Хизмат тасдиқ шуд'},text:{ru:'Service Approver: Зарина Хакимова',tg:'Service Approver: Зарина Ҳакимова'}},
    ],
  },
  'family-certificate':{
    status:'published', version:'3.0', publishedAt:'12.08.2026 · 17:30',
    review:{by:'Зарина Хакимова',at:'12.08.2026 · 16:52'}, comments:[],
    audit:[
      {type:'created',at:'05.08.2026 · 10:10',title:{ru:'Версия 3.0 создана',tg:'Версияи 3.0 сохта шуд'},text:{ru:'Нилуфар Каримова обновила описание и форму',tg:'Нилуфар Каримова тавсиф ва шаклро нав кард'}},
      {type:'submitted',at:'11.08.2026 · 13:44',title:{ru:'Отправлено на проверку',tg:'Ба санҷиш фиристода шуд'},text:{ru:'Версия 3.0',tg:'Версияи 3.0'}},
      {type:'approved',at:'12.08.2026 · 16:52',title:{ru:'Услуга подтверждена',tg:'Хизмат тасдиқ шуд'},text:{ru:'Проверка завершена без замечаний',tg:'Санҷиш бе эзоҳ анҷом ёфт'}},
      {type:'published',at:'12.08.2026 · 17:30',title:{ru:'Услуга опубликована',tg:'Хизмат нашр шуд'},text:{ru:'Service Publisher: Комрон Алиев',tg:'Service Publisher: Комрон Алиев'}},
    ],
  },
};

const TRANSITIONS = {
  draft:{SAVE_STAGE:'stage',SEND_REVIEW:'in_review'},
  stage:{SAVE_STAGE:'stage',SEND_REVIEW:'in_review'},
  in_review:{REQUEST_CHANGES:'changes_requested',APPROVE:'approved'},
  changes_requested:{SAVE_STAGE:'changes_requested',RESUBMIT:'resubmitted'},
  resubmitted:{REQUEST_CHANGES:'changes_requested',APPROVE:'approved'},
  approved:{PUBLISH:'published'},
  published:{},
};

const COPY = {
  ru:{
    author:'Автор услуги',reviewer:'Service Approver',admin:'Service Publisher',role:'Роль в процессе',draft:'Черновик',stage:'На stage',in_review:'На рассмотрении',changes_requested:'На доработке',resubmitted:'Повторная проверка',approved:'Подтверждено',published:'Опубликовано',
    stageEnv:'Stage',version:'Версия',audiences:'Получатели',person:'Физическое лицо',business:'Юридическое лицо',guest:'Без авторизации',history:'Версия и история',comments:'Комментарии',noComments:'Комментариев пока нет.',reviewQueue:'Проверка и публикация',reviewLead:'Проверяйте готовые услуги, возвращайте замечания автору и публикуйте подтверждённые версии.',
    approverInbox:'На проверке',repeatTab:'Повторно',completedTab:'Подтверждённые',readyTab:'К публикации',publishedTab:'Опубликованные',allTab:'Весь цикл',changesTab:'На доработке',
    queueTitle:'Услуги в работе',queueHint:'Откройте строку, чтобы увидеть полный вид услуги и доступные действия.',search:'Поиск по услуге, автору или коду…',filterAgency:'Ведомство',any:'Все ведомства',serviceColumn:'Услуга',createdBy:'Создал услугу',submittedAt:'Дата и время',status:'Статус',openService:'Открыть услугу',found:n=>`${n} ${n===1?'услуга':'услуги'}`,
    emptyTitle:'В этом разделе пока нет услуг',emptyBody:'Измените фильтр или выберите другую вкладку.',backToList:'Назад к списку',serviceOverview:'Общий вид готовой услуги',serviceOverviewHint:'Так услуга выглядит перед публикацией: описание, условия, поля и маршрут.',description:'Описание услуги',agency:'Ведомство',serviceCode:'Код услуги',delivery:'Срок оказания',price:'Стоимость',free:'Бесплатно',days3:'До 3 рабочих дней',days5:'До 5 рабочих дней',days7:'До 7 рабочих дней',
    applicationForm:'Форма заявления',required:'Обязательное поле',route:'Маршрут обработки',route1:'Приём и автоматическая проверка заявления',route2:'Проверка документов ответственным сотрудником',route3:'Формирование результата и уведомление заявителя',notifications:'Уведомления',notificationText:'SMS и уведомление в личном кабинете при каждом изменении статуса.',
    metadata:'Сведения о версии',changed:'Что изменено',checklist:'Готовность к проверке',check1:'Названия заполнены на русском и таджикском',check2:'Обязательные поля и подсказки настроены',check3:'Маршрут, сроки и уведомления заполнены',action:'Текущий этап',addComment:'Добавить комментарий',commentAdded:'Комментарий добавлен',commentPlaceholder:'Опишите, что именно нужно исправить…',commentAnchor:'Раздел услуги',general:'Общее замечание',request:'Вернуть на доработку',approve:'Подтвердить',publish:'Опубликовать',resubmit:'Отправить повторно',reply:'Ответить на замечание',needsComment:'Добавьте комментарий: автору должно быть понятно, что исправить.',
    timeline:'История создания и изменений',timelineHint:'Service Publisher видит весь путь этой версии.',reviewSummary:'Результат проверки',approvedBy:'Подтвердил',publishedBy:'Опубликовал',notAvailable:'Действие станет доступно на следующем этапе.',openBuilder:'Открыть в конструкторе',reset:'Сбросить демо',
    publishTitle:'Публикация услуги',publishLead:'После публикации эта версия станет доступна гражданам. Текущая опубликованная версия будет сохранена в истории.',publishConfirm:'Опубликовать версию',cancel:'Отмена',publishedToast:'Услуга опубликована',approvedToast:'Услуга подтверждена и передана Service Publisher',changesToast:'Услуга возвращена автору на доработку',sentToast:'Исправленная версия отправлена повторно',
    authorCannot:'Автор не может подтверждать или публиковать услугу.',publisherHint:'Откройте подтверждённую услугу, изучите весь цикл изменений и опубликуйте версию.',approverHint:'Откройте услугу, проверьте полный вид и подтвердите её или верните автору с комментарием.',authorHint:'Здесь видны услуги, которые нужно исправить и отправить повторно.',
  },
  tg:{
    author:'Муаллифи хизмат',reviewer:'Service Approver',admin:'Service Publisher',role:'Нақш дар раванд',draft:'Сиёҳнавис',stage:'Дар stage',in_review:'Дар баррасӣ',changes_requested:'Барои такмил',resubmitted:'Санҷиши такрорӣ',approved:'Тасдиқшуда',published:'Нашршуда',
    stageEnv:'Stage',version:'Версия',audiences:'Гирандагон',person:'Шахси воқеӣ',business:'Шахси ҳуқуқӣ',guest:'Бе воридшавӣ',history:'Версия ва таърих',comments:'Шарҳҳо',noComments:'Ҳоло шарҳ нест.',reviewQueue:'Санҷиш ва нашр',reviewLead:'Хизматҳои тайёрро санҷед, эзоҳҳоро ба муаллиф баргардонед ва версияҳои тасдиқшударо нашр кунед.',
    approverInbox:'Дар санҷиш',repeatTab:'Такрорӣ',completedTab:'Тасдиқшуда',readyTab:'Барои нашр',publishedTab:'Нашршуда',allTab:'Тамоми раванд',changesTab:'Барои такмил',
    queueTitle:'Хизматҳо дар кор',queueHint:'Барои дидани намуди пурра ва амалҳои дастрас сатрро кушоед.',search:'Ҷустуҷӯ аз рӯи хизмат, муаллиф ё рамз…',filterAgency:'Идора',any:'Ҳамаи идораҳо',serviceColumn:'Хизмат',createdBy:'Хизматро сохт',submittedAt:'Сана ва вақт',status:'Ҳолат',openService:'Кушодани хизмат',found:n=>`${n} хизмат`,
    emptyTitle:'Дар ин бахш ҳоло хизмат нест',emptyBody:'Филтрро иваз кунед ё бахши дигарро интихоб намоед.',backToList:'Бозгашт ба рӯйхат',serviceOverview:'Намуди умумии хизмати тайёр',serviceOverviewHint:'Хизмат пеш аз нашр чунин менамояд: тавсиф, шартҳо, майдонҳо ва масир.',description:'Тавсифи хизмат',agency:'Идора',serviceCode:'Рамзи хизмат',delivery:'Муҳлати хизмат',price:'Арзиш',free:'Ройгон',days3:'То 3 рӯзи корӣ',days5:'То 5 рӯзи корӣ',days7:'То 7 рӯзи корӣ',
    applicationForm:'Шакли дархост',required:'Майдони ҳатмӣ',route:'Масири коркард',route1:'Қабул ва санҷиши худкори дархост',route2:'Санҷиши ҳуҷҷатҳо аз ҷониби корманди масъул',route3:'Омода кардани натиҷа ва огоҳ кардани дархосткунанда',notifications:'Огоҳиҳо',notificationText:'SMS ва огоҳӣ дар кабинети шахсӣ ҳангоми ҳар тағйири ҳолат.',
    metadata:'Маълумоти версия',changed:'Чӣ тағйир ёфт',checklist:'Омодагӣ ба санҷиш',check1:'Номҳо ба тоҷикӣ ва русӣ пур шудаанд',check2:'Майдонҳои ҳатмӣ ва роҳнамо танзим шудаанд',check3:'Масир, муҳлат ва огоҳиҳо пур шудаанд',action:'Марҳилаи ҷорӣ',addComment:'Илова кардани шарҳ',commentAdded:'Шарҳ илова шуд',commentPlaceholder:'Дақиқ нависед, ки чӣ бояд ислоҳ шавад…',commentAnchor:'Қисми хизмат',general:'Эзоҳи умумӣ',request:'Барои такмил баргардондан',approve:'Тасдиқ кардан',publish:'Нашр кардан',resubmit:'Такроран фиристодан',reply:'Ҷавоб ба эзоҳ',needsComment:'Шарҳ илова кунед: муаллиф бояд фаҳмад, ки чӣ ислоҳ шавад.',
    timeline:'Таърихи сохтан ва тағйирот',timelineHint:'Service Publisher тамоми роҳи ин версияро мебинад.',reviewSummary:'Натиҷаи санҷиш',approvedBy:'Тасдиқ кард',publishedBy:'Нашр кард',notAvailable:'Амал дар марҳилаи навбатӣ дастрас мешавад.',openBuilder:'Дар конструктор кушодан',reset:'Аз нав оғоз кардани демо',
    publishTitle:'Нашри хизмат',publishLead:'Пас аз нашр ин версия ба шаҳрвандон дастрас мешавад. Версияи ҷории нашршуда дар таърих мемонад.',publishConfirm:'Нашри версия',cancel:'Бекор',publishedToast:'Хизмат нашр шуд',approvedToast:'Хизмат тасдиқ ва ба Service Publisher супурда шуд',changesToast:'Хизмат барои такмил ба муаллиф баргардонида шуд',sentToast:'Версияи ислоҳшуда такроран фиристода шуд',
    authorCannot:'Муаллиф хизматро тасдиқ ё нашр карда наметавонад.',publisherHint:'Хизмати тасдиқшударо кушоед, тамоми тағйиротро бинед ва версияро нашр кунед.',approverHint:'Хизматро кушоед, намуди пурраро санҷед ва тасдиқ кунед ё бо шарҳ ба муаллиф баргардонед.',authorHint:'Дар ин ҷо хизматҳое ҳастанд, ки бояд ислоҳ ва такроран фиристода шаванд.',
  },
};

const SERVICE_RECORDS = [
  {
    id:PRIMARY_SERVICE_ID,
    name:{ru:'Регистрация некоммерческой организации',tg:'Бақайдгирии ташкилоти ғайритиҷоратӣ'},
    agency:{ru:'Министерство юстиции',tg:'Вазорати адлия'}, creator:'Фаррух Ниёзов', createdAt:'12.08.2026 · 10:18', submittedAt:'13.08.2026 · 09:42', code:'SVC-JUS-014', delivery:'days5', price:'free', audience:['person','guest'],
    description:{ru:'Государственная регистрация общественных объединений и других некоммерческих организаций с получением электронного свидетельства.',tg:'Бақайдгирии давлатии иттиҳодияҳои ҷамъиятӣ ва дигар ташкилотҳои ғайритиҷоратӣ бо гирифтани шаҳодатномаи электронӣ.'},
    changed:{ru:['Описание','Поля заявления','Маршрут','Уведомления'],tg:['Тавсиф','Майдонҳои дархост','Масир','Огоҳиҳо']},
  },
  {
    id:'land-extract',name:{ru:'Выписка из реестра земельных участков',tg:'Иқтибос аз феҳристи қитъаҳои замин'},agency:{ru:'Комитет по землеустройству',tg:'Кумитаи заминсозӣ'},creator:'Мехринисо Саидова',createdAt:'08.08.2026 · 09:12',submittedAt:'13.08.2026 · 08:55',code:'SVC-LND-021',delivery:'days3',price:'free',audience:['person','business'],
    description:{ru:'Получение электронной выписки о зарегистрированном земельном участке и его правообладателе.',tg:'Гирифтани иқтибоси электронӣ дар бораи қитъаи замини бақайдгирифташуда ва соҳиби ҳуқуқ.'},changed:{ru:['Результат услуги','Источник данных'],tg:['Натиҷаи хизмат','Манбаи маълумот']},
    fields:[{label:{ru:'Кадастровый номер',tg:'Рақами кадастрӣ'},type:'text'},{label:{ru:'Цель получения выписки',tg:'Мақсади гирифтани иқтибос'},type:'select'},{label:{ru:'Документ заявителя',tg:'Ҳуҷҷати дархосткунанда'},type:'file'}],
  },
  {
    id:'construction-permit',name:{ru:'Разрешение на строительство',tg:'Иҷозат барои сохтмон'},agency:{ru:'Комитет архитектуры и строительства',tg:'Кумитаи меъморӣ ва сохтмон'},creator:'Далер Шарипов',createdAt:'03.08.2026 · 13:40',submittedAt:'13.08.2026 · 09:18',code:'SVC-ARC-008',delivery:'days7',price:{ru:'120 сомони',tg:'120 сомонӣ'},audience:['person','business'],
    description:{ru:'Подача заявления и документов для получения разрешения на строительство объекта.',tg:'Пешниҳоди ариза ва ҳуҷҷатҳо барои гирифтани иҷозати сохтмони иншоот.'},changed:{ru:['Маршрут','Документы','Условия отказа'],tg:['Масир','Ҳуҷҷатҳо','Шартҳои рад']},
    fields:[{label:{ru:'Адрес объекта',tg:'Суроғаи иншоот'},type:'text'},{label:{ru:'Кадастровый номер',tg:'Рақами кадастрӣ'},type:'text'},{label:{ru:'Проектная документация',tg:'Ҳуҷҷатҳои лоиҳавӣ'},type:'file'},{label:{ru:'Правоустанавливающий документ',tg:'Ҳуҷҷати тасдиқкунандаи ҳуқуқ'},type:'file'}],
  },
  {
    id:'family-certificate',name:{ru:'Справка о составе семьи',tg:'Маълумотнома дар бораи ҳайати оила'},agency:{ru:'Органы ЗАГС',tg:'Мақомоти САҲШ'},creator:'Нилуфар Каримова',createdAt:'05.08.2026 · 10:10',submittedAt:'11.08.2026 · 13:44',code:'SVC-FAM-001',delivery:'days3',price:'free',audience:['person','guest'],
    description:{ru:'Получение электронной справки о зарегистрированном составе семьи.',tg:'Гирифтани маълумотномаи электронӣ дар бораи ҳайати бақайдгирифташудаи оила.'},changed:{ru:['Описание','Форма заявления'],tg:['Тавсиф','Шакли дархост']},
    fields:[{label:{ru:'ПИН заявителя',tg:'РМА-и дархосткунанда'},type:'text'},{label:{ru:'Адрес регистрации',tg:'Суроғаи бақайдгирӣ'},type:'text'}],
  },
];

let state = load();
const listeners = new Set();
/* the URL's ?lang= only reflects how the page was first opened — once the switcher
   fires bp:langchange, that's the live language, even if the URL never changes */
let langOverride = null;
document.addEventListener('bp:langchange', event => { langOverride = (event.detail && event.detail.lang) || langOverride; });
const lang = () => { if(langOverride) return langOverride; try { return new URLSearchParams(location.search).get('lang') || localStorage.getItem('ekh.preferences.lang') || 'tg'; } catch(e) { return 'tg'; } };
const c = () => COPY[lang()] || COPY.tg;
const localized = (value, fallback='') => typeof value === 'string' ? value : value?.[lang()] || value?.ru || fallback;
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));

function clone(value){ return JSON.parse(JSON.stringify(value)); }
function load(){
  try {
    const stored=JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      ...DEFAULT_STATE,
      ...stored,
      audience:Array.isArray(stored.audience)?stored.audience:[...DEFAULT_STATE.audience],
      audit:Array.isArray(stored.audit)?stored.audit:clone(MAIN_AUDIT),
      queueStates:{...clone(INITIAL_QUEUE_STATES),...(stored.queueStates||{})},
    };
  } catch(e) {
    return {...DEFAULT_STATE,audience:[...DEFAULT_STATE.audience],audit:clone(MAIN_AUDIT),queueStates:clone(INITIAL_QUEUE_STATES)};
  }
}
function persist(){ try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e) {} }
function notify(){ listeners.forEach(fn=>fn(state)); window.dispatchEvent(new CustomEvent('ekh:lowcode',{detail:state})); }
function toast(message){ window.bpToast?.(message); }
window.addEventListener('storage',event=>{ if(event.key===STORAGE_KEY){state=load();notify();} });

export function getLowCodeState(){ return state; }
export function subscribeLowCode(fn){ listeners.add(fn); return ()=>listeners.delete(fn); }

function recordById(id){ return SERVICE_RECORDS.find(record=>record.id===id); }

/* Which records are actionable for a role right now. One selector feeds the rail
   badge, the dashboard task panel and the review queue, so the three can never
   disagree about how much work is waiting. */
const ACTIONABLE = {
  reviewer:['in_review','resubmitted'],
  'portal-admin':['approved'],
  'agency-author':['changes_requested'],
};
export function getReviewQueue(role=state.role){
  const statuses=ACTIONABLE[role]||ACTIONABLE.reviewer;
  return SERVICE_RECORDS
    .map(record=>({record,workflow:workflowFor(record.id)}))
    .filter(item=>statuses.includes(item.workflow.status));
}
/* one status vocabulary for the rail, the dashboard and the queue */
export function describeStatus(status){
  const tone=statusTone(status);
  return {
    label:c()[status]||status,
    tone:({draft:'neutral',stage:'info',review:'info',changes:'warning',approved:'success',published:'success'})[tone]||'neutral',
    icon:statusIconName(status),
  };
}
export function localizeValue(value,fallback=''){ return localized(value,fallback); }
export function getRoleHint(role=state.role){
  const x=c();
  return role==='portal-admin'?x.publisherHint:role==='agency-author'?x.authorHint:x.approverHint;
}
function workflowFor(id){
  if(id===PRIMARY_SERVICE_ID) return {status:state.status,version:String(state.serviceVersion),comments:state.comments||[],review:state.review,publishedAt:state.publishedAt,audit:state.audit||[]};
  return state.queueStates[id] || clone(INITIAL_QUEUE_STATES[id]);
}
function commitWorkflow(id,workflow){
  if(id===PRIMARY_SERVICE_ID){
    state={...state,status:workflow.status,serviceVersion:workflow.version,comments:workflow.comments||[],review:workflow.review||null,publishedAt:workflow.publishedAt||null,audit:workflow.audit||[]};
  } else {
    state={...state,queueStates:{...state.queueStates,[id]:workflow}};
  }
  persist();notify();
}
function timeNow(){ return new Intl.DateTimeFormat(lang()==='ru'?'ru-RU':'tg-TJ',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date()).replace(',',' ·'); }
function eventCopy(type){
  const ru={changes:['Возвращено на доработку','Service Approver оставил замечания'],approved:['Услуга подтверждена','Версия передана Service Publisher'],published:['Услуга опубликована','Версия доступна гражданам'],resubmitted:['Отправлено повторно','Автор внёс исправления']};
  const tg={changes:['Барои такмил баргардонида шуд','Service Approver эзоҳ гузошт'],approved:['Хизмат тасдиқ шуд','Версия ба Service Publisher супурда шуд'],published:['Хизмат нашр шуд','Версия ба шаҳрвандон дастрас аст'],resubmitted:['Такроран фиристода шуд','Муаллиф ислоҳот ворид кард']};
  const pair=(lang()==='ru'?ru:tg)[type]||[type,'']; return {title:pair[0],text:pair[1]};
}

export function dispatchLowCode(event,payload={}){
  if(event==='RESET'){
    state={...DEFAULT_STATE,audience:[...DEFAULT_STATE.audience],comments:[],audit:clone(MAIN_AUDIT),queueStates:clone(INITIAL_QUEUE_STATES)};
    persist();notify();return state;
  }
  if(event==='SET_ROLE'){state={...state,role:payload.role};persist();notify();return state;}
  if(event==='UPDATE_SERVICE'){
    state={...state,serviceName:{...(state.serviceName||DEFAULT_STATE.serviceName),...(payload.serviceName||{})},formFields:Array.isArray(payload.formFields)?payload.formFields:(state.formFields||DEFAULT_STATE.formFields)};
    persist();notify();return state;
  }
  if(event==='SET_AUDIENCE'){
    const audience=state.audience.includes(payload.value)?state.audience.filter(value=>value!==payload.value):[...state.audience,payload.value];
    if(audience.length)state={...state,audience};persist();notify();return state;
  }

  const serviceId=payload.serviceId||PRIMARY_SERVICE_ID;
  const workflow={...workflowFor(serviceId),comments:[...(workflowFor(serviceId).comments||[])],audit:[...(workflowFor(serviceId).audit||[])]};
  if(event==='ADD_COMMENT'){
    const body=String(payload.body||'').trim(); if(!body)return state;
    workflow.comments.push({id:`c-${Date.now()}`,author:state.role,body,anchor:payload.anchor||c().general,at:timeNow(),reply:state.role==='agency-author'});
    commitWorkflow(serviceId,workflow);return state;
  }
  if(event==='REPLY'){
    const body=String(payload.body||'').trim(); if(!body)return state;
    workflow.comments.push({id:`c-${Date.now()}`,author:'agency-author',body,anchor:payload.anchor||c().general,at:timeNow(),reply:true});
  }
  const next=TRANSITIONS[workflow.status]?.[event];
  if(next){
    workflow.status=next;
    const type=event==='REQUEST_CHANGES'?'changes':event==='APPROVE'?'approved':event==='PUBLISH'?'published':event==='RESUBMIT'?'resubmitted':'';
    if(type){const copy=eventCopy(type);workflow.audit.push({type,at:timeNow(),title:copy.title,text:copy.text});}
    if(event==='RESUBMIT')workflow.version=(Number(workflow.version)+0.1).toFixed(1);
    if(event==='APPROVE')workflow.review={by:'Зарина Хакимова',at:timeNow()};
    if(event==='PUBLISH')workflow.publishedAt=timeNow();
  }
  commitWorkflow(serviceId,workflow);return state;
}

function serviceLabel(){ return localized(state.serviceName,c().service); }
function agencyLabel(){ return localized(state.agencyName,c().agency); }
function statusTone(status){ return ({draft:'draft',stage:'stage',in_review:'review',changes_requested:'changes',resubmitted:'review',approved:'approved',published:'published'})[status]||'draft'; }
function statusIconName(status){ return ({draft:'i-edit',stage:'i-clock',in_review:'i-clock',changes_requested:'i-edit',resubmitted:'i-refresh',approved:'i-check',published:'i-check'})[status]||'i-dots'; }
function statusBadge(status=state.status){ const label=c()[status]||status,tone=statusTone(status);const iconTone=({draft:'neutral',stage:'info',review:'info',changes:'warning',approved:'success',published:'success'})[tone]||'neutral';return `<span class="status-icon status-icon--${iconTone}" role="img" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}"><svg aria-hidden="true"><use href="/design-system/assets/icons.svg#${statusIconName(status)}"/></svg></span>`; }
function stageBadge(label,iconOnly=false){ return `<span class="environment-badge environment-badge--stage${iconOnly?' lc-icon-badge':''}"${iconOnly?` role="img" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}"`:''}>${iconOnly?'<svg aria-hidden="true"><use href="/design-system/assets/icons.svg#i-clock"/></svg>':escapeHtml(label)}</span>`; }
function audienceBadges(audiences=state.audience,iconOnly=false){ const x=c(),icons={person:'i-role',business:'i-biz',guest:'i-user'};return audiences.map(a=>`<span class="audience-badge audience-badge--${a==='guest'?'guest':a==='business'?'business':'person'}${iconOnly?' lc-icon-badge':''}"${iconOnly?` role="img" aria-label="${escapeHtml(x[a])}" title="${escapeHtml(x[a])}"`:''}>${iconOnly?`<svg aria-hidden="true"><use href="/design-system/assets/icons.svg#${icons[a]||'i-user'}"/></svg>`:escapeHtml(x[a])}</span>`).join(''); }
function roleSelect(compact=false,showLabel=true){
  const x=c();
  return `<label class="lc-role${compact?' lc-role--compact':''}">${showLabel?`<span>${x.role}</span>`:''}${compact?'<svg class="lc-role__icon" aria-hidden="true"><use href="/design-system/assets/icons.svg#i-role"/></svg>':''}<select class="input" data-lc-role aria-label="${escapeHtml(x.role)}"><option value="reviewer" ${state.role==='reviewer'?'selected':''}>${x.reviewer}</option><option value="portal-admin" ${state.role==='portal-admin'?'selected':''}>${x.admin}</option><option value="agency-author" ${state.role==='agency-author'?'selected':''}>${x.author}</option></select></label>`;
}
function fieldTypeIcon(type){ return type==='file'?'i-doc':type==='select'?'i-chev-d':'i-check'; }
function recordFields(record){
  if(record.id===PRIMARY_SERVICE_ID)return (state.formFields||[]).map(field=>({...field,label:field.label||{ru:'Поле',tg:'Майдон'}}));
  return record.fields||[];
}

function commentsMarkup(record){
  const x=c(),workflow=workflowFor(record.id);
  if(!workflow.comments?.length)return `<div class="lc-comment-empty"><svg><use href="/design-system/assets/icons.svg#i-chat"/></svg><p>${x.noComments}</p></div>`;
  return `<div class="lc-comment-thread">${workflow.comments.map(comment=>`<article class="lc-comment ${comment.reply?'lc-comment--reply':''}"><div class="lc-comment__meta"><b>${comment.author==='reviewer'?x.reviewer:comment.author==='portal-admin'?x.admin:x.author}</b><span>${escapeHtml(comment.at)}</span></div><span class="lc-comment__anchor">${escapeHtml(localized(comment.anchor,x.general))}</span><p>${escapeHtml(localized(comment.body))}</p></article>`).join('')}</div>`;
}
function timelineMarkup(record){
  const x=c(),workflow=workflowFor(record.id);
  return `<section class="panel lc-history-panel"><div class="lc-section-heading"><div><span class="eyebrow">Workflow</span><h3>${x.timeline}</h3><p>${x.timelineHint}</p></div><span class="metachip">${workflow.audit?.length||0}</span></div><ol class="lc-timeline">${(workflow.audit||[]).slice().reverse().map((event,index)=>`<li class="lc-timeline__item lc-timeline__item--${escapeHtml(event.type||'edited')} ${index===0?'is-current':''}"><span class="lc-timeline__dot"><svg><use href="/design-system/assets/icons.svg#${event.type==='published'?'i-arrow-ur':event.type==='approved'?'i-check':'i-clock'}"/></svg></span><div><time>${escapeHtml(event.at)}</time><b>${escapeHtml(localized(event.title))}</b><p>${escapeHtml(localized(event.text))}</p></div></li>`).join('')}</ol></section>`;
}

function renderBuilder(){
  const root=document.querySelector('#lowCodeBuilder');if(!root)return;const x=c();
  root.innerHTML=`<div class="lc-builder-main"><div class="lc-builder-id"><p class="lc-builder-ver" title="${escapeHtml(MAIN_AUDIT[MAIN_AUDIT.length-1].at)}"><b>${x.version} ${escapeHtml(state.serviceVersion)}</b></p><span class="environment-badge environment-badge--stage">${x.stageEnv}</span></div><span class="lc-bar-sep" aria-hidden="true"></span><div class="lc-aud"><span class="lc-field-label">${x.audiences}</span><div class="audience-selector">${['person','business','guest'].map(a=>`<label><input type="checkbox" data-lc-audience="${a}" ${state.audience.includes(a)?'checked':''}><span>${x[a]}</span></label>`).join('')}</div></div><div class="lc-builder-act"><span class="lc-comments-tag">${x.comments}<span class="metachip">${state.comments.length}</span></span><span class="lc-bar-sep" aria-hidden="true"></span>${roleSelect(true,false)}<a class="btn btn-sec btn-sm" href="review.html">${x.reviewQueue}</a></div></div>${state.comments.length?`<div class="lc-builder-thread">${commentsMarkup(recordById(PRIMARY_SERVICE_ID))}</div>`:''}`;
  const status=document.querySelector('#svcStatus');if(status){const label=x[state.status]||state.status,tone=({draft:'neutral',stage:'info',review:'info',changes:'warning',approved:'success',published:'success'})[statusTone(state.status)]||'neutral';status.className=`status-icon status-icon--${tone}`;status.setAttribute('aria-label',label);status.title=label;status.innerHTML=`<svg aria-hidden="true"><use href="/design-system/assets/icons.svg#${statusIconName(state.status)}"/></svg>`;}
  const send=document.querySelector('#approveBtn');if(send){send.textContent=state.status==='changes_requested'?x.resubmit:x.approverInbox;send.disabled=state.role!=='agency-author'||!['draft','stage','changes_requested'].includes(state.status);}
  const publish=document.querySelector('#publishBtn');if(publish){publish.disabled=!(state.role==='portal-admin'&&state.status==='approved');}
}

/* The low-code demo service is a record like any other, so it renders as a
   registry row rather than a hero card advertising one item on a browse page
   (design-guide rules 4 and 6). */
function renderRegistry(){
  const root=document.querySelector('#lowCodeRegistry');if(!root)return;
  const x=c(),record=recordById(PRIMARY_SERVICE_ID),editable=['draft','stage','changes_requested'].includes(state.status);
  const registryStatus=({draft:'draft',stage:'draft',in_review:'in_review',changes_requested:'in_review',resubmitted:'in_review',approved:'approved',published:'published'})[state.status]||'draft';
  root.innerHTML=`<a class="ekh-list-row" href="${editable?'builder.html':`review.html?service=${record.id}`}" data-audience="${state.audience.join(' ')}" data-status="${registryStatus}">
    <span class="nm"><b>${escapeHtml(serviceLabel())}</b><span class="k">${escapeHtml(agencyLabel())} · ${escapeHtml(record.code)}</span></span>
    <span class="ekh-list-cell svc-audience">${audienceBadges(state.audience,true)}</span>
    <span class="ekh-list-cell"><b>${(state.formFields||[]).length}</b></span>
    <span class="ekh-list-cell">${escapeHtml(x.free.toLowerCase())}</span>
    <span class="ekh-list-cell">${escapeHtml((state.audit?.[state.audit.length-1]?.at||record.submittedAt).split(' ·')[0])}</span>
    ${statusBadge()}
  </a>`;
}

function renderRoleControl(){
  const slot=document.querySelector('#adminRoleSlot');if(slot)slot.innerHTML=roleSelect(true);
}

let reviewTab='review';
let reviewView='list';
let selectedServiceId=null;
let reviewQuery='';
let reviewAgency='all';

/* §7: tab, agency and the open service live in the URL so reload, back and a
   shared link land on what the reviewer was looking at. All three are ASCII
   slugs from a closed allow-list; the free-text query stays out (same rule the
   registry follows). */
function syncReviewUrl(){
  if(typeof history?.replaceState!=='function')return;
  const url=new URL(location.href);
  const set=(key,value)=>value?url.searchParams.set(key,value):url.searchParams.delete(key);
  set('tab',reviewTab!==defaultTabForRole()?reviewTab:'');
  set('agency',reviewAgency!=='all'?reviewAgency:'');
  set('service',reviewView==='detail'&&selectedServiceId?selectedServiceId:'');
  if(url.href!==location.href)history.replaceState(null,'',url);
}
function restoreReviewUrl(){
  if(!document.querySelector('#lowCodeReview'))return;
  let params;
  try{ params=new URLSearchParams(location.search); }catch(e){ return; }
  const agency=params.get('agency');
  if(agency&&SERVICE_RECORDS.some(record=>record.id===agency))reviewAgency=agency;
  const tab=params.get('tab');
  if(tab&&tabsForRole().some(item=>item.id===tab))reviewTab=tab;
  const service=params.get('service');
  if(service&&SERVICE_RECORDS.some(record=>record.id===service)){selectedServiceId=service;reviewView='detail';}
}

function tabsForRole(){
  const x=c();
  if(state.role==='portal-admin')return [{id:'ready',label:x.readyTab,statuses:['approved']},{id:'published',label:x.publishedTab,statuses:['published']},{id:'all',label:x.allTab,statuses:null}];
  if(state.role==='agency-author')return [{id:'changes',label:x.changesTab,statuses:['changes_requested']},{id:'all',label:x.allTab,statuses:null}];
  return [{id:'review',label:x.approverInbox,statuses:['in_review']},{id:'repeat',label:x.repeatTab,statuses:['resubmitted']},{id:'completed',label:x.completedTab,statuses:['approved']}];
}
function defaultTabForRole(){ return state.role==='portal-admin'?'ready':state.role==='agency-author'?'changes':'review'; }
function roleHint(){ const x=c();return state.role==='portal-admin'?x.publisherHint:state.role==='agency-author'?x.authorHint:x.approverHint; }
function visibleRecords(){
  const tab=tabsForRole().find(item=>item.id===reviewTab)||tabsForRole()[0];
  const query=reviewQuery.trim().toLowerCase();
  return SERVICE_RECORDS.filter(record=>{
    const workflow=workflowFor(record.id);
    const statusMatch=!tab.statuses||tab.statuses.includes(workflow.status);
    const agencyMatch=reviewAgency==='all'||record.id===reviewAgency;
    const haystack=[localized(record.name),localized(record.agency),record.creator,record.code].join(' ').toLowerCase();
    return statusMatch&&agencyMatch&&(!query||haystack.includes(query));
  });
}

function queueMarkup(){
  const x=c(),records=visibleRecords();
  const agencies=SERVICE_RECORDS.map(record=>`<option value="${record.id}" ${reviewAgency===record.id?'selected':''}>${escapeHtml(localized(record.agency))}</option>`).join('');
  return `<section class="panel lc-queue-panel"><div class="lc-queue-toolbar"><div><h2>${x.queueTitle}</h2></div><span class="lc-result-count">${x.found(records.length)}</span></div><div class="lc-review-filters"><label class="lc-search-field"><span class="input lc-search-input"><svg><use href="/design-system/assets/icons.svg#i-search"/></svg><input type="search" data-lc-search value="${escapeHtml(reviewQuery)}" placeholder="${x.search}" aria-label="${x.search}"></span></label><label><select class="input" data-lc-filter="agency" aria-label="${x.filterAgency}"><option value="all">${x.any}</option>${agencies}</select></label></div>${records.length?`<div class="lc-queue-table" role="table" aria-label="${x.queueTitle}"><div class="lc-queue-table__head" role="row"><span role="columnheader">${x.serviceColumn}</span><span role="columnheader">${x.createdBy}</span><span role="columnheader">${x.submittedAt}</span><span role="columnheader">${x.version}</span><span role="columnheader">${x.status}</span><span aria-hidden="true"></span></div><div class="lc-queue-table__body">${records.map(queueRowMarkup).join('')}</div></div>`:`<div class="reg-empty lc-queue-empty"><svg><use href="/design-system/assets/icons.svg#i-search"/></svg><b>${x.emptyTitle}</b><p>${x.emptyBody}</p></div>`}</section>`;
}
function queueRowMarkup(record){
  const x=c(),workflow=workflowFor(record.id);
  return `<button class="lc-queue-row" type="button" data-lc-service="${record.id}" role="row" aria-label="${x.openService}: ${escapeHtml(localized(record.name))}"><span class="lc-queue-service" role="cell"><span class="lc-queue-icon"><svg><use href="/design-system/assets/icons.svg#i-cat-cert"/></svg></span><span><b>${escapeHtml(localized(record.name))}</b><small>${escapeHtml(localized(record.agency))} · ${escapeHtml(record.code)}</small></span></span><span class="lc-queue-person" role="cell"><span><b>${escapeHtml(record.creator)}</b><small>${escapeHtml(record.createdAt)}</small></span></span><time role="cell">${escapeHtml(record.submittedAt)}</time><span class="lc-version" role="cell">v${escapeHtml(workflow.version)}</span><span role="cell">${statusBadge(workflow.status)}</span><svg class="lc-row-arrow" aria-hidden="true"><use href="/design-system/assets/icons.svg#i-chev-r"/></svg></button>`;
}

function serviceOverviewMarkup(record){
  const x=c(),fields=recordFields(record);
  return `<section class="panel lc-service-overview"><div class="lc-overview-banner"><div><span class="eyebrow">${x.serviceOverview}</span><h2>${escapeHtml(localized(record.name))}</h2><p>${escapeHtml(localized(record.description))}</p></div><span class="lc-overview-mark"><svg><use href="/design-system/assets/icons.svg#i-logo"/></svg></span></div><div class="lc-facts"><div><span>${x.agency}</span><b>${escapeHtml(localized(record.agency))}</b></div><div><span>${x.serviceCode}</span><b>${escapeHtml(record.code)}</b></div><div><span>${x.delivery}</span><b>${escapeHtml(x[record.delivery])}</b></div><div><span>${x.price}</span><b>${escapeHtml(record.price==='free'?x.free:localized(record.price))}</b></div></div><div class="lc-overview-section"><div class="lc-section-heading"><div><span class="eyebrow">01</span><h3>${x.applicationForm}</h3></div><span class="metachip">${fields.length}</span></div><div class="lc-form-preview">${fields.map((field,index)=>`<div class="lc-preview-field"><span class="lc-preview-field__number">${String(index+1).padStart(2,'0')}</span><span class="lc-preview-field__icon"><svg><use href="/design-system/assets/icons.svg#${fieldTypeIcon(field.type)}"/></svg></span><span><b>${escapeHtml(localized(field.label))}</b><small>${x.required}</small></span></div>`).join('')}</div></div><div class="lc-overview-section"><div class="lc-section-heading"><div><span class="eyebrow">02</span><h3>${x.route}</h3></div></div><ol class="lc-route"><li><span>1</span><p>${x.route1}</p></li><li><span>2</span><p>${x.route2}</p></li><li><span>3</span><p>${x.route3}</p></li></ol></div><div class="lc-overview-section lc-notification"><span class="lc-notification__icon"><svg><use href="/design-system/assets/icons.svg#i-bell"/></svg></span><div><h3>${x.notifications}</h3><p>${x.notificationText}</p></div></div></section>`;
}

function detailSidebar(record){
  const x=c(),workflow=workflowFor(record.id),canReview=state.role==='reviewer'&&['in_review','resubmitted'].includes(workflow.status),canResubmit=state.role==='agency-author'&&workflow.status==='changes_requested';
  const anchors=[x.general,x.description,x.applicationForm,x.route,x.notifications];
  return `<aside class="lc-review-side"><section class="panel lc-version-panel"><div class="lc-section-heading"><div><span class="eyebrow">${x.metadata}</span><h3>v${escapeHtml(workflow.version)}</h3></div>${statusBadge(workflow.status)}</div><dl class="lc-metadata"><div><dt>${x.createdBy}</dt><dd>${escapeHtml(record.creator)}</dd></div><div><dt>${x.submittedAt}</dt><dd>${escapeHtml(record.submittedAt)}</dd></div><div><dt>${x.audiences}</dt><dd>${audienceBadges(record.audience)}</dd></div><div><dt>${x.changed}</dt><dd>${record.changed[lang()]?.map(value=>`<span class="lc-change-chip">${escapeHtml(value)}</span>`).join('')||''}</dd></div>${workflow.review?`<div><dt>${x.approvedBy}</dt><dd>${escapeHtml(workflow.review.by)}<small>${escapeHtml(workflow.review.at)}</small></dd></div>`:''}${workflow.publishedAt?`<div><dt>${x.publishedBy}</dt><dd>Комрон Алиев<small>${escapeHtml(workflow.publishedAt)}</small></dd></div>`:''}</dl></section><section class="panel lc-comments-panel"><div class="lc-section-heading"><div><span class="eyebrow">Review</span><h3>${x.comments}</h3></div><span class="metachip">${workflow.comments?.length||0}</span></div>${commentsMarkup(record)}${canReview||canResubmit?`<div class="lc-comment-compose"><label><span>${x.commentAnchor}</span><select class="input" id="lcCommentAnchor">${anchors.map(anchor=>`<option>${anchor}</option>`).join('')}</select></label><label><span>${canResubmit?x.reply:x.addComment}</span><textarea class="input" id="lcComment" placeholder="${x.commentPlaceholder}"></textarea></label><button class="btn btn-sec btn-sm" data-lc-action="ADD_COMMENT">${canResubmit?x.reply:x.addComment}</button></div>`:''}</section>${state.role==='reviewer'?`<section class="panel lc-check-panel"><h3>${x.checklist}</h3><ul class="lc-checks"><li><svg><use href="/design-system/assets/icons.svg#i-check"/></svg>${x.check1}</li><li><svg><use href="/design-system/assets/icons.svg#i-check"/></svg>${x.check2}</li><li><svg><use href="/design-system/assets/icons.svg#i-check"/></svg>${x.check3}</li></ul></section>`:''}</aside>`;
}

function actionBar(record){
  const x=c(),workflow=workflowFor(record.id),canReview=state.role==='reviewer'&&['in_review','resubmitted'].includes(workflow.status),canPublish=state.role==='portal-admin'&&workflow.status==='approved',canResubmit=state.role==='agency-author'&&workflow.status==='changes_requested';
  return `<footer class="lc-actionbar"><span>${x.action}: <b>${x[workflow.status]}</b></span><div>${canReview?`<button class="btn btn-sec" data-lc-action="REQUEST_CHANGES">${x.request}</button><button class="btn btn-pri" data-lc-action="APPROVE"><svg><use href="/design-system/assets/icons.svg#i-check"/></svg>${x.approve}</button>`:''}${canPublish?`<button class="btn btn-pri" data-lc-action="PUBLISH"><svg><use href="/design-system/assets/icons.svg#i-arrow-ur"/></svg>${x.publish}</button>`:''}${canResubmit?`<button class="btn btn-pri" data-lc-action="RESUBMIT">${x.resubmit}</button>`:''}${!canReview&&!canPublish&&!canResubmit?`<span class="lc-action-note">${x.notAvailable}</span>`:''}</div></footer>`;
}
function detailMarkup(record){
  const x=c();
  return `<button class="btn btn-ghost lc-back" type="button" data-lc-back><svg><use href="/design-system/assets/icons.svg#i-chev-l"/></svg>${x.backToList}</button><article class="lc-detail-head"><div class="lc-detail-head__meta">${statusBadge(workflowFor(record.id).status)}<span class="metachip">v${escapeHtml(workflowFor(record.id).version)}</span></div><h1>${escapeHtml(localized(record.name))}</h1><p>${x.serviceOverviewHint}</p></article><div class="lc-review-grid">${serviceOverviewMarkup(record)}${detailSidebar(record)}</div>${timelineMarkup(record)}${actionBar(record)}`;
}

function renderReview(){
  const root=document.querySelector('#lowCodeReview');if(!root)return;const x=c();
  syncReviewUrl();
  const tabs=tabsForRole();if(!tabs.some(tab=>tab.id===reviewTab))reviewTab=defaultTabForRole();
  const selected=selectedServiceId&&recordById(selectedServiceId);
  root.innerHTML=`<header class="lc-review-head"><div><h1>${x.reviewQueue}</h1><p>${x.reviewLead}</p></div></header>${reviewView==='list'?`<div class="lc-review-context"><span class="lc-context-icon"><svg><use href="/design-system/assets/icons.svg#${state.role==='portal-admin'?'i-arrow-ur':state.role==='agency-author'?'i-edit':'i-check'}"/></svg></span><p>${roleHint()}</p></div><div class="lc-review-tabs" role="tablist">${tabs.map(tab=>`<button class="tab" type="button" role="tab" data-lc-tab="${tab.id}" aria-selected="${reviewTab===tab.id}" tabindex="${reviewTab===tab.id?'0':'-1'}">${tab.label}</button>`).join('')}</div>${queueMarkup()}`:(selected?detailMarkup(selected):queueMarkup())}`;
}

function openPublishSummary(record){
  const x=c(),workflow=workflowFor(record.id),id='lowCodeActionOverlay';document.querySelector(`#${id}`)?.remove();
  const overlay=document.createElement('div');overlay.className='overlay';overlay.id=id;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','publishServiceTitle');
  overlay.innerHTML=`<div class="modal wide left lc-publish-modal"><span class="mic"><svg><use href="/design-system/assets/icons.svg#i-arrow-ur"/></svg></span><h2 id="publishServiceTitle">${x.publishTitle}</h2><p>${x.publishLead}</p><div class="lc-publish-summary"><div><span>${x.serviceColumn}</span><b>${escapeHtml(localized(record.name))}</b></div><div><span>${x.version}</span><b>v${escapeHtml(workflow.version)}</b></div><div><span>${x.approvedBy}</span><b>${escapeHtml(workflow.review?.by||'Service Approver')}</b></div><div><span>${x.history}</span><b>${workflow.audit?.length||0}</b></div></div><button class="btn btn-pri btn-block" data-lc-confirm="PUBLISH" data-lc-confirm-service="${record.id}">${x.publishConfirm}</button><button class="btn btn-ghost btn-block" data-close>${x.cancel}</button></div>`;
  document.body.append(overlay);window.bpOpen?.(id);
}

function handleAction(action){
  const x=c(),record=recordById(selectedServiceId||PRIMARY_SERVICE_ID);if(!record)return;
  const body=document.querySelector('#lcComment')?.value.trim()||'';
  const anchor=document.querySelector('#lcCommentAnchor')?.value||x.general;
  if(action==='ADD_COMMENT'){if(!body){toast(x.needsComment);return;}dispatchLowCode('ADD_COMMENT',{serviceId:record.id,body,anchor});toast(x.commentAdded);return;}
  if(action==='REQUEST_CHANGES'){
    const workflow=workflowFor(record.id);
    const hasReviewerComment=workflow.comments?.some(comment=>comment.author==='reviewer');
    if(!body&&!hasReviewerComment){toast(x.needsComment);document.querySelector('#lcComment')?.focus();return;}
    if(body)dispatchLowCode('ADD_COMMENT',{serviceId:record.id,body,anchor});
    dispatchLowCode('REQUEST_CHANGES',{serviceId:record.id});toast(x.changesToast);return;
  }
  if(action==='APPROVE'){dispatchLowCode('APPROVE',{serviceId:record.id});toast(x.approvedToast);return;}
  if(action==='PUBLISH'){openPublishSummary(record);return;}
  if(action==='RESUBMIT'){
    if(body)dispatchLowCode('ADD_COMMENT',{serviceId:record.id,body,anchor});
    dispatchLowCode('RESUBMIT',{serviceId:record.id});toast(x.sentToast);return;
  }
}

function bind(){
  document.addEventListener('change',event=>{
    const role=event.target.closest('[data-lc-role]');
    if(role){reviewTab=role.value==='portal-admin'?'ready':role.value==='agency-author'?'changes':'review';reviewView='list';selectedServiceId=null;dispatchLowCode('SET_ROLE',{role:role.value});return;}
    const filter=event.target.closest('[data-lc-filter]');if(filter){reviewAgency=filter.value;renderReview();return;}
    const audience=event.target.closest('[data-lc-audience]');if(audience)dispatchLowCode('SET_AUDIENCE',{value:audience.dataset.lcAudience});
  });
  document.addEventListener('input',event=>{if(event.target.matches('[data-lc-search]')){reviewQuery=event.target.value;renderReview();document.querySelector('[data-lc-search]')?.focus();}});
  document.addEventListener('keydown',event=>{
    const tab=event.target.closest('[data-lc-tab]');if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    const tabs=[...document.querySelectorAll('[data-lc-tab]')];let index=tabs.indexOf(tab);if(event.key==='Home')index=0;else if(event.key==='End')index=tabs.length-1;else index=(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;event.preventDefault();tabs[index].click();
  });
  document.addEventListener('click',event=>{
    const tab=event.target.closest('[data-lc-tab]');if(tab){reviewTab=tab.dataset.lcTab;renderReview();return;}
    const service=event.target.closest('[data-lc-service]');if(service){selectedServiceId=service.dataset.lcService;reviewView='detail';renderReview();window.scrollTo({top:0,behavior:'smooth'});return;}
    if(event.target.closest('[data-lc-back]')){reviewView='list';selectedServiceId=null;renderReview();return;}
    const confirm=event.target.closest('[data-lc-confirm]');if(confirm){const serviceId=confirm.dataset.lcConfirmService||PRIMARY_SERVICE_ID;dispatchLowCode(confirm.dataset.lcConfirm,{serviceId});document.querySelector('#lowCodeActionOverlay')?.remove();toast(c().publishedToast);return;}
    const action=event.target.closest('[data-lc-action]');if(action){handleAction(action.dataset.lcAction);return;}
  },true);
  document.querySelector('#saveBtn')?.addEventListener('click',event=>{event.stopImmediatePropagation();dispatchLowCode('SAVE_STAGE');},true);
  document.querySelector('#approveBtn')?.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();if(state.role==='agency-author')dispatchLowCode(state.status==='changes_requested'?'RESUBMIT':'SEND_REVIEW');},true);
  document.querySelector('#publishBtn')?.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();if(state.role==='portal-admin'&&state.status==='approved')openPublishSummary(recordById(PRIMARY_SERVICE_ID));},true);
}

function renderAll(){renderRoleControl();renderBuilder();renderRegistry();renderReview();}
restoreReviewUrl();bind();subscribeLowCode(renderAll);renderAll();
const originalSetLang=window.bpSetLang;
if(originalSetLang)window.bpSetLang=function(next){originalSetLang(next);renderAll();};
