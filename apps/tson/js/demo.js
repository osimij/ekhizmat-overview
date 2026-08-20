/* ============================================================
   demo.js — демо-панель (§11.5). Клавиша `

   Имитирует то, что в жизни делают гражданин, инфраструктура и время.
   Без неё нельзя ни тестировать, ни показывать стейкхолдерам.

   Панель разложена на три группы, и разложена намеренно:

   1. **Легальные события (§2.2)** — кнопки строятся из store.legalEvents(),
      поэтому панель физически не может предложить переход, которого нет в
      таблице. Это критерий Ф1 («машина состояний гоняется из демо-панели»):
      панель, умеющая нелегальные переходы, проверяла бы не ту машину. Здесь
      машина дёргается «в лоб», без церемоний экрана.

   2. **Гражданин** — то же, но по-человечески: кнопки появляются, только
      когда гражданина реально о чём-то спросили (sim.pending), и отвечают
      экрану, который ждёт. Через эту дверь проходят анимации и тайминги
      §6/S3, которых прямой dispatch не показывает.

   3. **Сбои (§7)** — тумблеры. Каждый тумблер = строка матрицы §7. Случайный
      сбой воспроизвести нельзя, а DoD §13 требует «все состояния матрицы §7
      реализованы и воспроизводимы из демо-панели».

   Здесь же — аудит приватности (§13): показываем storage/URL/DOM, чтобы
   гарантию можно было продемонстрировать, а не обещать.
   ============================================================ */
import { h, mount, icon } from './ui.js';
import { dispatch, getState, legalEvents, __reset, ST } from './store.js';
import { resetRole } from './role.js';
import { audit } from './storage.js';
import { clock } from './clock.js';
import { sim, consent } from './mock/api.js';
import { CITIZENS, BASE_SCOPES, SCOPES, citizenSlice, REGISTRY } from './mock/data.js';

const HUMAN = {
  MFA_OK: 'MFA пройдена', BIND_OK: 'Привязка ок', START: 'Начать приём',
  ID_SENT: 'Идентифицирован (push)', GRANTED: 'Согласие: подтвердить',
  DENIED: 'Согласие: отклонить', TIMEOUT: 'Согласие: таймаут',
  RETRY: 'Отправить повторно', CANCEL: 'Отмена',
  END_CONFIRMED: 'Завершить приём', TTL_0: 'TTL = 0', REVOKED: 'Отозвать согласие',
  LOCK: 'Заблокировать', UNLOCK: 'Разблокировать', GOTO: 'Шаг…',
  NOT_REGISTERED: 'Гражданина нет в eKhizmat', ENROLLED: 'Регистрация завершена',
};

/* Полезная нагрузка для событий, которым она нужна. Демо-панель обязана
   отдавать те же данные, что и настоящий бэкенд, иначе экраны за ней
   разъедутся с реальностью. */
const PAYLOAD = {
  ID_SENT: () => ({ method: 'push', maskedName: 'А***в Ф.', scopes: BASE_SCOPES }),
  MFA_OK:  () => ({ operator: { login: 'operator.sino04', name: 'Фируза' } }),
  BIND_OK: () => ({ bind: { tson: 'sino', tsonName: 'район Сино', window: 4 } }),

  // Прямой GRANTED минует S3 — а значит, и consent.commit(), которым S3
  // открывает доступ на «сервере». Без этого citizen.get() отдавал бы 403 на
  // всё, и путь «дёрнул машину руками» вёл бы в сломанную сессию. Панель,
  // играющая за машину, обязана привести за собой и сервер.
  GRANTED: () => {
    consent.commit(BASE_SCOPES);
    // Срез по выданным скоупам, как и у настоящего ответа (Д-02): панель,
    // кладущая в память больше сервера, проверяла бы не ту гарантию.
    return { citizen: citizenSlice(BASE_SCOPES), scopes: BASE_SCOPES };
  },

  // Незарегистрированный номер — вымышленный и заведомо не из реестра (§10).
  NOT_REGISTERED: () => ({ phone: '905550001' }),

  // Прыжок через весь S2b: панель проверяет МАШИНУ (§2.2), а не экран, и
  // прогонять регистрацию сканером ради перехода ENROLL→SESSION значило бы
  // проверять сканер. Реальная запись в реестр происходит только на экране —
  // здесь в память ложится тот же мок-гражданин, что и на GRANTED, а согласие
  // помечается путём «личная явка», чтобы §6/S9a не соврал в поповере.
  ENROLLED: () => {
    consent.commit(BASE_SCOPES, 'enrollment');
    return { citizen: citizenSlice(BASE_SCOPES), scopes: BASE_SCOPES, maskedName: 'А***в Ф.' };
  },
};

