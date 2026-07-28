/* ============================================================
   mock/api.js — §11.3. Контракты под будущий бэкенд.

   Мок обязан врать правдоподобно: латентность 300–900ms и настоящие ошибки.
   Если мок отвечает мгновенно и всегда «ок», состояния loading/error никто
   не увидит до интеграции — а §7 требует, чтобы они были реализованы.

   Три вещи, которые этот файл держит на себе намеренно:

   1. **Согласие — на стороне «сервера».** `grant.scopes` живёт здесь, а не в
      store. Иначе `citizen.get()` спрашивал бы разрешение у того, кто хочет
      данные, и 403 из §6/S5 был бы декорацией. Тут его не обойти из UI.
   2. **Ответ гражданина — не ответ сервера.** QR-скан, подтверждение согласия
      и выдача доп. скоупа приходят от человека с телефоном, поэтому это не
      `await`-ответ на запрос, а событие: запрос регистрирует ожидание, а
      демо-панель (§11.5) играет за гражданина.
   3. **Сбои — переключаемые, а не случайные.** §7 требует, чтобы каждое
      краевое состояние воспроизводилось; случайный сбой воспроизвести нельзя.
   ============================================================ */
import {
  OPERATORS, TSONS, CITIZENS, CATALOG, SERVICE, BASE_SCOPES, citizenSlice,
  REGISTRY, PASSPORT_FIELDS, OCR_TRUST, buildCitizen, digits,
} from './data.js';

const LATENCY = [300, 900];
const delay = (ms) => new Promise(r =>
  setTimeout(r, ms ?? LATENCY[0] + Math.random() * (LATENCY[1] - LATENCY[0])));

export class ApiError extends Error {
  constructor(code, message, meta = {}) {
    super(message);
    this.code = code;
    Object.assign(this, meta);
  }
}

/* ============================================================
   Симулятор: гражданин, его телефон и сбои инфраструктуры (§11.5, §7)
   ============================================================ */
const listeners = new Set();
const emit = () => listeners.forEach(fn => fn());

export const sim = {
  /* Переключаемые сбои §7. Каждый — строка матрицы, а не «иногда бывает». */
  faults: {
    network: false, registry: false, scanner: false,
    printer: false, blurry: false, push: false,
    // §6/S2 «лицо не распознано» — камера не нашла совпадения в реестре
    // биометрии. Тумблер, а не случайность: путь ошибки обязан быть
    // воспроизводим, как и «push не доставлен».
    face: false,
    // §6/S2b — «распознавание не удалось». Отдельно от blurry: размытый скан
    // роняет уверенность по визуальной зоне и оставляет MRZ, а отказ OCR не
    // даёт вообще ничего, и путь у этих двух состояний разный.
    ocr: false,
  },

  /* Ожидания ответа от гражданина. null = никто ничего не ждёт. */
  pending: { identify: null, consent: null, scope: null },

  onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  setFault(key, on) { sim.faults[key] = on; emit(); },

  /* --- за гражданина --- */
  identified() {
    current = CITIZENS[0];          // сканировал QR тот, кто есть в реестре
    settle('identify', { maskedName: 'А***в Ф.', scopes: BASE_SCOPES, registered: true });
  },
  /* Отдаём СРЕЗ по выданным скоупам, а не гражданина целиком (Д-02): в память
     АРМ не должно попасть больше, чем гражданин выдал. Прогрессивные скоупы
     досылают свой кусок отдельно — см. scope.js. */
  consentGranted() {
    settle('consent', {
      status: 'granted', citizen: citizenSlice(BASE_SCOPES, who()), scopes: BASE_SCOPES,
    });
  },
  consentDenied()  { settle('consent', { status: 'denied' }); },
  consentTimeout() { settle('consent', { status: 'timeout' }); },
  scopeGranted() {
    const p = sim.pending.scope;
    if (!p) return;
    grant.scopes = [...new Set([...grant.scopes, p.scope])];
    grant.at[p.scope] = Date.now();     // время выдачи именно этого скоупа
    settle('scope', { status: 'granted', scope: p.scope });
  },
  scopeDenied() { settle('scope', { status: 'denied', scope: sim.pending.scope?.scope }); },
};

function await_(kind, meta = {}) {
  abort(kind);
  return new Promise(resolve => {
    sim.pending[kind] = { ...meta, resolve };
    emit();
  });
}

function settle(kind, value) {
  const p = sim.pending[kind];
  if (!p) return;
  sim.pending[kind] = null;
  p.resolve(value);
  emit();
}

/* Экран ушёл (Esc, TTL, отзыв) — ожидание снимаем. Резолвим null, а не
   reject: «никто не ответил, и это не ошибка» — обычный исход, а не сбой,
   и незачем заставлять каждый экран ловить исключение при размонтировании. */
function abort(kind) {
  const p = sim.pending[kind];
  if (!p) return;
  sim.pending[kind] = null;
  p.resolve(null);
  emit();
}

/* ============================================================
   Состояние «сервера»
   ============================================================ */
