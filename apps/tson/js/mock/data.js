/* ============================================================
   mock/data.js — §11.4. Каталог услуг, скоупы, вымышленные граждане.

   §10: «Мок-граждане — только вымышленные». Ни одного реального ИНН, ФИО
   или адреса здесь быть не должно — файл уедет в демо стейкхолдерам.

   Каталог — 12 услуг (§11.4), у каждой: категория (→ hue по §4.4), срок,
   пошлина, документы, требуемые скоупы, мгновенная/отложенная. Формы
   полностью прописаны у двух услуг, как требует §11.4: «Справка о составе
   семьи» (простая, мгновенная — главный демо-сценарий §13) и «Регистрация
   брака» (сложная, отложенная).
   ============================================================ */

export const OPERATORS = [
  { login: 'operator.sino04', name: 'Фируза', full: 'Рахимова Фируза Саидовна' },
];

export const TSONS = [
  { id: 'sino',     name: 'р-н Сино',     windows: [1, 2, 3, 4, 5, 6] },
  { id: 'firdavsi', name: 'р-н Фирдавси', windows: [1, 2, 3, 4] },
  { id: 'shohmansur', name: 'р-н Шохмансур', windows: [1, 2, 3] },
  { id: 'somoni',   name: 'р-н И. Сомони', windows: [1, 2, 3, 4, 5] },
];

/* ---------- скоупы согласия (§3.2, §6/S3) ----------
   base: true — стартовый скоуп, уходит вместе с запросом идентификации.
   Остальные запрашиваются прогрессивно, по требованию услуги (§6/S4, S5).
   tab — подпись вкладки в S5; она короче полного названия из согласия:
   в согласии гражданину нужна точность, во вкладке оператору — скорость. */
export const SCOPES = {
  // Название скоупа оператор читает гражданину вслух — оно обязано
  // перечислять то, что в скоупе действительно есть. Телефон переехал в
  // профиль (см. CITIZENS), значит и в согласии он должен быть назван.
  profile:   { id: 'profile',   name: 'Профиль (ФИО, дата рождения, телефон)', tab: 'Профиль', base: true },
  documents: { id: 'documents', name: 'Документы, удостоверяющие личность',  tab: 'Документы', base: true },
  address:   { id: 'address',   name: 'Адрес регистрации',                   tab: 'Адрес',     base: true },
  family:    { id: 'family',    name: 'Состав семьи',                        tab: 'Семья',     base: false },
  vehicles:  { id: 'vehicles',  name: 'Транспорт',                           tab: 'Транспорт', base: false },
  income:    { id: 'income',    name: 'Доходы и налоги',                     tab: 'Доходы',    base: false },
};

export const BASE_SCOPES = Object.values(SCOPES).filter(s => s.base).map(s => s.id);

/* Порядок вкладок в S5. Выданные скоупы идут первыми, замки — в хвосте:
   оператор чаще ходит в выданное, а замки не должны толкать его вкладки. */
export const SCOPE_ORDER = ['profile', 'documents', 'address', 'family', 'vehicles', 'income'];

/* ---------- вымышленный гражданин (§10) ----------
   «Каримзода Аброр, ИНН 123456789». Ключи верхнего уровня — ровно id скоупов:
   citizen.get(scope) отдаёт citizen[scope] и ничего больше, поэтому невыданный
   скоуп физически не может просочиться в ответ (§6/S5 приёмка). */
