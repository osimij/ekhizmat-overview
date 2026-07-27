/* ============================================================
   S3 · Ожидание согласия · #/consent  (§6/S3)

   Оператор видит статус и объём запрошенного — и ничего больше.

   Приёмка §6/S3: «до события GRANTED в памяти нет объекта citizen». Это
   держится не аккуратностью экрана, а конструкцией: citizen приезжает в
   payload GRANTED (store.js), а сюда «сервер» отдаёт только маску имени.
   Список скоупов ниже — это то, что БУДЕТ доступно, а не данные.

   Церемония успеха (§6/S3: кольцо → галочка 400ms, тост, переход через 600ms)
   играется ДО dispatch('GRANTED'): после него app становится SESSION, роутер
   уводит на S4, и играть было бы уже негде и некому.
   ============================================================ */
import { h, mount, icon, ring, toast, mmss } from '../ui.js';
import { t, errText } from '../i18n.js';
import { dispatch, getState, subscribe } from '../store.js';
import { consent } from '../mock/api.js';
import { countdown } from '../clock.js';
import { SCOPES } from '../mock/data.js';

/* Пороги кольца для 120-секундного согласия. У сессии пороги заданы в §3.2
   (5:00 / 1:00) — здесь их нет, поэтому берём тот же смысл в масштабе:
   янтарь, когда «уже пора бы», красный, когда «сейчас истечёт». */
const WARN_MS = 30_000;
const DANGER_MS = 10_000;

