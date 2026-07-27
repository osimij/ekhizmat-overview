/* ============================================================
   S9 · Статус сессии — сквозной слой (§6/S9, §7).

   Не экран, а три вещи поверх всех экранов сессии: таймер TTL с порогами,
   модал завершения и реакция на отзыв согласия.

   Живёт отдельным модулем, а не в shell.js, по одной причине: TTL обязан
   тикать независимо от того, какой экран сейчас смонтирован, и переживать
   блокировку (§6/S9c — «Сессия гражданина продолжает тикать»). Таймер,
   принадлежащий экрану, умер бы вместе с ним на первом же GOTO.

   Здесь же — единственное место, где «сервер» узнаёт о конце приёма. Подписка
   на store ловит ВСЕ выходы из сессии (кнопка, F9, TTL=0, отзыв, демо-панель),
   поэтому отозвать доступ мимо этого кода нельзя: даже переход, дёрнутый
   руками из демо-панели, приведёт api.session.end() в исполнение.
   ============================================================ */
import { h, mount, icon, toast, modal, openLayer, ring, mmss, maskName } from './ui.js';
import { t, errText } from './i18n.js';
import { getState, subscribe, dispatch, patchSession, ST } from './store.js';
import { session as api, consent } from './mock/api.js';
import { stopwatch, countdown } from './clock.js';

const TTL_MS = 30 * 60_000;    // §6/S9c — «TTL сессии: 30:00»
const WARN_MS = 5 * 60_000;    // «При 5:00 — полоса amber»
const DANGER_MS = 60_000;      // «при 1:00 — red + модал "Продлить приём?"»

let stop = () => {};
let elapsed = 0;
let threshold = 0;             // 0 норма · 1 amber · 2 red — чтобы не орать дважды
let extendShown = false;
let paintTimer = () => {};

export function ttlLeft() {
  return getState().app === ST.SESSION ? Math.max(0, TTL_MS - elapsed) : TTL_MS;
}

/* ---------- слои под замком (§6/S9c, Д-05) ----------
   #layers и #toasts лежат ВНЕ #shell, поэтому inert и blur замка на них не
   действуют. Модал, открытый под замком, оказывается кликабелен без re-auth:
   «Продлить приём?» продлевал бы сессию гражданина мимо пароля — замок на то
   и замок (app.js). Значит, под замком новых слоёв не открываем.

   Но и не теряем. TTL и отзыв согласия под замком случаются по §6/S9c, и
   оператор, вернувшись, обязан узнать, куда делся приём: пустая главная без
   объяснения читается как падение АРМ. Поэтому откладываем до UNLOCK.

   Пороги TTL сюда не попадают и не нуждаются в очереди — они откладываются
   сами: тик под замком не трогает threshold, и первый же тик после re-auth
   объявит порог и предложит продление. */
const deferredLayers = [];

function deferUnderLock(fn) {
  if (getState().app !== ST.LOCKED) return false;
  deferredLayers.push(fn);
  return true;
}

function flushDeferred() {
  for (const fn of deferredLayers.splice(0)) fn();
}

/* Рисовалку полосы получаем снаружи, а не импортируем из shell.js. Импорт
   замкнул бы кольцо (shell → session за endVisit, session → shell за
   paintTimer): ES-модули такой цикл переживут, но читать его будет некому.
   Кто рисует таймер — дело шелла, кто его считает — дело сессии. */
export function startSessionClock(onTick) {
  paintTimer = onTick || (() => {});

  subscribe((st, event) => {
    if (event === 'GRANTED') begin();
    if (event === 'END_CONFIRMED' || event === 'TTL_0' || event === 'REVOKED') finish(event);
    // Замок сняли — показываем то, что случилось, пока он был заперт (Д-05).
    if (event === 'UNLOCK') flushDeferred();
  });
}

/* ---------- ход сессии ---------- */
function begin() {
  stop();
  elapsed = 0;
  threshold = 0;
  extendShown = false;

  stop = stopwatch(ms => {
    elapsed = ms;
    const left = Math.max(0, TTL_MS - ms);
    paintTimer(left);

    if (left <= 0) { stop(); dispatch('TTL_0'); return; }

    // Под замком порогов не объявляем и модала продления не открываем (Д-05).
    // threshold намеренно не трогаем: порог не съеден, и первый же тик после
    // re-auth отработает его как обычно. TTL при этом продолжает тикать и
    // может дойти до нуля под замком — это выше и по §6/S9c так и надо.
    if (getState().app !== ST.SESSION) return;

    if (left <= DANGER_MS && threshold < 2) {
      threshold = 2;
      announce(t('session.ttlDanger'));
      offerExtend();
    } else if (left <= WARN_MS && threshold < 1) {
      threshold = 1;
      announce(t('session.ttlWarn'));
    }
  });
}

function finish(event) {
  stop();
  stop = () => {};
  elapsed = 0;
  threshold = 0;
  paintTimer(TTL_MS);

  // Доступ отзывает «сервер», а не экран: после этого citizen.get() отдаёт
  // 403 на всё, даже если бы где-то в DOM пережил старый компонент.
  api.end();

  if (event === 'REVOKED') return revoked();
  if (event === 'TTL_0') return expired();
  toast(t('end.note'), 'success', 6000);
}

/* §9 — таймер объявляется только на порогах, не каждую секунду. */
function announce(text) {
  const host = document.getElementById('live');
  if (host) host.textContent = text;
  toast(text, 'warn', 6000);
}