export const CITIZENS = [
  {
    id: 'c-1',
    /* Биометрия — атрибут УЧЁТНОЙ ЗАПИСИ, а не скоуп: это учётные данные для
       входа (как «есть приложение» или «есть пароль»), а не сведения о
       человеке. Поэтому она лежит в корне записи, а не внутри профиля, и НИКОГДА
       не проходит через citizen.get() — тот отдаёт только ключи-скоупы, а
       `biometric` скоупом не является. Существующий гражданин уже сдал лицо при
       регистрации, поэтому вход по Face ID (§6/S2) ему доступен; у только что
       зарегистрированного шаблон появляется на шаге захвата (enroll.captureFace). */
    biometric: { face: true, enrolledAt: '05.04.2019' },
    profile: {
      full: 'Каримзода Аброр Фирузович',
      birth: '14.02.1991',
      inn: '123456789',
      // Телефон лежит ВНУТРИ профиля, а не рядом с гражданином, и это не
      // перестановка полей. Раньше он был свойством записи — то есть данными
      // о человеке вне какого бы то ни было скоупа: реестр знал номер,
      // согласие о нём не спрашивало, а форма S6 всё равно требовала вводить
      // его руками. Внутри профиля он подчиняется тому же правилу, что ФИО:
      // выдан скоуп — автозаполняется, не выдан — его нет.
      phone: '+992 90 123 45 67',
      source: { registry: 'Гражданский реестр', updated: '12.07.2026' },
    },
    documents: {
      items: [
        /* verified — паспорт сверен с оригиналом при регистрации в ЦОНе (§6/S2b).
           Факт сверки лежит ВНУТРИ скоупа documents, а не рядом с гражданином,
           и это не мелочь: S7 по нему закрывает пункт «паспорт (оригинал для
           сверки)» без нового скана, а значит — читает данные гражданина.
           Скоуп не выдан → факта в памяти нет → сверку не подставить.
           Приватность держится структурой, а не аккуратностью экрана (§2.3.1). */
        { type: 'Паспорт гражданина РТ', no: 'A 12 345 678', issued: '03.03.2019', by: 'ШВКД р-н Сино',
          expires: '03.03.2029', identity: true,
          verified: { at: '05.04.2019', by: 'ЦОН р-н Сино, окно 2' } },
        { type: 'Свидетельство о рождении', no: 'I-МЮ 456123', issued: '20.02.1991', by: 'ЗАГС р-н Сино' },
      ],
      source: { registry: 'Реестр документов', updated: '03.03.2019' },
    },
    address: {
      value: 'г. Душанбе, р-н Сино, ул. Айни, 24, кв. 12',
      since: '05.04.2019',
      source: { registry: 'Реестр адресов', updated: '01.06.2026' },
    },
    family: {
      items: [
        { rel: 'Супруга', full: 'Каримзода Нигина Аслановна', birth: '22.09.1993' },
        { rel: 'Сын',     full: 'Каримзода Сомон Аброрович',  birth: '11.01.2018' },
        { rel: 'Дочь',    full: 'Каримзода Ситора Аброровна', birth: '30.05.2021' },
      ],
      source: { registry: 'ЗАГС', updated: '30.05.2021' },
    },
    vehicles: {
      items: [
        { model: 'Opel Astra', year: '2014', plate: '01 АА 1234' },
      ],
      source: { registry: 'Реестр ТС', updated: '18.11.2023' },
    },
    income: {
      employer: 'ООО «Сомон Технолоджи»',
      debt: 'нет задолженности',
      source: { registry: 'Налоговый комитет', updated: '01.07.2026' },
    },
  },
];

/* Срез гражданина по выданным скоупам (§2.3.1, Д-02).

   Ключи верхнего уровня в CITIZENS — ровно id скоупов, поэтому «срез» — это
   выбор разрешённых ключей и ничего сверх: ни `phone`, ни `id`. Раньше
   GRANTED клал в память CITIZENS[0] целиком, вместе с family/vehicles/income,
   которых гражданин не выдавал: экран S5 был честным (он ходит через
   citizen.get() и 403), а память — нет. Гарантия «данные только в объёме
   согласия» держится тем, что лишнего просто нет в объекте. */
export function citizenSlice(scopes, citizen = CITIZENS[0]) {
  const out = {};
  for (const s of scopes) if (citizen[s] !== undefined) out[s] = citizen[s];
  return out;
}

