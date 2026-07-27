/* ============================================================
   scope.js — прогрессивное согласие (§6/S4, §6/S5, §7).

   «Стартовый запрос — базовый скоуп. Дополнительные скоупы запрашиваются
   позже по требованию услуги» (§6/S3). Здесь живёт эта мини-версия S3:
   модал 480px, таймер 60с, ответ гражданина из приложения.

   Один модуль на два экрана намеренно: S4 запрашивает скоуп перед началом
   оформления, S5 — по кнопке «Запросить доступ» на закрытой вкладке. Это
   один и тот же разговор с гражданином, и разъехаться в формулировках или
   таймингах он не должен.
   ============================================================ */
import { h, mount, icon, ring, toast, modal, mmss } from './ui.js';
import { t, errText } from './i18n.js';
import { getState, patchSession } from './store.js';
import { consent } from './mock/api.js';
import { countdown } from './clock.js';
import { SCOPES, citizenSlice } from './mock/data.js';

/* requestScope('family', 'Справка о составе семьи') → Promise<boolean>
   true — гражданин подтвердил, скоуп уже в session.scopes и в «сервере». */
export function requestScope(scope, serviceName = null) {
  return new Promise(resolve => {
    let close = () => {};
    let stop = () => {};
    let settled = false;

    /* Чем закончится запрос, если модал закроют прямо сейчас. Пока гражданин
       не ответил — отказом; после выдачи — согласием (Д-23).

       Между granted() и авто-закрытием лежит 600ms церемонии успеха, и
       закрытие крестиком/Esc в этом окне резолвило false — при том, что скоуп
       уже выдан «сервером» и записан в session.scopes. Вызывающий экран
       считал это отказом и не пускал дальше по услуге, доступ к которой
       гражданин только что дал. */
    let outcome = false;

    const body = h('div', { class: 's-scope stack g-4' });

    const finish = value => {
      if (settled) return;
      settled = true;
      stop();
      consent.abort();
      resolve(value);
    };

    close = modal({
      title: t('scope.title'),
      body,
      actions: [],
      onClose: () => finish(outcome),   // крестик/Esc: до выдачи — отказ, после — согласие
    });

    ask();

    /* --- шаг 1: спросить оператора, отправлять ли запрос --- */
    function ask() {
      mount(body,
        h('p', { class: 'body' }, serviceName
          ? t('scope.askService', { name: serviceName, scope: SCOPES[scope]?.name || scope })
          : t('scope.askPlain', { scope: SCOPES[scope]?.name || scope })),
        h('p', { class: 'small ink-faint' }, t('consent.note')),
        h('div', { class: 'row g-3 s-scope__foot' },
          h('span', { class: 'spacer' }),
          h('button', { class: 'btn btn--secondary', onClick: () => close() }, t('common.cancel')),
          h('button', { class: 'btn btn--primary', onClick: send }, icon('bell', { size: 20 }), t('scope.send'))));
    }

    /* --- шаг 2: ждём гражданина, мини-таймер 60с (§6/S5) --- */
    async function send() {
      const r = ring({ size: 's', label: mmss(60_000), frac: 1 });
      const live = h('p', { class: 'sr-only', 'aria-live': 'polite' });

      mount(body,
        h('div', { class: 'row center' }, r),
        h('p', { class: 'body center-text' }, t('scope.waiting', { scope: SCOPES[scope]?.name || scope })),
        h('p', { class: 'small ink-faint center-text' }, t('scope.waitingHint')),
        live);

      try {
        const req = await consent.requestScope(scope);

        stop = countdown(req.ttlMs,
          (left, frac) => r.update(frac, mmss(left), left <= 10_000 ? 'danger' : left <= 20_000 ? 'warn' : ''),
          () => denied(true));

        const res = await consent.waitScope(scope);
        if (!res) return;                        // модал закрыли — finish уже был
        stop();

        if (res.status === 'granted') return granted();
        denied(false);
      } catch (e) {
        stop();
        failed(e);
      }
    }

    /* --- выдан --- */
    function granted() {
      outcome = true;          // с этого момента закрытие модала = «выдан»
      const st = getState();
      // Скоуп уже открыт «сервером» (api.sim.scopeGranted). В store кладём
      // его тем же путём, что и любые другие данные сессии — patchSession:
      // машина §2.2 при выдаче скоупа не двигается, двигается объём согласия.
      //
      // Вместе со скоупом досылаем и его срез данных (Д-02): базовый объём
      // приезжает в GRANTED, прогрессивный — здесь. Инвариант, который
      // проверяет аудит демо-панели: скоупы в памяти = скоупы выданные, ни
      // больше (утечка), ни меньше (память врёт про объём согласия).
      patchSession({
        scopes: [...new Set([...(st.session?.scopes || []), scope])],
        citizen: { ...(st.session?.citizen || {}), ...citizenSlice([scope]) },
      });

      mount(body,
        h('div', { class: 'row center' },
          h('div', { class: 'hero-mark hero-mark--draw' }, icon('check'))),
        h('p', { class: 'body center-text' }, t('scope.granted', { scope: SCOPES[scope]?.name || scope })));

      toast(t('scope.grantedToast'), 'success');
      setTimeout(() => { finish(true); closeLayerSafe(); }, 600);
    }

    /* --- отказ или таймаут (§7 «Доп. скоуп отклонён») --- */
    function denied(byTimeout) {
      mount(body,
        h('div', { class: 'row center' },
          h('div', { class: 'hero-mark hero-mark--error' }, icon(byTimeout ? 'clock' : 'x'))),
        h('p', { class: 'body center-text' }, t(byTimeout ? 'scope.timeout' : 'scope.denied')),
        // §7 — «услуга недоступна, предложить другую». Врать про причину не
        // надо: оператору важно понимать, что решение принял гражданин.
        h('p', { class: 'small ink-faint center-text' }, t('scope.deniedHint')),
        h('div', { class: 'row g-3 s-scope__foot' },
          h('span', { class: 'spacer' }),
          h('button', { class: 'btn btn--secondary', onClick: () => close() }, t('common.close')),
          h('button', { class: 'btn btn--primary', onClick: send }, t('common.retry'))));
    }

    function failed(e) {
      mount(body,
        h('div', { class: 'banner banner--error' }, icon('info'), h('span', { class: 'banner__text' }, errText(e))),
        h('div', { class: 'row g-3 s-scope__foot' },
          h('span', { class: 'spacer' }),
          h('button', { class: 'btn btn--secondary', onClick: () => close() }, t('common.close')),
          h('button', { class: 'btn btn--primary', onClick: send }, t('common.retry'))));
    }

    // close() уже мог отработать через onClose → finish(false); повторный
    // вызов безопасен, но settled не даст перезаписать результат.
    function closeLayerSafe() { try { close(); } catch { /* слой уже снят */ } }
  });
}

/* Чего услуге не хватает от текущего согласия (§6/S4). */
export function missingScopes(svc) {
  const have = getState().session?.scopes || [];
  return (svc.scopes || []).filter(s => !have.includes(s));
}