/* at — время выдачи КАЖДОГО скоупа, а не всего согласия (Д-16). Базовые
   выдаются одним «да» гражданина, прогрессивные — каждый своим, иногда сильно
   позже; §6/S9a требует показывать «скоуп · время выдачи», и один общий
   штамп на всех врал бы ровно про те скоупы, ради которых поповер и открыт. */
let grant = { scopes: [], grantedAt: null, at: {} };
let otpAttempts = 0;
let lockedUntil = 0;
/* Счётчик продолжает список «Последних заявлений» с S1, а не начинается
   заново: смена идёт с утра, и первое же оформленное за демонстрацию
   заявление должно встать следующим за теми, что там уже показаны. */
let appNo = 472;

/* Гражданин, которого сейчас обслуживают. До S2b его роль играл CITIZENS[0]:
   гражданин был один, и «текущий» совпадал с «единственным». С регистрацией
   (§6/S2b) в реестре появляются новые записи, и подставлять первую значило бы
   показать оператору данные постороннего человека — худший из возможных багов
   в этом продукте. Ставится ровно в двух местах: при удачной идентификации и
   при завершённой регистрации. Снимается на session.end(). */
let current = null;

/* Телефон, на который ушёл последний код. Живёт здесь, а не в экране: именно
   «сервер» знает, чей номер он подтвердил, и именно он решает, есть ли за этим
   номером гражданин. Экран, хранящий это у себя, мог бы подставить в
   регистрацию другой номер — тот, что оператор успел перебрать в поле. */
let otpPhone = '';

/* Фолбэк на CITIZENS[0] нужен только для путей, минующих идентификацию:
   демо-панель дёргает GRANTED напрямую (§11.5). В обычном сценарии current
   уже стоит. */
const who = () => current || CITIZENS[0];

/* §7 — «Сеть пропала». Проверяется первым в каждом вызове: офлайн не выбирает,
   какие запросы ронять. */
function net() {
  if (sim.faults.network) throw new ApiError('OFFLINE', 'Нет связи с сервером');
}

export const auth = {
  /* §11.3 — «ошибки по спец-логину fail». */
  async login(loginName, password) {
    await delay();
    net();

    if (Date.now() < lockedUntil) {
      throw new ApiError('LOCKED_OUT', 'Слишком много попыток', { until: lockedUntil });
    }
    if (loginName === 'fail' || !password) {
      throw new ApiError('BAD_CREDENTIALS', 'Неверный логин или пароль');
    }

    const op = OPERATORS.find(o => o.login === loginName) || OPERATORS[0];
    otpAttempts = 0;
    return { otpRequired: true, operator: { login: loginName, name: op.name } };
  },

  async otp(code) {
    await delay();
    net();

    if (Date.now() < lockedUntil) {
      throw new ApiError('LOCKED_OUT', 'Слишком много попыток', { until: lockedUntil });
    }
    // Правильный код — любой, кроме заведомо неверного 111111: демо должно
    // проходиться без бумажки с кодом, но путь ошибки обязан быть достижим.
    if (code === '111111') {
      otpAttempts += 1;
      if (otpAttempts >= 3) {
        lockedUntil = Date.now() + 30_000;   // кулдаун с таймером (§6/S0)
        otpAttempts = 0;
        throw new ApiError('LOCKED_OUT', 'Слишком много попыток', { until: lockedUntil });
      }
      throw new ApiError('BAD_OTP', 'Неверный код', { left: 3 - otpAttempts });
    }
    if (!/^\d{6}$/.test(code)) throw new ApiError('BAD_OTP', 'Неверный код', { left: 3 - otpAttempts });

    return { ok: true };
  },

  async resendOtp() { await delay(); net(); return { ok: true }; },

  async bind({ tson, window: win }) {
    await delay();
    net();
    if (!tson || !win) throw new ApiError('BAD_BIND', 'Выберите ЦОН и окно');
    return { bind: { tson, window: win } };
  },

  /* LOCKED → re-auth (§6/S9c). В проде — Keycloak. */
  async reauth(password) {
    await delay();
    if (!password || password === 'fail') throw new ApiError('BAD_CREDENTIALS', 'Неверный пароль');
    return { ok: true };
  },

  async tsons() { await delay(); return TSONS; },
};

/* Статистика смены — операторская, без ПД (§6/S1). */
export const shift = {
  async stats() {
    await delay();
    return {
      served: 47,
      avgMs: 6 * 60_000 + 12_000,
      issued: 31,
      // §6/S1 — «номера заявлений маскировать до последних цифр», без имён.
      // Номер сам по себе ПД не является: он говорит, какая услуга оформлена и
      // какой по счёту, но не кем. Поэтому в списке он показывается целиком.
      recent: [
        { no: appNoFor('fam-cert', 472), status: 'issued' },
        { no: appNoFor('marriage', 471), status: 'issued' },
        { no: appNoFor('pension-cert', 468), status: 'issued' },
      ],
    };
  },
};

/* Номер заявления: ГОД-НОМЕР УСЛУГИ-ПОРЯДКОВЫЙ («2026-01-114-0472»).

   Прежний «2107-44» был датой приёма плюс счётчик, и по нему нельзя было
   сказать ничего: ни года (две цифры дня и месяца), ни услуги. Оператор в
   списке «Последние заявления» видит номера без имён — §6/S1 запрещает имена
   — и остаётся с номером как с единственной зацепкой: «это какая была?».
   Номер услуги из каталога отвечает на этот вопрос, не называя гражданина.

   Формат один на всё приложение: список на S1 и номер, выданный на S8, —
   это один и тот же номер в жизни гражданина, и выглядеть они обязаны
   одинаково. */
