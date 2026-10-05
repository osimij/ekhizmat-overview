/* ============================================================
   S2b · Регистрация гражданина · #/enroll  (§6/S2b)

   Гражданин впервые пришёл в ЦОН: поиск на S2 не нашёл его профиля.
   Регистрация — три шага, и порядок у них не случайный:

     1. Телефон — код по SMS. Профиль привязывается к номеру, и номер должен
        быть в руках у того, кто стоит у окна. Если искали по телефону, он уже
        в поле: набирать его второй раз незачем.
     2. Паспорт — скан, поля заполняются сами, оператор правит расхождения.
     3. Лицо — сверка 1:1 с фото в паспорте. Последней, потому что сравнивать
        не с чем, пока разворот с фото не снят. Это проверка, что паспорт принёс
        его владелец, а не «снимок на память»: поэтому шаг обязателен, а запись
        в реестр создаётся одна, после него. Брошенная на середине регистрация
        не оставляет в реестре ничего.

   Шаги показывает степпер над экраном (§3 «Sequential wizard»): телефон и лицо
   — карточки ворот, паспорт — мастерская сверки во всю ширину.

   Правило шага «паспорт»: скан слева, поля справа, и они не расстаются. Оператор
   правит не «форму», а РАСХОЖДЕНИЕ между распознанным значением и тем, что
   написано в документе, — а сравнивать можно только то, что видно
   одновременно. Отсюда и раскладка (design-guide §5, «full-workspace
   editor»): экран заперт по высоте вьюпорта, скан не уезжает вообще, свой
   скролл есть только у колонки полей. Отсюда же фокус: щёлкнув по полю
   «Адрес», оператор получает разворот с пропиской, а не листает сканы руками.

   Три вещи, которые экран держит на себе намеренно:

   1. **Паспортные данные не попадают в store.** До ENROLLED сессии ещё нет, а
      §2.3.1 разрешает данные гражданина только в ней — patchSession() вне
      SESSION честно падает. Значит, единственное место, где живёт заполненный
      паспорт, — замыкание этого экрана и его же DOM. Размонтировался — нет
      данных, и это гарантия конструкции, а не дисциплины.

   2. **Помечено только то, что требует глаз.** Раньше доверие подписывалось на
      каждом поле («сверено по MRZ» ×5, «распознано», «проверьте» ×3) плюс
      кнопка «изменить» на каждом закрытом. Когда помечено всё, не помечено
      ничто: три сомнительных поля тонули среди семи спокойных, а замок стоял
      ровно на том действии, ради которого экран и существует. Теперь поля
      открыты все, а пометку несут только те, что просят проверки, — остальное
      говорит сводкой в банере (design-guide §10.3, §10.6).

   3. **Скан не переживает регистрацию.** Разворот уходит в реестр вместе с
      записью и стирается с рабочего места сразу после ответа сервера: держать
      копию паспорта в памяти вкладки после того, как она больше не нужна, —
      ровно та утечка, от которой §2.3 обещает избавить.
   ============================================================ */
import { h, mount, icon, toast, modal, confirmDanger, facescanFrame } from '../ui.js';
import { t, errText, bindTsonName } from '../i18n.js';
import { getState, dispatch, trackBlobUrl } from '../store.js';
import { enroll, identify, docs as fileApi, sim } from '../mock/api.js';
import { field, selectField, maskedField, otpInput, setLoading, resendCooldown } from '../fields.js';
import { isExpired } from '../format.js';
import {
  PASSPORT_FIELDS, PASSPORT_GROUPS, PASSPORT_PAGES, OCR_TRUST, BASE_SCOPES, SCOPES,
} from '../mock/data.js';

const STEPS = ['phone', 'passport', 'face'];

