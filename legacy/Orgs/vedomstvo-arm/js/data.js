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
    nko:      { name: 'Регистрация некоммерческой организации', cat: 'Регистрация', hue: 'hue-indigo', icon: 'i-users',       critical: true,  slaHours: 240, pay: 350 },
    notary:   { name: 'Лицензия на нотариальную деятельность',  cat: 'Лицензии',    hue: 'hue-amber',  icon: 'i-cat-license', critical: true,  slaHours: 720, pay: 1200 },
    apostille:{ name: 'Проставление апостиля',                  cat: 'Легализация', hue: 'hue-teal',   icon: 'i-cat-cert',    critical: false, slaHours: 120, pay: 180 },
    extract:  { name: 'Выписка из реестра юридических лиц',      cat: 'Справки',     hue: 'hue-blue',   icon: 'i-doc',         critical: false, slaHours: 24,  pay: 0 },
    marriage: { name: 'Государственная регистрация брака',       cat: 'Акты ГЗ',     hue: 'hue-rose',   icon: 'i-rings',       critical: false, slaHours: 72,  pay: 60 },
    rename:   { name: 'Перемена имени',                          cat: 'Акты ГЗ',     hue: 'hue-violet', icon: 'i-user-add',    critical: false, slaHours: 168, pay: 90 },
    legal:    { name: 'Государственная регистрация юр. лица',    cat: 'Регистрация', hue: 'hue-steel',  icon: 'i-biz',         critical: true,  slaHours: 120, pay: 500 },
    accred:   { name: 'Аккредитация филиала иностранной орг.',   cat: 'Аккредитация',hue: 'hue-slate',  icon: 'i-cat-accred',  critical: true,  slaHours: 480, pay: 2400 }
  };

  /* ---------- Специалист (текущая сессия, §7Б.4) ---------- */
  var ME = {
    name: 'Азизов А. Н.',
    initials: 'АА',
    role: 'Специалист ведомства',
    agency: 'Министерство юстиции',
    division: 'Управление регистрации НКО',
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

    return A;
  }

  /* ---------- Уведомления / эскалации (§7Б.3) ---------- */
  function seedNotifs() {
    return [
      { id: 'n1', kind: 'breach', appId: 'a8', title: 'Нарушен срок (SLA)', text: 'Аккредитация филиала «Central Asia Logistics» — просрочено. Эскалация руководителю.', ago: 30 * MIN, unread: true },
      { id: 'n2', kind: 'breach', appId: 'a3', title: 'Нарушен срок (SLA)', text: 'Апостиль диплома (Мирзоева Г. А.) — просрочено на 3 часа.', ago: 2 * HOUR, unread: true },
      { id: 'n3', kind: 'warn', appId: 'a6', title: 'Срок приближается', text: 'Регистрация ЮЛ «Заррина Текстиль» — до нарушения менее часа.', ago: 15 * MIN, unread: true },
      { id: 'n4', kind: 'info', appId: 'a4', title: 'Получен ответ ведомства', text: 'Ожидается ответ ЕГРЮЛ по выписке «Помир-Трейд».', ago: 5 * MIN, unread: false }
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
      search_ph: 'Поиск по № заявления, ФИО, ИНН…',
      lock: 'Заблокировать',
      end_shift: 'Завершить смену',
      logout: 'Выйти',
      reset_demo: 'Сбросить демо-данные',
      theme: 'Тема',
      // queue
      queue_title: 'Мои заявления',
      queue_sub: 'Заявления, назначенные вам · сортировка по сроку (SLA) и приоритету',
      f_all_services: 'Все услуги',
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
      login_user: 'Логин',
      login_pass: 'Пароль',
      login_next: 'Продолжить',
      login_mfa: 'Код подтверждения (МФА)',
      login_mfa_hint: 'Введите 6-значный код из приложения-аутентификатора для',
      login_enter: 'Войти',
      login_legend: 'Доступ по усиленной аутентификации (МФА). Все действия фиксируются в журнале аудита.',
      login_back: 'Назад',
      view_app: 'Открыть карточку',
      pay_paid: 'Оплачено', pay_none: 'Не требуется', pay_wait: 'Ожидает оплаты', pay_ret: 'Возвращена',
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
      search_ph: 'Ҷустуҷӯ аз рӯи №, ному насаб, РМА…',
      lock: 'Қулф кардан',
      end_shift: 'Анҷоми баст',
      logout: 'Баромадан',
      reset_demo: 'Барқарорсозии маълумоти намоишӣ',
      theme: 'Мавзӯъ',
      queue_title: 'Аризаҳои ман',
      queue_sub: 'Аризаҳои ба шумо вогузошташуда · мураттабсозӣ аз рӯи мӯҳлат ва афзалият',
      f_all_services: 'Ҳамаи хизматҳо',
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
      login_user: 'Логин',
      login_pass: 'Гузарвожа',
      login_next: 'Идома',
      login_mfa: 'Рамзи тасдиқ (МФА)',
      login_mfa_hint: 'Рамзи 6-рақамаро аз барномаи аутентификатор ворид кунед барои',
      login_enter: 'Ворид шудан',
      login_legend: 'Дастрасӣ бо аутентификатсияи тақвиятшуда (МФА). Ҳамаи амалҳо сабт мешаванд.',
      login_back: 'Бозгашт',
      view_app: 'Кушодани варақа',
      pay_paid: 'Пардохт шуд', pay_none: 'Лозим нест', pay_wait: 'Интизори пардохт', pay_ret: 'Баргардонида шуд',
      close: 'Пӯшидан'
    }
  };

  /* ---------- Ведомства-источники для запроса сведений ---------- */
  var SOURCE_AGENCIES = [
    'Государственный реестр населения',
    'Налоговый комитет',
    'Единый реестр юридических лиц',
    'МВД · Информационный центр',
    'Министерство образования',
    'Реестр актов гражданского состояния',
    'МИД · Консульский департамент'
  ];
  var INFO_TYPES = [
    'Сведения о физическом лице',
    'Проверка налоговой задолженности',
    'Сведения из ЕГРЮЛ',
    'Проверка судимости',
    'Подтверждение документа об образовании',
    'Проверка семейного положения',
    'Проверка апостиля'
  ];

  global.DATA = {
    STATUS: STATUS, SERVICE: SERVICE, ME: ME, COLLEAGUES: COLLEAGUES,
    I18N: I18N, REPORT_SPECIALISTS: REPORT_SPECIALISTS,
    SOURCE_AGENCIES: SOURCE_AGENCIES, INFO_TYPES: INFO_TYPES,
    seed: seed, seedNotifs: seedNotifs,
    MIN: MIN, HOUR: HOUR
  };
})(window);