function appNoFor(serviceId, seq) {
  const svc = SERVICE[serviceId];
  return `${new Date().getFullYear()}-${svc?.no || '00-000'}-${String(seq).padStart(4, '0')}`;
}

/* ============================================================
   S2 · Идентификация (§6/S2)
   ============================================================ */
export const identify = {
  /* Запрос кода. Ответ придёт не отсюда — гражданин ещё не сканировал. */
  async qr() {
    await delay();
    net();
    return { challenge: rnd(), ttlMs: 120_000 };
  },

  async push(contact) {
    await delay();
    net();
    known(contact);
    // §6/S2 «push не доставлен» — сбой инфраструктуры, поэтому тумблер (§7),
    // а не особый номер: у гражданина с тем же номером push может не дойти
    // сегодня и дойти завтра.
    if (sim.faults.push) {
      throw new ApiError('PUSH_UNDELIVERED', 'Push не доставлен: приложение не открывается');
    }
    return { sentTo: '•••• 45 67', resendAfterMs: 30_000 };
  },

  /* SMS уходит на ЛЮБОЙ валидный номер, даже незнакомый реестру, и это не
     послабление, а весь смысл §6/S2b: гражданин, который никогда не заходил в
     eKhizmat, не может подтвердить себя приложением — у него его нет. Код в
     SMS доказывает единственное, что можно доказать до паспорта: телефон в
     руках у того, кто стоит у окна. Дальше личность подтверждает документ.

     Поэтому «не найден в реестре» здесь больше не ошибка, а факт: registered:
     false. Ошибкой он остаётся для push (нет аккаунта — некуда слать) — там
     known() и живёт. */
  async sms(contact) {
    await delay();
    net();
    otpPhone = validContact(contact);
    return {
      sentTo: maskPhone(otpPhone),
      registered: !!REGISTRY.byPhone(otpPhone),
    };
  },

  /* OTP-резерв: код гражданин диктует вслух, поэтому проверка синхронная —
     ждать «событие от телефона» тут нечего. */
  async smsConfirm(code) {
    await delay();
    net();
    if (!/^\d{6}$/.test(code) || code === '111111') {
      throw new ApiError('BAD_OTP', 'Неверный код');
    }

    const found = REGISTRY.byPhone(otpPhone);
    if (!found) {
      // Телефон подтверждён, гражданина нет — вход в регистрацию (§6/S2b).
      // Скоупов не отдаём: выдавать нечего, данных в реестре ещё не существует.
      return { registered: false, phone: otpPhone };
    }

    current = found;
    return {
      registered: true,
      maskedName: maskFull(found.profile.full),
      scopes: BASE_SCOPES,
      phone: otpPhone,
    };
  },

  /* Вход по лицу возвращающегося гражданина (§6/S2). Камера сверяет лицо с
     биометрией в реестре — это поиск 1:N, поэтому оператору не нужно вводить
     ни телефон, ни ИНН: как и скан QR, метод сам приносит личность.

     Совпадение приходит не отсюда (гражданин ещё перед камерой) — его резолвит
     identify.wait(), за который в демо играет панель (§11.5). Здесь же —
     единственный синхронный отказ: реестр биометрии не нашёл лица (тумблер
     §7). Он бросается на старте, как PUSH_UNDELIVERED у push: обе ошибки —
     «этим способом идентифицировать не вышло», и обе ведут на запасной. */
  async face() {
    await delay();
    net();
    if (sim.faults.face) {
      throw new ApiError('FACE_NO_MATCH', 'Лицо не распознано в реестре', { status: 404 });
    }
    return { ttlMs: 60_000 };
  },

  /* Ожидание действия гражданина (push/лицо). Резолвится демо-панелью.
     method прокидывается в ожидание, чтобы демо-панель подписала кнопку «за
     гражданина» тем, что он делает на самом деле (открыл push / посмотрел в
     камеру), а не одним словом на все методы. */
  wait(method) { return await_('identify', { method }); },
  abort() { abort('identify'); },
};

/* ============================================================
   S2b · Регистрация нового гражданина (§6/S2b)

   Гражданин впервые пришёл в ЦОН и в eKhizmat его нет. Всё, что о нём
   известно, лежит на столе — паспорт. Отсюда три вызова: снять разворот,
   прочитать его, записать проверенное в реестр.

   Разделение scan/extract намеренное, хотя в одном вызове было бы короче.
   Пересканировать и перечитать — разные операции с разной ценой: скан живёт,
   пока оператор правит поля, и повторное распознавание того же скана не
   должно гонять сканер по бумаге ещё раз. К тому же в проде это два разных
   сервиса (драйвер сканера и OCR ведомства), и один падает без другого.
   ============================================================ */

