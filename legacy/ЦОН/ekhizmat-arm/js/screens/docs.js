/* ============================================================
   S7 · Приём документов · #/session/docs  (§6/S7)

   Приёмка §6/S7: «нельзя отправить без обязательных документов; blob-URL
   превью отзываются при завершении сессии».

   Второе — про сканы, загруженные файлом: URL.createObjectURL держит файл в
   памяти вкладки, пока URL не отозвали, и «завершил приём» без revoke
   означало бы паспорт гражданина, переживший свою сессию. Поэтому каждый
   такой URL уходит в trackBlobUrl() — реестр в store.js, который чистит
   wipe(). Мок-сканы приходят data-url'ами и revoke не требуют, но правило
   одно: URL, созданный из данных гражданина, регистрируется всегда.
   ============================================================ */
import { h, mount, icon, toast, modal, confirmDanger } from '../ui.js';
import { t, plural, errText } from '../i18n.js';
import { getState, patchSession, dispatch, trackBlobUrl, STEP } from '../store.js';
import { docs as api, application, sim } from '../mock/api.js';
import { setLoading } from '../fields.js';
import { SERVICE } from '../mock/data.js';
import { isExpired } from '../format.js';

export function renderDocs(host) {
  let dead = false;
  let activeDoc = null;
  let activePage = 0;
  let retryOnline = null;

  const st = getState();
  const svc = SERVICE[st.session?.service];
  if (!svc) { dispatch('GOTO', { step: STEP.CATALOG }); return () => {}; }

  // Пункты чеклиста = требования услуги + «иные» документы, добавленные
  // оператором по ходу (§6/S7 «ДОПОЛНИТЕЛЬНО»).
  let items = [...svc.docs];
  const extra = Object.keys(st.session?.docs || {}).filter(id => !items.some(d => d.id === id));
  items.push(...extra.map(id => ({ id, name: t('docs.other'), required: false, custom: true })));
  activeDoc = items[0]?.id ?? null;

  const listEl = h('div', { class: 'stack g-2' });
  const stageEl = h('div', { class: 's-docs__stage panel' });
  const banner = h('div', {});

  const scanBtn = h('button', { class: 'btn btn--primary', onClick: scan },
    icon('refresh', { size: 20 }), t('docs.scan'));

  const fileInput = h('input', {
    type: 'file', class: 'sr-only', accept: 'application/pdf,image/jpeg,image/png',
    onChange: e => upload(e.target.files[0]),
  });

  const uploadBtn = h('button', { class: 'btn btn--secondary', onClick: () => fileInput.click() },
    icon('upload', { size: 20 }), t('docs.upload'));

  const submitBtn = h('button', { class: 'btn btn--primary', onClick: confirmSubmit }, t('docs.submit'));

  mount(host,
    h('div', { class: 'canvas s-docs' },
      banner,
      h('div', { class: 's-docs__cols' },
        h('div', { class: 's-docs__list panel stack g-4' },
          h('h2', { class: 'label' }, t('docs.required')),
          listEl,
          h('button', { class: 'btn btn--ghost btn--s s-docs__add', onClick: addOther },
            icon('plus', { size: 20 }), t('docs.addOther')),
          h('hr', { class: 'rule' }),
          h('div', { class: 'stack g-2' }, scanBtn, uploadBtn, fileInput)),
        stageEl),
      h('div', { class: 's-docs__foot' },
        h('button', {
          class: 'btn btn--secondary',
          onClick: () => dispatch('GOTO', { step: STEP.FORM }),
        }, icon('chev-l', { size: 20 }), t('common.back')),
        h('span', { class: 'spacer' }),
        submitBtn)));

  // Сеть вернулась — доотправляем то, что не уехало (§7 «сабмиты в очередь
  // повторов»). Подписка снимается в teardown, иначе повтор переживёт экран.
  const unsubSim = sim.onChange(() => {
    if (!dead && retryOnline && !sim.faults.network) { const f = retryOnline; retryOnline = null; f(); }
    if (!dead) drawBanner();
  });

  /* ---------- данные ----------
     Стоят ДО draw() и до return намеренно: const не поднимается, и стрелка,
     объявленная ниже return, навсегда остаётся в TDZ — первый же вызов падал
     бы «Cannot access before initialization». Ниже return допустимы только
     function declaration. */
  const pages = id => getState().session?.docs?.[id] || [];

  /* Паспорт, уже сверенный с оригиналом при регистрации в eKhizmat (§6/S2b).

     Читается из session.citizen.documents — то есть ТОЛЬКО если гражданин
     выдал скоуп «Документы». Это не перестраховка: без скоупа у АРМ нет
     никакого права знать даже сам факт, что паспорт в системе есть, и
     закрывать по нему пункт чеклиста было бы решением, принятым на данных,
     которых гражданин не давал. Скоуп не выдан → сверенного паспорта нет →
     оператор сканирует, как раньше.

     Просроченный не считается: сверка была правдой в своё время, но документ,
     срок которого вышел, личность больше не удостоверяет. */
  function verifiedPassport() {
    const items2 = getState().session?.citizen?.documents?.items || [];
    return items2.find(d => d.identity && d.verified && !isExpired(d.expires)) || null;
  }

  // Пункт закрывается реестром, а не сканером.
  const byRegistry = d => !!(d.identity && verifiedPassport());

  const done = d => byRegistry(d) || pages(d.id).length > 0;
  const complete = () => items.filter(d => d.required).every(done);

  dropZone(stageEl);
  draw();

  return () => {
    dead = true;
    unsubSim();
  };

  function setPages(id, list) {
    const all = { ...(getState().session?.docs || {}) };
    if (list.length) all[id] = list; else delete all[id];
    patchSession({ docs: all });
  }

  /* ---------- рендер ---------- */
  function draw() {
    drawList();
    drawStage();
    drawBanner();
    submitBtn.disabled = !complete();
    submitBtn.title = complete() ? '' : t('docs.submitBlocked');
  }

  function drawBanner() {
    const nodes = [];
    if (sim.faults.network) {
      nodes.push(h('div', { class: 'banner banner--warn banner--sticky' },
        icon('info'), h('span', { class: 'banner__text' }, t('err.offline'))));
    }
    if (sim.faults.scanner) {
      // §7 — «сканер недоступен: банер + путь через загрузку файла».
      nodes.push(h('div', { class: 'banner banner--warn' },
        icon('info'), h('span', { class: 'banner__text' }, t('docs.noScanner'))));
    }
    mount(banner, ...nodes);
    scanBtn.disabled = sim.faults.scanner;
  }

  function drawList() {
    const required = items.filter(d => !d.custom);
    const others = items.filter(d => d.custom);

    mount(listEl,
      ...required.map(itemRow),
      others.length
        ? h('h2', { class: 'label s-docs__sub' }, t('docs.additional'))
        : null,
      ...others.map(itemRow));
  }

  function itemRow(d) {
    const n = pages(d.id).length;
    const registry = byRegistry(d) && !n;

    // Закрытый реестром пункт отмечаем щитом, а не галочкой: галочка означает
    // «оператор это сделал», щит — «система за это ручается». Разница видна
    // на одном взгляде по списку и объясняет, почему пункт зелёный, хотя
    // сканов под ним нет.
    const mark = registry ? 'shield' : done(d) ? 'check' : 'clock';

    return h('button', {
      class: `s-docs__item${d.id === activeDoc ? ' is-active' : ''}`,
      'aria-current': d.id === activeDoc ? 'true' : null,
      onClick: () => { activeDoc = d.id; activePage = 0; draw(); },
    },
      // `dash` из §4.3 — это dashboard (сетка), а не прочерк: имя обманывает.
      // Ожидание показываем часами, они читаются без легенды.
      icon(mark, { size: 20, cls: done(d) ? 'green-ink' : 'ink-faint' }),
      h('span', { class: 'grow s-docs__itemname' },
        h('span', {}, d.name),
        h('span', { class: 'small ink-faint' },
          registry ? t('docs.fromRegistry')
            : n ? `${n} ${plural(n, 'plural.pages')} · ${t('docs.scanned')}`
            : d.required ? t('docs.waiting') : t('catalog.optional'))));
  }

  function drawStage() {
    const list = pages(activeDoc);
    const d = items.find(x => x.id === activeDoc);

    // §6/S2b — паспорт уже сверен, сканировать нечего. Показываем НЕ пустоту,
    // а сам документ из реестра: оператор всё равно смотрит в паспорт на
    // столе, и ему нужно, с чем сверить номер. Возможность приложить скан
    // остаётся — паспорт могли заменить после регистрации, и упереться в
    // «система знает лучше» было бы худшим ответом на живой документ в руке.
    if (byRegistry(d) && !list.length) {
      const p = verifiedPassport();
      mount(stageEl,
        h('div', { class: 'banner banner--ok' },
          icon('shield'),
          h('span', { class: 'banner__text' },
            t('docs.verifiedAt', { at: p.verified.at, by: p.verified.by }))),

        h('div', { class: 'def' },
          sumRow(t('docs.docType'), p.type),
          sumRow(t('docs.docNo'), p.no),
          sumRow(t('docs.docIssued'), `${p.issued} · ${p.by}`),
          p.expires ? sumRow(t('docs.docExpires'), p.expires) : null),

        h('p', { class: 'small ink-faint' }, t('docs.verifiedHint')),

        h('div', { class: 'row wrap g-2' },
          h('button', { class: 'btn btn--secondary btn--s', onClick: scan },
            icon('refresh', { size: 20 }), t('docs.scanAnyway')),
          h('button', { class: 'btn btn--ghost btn--s', onClick: () => fileInput.click() },
            icon('upload', { size: 20 }), t('docs.upload'))));
      return;
    }

    if (!list.length) {
      // Пустое состояние (§5.3) — с инструкцией, а не с извинением.
      mount(stageEl, h('div', { class: 'empty' },
        icon('doc'),
        h('span', { class: 'empty__title' }, t('docs.emptyTitle')),
        h('span', { class: 'empty__hint' }, t('docs.emptyHint', { name: d?.name || '' }))));
      return;
    }

    const page = list[Math.min(activePage, list.length - 1)];

    mount(stageEl,
      page.blurry
        ? h('div', { class: 'banner banner--warn' },
            icon('info'),
            h('span', { class: 'banner__text' }, t('docs.blurry')),
            h('button', { class: 'btn btn--ghost btn--s', onClick: rescan }, t('docs.rescan')))
        : null,

      h('div', { class: 's-docs__preview' },
        h('img', {
          src: page.url, alt: t('docs.previewAlt', { n: activePage + 1 }),
          style: { transform: `rotate(${page.rot || 0}deg)` },
        })),

      h('div', { class: 'row wrap g-2 s-docs__actions' },
        h('button', { class: 'btn btn--secondary btn--s', onClick: rotate },
          icon('refresh', { size: 20 }), t('docs.rotate')),
        h('button', { class: 'btn btn--secondary btn--s', onClick: rescan },
          icon('refresh', { size: 20 }), t('docs.rescan')),
        h('button', { class: 'btn btn--danger btn--s', onClick: remove },
          icon('trash', { size: 20 }), t('docs.delete'))),

      attachTo(),

      h('div', { class: 'stack g-2' },
        h('span', { class: 'label' }, t('docs.pages')),
        h('div', { class: 'thumbs' },
          ...list.map((p, i) => h('button', {
            class: 'thumb', 'aria-selected': String(i === activePage),
            'aria-label': t('docs.previewAlt', { n: i + 1 }),
            onClick: () => { activePage = i; drawStage(); },
          }, String(i + 1))),
          h('button', { class: 'thumb', 'aria-label': t('docs.addPage'), onClick: scan },
            icon('plus', { size: 20 })))));
  }

  /* «Прикрепить к: [Паспорт ▾]» (§6/S7) — скан мог лечь не в тот пункт,
     и пересканировать из-за этого документ было бы издевательством. */
  function attachTo() {
    const sel = h('select', { class: 'field__input' },
      ...items.map(d => h('option', { value: d.id, selected: d.id === activeDoc }, d.name)));

    sel.addEventListener('change', () => {
      const from = activeDoc, to = sel.value;
      if (from === to) return;

      const list = [...pages(from)];
      const [moved] = list.splice(activePage, 1);
      setPages(from, list);
      setPages(to, [...pages(to), moved]);

      activeDoc = to;
      activePage = pages(to).length - 1;
      toast(t('docs.moved', { name: items.find(d => d.id === to).name }), 'success', 2000);
      draw();
    });

    return h('label', { class: 'field s-docs__attach' },
      h('span', { class: 'field__label' }, t('docs.attachTo')),
      h('span', { class: 'field__wrap' }, sel,
        h('span', { class: 'field__affix' }, icon('chev-d', { size: 20 }))));
  }

  /* ---------- действия ---------- */
  async function scan() {
    setLoading(scanBtn, true);
    stageEl.classList.add('is-scanning');     // «шторка» 600ms (§6/S7)
    try {
      const page = await api.scan(pages(activeDoc).length + 1);
      if (dead) return;
      setPages(activeDoc, [...pages(activeDoc), page]);
      activePage = pages(activeDoc).length - 1;
      draw();
    } catch (e) {
      if (dead) return;
      toast(errText(e), 'error');
      drawBanner();
    } finally {
      if (!dead) { setLoading(scanBtn, false); stageEl.classList.remove('is-scanning'); }
    }
  }

  async function rescan() {
    const list = [...pages(activeDoc)];
    if (!list.length) return scan();
    setLoading(scanBtn, true);
    try {
      const page = await api.scan(activePage + 1);
      if (dead) return;
      list[activePage] = page;
      setPages(activeDoc, list);
      draw();
    } catch (e) { if (!dead) toast(errText(e), 'error'); }
    finally { if (!dead) setLoading(scanBtn, false); }
  }

  async function upload(file) {
    if (!file) return;
    try {
      const r = await api.upload(file);
      if (dead) return;
      // Файл гражданина в памяти вкладки — регистрируем, чтобы wipe отозвал.
      trackBlobUrl(r.url);
      setPages(activeDoc, [...pages(activeDoc), r]);
      activePage = pages(activeDoc).length - 1;
      draw();
    } catch (e) {
      if (!dead) toast(errText(e), 'error');
    }
    fileInput.value = '';
  }

  function rotate() {
    const list = [...pages(activeDoc)];
    list[activePage] = { ...list[activePage], rot: ((list[activePage].rot || 0) + 90) % 360 };
    setPages(activeDoc, list);
    drawStage();
  }

  function remove() {
    confirmDanger({
      title: t('docs.deleteTitle'),
      body: h('p', {}, t('docs.deleteBody')),
      confirmText: t('docs.delete'),
      onConfirm: () => {
        const list = [...pages(activeDoc)];
        list.splice(activePage, 1);
        setPages(activeDoc, list);
        activePage = Math.max(0, activePage - 1);
        draw();
      },
    });
  }

  function addOther() {
    const id = `other-${items.filter(d => d.custom).length + 1}`;
    items.push({ id, name: t('docs.other'), required: false, custom: true });
    activeDoc = id;
    activePage = 0;
    draw();
  }

  /* Drag-n-drop на зону превью (§6/S7). Вешается один раз на сам stageEl:
     drawStage() меняет его содержимое, а не его самого, и подписка изнутри
     рендера копила бы по слушателю на каждую перерисовку. */
  function dropZone(el) {
    el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('is-drop'); });
    el.addEventListener('dragleave', () => el.classList.remove('is-drop'));
    el.addEventListener('drop', e => {
      e.preventDefault();
      el.classList.remove('is-drop');
      upload(e.dataTransfer.files[0]);
    });
  }

  /* ---------- отправка (§6/S7) ---------- */
  function confirmSubmit() {
    const count = Object.values(getState().session?.docs || {}).flat().length;
    // Пункт, закрытый реестром, в сводке назван, а не молча посчитан нулём:
    // оператор подтверждает состав пакета вслух, и «0 страниц» под услугой,
    // требующей паспорт, звучало бы как недосмотр.
    const fromRegistry = items.filter(d => byRegistry(d) && !pages(d.id).length).length;
    const aloud = h('input', { class: 'check__input', type: 'checkbox' });

    let close = () => {};
    const ok = h('button', { class: 'btn btn--primary', disabled: true, onClick: () => { close(); send(); } },
      t('docs.submit'));

    aloud.addEventListener('change', () => { ok.disabled = !aloud.checked; });

    close = modal({
      title: t('docs.confirmTitle'),
      body: h('div', { class: 'stack g-4' },
        h('div', { class: 'def' },
          sumRow(t('docs.sumService'), svc.name),
          sumRow(t('docs.sumDocs'), [
            `${count} ${plural(count, 'plural.pages')}`,
            fromRegistry ? t('docs.sumRegistry', { n: fromRegistry }) : null,
          ].filter(Boolean).join(' · ')),
          sumRow(t('docs.sumTerm'), svc.instant ? t('term.instant') : t('docs.sumDeferred'))),
        // Не украшение: оператор подтверждает, что прочитал заявление вслух —
        // гражданин не видит экрана и подписывается под тем, что услышал.
        h('label', { class: 'check' }, aloud, h('span', {}, t('docs.aloud')))),
      actions: [
        h('button', { class: 'btn btn--secondary', onClick: () => close() }, t('common.cancel')),
        ok,
      ],
    });
  }

  async function send() {
    setLoading(submitBtn, true);
    try {
      const app = await application.submit({
        serviceId: svc.id,
        values: getState().session?.draft?.values || {},
        docs: getState().session?.docs || {},
      });
      if (dead) return;
      patchSession({ application: app });
      dispatch('GOTO', { step: STEP.RESULT });
    } catch (e) {
      if (dead) return;
      if (e.code === 'OFFLINE') {
        // §7 — «сабмиты в очередь повторов; вводимое не теряется».
        retryOnline = send;
        toast(t('docs.queued'), 'warn');
      } else {
        toast(errText(e), 'error');
      }
    } finally { if (!dead) setLoading(submitBtn, false); }
  }
}

function sumRow(k, v) {
  return h('div', { class: 'def__row' },
    h('span', { class: 'def__key' }, k),
    h('span', { class: 'def__val grow' }, v));
}