export function renderEnroll(host) {
  let dead = false;
  let step = 'phone';
  let stopStep = () => {};   // таймеры и ожидания текущего шага
  /* Итог третьего шага: { matched } — камера подтвердила совпадение,
     { manual } — оператор сверил лицо глазами после отказов камеры. Пока null,
     регистрировать нельзя: шаг обязателен. */
  let face = null;
  let faceFails = 0;
  let registerBtn = null;   // кнопка шага «лицо»: на ней крутится отправка
  let scans = [];        // снимки разворотов: [{id, page, url, blurry, rot}]
  // Выбран РАЗВОРОТ, а не индекс снимка: страница существует и до того, как её
  // сняли, и «выбрана вторая страница, её ещё нет» — обычное состояние экрана,
  // а не дырка в данных.
  let active = PASSPORT_PAGES[0].page;
  let read = false;      // распознавание уже отработало (успешно или нет)

  /* Чем кончилось распознавание: число полей под проверку, 'ocr' (не
     распознал), 'manual' (ручной ввод) или null.

     Хранится, а не передаётся в drawBanner() параметром, и это не стилистика.
     Банер перерисовывается ещё и по sim.onChange (тумблеры §7 переключают на
     ходу), и тогда аргумента нет — а с ним пропадала бы и строка «полей под
     проверку: 4». Оператор выключает тумблер сбоя, ничего больше не делая, и
     единственная подсказка о том, что четыре поля надо сверить с паспортом,
     молча исчезает с экрана. */
  let outcome = null;

  const F = new Map();   // id поля → { spec, api }
  const st = getState();
  // Номер из поиска (если искали по телефону). До первого шага — не
  // подтверждён: подтверждает его код, и только после кода он становится
  // номером, который уйдёт в реестр.
  let phone = st.identify?.phone || '';

  // Сводка о распознавании — живая область: счётчик полей под проверку убывает
  // по мере работы, и скринридер обязан услышать это изменение (§9).
  const banner = h('div', { class: 's-enroll__banner', 'aria-live': 'polite' });
  const pages = h('div', { class: 's-enroll__pages' });
  const stage = h('div', { class: 's-enroll__stage' });
  const groups = h('div', { class: 'stack g-8' });

  // Две кнопки съёмки, а не одна переодевающаяся: пока разворота нет, съёмка —
  // главное действие панели и живёт в пустом состоянии; когда разворот есть,
  // главное действие экрана уже другое («Зарегистрировать»), и пересъёмка
  // обязана стать тихой (§3, «одно главное действие на регион»).
  const scanBtn = h('button', {
    class: 'btn btn--primary', type: 'button', onClick: () => shoot(active),
  }, icon('card', { size: 20 }), t('enroll.scan'));

  // Иконки в панели значат по одной вещи: card — «снять разворот», refresh —
  // «повернуть». Пока пересъёмка тоже была refresh, в одном ряду стояли две
  // одинаковые стрелки с разным смыслом.
  const rescanBtn = h('button', {
    class: 'btn btn--secondary btn--s', type: 'button', onClick: () => shoot(active),
  }, icon('card', { size: 20 }), t('enroll.rescan'));

  const fileInput = h('input', {
    type: 'file', class: 'sr-only', accept: 'application/pdf,image/jpeg,image/png',
    onChange: e => upload(e.target.files[0]),
  });

  const uploadBtn = h('button', { class: 'btn btn--ghost btn--s', type: 'button', onClick: () => fileInput.click() },
    icon('upload', { size: 20 }), t('enroll.upload'));

  const manualBtn = h('button', { class: 'btn btn--ghost btn--s', type: 'button', onClick: () => openFields('manual') },
    icon('edit', { size: 20 }), t('enroll.manual'));

  // «Далее», а не «Зарегистрировать»: после паспорта остаётся сверка лица, и
  // кнопка не должна обещать запись в реестр, которой этот шаг не делает.
  const nextBtn = h('button', { class: 'btn btn--primary', type: 'button', onClick: toFace },
    t('enroll.next'), icon('chev-r', { size: 20 }));

  const stepper = h('nav', { class: 'stepper s-enroll__stepper', 'aria-label': t('enroll.stepsAria') });
  const phonePane = h('div', { class: 's-enroll__gate' });
  const facePane = h('div', { class: 's-enroll__gate' });
  const passportPane = h('div', { class: 's-enroll__passport' },
    banner,

    h('div', { class: 's-enroll__cols' },
      h('section', { class: 'panel s-enroll__scanner' },
        h('h2', { class: 's-enroll__pane-title' }, t('enroll.passport')),
        pages,
        stage,
        fileInput),

      h('div', { class: 's-enroll__form' }, groups)),

    h('div', { class: 's-enroll__foot' },
      h('button', { class: 'btn btn--ghost', type: 'button', onClick: cancel }, t('common.cancelVisit')),
      h('span', { class: 'spacer' }),
      nextBtn));

  const root = h('div', { class: 'canvas s-enroll' },
    // Заголовок один на все три шага: меняется содержимое, а не рамка — шапка,
    // прыгающая между шагами, читалась бы как переход на другой экран.
    h('header', { class: 's-enroll__head' },
      h('h1', { class: 'page-title' }, t('enroll.title')),
      stepper),
    phonePane,
    passportPane,
    facePane);

  mount(host, root);

  buildFields();
  drawStage();
  drawPages();
  drawBanner();
  lockFields(true);          // до первого скана править нечего
  go('phone');

  // Сбои переключаются на ходу (§7) — кнопка сканера обязана слушаться
  // тумблера, а не своего состояния на момент отрисовки.
  const unsubSim = sim.onChange(() => { if (!dead) drawBanner(); });

  // Esc = отмена приёма (§6/S2 hotkeys). defaultPrevented — не перестраховка:
  // глобальный обработчик (app.js) тем же Esc закрывает верхний слой, и без
  // проверки закрытие модала «Удалить скан?» заодно отменяло бы регистрацию.
  const onKey = e => {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    e.preventDefault();
    cancel();
  };
  addEventListener('keydown', onKey);

  return () => {
    dead = true;
    stopStep();
    unsubSim();
    removeEventListener('keydown', onKey);
    dropScans();             // паспорт не переживает экран
    F.clear();
  };

  /* ============================================================
     Поля
     ============================================================ */
  function buildFields() {
    mount(groups, ...PASSPORT_GROUPS.map(g =>
      h('section', { class: 's-enroll__group' },
        h('h2', { class: 's-enroll__group-title' }, t(`enroll.group.${g.id}`)),
        h('div', { class: 's-enroll__grid' },
          ...PASSPORT_FIELDS.filter(f => f.group === g.id).map(make)))));
  }

  function make(spec) {
    const api = build1(spec);
    F.set(spec.id, { spec, api });

    // Фокус в поле — на экране его разворот (§6/S2b). Сверять «Кем выдан» с
    // сканом прописки невозможно, а именно это и происходит, когда экран
    // показывает не ту страницу.
    api.input.addEventListener('focus', () => {
      if (spec.page === active) return;
      active = spec.page;
      drawStage();
      drawPages();
    });

    // Оператор тронул значение — проверять его больше не надо: он только что
    // это и сделал. Пометка уходит вместе с правкой, а счётчик в банере
    // убывает: число, которое не меняется, когда оператор уже проверил три
    // поля из четырёх, — не подсказка, а укор.
    api.input.addEventListener('input', () => {
      const wasCheck = api.dataSource === 'check';
      api.dataSource = 'manual';
      api.error('');
      flag(api, false);
      if (wasCheck && typeof outcome === 'number') drawBanner(countFlagged());
    });

    if (spec.id === 'inn') api.input.addEventListener('blur', () => checkInn(api));
    return api.el;
  }

  /* Подписи полей берутся из словаря, а не из PASSPORT_FIELDS: в data.js они
     лежат по-русски, потому что это схема паспорта, а не тексты интерфейса, —
     и в таджикской версии экран показывал «ФИО», «Дата рождения», «Пол» рядом
     с таджикскими заголовками групп. Локализация — часть раскладки (§9), а на
     этом экране подписи и есть основной текст. */
  function build1(spec) {
    const common = {
      label: t(`enroll.field.${spec.id}`),
      help: spec.help ? t(`enroll.help.${spec.id}`) : undefined,
      name: spec.id,
    };
    if (spec.type === 'select') {
      return selectField({
        ...common,
        options: spec.options.map(o => ({ v: o.v, n: t(`enroll.${spec.id}.${o.v}`) })),
      });
    }
    if (spec.type === 'date' || spec.type === 'inn') return maskedField({ ...common, kind: spec.type });
    return field(common);
  }

  /* Единственная пометка на поле: «проверьте». Она же и весь язык доверия на
     экране — уровни «сверено по MRZ» и «распознано» ушли в сводку банера,
     потому что per-field они ничего не решали: поведение оператора у них
     одинаковое (прочитать и идти дальше), а места они занимали больше, чем
     исключение, ради которого экран и открыт. */
  function flag(api, on) {
    api.labelEl.querySelector('.field__flag')?.remove();
    api.el.classList.toggle('field--check', on);
    if (on) api.labelEl.append(h('span', { class: 'field__flag' }, t('enroll.flag')));
  }

  /* Значения из распознавания. Решение по каждому одно: показывать пометку или
     нет. Машиночитаемая зона сверена контрольной цифрой, визуальная выше
     порога — распознана уверенно; и то и другое оператор просто читает.
     Визуальная ниже порога — просит глаз, и только она помечается. */
  function fill(fields) {
    let flagged = 0;

    for (const [id, { api }] of F) {
      const got = fields[id];
      if (!got) continue;

      // Человек важнее машины. Оператор мог поправить «ШBКД» на «ШВКД» и
      // только потом доснять страницу регистрации — а распознавание идёт по
      // всем разворотам сразу и принесло бы ту же ошибку обратно. Поле,
      // тронутое руками и непустое, распознавание больше не перетирает.
      if (api.dataSource === 'manual' && String(api.value() || '').trim()) continue;

      api.set(got.value);
      api.error('');

      if (!got.value) {
        // Поле не прочиталось совсем: разворот не снят или размыт. Пустое и
        // без пометки — помечать нечего, значение вводят с документа.
        api.dataSource = 'manual';
        flag(api, false);
        continue;
      }

      const needsEyes = got.zone !== 'mrz' && got.confidence < OCR_TRUST;
      api.dataSource = needsEyes ? 'check' : 'read';
      flag(api, needsEyes);
      if (needsEyes) flagged += 1;
    }

    return flagged;
  }

  /* Открыть форму на ввод: распознавания не будет (OCR не сработал) или его
     не звали (оператор выбрал ручной ввод). reason определяет только текст
     банера.

     Уже прочитанное НЕ стираем: если первый разворот успел распознаться, а
     второй — нет, отменять первый было бы наказанием оператора за поломку
     сканера. */
  function openFields(reason) {
    read = true;
    lockFields(false);

    for (const [, { api }] of F) {
      if (!String(api.value() || '').trim()) api.dataSource = 'manual';
    }

    drawBanner(reason);
    firstField()?.focus();
  }

  function lockFields(on) {
    for (const [, { api }] of F) api.input.disabled = on;
    groups.classList.toggle('is-waiting', on);
    nextBtn.disabled = on;
  }

  function countFlagged() {
    return [...F.values()].filter(x => x.api.dataSource === 'check').length;
  }

  function firstField() {
    for (const [, { api }] of F) if (!api.input.disabled) return api.input;
    return null;
  }

  /* ============================================================
     Сканер
     ============================================================ */
  function scanFor(page) { return scans.find(s => s.page === page); }

  function drawStage() {
    const s = scanFor(active);

    if (!s) {
      // Пустое состояние отвечает на три вопроса §6: что здесь должно быть,
      // почему пусто и что нажать. Подпись — та самая страница, которая
      // выбрана, а не общая инструкция про «два разворота».
      // Запасные пути стоят ровно здесь, рядом с той съёмкой, которую они
      // заменяют, и только пока разворота нет. После захвата им нечего делать:
      // поля к этому моменту уже открыты на правку, а второй разворот, если он
      // не снят, покажет эту же тройку кнопок на своей странице.
      // Без 48-пиксельной иконки: панель уже подписана «Паспорт», над ней стоит
      // список разворотов, и третья картинка того же документа отнимала бы
      // высоту у кнопок — а на 1280×720 её взять неоткуда (§10.6).
      mount(stage,
        h('div', { class: 'empty s-enroll__empty' },
          h('span', { class: 'empty__title' }, t('enroll.emptyTitle')),
          h('span', { class: 'empty__hint' }, t(`enroll.pageHint.${active}`)),
          scanBtn,
          h('div', { class: 's-enroll__aux' }, uploadBtn, manualBtn)));
      return;
    }

    mount(stage,
      // Нерезкий разворот — состояние снимка, и кнопки в банере нет: та самая
      // пересъёмка стоит строкой ниже, дублировать её нечем (§10.7).
      s.blurry
        ? h('div', { class: 'banner banner--warn' },
            icon('info'),
            h('span', { class: 'banner__text' }, t('enroll.blurry')))
        : null,

      h('div', { class: 's-enroll__preview' },
        h('img', {
          src: s.url, alt: t('enroll.previewAlt', { n: s.page }),
          style: { transform: `rotate(${s.rot || 0}deg)` },
        })),

      h('div', { class: 's-enroll__tools' },
        rescanBtn,
        h('span', { class: 'spacer' }),
        h('button', {
          class: 'btn btn--ghost btn--icon btn--s', type: 'button',
          'aria-label': t('enroll.rotate'), title: t('enroll.rotate'), onClick: rotate,
        }, icon('refresh', { size: 20 })),
        h('button', {
          class: 'btn btn--ghost btn--icon btn--s s-enroll__del', type: 'button',
          'aria-label': t('enroll.delete'), title: t('enroll.delete'), onClick: () => remove(s),
        }, icon('trash', { size: 20 }))));
  }

  /* Развороты — не «страницы 1, 2», а список того, что оператор обязан снять.
     Поэтому это строки с названиями, а не пронумерованные квадратики: пустой
     адрес почти всегда значит забытую страницу регистрации, и сказать об этом
     должно слово «не снят», а не отсутствие миниатюры. Снятый резкий разворот
     не подписывается ничем: про него сказать нечего, а подпись на каждом
     обесценила бы подпись на проблемном. */
  function drawPages() {
    mount(pages, ...PASSPORT_PAGES.map(p => {
      const s = scanFor(p.page);
      const state = !s ? { key: 'enroll.pageMissing', warn: false }
        : s.blurry ? { key: 'enroll.pageBlurry', warn: true }
        : null;

      return h('button', {
        class: 's-enroll__page', type: 'button',
        'aria-pressed': String(p.page === active),
        onClick: () => {
          active = p.page;
          drawStage();
          drawPages();
          if (!scanFor(p.page)) shoot(p.page);
        },
      },
        icon(s ? 'doc' : 'plus', { size: 20 }),
        h('span', { class: 's-enroll__page-name' }, t(`enroll.page.${p.page}`)),
        state
          ? h('span', { class: `s-enroll__page-state${state.warn ? ' s-enroll__page-state--warn' : ''}` },
              t(state.key))
          : null);
    }));
  }

  function drawBanner(reason = outcome) {
    outcome = reason;
    const nodes = [];

    if (sim.faults.network) {
      nodes.push(h('div', { class: 'banner banner--warn banner--sticky' },
        icon('info'), h('span', { class: 'banner__text' }, t('err.offline'))));
    }
    if (sim.faults.scanner) {
      nodes.push(h('div', { class: 'banner banner--warn' },
        icon('info'), h('span', { class: 'banner__text' }, t('enroll.noScanner'))));
    }
    if (reason === 'ocr') {
      nodes.push(h('div', { class: 'banner banner--warn' },
        icon('info'), h('span', { class: 'banner__text' }, t('enroll.ocrFailed'))));
    }
    if (reason === 'manual') {
      nodes.push(h('div', { class: 'banner banner--info' },
        icon('edit'), h('span', { class: 'banner__text' }, t('enroll.manualHint'))));
    }
    if (typeof reason === 'number' && reason > 0) {
      // §6/S2b — сколько полей просит проверки. Число, а не «есть замечания»:
      // оператор должен знать, сколько раз ему предстоит поднять глаза на
      // документ, прежде чем нажать «Зарегистрировать». Это же число заменяет
      // собой чипы доверия на спокойных полях.
      nodes.push(h('div', { class: 'banner banner--warn' },
        icon('info'), h('span', { class: 'banner__text' }, t('enroll.checkFields', { n: reason }))));
    }

    mount(banner, ...nodes);
    scanBtn.disabled = sim.faults.scanner;
    rescanBtn.disabled = sim.faults.scanner;
  }

  async function shoot(page = nextPage()) {
    setLoading(scanBtn, true);
    setLoading(rescanBtn, true);
    stage.classList.add('is-scanning');
    try {
      const s = await enroll.scan(page);
      if (dead) return;

      // Разворот у страницы один: повторный снимок той же страницы заменяет
      // прежний, а не копится рядом. Пересканирование — это исправление
      // снимка, и две версии одной страницы паспорта означали бы вопрос
      // «какая настоящая», на который ответить нечем.
      const i = scans.findIndex(x => x.page === page);
      if (i !== -1) { URL.revokeObjectURL(scans[i].url); scans[i] = s; }
      else scans.push(s);
      active = page;

      drawStage();
      drawPages();
      await extract();
    } catch (e) {
      if (dead) return;
      toast(errText(e), 'error');
    } finally {
      if (!dead) {
        setLoading(scanBtn, false);
        setLoading(rescanBtn, false);
        stage.classList.remove('is-scanning');
        // Возвращает не только банер, но и disabled кнопок съёмки: setLoading
        // снимает блокировку безусловно, а тумблер «сканер недоступен» мог
        // остаться включённым (§7).
        drawBanner();
      }
    }
  }

  async function upload(file) {
    if (!file) return;
    fileInput.value = '';
    try {
      const r = await fileApi.upload(file);
      if (dead) return;
      // Файл гражданина в памяти вкладки — регистрируем, чтобы его отозвал
      // wipe(), даже если экран уйдёт не своим ходом (TTL, блокировка).
      trackBlobUrl(r.url);

      const page = nextPage();
      const i = scans.findIndex(x => x.page === page);
      if (i !== -1) { URL.revokeObjectURL(scans[i].url); scans[i] = { ...r, page, blurry: false }; }
      else scans.push({ ...r, page, blurry: false });
      active = page;

      drawStage();
      drawPages();
      await extract();
    } catch (e) {
      if (!dead) toast(errText(e), 'error');
    }
  }

  /* Распознавание идёт по ВСЕМ снятым разворотам сразу, а не по последнему:
     адрес живёт на второй странице, ФИО на первой, и поле, прочитанное
     минуту назад, не должно обнуляться от того, что оператор доснял прописку. */
  async function extract() {
    groups.classList.add('is-reading');
    try {
      const res = await enroll.extract(scans);
      if (dead) return;

      read = true;
      lockFields(false);
      const flagged = fill(res.fields);
      drawBanner(flagged);

      // Курсор — в первое поле, которое просит проверки, а не в первое поле
      // формы: экран существует ради исправлений, и начинать надо с них.
      const bad = [...F.values()].find(x => x.api.dataSource === 'check');
      (bad?.api.input || firstField())?.focus();
    } catch (e) {
      if (dead) return;
      if (e.code === 'OCR_FAILED') return openFields('ocr');
      toast(errText(e), 'error');
    } finally {
      if (!dead) groups.classList.remove('is-reading');
    }
  }

  function nextPage() {
    const free = PASSPORT_PAGES.find(p => !scanFor(p.page));
    return free?.page ?? active;
  }

  function rotate() {
    const s = scanFor(active);
    if (!s) return;
    s.rot = ((s.rot || 0) + 90) % 360;
    drawStage();
  }

  function remove(s) {
    confirmDanger({
      title: t('enroll.deleteTitle'),
      body: h('p', {}, t('enroll.deleteBody')),
      confirmText: t('enroll.delete'),
      onConfirm: () => {
        URL.revokeObjectURL(s.url);
        scans = scans.filter(x => x !== s);
        // Разворот остаётся выбранным: на его месте встаёт пустое состояние с
        // кнопкой съёмки — ровно то, что оператор собирается сделать дальше.
        active = s.page;
        drawStage();
        drawPages();
      },
    });
  }

  /* Скан паспорта стирается с рабочего места, как только перестал быть нужен:
     на выходе с экрана и сразу после успешной записи в реестр. revoke на
     data-url безвреден, поэтому проверять происхождение не нужно — правило
     «URL, созданный из данных гражданина, отзывается» проще исключений. */
  function dropScans() {
    for (const s of scans) URL.revokeObjectURL(s.url);
    scans = [];
  }

  /* ============================================================
     Проверки
     ============================================================ */
  async function checkInn(api) {
    const v = api.raw();
    if (v.length !== 9) return;
    try {
      await enroll.checkInn(v);
      if (!dead) api.error('');
    } catch (e) {
      if (dead || e.code !== 'DUPLICATE_INN') return;
      api.error(t('enroll.dupInnShort'));
      duplicateModal(e);
    }
  }

  /* Дубль ИНН — не ошибка ввода, а развилка сценария: гражданин, скорее
     всего, УЖЕ зарегистрирован, просто с другого номера. Регистрировать его
     второй раз нельзя, и молча ругаться на поле бессмысленно — оператору
     нужно решение, а не отказ. */
  function duplicateModal(e) {
    let close = () => {};
    close = modal({
      title: t('enroll.dupTitle'),
      body: h('div', { class: 'stack g-3' },
        h('p', {}, t('enroll.dupBody', { name: e.maskedName || '' })),
        e.phone ? h('p', { class: 'small ink-faint' }, t('enroll.dupPhone', { phone: e.phone })) : null),
      actions: [
        h('button', { class: 'btn btn--secondary', onClick: () => close() }, t('enroll.dupFix')),
        h('button', {
          class: 'btn btn--primary',
          // Обратно на S2 — через два легальных перехода (§2.2), а не
          // самодельный ENROLL→IDENTIFY: машина такого ребра не знает.
          onClick: () => { close(); dispatch('CANCEL'); dispatch('START'); },
        }, t('enroll.dupIdentify')),
      ],
    });
  }

  function validate() {
    let first = null;

    for (const [id, { spec, api }] of F) {
      const raw = String(api.value() || '').trim();
      let err = '';

      if (spec.required && !raw) err = t('form.required');
      else if (raw && api.valid && !api.valid()) err = api.maskError;
      // Просроченный паспорт личность не удостоверяет — регистрировать по
      // нему нечего. Это не придирка формы, а причина, по которой гражданина
      // придётся отправить менять документ.
      else if (id === 'expires' && raw && isExpired(raw)) err = t('enroll.expired');

      api.error(err);
      if (err && !first) first = api;
    }

    if (first) {
      first.input.focus();
      first.el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    return !first;
  }

  /* ============================================================
     Шаги
     ============================================================ */
  function go(next) {
    stopStep();
    stopStep = () => {};
    step = next;
    phonePane.hidden = next !== 'phone';
    passportPane.hidden = next !== 'passport';
    facePane.hidden = next !== 'face';
    root.dataset.step = next;
    drawStepper();

    if (next === 'phone') drawPhone();
    if (next === 'face') drawFace();
    if (next === 'passport') (read ? firstField() : scanBtn)?.focus();
  }

  /* Степпер — тот же, что у шагов оформления услуги (§3.2): номер-точка,
     пройденный зелёный с галочкой, текущий синий. Вернуться можно только к
     паспорту: подтверждённый телефон не правят — его меняют новой
     регистрацией, а не кнопкой «назад». */
  function drawStepper() {
    const i = STEPS.indexOf(step);
    mount(stepper, ...STEPS.flatMap((id, k) => {
      const done = k < i, active = k === i;
      const back = done && id === 'passport';
      const node = h(back ? 'button' : 'span', {
        class: `step ${done ? 'step--done' : active ? 'step--active' : 'step--todo'}`,
        type: back ? 'button' : null,
        'aria-current': active ? 'step' : null,
        onClick: back ? () => go('passport') : null,
      },
        h('span', { class: 'step__dot' }, done ? icon('check', { size: 16 }) : String(k + 1)),
        h('span', { class: 'step__label' }, t(`enroll.step.${id}`)),
        done ? h('span', { class: 'sr-only' }, t('enroll.stepDone')) : null);
      return k < STEPS.length - 1 ? [node, h('span', { class: 'step__line' })] : [node];
    }));
  }

  function cancelRow() {
    return h('div', { class: 'row center' },
      h('button', { class: 'btn btn--ghost', type: 'button', onClick: cancel }, t('common.cancelVisit')));
  }

  /* ---------- шаг 1 · телефон ----------
     Код уходит на номер, который гражданин держит в руках, и только этот
     номер, подтверждённый кодом, уйдёт в реестр. Номер, уже принадлежащий
     профилю, — не регистрация, а промах поиска: такого человека надо найти,
     а не завести второй раз. */
  function drawPhone() {
    let alive = true;
    let stopResend = () => {};
    stopStep = () => { alive = false; stopResend(); };

    const note = h('div', { class: 's-enroll__note' });
    const contact = maskedField({ label: t('enroll.phoneLabel'), kind: 'phone', value: phone });
    contact.input.addEventListener('input', () => contact.error(''));
    const send = h('button', { class: 'btn btn--primary', type: 'submit' }, t('identify.smsSend'));
    const codeBox = h('div', { class: 'stack g-4 s-enroll__code', hidden: true });

    const form = h('form', {
      class: 'stack g-4', novalidate: true,
      onSubmit: async e => {
        e.preventDefault();
        note.replaceChildren();
        if (!contact.valid()) { contact.error(contact.maskError); contact.input.focus(); return; }
        setLoading(send, true);
        try {
          const r = await identify.sms(contact.raw());
          if (alive) askCode(r);
        } catch (err) {
          if (alive) mount(note, errorNote(err));
        } finally { if (alive) setLoading(send, false); }
      },
    }, contact.el, send, codeBox);

    mount(phonePane, h('div', { class: 'panel s-enroll__card' }, note, form), cancelRow());
    contact.input.focus();

    function askCode(r) {
      contact.el.hidden = true;
      send.hidden = true;

      const cells = otpInput(code => confirm(code));
      const confirmBtn = h('button', {
        class: 'btn btn--primary', type: 'button', onClick: () => confirm(cells.value()),
      }, t('identify.otpConfirm'));
      const err = h('span', { class: 'field__error', role: 'alert', hidden: true });

      const resend = h('button', { class: 'btn btn--ghost btn--s', type: 'button' });
      const arm = () => {
        stopResend();
        stopResend = resendCooldown(resend, 60_000, 'identify.smsResend', 'identify.smsResendIn');
      };
      resend.addEventListener('click', async () => {
        try { await identify.sms(contact.raw()); if (alive) { arm(); cells.clear(); } }
        catch (e) { if (alive) mount(note, errorNote(e)); }
      });
      arm();

      // Номер можно поправить, пока код не введён: гражданин мог продиктовать
      // старый. Кнопка стоит в той же строке, что и маска номера, — правят
      // ровно то, что видно.
      const change = h('button', {
        class: 'btn btn--ghost btn--s', type: 'button',
        onClick: () => { stopResend(); codeBox.hidden = true; contact.el.hidden = false; send.hidden = false; contact.input.focus(); },
      }, t('enroll.changePhone'));

      mount(codeBox,
        h('div', { class: 's-enroll__sent' },
          h('span', { class: 'label' }, t('identify.otpSentTo', { to: r.sentTo })),
          change),
        cells.el, err, confirmBtn,
        h('div', { class: 'row center' }, resend));
      codeBox.hidden = false;
      cells.focus();

      async function confirm(code) {
        err.hidden = true;
        cells.error(false);
        setLoading(confirmBtn, true);
        try {
          const res = await identify.smsConfirm(code);
          if (!alive) return;
          if (res.registered) return taken();
          phone = res.phone;
          go('passport');
        } catch (e2) {
          if (!alive) return;
          cells.error(true);
          err.hidden = false;
          err.textContent = errText(e2);
          cells.clear();
        } finally { if (alive) setLoading(confirmBtn, false); }
      }
    }

    function taken() {
      mount(note, h('div', { class: 'banner banner--info' },
        icon('user'),
        h('span', { class: 'banner__text' }, t('enroll.phoneTaken')),
        h('button', {
          class: 'btn btn--secondary btn--s', type: 'button',
          // Обратно на S2 — через два легальных перехода (§2.2).
          onClick: () => { dispatch('CANCEL'); dispatch('START'); },
        }, t('enroll.findProfile'))));
    }
  }

  /* ---------- шаг 2 → 3 ----------
     Паспорт проверяется целиком ДО камеры: сверять лицо с документом, который
     ещё не готов уйти в реестр, — тратить время гражданина на шаг, который
     придётся повторить. */
  async function toFace() {
    if (!validate()) return;
    setLoading(nextBtn, true);
    try {
      await enroll.checkInn(F.get('inn').api.raw());
      if (!dead) go('face');
    } catch (e) {
      if (dead) return;
      if (e.code === 'DUPLICATE_INN') {
        F.get('inn').api.error(t('enroll.dupInnShort'));
        return duplicateModal(e);
      }
      toast(errText(e), 'error');
    } finally { if (!dead) setLoading(nextBtn, false); }
  }

  /* ---------- шаг 3 · лицо ----------
     Сверка стартует сама: гражданин уже смотрит в камеру, а кнопка «начать»
     была бы обрядом. Пунктир по периметру — единственный жест активной съёмки
     (§3 live-scan). Камера дважды не узнала — оператор может сверить лицо с
     фото глазами: обязательный шаг без запасного пути оставил бы человека
     без регистрации из-за блика. Такая сверка честно помечается, и шаблона
     лица в записи тогда нет. */
  function drawFace() {
    let alive = true;
    stopStep = () => { alive = false; };
    face = null;

    const frame = facescanFrame();
    const caption = h('span', { class: 'facescan__caption', 'aria-live': 'polite' });
    const tile = h('div', { class: 'facescan facescan--embed' }, frame, caption);
    const note = h('div', { class: 's-enroll__note' });

    registerBtn = h('button', {
      class: 'btn btn--primary', type: 'button', disabled: true, onClick: confirmSubmit,
    }, t('enroll.submit'));

    // Сверка глазами — редкий путь, поэтому тихая кнопка в подвале карточки,
    // а не второе действие в банере: банер говорит, что случилось, и
    // предлагает ровно один следующий шаг — повтор.
    const manualBtn = h('button', {
      class: 'btn btn--ghost btn--s s-enroll__manual', type: 'button', hidden: true, onClick: manual,
    }, t('enroll.faceManual'));

    mount(facePane,
      h('div', { class: 'panel s-enroll__card' },
        tile, note, registerBtn,
        h('div', { class: 's-enroll__card-foot' },
          h('button', {
            class: 'btn btn--ghost btn--s s-enroll__back', type: 'button', onClick: () => go('passport'),
          }, icon('chev-l', { size: 20 }), t('enroll.backToPassport')),
          manualBtn)),
      cancelRow());

    match();

    async function match() {
      note.replaceChildren();
      tile.classList.remove('facescan--success', 'facescan--error');
      tile.classList.add('facescan--scanning');
      caption.textContent = t('enroll.faceMatching');
      try {
        await enroll.faceMatch();
        if (!alive) return;
        accept({ matched: true }, 'enroll.faceMatched');
      } catch (e) {
        if (!alive) return;
        faceFails += 1;
        tile.classList.remove('facescan--scanning');
        tile.classList.add('facescan--error');
        caption.textContent = t('enroll.faceLook');
        mount(note, errorNote(e,
          h('button', { class: 'btn btn--secondary btn--s', type: 'button', onClick: match }, t('enroll.faceRetry'))));
        manualBtn.hidden = faceFails < 2;
      }
    }

    function manual() {
      manualBtn.hidden = true;
      accept({ manual: true }, 'enroll.faceManualDone');
      mount(note, h('div', { class: 'banner banner--info' },
        icon('info'), h('span', { class: 'banner__text' }, t('enroll.faceManualNote'))));
    }

    function accept(result, captionKey) {
      face = result;
      tile.classList.remove('facescan--scanning', 'facescan--error');
      tile.classList.toggle('facescan--success', !!result.matched);
      caption.textContent = t(captionKey);
      if (result.matched) note.replaceChildren();
      registerBtn.disabled = false;
      registerBtn.focus();
    }
  }

  /* ============================================================
     Регистрация
     ============================================================ */
  function confirmSubmit() {
    if (!face) return;

    const checked = h('input', { class: 'check__input', type: 'checkbox' });
    let close = () => {};

    const ok = h('button', {
      class: 'btn btn--primary', type: 'button', disabled: true,
      onClick: () => { close(); send(); },
    }, t('enroll.submit'));

    checked.addEventListener('change', () => { ok.disabled = !checked.checked; });

    const v = id => F.get(id)?.api.value() || '';

    /* Подтверждение — это и есть момент согласия, поэтому список скоупов
       переехал сюда с экрана. Раньше «что будет записано в реестр» стояло
       панелью под формой и повторялось сводкой в этом же модале: один факт,
       две витрины (§10.6). А читает его оператор вслух ровно здесь — держа
       палец над кнопкой, а не пролистывая форму сорока строками выше. */
    close = modal({
      title: t('enroll.confirmTitle'),
      className: 's-enroll-confirm',
      wide: true,
      body: h('div', { class: 'stack g-4' },
        h('div', { class: 'def s-enroll-confirm__summary' },
          row(t('enroll.f.full'), v('full')),
          row(t('enroll.f.birth'), v('birth')),
          row(t('enroll.f.inn'), v('inn')),
          row(t('enroll.f.docNo'), v('docNo')),
          row(t('enroll.f.address'), v('address')),
          row(t('enroll.phone'), fmtPhone(phone)),
          row(t('enroll.f.face'), t(face.matched ? 'enroll.f.faceMatched' : 'enroll.f.faceManual'))),

        h('section', { class: 'stack g-3 s-enroll-confirm__consent' },
          h('h3', { class: 's-enroll-confirm__consent-title' }, t('enroll.consentTitle')),
          h('div', { class: 'check-list' },
            ...BASE_SCOPES.map(id => h('div', { class: 'check-item check-item--done' },
              icon('check'),
              h('span', {}, SCOPES[id]?.name || id)))),
          h('p', { class: 'small ink-2' }, t('enroll.consentBody')),
          h('p', { class: 'small ink-faint' }, t('enroll.consentNote'))),

        // Та же логика, что и у «прочитано вслух» на S7: под записью в
        // государственный реестр подписывается оператор, и он должен сказать
        // это явно, а не нажатием кнопки «дальше». Сверку лица глазами он
        // подписывает здесь же — это его подпись, а не камеры.
        h('label', { class: 'check' }, checked,
          h('span', {}, t(face.manual ? 'enroll.attestManual' : 'enroll.attest')))),
      actions: [
        h('button', { class: 'btn btn--secondary', type: 'button', onClick: () => close() }, t('common.cancel')),
        ok,
      ],
    });
  }

  async function send() {
    setLoading(registerBtn, true);
    try {
      // Вид значения в реестре берётся не из удобства формы, а из того, как
      // это же поле уже лежит у существующих граждан (mock/data.js): даты
      // «14.02.1991» строкой, ИНН — девятью цифрами без пробелов. Иначе
      // автозаполнение S6 подставляло бы новому гражданину ИНН с пробелами,
      // а старому — без, и оператор видел бы у одного человека два разных
      // формата одного и того же номера (ровно то, ради чего в fields.js
      // маска ложится и на реестровые значения).
      const fields = Object.fromEntries([...F].map(([id, { api }]) =>
        [id, id === 'inn' && api.raw ? api.raw() : api.value()]));

      const bind = getState().bind;
      const res = await enroll.submit({
        fields,
        phone,
        face,
        by: t('enroll.by', { tson: bindTsonName(bind) || bind?.tson || '', n: bind?.window ?? '' }),
      });
      if (dead) return;

      // Реестр принял — копия паспорта на рабочем месте больше не нужна.
      dropScans();

      dispatch('ENROLLED', { citizen: res.citizen, scopes: res.scopes, maskedName: res.maskedName });
      toast(t('enroll.done'), 'success');
    } catch (e) {
      if (dead) return;
      if (e.code === 'DUPLICATE_INN') {
        go('passport');
        F.get('inn').api.error(t('enroll.dupInnShort'));
        return duplicateModal(e);
      }
      if (e.code === 'FIELDS_REQUIRED') { go('passport'); return void validate(); }
      // Ничего не потеряно: заполненное живёт в полях, повтор — той же кнопкой.
      toast(errText(e), 'error');
    } finally { if (!dead) setLoading(registerBtn, false); }
  }

  function cancel() {
    // Отмена стоит дорого: паспорт уже отсканирован и выправлен руками, и
    // случайный Esc не должен отправлять оператора и гражданина в начало.
    if (!read) return dispatch('CANCEL');
    confirmDanger({
      title: t('enroll.cancelTitle'),
      body: h('p', {}, t('enroll.cancelBody')),
      confirmText: t('common.cancelVisit'),
      onConfirm: () => dispatch('CANCEL'),
    });
  }
}

function errorNote(e, ...actions) {
  const offline = e.code === 'OFFLINE';
  return h('div', { class: `banner banner--${offline ? 'warn' : 'error'}` },
    icon('info'),
    h('span', { class: 'banner__text' }, errText(e)),
    ...actions);
}

function row(k, v) {
  return h('div', { class: 'def__row' },
    h('span', { class: 'def__key' }, k),
    h('span', { class: 'def__val grow' }, v));
}

const fmtPhone = d => (String(d).length === 9
  ? `+992 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 7)} ${d.slice(7, 9)}`
  : d);
