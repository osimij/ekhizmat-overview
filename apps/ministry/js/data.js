/* ============================================================
   data.js — модель данных прототипа (без бэкенда).
   Ведомство: Министерство юстиции (арендатор «moj» из ТЗ, §4А.6).
   Все сущности и статусы — по §7.1, §7.2, §7Б ТЗ eKhizmat.
   ============================================================ */
(function (global) {
  'use strict';

  /* ---------- Статусная модель заявления (§7.2) ---------- */
  // pill — класс статус-пилюли из дизайн-системы (components.css §5.3)
  var STATUS = {
    draft:      { ru: 'Черновик',          tg: 'Сиёҳнавис',              pill: 'pill--draft' },
    submitted:  { ru: 'Подано',            tg: 'Пешниҳод шуд',           pill: 'pill--draft' },
    awaiting_pay:{ru: 'Ожидает оплаты',    tg: 'Интизори пардохт',       pill: 'pill--wait'  },
    processing: { ru: 'В обработке',        tg: 'Дар коркард',            pill: 'pill--wait'  },
    info_requested:{ru:'Запрошены сведения',tg: 'Маълумот дархост шуд',   pill: 'pill--wait'  },
    clarify:    { ru: 'Требует уточнения',  tg: 'Аниқкунӣ талаб мекунад', pill: 'pill--wait'  },
    decided:    { ru: 'Решение принято',    tg: 'Қарор қабул шуд',        pill: 'pill--active'},
    done:       { ru: 'Исполнено',          tg: 'Иҷро шуд',               pill: 'pill--active'},
    denied:     { ru: 'Отказано',           tg: 'Рад шуд',                pill: 'pill--denied'},
    withdrawn:  { ru: 'Отозвано',           tg: 'Бозхонда шуд',           pill: 'pill--draft' }
  };

  /* ---------- Каталог услуг ведомства ---------- */
  // hue/icon — из дизайн-системы. critical → решение «в четыре глаза» (§7Б.2).
  // slaHours — целевой срок услуги. pay → нужна ли пошлина (сценарий UC-B).
  var SERVICE = {
    nko:      { name:{ru:'Регистрация некоммерческой организации',tg:'Бақайдгирии ташкилоти ғайритиҷоратӣ'}, cat:{ru:'Регистрация',tg:'Бақайдгирӣ'}, hue:'hue-indigo', icon:'i-users', critical:true, slaHours:240, pay:350 },
    notary:   { name:{ru:'Лицензия на нотариальную деятельность',tg:'Иҷозатнома барои фаъолияти нотариалӣ'}, cat:{ru:'Лицензии',tg:'Иҷозатномаҳо'}, hue:'hue-amber', icon:'i-cat-license', critical:true, slaHours:720, pay:1200 },
    apostille:{ name:{ru:'Проставление апостиля',tg:'Гузоштани апостил'}, cat:{ru:'Легализация',tg:'Қонунигардонӣ'}, hue:'hue-teal', icon:'i-cat-cert', critical:false, slaHours:120, pay:180 },
    extract:  { name:{ru:'Выписка из реестра юридических лиц',tg:'Иқтибос аз феҳристи шахсони ҳуқуқӣ'}, cat:{ru:'Справки',tg:'Маълумотномаҳо'}, hue:'hue-blue', icon:'i-doc', critical:false, slaHours:24, pay:0 },
    marriage: { name:{ru:'Государственная регистрация брака',tg:'Бақайдгирии давлатии никоҳ'}, cat:{ru:'Акты ГЗ',tg:'Сабти асноди ҳолати шаҳрвандӣ'}, hue:'hue-rose', icon:'i-rings', critical:false, slaHours:72, pay:60 },
    rename:   { name:{ru:'Перемена имени',tg:'Иваз кардани ном'}, cat:{ru:'Акты ГЗ',tg:'Сабти асноди ҳолати шаҳрвандӣ'}, hue:'hue-violet', icon:'i-user-add', critical:false, slaHours:168, pay:90 },
    legal:    { name:{ru:'Государственная регистрация юр. лица',tg:'Бақайдгирии давлатии шахси ҳуқуқӣ'}, cat:{ru:'Регистрация',tg:'Бақайдгирӣ'}, hue:'hue-steel', icon:'i-biz', critical:true, slaHours:120, pay:500 },
    accred:   { name:{ru:'Аккредитация филиала иностранной орг.',tg:'Аккредитатсияи филиали ташкилоти хориҷӣ'}, cat:{ru:'Аккредитация',tg:'Аккредитатсия'}, hue:'hue-slate', icon:'i-cat-accred', critical:true, slaHours:480, pay:2400 },
    consult:  { name:{ru:'Консультация по услугам юстиции',tg:'Машварат оид ба хизматҳои адлия'}, cat:{ru:'Консультации',tg:'Машваратҳо'}, hue:'hue-blue', icon:'i-chat', critical:false, slaHours:24, pay:0, audience:'guest' }
  };

  /* ---------- Специалист (текущая сессия, §7Б.4) ---------- */
  var ME = {
    name: 'Азизов А. Н.',
    initials: 'АА',
    role: { ru: 'Специалист ведомства', tg: 'Мутахассиси идора' },
    agency: { ru: 'Министерство юстиции', tg: 'Вазорати адлия' },
    division: { ru: 'Управление регистрации НКО', tg: 'Раёсати бақайдгирии ТҒТ' },
    login: 'a.azizov'
  };

  var COLLEAGUES = [
    { name: 'Рахимова С. К.', initials: 'РС' },
    { name: 'Назаров Д. М.',  initials: 'НД' },
    { name: 'Шарипов Т. А.',  initials: 'ШТ' }
  ];

  var MIN = 60 * 1000, HOUR = 60 * MIN;

  /* Каждое заявление получает срок как СМЕЩЕНИЕ от момента загрузки:
     dueOffsetMin < 0 → просрочено; малое положительное → приближение;
     большое → в норме. Живой отсчёт делает app.js через Date.now(). */
  function seed() {
    var A = [];
    var n = 0;
    function num(code) {
      n++;
      return '2026-МЮ-' + String(4800 + n).padStart(6, '0');
    }

    // 1 — НКО, назначено мне, идёт обработка, есть межвед-ответы, скоро срок
    A.push({
      id: 'a1', number: num(), svc: 'nko', status: 'processing',
      applicant: { kind: 'org', name: 'Фонд «Насими бахор»', tin: '030 415 267', reg: 'создаётся', head: 'Каримова М. Р.', phone: '+992 44 600-18-04', email: 'nasimi.bahor@mail.tj', address: 'г. Душанбе, ул. Рудаки, 42' },
      submittedAgo: 26 * HOUR, dueOffsetMin: 42, priority: 'Высокий', assignee: 'me',
      pay: { amount: 350, status: 'Оплачено', ago: 24 * HOUR },
      form: [
        { k: 'Полное наименование', v: 'Общественный фонд «Насими бахор»', src: 'введено' },
        { k: 'Организационно-правовая форма', v: 'Общественный фонд', src: 'введено' },
        { k: 'Цель деятельности', v: 'Поддержка образовательных программ', src: 'введено' },
        { k: 'ИНН учредителя', v: '040 118 552', src: 'реестр' },
        { k: 'Юридический адрес', v: 'г. Душанбе, ул. Рудаки, 42', src: 'профиль' }
      ],
      docs: [
        { name: 'Устав организации.pdf', pages: 12, checked: true },
        { name: 'Протокол собрания учредителей.pdf', pages: 3, checked: true },
        { name: 'Заявление о регистрации.pdf', pages: 2, checked: false }
      ],
      interop: [
        { type: 'Сведения об учредителе (физ. лицо)', agency: 'Государственный реестр населения', status: 'received', ago: 20 * HOUR, value: 'Каримова М. Р., ИНН 040 118 552 — действительна' },
        { type: 'Проверка налоговой задолженности', agency: 'Налоговый комитет', status: 'received', ago: 19 * HOUR, value: 'Задолженность отсутствует' }
      ],
      history: [
        { ago: 26 * HOUR, actor: 'Заявитель', action: 'Заявление подано', status: 'submitted' },
        { ago: 24 * HOUR, actor: 'Система', action: 'Пошлина оплачена (350 сомони)', status: 'processing' },
        { ago: 20 * HOUR, actor: 'Smart Bridge', action: 'Получены сведения из реестра населения', status: 'processing' },
        { ago: 2 * HOUR,  actor: 'BPM-движок', action: 'Заявление назначено специалисту', status: 'processing' }
      ]
    });

    // 2 — Лицензия нотариуса, критично (четыре глаза), приближение срока
    A.push({
      id: 'a2', number: num(), svc: 'notary', status: 'processing',
      applicant: { kind: 'person', name: 'Сафаров Джамшед Икромович', tin: '040 552 118', dob: '14.03.1988', phone: '+992 92 771-40-22', email: 'j.safarov@gmail.com', address: 'г. Худжанд, ул. Ленина, 8/1' },
      submittedAgo: 30 * 24 * HOUR, dueOffsetMin: 55, priority: 'Высокий', assignee: 'me',
      pay: { amount: 1200, status: 'Оплачено', ago: 29 * 24 * HOUR },
      form: [
        { k: 'ФИО заявителя', v: 'Сафаров Джамшед Икромович', src: 'реестр' },
        { k: 'Стаж юридической работы', v: '9 лет', src: 'введено' },
        { k: 'Округ деятельности', v: 'Согдийская область', src: 'введено' },
        { k: 'Диплом о высшем образовании', v: '№ ДВ-114523 от 2010', src: 'введено' }
      ],
      docs: [
        { name: 'Диплом о высшем юридическом образовании.pdf', pages: 2, checked: true },
        { name: 'Свидетельство о сдаче квалификационного экзамена.pdf', pages: 1, checked: true },
        { name: 'Справка об отсутствии судимости.pdf', pages: 1, checked: true }
      ],
      interop: [
        { type: 'Проверка судимости', agency: 'МВД · ИЦ', status: 'received', ago: 5 * 24 * HOUR, value: 'Сведений о судимости не имеется' },
        { type: 'Подтверждение диплома', agency: 'Министерство образования', status: 'received', ago: 4 * 24 * HOUR, value: 'Диплом ДВ-114523 подтверждён' }
      ],
      history: [
        { ago: 30 * 24 * HOUR, actor: 'Заявитель', action: 'Заявление подано', status: 'submitted' },
        { ago: 29 * 24 * HOUR, actor: 'Система', action: 'Пошлина оплачена (1200 сомони)', status: 'processing' },
        { ago: 5 * 24 * HOUR,  actor: 'Smart Bridge', action: 'Получена проверка МВД', status: 'processing' },
        { ago: 3 * HOUR,       actor: 'BPM-движок', action: 'Заявление назначено специалисту', status: 'processing' }
      ]
    });

    // 3 — Апостиль, ПРОСРОЧЕНО (breach), ожидает решения
    A.push({
      id: 'a3', number: num(), svc: 'apostille', status: 'processing',
      applicant: { kind: 'person', name: 'Мирзоева Гулнора Аҳмадовна', tin: '055 214 908', dob: '02.09.1995', phone: '+992 90 123-77-45', email: 'g.mirzoeva@mail.tj', address: 'г. Душанбе, пр. Сомони, 15' },
      submittedAgo: 6 * 24 * HOUR, dueOffsetMin: -180, priority: 'Обычный', assignee: 'me',
      pay: { amount: 180, status: 'Оплачено', ago: 6 * 24 * HOUR },
      form: [
        { k: 'Тип документа', v: 'Диплом о высшем образовании', src: 'введено' },
        { k: 'Страна назначения', v: 'Германия', src: 'введено' },
        { k: 'ФИО владельца', v: 'Мирзоева Гулнора Аҳмадовна', src: 'реестр' }
      ],
      docs: [
        { name: 'Диплом (нотариальная копия).pdf', pages: 2, checked: true },
        { name: 'Перевод диплома.pdf', pages: 2, checked: false }
      ],
      interop: [
        { type: 'Подтверждение подлинности диплома', agency: 'Министерство образования', status: 'received', ago: 5 * 24 * HOUR, value: 'Документ подлинный' }
      ],
      history: [
        { ago: 6 * 24 * HOUR, actor: 'Заявитель', action: 'Заявление подано', status: 'submitted' },
        { ago: 6 * 24 * HOUR, actor: 'Система', action: 'Пошлина оплачена (180 сомони)', status: 'processing' },
        { ago: 4 * 24 * HOUR, actor: 'BPM-движок', action: 'Заявление назначено специалисту', status: 'processing' }
      ]
    });

    // 4 — Выписка из ЕГРЮЛ, ожидает межвед-ответ (info_requested), в норме
    A.push({
      id: 'a4', number: num(), svc: 'extract', status: 'info_requested',
      applicant: { kind: 'org', name: 'ООО «Помир-Трейд»', tin: '020 774 361', reg: '1027700123456', head: 'Одинаев Ф. С.', phone: '+992 37 221-05-30', email: 'info@pomir-trade.tj', address: 'г. Душанбе, ул. Айни, 120' },
      submittedAgo: 6 * HOUR, dueOffsetMin: 900, priority: 'Обычный', assignee: 'me',
      pay: { amount: 0, status: 'Не требуется' },
      form: [
        { k: 'ИНН юридического лица', v: '020 774 361', src: 'введено' },
        { k: 'Форма выписки', v: 'Расширенная', src: 'введено' }
      ],
      docs: [],
      interop: [
        { type: 'Актуальные сведения из ЕГРЮЛ', agency: 'Единый реестр юридических лиц', status: 'pending', ago: 0, value: '' }
      ],
      history: [
        { ago: 6 * HOUR, actor: 'Заявитель', action: 'Заявление подано', status: 'submitted' },
        { ago: 5 * HOUR, actor: 'Межвед. сервис', action: 'Отправлен запрос в ЕГРЮЛ', status: 'info_requested' }
      ]
    });

    // 5 — Перемена имени, возвращено на уточнение
    A.push({
      id: 'a5', number: num(), svc: 'rename', status: 'clarify',
      applicant: { kind: 'person', name: 'Холов Бахтиёр Саидович', tin: '061 330 447', dob: '19.11.1990', phone: '+992 93 400-11-88', email: 'b.kholov@mail.tj', address: 'г. Бохтар, ул. Гагарина, 3' },
      submittedAgo: 3 * 24 * HOUR, dueOffsetMin: 3600, priority: 'Обычный', assignee: 'me',
      pay: { amount: 90, status: 'Оплачено', ago: 3 * 24 * HOUR },
      form: [
        { k: 'Текущее имя', v: 'Холов Бахтиёр Саидович', src: 'реестр' },
        { k: 'Новое имя', v: 'Холов Бахром Саидович', src: 'введено' },
        { k: 'Основание', v: 'Личное желание', src: 'введено' }
      ],
      docs: [
        { name: 'Заявление о перемене имени.pdf', pages: 1, checked: true }
      ],
      interop: [],
      history: [
        { ago: 3 * 24 * HOUR, actor: 'Заявитель', action: 'Заявление подано', status: 'submitted' },
        { ago: 2 * 24 * HOUR, actor: 'Азизов А. Н.', action: 'Возвращено на уточнение: не приложено свидетельство о рождении', status: 'clarify' }
      ]
    });

    // 6 — Регистрация ЮЛ, критично, приближение
    A.push({
      id: 'a6', number: num(), svc: 'legal', status: 'processing',
      applicant: { kind: 'org', name: 'ООО «Заррина Текстиль»', tin: '090 118 553', reg: 'создаётся', head: 'Юсупова З. Н.', phone: '+992 44 610-90-01', email: 'zarrina.textile@mail.tj', address: 'г. Душанбе, ул. Борбад, 55' },
      submittedAgo: 40 * HOUR, dueOffsetMin: 20, priority: 'Высокий', assignee: 'me',
      pay: { amount: 500, status: 'Оплачено', ago: 39 * HOUR },
      form: [
        { k: 'Наименование', v: 'ООО «Заррина Текстиль»', src: 'введено' },
        { k: 'Вид деятельности', v: 'Производство текстиля', src: 'введено' },
        { k: 'Уставный капитал', v: '150 000 сомони', src: 'введено' },
        { k: 'ИНН директора', v: '070 442 119', src: 'реестр' }
      ],
      docs: [
        { name: 'Устав.pdf', pages: 9, checked: true },
        { name: 'Решение о создании.pdf', pages: 2, checked: true }
      ],
      interop: [
        { type: 'Сведения о директоре', agency: 'Государственный реестр населения', status: 'received', ago: 30 * HOUR, value: 'Юсупова З. Н. — действительна' },
        { type: 'Проверка наименования на уникальность', agency: 'Единый реестр юридических лиц', status: 'received', ago: 28 * HOUR, value: 'Наименование свободно' }
      ],
      history: [
        { ago: 40 * HOUR, actor: 'Заявитель', action: 'Заявление подано', status: 'submitted' },
        { ago: 39 * HOUR, actor: 'Система', action: 'Пошлина оплачена (500 сомони)', status: 'processing' },
        { ago: 4 * HOUR,  actor: 'BPM-движок', action: 'Заявление назначено специалисту', status: 'processing' }
      ]
    });

    // 7 — Брак, назначено мне, в норме
    A.push({
      id: 'a7', number: num(), svc: 'marriage', status: 'processing',
      applicant: { kind: 'person', name: 'Рахмонов Сухроб + Аминова Малика', tin: '033 900 214', dob: '—', phone: '+992 91 555-12-00', email: 's.rahmonov@mail.tj', address: 'г. Душанбе, ул. Фирдавси, 71' },
      submittedAgo: 10 * HOUR, dueOffsetMin: 1400, priority: 'Обычный', assignee: 'me',
      pay: { amount: 60, status: 'Оплачено', ago: 10 * HOUR },
      form: [
        { k: 'Жених', v: 'Рахмонов Сухроб Далерович', src: 'реестр' },
        { k: 'Невеста', v: 'Аминова Малика Фаридуновна', src: 'реестр' },
        { k: 'Дата церемонии', v: '15.08.2026', src: 'введено' },
        { k: 'Отдел ЗАГС', v: 'Дворец бракосочетаний №1', src: 'введено' }
      ],
      docs: [
        { name: 'Совместное заявление.pdf', pages: 1, checked: true }
      ],
      interop: [
        { type: 'Проверка семейного положения', agency: 'Реестр актов гражданского состояния', status: 'received', ago: 8 * HOUR, value: 'Препятствий не выявлено' }
      ],
      history: [
        { ago: 10 * HOUR, actor: 'Заявитель', action: 'Заявление подано', status: 'submitted' },
        { ago: 9 * HOUR,  actor: 'Система', action: 'Пошлина оплачена (60 сомони)', status: 'processing' },
        { ago: 1 * HOUR,  actor: 'BPM-движок', action: 'Заявление назначено специалисту', status: 'processing' }
      ]
    });

    // 8 — Аккредитация филиала, критично, ПРОСРОЧЕНО
    A.push({
      id: 'a8', number: num(), svc: 'accred', status: 'processing',
      applicant: { kind: 'org', name: 'Филиал «Central Asia Logistics GmbH»', tin: '110 662 004', reg: 'DE-HRB-88213', head: 'M. Weber', phone: '+992 37 900-44-10', email: 'branch.tj@cal-gmbh.de', address: 'г. Душанбе, ул. Ниёзи, 4' },
      submittedAgo: 25 * 24 * HOUR, dueOffsetMin: -1500, priority: 'Высокий', assignee: 'me',
      pay: { amount: 2400, status: 'Оплачено', ago: 24 * 24 * HOUR },
      form: [
        { k: 'Наименование головной организации', v: 'Central Asia Logistics GmbH', src: 'введено' },
        { k: 'Страна регистрации', v: 'Германия', src: 'введено' },
        { k: 'Регистрационный номер', v: 'DE-HRB-88213', src: 'введено' },
        { k: 'Руководитель филиала', v: 'Weber Martin', src: 'введено' }
      ],
      docs: [
        { name: 'Учредительные документы (апостиль).pdf', pages: 22, checked: true },
        { name: 'Решение о создании филиала.pdf', pages: 4, checked: true },
        { name: 'Доверенность руководителя.pdf', pages: 3, checked: false }
      ],
      interop: [
        { type: 'Проверка апостиля', agency: 'МИД · Консульский департамент', status: 'received', ago: 15 * 24 * HOUR, value: 'Апостиль действителен' }
      ],
      history: [
        { ago: 25 * 24 * HOUR, actor: 'Заявитель', action: 'Заявление подано', status: 'submitted' },
        { ago: 24 * 24 * HOUR, actor: 'Система', action: 'Пошлина оплачена (2400 сомони)', status: 'processing' },
        { ago: 10 * 24 * HOUR, actor: 'BPM-движок', action: 'Заявление назначено специалисту', status: 'processing' }
      ]
    });

    /* ---- Заявления ведомства, назначенные коллегам / завершённые ----
       (видны во «Все заявления»; демонстрируют полную статусную модель) */
    A.push({
      id: 'a9', number: num(), svc: 'extract', status: 'done', assignee: 'other', assigneeName: 'Рахимова С. К.',
      applicant: { kind: 'org', name: 'ООО «Ватан-Строй»', tin: '021 553 900', reg: '1037700556677', head: 'Саидов К. Р.', phone: '+992 37 224-88-90', email: 'vatan@mail.tj', address: 'г. Душанбе, ул. Турсунзаде, 9' },
      submittedAgo: 3 * 24 * HOUR, dueOffsetMin: 999999, priority: 'Обычный',
      pay: { amount: 0, status: 'Не требуется' },
      form: [{ k: 'ИНН юридического лица', v: '021 553 900', src: 'введено' }],
      docs: [], interop: [{ type: 'Сведения из ЕГРЮЛ', agency: 'Единый реестр юридических лиц', status: 'received', ago: 3 * 24 * HOUR, value: 'Предоставлены' }],
      history: [
        { ago: 3 * 24 * HOUR, actor: 'Заявитель', action: 'Заявление подано', status: 'submitted' },
        { ago: 3 * 24 * HOUR, actor: 'Рахимова С. К.', action: 'Решение: выписка сформирована', status: 'decided' },
        { ago: 3 * 24 * HOUR, actor: 'Система', action: 'Документ подписан ЭЦП и выдан', status: 'done' }
      ],
      decision: { type: 'approve', reason: 'Сведения предоставлены в полном объёме', by: 'Рахимова С. К.' }
    });
    A.push({
      id: 'a10', number: num(), svc: 'marriage', status: 'denied', assignee: 'other', assigneeName: 'Назаров Д. М.',
      applicant: { kind: 'person', name: 'Иброхимов Р. + Саидова Н.', tin: '044 210 887', dob: '—', phone: '+992 90 700-33-21', email: '', address: 'г. Куляб, ул. Сомони, 12' },
      submittedAgo: 5 * 24 * HOUR, dueOffsetMin: 999999, priority: 'Обычный',
      pay: { amount: 60, status: 'Возвращена' },
      form: [{ k: 'Дата церемонии', v: '01.07.2026', src: 'введено' }],
      docs: [], interop: [{ type: 'Проверка семейного положения', agency: 'Реестр актов гражданского состояния', status: 'received', ago: 5 * 24 * HOUR, value: 'Заявитель состоит в браке' }],
      history: [
        { ago: 5 * 24 * HOUR, actor: 'Заявитель', action: 'Заявление подано', status: 'submitted' },
        { ago: 4 * 24 * HOUR, actor: 'Назаров Д. М.', action: 'Отказ: заявитель уже состоит в браке', status: 'denied' }
      ],
      decision: { type: 'deny', reason: 'Заявитель уже состоит в зарегистрированном браке (п. 2 ст. 12)', by: 'Назаров Д. М.' }
    });
    A.push({
      id: 'a11', number: num(), svc: 'legal', status: 'awaiting_pay', assignee: 'other', assigneeName: '—',
      applicant: { kind: 'org', name: 'ООО «Хуршед-Агро»', tin: '093 771 220', reg: 'создаётся', head: 'Давлатов О. И.', phone: '+992 44 611-22-33', email: 'hurshed.agro@mail.tj', address: 'г. Вахдат, ул. Истиклол, 2' },
      submittedAgo: 2 * HOUR, dueOffsetMin: 999999, priority: 'Обычный',
      pay: { amount: 500, status: 'Ожидает оплаты' },
      form: [{ k: 'Наименование', v: 'ООО «Хуршед-Агро»', src: 'введено' }],
      docs: [], interop: [],
      history: [
        { ago: 2 * HOUR, actor: 'Заявитель', action: 'Заявление подано', status: 'submitted' },
        { ago: 2 * HOUR, actor: 'Сервис платежей', action: 'Сформировано начисление (500 сомони)', status: 'awaiting_pay' }
      ]
    });
    A.push({
      id: 'a12', number: num(), svc: 'nko', status: 'submitted', assignee: 'other', assigneeName: '—',
      applicant: { kind: 'org', name: 'Ассоциация «Дӯстии халқҳо»', tin: '088 004 551', reg: 'создаётся', head: 'Гафуров А. А.', phone: '+992 92 800-70-70', email: 'dusti@mail.tj', address: 'г. Душанбе, пр. Исмоили Сомони, 33' },
      submittedAgo: 40 * MIN, dueOffsetMin: 999999, priority: 'Обычный',
      pay: { amount: 350, status: 'Ожидает оплаты' },
      form: [{ k: 'Полное наименование', v: 'Ассоциация «Дӯстии халқҳо»', src: 'введено' }],
      docs: [{ name: 'Устав.pdf', pages: 10, checked: false }], interop: [],
      history: [{ ago: 40 * MIN, actor: 'Заявитель', action: 'Заявление подано', status: 'submitted' }]
    });

    // 13 — privacy-safe guest fixture from the public catalogue.
    A.push({
      id:'a13', number:'GST-2026-0042', svc:'consult', status:'processing', audience:'guest', assignee:'me',
      applicant:{ kind:'guest', name:'Гость', tin:'', phone:'', email:'guest-demo@example.tj', address:'' },
      submittedAgo:25 * MIN, dueOffsetMin:220, priority:'Обычный',
      pay:{ amount:0, status:'Не требуется' },
      form:[{ k:'Тема консультации', v:'Порядок проставления апостиля', src:'введено' },{ k:'Канал ответа', v:'Электронная почта', src:'введено' }],
      docs:[], interop:[],
      history:[{ ago:25 * MIN, actor:'Гость', action:'Демо-заявка сформирована', status:'submitted' },{ ago:20 * MIN, actor:'BPM-движок', action:'Назначено в очередь консультаций', status:'processing' }]
    });

    return A;
  }

  /* ---------- Уведомления / эскалации (§7Б.3) ---------- */
  function seedNotifs() {
    return [
      { id:'n1',kind:'breach',appId:'a8',title:{ru:'Нарушен срок (SLA)',tg:'Муҳлат вайрон шуд (SLA)'},text:{ru:'Аккредитация филиала «Central Asia Logistics» — просрочено. Эскалация руководителю.',tg:'Аккредитатсияи филиали «Central Asia Logistics» — муҳлат гузаштааст. Ба роҳбар ирсол шуд.'},ago:30*MIN,unread:true },
      { id:'n2',kind:'breach',appId:'a3',title:{ru:'Нарушен срок (SLA)',tg:'Муҳлат вайрон шуд (SLA)'},text:{ru:'Апостиль диплома (Мирзоева Г. А.) — просрочено на 3 часа.',tg:'Апостили диплом (Мирзоева Г. А.) — 3 соат дер шудааст.'},ago:2*HOUR,unread:true },
      { id:'n3',kind:'warn',appId:'a6',title:{ru:'Срок приближается',tg:'Муҳлат наздик мешавад'},text:{ru:'Регистрация ЮЛ «Заррина Текстиль» — до нарушения менее часа.',tg:'Бақайдгирии «Заррина Текстиль» — то вайроншавии муҳлат камтар аз як соат.'},ago:15*MIN,unread:true },
      { id:'n4',kind:'info',appId:'a4',title:{ru:'Получен ответ ведомства',tg:'Ҷавоби идора гирифта шуд'},text:{ru:'Ожидается ответ ЕГРЮЛ по выписке «Помир-Трейд».',tg:'Ҷавоби ФЯШҲ барои иқтибоси «Помир-Трейд» интизор аст.'},ago:5*MIN,unread:false }
    ];
  }

  /* ---------- Отчётность: SLA по специалистам (§7Б.3 → §14) ---------- */
  var REPORT_SPECIALISTS = [
    { name: 'Азизов А. Н.',  initials: 'АА', total: 128, onTime: 119 },
    { name: 'Рахимова С. К.', initials: 'РС', total: 143, onTime: 140 },
    { name: 'Назаров Д. М.',  initials: 'НД', total: 96,  onTime: 82 },
    { name: 'Шарипов Т. А.',  initials: 'ШТ', total: 61,  onTime: 60 }
  ];

  /* ---------- Словарь интерфейса (§6В.2, ru/tg) ---------- */
  var I18N = {
    ru: {
      app_title: 'АРМ ведомства',
      nav_group: 'Работа с заявлениями',
      nav_group2: 'Аналитика',
      nav_queue: 'Мои заявления',
      nav_all: 'Все заявления',
      nav_overdue: 'Просроченные',
      nav_batch: 'Массовая обработка',
      nav_interop: 'Межвед. запросы',
      nav_reports: 'Отчётность',
      nav_group3: 'Услуги и формы',
      nav_forms: 'Формы услуг',
      forms_title: 'Формы услуг',
      forms_sub: 'Создавайте формы своего ведомства и передавайте их на проверку портала.',
      forms_create: 'Создать форму',
      forms_drafts: 'В работе',
      forms_review: 'На согласовании',
      forms_published: 'Опубликовано',
      forms_total: 'Всего форм',
      forms_registry: 'Формы Министерства юстиции',
      forms_registry_hint: 'Черновики, версии на проверке и опубликованные формы — в одном месте.',
      forms_role: 'Автор ведомства',
      forms_comments_waiting: 'По форме есть комментарии проверяющего: {n}. Откройте форму, чтобы ответить.',
      form_version: 'Версия',
      form_default_name: 'Регистрация некоммерческой организации',
      form_updated_now: 'изменено сейчас',
      form_updated_yesterday: 'изменено вчера',
      form_updated_4d: 'изменено 4 дня назад',
      form_updated_12d: 'изменено 12 дней назад',
      form_person: 'Физлица',
      form_business: 'Организации',
      form_guest: 'Гости',
      form_status_draft: 'Черновик',
      form_status_stage: 'На stage',
      form_status_in_review: 'На проверке',
      form_status_changes_requested: 'Нужны изменения',
      form_status_resubmitted: 'Повторная проверка',
      form_status_approved: 'Одобрено',
      form_status_rejected: 'Отклонено',
      form_status_published: 'Опубликовано',
      form_untitled: 'Новая форма',
      form_untitled_field: 'Поле без названия',
      form_edit_sub: 'Настройте название, аудиторию и поля. Справа — форма глазами заявителя.',
      form_readonly_sub: 'Просмотр опубликованной версии формы.',
      form_locked_review: 'Форма уже передана на проверку. Редактирование откроется, если проверяющий запросит изменения.',
      form_basics: 'Название формы',
      form_basics_hint: 'Показывается заявителю в каталоге и в начале формы.',
      form_name_ru: 'Название на русском',
      form_name_tg: 'Название на таджикском',
      form_audiences: 'Кому доступна форма',
      form_audiences_hint: 'Можно выбрать несколько аудиторий.',
      form_fields: 'Поля формы',
      form_fields_hint: 'Запрашивайте только то, чего ведомство ещё не знает.',
      form_field_label: 'Название поля',
      form_text_field: 'Текст',
      form_new_field: 'Новое поле',
      form_add_field: 'Добавить поле',
      form_remove_field: 'Удалить поле',
      form_preview: 'Предпросмотр заявителя',
      form_live: 'Обновляется сразу',
      form_preview_intro: 'Заполните данные для отправки заявления.',
      form_preview_placeholder: 'Ответ заявителя',
      form_preview_continue: 'Продолжить',
      form_comments: 'Комментарии проверки',
      form_comments_hint: 'Замечания сохраняются вместе с версией формы.',
      form_reviewer: 'Проверяющий',
      form_action_hint: 'Сохраните черновик или передайте готовую версию на проверку.',
      form_save: 'Сохранить на stage',
      form_send: 'Отправить на проверку',
      form_resubmit: 'Отправить повторно',
      form_saved_toast: 'Черновик формы сохранён на stage',
      form_sent_toast: 'Форма передана в очередь проверки',
      form_resubmitted_toast: 'Исправленная форма отправлена повторно',
      form_name_required: 'Укажите название формы перед отправкой.',
      form_audience_required: 'Оставьте хотя бы одну аудиторию.',
      form_static_request: 'Цель обращения',
      form_static_contact: 'Контактное лицо',
      form_flow_title: 'Процесс',
      form_flow_steps: '7 шагов',
      form_flow_citizen: 'Глазами заявителя',
      form_flow_agency: 'Внутри ведомства',
      form_step_label: 'Шаг',
      form_step_confirm: 'Подтверждение данных',
      form_step_confirm_sub: 'из реестров · однократно',
      form_step_fields: 'Новые поля',
      form_step_fields_sub: 'то, чего ещё нет у государства',
      form_step_delivery: 'Доставка и оплата',
      form_step_delivery_sub: 'цифровой или бумажный результат',
      form_step_review: 'Проверка и подпись',
      form_step_review_sub: 'согласие · электронная подпись',
      form_step_checks: 'Автопроверка',
      form_step_checks_sub: 'реестры · дубликаты',
      form_step_route: 'Рассмотрение',
      form_step_route_sub: 'подразделение · роль · SLA',
      form_step_issue: 'Выдача результата',
      form_step_issue_sub: 'документ · личный кабинет',
      form_editor_confirm_intro: 'Выберите данные, которые государство уже знает и покажет заявителю для подтверждения.',
      form_editor_fields_intro: 'Добавляйте только новые данные. Изменения сразу видны в предпросмотре справа.',
      form_editor_delivery_intro: 'Укажите, как заявитель получит результат и требуется ли государственная пошлина.',
      form_editor_review_intro: 'Настройте текст согласия и способ подтверждения перед отправкой заявления.',
      form_editor_checks_intro: 'Автоматические проверки выполняются до того, как заявление увидит специалист.',
      form_editor_route_intro: 'Определите ответственное подразделение, роль исполнителя и срок рассмотрения.',
      form_editor_issue_intro: 'Настройте итоговый документ и место, где заявитель получит результат.',
      form_field_type: 'Тип поля',
      form_type_text: 'Короткий текст',
      form_type_text_hint: 'Имя, номер или короткий ответ',
      form_type_textarea: 'Длинный текст',
      form_type_textarea_hint: 'Описание или пояснение',
      form_type_select: 'Список выбора',
      form_type_select_hint: 'Один вариант из готового списка',
      form_type_date: 'Дата',
      form_type_date_hint: 'Дата события или документа',
      form_type_file: 'Файл',
      form_type_file_hint: 'Загрузка документа или изображения',
      form_type_checkbox: 'Подтверждение',
      form_type_checkbox_hint: 'Согласие или переключатель',
      form_required: 'обязательно',
      form_optional: 'необязательно',
      form_required_field: 'Обязательное поле',
      form_move_up: 'Переместить поле выше',
      form_move_down: 'Переместить поле ниже',
      form_choose_type: 'Выберите тип поля',
      form_palette_close: 'Закрыть выбор типа поля',
      form_no_fields: 'Пока нет новых полей',
      form_no_fields_hint: 'Добавьте только те данные, которых нет в государственных реестрах.',
      form_fields_tip: 'Чем меньше новых полей, тем быстрее заявитель завершит форму.',
      form_preview_mode: 'глазами заявителя · вживую',
      form_preview_close: 'Закрыть предпросмотр',
      form_preview_select: 'Выберите вариант',
      form_preview_upload: 'PDF, JPG или PNG',
      form_preview_back: 'Назад',
      form_save_short: 'Сохранить',
      form_prefilled_data: 'Данные из реестров',
      form_prefill_person: 'Данные заявителя',
      form_prefill_person_sub: 'ФИО и ИНН — из профиля',
      form_prefill_org: 'Сведения об организации',
      form_prefill_org_sub: 'название и регистрационный номер',
      form_prefill_address: 'Юридический адрес',
      form_prefill_address_sub: 'из адресного реестра',
      form_delivery_methods: 'Способы получения',
      form_delivery_digital: 'Цифровой результат',
      form_delivery_digital_sub: 'в личном кабинете с QR и электронной подписью',
      form_delivery_paper: 'Бумажный документ',
      form_delivery_paper_sub: 'получение в подразделении Министерства юстиции',
      form_cost: 'Стоимость услуги',
      form_free: 'Бесплатно',
      form_paid: 'Платно',
      form_consent: 'Текст согласия',
      form_consent_text: 'Подтверждаю достоверность сведений и согласен на их проверку в государственных реестрах.',
      form_esign: 'Электронная подпись',
      form_esign_sub: 'вход в кабинет используется как подпись',
      form_sms: 'Подтверждение по SMS',
      form_sms_sub: 'одноразовый код перед отправкой',
      form_active_checks: 'Активные проверки',
      form_check_registry: 'Проверка по реестру юридических лиц',
      form_check_registry_sub: 'название, учредители и регистрационные данные',
      form_check_duplicate: 'Поиск дубликатов',
      form_check_duplicate_sub: 'аналогичное заявление ещё не подано',
      form_check_files: 'Проверка вложений',
      form_check_files_sub: 'формат, размер и срок действия',
      form_responsible_unit: 'Ответственное подразделение',
      form_unit_nko: 'Управление регистрации НКО',
      form_unit_legal: 'Управление юридических лиц',
      form_reviewer_role: 'Роль исполнителя',
      form_role_specialist: 'Специалист управления',
      form_role_lead: 'Руководитель подразделения',
      form_sla: 'Срок рассмотрения',
      form_sla_value: '3 рабочих дня',
      form_escalation: 'Эскалация при нарушении SLA',
      form_escalation_sub: 'уведомить руководителя подразделения',
      form_result_document: 'Итоговый документ',
      form_result_nko: 'Свидетельство о регистрации НКО',
      form_result_nko_sub: 'PDF с QR-кодом и электронной подписью ведомства',
      form_template_edit: 'Настроить шаблон',
      form_wallet_result: 'Добавить в личный кабинет',
      form_wallet_result_sub: 'документ останется доступен после завершения услуги',
      search_ph: 'Поиск по № заявления, ФИО, ИНН…',
      lock: 'Заблокировать',
      end_shift: 'Завершить смену',
      logout: 'Выйти',
      reset_demo: 'Сбросить демо-данные',
      theme: 'Тема',
      preferences: 'Настройки',
      theme_system: 'Как в системе', theme_light: 'Светлая', theme_dark: 'Тёмная',
      lang_ru: 'Русский', lang_tg: 'Тоҷикӣ',
      // queue
      queue_title: 'Мои заявления',
      queue_sub: 'Заявления, назначенные вам · сортировка по сроку (SLA) и приоритету',
      f_all_services: 'Все услуги',
      audience_guest: 'Гость',
      f_all_statuses: 'Все статусы',
      sla_all: 'Любой срок',
      sla_warn: 'Приближается',
      sla_breach: 'Просрочено',
      col_num: '№',
      col_service: 'Услуга',
      col_applicant: 'Заявитель',
      col_submitted: 'Подано',
      col_status: 'Статус',
      col_sla: 'Срок',
      empty_title: 'Заявлений не найдено',
      empty_hint: 'Измените фильтры или строку поиска.',
      empty_queue_title: 'Очередь пуста',
      empty_queue_hint: 'Все назначенные заявления обработаны. Хорошая работа!',
      // batch
      selected: 'Выбрано',
      clear_sel: 'Снять выделение',
      batch_decide: 'Принять решение по',
      batch_only_same: 'Массовое решение доступно для однотипных заявлений одной услуги.',
      batch_critical: 'Критичные услуги требуют решения «в четыре глаза» — обработайте их по одному.',
      batch_no_critical: 'Критичные услуги («четыре глаза») обрабатываются по одному и в пакет не включаются.',
      batch_no_batchable: 'Нет однотипных заявлений, доступных для пакетной обработки.',
      lp_not_assigned: 'Заявление назначено другому специалисту — доступен только просмотр.',
      lp_not_active: 'Заявление не в активной обработке — доступен только просмотр.',
      // card
      back: 'К очереди',
      tab_overview: 'Обзор',
      tab_docs: 'Документы',
      tab_interop: 'Межвед. сведения',
      tab_history: 'История',
      applicant: 'Заявитель',
      app_data: 'Данные заявления',
      docs_title: 'Приложенные документы',
      interop_title: 'Сведения из реестров',
      interop_hint: 'Получены по межведомственным каналам (Smart Bridge), принцип Once-Only.',
      request_info: 'Запросить сведения',
      return_clarify: 'Вернуть на уточнение',
      decide: 'Принять решение',
      make_result: 'Сформировать результат',
      deadline: 'Срок исполнения',
      sla_left: 'осталось',
      sla_over: 'просрочено на',
      executor: 'Исполнитель',
      division: 'Подразделение',
      payment: 'Пошлина',
      priority: 'Приоритет',
      no_docs: 'Документы не приложены',
      no_interop: 'Межведомственные запросы не выполнялись',
      src_registry: 'реестр',
      src_profile: 'из профиля',
      src_manual: 'введено',
      // decision modal
      dm_title: 'Решение по заявлению',
      dm_approve: 'Положительное решение',
      dm_approve_d: 'Услуга будет оказана, сформирован и подписан результат.',
      dm_deny: 'Отрицательное решение',
      dm_deny_d: 'Мотивированный отказ. Заявитель будет уведомлён.',
      dm_reason: 'Обоснование решения',
      dm_reason_ph: 'Обязательно. Укажите основание решения…',
      dm_foureyes: 'Критичная услуга: требуется подтверждение второго специалиста («четыре глаза»).',
      dm_foureyes_step: 'Подтверждение второго специалиста',
      dm_second: 'Подтверждающий специалист',
      dm_confirm: 'Подтвердить и подписать',
      dm_send_second: 'Отправить на подтверждение',
      // request modal
      rm_title: 'Запрос сведений через Smart Bridge',
      rm_type: 'Тип сведений',
      rm_agency: 'Ведомство-источник',
      rm_send: 'Отправить запрос',
      // return modal
      ret_title: 'Возврат на уточнение',
      ret_reason: 'Что нужно уточнить',
      ret_reason_ph: 'Опишите недостающие данные или документы…',
      ret_send: 'Вернуть заявителю',
      cancel: 'Отмена',
      // toasts
      t_requested: 'Запрос отправлен ведомству',
      t_received: 'Получен ответ ведомства',
      t_returned: 'Заявление возвращено на уточнение',
      t_second: 'Отправлено на подтверждение второму специалисту',
      t_done: 'Решение принято, результат подписан ЭЦП',
      t_denied: 'Оформлен мотивированный отказ',
      t_batch_done: 'Пакетное решение применено',
      t_locked: 'Рабочее место заблокировано',
      // reports
      rep_title: 'Отчётность по срокам (SLA)',
      rep_sub: 'Соблюдение сроков по ведомству и специалистам · период: июль 2026',
      rep_total: 'Всего заявлений',
      rep_ontime: 'В срок',
      rep_breach: 'С нарушением',
      rep_avg: 'Среднее время',
      rep_spec: 'Специалист',
      rep_col_total: 'Всего',
      rep_col_breach: 'Просроч.',
      rep_col_rate: 'Соблюдение SLA',
      // interop journal
      ij_title: 'Межведомственные запросы',
      ij_sub: 'Журнал обменов через Smart Bridge',
      ij_pending: 'В обработке',
      ij_received: 'Получен ответ',
      awaiting_reply: 'Ожидают сведений',
      // misc
      of_agency: 'Заявлений ведомства',
      overdue_title: 'Просроченные заявления',
      overdue_sub: 'Нарушение сроков (SLA) · требуется решение или эскалация',
      batch_title: 'Массовая обработка',
      batch_sub: 'Пакетная обработка однотипных заявлений одной услуги (§7Б.2)',
      pick_service: 'Выберите услугу для пакетной обработки',
      login_sub: 'Автоматизированное рабочее место специалиста ведомства',
      login_title: 'Вход в сессию',
      login_user: 'Логин',
      login_pass: 'Пароль',
      login_next: 'Продолжить',
      login_mfa: 'Код подтверждения (МФА)',
      login_mfa_hint: 'Введите 6-значный код из приложения-аутентификатора',
      login_enter: 'Войти',
      login_legend: 'Доступ по усиленной аутентификации (МФА). Все действия фиксируются в журнале аудита.',
      login_legend_primary: 'Сессия действует только на этом рабочем месте',
      login_legend_secondary: 'Все действия фиксируются в журнале аудита.',
      login_back: 'Назад',
      login_required: 'Введите пароль, чтобы продолжить.',
      login_mfa_required: 'Введите все 6 цифр кода подтверждения.',
      login_mfa_invalid: 'Этот демонстрационный код недействителен. Введите другие 6 цифр.',
      view_app: 'Открыть карточку',
      pay_paid: 'Оплачено', pay_none: 'Не требуется', pay_wait: 'Ожидает оплаты', pay_ret: 'Возвращена',
      menu: 'Меню', collapse_sidebar: 'Свернуть боковую панель', expand_sidebar: 'Развернуть боковую панель', notifications: 'Уведомления', language: 'Язык', profile: 'Профиль',
      notifications_read_all: 'Прочитать все', notifications_empty: 'Нет уведомлений', close_notification: 'Закрыть уведомление',
      overdue_banner: 'Нарушение сроков зафиксировано в бизнес-мониторинге и эскалировано руководителю подразделения (§7Б.3).',
      applications_short: 'зап.', sort_ascending: 'сортировка по возрастанию', sort_descending: 'сортировка по убыванию', sort_by: 'Сортировать',
      select_all_page: 'Выбрать все на странице', select_all: 'Выбрать все', select_application: 'Выбрать заявление',
      sla_word_breach: 'Срок нарушен', sla_word_warn: 'Срок приближается', sla_word_ok: 'В пределах срока',
      tin_abbr: 'ИНН', four_eyes_short: '4 глаза', four_eyes: 'Решение в четыре глаза',
      priority_high: 'Высокий', priority_normal: 'Обычный',
      field_org_name: 'Наименование', field_full_name: 'ФИО', field_reg_num: 'Рег. номер', field_manager: 'Руководитель',
      field_dob: 'Дата рождения', field_phone: 'Телефон', field_address: 'Адрес',
      pages_short: 'стр.', checked: 'проверен', unchecked: 'не проверен', view_document: 'Просмотреть',
      audit_immutable: 'Все действия фиксируются в неизменяемом журнале аудита (WORM, §7Б.4)',
      actions: 'Действия', result: 'Результат', result_denied: 'Оформлен мотивированный отказ.', result_reason: 'Основание',
      result_signed: 'Документ подписан ЭЦП', result_available: 'Размещён в личном кабинете заявителя', download_result: 'Скачать результат',
      document_applicant: 'Заявитель', document_application: 'Заявление', document_date: 'Дата', document_decision: 'Решение',
      document_positive: 'Положительное', document_esigned: 'Подписано ЭЦП', until: 'до',
      ret_required: 'Укажите, что нужно уточнить.', first_specialist: 'Первый специалист', dm_reason_required: 'Обоснование обязательно.',
      batch_confirm_hint: 'Одинаковое положительное решение будет применено ко всем выбранным заявлениям. Каждое действие фиксируется в аудите отдельно.',
      batch_reason_default: 'Сведения предоставлены в полном объёме; основания для отказа отсутствуют.',
      locked_title: 'Рабочее место заблокировано', unlock: 'Разблокировать', reset_done: 'Демо-данные восстановлены',
      close: 'Закрыть'
    },
    tg: {
      app_title: 'ҶТ-и идора',
      nav_group: 'Кор бо аризаҳо',
      nav_group2: 'Таҳлил',
      nav_queue: 'Аризаҳои ман',
      nav_all: 'Ҳамаи аризаҳо',
      nav_overdue: 'Мӯҳлаташон гузашта',
      nav_batch: 'Коркарди оммавӣ',
      nav_interop: 'Дархостҳои байниидоравӣ',
      nav_reports: 'Ҳисобот',
      nav_group3: 'Хизматҳо ва шаклҳо',
      nav_forms: 'Шаклҳои хизмат',
      forms_title: 'Шаклҳои хизмат',
      forms_sub: 'Шаклҳои идораи худро созед ва барои санҷиши портал фиристед.',
      forms_create: 'Сохтани шакл',
      forms_drafts: 'Дар кор',
      forms_review: 'Дар мувофиқа',
      forms_published: 'Нашршуда',
      forms_total: 'Ҳамаи шаклҳо',
      forms_registry: 'Шаклҳои Вазорати адлия',
      forms_registry_hint: 'Сиёҳнависҳо, версияҳои санҷишӣ ва шаклҳои нашршуда — дар як ҷо.',
      forms_role: 'Муаллифи идора',
      forms_comments_waiting: 'Баррасӣкунанда {n} шарҳ гузоштааст. Барои ҷавоб шаклро кушоед.',
      form_version: 'Версия',
      form_default_name: 'Бақайдгирии ташкилоти ғайритиҷоратӣ',
      form_updated_now: 'ҳозир тағйир ёфт',
      form_updated_yesterday: 'дирӯз тағйир ёфт',
      form_updated_4d: '4 рӯз пеш тағйир ёфт',
      form_updated_12d: '12 рӯз пеш тағйир ёфт',
      form_person: 'Шахсони воқеӣ',
      form_business: 'Ташкилотҳо',
      form_guest: 'Меҳмонон',
      form_status_draft: 'Сиёҳнавис',
      form_status_stage: 'Дар stage',
      form_status_in_review: 'Дар санҷиш',
      form_status_changes_requested: 'Тағйирот лозим',
      form_status_resubmitted: 'Санҷиши такрорӣ',
      form_status_approved: 'Тасдиқ шуд',
      form_status_rejected: 'Рад шуд',
      form_status_published: 'Нашр шуд',
      form_untitled: 'Шакли нав',
      form_untitled_field: 'Майдони беном',
      form_edit_sub: 'Ном, аудитория ва майдонҳоро танзим кунед. Дар рост — намуди аризадиҳанда.',
      form_readonly_sub: 'Намоиши версияи нашршудаи шакл.',
      form_locked_review: 'Шакл барои санҷиш фиристода шудааст. Агар тағйирот талаб шавад, таҳрир боз мешавад.',
      form_basics: 'Номи шакл',
      form_basics_hint: 'Дар феҳрист ва оғози шакл ба аризадиҳанда нишон дода мешавад.',
      form_name_ru: 'Ном ба забони русӣ',
      form_name_tg: 'Ном ба забони тоҷикӣ',
      form_audiences: 'Шакл барои кӣ дастрас аст',
      form_audiences_hint: 'Якчанд аудиторияро интихоб кардан мумкин аст.',
      form_fields: 'Майдонҳои шакл',
      form_fields_hint: 'Танҳо маълумотеро пурсед, ки идора ҳоло намедонад.',
      form_field_label: 'Номи майдон',
      form_text_field: 'Матн',
      form_new_field: 'Майдони нав',
      form_add_field: 'Илова кардани майдон',
      form_remove_field: 'Нест кардани майдон',
      form_preview: 'Пешнамоиши аризадиҳанда',
      form_live: 'Фавран нав мешавад',
      form_preview_intro: 'Маълумотро барои фиристодани ариза пур кунед.',
      form_preview_placeholder: 'Ҷавоби аризадиҳанда',
      form_preview_continue: 'Идома',
      form_comments: 'Шарҳҳои санҷиш',
      form_comments_hint: 'Шарҳҳо бо версияи шакл нигоҳ дошта мешаванд.',
      form_reviewer: 'Баррасӣкунанда',
      form_action_hint: 'Сиёҳнависро нигоҳ доред ё версияи тайёрро барои санҷиш фиристед.',
      form_save: 'Дар stage захира кардан',
      form_send: 'Барои санҷиш фиристодан',
      form_resubmit: 'Такроран фиристодан',
      form_saved_toast: 'Сиёҳнависи шакл дар stage нигоҳ дошта шуд',
      form_sent_toast: 'Шакл ба навбати санҷиш фиристода шуд',
      form_resubmitted_toast: 'Шакли ислоҳшуда такроран фиристода шуд',
      form_name_required: 'Пеш аз фиристодан номи шаклро нависед.',
      form_audience_required: 'Ақаллан як аудиторияро монед.',
      form_static_request: 'Мақсади муроҷиат',
      form_static_contact: 'Шахси тамос',
      form_flow_title: 'Раванд',
      form_flow_steps: '7 қадам',
      form_flow_citizen: 'Аз нигоҳи аризадиҳанда',
      form_flow_agency: 'Дар дохили идора',
      form_step_label: 'Қадам',
      form_step_confirm: 'Тасдиқи маълумот',
      form_step_confirm_sub: 'аз феҳристҳо · як маротиба',
      form_step_fields: 'Майдонҳои нав',
      form_step_fields_sub: 'он чизе, ки давлат ҳоло надорад',
      form_step_delivery: 'Расондан ва пардохт',
      form_step_delivery_sub: 'натиҷаи рақамӣ ё коғазӣ',
      form_step_review: 'Санҷиш ва имзо',
      form_step_review_sub: 'ризоият · имзои электронӣ',
      form_step_checks: 'Санҷиши худкор',
      form_step_checks_sub: 'феҳристҳо · такрорҳо',
      form_step_route: 'Баррасӣ',
      form_step_route_sub: 'шуъба · нақш · SLA',
      form_step_issue: 'Додани натиҷа',
      form_step_issue_sub: 'ҳуҷҷат · кабинети шахсӣ',
      form_editor_confirm_intro: 'Маълумотеро интихоб кунед, ки давлат аллакай медонад ва барои тасдиқ ба аризадиҳанда нишон медиҳад.',
      form_editor_fields_intro: 'Танҳо маълумоти навро илова кунед. Тағйирот дар пешнамоиши рост фавран дида мешавад.',
      form_editor_delivery_intro: 'Муайян кунед, ки аризадиҳанда натиҷаро чӣ гуна мегирад ва оё боҷ лозим аст.',
      form_editor_review_intro: 'Матни ризоият ва тарзи тасдиқро пеш аз фиристодани ариза танзим кунед.',
      form_editor_checks_intro: 'Санҷишҳои худкор то он ки мутахассис аризаро бинад, иҷро мешаванд.',
      form_editor_route_intro: 'Шуъбаи масъул, нақши иҷрокунанда ва муҳлати баррасиро муайян кунед.',
      form_editor_issue_intro: 'Ҳуҷҷати ниҳоӣ ва ҷойи гирифтани натиҷаро танзим кунед.',
      form_field_type: 'Навъи майдон',
      form_type_text: 'Матни кӯтоҳ',
      form_type_text_hint: 'Ном, рақам ё ҷавоби кӯтоҳ',
      form_type_textarea: 'Матни дароз',
      form_type_textarea_hint: 'Тавсиф ё шарҳ',
      form_type_select: 'Рӯйхати интихоб',
      form_type_select_hint: 'Як ҷавоб аз рӯйхати омода',
      form_type_date: 'Сана',
      form_type_date_hint: 'Санаи воқеа ё ҳуҷҷат',
      form_type_file: 'Файл',
      form_type_file_hint: 'Боркунии ҳуҷҷат ё тасвир',
      form_type_checkbox: 'Тасдиқ',
      form_type_checkbox_hint: 'Ризоият ё гузариш',
      form_required: 'ҳатмӣ',
      form_optional: 'ихтиёрӣ',
      form_required_field: 'Майдони ҳатмӣ',
      form_move_up: 'Майдонро боло бурдан',
      form_move_down: 'Майдонро поён бурдан',
      form_choose_type: 'Навъи майдонро интихоб кунед',
      form_palette_close: 'Пӯшидани интихоби навъи майдон',
      form_no_fields: 'Ҳоло майдони нав нест',
      form_no_fields_hint: 'Танҳо маълумотеро илова кунед, ки дар феҳристҳои давлатӣ нест.',
      form_fields_tip: 'Ҳар қадар майдон кам бошад, аризадиҳанда шаклро ҳамон қадар тезтар пур мекунад.',
      form_preview_mode: 'аз нигоҳи аризадиҳанда · зинда',
      form_preview_close: 'Пӯшидани пешнамоиш',
      form_preview_select: 'Вариантро интихоб кунед',
      form_preview_upload: 'PDF, JPG ё PNG',
      form_preview_back: 'Бозгашт',
      form_save_short: 'Захира кардан',
      form_prefilled_data: 'Маълумот аз феҳристҳо',
      form_prefill_person: 'Маълумоти аризадиҳанда',
      form_prefill_person_sub: 'ному насаб ва РМА — аз профил',
      form_prefill_org: 'Маълумот дар бораи ташкилот',
      form_prefill_org_sub: 'ном ва рақами бақайдгирӣ',
      form_prefill_address: 'Суроғаи ҳуқуқӣ',
      form_prefill_address_sub: 'аз феҳристи суроғаҳо',
      form_delivery_methods: 'Тарзҳои гирифтан',
      form_delivery_digital: 'Натиҷаи рақамӣ',
      form_delivery_digital_sub: 'дар кабинети шахсӣ бо QR ва имзои электронӣ',
      form_delivery_paper: 'Ҳуҷҷати коғазӣ',
      form_delivery_paper_sub: 'гирифтан аз шуъбаи Вазорати адлия',
      form_cost: 'Арзиши хизмат',
      form_free: 'Ройгон',
      form_paid: 'Пулакӣ',
      form_consent: 'Матни ризоият',
      form_consent_text: 'Дурустии маълумотро тасдиқ карда, ба санҷиши он дар феҳристҳои давлатӣ розӣ ҳастам.',
      form_esign: 'Имзои электронӣ',
      form_esign_sub: 'воридшавӣ ба кабинет ҳамчун имзо истифода мешавад',
      form_sms: 'Тасдиқ бо SMS',
      form_sms_sub: 'рамзи якдафъаина пеш аз фиристодан',
      form_active_checks: 'Санҷишҳои фаъол',
      form_check_registry: 'Санҷиш аз феҳристи шахсони ҳуқуқӣ',
      form_check_registry_sub: 'ном, муассисон ва маълумоти бақайдгирӣ',
      form_check_duplicate: 'Ҷустуҷӯи такрорҳо',
      form_check_duplicate_sub: 'аризаи монанд ҳоло пешниҳод нашудааст',
      form_check_files: 'Санҷиши замимаҳо',
      form_check_files_sub: 'формат, ҳаҷм ва муҳлати амал',
      form_responsible_unit: 'Шуъбаи масъул',
      form_unit_nko: 'Раёсати бақайдгирии ТҒТ',
      form_unit_legal: 'Раёсати шахсони ҳуқуқӣ',
      form_reviewer_role: 'Нақши иҷрокунанда',
      form_role_specialist: 'Мутахассиси раёсат',
      form_role_lead: 'Роҳбари шуъба',
      form_sla: 'Муҳлати баррасӣ',
      form_sla_value: '3 рӯзи корӣ',
      form_escalation: 'Эскалатсия ҳангоми вайрон шудани SLA',
      form_escalation_sub: 'роҳбари шуъбаро огоҳ кардан',
      form_result_document: 'Ҳуҷҷати ниҳоӣ',
      form_result_nko: 'Шаҳодатномаи бақайдгирии ТҒТ',
      form_result_nko_sub: 'PDF бо QR-рамз ва имзои электронии идора',
      form_template_edit: 'Танзими қолаб',
      form_wallet_result: 'Илова ба кабинети шахсӣ',
      form_wallet_result_sub: 'ҳуҷҷат пас аз анҷоми хизмат дастрас мемонад',
      search_ph: 'Ҷустуҷӯ аз рӯи №, ному насаб, РМА…',
      lock: 'Қулф кардан',
      end_shift: 'Анҷоми баст',
      logout: 'Баромадан',
      reset_demo: 'Барқарорсозии маълумоти намоишӣ',
      theme: 'Мавзӯъ',
      preferences: 'Танзимот',
      theme_system: 'Аз система', theme_light: 'Равшан', theme_dark: 'Торик',
      lang_ru: 'Русский', lang_tg: 'Тоҷикӣ',
      queue_title: 'Аризаҳои ман',
      queue_sub: 'Аризаҳои ба шумо вогузошташуда · мураттабсозӣ аз рӯи мӯҳлат ва афзалият',
      f_all_services: 'Ҳамаи хизматҳо',
      audience_guest: 'Меҳмон',
      f_all_statuses: 'Ҳамаи ҳолатҳо',
      sla_all: 'Ҳар мӯҳлат',
      sla_warn: 'Наздик мешавад',
      sla_breach: 'Гузашта',
      col_num: '№',
      col_service: 'Хизматрасонӣ',
      col_applicant: 'Аризадиҳанда',
      col_submitted: 'Пешниҳод',
      col_status: 'Ҳолат',
      col_sla: 'Мӯҳлат',
      empty_title: 'Ариза ёфт нашуд',
      empty_hint: 'Филтрҳо ё ҷустуҷӯро тағйир диҳед.',
      empty_queue_title: 'Навбат холист',
      empty_queue_hint: 'Ҳамаи аризаҳо коркард шуданд. Офарин!',
      selected: 'Интихобшуда',
      clear_sel: 'Бекор кардани интихоб',
      batch_decide: 'Қабули қарор барои',
      batch_only_same: 'Қарори оммавӣ танҳо барои аризаҳои якхелаи як хизмат дастрас аст.',
      batch_critical: 'Хизматҳои муҳим қарори «чор чашм»-ро талаб мекунанд — онҳоро алоҳида коркард кунед.',
      batch_no_critical: 'Хизматҳои муҳим («чор чашм») алоҳида коркард шуда, ба даста дохил намешаванд.',
      batch_no_batchable: 'Аризаҳои якхела барои коркарди гурӯҳӣ нестанд.',
      lp_not_assigned: 'Ариза ба мутахассиси дигар вогузор шудааст — танҳо намоиш дастрас аст.',
      lp_not_active: 'Ариза дар коркарди фаъол нест — танҳо намоиш дастрас аст.',
      back: 'Ба навбат',
      tab_overview: 'Шарҳи умумӣ',
      tab_docs: 'Ҳуҷҷатҳо',
      tab_interop: 'Маълумоти байниидоравӣ',
      tab_history: 'Таърих',
      applicant: 'Аризадиҳанда',
      app_data: 'Маълумоти ариза',
      docs_title: 'Ҳуҷҷатҳои замимашуда',
      interop_title: 'Маълумот аз феҳристҳо',
      interop_hint: 'Тавассути каналҳои байниидоравӣ (Smart Bridge), принсипи Once-Only гирифта шуд.',
      request_info: 'Дархости маълумот',
      return_clarify: 'Барои аниқкунӣ баргардонидан',
      decide: 'Қабули қарор',
      make_result: 'Таҳияи натиҷа',
      deadline: 'Мӯҳлати иҷро',
      sla_left: 'боқӣ мондааст',
      sla_over: 'гузаштааст',
      executor: 'Иҷрокунанда',
      division: 'Раёсат',
      payment: 'Боҷ',
      priority: 'Афзалият',
      no_docs: 'Ҳуҷҷат замима нашудааст',
      no_interop: 'Дархости байниидоравӣ иҷро нашудааст',
      src_registry: 'феҳрист',
      src_profile: 'аз профил',
      src_manual: 'ворид шуд',
      dm_title: 'Қарор оид ба ариза',
      dm_approve: 'Қарори мусбат',
      dm_approve_d: 'Хизмат расонида мешавад, натиҷа таҳия ва имзо мешавад.',
      dm_deny: 'Қарори манфӣ',
      dm_deny_d: 'Радди асоснок. Аризадиҳанда огоҳ карда мешавад.',
      dm_reason: 'Асосноккунии қарор',
      dm_reason_ph: 'Ҳатмист. Асоси қарорро нависед…',
      dm_foureyes: 'Хизмати муҳим: тасдиқи мутахассиси дуюм зарур аст («чор чашм»).',
      dm_foureyes_step: 'Тасдиқи мутахассиси дуюм',
      dm_second: 'Мутахассиси тасдиқкунанда',
      dm_confirm: 'Тасдиқ ва имзо',
      dm_send_second: 'Ба тасдиқ фиристодан',
      rm_title: 'Дархости маълумот тавассути Smart Bridge',
      rm_type: 'Навъи маълумот',
      rm_agency: 'Идораи манбаъ',
      rm_send: 'Фиристодани дархост',
      ret_title: 'Баргардонидан барои аниқкунӣ',
      ret_reason: 'Чиро бояд аниқ кард',
      ret_reason_ph: 'Маълумот ё ҳуҷҷатҳои намерасидаро нависед…',
      ret_send: 'Ба аризадиҳанда баргардонидан',
      cancel: 'Бекор кардан',
      t_requested: 'Дархост ба идора фиристода шуд',
      t_received: 'Ҷавоби идора гирифта шуд',
      t_returned: 'Ариза барои аниқкунӣ баргардонида шуд',
      t_second: 'Ба тасдиқи мутахассиси дуюм фиристода шуд',
      t_done: 'Қарор қабул шуд, натиҷа бо ИРА имзо шуд',
      t_denied: 'Радди асоснок таҳия шуд',
      t_batch_done: 'Қарори гурӯҳӣ татбиқ шуд',
      t_locked: 'Ҷои кор қулф карда шуд',
      rep_title: 'Ҳисобот оид ба мӯҳлатҳо (SLA)',
      rep_sub: 'Риояи мӯҳлат аз рӯи идора ва мутахассисон · давра: июли 2026',
      rep_total: 'Ҳамаи аризаҳо',
      rep_ontime: 'Дар мӯҳлат',
      rep_breach: 'Бо вайронкунӣ',
      rep_avg: 'Вақти миёна',
      rep_spec: 'Мутахассис',
      rep_col_total: 'Ҳамагӣ',
      rep_col_breach: 'Гузашта',
      rep_col_rate: 'Риояи SLA',
      ij_title: 'Дархостҳои байниидоравӣ',
      ij_sub: 'Феҳристи мубодилаҳо тавассути Smart Bridge',
      ij_pending: 'Дар коркард',
      ij_received: 'Ҷавоб гирифта шуд',
      awaiting_reply: 'Интизори маълумот',
      of_agency: 'Аризаҳои идора',
      overdue_title: 'Аризаҳои мӯҳлаташон гузашта',
      overdue_sub: 'Вайронкунии мӯҳлат (SLA) · қарор ё эскалатсия лозим аст',
      batch_title: 'Коркарди оммавӣ',
      batch_sub: 'Коркарди гурӯҳии аризаҳои якхелаи як хизмат (§7Б.2)',
      pick_service: 'Хизматро барои коркарди гурӯҳӣ интихоб кунед',
      login_sub: 'Ҷои кории худкори мутахассиси идора',
      login_title: 'Воридшавӣ ба сессия',
      login_user: 'Логин',
      login_pass: 'Гузарвожа',
      login_next: 'Идома',
      login_mfa: 'Рамзи тасдиқ (МФА)',
      login_mfa_hint: 'Рамзи 6-рақамаро аз барномаи аутентификатор ворид кунед',
      login_enter: 'Ворид шудан',
      login_legend: 'Дастрасӣ бо аутентификатсияи тақвиятшуда (МФА). Ҳамаи амалҳо сабт мешаванд.',
      login_legend_primary: 'Сессия танҳо дар ҳамин ҷойи корӣ эътибор дорад',
      login_legend_secondary: 'Ҳамаи амалҳо сабт мешаванд.',
      login_back: 'Бозгашт',
      login_required: 'Барои идома гузарвожаро ворид кунед.',
      login_mfa_required: 'Ҳамаи 6 рақами рамзи тасдиқро ворид кунед.',
      login_mfa_invalid: 'Ин рамзи намоишӣ эътибор надорад. 6 рақами дигарро ворид кунед.',
      view_app: 'Кушодани варақа',
      pay_paid: 'Пардохт шуд', pay_none: 'Лозим нест', pay_wait: 'Интизори пардохт', pay_ret: 'Баргардонида шуд',
      menu: 'Меню', collapse_sidebar: 'Пӯшидани панели паҳлӯӣ', expand_sidebar: 'Кушодани панели паҳлӯӣ', notifications: 'Огоҳиҳо', language: 'Забон', profile: 'Профил',
      notifications_read_all: 'Ҳамаро хондан', notifications_empty: 'Огоҳӣ нест', close_notification: 'Пӯшидани огоҳӣ',
      overdue_banner: 'Вайроншавии муҳлат дар мониторинги тиҷоратӣ сабт ва ба роҳбари шуъба ирсол шуд (§7Б.3).',
      applications_short: 'ариза', sort_ascending: 'мураттабсозии афзоянда', sort_descending: 'мураттабсозии коҳишёбанда', sort_by: 'Мураттаб кардан',
      select_all_page: 'Интихоби ҳамаи саҳифа', select_all: 'Ҳамаро интихоб кардан', select_application: 'Интихоби ариза',
      sla_word_breach: 'Муҳлат вайрон шуд', sla_word_warn: 'Муҳлат наздик мешавад', sla_word_ok: 'Дар доираи муҳлат',
      tin_abbr: 'РМА', four_eyes_short: '4 чашм', four_eyes: 'Қарори чор чашм',
      priority_high: 'Баланд', priority_normal: 'Одатӣ',
      field_org_name: 'Ном', field_full_name: 'Ному насаб', field_reg_num: 'Рақами бақайдгирӣ', field_manager: 'Роҳбар',
      field_dob: 'Санаи таваллуд', field_phone: 'Телефон', field_address: 'Суроға',
      pages_short: 'саҳ.', checked: 'санҷида шуд', unchecked: 'санҷида нашуд', view_document: 'Дидани ҳуҷҷат',
      audit_immutable: 'Ҳамаи амалҳо дар журнали тағйирнопазири аудит сабт мешаванд (WORM, §7Б.4)',
      actions: 'Амалҳо', result: 'Натиҷа', result_denied: 'Радди асоснок таҳия шуд.', result_reason: 'Асос',
      result_signed: 'Ҳуҷҷат бо ИРА имзо шуд', result_available: 'Дар кабинети шахсии аризадиҳанда ҷойгир шуд', download_result: 'Боргирии натиҷа',
      document_applicant: 'Аризадиҳанда', document_application: 'Ариза', document_date: 'Сана', document_decision: 'Қарор',
      document_positive: 'Мусбат', document_esigned: 'Бо ИРА имзо шуд', until: 'то',
      ret_required: 'Нависед, ки чиро бояд аниқ кард.', first_specialist: 'Мутахассиси якум', dm_reason_required: 'Асосноккунӣ ҳатмист.',
      batch_confirm_hint: 'Як қарори мусбат ба ҳамаи аризаҳои интихобшуда татбиқ мешавад. Ҳар амал дар аудит алоҳида сабт мегардад.',
      batch_reason_default: 'Маълумот пурра пешниҳод шуд; барои рад асос нест.',
      locked_title: 'Ҷои кор қулф карда шуд', unlock: 'Кушодан', reset_done: 'Маълумоти намоишӣ барқарор шуд',
      close: 'Пӯшидан'
    }
  };

  /* ---------- Ведомства-источники для запроса сведений ---------- */
  var SOURCE_AGENCIES = [
    { ru:'Государственный реестр населения', tg:'Феҳристи давлатии аҳолӣ' },
    { ru:'Налоговый комитет', tg:'Кумитаи андоз' },
    { ru:'Единый реестр юридических лиц', tg:'Феҳристи ягонаи шахсони ҳуқуқӣ' },
    { ru:'МВД · Информационный центр', tg:'ВКД · Маркази иттилоотӣ' },
    { ru:'Министерство образования', tg:'Вазорати маориф' },
    { ru:'Реестр актов гражданского состояния', tg:'Феҳристи сабти асноди ҳолати шаҳрвандӣ' },
    { ru:'МИД · Консульский департамент', tg:'ВКХ · Раёсати консулӣ' }
  ];
  var INFO_TYPES = [
    { ru:'Сведения о физическом лице', tg:'Маълумот дар бораи шахси воқеӣ' },
    { ru:'Проверка налоговой задолженности', tg:'Санҷиши қарзи андоз' },
    { ru:'Сведения из ЕГРЮЛ', tg:'Маълумот аз ФЯШҲ' },
    { ru:'Проверка судимости', tg:'Санҷиши доғи судӣ' },
    { ru:'Подтверждение документа об образовании', tg:'Тасдиқи ҳуҷҷати таҳсилот' },
    { ru:'Проверка семейного положения', tg:'Санҷиши вазъи оилавӣ' },
    { ru:'Проверка апостиля', tg:'Санҷиши апостил' }
  ];

  global.DATA = {
    STATUS: STATUS, SERVICE: SERVICE, ME: ME, COLLEAGUES: COLLEAGUES,
    I18N: I18N, REPORT_SPECIALISTS: REPORT_SPECIALISTS,
    SOURCE_AGENCIES: SOURCE_AGENCIES, INFO_TYPES: INFO_TYPES,
    seed: seed, seedNotifs: seedNotifs,
    MIN: MIN, HOUR: HOUR
  };
})(window);
