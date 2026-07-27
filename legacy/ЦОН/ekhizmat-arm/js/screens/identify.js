/* ============================================================
   S2 · Идентификация гражданина · #/identify  (§6/S2)

   Экран-ворота: центрированная зона 720px, никакого шелла-шума.

   Приёмка §6/S2: «до подтверждения согласия интерфейс не показывает ничего,
   кроме маскированного ФИО из отклика идентификации». Поэтому отклик
   идентификации кладётся в store как есть — {method, maskedName} — и объекта
   citizen здесь нет и быть не может: он появляется только на GRANTED (§2.3.1).

   Ответ гражданина (скан QR, открытие push) приходит не из await на запрос, а
   событием — за гражданина играет демо-панель (§11.5). Отсюда identify.wait().
   ============================================================ */
import { h, mount, icon } from '../ui.js';
import { t, errText } from '../i18n.js';
import { dispatch } from '../store.js';
import { identify } from '../mock/api.js';
import { maskedField, otpInput, setLoading } from '../fields.js';

/* Три способа входа возвращающегося гражданина (§6/S2). Порядок = порядок
   удобства: push будит приложение в кармане, Face ID снимает лицо у окна, SMS —
   резерв для того, у кого приложение не открывается. QR убран: уведомление в
   приложение делает ту же работу (гражданин подтверждает у себя), не заставляя
   наводить камеру на экран оператора. */
const METHODS = [
  { id: 'push', key: 'identify.push', icon: 'bell' },
  { id: 'face', key: 'identify.face', icon: 'face' },
  { id: 'otp',  key: 'identify.otp',  icon: 'chat' },
];

