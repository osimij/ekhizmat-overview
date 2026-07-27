/* ============================================================
   S2b · Регистрация гражданина · #/enroll  (§6/S2b)

   Гражданин впервые пришёл в ЦОН, в eKhizmat его нет. Телефон уже подтверждён
   кодом на S2 — это единственное, что о нём известно. Всё остальное лежит на
   столе: паспорт.

   Правило экрана: скан слева, поля справа, и они не расстаются. Оператор
   правит не «форму», а РАСХОЖДЕНИЕ между распознанным значением и тем, что
   написано в документе, — а сравнивать можно только то, что видно
   одновременно. Отсюда и фокус: щёлкнув по полю «Адрес», оператор получает
   разворот с пропиской, а не листает сканы руками.

   Три вещи, которые экран держит на себе намеренно:

   1. **Паспортные данные не попадают в store.** До ENROLLED сессии ещё нет, а
      §2.3.1 разрешает данные гражданина только в ней — patchSession() вне
      SESSION честно падает. Значит, единственное место, где живёт заполненный
      паспорт, — замыкание этого экрана и его же DOM. Размонтировался — нет
      данных, и это гарантия конструкции, а не дисциплины.

   2. **Доверие к значению видно на самом значении.** Машиночитаемая зона
      сверена контрольной цифрой, визуальная — распознана и может врать.
      Первая приходит закрытой на правку, вторая — открытой и помеченной
      «проверьте». Оператор не должен гадать, чему верить.

   3. **Скан не переживает регистрацию.** Разворот уходит в реестр вместе с
      записью и стирается с рабочего места сразу после ответа сервера: держать
      копию паспорта в памяти вкладки после того, как она больше не нужна, —
      ровно та утечка, от которой §2.3 обещает избавить.
   ============================================================ */
import { h, mount, icon, toast, modal, confirmDanger } from '../ui.js';
import { t, errText } from '../i18n.js';
import { getState, dispatch, trackBlobUrl } from '../store.js';
import { enroll, docs as fileApi, sim } from '../mock/api.js';
import { field, maskedField, selectField, setLoading } from '../fields.js';
import { isExpired } from '../format.js';
import {
  PASSPORT_FIELDS, PASSPORT_GROUPS, PASSPORT_PAGES, OCR_TRUST, SCOPES, BASE_SCOPES,
} from '../mock/data.js';