/* ---------- реестр граждан (§6/S2b) ----------
   До S2b гражданин в моке был один и вечный: CITIZENS[0]. Регистрация нового
   гражданина ломает это допущение — в реестре появляется запись, которой пять
   минут назад не было, и всё, что дальше читает «гражданина», обязано читать
   ИМЕННО ЕГО, а не первого в массиве. Отсюда явный указатель current: его
   ставит идентификация (нашли по телефону) или регистрация (создали), и
   citizen.get() ходит только через него.

   Поиск по телефону — по цифрам, а не по строке: оператор наберёт «901234567»,
   а в реестре лежит «+992 90 123 45 67». */
export const digits = v => String(v || '').replace(/\D/g, '').replace(/^992/, '');

export const REGISTRY = {
  byPhone(phone) {
    const d = digits(phone);
    return CITIZENS.find(c => digits(c.profile?.phone) === d) || null;
  },

  byInn(inn) {
    const d = digits(inn);
    return CITIZENS.find(c => digits(c.profile?.inn) === d) || null;
  },

  add(record) {
    CITIZENS.push(record);
    return record;
  },

  /* «Сбросить всё» в демо-панели обязано откатывать и реестр. Иначе второй
     прогон демонстрации §6/S2b упирается в собственный результат первого:
     ИНН из распознавания уже занят, и вместо регистрации стейкхолдер видит
     «гражданин уже зарегистрирован». Поведение при этом ПРАВИЛЬНОЕ — дважды
     зарегистрировать одного человека нельзя, — но проверять его надо тогда,
     когда его показывают, а не в середине основного сценария. */
  reset() { CITIZENS.length = SEEDED; },
};

/* Сколько граждан было в реестре до первой регистрации. Считается один раз,
   на загрузке модуля: после этого длина массива меняется. */
const SEEDED = CITIZENS.length;

/* ---------- паспорт: что читает сканер (§6/S2b) ----------
   Порядок полей = порядок, в котором оператор сверяет их с разворотом
   паспорта, а не алфавит и не удобство формы: он ведёт пальцем по документу
   сверху вниз, и форма обязана идти рядом.

   zone — откуда пришло значение, и от неё зависит доверие к нему:
     · mrz    — машиночитаемая зона, есть контрольные цифры. Ошибку ловит сам
                считыватель, поэтому такие поля приходят «сверенными».
     · visual — визуальная зона: кириллица, печати, рукописные штампы. Здесь
                OCR ошибается, и именно эти поля оператор проверяет глазами.
   page — на каком развороте искать; S2b подсвечивает нужный скан, когда поле
   в фокусе, чтобы оператор не листал сканы вручную. */
export const PASSPORT_FIELDS = [
  { id: 'full',       label: 'ФИО',               group: 'person', type: 'text',   zone: 'mrz',    page: 1, required: true },
  { id: 'birth',      label: 'Дата рождения',     group: 'person', type: 'date',   zone: 'mrz',    page: 1, required: true },
  { id: 'sex',        label: 'Пол',               group: 'person', type: 'select', zone: 'mrz',    page: 1, required: true,
    options: [{ v: 'm', n: 'Мужской' }, { v: 'f', n: 'Женский' }] },
  { id: 'birthPlace', label: 'Место рождения',    group: 'person', type: 'text',   zone: 'visual', page: 1, required: false },

  { id: 'docNo',      label: 'Серия и номер',     group: 'doc',    type: 'text',   zone: 'mrz',    page: 1, required: true,
    help: 'Как в паспорте: A 12 345 678' },
  { id: 'issued',     label: 'Дата выдачи',       group: 'doc',    type: 'date',   zone: 'visual', page: 1, required: true },
  { id: 'expires',    label: 'Действителен до',   group: 'doc',    type: 'date',   zone: 'mrz',    page: 1, required: true },
  { id: 'issuedBy',   label: 'Кем выдан',         group: 'doc',    type: 'text',   zone: 'visual', page: 1, required: true },
  { id: 'inn',        label: 'ИНН',               group: 'doc',    type: 'inn',    zone: 'visual', page: 1, required: true,
    help: '9 цифр — из паспорта или свидетельства о присвоении' },

  { id: 'address',    label: 'Адрес регистрации', group: 'contact', type: 'text',  zone: 'visual', page: 2, required: true,
    help: 'Со страницы регистрации (прописки)' },
];

