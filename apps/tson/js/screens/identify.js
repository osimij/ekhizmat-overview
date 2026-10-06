/* ============================================================
   S2 · Идентификация гражданина · #/identify  (§6/S2)

   Приём начинается с одного вопроса реестру: есть ли у человека профиль.
   Отсюда две ступени в одной карточке ворот (--w-gate-wide):

   1. Поиск. Сегмент «Телефон | Паспорт», под ним поле выбранного типа.
      Оператор не спрашивает гражданина «у вас есть аккаунт?»: люди этого не
      помнят, и раньше ответ выяснялся только после SMS-кода, когда обещание
      «сейчас войдём» уже было дано вслух. Теперь развилку решает реестр, и
      сразу. Чем искать, выбирает оператор, а не поле: угадывание по первой
      букве было незаметным правилом, которое приходилось объяснять.

   2а. Профиль есть → способ входа: QR-код на этом экране, уведомление в
       приложение IMZO или код по SMS. Все три привязаны к найденному профилю
       (mock/api.js, `target`): скан из чужого приложения не пройдёт, поэтому
       человек из очереди не откроет оператору свои данные вместо данных того,
       кто стоит у окна. Нет телефона с собой — сверка лица с профилем: тихая
       строка под способами, а не четвёртая вкладка — это исключение, а не
       выбор.

   2б. Профиля нет → регистрация в три шага (телефон, паспорт, лицо) на S2b.
       Карточка называет шаги ДО начала: паспорт нужно попросить сразу, а не
       узнать о нём на втором экране.

   Приёмка §6/S2: «до подтверждения согласия интерфейс не показывает ничего,
   кроме маскированного ФИО из отклика идентификации». Поиск имени не отдаёт
   вовсе — только «есть / нет» и маску номера, на который уйдёт код.

   Ответ гражданина (скан QR, подтверждение push, совпадение лица) приходит не
   из await на запрос, а событием — за гражданина играет демо-панель (§11.5).
   Отсюда identify.wait().
   ============================================================ */
import { h, mount, icon, makeTablist, facescanFrame, mmss } from '../ui.js';
import { t, errText } from '../i18n.js';
import { dispatch } from '../store.js';
import { identify } from '../mock/api.js';
import { LOOKUP } from '../mock/data.js';
import { lookupField, otpInput, setLoading, resendCooldown } from '../fields.js';
import { countdown } from '../clock.js';
import { qrSvg } from '/design-system/js/qr.js';

/* Порядок = порядок схемы приёма: QR не требует от гражданина ничего, кроме
   камеры, уведомление — открытого приложения, SMS — только телефона и
   поэтому стоит последним, как резерв для всех. */
const METHODS = [
  { id: 'qr',   key: 'identify.qr' },
  { id: 'push', key: 'identify.push' },
  { id: 'otp',  key: 'identify.otp' },
];

/* Чем искать. Телефон первым: его гражданин знает наизусть, паспорт нужно
   достать. Поле у каждого своё — с неизменяемым +992 и цифрами у телефона,
   с буквой серии и цифрами у паспорта. */
const LOOKUP_BY = {
  phone:    { prefix: '+992', numeric: true },
  passport: { prefix: '', numeric: false },
};

const REGISTRATION = ['phone', 'passport', 'face'];