export function renderIdentify(host) {
  let dead = false;
  let method = 'push';
  let stopMethod = () => {};          // таймеры и ожидания текущего метода

  const banner = h('div', { class: 's-identify__banner' });
  const body = h('div', { class: 's-identify__body' });

  const seg = h('div', { class: 'seg', role: 'tablist', 'aria-label': t('identify.method') },
    ...METHODS.map((m, i) => h('button', {
      class: 'seg__item', role: 'tab', type: 'button',
      'aria-selected': String(m.id === method),
      onClick: () => select(m.id),
    }, icon(m.icon, { size: 16 }), t(m.key), h('kbd', { class: 'seg__kbd' }, String(i + 1)))));

  mount(host,
    h('div', { class: 'canvas s-gate s-identify' },
      h('h1', { class: 'h2' }, t('identify.title')),
      h('p', { class: 'body-l ink-2 s-gate__lead' }, t('identify.lead')),
      banner,
      seg,
      body,
      h('div', { class: 'row center s-identify__foot' },
        h('button', {
          class: 'btn btn--ghost',
          onClick: () => dispatch('CANCEL'),
        }, t('common.cancelVisit')))));

  // 1/2/3 — переключение метода (§11.6). Клавиши живут здесь, а не в app.js:
  // они осмысленны только на этом экране, и глобальный обработчик пришлось бы
  // учить состоянию машины, которое экран и так знает.
  const onKey = e => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);
    if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
    const i = ['1', '2', '3'].indexOf(e.key);
    if (i === -1 || i >= METHODS.length) return;
    e.preventDefault();
    select(METHODS[i].id);
  };
  addEventListener('keydown', onKey);

  select('push');

  return () => {
    dead = true;
    stopMethod();
    identify.abort();
    removeEventListener('keydown', onKey);
  };

  /* ---------- переключение метода ---------- */
  function select(id) {
    stopMethod();
    identify.abort();                // прошлый метод больше никого не ждёт
    method = id;
    banner.replaceChildren();

    [...seg.children].forEach((btn, i) =>
      btn.setAttribute('aria-selected', String(METHODS[i].id === id)));

    stopMethod = { push: mountPush, face: mountFace, otp: mountOtp }[id]() || (() => {});
  }

  /* ---------- успех любого метода → S3 или S2b ---------- */
  function done(res) {
    if (!res || dead) return;

    // §6/S2b — телефон подтверждён, но гражданина в eKhizmat нет. Это не сбой
    // идентификации, а другой сценарий приёма: регистрация. Развилка стоит
    // здесь, а не внутри метода, потому что она общая для всех методов —
    // «сервер» отвечает одинаково, чем бы гражданина ни спрашивали.
    if (res.registered === false) {
      return dispatch('NOT_REGISTERED', { phone: res.phone });
    }

    dispatch('ID_SENT', { method, maskedName: res.maskedName, scopes: res.scopes });
  }

  function fail(e) {
    if (dead) return;
    const offline = e.code === 'OFFLINE';

    // Часть ошибок этого экрана — не тупик, а развилка: у них есть продолжение,
    // а не только объяснение. «Гражданин не найден» / «push не доставлен» /
    // «лицо не распознано» — все три оставляют человека у окна, и его можно
    // опознать по SMS: он единственный метод, которому не нужны ни приложение,
    // ни биометрия. Кнопка ведёт туда же, куда и регистрация начинается, — на
    // подтверждённый телефон (§6/S2b).
    const toOtp = ['CITIZEN_NOT_FOUND', 'PUSH_UNDELIVERED', 'FACE_NO_MATCH'].includes(e.code);

    // «Лицо не распознано» чаще всего лечится повтором (блик, гражданин отвёл
    // взгляд), поэтому первый выход — попробовать снова тем же методом.
    const retry = e.code === 'FACE_NO_MATCH';

    mount(banner, h('div', { class: `banner banner--${offline ? 'warn' : 'error'}` },
      icon('info'),
      h('span', { class: 'banner__text' }, errText(e)),
      retry
        ? h('button', { class: 'btn btn--secondary btn--s', onClick: () => select('face') },
            t('identify.faceRetry'))
        : null,
      toOtp
        ? h('button', { class: 'btn btn--secondary btn--s', onClick: () => select('otp') },
            t('identify.tryOtp'))
        : null));
  }

  /* ---------- метод: push-уведомление (§6/S2) ----------
     Уведомление уходит в приложение гражданина, поэтому нужен его номер: в
     отличие от лица, push некуда послать, не зная кому. Отправили — ждём, пока
     гражданин подтвердит у себя (за него в демо играет панель, §11.5). */
  function mountPush() {
    const contact = maskedField({ label: t('identify.phone'), kind: 'phone' });
    const send = h('button', { class: 'btn btn--primary', type: 'submit' }, t('identify.pushSend'));
    const status = h('div', { class: 's-identify__status' });

    const form = h('form', {
      class: 'panel stack g-4 s-identify__form', novalidate: true,
      onSubmit: async e => {
        e.preventDefault();
        banner.replaceChildren();
        setLoading(send, true);
        try {
          const r = await identify.push(contact.raw());
          if (dead || method !== 'push') return;
          waitPush(r);
        } catch (e2) { fail(e2); } finally { if (!dead) setLoading(send, false); }
      },
    },
      contact.el, send, status);

    mount(body, form, steps('identify.pushStep1', 'identify.pushStep2', 'identify.pushStep3'));
    contact.input.focus();

    // Push отправлен: поле замка́ём (номер уже ушёл на сервер), показываем
    // ожидание и кнопку «отправить повторно». Само ожидание резолвится
    // событием от гражданина, а не таймером, — как раньше у QR.
    function waitPush(r) {
      send.hidden = true;
      contact.input.readOnly = true;

      const resend = h('button', {
        class: 'btn btn--ghost btn--s', type: 'button',
        onClick: () => identify.push(contact.raw()).catch(fail),
      }, icon('refresh', { size: 20 }), t('identify.pushResend'));

      mount(status,
        h('div', { class: 'row g-3 s-identify__waiting' },
          icon('bell', { size: 20 }),
          h('span', { class: 'small' }, t('identify.pushWaiting', { to: r.sentTo }))),
        h('div', { class: 'row center' }, resend));

      (async () => { done(await identify.wait('push')); })();
    }

    return () => {};
  }

  /* ---------- метод: Face ID (§6/S2) ----------
     Лицо само приносит личность — поиск 1:N по реестру биометрии, вводить
     ничего не нужно (как при скане QR). Совпадение резолвит панель (§11.5);
     «лицо не распознано» — тумблер §7, и fail() выводит на повтор и SMS. */
  function mountFace() {
    const frame = h('div', { class: 'facescan__frame' }, icon('face', { size: 72 }));
    const caption = h('span', { class: 'facescan__caption' }, t('common.loading'));
    const tile = h('div', { class: 'facescan' }, frame, caption);

    mount(body,
      tile,
      h('div', { class: 'stack g-3' },
        steps('identify.faceStep1', 'identify.faceStep2', 'identify.faceStep3'),
        // Дверь в регистрацию видна и здесь: у гражданина без учётной записи
        // лица в реестре нет по определению, и ждать распознавания ему незачем.
        h('button', {
          class: 'btn btn--ghost btn--s s-identify__noacc',
          onClick: () => select('otp'),
        }, icon('user-add', { size: 20 }), t('identify.noAccount'))));

    (async () => {
      try {
        await identify.face();
        if (dead || method !== 'face') return;

        tile.classList.add('facescan--scanning');    // рамка + бегущая линия (§8)
        caption.textContent = t('identify.faceScan');

        done(await identify.wait('face'));
      } catch (e) { fail(e); }
    })();

    return () => {};
  }

  /* ---------- метод: OTP-резерв (§6/S2) ---------- */
  function mountOtp() {
    const contact = maskedField({ label: t('identify.phone'), kind: 'phone' });
    const send = h('button', { class: 'btn btn--primary', type: 'submit' }, t('identify.smsSend'));

    const codeBox = h('div', { class: 'stack g-4', hidden: true });

    const form = h('form', {
      class: 'panel stack g-4 s-identify__form', novalidate: true,
      onSubmit: async e => {
        e.preventDefault();
        banner.replaceChildren();
        setLoading(send, true);
        try {
          const r = await identify.sms(contact.raw());
          if (dead || method !== 'otp') return;
          askCode(r);
        } catch (e2) { fail(e2); } finally { if (!dead) setLoading(send, false); }
      },
    },
      // §6/S2 — «Явно помечен как резервный».
      h('p', { class: 'small ink-faint' }, t('identify.otpFallback')),
      contact.el, send, codeBox);

    mount(body, form, steps('identify.otpStep1', 'identify.otpStep2', 'identify.otpStep3'));
    contact.input.focus();

    function askCode(r) {
      send.hidden = true;
      contact.input.readOnly = true;

      // §6/S2b — оператор узнаёт о регистрации ДО того, как гражданин
      // продиктует код, а не после. Иначе он говорит «сейчас войдём», а
      // экран через десять секунд отвечает «заполняйте паспорт»: обещание,
      // данное вслух живому человеку, дороже одного лишнего банера.
      if (r.registered === false) {
        mount(banner, h('div', { class: 'banner banner--info' },
          icon('user-add'),
          h('span', { class: 'banner__text' }, t('identify.newCitizen'))));
      }

      const cells = otpInput(code => confirm(code));
      const confirmBtn = h('button', {
        class: 'btn btn--primary', type: 'button',
        onClick: () => confirm(cells.value()),
      }, r.registered === false ? t('identify.otpConfirmNew') : t('identify.otpConfirm'));

      const err = h('span', { class: 'field__error', role: 'alert', hidden: true });

      mount(codeBox,
        h('span', { class: 'label' }, t('identify.otpSentTo', { to: r.sentTo })),
        cells.el, err, confirmBtn);

      codeBox.hidden = false;
      cells.focus();

      async function confirm(code) {
        err.hidden = true;
        cells.error(false);
        setLoading(confirmBtn, true);
        try {
          done(await identify.smsConfirm(code));
        } catch (e2) {
          if (dead) return;
          cells.error(true);
          err.hidden = false;
          err.textContent = errText(e2);
          cells.clear();
        } finally { if (!dead) setLoading(confirmBtn, false); }
      }
    }

    return () => {};
  }
}

/* Инструкция справа (§6/S2). Нумерованная, потому что оператор читает её
   вслух гражданину — это скрипт разговора, а не украшение. */
function steps(...keys) {
  return h('ol', { class: 'panel s-identify__steps stack g-3' },
    ...keys.map((k, i) => h('li', { class: 'row-start g-3' },
      h('span', { class: 'step__dot' }, String(i + 1)),
      h('span', { class: 'grow' }, t(k)))));
}