/* Группы полей = развороты паспорта, а не абстрактные «секции». Оператор
   сверяет форму с документом, и порядок групп должен совпадать с порядком, в
   котором он листает страницы. */
export const PASSPORT_GROUPS = [
  { id: 'person',  title: 'Личные данные' },
  { id: 'doc',     title: 'Документ' },
  { id: 'contact', title: 'Адрес и связь' },
];

/* Что снимает сканер. page совпадает с PASSPORT_FIELDS.page — по нему S2b
   показывает нужный разворот, когда поле в фокусе. */
export const PASSPORT_PAGES = [
  { page: 1, name: 'Разворот с фотографией', hint: 'Страница с фото и машиночитаемой зоной' },
  { page: 2, name: 'Страница регистрации',   hint: 'Штамп адресной регистрации (прописка)' },
];

/* Порог доверия к распознанному значению. Ниже него поле открыто на правку и
   помечено «проверьте» (§6/S2b): «распознано с уверенностью 0.62» оператору
   ничего не говорит, а «проверьте это поле» — говорит всё. */
export const OCR_TRUST = 0.9;

/* Сборка записи реестра из проверенной оператором формы (§6/S2b).

   Форма отдаёт плоский набор полей паспорта — реестр хранит их разложенными
   по скоупам, потому что выдаются они гражданином тоже по скоупам. Раскладка
   происходит ровно здесь, один раз, и повторяет форму CITIZENS[0]: любое
   расхождение вылезло бы в S5 у нового гражданина и нигде больше.

   Чего в записи НЕТ: family, vehicles, income. Их даёт не паспорт, а ЗАГС,
   БДД и налоговая — у только что зарегистрированного гражданина этих данных
   в реестре просто нет, и придумывать их значило бы показать в демо данные,
   которых неоткуда взяться. citizen.get() честно отдаст на них 404. */
export function buildCitizen(f, { phone, at, by }) {
  const today = at;
  return {
    id: `c-${CITIZENS.length + 1}`,
    profile: {
      full: f.full,
      birth: f.birth,
      inn: f.inn,
      sex: f.sex,
      birthPlace: f.birthPlace || null,
      phone,
      source: { registry: 'Гражданский реестр · регистрация в ЦОН', updated: today },
    },
    documents: {
      items: [{
        type: 'Паспорт гражданина РТ',
        no: f.docNo,
        issued: f.issued,
        by: f.issuedBy,
        expires: f.expires,
        identity: true,
        verified: { at: today, by },
      }],
      source: { registry: 'Реестр документов', updated: today },
    },
    address: {
      value: f.address,
      since: today,
      source: { registry: 'Реестр адресов', updated: today },
    },
  };
}

/* ---------- категории (§4.4) ----------
   14 иконок ↔ 14 hue-пар, ровно по таблице §4.4. count — витринный счётчик
   («46 услуг»), он больше, чем каталог из 12: каталог демонстрационный,
   а счётчик показывает реальный порядок ведомственного справочника. */