/* Что «распознаёт» мок. Вымышленный гражданин (§10), намеренно НЕ тот, что
   лежит в CITIZENS: демо должно показать появление новой записи, а не
   повторную регистрацию известной.

   confidence — не украшение. Поля MRZ приходят с контрольными цифрами и
   потому сверены; визуальная зона — кириллица, печати и штампы, и там OCR
   ошибается. Ошибка здесь заложена НАМЕРЕННО: «ШBКД» набран латинской B
   вместо кириллической В — классическая подмена, которую глаз оператора
   ловит, а строковое сравнение нет. Без такой ошибки экран правки нечего
   было бы демонстрировать: он существует ровно для этого случая (§6/S2b). */
const OCR_SOURCE = {
  full:       { value: 'Назарзода Гулнора Саидовна',      c: 0.99 },
  birth:      { value: '03.11.1996',                      c: 0.99 },
  sex:        { value: 'f',                               c: 0.99 },
  birthPlace: { value: 'г. Кӯлоб, Хатлонская обл.',       c: 0.74 },
  docNo:      { value: 'B 45 678 901',                    c: 0.98 },
  issued:     { value: '19.06.2021',                      c: 0.93 },
  expires:    { value: '19.06.2031',                      c: 0.98 },
  issuedBy:   { value: 'ШBКД р-н Фирдавсӣ',               c: 0.71 },
  inn:        { value: '987654321',                       c: 0.88 },
  address:    { value: 'г. Душанбе, р-н Фирдавси, ул. Борбад, 7, кв. 33', c: 0.69 },
};

export const enroll = {
  /* Разворот паспорта. Отдельно от docs.scan(): там страница А4 документа
     заявления, здесь разворот 125×88 с MRZ — и оператор обязан видеть
     разницу, иначе не поймёт, что именно кладёт в сканер. */
  async scan(page = 1) {
    await delay(600);
    net();
    if (sim.faults.scanner) throw new ApiError('NO_SCANNER', 'Сканер не отвечает');
    return { id: rnd(), page, url: passportPng(page), blurry: sim.faults.blurry };
  },

  /* Чтение разворота. Возвращает по полю: значение, уверенность и зону.
     Зону отдаём наружу, потому что от неё зависит поведение экрана: MRZ
     сверена контрольной цифрой и приходит закрытой на правку, визуальная —
     под проверку глазами. */
  async extract(scans = []) {
    await delay(900);
    net();

    if (sim.faults.ocr) {
      throw new ApiError('OCR_FAILED', 'Не удалось распознать паспорт');
    }

    const pages = new Set(scans.map(s => s.page));
    const blurry = scans.some(s => s.blurry);

    const fields = {};
    for (const f of PASSPORT_FIELDS) {
      const src = OCR_SOURCE[f.id];

      // Разворот не отсканирован — поля с него не выдумываем. Пустое поле
      // честнее подставленного: адрес живёт на странице регистрации, и если
      // её не сняли, взять его неоткуда.
      if (!pages.has(f.page) || !src) {
        fields[f.id] = { value: '', confidence: 0, zone: f.zone };
        continue;
      }

      // §7 «скан размыт»: MRZ выживает (её читает не глаз, а контрольная
      // сумма), визуальная зона рассыпается. Это и есть разница между
      // «пересканируйте» и «проверьте вручную».
      const blur = blurry && f.zone === 'visual';
      fields[f.id] = {
        value: blur ? '' : src.value,
        confidence: blur ? 0 : src.c,
        zone: f.zone,
      };
    }

    return { fields, mrzValid: !sim.faults.blurry, blurry };
  },

  /* Проверка ИНН на дубль (§6/S2b). Отдельный вызов, а не проверка в submit:
     оператор должен узнать о дубле, набирая ИНН, а не после того, как
     заполнил весь паспорт. */
  async checkInn(inn) {
    await delay(200);
    net();
    const d = digits(inn);
    if (d.length !== 9) return { ok: false, reason: 'format' };

    const found = REGISTRY.byInn(d);
    if (found) {
      throw new ApiError('DUPLICATE_INN', 'Гражданин с таким ИНН уже зарегистрирован', {
        status: 409, maskedName: maskFull(found.profile.full),
        phone: maskPhone(digits(found.profile.phone)),
      });
    }
    return { ok: true };
  },

  /* Запись в реестр. Здесь же — выдача базовых скоупов, и это осознанное
     решение, а не срезанный угол.

     Обычный приём (§6/S3) спрашивает согласие у телефона гражданина, потому
     что оператор гражданина не видел и подтвердить его личность может только
     сам гражданин. При регистрации всё наоборот: человек стоит у окна, отдал
     паспорт в руки, подтвердил телефон кодом и слышит, что оператор читает с
     экрана. Отправлять ему после этого пуш «разрешаете ли вы оператору
     видеть данные, которые вы только что ему продиктовали» — обряд, а не
     защита; приложения у него к тому же ещё нет.

     Поэтому согласие фиксируется здесь, но фиксируется ЧЕСТНО: via говорит,
     каким путём оно получено, и §6/S9a показывает это в поповере скоупов
     вместо «подтверждено гражданином в приложении». Врать в аудите нельзя
     даже в удобную сторону. */
  async submit({ fields, phone, by }) {
    await delay();
    net();

    const missing = PASSPORT_FIELDS.filter(f => f.required && !String(fields[f.id] || '').trim());
    if (missing.length) {
      throw new ApiError('FIELDS_REQUIRED', 'Заполните обязательные поля',
        { missing: missing.map(f => f.id) });
    }

    const dup = REGISTRY.byInn(fields.inn);
    if (dup) {
      throw new ApiError('DUPLICATE_INN', 'Гражданин с таким ИНН уже зарегистрирован', {
        status: 409, maskedName: maskFull(dup.profile.full),
      });
    }

    // §7 «реестр-источник недоступен»: запись в реестр — не чтение снимка,
    // подделать её нечем. Регистрация без реестра невозможна, и сказать об
    // этом надо прямо, а не сохранить «пока у себя».
    if (sim.faults.registry) {
      throw new ApiError('REGISTRY_DOWN', 'Реестр не отвечает — регистрация недоступна');
    }

    const at = new Date().toLocaleDateString('ru-RU');
    const record = REGISTRY.add(buildCitizen(fields, { phone: fmtPhone(phone), at, by }));

    current = record;
    consent.commit(BASE_SCOPES, 'enrollment');

    return {
      citizenId: record.id,
      citizen: citizenSlice(BASE_SCOPES, record),
      scopes: BASE_SCOPES,
      maskedName: maskFull(record.profile.full),
      verifiedAt: Date.now(),
    };
  },

  /* Захват лица сразу после записи в реестр (§6/S2b). Гражданин у окна, запись
     создана — камера снимает лицо и привязывает шаблон к УЧЁТНОЙ ЗАПИСИ, чтобы
     в следующий приход он входил по Face ID (§6/S2).

     Шаблон кладётся в корень записи (current.biometric), а НЕ в store и НЕ в
     скоуп: как и в data.js, биометрия — учётные данные для входа, а не сведения
     о человеке, и через citizen.get() она не проходит. Привязываемся к current,
     который submit() только что поставил на новую запись, — id гонять незачем. */
  async captureFace() {
    await delay(600);
    net();
    if (!current) throw new ApiError('NO_CITIZEN', 'Нет активной регистрации');
    current.biometric = { face: true, enrolledAt: Date.now() };
    return { ok: true, at: current.biometric.enrolledAt };
  },
};

