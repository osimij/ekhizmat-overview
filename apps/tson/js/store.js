/* ============================================================
   store.js — состояние + pub/sub + машина состояний (§2.2).

   Два правила, из которых растёт всё остальное:

   1. Переходы — ТОЛЬКО через dispatch() по таблице TRANSITIONS.
      «Левые» переходы мимо машины запрещены (§11.2). Нелегальный переход —
      это ошибка программиста, поэтому он громко падает, а не тихо игнорируется.

   2. Данные гражданина живут только здесь, только в памяти, и только пока
      app === 'SESSION' (§2.3). Любой уход из сессии проходит через wipe().
   ============================================================ */

/* ---------- состояния (§2.2) ---------- */
export const ST = {
  AUTH:         'AUTH',          // S0 вход
  SETUP:        'SETUP',         // S0b привязка к ЦОН/окну
  IDLE:         'IDLE',          // S1 главная смены
  IDENTIFY:     'IDENTIFY',      // S2 идентификация
  ENROLL:       'ENROLL',        // S2b регистрация нового гражданина
  CONSENT_WAIT: 'CONSENT_WAIT',  // S3 ожидание согласия
  SESSION:      'SESSION',       // S4–S8
  LOCKED:       'LOCKED',        // блокировка
};

/* Подсостояния сессии (§2.2 «Решение»): линейный маршрут + параллельный data. */
export const STEP = {
  CATALOG: 'catalog', SERVICE: 'service', FORM: 'form',
  DOCS: 'docs', RESULT: 'result', DATA: 'data',
};

/* ---------- таблица переходов ----------
   Единственный источник правды о том, что законно. Читается как §2.2:

     AUTH ──MFA_OK──► SETUP ──BIND_OK──► IDLE ──START(F2)──► IDENTIFY
                                          ▲                      │
                                          │        NOT_REGISTERED │ ID_SENT
                                          │            ┌──────────┴───┐
                                          │            ▼              ▼
                                          │         ENROLL      CONSENT_WAIT
                                          │            │   DENIED/TIMEOUT ◄┤
                                          │            │              │ GRANTED
                                          │   ENROLLED └──────┐       ▼
                  END_CONFIRMED / TTL_0   │                   └► SESSION
                                          └────────────────────────

   Нюанс, которого нет на схеме, но который требует §6/S3: DENIED и TIMEOUT
   НЕ выкидывают сразу в IDLE. Они оставляют оператора на S3 с красным/янтарным
   состоянием и выбором «Попробовать снова / Сменить метод / Завершить».
   В IDLE уводит уже явная CANCEL. Схема §2.2 рисует итог этого пути, а не
   мгновенный переход — иначе оператор терял бы экран под рукой в момент отказа. */