const FAULTS = [
  { id: 'network',  name: 'Сеть пропала' },
  { id: 'registry', name: 'Реестр недоступен' },
  { id: 'scanner',  name: 'Сканер недоступен' },
  { id: 'printer',  name: 'Принтер не печатает' },
  { id: 'blurry',   name: 'Скан размыт' },
  { id: 'ocr',      name: 'OCR не распознал' },
  // Методы входа §6/S2: push можно не доставить, лицо — не распознать. Оба
  // тумблера открывают запасной путь (SMS), который экран показывает сам.
  { id: 'push',     name: 'Push не доставлен' },
  { id: 'face',     name: 'Лицо не распознано' },
];

/* Состояния управленческой панели, которые нельзя получить из фикстуры:
   очередь выше нормы, пустой период, загрузка и отказ обновления. */
const DASH_SCENARIOS = [
  ['normal',  'Обычный'],
  ['high',    'Высокая очередь'],
  ['empty',   'Пустой период'],
  ['loading', 'Загрузка'],
  ['error',   'Ошибка'],
];
let dashScenario = 'normal';

export function initDemo() {
  const panel = h('aside', {
    class: 'demo', hidden: true,
    'aria-label': 'Демо-панель', role: 'region',
  });
  document.body.append(panel);

  addEventListener('keydown', e => {
    if (e.key !== '`') return;

    // Глушим ` только там, где обратный апостроф реально может быть нужен:
    // пароль и свободный текст. Ловушка: на S0 автофокус стоит в поле логина,
    // и запрет «во время любого ввода» сделал бы панель недостижимой с экрана
    // входа — а демо-сценарий §13 начинается именно оттуда («вход → приём →
    // …»), и §11.5 требует, чтобы панель работала. В логинах (operator.sino04),
    // ИНН и телефонах обратного апострофа не бывает.
    const el = document.activeElement;
    const protects = el?.tagName === 'TEXTAREA' || el?.type === 'password';
    if (protects) return;

    e.preventDefault();
    panel.hidden = !panel.hidden;
    if (!panel.hidden) draw();
  });

  // Панель открыта — держим её в согласии с машиной.
  //
  // Через микротаск, а не сразу: подписчики store вызываются по очереди, и
  // роутер (который приводит URL в соответствие состоянию) может быть в этой
  // очереди ПОЗЖЕ панели. Прочитав location.hash синхронно, панель показывала
  // бы URL предыдущего состояния — то есть врала бы в строке «ПД в URL».
  // Аудит, который врёт, хуже отсутствующего. Микротаск выполняется после
  // всех синхронных подписчиков, поэтому от их порядка мы больше не зависим.
  const redraw = () => { if (!panel.hidden) queueMicrotask(draw); };
  addEventListener('hashchange', redraw);
  sim.onChange(redraw);          // появилось/ушло ожидание гражданина

  return { panel, redraw };

  function draw() {
    const st = getState();
    const a = audit();
    const leak = domLeak(st);      // один проход по innerText, а не два

    mount(panel,
      h('header', { class: 'demo__head' },
        icon('gear', { size: 20 }),
        h('strong', {}, 'Демо-панель'),
        h('span', { class: 'spacer' }),
        h('button', {
          class: 'btn btn--ghost btn--icon btn--s', 'aria-label': 'Закрыть',
          onClick: () => { panel.hidden = true; },
        }, icon('x', { size: 20 }))),

      h('div', { class: 'demo__row' },
        h('span', { class: 'label' }, 'Состояние'),
        h('span', { class: 'pill pill--active' }, st.app),
        st.step ? h('span', { class: 'pill pill--draft' }, st.step) : null),

      ...citizenSection(),

      h('span', { class: 'label' }, 'Легальные события (§2.2)'),
      h('div', { class: 'demo__grid' },
        ...legalEvents().map(ev => h('button', {
          class: 'btn btn--secondary btn--s',
          onClick: () => { dispatch(ev, PAYLOAD[ev]?.() ?? {}); draw(); },
        }, HUMAN[ev] || ev))),

      h('span', { class: 'label' }, 'Сбои (§7)'),
      h('div', { class: 'demo__grid' },
        ...FAULTS.map(f => h('button', {
          class: `btn btn--${sim.faults[f.id] ? 'danger' : 'secondary'} btn--s`,
          'aria-pressed': String(!!sim.faults[f.id]),
          onClick: () => { sim.setFault(f.id, !sim.faults[f.id]); draw(); },
        }, f.name))),

      h('span', { class: 'label' }, 'Таймеры'),
      h('div', { class: 'demo__grid' },
        ...[1, 10, 60].map(x => h('button', {
          class: `btn btn--${clock.speed === x ? 'primary' : 'secondary'} btn--s`,
          onClick: () => { clock.speed = x; draw(); },
        }, `×${x}`))),

      /* Сценарии управленческой панели. Раньше это был выпадающий список
         «Сценарий» в шапке самого дашборда, рядом с настоящим фильтром
         периода: рабочий экран предлагал руководителю выбрать «Ошибку» или
         «Загрузку». Симулируемые состояния живут там же, где остальная
         симуляция, и остаются достижимыми для QA (§11.5). */
      h('span', { class: 'label' }, 'Дашборд (§11.5)'),
      h('div', { class: 'demo__grid' },
        ...DASH_SCENARIOS.map(([id, name]) => h('button', {
          class: `btn btn--${dashScenario === id ? 'primary' : 'secondary'} btn--s`,
          'aria-pressed': String(dashScenario === id),
          onClick: () => {
            dashScenario = id;
            window.dispatchEvent(new CustomEvent('tson:dash-scenario', { detail: id }));
            draw();
          },
        }, name))),

      h('span', { class: 'label' }, 'Приватность (§2.3 · DoD §13)'),
      h('div', { class: 'demo__audit' },
        check('Данные гражданина в памяти', st.session ? 'да — сессия активна' : 'нет',
              st.app === ST.SESSION ? !!st.session : !st.session),
        check('Выдано скоупов «сервером»', String(consent.granted().length),
              st.app === ST.SESSION || consent.granted().length === 0),
        check('Скоупы в памяти = выданные', scopesInMemory(st), memoryMatchesGrant(st)),
        check('Чужие ключи в localStorage', a.foreign.length ? a.foreign.join(', ') : 'нет', a.ok),
        check('sessionStorage', a.sessionForeign.length ? a.sessionForeign.join(', ')
              : (a.sessionStorageKeys ? 'рабочее место' : 'пусто'),
              a.sessionForeign.length === 0),
        check('Cookies', a.cookies.length ? a.cookies.join(', ') : 'нет', a.cookies.length === 0),
        check('ПД в URL', location.hash || '#/', !/[Ѐ-ӿ]|\d{6,}/.test(decodeURIComponent(location.hash))),
        check('ФИО в DOM вне сессии', leak ?? 'нет', st.app === ST.SESSION || !leak)),

      h('div', { class: 'demo__grid' },
        h('button', {
          class: 'btn btn--danger btn--s',
          onClick: () => { REGISTRY.reset(); resetRole(); __reset(); location.hash = '#/login'; draw(); },
        }, 'Сбросить всё')));
  }

  /* Кнопки за гражданина — только когда его о чём-то спросили. Пустая группа
     здесь честнее полной: «подтвердить согласие», когда никто ничего не
     запрашивал, — это не действие гражданина, а фальшивое событие. */
  function citizenSection() {
    const p = sim.pending;
    const rows = [];

    if (p.identify) {
      // Подписываем кнопку тем, что гражданин делает НА САМОМ ДЕЛЕ: открыл push
      // в приложении или посмотрел в камеру. Один ярлык на оба метода врал бы
      // про действие, которого не было.
      const label = { push: 'Подтвердил в приложении', face: 'Лицо распознано' }[p.identify.method]
        || 'Идентифицирован';
      rows.push(btn(label, () => sim.identified()));
    }
    if (p.consent) {
      rows.push(
        btn('Подтвердить согласие', () => sim.consentGranted(), 'primary'),
        btn('Отклонить', () => sim.consentDenied(), 'danger'),
        btn('Не отвечать (таймаут)', () => sim.consentTimeout()));
    }
    if (p.scope) {
      const name = SCOPES[p.scope.scope]?.tab || p.scope.scope;
      rows.push(
        btn(`Выдать «${name}»`, () => sim.scopeGranted(), 'primary'),
        btn('Отклонить доступ', () => sim.scopeDenied(), 'danger'));
    }

    return [
      h('span', { class: 'label' }, 'Гражданин (приложение)'),
      rows.length
        ? h('div', { class: 'demo__grid' }, ...rows)
        : h('p', { class: 'small ink-faint' }, 'Гражданина ни о чём не спрашивают'),
    ];
  }

  function btn(text, onClick, kind = 'secondary') {
    return h('button', {
      class: `btn btn--${kind} btn--s`,
      onClick: () => { onClick(); draw(); },
    }, text);
  }
}