export function renderConsent(host) {
  let dead = false;
  let stopTimer = () => {};
  let lastStatus = null;

  const card = h('div', { class: 'panel s-consent__card' });

  mount(host, h('div', { class: 'canvas s-gate s-consent' }, card));

  const unsub = subscribe((_, event) => {
    // Статус мог сменить кто угодно: демо-панель (§11.5) дёргает те же
    // события машины, что и этот экран. Перерисовываемся по состоянию, а не
    // по своему представлению о нём.
    //
    // RETRY из waiting — особый случай (Д-06): статус остаётся waiting
    // (waiting→waiting по §2.2), значит по смене статуса перерисовки бы не
    // случилось, новый consent.request() не ушёл бы, а старое кольцо всё
    // тикало бы к таймауту. Поэтому на RETRY перерисовываемся по событию:
    // draw() пере-выпускает запрос и регистрирует новое ожидание.
    const st = getState().consent?.status;
    if (event === 'RETRY') return draw();
    if (st && st !== lastStatus) draw();
  });

  draw();

  return () => {
    dead = true;
    stopTimer();
    consent.abort();
    unsub();
  };

  /* ---------- рендер по статусу ---------- */
  function draw() {
    stopTimer();
    const st = getState();
    const status = st.consent?.status || 'waiting';
    lastStatus = status;

    if (status === 'waiting') return drawWaiting(st);
    if (status === 'denied') return drawDenied(st);
    if (status === 'timeout') return drawTimeout(st);
  }

  /* ---------- ожидание ---------- */
  function drawWaiting(st) {
    const r = ring({ label: mmss(120_000), frac: 1 });
    const live = h('p', { class: 'sr-only', 'aria-live': 'polite' });

    mount(card,
      r,
      h('h1', { class: 'h3 s-consent__title' }, t('consent.waiting')),
      h('p', { class: 'small' }, `${st.identify?.maskedName || ''} · ${t(`consent.via.${st.identify?.method || 'qr'}`)}`),
      scopeList(st.consent?.scopes || []),
      h('p', { class: 'small ink-faint s-consent__note' }, t('consent.note')),
      live,
      h('div', { class: 'row center g-3 s-consent__foot' },
        h('button', { class: 'btn btn--ghost', onClick: retry }, icon('refresh', { size: 20 }), t('consent.resend')),
        h('button', { class: 'btn btn--danger', onClick: () => dispatch('CANCEL') }, t('common.cancelVisit'))));

    request(r, live);
  }

  async function request(r, live) {
    try {
      const req = await consent.request(getState().consent?.scopes);
      if (dead) return;

      let announced = 0;
      stopTimer = countdown(req.ttlMs,
        (left, frac) => {
          const tone = left <= DANGER_MS ? 'danger' : left <= WARN_MS ? 'warn' : '';
          r.update(frac, mmss(left), tone);

          // §6/S3 — «aria-live polite каждые 30с». Кольцо тикает каждые 250ms;
          // озвучивать это скринридеру значило бы сделать экран неслышимым.
          const bucket = Math.floor((req.ttlMs - left) / 30_000);
          if (bucket > announced) {
            announced = bucket;
            live.textContent = t('consent.stillWaiting', { t: mmss(left) });
          }
        },
        () => { if (!dead) dispatch('TIMEOUT'); });

      const res = await consent.wait();
      if (!res || dead) return;

      stopTimer();
      if (res.status === 'granted') return celebrate(res);
      dispatch(res.status === 'denied' ? 'DENIED' : 'TIMEOUT');
    } catch (e) {
      if (dead) return;
      mount(card,
        h('div', { class: 'hero-mark hero-mark--error' }, icon('info')),
        h('h1', { class: 'h3 s-consent__title' }, t('consent.failed')),
        h('p', { class: 'small' }, errText(e)),
        h('div', { class: 'row center g-3 s-consent__foot' },
          h('button', { class: 'btn btn--primary', onClick: retry }, t('common.retry')),
          h('button', { class: 'btn btn--ghost', onClick: () => dispatch('CANCEL') }, t('common.cancelVisit'))));
    }
  }

  /* ---------- согласие получено (§6/S3, §8) ---------- */
  function celebrate(res) {
    consent.commit(res.scopes);       // «сервер» открывает доступ — до dispatch

    card.classList.add('is-granted');
    mount(card,
      h('div', { class: 'hero-mark hero-mark--draw' }, icon('check')),
      h('h1', { class: 'h3 s-consent__title' }, t('consent.granted')),
      h('p', { class: 'small ink-faint' }, t('consent.grantedHint')));

    toast(t('consent.granted'), 'success');

    const id = setTimeout(() => {
      if (dead) return;
      dispatch('GRANTED', { citizen: res.citizen, scopes: res.scopes });
    }, 600);
    stopTimer = () => clearTimeout(id);
  }

  /* ---------- отказ (§6/S3 состояния) ----------
     Набор кнопок тот же, что и в таймауте, и это разрешение противоречия
     §6/S3 против §7 (Д-17): §6 давал в отказе только «повтор / завершить»,
     §7 требовал ещё «сменить метод». Приводим к §7 — и к тому, что уже
     написано в самой машине (store.js: «DENIED и TIMEOUT … оставляют
     оператора на S3 с выбором Попробовать снова / Сменить метод /
     Завершить»). Причина отказа оператору неизвестна: гражданин мог не
     разобраться с QR, и предложить другой метод — самое полезное, что можно
     сделать, не заставляя начинать приём заново. */
  function drawDenied(st) {
    mount(card,
      h('div', { class: 'hero-mark hero-mark--error' }, icon('x')),
      h('h1', { class: 'h3 s-consent__title' }, t('consent.denied')),
      h('p', { class: 'small' }, t('consent.deniedHint')),
      h('div', { class: 'row center g-3 s-consent__foot' },
        h('button', { class: 'btn btn--primary', onClick: retry }, t('common.retry')),
        h('button', {
          class: 'btn btn--secondary',
          onClick: () => { dispatch('CANCEL'); dispatch('START'); },
        }, t('consent.changeMethod')),
        h('button', { class: 'btn btn--ghost', onClick: () => dispatch('CANCEL') }, t('consent.finish'))));
  }

  /* ---------- таймаут (§6/S3 состояния) ---------- */
  function drawTimeout(st) {
    mount(card,
      h('div', { class: 'hero-mark hero-mark--warn' }, icon('clock')),
      h('h1', { class: 'h3 s-consent__title' }, t('consent.timeout')),
      h('p', { class: 'small' }, t('consent.timeoutHint')),
      h('div', { class: 'row center g-3 s-consent__foot' },
        h('button', { class: 'btn btn--primary', onClick: retry }, t('consent.resend')),
        // «Сменить метод» = вернуться на S2. Из CONSENT_WAIT в IDENTIFY машина
        // §2.2 не ходит, поэтому это CANCEL + START — два легальных перехода,
        // а не один самодельный.
        h('button', {
          class: 'btn btn--secondary',
          onClick: () => { dispatch('CANCEL'); dispatch('START'); },
        }, t('consent.changeMethod')),
        h('button', { class: 'btn btn--ghost', onClick: () => dispatch('CANCEL') }, t('consent.finish'))));
  }

  function retry() {
    consent.abort();
    dispatch('RETRY');
  }
}

/* «БУДЕТ ДОСТУПНО ОПЕРАТОРУ» — не данные, а список того, что откроется. */
function scopeList(ids) {
  return h('div', { class: 's-consent__scopes stack g-2' },
    h('span', { class: 'label' }, t('consent.willBeAvailable')),
    h('div', { class: 'check-list' },
      ...ids.map(id => h('div', { class: 'check-item check-item--done' },
        icon('check'),
        h('span', {}, SCOPES[id]?.name || id)))));
}