/* ============================================================
   S3 · Согласие + прогрессивные скоупы (§6/S3, §6/S4, §6/S5)
   ============================================================ */
export const consent = {
  /* Стартовый запрос — базовый скоуп (§6/S3). */
  async request(scopes = BASE_SCOPES) {
    await delay();
    net();
    return { requestId: rnd(), scopes, ttlMs: 120_000 };
  },

  wait() { return await_('consent'); },

  /* Гражданин подтвердил — «сервер» открывает доступ. Ровно здесь, и нигде
     больше, скоупы становятся выданными: citizen.get() смотрит только сюда.

     via — каким путём получено согласие: 'app' (гражданин нажал в приложении,
     §6/S3) или 'enrollment' (личная явка с паспортом, §6/S2b). §6/S9a обещает
     показывать «кем подтверждён», и одна подпись на оба пути была бы ложью в
     аудите — ровно в том месте, ради которого аудит и существует. */
  commit(scopes, via = 'app') {
    const now = Date.now();
    grant = { scopes: [...scopes], grantedAt: now, at: {}, via };
    for (const s of scopes) grant.at[s] = now;
    emit();
  },

  /* Доп. скоуп по требованию услуги (§6/S4, §6/S5). Мини-таймер 60с. */
  async requestScope(scope) {
    await delay();
    net();
    return { requestId: rnd(), scope, ttlMs: 60_000 };
  },

  waitScope(scope) { return await_('scope', { scope }); },

  abort() { abort('consent'); abort('scope'); },

  granted() { return [...grant.scopes]; },

  /* Время выдачи конкретного скоупа (§6/S9a). null — скоуп не выдан. */
  grantedAt(scope) { return grant.at[scope] ?? null; },

  /* Путь получения согласия (§6/S9a «кем подтверждён»). */
  via() { return grant.via || 'app'; },
};

/* ============================================================
   S5/S6 · Данные гражданина (§6/S5)
   ============================================================ */
export const citizen = {
  /* §6/S5 приёмка: «ответ мок-API для невыданного скоупа — HTTP 403 без тела
     данных». Проверяем по grant.scopes — состоянию «сервера», которое UI не
     правит. Соврать здесь нельзя: данных в ответе просто нет. */
  async get(scope) {
    await delay();
    net();

    if (!grant.scopes.includes(scope)) {
      throw new ApiError('FORBIDDEN', 'Скоуп не выдан гражданином', { status: 403, scope });
    }

    // Только что зарегистрированный гражданин (§6/S2b) есть в реестре
    // документов и адресов, но не в ЗАГСе, БДД и налоговой: паспорт этих
    // данных не содержит, а других источников о нём пока нет. 404 здесь —
    // нормальный ответ про нового человека, а не сбой.
    const data = who()[scope];
    if (!data) throw new ApiError('NOT_FOUND', 'Нет данных', { status: 404, scope });

    // §7 «Реестр-источник недоступен»: снимок в кеше есть, свежесть неизвестна.
    // Поэтому данные отдаём, но помечаем — S5 покажет янтарный банер, а S6
    // откажется автозаполнять из непроверенного снимка (§7: «поля без
    // автозаполнения → ручной ввод»).
    return { ...data, stale: sim.faults.registry };
  },
};