export const CATEGORIES = [
  { id: 'cert',      name: 'Справки и выписки',      icon: 'cat-cert',      hue: 'blue',   count: 31 },
  { id: 'health',    name: 'Здоровье',               icon: 'cat-health',    hue: 'rose',   count: 46 },
  { id: 'family',    name: 'Семья и брак',           icon: 'cat-family',    hue: 'pink',   count: 18 },
  { id: 'passport',  name: 'Паспорт и гражданство',  icon: 'cat-passport',  hue: 'steel',  count: 12 },
  { id: 'transport', name: 'Транспорт',              icon: 'cat-transport', hue: 'amber',  count: 21 },
  { id: 'edu',       name: 'Образование',            icon: 'cat-edu',       hue: 'indigo', count: 27 },
  { id: 'tax',       name: 'Налоги и финансы',       icon: 'cat-tax',       hue: 'green',  count: 24 },
  { id: 'land',      name: 'Земля и недвижимость',   icon: 'cat-land',      hue: 'terra',  count: 12 },
  { id: 'justice',   name: 'Юстиция и суд',          icon: 'cat-justice',   hue: 'violet', count: 9 },
  { id: 'gov',       name: 'Госорганы',              icon: 'cat-gov',       hue: 'slate',  count: 15 },
  { id: 'license',   name: 'Лицензии и разрешения',  icon: 'cat-license',   hue: 'teal',   count: 11 },
  { id: 'culture',   name: 'Культура и туризм',      icon: 'cat-culture',   hue: 'cyan',   count: 7 },
  { id: 'accred',    name: 'Аккредитация',           icon: 'cat-accred',    hue: 'olive',  count: 4 },
  { id: 'other',     name: 'Прочее',                 icon: 'cat-other',     hue: 'gray',   count: 6 },
];

export const CATEGORY = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

/* Жизненные ситуации (§6/S4) — вход в каталог «как думает гражданин»,
   а не «как устроено ведомство». Каждая раскрывается в подборку услуг. */
export const SITUATIONS = [
  { id: 'birth',  name: 'Рождение', icon: 'baby',   hue: 'pink',   services: ['birth-reg', 'fam-cert', 'kindergarten'] },
  { id: 'wed',    name: 'Брак',     icon: 'rings',  hue: 'rose',   services: ['marriage', 'fam-cert'] },
  { id: 'move',   name: 'Переезд',  icon: 'move',   hue: 'terra',  services: ['addr-reg', 'fam-cert', 'land-extract'] },
  { id: 'job',    name: 'Работа',   icon: 'job',    hue: 'indigo', services: ['no-crime', 'tax-debt'] },
  { id: 'retire', name: 'Пенсия',   icon: 'retire', hue: 'slate',  services: ['pension-cert', 'fam-cert'] },
  { id: 'biz',    name: 'Бизнес',   icon: 'biz',    hue: 'teal',   services: ['ip-reg', 'no-crime', 'tax-debt'] },
];

/* ---------- формы (§11.4 — «полностью прописываем формы двух услуг») ----------
   from: 'profile.full' — путь в данных скоупа. Поле с from автозаполняется и
   становится read-only с кнопкой «изменить» (§6/S6): реестровое значение
   нельзя испортить случайным нажатием, но можно осознанно поправить.
   Поля без from — ручные, чип «введено». */
const FORM_FAM_CERT = {
  sections: [
    {
      title: 'Заявитель',
      fields: [
        { id: 'full',  label: 'ФИО',     type: 'text',  from: 'profile.full', required: true },
        { id: 'inn',   label: 'ИНН',     type: 'inn',   from: 'profile.inn',  required: true },
        { id: 'birth', label: 'Дата рождения', type: 'date', from: 'profile.birth', required: true },
        { id: 'phone', label: 'Телефон', type: 'phone', from: 'profile.phone', required: true,
          help: 'Для уведомления о готовности' },
      ],
    },
    {
      title: 'Параметры справки',
      fields: [
        { id: 'purpose', label: 'Цель получения', type: 'select', required: true,
          options: [
            { v: 'bank',   n: 'Для банка' },
            { v: 'school', n: 'Для школы или детсада' },
            { v: 'work',   n: 'Для работодателя' },
            { v: 'court',  n: 'Для суда' },
            { v: 'other',  n: 'Иное' },
          ] },
        { id: 'lang', label: 'Язык справки', type: 'radio', value: 'tg',
          options: [{ v: 'tg', n: 'Тоҷикӣ' }, { v: 'ru', n: 'Русский' }] },
        { id: 'copies', label: 'Число экземпляров', type: 'select', value: '1',
          options: [{ v: '1', n: '1' }, { v: '2', n: '2' }, { v: '3', n: '3' }] },
      ],
    },
  ],
};

