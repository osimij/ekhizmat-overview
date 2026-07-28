/* ============================================================
   S8 · Результат и выдача · #/session/result  (§6/S8)

   Приёмка §6/S8: «после завершения приёма кнопка "назад" и история не
   воспроизводят ни PDF, ни номер, ни ФИО». Держится тем же, чем и всё
   остальное: номер и PDF живут в session, который стирает wipe(), а
   blob-URL самого PDF зарегистрирован в trackBlobUrl() — иначе файл
   пережил бы приём в памяти вкладки, сколько бы раз мы ни чистили DOM.
   ============================================================ */
import { h, mount, icon, toast } from '../ui.js';
import { t, errText } from '../i18n.js';
import { getState, patchSession, dispatch, trackBlobUrl, STEP } from '../store.js';
import { result, citizen } from '../mock/api.js';
import { setLoading } from '../fields.js';
import { fmtTime, fmtDate, fmtDatePlus } from '../format.js';
import { endVisit } from '../session.js';
import { SERVICE } from '../mock/data.js';

export function renderResult(host) {
  let dead = false;

  const st = getState();
  const app = st.session?.application;
  const svc = SERVICE[st.session?.service];

  if (!app || !svc) { dispatch('GOTO', { step: STEP.CATALOG }); return () => {}; }

  const bodyEl = h('div', { class: 's-result__body' });

  mount(host,
    h('div', { class: 'canvas s-result' },
      h('div', { class: 'hero-mark hero-mark--draw' }, icon('check')),
      h('h1', { class: 'h1 s-result__title' }, t('result.accepted')),

      h('div', { class: 'row center g-2 s-result__no' },
        h('span', { class: 'tnum' }, `№ ${app.no}`),
        h('span', { class: 'ink-faint' }, '·'),
        h('span', { class: 'tnum ink-2' }, `${fmtDate(app.at)} ${fmtTime(app.at)}`),
        h('button', {
          class: 'btn btn--ghost btn--icon btn--s', 'aria-label': t('common.copy'),
          onClick: async () => {
            try {
              await navigator.clipboard.writeText(app.no);
              toast(t('common.copied'), 'success', 2000);
            } catch { toast(t('common.copyFailed'), 'error'); }
          },
        }, icon('paperclip', { size: 20 }))),

      bodyEl,

      h('div', { class: 'row center g-3 s-result__foot' },
        h('button', { class: 'btn btn--primary btn--l', onClick: () => endVisit() },
          t('session.end'), h('kbd', { class: 'kbd' }, 'F9')),
        h('button', { class: 'btn btn--ghost btn--l', onClick: again }, t('result.again')))));

  svc.instant ? instant() : deferred();

  return () => { dead = true; };

  /* ---------- мгновенная услуга: готовый PDF (§6/S8) ---------- */
  async function instant() {
    mount(bodyEl, h('div', { class: 'panel stack g-4' },
      h('div', { class: 'skel skel--title' }),
      h('div', { class: 'skel', style: { height: '220px' } })));

    try {
      const pdf = await result.pdf({ no: app.no, serviceId: svc.id });
      if (dead) return;
      trackBlobUrl(pdf.url);        // §6/S7 приёмка — revoke на завершении

      // Данные листа — через шлюз скоупов и только те, что нужны ЭТОЙ услуге
      // (Д-03). Раньше превью читало st.session.citizen напрямую и печатало
      // блок «Состав семьи» для любой мгновенной услуги: пенсионная справка
      // выносила на лист состав семьи, которого её скоуп не запрашивал.
      const sheet = await sheetData();
      if (dead) return;

      const print = h('button', { class: 'btn btn--primary', onClick: doPrint },
        icon('doc', { size: 20 }), t('result.print'));

      const send = h('button', { class: 'btn btn--secondary', onClick: doSend },
        icon('arrow-ur', { size: 20 }), t('result.toApp'));

      mount(bodyEl, h('div', { class: 'panel stack g-4' },
        h('h2', { class: 'h3' }, t('result.ready', { name: svc.name })),
        h('div', { class: 's-result__grid' },
          preview(pdf.url, sheet),
          h('div', { class: 'stack g-2 s-result__actions' },
            print, send,
            h('a', {
              class: 'btn btn--ghost', href: pdf.url, download: `${app.no}.pdf`,
            }, icon('download', { size: 20 }), t('result.download'))))));

      async function doPrint() {
        setLoading(print, true);
        try {
          await result.print();
          if (!dead) toast(t('result.printed'), 'success');
        } catch (e) {
          if (dead) return;
          // §7 — «Принтер не печатает: тост-ошибка, повтор, fallback Скачать».
          toast(`${errText(e)} — ${t('result.printFallback')}`, 'error', 6000);
        } finally { if (!dead) setLoading(print, false); }
      }

      async function doSend() {
        setLoading(send, true);
        try {
          await result.sendToApp();
          if (dead) return;
          mount(send, icon('check', { size: 20 }), t('result.delivered'));
          send.classList.add('is-done');
        } catch (e) {
          if (!dead) toast(errText(e), 'error');
        } finally { if (!dead) setLoading(send, false); }
      }
    } catch (e) {
      if (dead) return;
      failed(e, instant);
    }
  }

  /* ---------- превью первой страницы (§6/S8) ----------
     Раньше здесь стоял <iframe> с настоящим PDF. Отказались: в iframe
     открывается встроенная смотрелка браузера — со своим тёмным фоном,
     своей панелью и своими правилами, и застилить её нельзя. Оператор видел
     чёрный прямоугольник вместо документа.

     Поэтому превью — то, чем оно и названо в §6/S8: отрисованная первая
     страница. Данные в ней настоящие, из этой сессии. Настоящий файл никуда
     не делся — он под «Скачать PDF» и уходит в печать; в проде превью
     присылает бэкенд картинкой (или рисует pdf.js), и этот же слот займёт
     оно. Клик по миниатюре открывает сам файл.

     Подписи листа берутся из словаря интерфейса. Нюанс на будущее: язык
     САМОГО документа выбирает гражданин в форме (поле «Язык справки»), и
     он не обязан совпадать с языком АРМ — печатать справку на языке
     оператора нельзя. В прототипе документ рисуем на языке интерфейса;
     настоящий PDF придёт с бэкенда уже на values.lang. */
  /* Что услуга вправе напечатать на листе — по её собственным скоупам, через
     citizen.get() (тот же 403-шлюз, что и у S5). Скоуп, которого у услуги нет,
     сюда физически не попадает: мы за ним не ходим, а если бы пошли — сервер
     не отдал бы. Ошибку глушим: непечатаемый блок лучше пустого экрана S8. */
  async function sheetData() {
    const need = svc.scopes || [];
    const out = {};

    for (const scope of ['profile', 'family']) {
      if (!need.includes(scope)) continue;
      try {
        out[scope] = await citizen.get(scope);
      } catch (e) {
        console.warn(`result: скоуп "${scope}" не загрузился (${e.code}) — блок не печатаем`);
      }
      if (dead) return out;
    }
    return out;
  }

  function preview(url, sheet) {
    const c = sheet.profile || {};
    const family = sheet.family?.items || [];

    return h('button', {
      class: 'doc-thumb',
      title: t('result.openPdf'), 'aria-label': `${t('result.preview')} — ${t('result.openPdf')}`,
      onClick: () => window.open(url, '_blank', 'noopener'),
    },
      h('div', { class: 'doc-page' },
        h('div', { class: 'doc-page__head' },
          icon('logo', { size: 20 }),
          h('span', {}, t('doc.org')),
          h('span', { class: 'spacer' }),
          h('span', { class: 'tnum' }, app.no)),
        h('h3', { class: 'doc-page__title' }, svc.name.toUpperCase()),
        h('div', { class: 'doc-page__rows' },
          // Профиль есть у всех 12 услуг, но офлайн (§7) может оставить срез
          // пустым — лист печатаем без значения, а не падаем на .replace.
          c.full ? docRow(t('doc.issuedTo'), c.full) : null,
          c.inn ? docRow(t('doc.inn'), String(c.inn).replace(/(\d{3})(?=\d)/g, '$1 ')) : null,
          docRow(t('doc.date'), `${fmtDate(app.at)} ${fmtTime(app.at)}`)),
        family.length
          ? h('div', { class: 'doc-page__rows' },
              h('span', { class: 'doc-page__key' }, t('doc.family')),
              ...family.map(f => docRow(f.rel, `${f.full}, ${f.birth}`)))
          : null,
        h('div', { class: 'doc-page__sign' },
          icon('sign', { size: 16 }),
          h('span', {}, t('doc.signed')))));
  }

  function docRow(k, v) {
    return h('div', { class: 'doc-page__row' },
      h('span', { class: 'doc-page__key' }, k),
      h('span', { class: 'doc-page__val' }, v));
  }

  /* ---------- отложенная услуга: таймлайн (§6/S8) ---------- */
  function node(done, text) {
    return h('span', { class: `timeline__node${done ? ' timeline__node--done' : ''}` },
      h('span', { class: 'dot' }), text);
  }

  function deferred() {
    const days = svc.term?.d || 1;
    mount(bodyEl, h('div', { class: 'panel stack g-4' },
      h('h2', { class: 'h3' }, t('result.inWork', { name: svc.name })),
      h('div', { class: 'timeline' },
        node(true, t('result.stAccepted', { t: fmtTime(app.at) })),
        h('span', { class: 'timeline__line' }),
        node(false, t('result.stReview', { d: fmtDatePlus(days) })),
        h('span', { class: 'timeline__line' }),
        node(false, t('result.stDone'))),
      h('p', { class: 'small ink-2' }, t('result.notify'))));
  }

  /* §6/S8 — «ошибка… red hero + Повторить, данные не теряются». */
  function failed(e, retry) {
    mount(bodyEl, h('div', { class: 'panel stack g-4 center-text' },
      h('div', { class: 'row center' }, h('div', { class: 'hero-mark hero-mark--error' }, icon('info'))),
      h('h2', { class: 'h3' }, t('result.failed')),
      h('p', { class: 'small' }, errText(e)),
      h('div', { class: 'row center' },
        h('button', { class: 'btn btn--primary', onClick: retry }, t('common.retry')))));
  }

  /* «Оформить ещё одну услугу → S4 в той же сессии (скоупы сохраняются)». */
  function again() {
    patchSession({ service: null, draft: null, docs: {}, application: null });
    dispatch('GOTO', { step: STEP.CATALOG });
  }
}