export function renderEnroll(host) {
  let dead = false;
  let scans = [];        // снимки разворотов: [{id, page, url, blurry, rot}]
  let active = 0;        // какой разворот показан
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
  const phone = st.identify?.phone || '';

  const banner = h('div', { class: 's-enroll__banner' });
  const stage = h('div', { class: 's-enroll__stage panel' });
  const thumbs = h('div', { class: 'thumbs' });
  const groups = h('div', { class: 'stack g-8' });

  const scanBtn = h('button', { class: 'btn btn--primary', onClick: () => shoot() },
    icon('refresh', { size: 20 }), t('enroll.scan'));

  const fileInput = h('input', {
    type: 'file', class: 'sr-only', accept: 'application/pdf,image/jpeg,image/png',
    onChange: e => upload(e.target.files[0]),
  });

  const uploadBtn = h('button', { class: 'btn btn--secondary', onClick: () => fileInput.click() },
    icon('upload', { size: 20 }), t('enroll.upload'));

  const manualBtn = h('button', { class: 'btn btn--ghost btn--s', onClick: () => openFields('manual') },
    icon('edit', { size: 20 }), t('enroll.manual'));

  const submitBtn = h('button', { class: 'btn btn--primary', onClick: confirmSubmit }, t('enroll.submit'));

  mount(host,
    h('div', { class: 'canvas s-enroll' },
      h('div', { class: 'stack g-2 s-enroll__head' },
        h('h1', { class: 'h2' }, t('enroll.title')),
        h('p', { class: 'body-l ink-2' }, t('enroll.lead')),
        // Подтверждённый телефон — единственное, что уже доказано, и он
        // остаётся на виду весь экран: всё остальное оператор ещё только
        // сверяет, и путать доказанное с распознанным нельзя.
        h('div', { class: 'row g-2 s-enroll__verified' },
          icon('shield', { size: 20, cls: 'green-ink' }),
          h('span', { class: 'small' }, t('enroll.phoneVerified', { phone: fmtPhone(phone) })))),

      banner,

      h('div', { class: 's-enroll__cols' },
        h('div', { class: 'panel stack g-4 s-enroll__scanner' },
          h('h2', { class: 'label' }, t('enroll.passport')),
          stage,
          thumbs,
          h('hr', { class: 'rule' }),
          h('div', { class: 'stack g-2' }, scanBtn, uploadBtn, fileInput, manualBtn)),

        h('div', { class: 'stack g-6 s-enroll__form' },
          groups,
          consentPanel())),

      h('div', { class: 's-enroll__foot' },
        h('button', { class: 'btn btn--ghost', onClick: cancel }, t('common.cancelVisit')),
        h('span', { class: 'spacer' }),
        submitBtn)));

  buildFields();
  drawStage();
  drawThumbs();
  drawBanner();
  lockFields(true);          // до первого скана править нечего

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
      h('section', { class: 'stack g-4' },
        h('h2', { class: 'h3' }, t(`enroll.group.${g.id}`)),
        h('div', { class: 's-enroll__grid' },
          ...PASSPORT_FIELDS.filter(f => f.group === g.id).map(make),
          // Телефон живёт в группе контактов, но приходит не из паспорта, а
          // из подтверждённого кода. Поэтому он в форме — оператор видит,
          // ЧТО именно уйдёт в реестр, — но закрыт: менять подтверждённый
          // номер на непроверенный значило бы тихо обнулить подтверждение.
          g.id === 'contact' ? phoneField() : null))));
  }

  function make(spec) {
    const api = build1(spec);
    F.set(spec.id, { spec, api });

    // Фокус в поле — на экране его разворот (§6/S2b). Сверять «Кем выдан» с
    // сканом прописки невозможно, а именно это и происходит, когда экран
    // показывает не ту страницу.
    api.input.addEventListener('focus', () => {
      const i = scans.findIndex(s => s.page === spec.page);
      if (i !== -1 && i !== active) { active = i; drawStage(); drawThumbs(); }
    });

    // Оператор тронул значение — источник больше не «распознано», а
    // «введено». Молчаливо оставить чип OCR на исправленном значении значило
    // бы приписать машине то, что сделал человек.
    api.input.addEventListener('input', () => {
      const wasCheck = api.dataSource === 'check';
      if (api.dataSource !== 'manual') { api.dataSource = 'manual'; api.source('manual'); }
      api.error('');
      api.el.classList.remove('field--check');

      // Счётчик в банере убывает по мере работы. Число, которое не меняется,
      // когда оператор уже проверил три поля из четырёх, — не подсказка, а
      // укор; а когда проверено всё, банер должен уйти сам.
      if (wasCheck && typeof outcome === 'number') drawBanner(countFlagged());
    });

    if (spec.id === 'inn') api.input.addEventListener('blur', () => checkInn(api));
    return api.el;
  }

  function build1(spec) {
    const common = { label: spec.label, help: spec.help, name: spec.id };
    if (spec.type === 'select') return selectField({ ...common, options: spec.options });
    if (spec.type === 'date' || spec.type === 'inn') return maskedField({ ...common, kind: spec.type });
    return field(common);
  }

  function phoneField() {
    const api = maskedField({ label: t('enroll.phone'), kind: 'phone', value: phone });
    api.input.readOnly = true;
    api.el.classList.add('field--locked');
    api.source('verified');
    F.set('phone', { spec: { id: 'phone', required: true, page: 1 }, api });
    return api.el;
  }

  /* Значения из распознавания. Раскладываются по трём корзинам, и корзина
     решает всё поведение поля:

       mrz   — сверено контрольной цифрой → закрыто, кнопка «изменить»;
       ocr   — распознано уверенно        → закрыто, кнопка «изменить»;
       check — распознано неуверенно      → ОТКРЫТО и помечено «проверьте».

     Открывать неуверенное поле, а не просто красить, важно: оператор и так
     будет его править, и лишний клик «изменить» на каждом сомнительном поле
     превратил бы подсказку в препятствие. */
  function fill(fields) {
    let flagged = 0;

    for (const [id, { api }] of F) {
      if (id === 'phone') continue;
      const got = fields[id];
      if (!got) continue;

      // Человек важнее машины. Оператор мог поправить «ШBКД» на «ШВКД» и
      // только потом доснять страницу регистрации — а распознавание идёт по
      // всем разворотам сразу и принесло бы ту же ошибку обратно. Поле,
      // тронутое руками и непустое, распознавание больше не перетирает.
      if (api.dataSource === 'manual' && String(api.value() || '').trim()) continue;

      // Распознавание может прийти второй раз — оператор доснял прописку или
      // пересканировал размытый разворот. Поле обязано вернуться в исходное
      // состояние ДО раскладки по корзинам, иначе на нём копятся кнопки
      // «изменить», а однажды закрытое MRZ-поле остаётся закрытым, даже когда
      // новый снимок прочитался хуже прежнего.
      api.input.readOnly = false;
      api.el.classList.remove('field--locked', 'field--check');
      api.el.querySelector('.field__unlock')?.remove();

      api.set(got.value);

      if (!got.value) {
        // Поле не прочиталось совсем: разворот не снят или размыт. Пустое и
        // открытое — оператор вводит с документа.
        api.dataSource = 'manual';
        api.source(null);
        continue;
      }

      const kind = got.zone === 'mrz' ? 'mrz'
        : got.confidence >= OCR_TRUST ? 'ocr'
        : 'check';

      api.dataSource = kind;
      api.source(kind);

      if (kind === 'check') {
        flagged += 1;
        api.el.classList.add('field--check');
      } else {
        api.lock(() => { api.dataSource = 'manual'; });
      }
    }

    return flagged;
  }

  /* Открыть форму на ввод: распознавания не будет (OCR не сработал) или его
     не звали (оператор выбрал ручной ввод). reason определяет только текст
     банера.

     Уже прочитанное НЕ стираем: если первый разворот успел распознаться, а
     второй — нет, отменять первый было бы наказанием оператора за поломку
     сканера. Но замок с полей снимаем со всех: банер обещает ручной ввод, и
     поле, которое после этого обещания не редактируется, — прямая ложь.
     Чип при этом остаётся тот же — «сверено по MRZ» на прочитанном значении
     правда независимо от того, открыто поле или закрыто. */
  function openFields(reason) {
    read = true;
    lockFields(false);

    for (const [id, { api }] of F) {
      if (id === 'phone') continue;
      api.input.readOnly = false;
      api.el.classList.remove('field--locked');
      api.el.querySelector('.field__unlock')?.remove();

      if (!String(api.value() || '').trim()) {
        api.dataSource = 'manual';
        api.source(null);
      }
    }

    drawBanner(reason);
    firstField()?.focus();
  }

  function lockFields(on) {
    for (const [id, { api }] of F) {
      if (id === 'phone') continue;         // всегда закрыт, он подтверждён
      api.input.disabled = on;
    }
    groups.classList.toggle('is-waiting', on);
    submitBtn.disabled = on;
  }

  function countFlagged() {
    return [...F.values()].filter(x => x.api.dataSource === 'check').length;
  }

  function firstField() {
    for (const [id, { api }] of F) {
      if (id !== 'phone' && !api.input.disabled && !api.input.readOnly) return api.input;
    }
    return null;
  }

  /* ============================================================
     Сканер
     ============================================================ */
  function drawStage() {
    if (!scans.length) {
      mount(stage, h('div', { class: 'empty' },
        icon('card', { size: 48 }),
        h('span', { class: 'empty__title' }, t('enroll.emptyTitle')),
        h('span', { class: 'empty__hint' }, t('enroll.emptyHint'))));
      return;
    }

    const s = scans[Math.min(active, scans.length - 1)];
    const page = PASSPORT_PAGES.find(p => p.page === s.page);

    mount(stage,
      h('div', { class: 'row between' },
        h('span', { class: 'label' }, page?.name || ''),
        h('span', { class: 'small ink-faint' }, page?.hint || '')),

      s.blurry
        ? h('div', { class: 'banner banner--warn' },
            icon('info'),
            h('span', { class: 'banner__text' }, t('enroll.blurry')),
            h('button', { class: 'btn btn--ghost btn--s', onClick: () => shoot(s.page) },
              t('enroll.rescan')))
        : null,

      h('div', { class: 's-enroll__preview' },
        h('img', {
          src: s.url, alt: t('enroll.previewAlt', { n: s.page }),
          style: { transform: `rotate(${s.rot || 0}deg)` },
        })),

      h('div', { class: 'row wrap g-2' },
        h('button', { class: 'btn btn--secondary btn--s', onClick: rotate },
          icon('refresh', { size: 20 }), t('enroll.rotate')),
        h('button', { class: 'btn btn--secondary btn--s', onClick: () => shoot(s.page) },
          icon('refresh', { size: 20 }), t('enroll.rescan')),
        h('button', { class: 'btn btn--danger btn--s', onClick: () => remove(s) },
          icon('trash', { size: 20 }), t('enroll.delete'))));
  }

  /* Развороты — не «страницы 1,2,3…», а два конкретных места в документе.
     Кнопка показывает, какой ещё не снят: пустой адрес почти всегда значит,
     что оператор забыл про страницу регистрации. */
  function drawThumbs() {
    mount(thumbs, ...PASSPORT_PAGES.map(p => {
      const i = scans.findIndex(s => s.page === p.page);
      const has = i !== -1;
      return h('button', {
        class: `thumb s-enroll__page${has && i === active ? ' is-active' : ''}`,
        'aria-selected': String(has && i === active),
        title: has ? p.name : t('enroll.addPage', { name: p.name }),
        onClick: () => {
          if (!has) return void shoot(p.page);
          active = i;
          drawStage();
          drawThumbs();
        },
      },
        icon(has ? 'doc' : 'plus', { size: 20 }),
        h('span', { class: 'small' }, String(p.page)));
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
      // документ, прежде чем нажать «Зарегистрировать».
      nodes.push(h('div', { class: 'banner banner--warn' },
        icon('info'), h('span', { class: 'banner__text' }, t('enroll.checkFields', { n: reason }))));
    }

    mount(banner, ...nodes);
    scanBtn.disabled = sim.faults.scanner;
  }

  async function shoot(page = nextPage()) {
    setLoading(scanBtn, true);
    stage.classList.add('is-scanning');
    try {
      const s = await enroll.scan(page);
      if (dead) return;

      // Разворот у страницы один: повторный снимок той же страницы заменяет
      // прежний, а не копится рядом. Пересканирование — это исправление
      // снимка, и две версии одной страницы паспорта означали бы вопрос
      // «какая настоящая», на который ответить нечем.
      const i = scans.findIndex(x => x.page === page);
      if (i !== -1) { URL.revokeObjectURL(scans[i].url); scans[i] = s; active = i; }
      else { scans.push(s); active = scans.length - 1; }

      drawStage();
      drawThumbs();
      await extract();
    } catch (e) {
      if (dead) return;
      toast(errText(e), 'error');
      drawBanner();
    } finally {
      if (!dead) { setLoading(scanBtn, false); stage.classList.remove('is-scanning'); }
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
      scans.push({ ...r, page, blurry: false });
      active = scans.length - 1;
      drawStage();
      drawThumbs();
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
    const free = PASSPORT_PAGES.find(p => !scans.some(s => s.page === p.page));
    return free?.page ?? 1;
  }

  function rotate() {
    const s = scans[active];
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
        active = Math.max(0, active - 1);
        drawStage();
        drawThumbs();
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
     Регистрация
     ============================================================ */
  function confirmSubmit() {
    if (!validate()) return;

    const checked = h('input', { class: 'check__input', type: 'checkbox' });
    let close = () => {};

    const ok = h('button', {
      class: 'btn btn--primary', disabled: true,
      onClick: () => { close(); send(); },
    }, t('enroll.submit'));

    checked.addEventListener('change', () => { ok.disabled = !checked.checked; });

    const v = id => F.get(id)?.api.value() || '';

    close = modal({
      title: t('enroll.confirmTitle'),
      body: h('div', { class: 'stack g-4' },
        h('div', { class: 'def' },
          row(t('enroll.f.full'), v('full')),
          row(t('enroll.f.birth'), v('birth')),
          row(t('enroll.f.inn'), v('inn')),
          row(t('enroll.f.docNo'), v('docNo')),
          row(t('enroll.f.address'), v('address')),
          row(t('enroll.phone'), v('phone'))),
        // Та же логика, что и у «прочитано вслух» на S7: под записью в
        // государственный реестр подписывается оператор, и он должен сказать
        // это явно, а не нажатием кнопки «дальше».
        h('label', { class: 'check' }, checked, h('span', {}, t('enroll.attest')))),
      actions: [
        h('button', { class: 'btn btn--secondary', onClick: () => close() }, t('common.cancel')),
        ok,
      ],
    });
  }

  async function send() {
    setLoading(submitBtn, true);
    try {
      // Вид значения в реестре берётся не из удобства формы, а из того, как
      // это же поле уже лежит у существующих граждан (mock/data.js): даты
      // «14.02.1991» строкой, ИНН — девятью цифрами без пробелов. Иначе
      // автозаполнение S6 подставляло бы новому гражданину ИНН с пробелами,
      // а старому — без, и оператор видел бы у одного человека два разных
      // формата одного и того же номера (ровно то, ради чего в fields.js
      // маска ложится и на реестровые значения).
      const RAW = new Set(['inn', 'phone']);
      const fields = Object.fromEntries([...F].map(([id, { api }]) =>
        [id, RAW.has(id) && api.raw ? api.raw() : api.value()]));

      const bind = getState().bind;
      const res = await enroll.submit({
        fields,
        phone: F.get('phone').api.raw(),
        by: t('enroll.by', { tson: bind?.tsonName || bind?.tson || '', n: bind?.window ?? '' }),
      });
      if (dead) return;

      // Реестр принял — копия паспорта на рабочем месте больше не нужна.
      dropScans();

      // Регистрация не заканчивается записью: сразу снимаем лицо, чтобы в
      // следующий приход гражданин входил по Face ID (§6/S2). Переход в SESSION
      // делает шаг захвата (captureBiometric), а не эта строка.
      captureBiometric(res);
    } catch (e) {
      if (dead) return;
      if (e.code === 'DUPLICATE_INN') {
        F.get('inn').api.error(t('enroll.dupInnShort'));
        return duplicateModal(e);
      }
      if (e.code === 'FIELDS_REQUIRED') return void validate();
      // Ничего не потеряно: заполненное живёт в полях, повтор — той же кнопкой.
      toast(errText(e), 'error');
    } finally { if (!dead) setLoading(submitBtn, false); }
  }

  /* Биометрия сразу после записи в реестр (§6/S2b → §6/S2). Запись уже создана,
     гражданин у окна — снимаем лицо, чтобы в следующий приход он входил по
     Face ID. Шаблон уходит в реестр (enroll.captureFace), не в store: это
     учётные данные для входа, а не данные сессии.

     finish() ведёт в SESSION и защищён от повторного вызова. Модал закрывается
     тремя путями — снимок, «Пропустить», крестик/подложка/Esc — и все обязаны
     завершить регистрацию РОВНО один раз: второй ENROLLED из SESSION нелегален
     и уронил бы машину (§2.2). Поэтому finish висит на onClose (его дёргает
     любой путь закрытия), а кнопки лишь закрывают модал. Пропуск — не отмена:
     запись в реестре уже есть, дороги назад нет, лицо просто добавят позже. */
  function captureBiometric(res) {
    let finished = false;
    const finish = () => {
      if (finished || dead) return;
      finished = true;
      dispatch('ENROLLED', {
        citizen: res.citizen, scopes: res.scopes, maskedName: res.maskedName,
      });
      toast(t('enroll.done'), 'success');
    };

    const capture = h('button', { class: 'btn btn--primary', onClick: onCapture },
      icon('face', { size: 20 }), t('enroll.bioCapture'));
    const skip = h('button', { class: 'btn btn--ghost', onClick: () => close() }, t('enroll.bioSkip'));

    const close = modal({
      title: t('enroll.bioTitle'),
      body: h('div', { class: 'stack g-4' },
        h('div', { class: 'facescan facescan--modal facescan--scanning' },
          h('div', { class: 'facescan__frame' }, icon('face', { size: 72 })),
          h('span', { class: 'facescan__caption' }, t('enroll.bioScan'))),
        h('p', { class: 'small ink-2' }, t('enroll.bioBody'))),
      actions: [skip, capture],
      onClose: finish,       // снимок / пропуск / крестик — все ведут в SESSION
    });

    async function onCapture() {
      setLoading(capture, true);
      try {
        await enroll.captureFace();
        if (dead) return;
        toast(t('enroll.bioDone'), 'success');
        close();             // onClose → finish
      } catch (e) {
        if (!dead) { setLoading(capture, false); toast(errText(e), 'error'); }
      }
    }
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

/* Что именно будет записано и на что гражданин соглашается. Оператор читает
   это вслух — поэтому список конкретный (скоупы по именам), а не «данные,
   необходимые для оказания услуг». */
function consentPanel() {
  return h('section', { class: 'panel stack g-3' },
    h('h2', { class: 'label' }, t('enroll.consentTitle')),
    h('div', { class: 'check-list' },
      ...BASE_SCOPES.map(id => h('div', { class: 'check-item check-item--done' },
        icon('check'),
        h('span', {}, SCOPES[id]?.name || id)))),
    h('p', { class: 'small ink-2' }, t('enroll.consentBody')),
    h('p', { class: 'small ink-faint' }, t('enroll.consentNote')));
}

function row(k, v) {
  return h('div', { class: 'def__row' },
    h('span', { class: 'def__key' }, k),
    h('span', { class: 'def__val grow' }, v));
}

const fmtPhone = d => (String(d).length === 9
  ? `+992 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 7)} ${d.slice(7, 9)}`
  : d);