const TRANSITIONS = {
  [ST.AUTH]:         { MFA_OK: ST.SETUP },
  [ST.SETUP]:        { BIND_OK: ST.IDLE },
  [ST.IDLE]:         { START: ST.IDENTIFY },
  [ST.IDENTIFY]:     { ID_SENT: ST.CONSENT_WAIT, NOT_REGISTERED: ST.ENROLL, CANCEL: ST.IDLE },

  /* S2b — гражданина нет в eKhizmat (§6/S2b). Ветка идёт мимо CONSENT_WAIT, и
     это не срезанный угол, а разница в том, ЧТО подтверждается.

     На S3 гражданин подтверждает телефоном доступ к данным, которые уже лежат
     в реестре и которых оператор не видел. При регистрации данных в реестре
     ещё нет: они снимаются с паспорта здесь и сейчас, у оператора в руках, и
     гражданин видит их на своей стороне стола. Подтверждать телефоном доступ
     к тому, что он только что продиктовал сам, — обряд; приложения у него к
     тому же ещё нет (иначе он был бы зарегистрирован).

     Поэтому ENROLLED ведёт прямо в SESSION, а согласие фиксируется на
     «сервере» с пометкой о пути получения (api.js, consent.commit(via)) —
     чтобы §6/S9a показывал «личная явка», а не «подтверждено в приложении». */
  [ST.ENROLL]:       { ENROLLED: ST.SESSION, CANCEL: ST.IDLE },
  [ST.CONSENT_WAIT]: {
    GRANTED: ST.SESSION,
    DENIED:  ST.CONSENT_WAIT,   // остаёмся на S3, меняется только consent.status
    TIMEOUT: ST.CONSENT_WAIT,   // то же — §6/S3 «amber: Отправить повторно»
    RETRY:   ST.CONSENT_WAIT,
    CANCEL:  ST.IDLE,
  },
  [ST.SESSION]: {
    END_CONFIRMED: ST.IDLE,
    TTL_0:         ST.IDLE,
    REVOKED:       ST.IDLE,     // отзыв согласия гражданином (§7)
    GOTO:          ST.SESSION,  // шаг внутри сессии
  },
  [ST.LOCKED]: {
    UNLOCK: '@restore',   // возврат туда, откуда заблокировались

    /* Под замком сессия гражданина продолжает тикать (§6/S9c) — значит, под
       замком она может и кончиться. Оператор ушёл, заблокировав рабочее
       место; через полчаса истёк TTL, или гражданин отозвал согласие со
       своего телефона (§7 — «в любой момент»).

       Оба события ведут в LOCKED, а не в IDLE, и это не описка: замок
       снимается только re-auth'ом (§6/S9c). Уводить машину в IDLE значило бы
       разблокировать пустое рабочее место без пароля — то есть чинить утечку
       данных дырой в доступе. Данные при этом стираются (см. WIPES), а
       lockedFrom переписывается на IDLE: оператор вернётся, введёт пароль и
       попадёт на пустую главную, а не в сессию, которой больше нет. */
    TTL_0:   ST.LOCKED,
    REVOKED: ST.LOCKED,
  },
};

/* LOCK доступен из любого состояния (§2.2 «LOCKED ⇄ (из любого места)»),
   поэтому он вне таблицы — иначе пришлось бы дублировать его в каждой строке. */
const GLOBAL = { LOCK: ST.LOCKED };

/* §2.3.3 — «wipe при завершении/TTL/отзыве». Правило по СОБЫТИЮ, а не по
   тому, из какого состояния в какое идёт машина.

   Раньше здесь стоял список состояний, «несущих данные» (только SESSION), и
   стирали на выходе из него. Это ломалось ровно там, где §6/S9c разрешает
   сессии жить дальше: TTL, истёкший под замком, шёл LOCKED → LOCKED, из
   набора не выходил, и данные гражданина оставались в памяти запертого
   рабочего места. Событие же говорит само за себя: «приём завершён»,
   «время вышло», «согласие отозвано», «отмена» — после любого из них данных
   в памяти быть не должно, куда бы ни пришла машина. */
const WIPES = new Set(['END_CONFIRMED', 'TTL_0', 'REVOKED', 'CANCEL']);

/* ---------- начальное состояние ----------
   Приёмка S0: «рефреш страницы возвращает на S0». Поэтому никакого
   восстановления авторизации из storage — только AUTH. */
function initial() {
  return {
    app: ST.AUTH,
    step: null,
    lockedFrom: null,

    operator: null,          // {name, login} — появляется после MFA_OK
    bind: null,              // {tson, window} — появляется после BIND_OK

    identify: null,          // {method, maskedName} — маска, НЕ данные гражданина
    consent: null,           // {status, scopes, requestedAt}
    session: null,           // ЕДИНСТВЕННОЕ место данных гражданина (§2.3.1)

    shift: { served: 0, avgMs: 0, issued: 0, recent: [] },  // статистика смены, без ПД
    ui: { toasts: [], modal: null, demo: false },
  };
}

let state = initial();
const subscribers = new Set();