function check(name, value, ok) {
  return h('div', { class: 'demo__check' },
    icon(ok ? 'check' : 'info', { size: 16, cls: ok ? 'green-ink' : 'red-ink' }),
    h('span', { class: 'grow' }, name),
    h('span', { class: 'small ink-faint' }, String(value)));
}

/* Приёмка Д-02: «в session.citizen нет ключей вне выданных скоупов ни в один
   момент сессии». Проверяем буквально — сверяем ключи объекта в памяти со
   списком выданного. Ключи citizen — ровно id скоупов (см. citizenSlice), так
   что сравнение честное, а не «на глаз».

   Показываем обе стороны: лишнее в памяти — утечка (то, чего гражданин не
   выдавал), недостающее — память, отставшая от согласия. Красным горит и то,
   и другое: аудит, который врёт в удобную сторону, хуже отсутствующего. */
function memScopes(st) {
  return Object.keys(st.session?.citizen || {}).filter(k => SCOPES[k]);
}

function scopesInMemory(st) {
  if (!st.session) return 'нет сессии';
  const mem = memScopes(st);
  const granted = st.session.scopes || [];
  const extra = mem.filter(k => !granted.includes(k));
  if (extra.length) return `лишнее: ${extra.join(', ')}`;
  const missing = granted.filter(k => !mem.includes(k));
  if (missing.length) return `не догружено: ${missing.join(', ')}`;
  return `${mem.length} = ${granted.length}`;
}