/* ============================================================
   S4 · Каталог (§6/S4)
   ============================================================ */
export const catalog = {
  async list() { await delay(); net(); return CATALOG; },

  /* Живой поиск от 2 символов: имя + номер услуги + синонимы (§6/S4). */
  async search(q) {
    await delay(200);
    net();
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];

    return CATALOG.filter(x =>
      x.name.toLowerCase().includes(s) ||
      x.no.toLowerCase().includes(s) ||
      x.synonyms.some(w => w.includes(s)));
  },

  async get(id) {
    await delay();
    net();
    const s = SERVICE[id];
    if (!s) throw new ApiError('NOT_FOUND', 'Услуга не найдена', { status: 404 });
    return s;
  },
};

/* ============================================================
   S6/S7 · Заявление (§6/S6, §6/S7)
   ============================================================ */
/* Черновики живут на «сервере», а не в сессии, и это не оптимизация.
   §7: «TTL истёк при заполнении → черновик автосохранён… при новом приёме
   того же гражданина — восстановить черновик?», §14: «Куда уходит
   незавершённое заявление → черновик в профиле гражданина». Значит, черновик
   обязан пережить wipe() — он принадлежит гражданину, а не рабочему месту.
   Ключ в проде — гражданин; в моке гражданин один, поэтому услуга. */
const drafts = new Map();

export const application = {
  async draft(payload) {
    await delay(200);
    net();
    const d = { savedAt: Date.now(), ...payload };
    drafts.set(payload.serviceId, d);
    return d;
  },

  async getDraft(serviceId) {
    await delay(200);
    return drafts.get(serviceId) || null;
  },

  async submit({ serviceId, values, docs }) {
    await delay();
    net();

    const svc = SERVICE[serviceId];

    /* Паспорт, сверенный при регистрации (§6/S2b), закрывает требование
       «оригинал для сверки» — и закрывает его ЗДЕСЬ, на «сервере», а не
       только в чеклисте S7. Иначе экран разрешал бы отправку, а приём
       заявления её отклонял: два разных мнения об одном и том же документе,
       из которых оператор узнал бы о втором в самый неподходящий момент.

       Скоуп тут не проверяется намеренно. Согласие управляет тем, что видит
       АРМ, а не тем, что знает реестр: паспорт сверен независимо от того,
       открыл гражданин оператору свои документы или нет. */
    const idOk = (who().documents?.items || []).some(d => d.identity && d.verified);

    const missing = (svc?.docs || []).filter(d =>
      d.required && !docs?.[d.id]?.length && !(d.identity && idOk));

    if (missing.length) {
      throw new ApiError('DOCS_REQUIRED', 'Не хватает обязательных документов', { missing });
    }

    drafts.delete(serviceId);      // принято — черновика больше нет
    appNo += 1;
    return {
      no: appNoFor(serviceId, appNo),
      at: Date.now(),
      serviceId,
      instant: !!svc.instant,
      values,
    };
  },
};

/* ============================================================
   S7 · Сканер (§6/S7)
   ============================================================ */
export const docs = {
  /* §6/S7 — «мок-захват (600ms «шторка» + появление страницы)». */
  async scan(page = 1) {
    await delay(600);
    net();
    if (sim.faults.scanner) throw new ApiError('NO_SCANNER', 'Сканер не отвечает');

    return {
      id: rnd(),
      url: pagePng(page),
      blurry: sim.faults.blurry,   // §7 — переключается, а не выпадает случайно
    };
  },

  async upload(file) {
    await delay();
    net();
    if (file.size > 10 * 1024 * 1024) {
      throw new ApiError('TOO_BIG', 'Файл больше 10 МБ');
    }
    if (!/^(application\/pdf|image\/(jpeg|png))$/.test(file.type)) {
      throw new ApiError('BAD_TYPE', 'Только PDF, JPG или PNG');
    }
    return { id: rnd(), url: URL.createObjectURL(file), blurry: false, name: file.name };
  },
};

/* ============================================================
   S8 · Результат (§6/S8)
   ============================================================ */
export const result = {
  async pdf({ no, serviceId }) {
    await delay();
    net();
    const svc = SERVICE[serviceId];
    const blob = new Blob([buildPdf(svc?.name || 'Spravka', no)], { type: 'application/pdf' });
    return { url: URL.createObjectURL(blob), pages: 1 };
  },

  async print() {
    await delay();
    net();
    // Настоящий window.print() в прототипе не зовём: демо-стенд без принтера
    // отдал бы системный диалог вместо сценария. §11.3 — «фейковый PDF».
    if (sim.faults.printer) throw new ApiError('NO_PRINTER', 'Принтер не отвечает');
    return { ok: true };
  },

  async sendToApp() {
    await delay();
    net();
    return { ok: true, deliveredAt: Date.now() };
  },
};