const FORM_MARRIAGE = {
  sections: [
    {
      title: 'Жених',
      fields: [
        { id: 'g_full',  label: 'ФИО',           type: 'text',  from: 'profile.full',  required: true },
        { id: 'g_inn',   label: 'ИНН',           type: 'inn',   from: 'profile.inn',   required: true },
        { id: 'g_birth', label: 'Дата рождения', type: 'date',  from: 'profile.birth', required: true },
        { id: 'g_addr',  label: 'Адрес',         type: 'text',  from: 'address.value', required: true },
        { id: 'g_phone', label: 'Телефон',       type: 'phone', from: 'profile.phone', required: true },
      ],
    },
    {
      title: 'Невеста',
      fields: [
        { id: 'b_full',  label: 'ФИО',           type: 'text', required: true },
        { id: 'b_inn',   label: 'ИНН',           type: 'inn',  required: true },
        { id: 'b_birth', label: 'Дата рождения', type: 'date', required: true },
        { id: 'b_addr',  label: 'Адрес',         type: 'text', required: true },
      ],
    },
    {
      title: 'Регистрация',
      fields: [
        { id: 'date',  label: 'Желаемая дата',  type: 'date', required: true,
          help: 'Не ранее месяца со дня подачи' },
        { id: 'place', label: 'Отдел ЗАГС', type: 'select', required: true,
          options: [
            { v: 'sino',   n: 'ЗАГС р-н Сино' },
            { v: 'firdav', n: 'ЗАГС р-н Фирдавси' },
            { v: 'palace', n: 'Дворец бракосочетаний' },
          ] },
        { id: 'surname', label: 'Фамилия после брака', type: 'select', required: true,
          options: [
            { v: 'his',  n: 'Фамилия мужа' },
            { v: 'hers', n: 'Фамилия жены' },
            { v: 'keep', n: 'Каждый остаётся при своей' },
          ] },
        { id: 'note', label: 'Примечание', type: 'textarea' },
      ],
    },
  ],
};

/* ---------- типовая форма-заглушка (§11.4, Д-01) ----------
   Полностью прописаны формы только двух услуг (fam-cert, marriage). У
   остальных десяти формы нет — и раньше S6 на них молча падал (renderForm
   безусловно читал svc.form.sections). В проде форму каждой услуги отдаёт
   бэкенд; прототипу нужна проходимая типовая, иначе 10 из 12 услуг не
   доходят до S8. Заглушка — заявитель из профиля + комментарий: минимум,
   которого хватает, чтобы услуга оформлялась до конца. Форма, а не
   disabled-CTA (§11.4): демо богаче, когда все услуги проходимы. */
export const FORM_STUB = {
  stub: true,
  sections: [
    {
      title: 'Заявитель',
      fields: [
        { id: 'full',  label: 'ФИО',           type: 'text',  from: 'profile.full',  required: true },
        { id: 'inn',   label: 'ИНН',           type: 'inn',   from: 'profile.inn',   required: true },
        { id: 'birth', label: 'Дата рождения', type: 'date',  from: 'profile.birth', required: true },
        { id: 'phone', label: 'Телефон',       type: 'phone', from: 'profile.phone', required: true,
          help: 'Для уведомления о готовности' },
      ],
    },
    {
      title: 'Заявление',
      fields: [
        { id: 'note', label: 'Комментарий', type: 'textarea',
          help: 'Уточнения по заявлению — при необходимости' },
      ],
    },
  ],
};