/* ---------- завершение приёма (§6/S9b) ---------- */
export function endVisit() {
  if (getState().app !== ST.SESSION) return;
  const name = getState().session?.citizen?.profile?.full;

  let close = () => {};
  close = modal({
    title: t('end.title'),
    body: h('div', { class: 'stack g-3' },
      h('p', {}, t('end.who', { name: maskName(name) })),
      h('ul', { class: 'stack g-2 end__list' },
        ...['end.p1', 'end.p2', 'end.p3'].map(k =>
          h('li', { class: 'row-start g-2' }, icon('check', { size: 20, cls: 'ink-faint' }), t(k))))),
    actions: [
      h('button', { class: 'btn btn--secondary', onClick: () => close() }, t('common.cancel')),
      h('button', {
        class: 'btn btn--danger',
        onClick: () => { close(); dispatch('END_CONFIRMED'); },
      }, t('end.confirm')),
    ],
  });
}

/* ---------- TTL истёк (§7) ---------- */
function expired() {
  // Под замком TTL истечь может (§6/S9c), а модал открыть — нет: покажем
  // после re-auth, иначе оператор вернётся на пустую главную без объяснения.
  if (deferUnderLock(expired)) return;

  let close = () => {};
  close = modal({
    title: t('ttl.title'),
    body: h('div', { class: 'stack g-3' },
      h('p', {}, t('ttl.body')),
      // §7 — «черновик автосохранён». Не обещание на будущее: автосохранение
      // S6 каждые 10с уже отправило его «на сервер», и при новом приёме того
      // же гражданина форма предложит восстановить.
      h('p', { class: 'small ink-faint' }, t('ttl.draft'))),
    actions: [h('button', { class: 'btn btn--primary', onClick: () => close() }, t('common.close'))],
  });
}

/* ---------- продление (§6/S9c) ---------- */
function offerExtend() {
  if (extendShown) return;
  extendShown = true;

  let close = () => {};
  const body = h('div', { class: 'stack g-4' });

  close = modal({ title: t('extend.title'), body, actions: [] });

  ask();

  function ask() {
    mount(body,
      h('p', {}, t('extend.body')),
      h('p', { class: 'small ink-faint' }, t('extend.hint')),
      h('div', { class: 'row g-3 s-scope__foot' },
        h('span', { class: 'spacer' }),
        h('button', { class: 'btn btn--secondary', onClick: () => close() }, t('extend.no')),
        h('button', { class: 'btn btn--primary', onClick: send }, icon('bell', { size: 20 }), t('extend.yes'))));
  }

  /* Продление = тот же разговор с гражданином, что и согласие (§6/S9c),
     поэтому идёт через consent.*, а не через отдельный «продлить» на сервере:
     доступ продлевает человек, а не кнопка оператора. */
  async function send() {
    const r = ring({ size: 's', label: mmss(60_000), frac: 1 });
    let stopRing = () => {};

    mount(body,
      h('div', { class: 'row center' }, r),
      h('p', { class: 'body center-text' }, t('extend.waiting')));

    try {
      const req = await api.extend();
      await consent.request(getState().session?.scopes || []);

      stopRing = countdown(req.ttlMs,
        (left, frac) => r.update(frac, mmss(left), left <= 10_000 ? 'danger' : ''),
        () => { stopRing(); denied(true); });

      const res = await consent.wait();
      if (!res) return;                    // модал закрыли
      stopRing();

      if (res.status === 'granted') return granted();
      denied(false);
    } catch (e) {
      stopRing();
      mount(body,
        h('div', { class: 'banner banner--error' }, icon('info'), h('span', { class: 'banner__text' }, errText(e))),
        h('div', { class: 'row g-3 s-scope__foot' },
          h('span', { class: 'spacer' }),
          h('button', { class: 'btn btn--secondary', onClick: () => close() }, t('common.close'))));
    }
  }

  function granted() {
    // Именно begin(), а не «обнулить elapsed»: секундомер копит своё время
    // внутри себя, и сброс внешней переменной он затрёт на первом же тике —
    // сессия «продлилась» бы ровно на четверть секунды.
    patchSession({ startedAt: Date.now() });
    begin();
    toast(t('extend.done'), 'success');
    close();
  }

  function denied(byTimeout) {
    mount(body,
      h('div', { class: 'row center' },
        h('div', { class: 'hero-mark hero-mark--error' }, icon(byTimeout ? 'clock' : 'x'))),
      h('p', { class: 'body center-text' }, t(byTimeout ? 'extend.timeout' : 'extend.denied')),
      h('p', { class: 'small ink-faint center-text' }, t('extend.deniedHint')),
      h('div', { class: 'row g-3 s-scope__foot' },
        h('span', { class: 'spacer' }),
        h('button', { class: 'btn btn--secondary', onClick: () => close() }, t('common.close'))));
  }
}

/* ---------- отзыв согласия (§7) ----------
   «Отзыв согласия гражданином в любой момент → немедленный wipe + красный
   full-screen интерстишл → S1». Wipe уже случился в dispatch — интерстишл
   объясняет оператору, почему у него только что исчез экран. Без него это
   выглядело бы как падение АРМ. */
function revoked() {
  // Тот же случай, что и TTL: гражданин может отозвать согласие, пока рабочее
  // место заперто (§7 — «в любой момент»). Интерстишл ждёт снятия замка.
  if (deferUnderLock(revoked)) return;

  const node = h('div', { class: 'interstitial', role: 'alertdialog', 'aria-modal': 'true' },
    h('div', { class: 'hero-mark hero-mark--error' }, icon('x')),
    h('h2', { class: 'h2' }, t('revoked.title')),
    h('p', { class: 'body-l' }, t('revoked.body')),
    h('button', { class: 'btn btn--secondary', onClick: () => close() }, t('common.close')));

  const close = openLayer(node);
  const id = setTimeout(() => close(), 5000);
  node.addEventListener('click', () => clearTimeout(id));
}