export function renderIdentify(host) {
  let dead = false;
  let found = null;          // ответ поиска: { kind, sentTo, face } — без ПД
  let query = '';            // что искали, как это видно оператору
  let by = 'phone';          // выбранный способ поиска
  // Набранное — у каждого способа своё: переключился на паспорт и обратно —
  // номер на месте. «Изменить» возвращает к тому же значению.
  const drafts = { phone: '', passport: '' };
  let method = null;
  let lastMethod = 'qr';
  let stop = () => {};       // таймеры и ожидания текущего метода

  // Узлы ступени «способ входа». Объявлены здесь, а не рядом с drawFound:
  // экран возвращает teardown раньше, чем дошёл бы до них, и let ниже return
  // остался бы непроинициализированным навсегда.
  let methods = null;        // область способов внутри карточки
  let banner = null;
  let body = null;
  let seg = null;
  let tabs = null;

  // Карточка меняет содержимое целиком, поэтому объявление о результате
  // поиска живёт вне её: узел, вставленный вместе с текстом, скринридер не
  // читает, а изменение текста в живой области — читает (§9).
  const live = h('p', { class: 'sr-only', 'aria-live': 'polite' });
  const card = h('div', { class: 'panel s-identify__card' });

  mount(host,
    h('div', { class: 'canvas s-gate s-identify' },
      h('h1', { class: 'page-title' }, t('identify.title')),
      card,
      live,
      h('div', { class: 'row center s-identify__foot' },
        h('button', { class: 'btn btn--ghost', onClick: () => dispatch('CANCEL') },
          t('common.cancelVisit')))));

  // 1/2/3 — переключение способа (§11.6). Только когда профиль найден:
  // до поиска выбирать нечего, и цифра должна печататься в поле.
  //
  // В фазе перехвата, а не всплытия: прототип вешает на те же цифры
  // переключение платформ (design-system/js/platform-switcher.js), и оно
  // стоит на window раньше экрана. На всплытии оно срабатывало первым, и
  // «3 — SMS» уводило оператора посреди приёма в АРМ ведомства.
  const onKey = e => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);
    if (!found || typing || e.ctrlKey || e.metaKey || e.altKey) return;
    const i = ['1', '2', '3'].indexOf(e.key);
    if (i === -1) return;
    e.preventDefault();
    drawMethods(METHODS[i].id);
  };
  addEventListener('keydown', onKey, true);

  drawFind();

  return () => {
    dead = true;
    stop();
    identify.forget();
    removeEventListener('keydown', onKey, true);
  };

  /* ============================================================
     Ступень 1 · поиск
     ============================================================ */
  function drawFind(kind = by) {
    halt();
    found = null;
    by = kind;

    let look = null;
    const slot = h('div', { id: 'identify-lookup', role: 'tabpanel' });
    const banner = h('div', { class: 's-identify__banner' });
    // Кнопка — в рост поля (как на воротах входа, §3 «Workstation login»):
    // поле и его действие читаются одним блоком, а не строкой и кнопкой.
    const find = h('button', { class: 'btn btn--primary btn--l', type: 'submit' }, t('identify.find'));

    // Тот же сегмент, что выбирает способ входа на следующей ступени (§6):
    // один контрол выбора на всю карточку, а не новый для каждого вопроса.
    const choice = h('div', { class: 'seg', role: 'tablist', 'aria-label': t('identify.lookupBy') },
      ...Object.keys(LOOKUP_BY).map(k => h('button', {
        class: 'seg__item', role: 'tab', type: 'button', id: `identify-by-${k}`,
        'aria-selected': String(k === by), 'aria-controls': 'identify-lookup',
        onClick: () => pick(k, true),
      }, t(`identify.by.${k}`))));
    // Стрелки переключают сегмент, оставляя фокус на нём (§6, модель
    // таб-листа); щелчок — сразу в поле: выбрал «Паспорт» — значит, печатаешь.
    const tabs = makeTablist(choice, {
      onSelect: btn => pick(Object.keys(LOOKUP_BY)[[...choice.children].indexOf(btn)], false),
    });

    const form = h('form', {
      class: 'stack g-4 s-identify__form', novalidate: true,
      onSubmit: async e => {
        e.preventDefault();
        banner.replaceChildren();
        const q = look.parsed();
        if (!q.complete) {
          look.error(t(`identify.invalid.${by}`));
          look.input.focus();
          return;
        }
        setLoading(find, true);
        try {
          const r = await identify.lookup({ kind: by, value: q.value });
          if (dead) return;
          query = by === 'phone' ? `+992 ${q.display}` : q.display;
          if (r.found) drawFound(r); else drawMissing(r);
        } catch (err) {
          if (dead) return;
          if (err.code === 'BAD_LOOKUP') look.error(t(`identify.invalid.${by}`));
          else mount(banner, errorBanner(err));
        } finally { if (!dead) setLoading(find, false); }
      },
    }, choice, slot, banner, find);

    // Сегмент — внутри формы: выбор, поле и действие — один блок с одним
    // шагом между ними (§5 casebook 4), а не три отдельных ряда карточки.
    mount(card, form, guestRow());
    field();
    look.input.focus();

    function pick(k, typing) {
      if (k === by) { if (typing) look.input.focus(); return; }
      drafts[by] = look.value();
      by = k;
      [...choice.children].forEach(btn =>
        btn.setAttribute('aria-selected', String(btn.id === `identify-by-${k}`)));
      tabs.sync();
      banner.replaceChildren();
      field();
      if (typing) look.input.focus();
    }

    function field() {
      look = lookupField({
        label: t(`identify.field.${by}`),
        placeholder: t(`identify.placeholder.${by}`),
        read: LOOKUP[by],
        ...LOOKUP_BY[by],
      });
      look.set(drafts[by]);
      look.input.addEventListener('input', () => { look.error(''); drafts[by] = look.value(); });
      slot.setAttribute('aria-labelledby', `identify-by-${by}`);
      mount(slot, look.el);
    }
  }

  /* Итог поиска — одна строка над способами: что нашли и по чему искали.
     «Изменить» возвращает на поиск с тем же значением: опечатка в одной цифре
     не должна стоить оператору всего номера заново. */
  function summary(state) {
    const ok = state === 'found';
    return h('div', { class: `s-identify__result s-identify__result--${state}` },
      icon(ok ? 'check' : 'user-add', { size: 20, cls: 's-identify__result-ic' }),
      h('div', { class: 's-identify__result-text' },
        h('span', { class: 's-identify__result-title' }, t(ok ? 'identify.found' : 'identify.missing')),
        h('span', { class: 's-identify__result-sub' }, query)),
      h('button', {
        class: 'btn btn--ghost btn--s s-identify__change', type: 'button',
        onClick: () => drawFind(by),
      }, t('identify.change')));
  }

  /* ============================================================
     Ступень 2а · профиль есть → способ входа
     ============================================================ */
  function drawFound(r) {
    found = r;
    live.textContent = t('identify.found');
    methods = h('div', { class: 's-identify__methods' });
    mount(card, summary('found'), methods);
    drawMethods('qr');
    seg?.querySelector('[aria-selected="true"]')?.focus();
  }

  function drawMethods(id) {
    if (!seg || !methods.contains(seg)) {
      seg = h('div', { class: 'seg', role: 'tablist', 'aria-label': t('identify.method') },
        ...METHODS.map((m, i) => h('button', {
          class: 'seg__item', role: 'tab', type: 'button', id: `identify-tab-${m.id}`,
          'aria-selected': 'false', 'aria-controls': 'identify-panel',
          'aria-keyshortcuts': String(i + 1),
          onClick: () => select(m.id),
        }, t(m.key))));
      banner = h('div', { class: 's-identify__banner' });
      body = h('div', { class: 's-identify__body', role: 'tabpanel', id: 'identify-panel' });

      mount(methods,
        seg, banner, body,
        // Сверка лица — только если в профиле есть лицо: предлагать способ,
        // который заведомо не сработает, хуже, чем не предлагать (§6).
        found.face
          ? h('div', { class: 's-identify__alt' },
              h('button', { class: 'btn btn--ghost btn--s', type: 'button', onClick: drawFace },
                t('identify.noPhone')))
          : null);

      /* role="tab" обещает скринридеру стрелки, Home и End — обещание
         выполняет общий хелпер (§6: свой контрол — с полной клавиатурной
         моделью). Цифры 1/2/3 остаются невидимыми: на вкладке цифра читалась
         бы как шаг мастера. */
      tabs = makeTablist(seg, {
        onSelect: btn => select(METHODS[[...seg.children].indexOf(btn)].id),
      });
    }
    select(id);
  }

  function select(id) {
    halt();
    method = id;
    lastMethod = id;
    banner.replaceChildren();

    [...seg.children].forEach((btn, i) =>
      btn.setAttribute('aria-selected', String(METHODS[i].id === id)));
    body.setAttribute('aria-labelledby', `identify-tab-${id}`);
    tabs.sync();
    // Выбрали цифрой, пока фокус стоял на вкладках, — фокус идёт за выбором,
    // иначе кольцо фокуса осталось бы на вкладке, которая уже не выбрана.
    if (seg.contains(document.activeElement)) seg.querySelector('[aria-selected="true"]')?.focus();

    stop = { qr: mountQr, push: mountPush, otp: mountOtp }[id]() || (() => {});
  }

  /* ---------- QR-код (§6/S2) ----------
     Код появляется сразу, без кнопки: QR — это уже ожидание, и скрипт
     разговора нужен тут же. Код живёт две минуты и обновляется сам: «код
     истёк, нажмите обновить» заставляло оператора следить за таймером,
     пока гражданин ищет приложение. */
  function mountQr() {
    let alive = true;
    let stopTtl = () => {};

    const code = h('div', { class: 'qr__code' });
    const caption = h('span', { class: 'qr__caption' }, t('common.loading'));

    mount(body,
      h('div', { class: 'qr qr--embed' }, code, caption),
      coach('identify.qrStep1', 'identify.qrStep2'));

    issue();
    (async () => { const res = await identify.wait('qr'); if (alive) done(res); })();

    async function issue() {
      stopTtl();
      code.classList.add('is-loading');
      try {
        const r = await identify.qr();
        if (!alive) return;
        mount(code, qrSvg(r.challenge, { label: t('identify.qrAlt') }));
        stopTtl = countdown(r.ttlMs,
          left => { caption.textContent = t('identify.qrTtl', { t: mmss(left) }); },
          () => { if (alive) issue(); });
      } catch (e) {
        if (alive) fail(e);
      } finally {
        if (alive) code.classList.remove('is-loading');
      }
    }

    return () => { alive = false; stopTtl(); };
  }

  /* ---------- уведомление в IMZO (§6/S2) ----------
     Номер вводить не нужно: уведомление уходит на устройство, привязанное к
     найденному профилю. Отправили — ждём, пока гражданин подтвердит у себя. */
  function mountPush() {
    let alive = true;
    let stopResend = () => {};

    const lead = h('p', { class: 's-identify__lead' }, t('identify.pushLead'));
    const send = h('button', { class: 'btn btn--primary', type: 'button', onClick: go },
      t('identify.pushSend'));
    const status = h('div', { class: 's-identify__status' });

    mount(body, lead, send, status);

    async function go() {
      banner.replaceChildren();
      setLoading(send, true);
      try {
        const r = await identify.push();
        if (!alive) return;
        waiting(r);
      } catch (e) {
        if (alive) fail(e);
      } finally { if (alive) setLoading(send, false); }
    }

    function waiting(r) {
      lead.hidden = true;
      send.hidden = true;

      const resend = h('button', { class: 'btn btn--ghost btn--s', type: 'button' });
      const arm = ms => {
        stopResend();
        stopResend = resendCooldown(resend, ms, 'identify.pushResend', 'identify.pushResendIn');
      };
      resend.addEventListener('click', async () => {
        banner.replaceChildren();
        try {
          const again = await identify.push();
          if (alive) arm(again.resendAfterMs);
        } catch (e) { if (alive) fail(e); }
      });
      arm(r.resendAfterMs);

      mount(status,
        h('div', { class: 'row g-3 s-identify__waiting' },
          icon('bell', { size: 20 }),
          h('span', { class: 'small' }, t('identify.pushWaiting'))),
        h('div', { class: 'row center' }, resend),
        coach('identify.pushStep1', 'identify.pushStep2'));

      (async () => { const res = await identify.wait('push'); if (alive) done(res); })();
    }

    return () => { alive = false; stopResend(); };
  }

  /* ---------- код по SMS (§6/S2) ----------
     Код уходит на номер профиля — даже если искали по паспорту. Маска номера
     стоит до отправки: «код придёт на •••• 45 67» — это вопрос гражданину
     «этот телефон у вас с собой?», и задать его нужно до, а не после. */
  function mountOtp() {
    let alive = true;
    let stopResend = () => {};

    const lead = h('p', { class: 's-identify__lead' }, t('identify.otpLead', { to: found.sentTo }));
    const send = h('button', { class: 'btn btn--primary', type: 'button', onClick: go },
      t('identify.smsSend'));
    const codeBox = h('div', { class: 'stack g-4 s-identify__code', hidden: true });

    mount(body, lead, send, codeBox);

    async function go() {
      banner.replaceChildren();
      setLoading(send, true);
      try {
        const r = await identify.sms();
        if (!alive) return;
        askCode(r);
      } catch (e) {
        if (alive) fail(e);
      } finally { if (alive) setLoading(send, false); }
    }

    function askCode(r) {
      lead.hidden = true;
      send.hidden = true;

      const cells = otpInput(code => confirm(code));
      const confirmBtn = h('button', {
        class: 'btn btn--primary s-identify__confirm', type: 'button',
        onClick: () => confirm(cells.value()),
      }, t('identify.otpConfirm'));
      const err = h('span', { class: 'field__error', role: 'alert', hidden: true });

      const resend = h('button', { class: 'btn btn--ghost btn--s', type: 'button' });
      const arm = () => {
        stopResend();
        stopResend = resendCooldown(resend, 60_000, 'identify.smsResend', 'identify.smsResendIn');
      };
      resend.addEventListener('click', async () => {
        try { await identify.sms(); if (alive) { arm(); cells.clear(); } } catch (e) { if (alive) fail(e); }
      });
      arm();

      mount(codeBox,
        h('span', { class: 'label' }, t('identify.otpSentTo', { to: r.sentTo })),
        cells.el, err, confirmBtn,
        h('div', { class: 'row center' }, resend));

      codeBox.hidden = false;
      cells.focus();

      async function confirm(code) {
        err.hidden = true;
        cells.error(false);
        setLoading(confirmBtn, true);
        try {
          done(await identify.smsConfirm(code));
        } catch (e2) {
          if (!alive) return;
          cells.error(true);
          err.hidden = false;
          err.textContent = errText(e2);
          cells.clear();
        } finally { if (alive) setLoading(confirmBtn, false); }
      }
    }

    return () => { alive = false; stopResend(); };
  }

  /* ---------- нет телефона с собой → сверка лица (§6/S2) ----------
     Запасной путь: лицо сверяется 1:1 с профилем, который нашёл поиск. Лицо
     у профиля есть, потому что регистрация в ЦОН снимает его третьим шагом
     (§6/S2b), — схема приёма замыкается: что собрали при регистрации, тем и
     входят без телефона. Плитка неподвижна (§3 live-scan): это частая
     проверка у окна, а не съёмка. */
  function drawFace() {
    halt();
    method = 'face';
    let alive = true;

    const frame = facescanFrame({ showStroke: false });
    const caption = h('span', { class: 'facescan__caption' }, t('common.loading'));
    const tile = h('div', { class: 'facescan facescan--embed' }, frame, caption);
    banner = h('div', { class: 's-identify__banner' });

    mount(methods,
      h('div', { class: 's-identify__face-head' },
        h('button', {
          class: 'btn btn--ghost btn--s s-identify__back', type: 'button',
          onClick: () => drawMethods(lastMethod),
        }, icon('chev-l', { size: 20 }), t('identify.otherMethods'))),
      banner,
      tile);
    seg = null;

    (async () => {
      try {
        await identify.face();
        if (!alive) return;
        tile.classList.add('facescan--scanning');
        caption.textContent = t('identify.faceScan');
        done(await identify.wait('face'));
      } catch (e) { if (alive) fail(e); }
    })();

    stop = () => { alive = false; };
  }

  /* ============================================================
     Ступень 2б · профиля нет → регистрация (§6/S2b)
     ============================================================ */
  function drawMissing(r) {
    found = null;
    live.textContent = t('identify.missing');

    // Номер из поиска переезжает в регистрацию: первый её шаг — подтвердить
    // именно его кодом, и набирать его второй раз незачем. Паспорт не
    // переезжает: его серию даст скан, а не набранная руками строка.
    const phone = r.kind === 'phone' ? LOOKUP.phone(drafts.phone).value : '';
    const start = h('button', {
      class: 'btn btn--primary', type: 'button',
      onClick: () => dispatch('NOT_REGISTERED', { phone }),
    }, t('identify.enrollStart'));

    mount(card,
      summary('missing'),
      h('div', { class: 's-identify__enroll' },
        h('p', { class: 's-identify__lead' }, t('identify.enrollLead')),
        h('ol', { class: 's-identify__plan' },
          ...REGISTRATION.map(k => h('li', {},
            h('span', { class: 's-identify__plan-title' }, t(`enroll.step.${k}`)),
            h('span', { class: 's-identify__plan-hint' }, t(`identify.plan.${k}`))))),
        start,
        // Искали по телефону и не нашли — человек мог зарегистрироваться с
        // другим номером. Это ловится поиском по паспорту за секунду, а не
        // дублем ИНН на втором шаге регистрации.
        r.kind === 'phone'
          ? h('p', { class: 's-identify__hint' },
              h('span', {}, t('identify.otherNumber')),
              h('button', {
                class: 'btn btn--ghost btn--s', type: 'button',
                onClick: () => drawFind('passport'),
              }, t('identify.searchPassport')))
          : null),
      demoFoundRow(),
      guestRow());
    start.focus();
  }

  /* Демо: в реестре прототипа один гражданин, и любой другой ввод ведёт
     сюда. Эта строка переводит приём на ветку «профиль найден» с тем же
     набранным значением — показать вход зарегистрированного можно, не зная
     демо-номера. Подписана «Демо», чтобы не читаться рабочим действием. */
  function demoFoundRow() {
    const btn = h('button', {
      class: 'btn btn--ghost btn--s', type: 'button',
      onClick: async () => {
        setLoading(btn, true);
        try {
          const r = await identify.assumeFound(by);
          if (!dead) drawFound(r);
        } catch (err) {
          if (!dead) { setLoading(btn, false); mount(card, summary('missing'), errorBanner(err)); }
        }
      },
    }, t('identify.demoFound'));
    return h('div', { class: 's-identify__demo' },
      h('span', { class: 'demo-data-badge' }, t('identify.demoBadge')), btn);
  }

  /* ============================================================
     Общее
     ============================================================ */
  function halt() {
    stop();
    stop = () => {};
    identify.abort();          // прошлый способ больше никого не ждёт
  }

  // Гостевой вход — тихая строка внутри карточки, не вторая панель (§10.6).
  // Он нужен до поиска и когда профиля нет; найденный профиль — уже не повод
  // обслуживать человека анонимно.
  function guestRow() {
    return h('div', { class: 'guest-identify' },
      h('button', { class: 'btn btn--ghost btn--s', type: 'button', onClick: () => dispatch('GUEST') },
        t('identify.guestCta')));
  }

  function done(res) {
    if (!res || dead) return;
    dispatch('ID_SENT', { method, maskedName: res.maskedName, scopes: res.scopes });
  }

  /* Часть ошибок — не тупик, а развилка: «уведомление не дошло» оставляет
     человека у окна, и его можно впустить кодом из SMS; «лицо не совпало»
     чаще всего лечится повтором (блик, отвёл взгляд). */
  function fail(e) {
    if (dead) return;
    const actions = {
      PUSH_UNDELIVERED: [['identify.tryOtp', () => drawMethods('otp')]],
      FACE_NO_MATCH: [['identify.faceRetry', drawFace]],
    }[e.code] || [];

    mount(banner, errorBanner(e,
      ...actions.map(([key, fn]) =>
        h('button', { class: 'btn btn--secondary btn--s', type: 'button', onClick: fn }, t(key)))));
  }
}

function errorBanner(e, ...actions) {
  const offline = e.code === 'OFFLINE';
  return h('div', { class: `banner banner--${offline ? 'warn' : 'error'}` },
    icon('info'),
    h('span', { class: 'banner__text' }, errText(e)),
    ...actions);
}

/* Скрипт разговора — только в состоянии ожидания. Нумерован, потому что
   оператор читает его вслух гражданину; без панели и без крупных точек,
   которые на вкладках читались как второй мастер. */
function coach(...keys) {
  return h('div', { class: 's-identify__coach' },
    h('p', { class: 'label' }, t('identify.coach')),
    h('ol', { class: 's-identify__steps' },
      ...keys.map(k => h('li', {}, t(k)))));
}