/* ---------- каталог (§11.4) ----------
   docs: required — без них S7 не отпустит заявление (§12, критерий Ф4).

   identity: true — «паспорт заявителя, оригинал для сверки». Ровно этот пункт
   S7 закрывает без скана, если паспорт гражданина уже сверен в eKhizmat
   (§6/S2b): сверять второй раз то, что ЦОН уже сверил и записал, — работа,
   которая существует только потому, что данные лежат в разных местах.

   Пометка стоит не у всех паспортных требований, и это не пропуск.
   «Паспорта ОБОИХ заявителей» (регистрация брака) закрыть нечем: в реестре
   есть один из двух. «Прежний паспорт» (замена паспорта) гражданин физически
   сдаёт — тут скан и есть предмет услуги, а не сверка личности.
   scopes — что нужно услуге. Всё сверх выданного запрашивается у гражданина
   прогрессивно (§6/S4), поэтому base-скоупы здесь тоже перечислены явно:
   услуга описывает свою потребность, а не разницу с текущим согласием. */
export const CATALOG = [
  {
    id: 'fam-cert', no: '01-114',
    name: 'Справка о составе семьи',
    cat: 'cert',
    synonyms: ['состав семьи', 'выписка из домовой книги', 'справка для банка'],
    about: 'Подтверждает состав семьи по данным гражданского реестра и адресной регистрации.',
    instant: true, fee: null,
    scopes: ['profile', 'address', 'family'],
    docs: [{ id: 'passport', name: 'Паспорт (оригинал для сверки)', required: true, identity: true }],
    form: FORM_FAM_CERT,
  },
  {
    id: 'marriage', no: '02-201',
    name: 'Регистрация брака',
    cat: 'family',
    synonyms: ['заключение брака', 'бракосочетание', 'загс'],
    about: 'Приём заявления о заключении брака. Регистрация — не ранее месяца со дня подачи.',
    instant: false, term: { d: 30 }, fee: 45,
    scopes: ['profile', 'documents', 'family'],
    docs: [
      { id: 'passport',  name: 'Паспорта обоих заявителей', required: true },
      { id: 'no-barrier', name: 'Справка об отсутствии препятствий', required: true },
      { id: 'med',       name: 'Медицинское заключение', required: false },
    ],
    form: FORM_MARRIAGE,
  },
  {
    id: 'birth-reg', no: '02-202',
    name: 'Регистрация рождения',
    cat: 'family',
    synonyms: ['свидетельство о рождении', 'новорождённый'],
    about: 'Государственная регистрация рождения и выдача свидетельства.',
    instant: false, term: { d: 3 }, fee: null,
    scopes: ['profile', 'family'],
    docs: [{ id: 'med-birth', name: 'Медицинская справка о рождении', required: true }],
  },
  {
    id: 'passport-replace', no: '03-310',
    name: 'Замена паспорта',
    cat: 'passport',
    synonyms: ['новый паспорт', 'просроченный паспорт', 'шиноснома'],
    about: 'Замена паспорта гражданина по истечении срока, смене данных или утрате.',
    instant: false, term: { d: 10 }, fee: 120,
    scopes: ['profile', 'documents', 'address'],
    docs: [
      { id: 'passport-old', name: 'Прежний паспорт', required: true },
      { id: 'photo', name: 'Фотография 3.5×4.5', required: true },
    ],
  },
  {
    id: 'no-crime', no: '04-401',
    name: 'Справка о несудимости',
    cat: 'justice',
    synonyms: ['несудимость', 'для визы', 'для работы'],
    about: 'Справка об отсутствии (наличии) судимости по данным МВД.',
    instant: false, term: { d: 5 }, fee: 25,
    scopes: ['profile', 'documents'],
    docs: [{ id: 'passport', name: 'Паспорт (оригинал для сверки)', required: true, identity: true }],
  },
  {
    id: 'addr-reg', no: '03-320',
    name: 'Адресная регистрация',
    cat: 'passport',
    synonyms: ['прописка', 'регистрация по месту жительства', 'переезд'],
    about: 'Постановка на регистрационный учёт по новому месту жительства.',
    instant: false, term: { d: 1, h: 4 }, fee: null,
    scopes: ['profile', 'documents', 'address'],
    docs: [
      { id: 'passport', name: 'Паспорт (оригинал для сверки)', required: true, identity: true },
      { id: 'owner-ok', name: 'Согласие собственника жилья', required: true },
    ],
  },
  {
    id: 'ip-reg', no: '05-501',
    name: 'Регистрация ИП',
    cat: 'license',
    synonyms: ['индивидуальный предприниматель', 'патент', 'бизнес'],
    about: 'Государственная регистрация индивидуального предпринимателя.',
    instant: false, term: { d: 3 }, fee: 100,
    scopes: ['profile', 'documents', 'income'],
    docs: [{ id: 'passport', name: 'Паспорт (оригинал для сверки)', required: true, identity: true }],
  },
  {
    id: 'vehicle-reg', no: '06-601',
    name: 'Постановка ТС на учёт',
    cat: 'transport',
    synonyms: ['автомобиль', 'номера', 'машина'],
    about: 'Регистрация транспортного средства и выдача государственных номеров.',
    instant: false, term: { d: 2 }, fee: 250,
    scopes: ['profile', 'documents', 'vehicles'],
    docs: [{ id: 'vehicle-doc', name: 'Документ о приобретении ТС', required: true }],
    // §7 — «Ведомственный сервис услуги упал → карточка disabled + бейдж».
    // Одна услуга в каталоге всегда недоступна: состояние должно быть видно
    // в демо, а не только описано в матрице.
    unavailable: 'Сервис ведомства недоступен',
  },
  {
    id: 'tax-debt', no: '07-701',
    name: 'Налоговая справка о задолженности',
    cat: 'tax',
    synonyms: ['задолженность', 'налоги', 'для тендера'],
    about: 'Справка о наличии или отсутствии налоговой задолженности.',
    instant: true, fee: null,
    scopes: ['profile', 'income'],
    docs: [{ id: 'passport', name: 'Паспорт (оригинал для сверки)', required: true, identity: true }],
  },
  {
    id: 'land-extract', no: '08-801',
    name: 'Выписка о правах на землю',
    cat: 'land',
    synonyms: ['земля', 'участок', 'право пользования'],
    about: 'Выписка из единого реестра прав на земельные участки.',
    instant: false, term: { d: 4 }, fee: 60,
    scopes: ['profile', 'documents'],
    docs: [{ id: 'passport', name: 'Паспорт (оригинал для сверки)', required: true, identity: true }],
  },
  {
    id: 'pension-cert', no: '01-120',
    name: 'Пенсионная справка',
    cat: 'cert',
    synonyms: ['пенсия', 'справка о размере пенсии'],
    about: 'Справка о назначенной пенсии и её размере.',
    instant: true, fee: null,
    scopes: ['profile', 'income'],
    docs: [{ id: 'passport', name: 'Паспорт (оригинал для сверки)', required: true, identity: true }],
  },
  {
    id: 'kindergarten', no: '09-901',
    name: 'Запись ребёнка в детсад',
    cat: 'edu',
    synonyms: ['детский сад', 'очередь в садик', 'ребёнок'],
    about: 'Постановка ребёнка в очередь в дошкольное учреждение.',
    instant: false, term: { d: 7 }, fee: null,
    scopes: ['profile', 'family', 'address'],
    docs: [{ id: 'birth-cert', name: 'Свидетельство о рождении ребёнка', required: true }],
  },
];

export const SERVICE = Object.fromEntries(CATALOG.map(s => [s.id, s]));

/* «Часто оформляете» (§6/S4) — статистика окна, не гражданина: ПД здесь нет. */
export const FREQUENT = ['fam-cert', 'marriage', 'passport-replace'];