/* ---------- pub/sub ---------- */
export function subscribe(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

function notify(event) {
  for (const fn of subscribers) fn(state, event);
}

export function getState() { return state; }

/* ---------- wipe (§2.3.3) ----------
   Обнуляет объект, отзывает все URL.createObjectURL сканов, вычищает
   DOM-контейнер сессии. Вызывается на КАЖДОМ выходе из состояния с данными.

   Список blob-URL держим здесь, а не в screens: экран может не успеть
   размонтироваться (TTL, отзыв согласия), а отозвать URL всё равно обязаны —
   иначе скан переживёт сессию в памяти вкладки. */
const blobUrls = new Set();

export function trackBlobUrl(url) {
  blobUrls.add(url);
  return url;
}

export function wipe() {
  for (const url of blobUrls) URL.revokeObjectURL(url);
  blobUrls.clear();

  state.session = null;
  state.identify = null;
  state.consent = null;

  // DOM-контейнер сессии — чтобы данные не остались в отсоединённых узлах.
  const host = document.getElementById('session-root');
  if (host) host.replaceChildren();
}

/* ---------- запись данных внутри сессии ----------
   Это НЕ переход. app остаётся SESSION, стрелки §2.2 не двигаются — двигаются
   данные: выбранная услуга, выданный доп. скоуп, черновик, сканы, номер
   заявления.

   Почему не через dispatch(). Таблица §2.2 не знает событий «черновик
   сохранён» или «скан добавлен», и добавить их туда значило бы соврать про
   машину: `legalEvents()` (по нему демо-панель строит кнопки — единственная
   причина, по которой она физически не умеет нелегальных переходов) начал бы
   предлагать «сохранить черновик» как переход состояния. Данные и состояния —
   разные вещи, и смешивать их в одной таблице дороже, чем развести.

   Гарантия §2.3.1 при этом не ослабевает, а усиливается: писать в session
   можно ТОЛЬКО из SESSION. Попытка положить данные гражданина в память вне
   сессии — это ровно тот баг, от которого защищает §2.3, поэтому она падает. */
export function patchSession(patch) {
  if (state.app !== ST.SESSION || !state.session) {
    throw new Error('store: запись данных гражданина вне сессии (§2.3.1)');
  }
  state.session = { ...state.session, ...patch };
  notify('SESSION_PATCH');
  return state.session;
}

/* ---------- dispatch ---------- */
export function dispatch(event, payload = {}) {
  const from = state.app;

  /* LOCK глобален (§2.2), но из LOCKED он бессмыслен: рабочее место уже
     заперто. И не просто бессмыслен — вреден: reduce переписал бы
     lockedFrom = LOCKED и потерял точку возврата, а с ней и сессию. После
     двойного LOCK первый UNLOCK возвращал в LOCKED, второй — в IDLE, и АРМ
     оказывался разблокированным на пустой главной с данными гражданина в
     памяти и выданными скоупами на «сервере» — ровно то, чего §2.3 обещает
     не допускать (Д-04). Поэтому no-op, а не переход. */
  if (event === 'LOCK' && from === ST.LOCKED) return state;

  const table = TRANSITIONS[from] || {};
  let to = GLOBAL[event] ?? table[event];

  if (to === undefined) {
    // Нелегальный переход = баг. Падаем громко: тихий no-op здесь означал бы
    // экран, застрявший в состоянии, которого нет на схеме §2.2.
    throw new Error(`store: недопустимый переход ${from} --${event}--> (нет в §2.2)`);
  }

  if (to === '@restore') {
    to = state.lockedFrom || ST.IDLE;
    state.lockedFrom = null;
  }

  if (WIPES.has(event)) wipe();

  reduce(event, payload, from, to);
  state.app = to;
  notify(event);
  return state;
}

/* ---------- редьюсер ----------
   Меняет данные вокруг перехода. Сам переход уже вычислен по таблице. */
function reduce(event, p, from, to) {
  switch (event) {
    case 'MFA_OK':
      state.operator = p.operator;
      break;

    case 'BIND_OK':
      state.bind = p.bind;
      break;

    case 'LOCK':
      // Сессия гражданина продолжает тикать (§6/S9c) — поэтому НЕ wipe.
      // Экран закрыт, данные в памяти. Разблокировка = re-auth.
      state.lockedFrom = from;
      break;

    case 'START':
      // Стартовый метод — push (уведомление в приложение): им идентифицируют
      // возвращающегося гражданина по умолчанию (§6/S2). Face ID и SMS —
      // соседние вкладки; экран переключает метод сам, это лишь начальное.
      state.identify = { method: 'push', maskedName: null };
      break;

    case 'ID_SENT':
      // Только маскированный отклик (§2.2, таблица «Данные гражданина в памяти»).
      state.identify = { ...state.identify, ...p, maskedName: p.maskedName ?? null };
      state.consent = { status: 'waiting', scopes: p.scopes || [], requestedAt: Date.now() };
      break;

    case 'DENIED':  state.consent = { ...state.consent, status: 'denied' }; break;
    case 'TIMEOUT': state.consent = { ...state.consent, status: 'timeout' }; break;
    case 'RETRY':   state.consent = { ...state.consent, status: 'waiting', requestedAt: Date.now() }; break;

    case 'NOT_REGISTERED':
      // Телефон подтверждён кодом, гражданина в eKhizmat нет (§6/S2b).
      // В памяти по-прежнему нет ничего о человеке, кроме номера, который
      // оператор и так набрал руками: паспорт ещё не в сканере.
      state.identify = { ...state.identify, method: 'otp', registered: false, phone: p.phone };
      state.consent = null;
      break;

    case 'GRANTED':
    case 'ENROLLED':
      // Здесь и только здесь появляется объект citizen (§2.3.1). Два события —
      // одна запись: путь к согласию разный (приложение против личной явки с
      // паспортом), но объём данных и правила их жизни одинаковые, и разводить
      // это на две ветки значило бы завести второе место, где заводится
      // сессия, — то есть второе место, где можно ошибиться с приватностью.
      state.consent = {
        ...state.consent,
        status: 'granted',
        scopes: p.scopes || [],
        via: event === 'ENROLLED' ? 'enrollment' : 'app',
      };
      state.session = {
        citizen: p.citizen,
        scopes: p.scopes || [],
        startedAt: Date.now(),
        service: null,      // выбранная услуга (S4)
        draft: null,        // черновик формы (S6)
        docs: {},           // сканы по пунктам чеклиста (S7)
        application: null,  // принятое заявление (S8)
        // §6/S2b — S4 показывает «гражданин зарегистрирован» одним банером и
        // ровно один раз; флаг гасится самим экраном после показа.
        enrolled: event === 'ENROLLED' ? { at: Date.now(), maskedName: p.maskedName } : null,
      };
      state.step = STEP.CATALOG;
      break;

    case 'GOTO':
      state.step = p.step;
      break;

    case 'END_CONFIRMED':
    case 'TTL_0':
    case 'REVOKED':
      // wipe() уже отработал в dispatch до reduce.
      state.step = null;
      state.shift = { ...state.shift, served: state.shift.served + (event === 'END_CONFIRMED' ? 1 : 0) };

      // Приём кончился, пока рабочее место заперто. Замок не снимаем (см.
      // TRANSITIONS[LOCKED]), но точку возврата переписываем: lockedFrom всё
      // ещё указывает на SESSION, и без этой строки оператор, введя пароль,
      // попадал бы в сессию, от которой остался один шелл — app=SESSION при
      // session=null. Роутер считает такой роут легальным (состояние-то
      // SESSION) и честно рисует каталог без гражданина.
      if (from === ST.LOCKED) state.lockedFrom = ST.IDLE;
      break;

    case 'CANCEL':
      state.identify = null;
      state.consent = null;
      state.step = null;
      break;
  }
}

/* ---------- тест-хук ----------
   Демо-панель (§11.5) и проверки приватности должны уметь вернуть АРМ
   в исходное состояние, не перезагружая страницу. */
export function __reset() {
  wipe();
  state = initial();
  notify('RESET');
}

/* Разрешённые переходы из текущего состояния — демо-панель рисует по ним
   кнопки, поэтому она физически не может предложить нелегальный переход.

   Из LOCKED прячем LOCK: он теперь no-op (см. dispatch), а кнопка, которая
   ничего не делает, — это та же ложь, что и кнопка без обработчика. */
export function legalEvents() {
  const global = state.app === ST.LOCKED ? [] : Object.keys(GLOBAL);
  return [...Object.keys(TRANSITIONS[state.app] || {}), ...global];
}