function memoryMatchesGrant(st) {
  if (!st.session) return true;
  const mem = memScopes(st);
  const granted = st.session.scopes || [];
  return mem.length === granted.length && mem.every(k => granted.includes(k));
}

/* Приёмка §6/S1: «grep DOM на этом экране не находит ни одного поля
   гражданина». Проверяем буквально — ищем ФИО мок-гражданина в тексте
   страницы. Вне сессии его быть не должно нигде, включая отсоединённые узлы,
   которые мог оставить неаккуратный рендер. */
function domLeak(st) {
  const text = document.body.innerText || '';
  const flat = text.replace(/\s/g, '');
  const hits = [];

  // По ВСЕМ гражданам реестра, а не только по первому: с §6/S2b реестр
  // пополняется прямо во время демонстрации, и проверка, знающая одно имя,
  // объявляла бы чистым DOM, в котором осталось имя только что
  // зарегистрированного человека. Аудит, проверяющий не всё, — это аудит,
  // который врёт про остальное.
  for (const c of CITIZENS) {
    const last = c.profile?.full?.split(' ')[0];
    if (last && text.includes(last) && !hits.includes('ФИО')) hits.push('ФИО');
    if (c.profile?.inn && flat.includes(c.profile.inn) && !hits.includes('ИНН')) hits.push('ИНН');
  }

  // null, а не 'нет': строка «нет» правдива на экране, но лжива в условии —
  // любая непустая строка истинна, и `!domLeak(st)` давал false ВСЕГДА.
  // Строка «ФИО в DOM вне сессии» горела красным даже на чистом DOM, то есть
  // ровно там, где она единственно и нужна: на пустом idle после wipe. Аудит,
  // который врёт в пессимистичную сторону, тоже врёт — и демонстрация §2.3
  // заканчивалась красным пунктом вместо зелёного.
  return hits.length ? hits.join(', ') : null;
}