/* ============================================================
   S9 · Сессия (§6/S9)
   ============================================================ */
export const session = {
  /* Продление = повторное подтверждение гражданином (§6/S9c), поэтому это
     не отдельный вызов, а тот же consent.request на 60с. */
  async extend() {
    await delay();
    net();
    return { ttlMs: 60_000 };
  },

  /* Завершение приёма: «сервер» отзывает доступ. После этого citizen.get()
     отдаёт 403 на всё — даже если бы в UI где-то остался старый экран. */
  async end() {
    await delay(200);
    grant = { scopes: [], grantedAt: null, at: {}, via: null };
    consent.abort();
    identify.abort();

    // Указатель на гражданина — тоже доступ, пусть и косвенный: оставленный
    // current после приёма означал бы, что следующий citizen.get() (например,
    // из зависшего экрана) знает, кого спрашивать. Скоупы отозваны, так что
    // ответом всё равно будет 403 — но полагаться на один замок там, где можно
    // закрыть оба, в этом файле не принято.
    current = null;
    otpPhone = '';

    // Состояние «сервера» изменилось — сообщаем. Без этого аудит §13 в
    // демо-панели показывал бы число скоупов на момент своей последней
    // перерисовки: она случается на dispatch(REVOKED), то есть ЗА 200ms до
    // того, как доступ реально отозван. Панель честно рисовала «выдано 4»
    // при уже стёртой сессии — и выглядело это как утечка, которой нет.
    // Аудит, который врёт, хуже отсутствующего (см. demo.js).
    emit();
    return { ok: true };
  },
};

/* ============================================================
   Утилиты мока
   ============================================================ */
const rnd = () => Math.random().toString(36).slice(2, 10);

/* §6/S2 «гражданин не найден». Это не сбой, а факт про введённое значение,
   поэтому проверяется по вводу — тем же приёмом, что логин `fail` в auth.
   Остаётся путём push'а: у незарегистрированного гражданина нет приложения,
   и слать уведомление физически некуда. */
function known(contact) {
  validContact(contact);
  if (!REGISTRY.byPhone(contact)) {
    throw new ApiError('CITIZEN_NOT_FOUND', 'Гражданин не найден в реестре', { status: 404 });
  }
}

/* Проверка самого ввода, без похода в реестр. Отдаёт нормализованные цифры —
   номер дальше живёт в одном виде, откуда бы его ни набрали. */
function validContact(contact) {
  const d = digits(contact);
  if (d.length !== 9) throw new ApiError('BAD_CONTACT', 'Телефон — 9 цифр после +992');
  return d;
}

const maskPhone = d => `•••• ${d.slice(-4, -2)} ${d.slice(-2)}`;

/* Тот же вид, в каком телефоны лежат в реестре: «+992 90 123 45 67».
   Совпадение формата не косметика — REGISTRY.byPhone сравнивает по цифрам,
   но оператор сверяет глазами, и запись, отформатированная иначе, читалась бы
   как чужая. */
const fmtPhone = v => {
  const d = digits(v);
  return `+992 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 7)} ${d.slice(7, 9)}`;
};

/* Маска ФИО для откликов «сервера» (§2.3.5). Раньше здесь стояла строка
   'А***в Ф.' — она была правдой ровно для одного гражданина в моке. С
   реестром из нескольких записей константа начала бы врать про имя человека
   у окна, а маска существует именно для того, чтобы про имя не соврать. */
function maskFull(full) {
  const [last = '', first = ''] = String(full || '').split(/\s+/);
  const short = last.length > 2 ? `${last[0]}***${last.slice(-1)}` : last;
  return `${short}${first ? ` ${first[0]}.` : ''}`;
}

/* Значение «бумажного» токена (§4, README «Как читать токены»). data-url —
   отдельный документ, var(--doc-paper) внутри него не разрешится, поэтому
   читаем из :root в момент вызова и подставляем строкой. Фолбэк — именованный
   цвет, а не hex: сырых hex в js/ быть не должно (§11.2, Д-22). */
function docToken(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/* Страница-плейсхолдер для превью скана: SVG в data-url. Настоящее
   изображение сюда придёт от драйвера сканера.

   Серые прямоугольники — это не пять разных серых, а одна краска (--doc-ink)
   с разной прозрачностью: чем плотнее, тем «жирнее» строка на листе. Раньше
   здесь стояли пять сырых hex, подобранных на глаз, и лист жил своей
   палитрой мимо токенов «бумаги». */
function pagePng(n) {
  const paper = docToken('--doc-paper', 'white');
  const ink = docToken('--doc-ink', 'black');

  const bar = (x, y, w, h, o, r = 2) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" `
    + `fill="${ink}" fill-opacity="${o}"/>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 297">
    <rect width="210" height="297" fill="${paper}"/>
    ${bar(14, 16, 80, 8, 0.16)}
    ${bar(14, 34, 182, 4, 0.1)}
    ${bar(14, 44, 182, 4, 0.1)}
    ${bar(14, 54, 120, 4, 0.1)}
    ${bar(140, 16, 56, 70, 0.08, 3)}
    ${bar(14, 80, 110, 4, 0.1)}
    ${bar(14, 90, 150, 4, 0.1)}
    ${bar(14, 120, 182, 4, 0.1)}
    ${bar(14, 130, 182, 4, 0.1)}
    ${bar(14, 140, 90, 4, 0.1)}
    <text x="105" y="270" text-anchor="middle"
          font-size="9" fill="${ink}" fill-opacity="0.32">СТРАНИЦА ${n}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/* Разворот паспорта для превью S2b. Не тот же плейсхолдер, что у документов
   заявления, и это принципиально: оператор кладёт в сканер РАЗВОРОТ 125×88, а
   не лист А4, и первое, что он должен увидеть на экране, — что снялось именно
   то. Отсюда пропорции, окно фотографии и полоса MRZ внизу: по ним разворот
   узнаётся с расстояния, без подписи.

   Страница 2 — регистрация (прописка): те же токены бумаги, но вместо MRZ
   рамки штампов. Именно с неё берётся адрес, и пустая она означает, что
   адресу в форме взяться неоткуда. */
function passportPng(page = 1) {
  const paper = docToken('--doc-paper', 'white');
  const ink = docToken('--doc-ink', 'black');

  const bar = (x, y, w, h, o, r = 1) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" `
    + `fill="${ink}" fill-opacity="${o}"/>`;

  const box = (x, y, w, h, o) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="none" `
    + `stroke="${ink}" stroke-opacity="${o}" stroke-width="0.6"/>`;

  const mrz = (y, text) =>
    `<text x="8" y="${y}" font-size="4.4" letter-spacing="0.5"`
    + ` fill="${ink}" fill-opacity="0.42">${text}</text>`;

  const body = page === 1
    ? [
        box(10, 12, 34, 44, 0.22),                        // окно фотографии
        bar(16, 50, 22, 2, 0.1),
        bar(52, 12, 40, 3.5, 0.16),                       // ТОҶИКИСТОН
        bar(52, 22, 74, 2.6, 0.1), bar(52, 28, 52, 2.6, 0.1),
        bar(52, 36, 62, 2.6, 0.1), bar(52, 42, 40, 2.6, 0.1),
        bar(52, 50, 70, 2.6, 0.1),
        bar(134, 12, 46, 3.5, 0.14),                      // правая страница
        bar(134, 22, 84, 2.6, 0.1), bar(134, 28, 60, 2.6, 0.1),
        bar(134, 36, 76, 2.6, 0.1), bar(134, 42, 48, 2.6, 0.1),
        box(196, 12, 40, 26, 0.18),                       // герб / голограмма
        mrz(72, 'P&lt;TJKNAZARZODA&lt;&lt;GULNORA&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;'),
        mrz(80, 'B45678901&lt;5TJK9611033F3106194&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;06'),
      ]
    : [
        bar(10, 12, 52, 3.2, 0.16),                       // «Қайди суроға»
        box(10, 22, 108, 30, 0.2), bar(16, 30, 78, 2.4, 0.1), bar(16, 36, 62, 2.4, 0.1),
        box(96, 26, 24, 22, 0.28),                        // штамп
        box(130, 22, 108, 30, 0.2), bar(136, 30, 84, 2.4, 0.1), bar(136, 36, 54, 2.4, 0.1),
        box(216, 26, 24, 22, 0.28),
        bar(10, 62, 90, 2.4, 0.08), bar(130, 62, 72, 2.4, 0.08),
      ];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 250 88">
    <rect width="250" height="88" rx="3" fill="${paper}"/>
    <line x1="125" y1="4" x2="125" y2="84" stroke="${ink}" stroke-opacity="0.12" stroke-width="0.5"/>
    ${body.join('')}
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/* Минимальный валидный PDF (§11.3 — «фейковый PDF»). Base-14 Helvetica умеет
   только WinAnsi, поэтому заголовок транслитерируем: настоящий PDF со
   встроенным шрифтом соберёт бэкенд, а прототипу нужен файл, который
   открывается и печатается. */
function buildPdf(title, no) {
  const text = `eKhizmat  ·  ${translit(title)}  ·  No ${no}`;
  const stream = `BT /F1 14 Tf 56 780 Td (${text.replace(/[()\\]/g, '\\$&')}) Tj ET`;

  const objs = [
    '<</Type/Catalog/Pages 2 0 R>>',
    '<</Type/Pages/Kids[3 0 R]/Count 1>>',
    '<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]'
      + '/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>',
    '<</Type/Font/Subtype/Type1/BaseFont/Helvetica/Encoding/WinAnsiEncoding>>',
    `<</Length ${stream.length}>>\nstream\n${stream}\nendstream`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objs.forEach((o, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });

  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`
    + offsets.map(o => `${String(o).padStart(10, '0')} 00000 n \n`).join('')
    + `trailer\n<</Size ${objs.length + 1}/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF`;

  return pdf;
}

const TRANSLIT = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '',
  э: 'e', ю: 'yu', я: 'ya',
};

function translit(s) {
  return [...s].map(ch => {
    const low = ch.toLowerCase();
    const tr = TRANSLIT[low];
    if (tr === undefined) return ch;
    return ch === low ? tr : tr.charAt(0).toUpperCase() + tr.slice(1);
  }).join('');
}
