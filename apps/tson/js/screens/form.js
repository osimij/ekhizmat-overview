/* ============================================================
   S6 · Форма заявления · #/session/form  (§6/S6)

   Правило экрана: форма слева, источник справа.

   Приёмка §6/S6: «типовая справка заполняется без единого клика мышью (всё
   автозаполнено, Tab + Ctrl+Enter); валидация не даёт отправить пустое
   обязательное поле». Из этого следуют два неочевидных решения:

   · Автофокус ставится в первое НЕзаполненное поле, а не в первое поле.
     Иначе Tab пришлось бы жать через всё, что уже заполнил реестр.
   · Реестровые поля read-only (§6/S6) и не участвуют в Tab-порядке как
     поля — но кнопка «изменить» участвует: запрет портить данные реестра
     не должен превращаться в невозможность их поправить.
   ============================================================ */
import { h, mount, icon, toast } from '../ui.js';
import { t, plural, errText } from '../i18n.js';
import { getState, patchSession, dispatch, subscribe, STEP } from '../store.js';
import { citizen, application } from '../mock/api.js';
import { field, maskedField, selectField, textareaField, radioGroup, setLoading } from '../fields.js';
import { renderDataPanel } from './data.js';
import { fmtTime } from '../format.js';
import { SERVICE, SCOPES, FORM_STUB } from '../mock/data.js';

const AUTOSAVE_MS = 10_000;   // §6/S6 — «каждые 10с изменений»

export function renderForm(host) {
  let dead = false;
  let saveTimer = null;
  let destroyPanel = () => {};

  const st = getState();
  const svc = SERVICE[st.session?.service];

  // Услуга не выбрана — на форме делать нечего. Такое возможно только через
  // прямой заход в URL, и роутер уже разрешил его как «легальный в SESSION».
  if (!svc) {
    dispatch('GOTO', { step: STEP.CATALOG });
    return () => {};
  }

  // §11.4 (Д-01): формы прописаны только у двух услуг; остальные получают
  // типовую заглушку. Guard на случай, если и её не окажется: внятный пустой
  // экран, а не молчаливое падение (renderForm раньше читал svc.form.sections
  // безусловно и на услуге без формы отдавал полупустой экран без ошибки).
  const formSpec = svc.form || FORM_STUB;
  if (!formSpec?.sections?.length) {
    mount(host, h('div', { class: 'canvas s-form' },
      h('div', { class: 'panel empty' },
        icon('info', { size: 48 }),
        h('span', { class: 'empty__title' }, t('form.noFormTitle')),
        h('span', { class: 'empty__hint' }, t('form.noFormHint', { name: svc.name })),
        h('button', {
          class: 'btn btn--secondary',
          onClick: () => dispatch('GOTO', { step: STEP.CATALOG }),
        }, icon('chev-l', { size: 20 }), t('data.back')))));
    return () => {};
  }

  const fields = new Map();     // id → api поля
  const summary = h('div', { class: 's-form__summary', hidden: true, tabindex: '-1' });
  const savedMark = h('span', { class: 'small ink-faint s-form__saved' });
  const banner = h('div', {});
  const sections = h('div', { class: 'stack g-8' });

  const next = h('button', {
    class: 'btn btn--primary', type: 'submit',
  }, t('form.next'), h('kbd', { class: 'kbd' }, 'Ctrl+↵'));

  const saveBtn = h('button', {
    class: 'btn btn--secondary', type: 'button',
    onClick: () => save(true),
  }, icon('download', { size: 20 }), t('form.saveDraft'));

  // Футер — ВНУТРИ <form>. Снаружи кнопка type="submit" ничего не отправляет:
  // она не связана с формой, и «Далее — документы» просто не работает.
  const form = h('form', {
    class: 's-form__col s-form__form', novalidate: true,
    onSubmit: e => { e.preventDefault(); submit(); },
  },
    h('div', { class: 'stack g-2' },
      h('h1', { class: 'h2' }, svc.name),
      savedMark),
    banner,
    summary,
    sections,
    h('div', { class: 's-form__foot' }, saveBtn, h('span', { class: 'spacer' }), next));

  const context = h('aside', { class: 's-form__context stack g-4' });
  const reqHost = h('div', {});

  // Выдача скоупа — это patchSession, а не переход машины: ловим её событием
  // записи данных, тем же, по которому оживает панель данных (Д-15).
  const unsubReq = subscribe((_, event) => {
    if (event === 'SESSION_PATCH' && !dead) drawRequirements();
  });

  mount(host, h('div', { class: 'canvas s-form' }, form, context));

  // Хелперы ниже — только function declaration: всё, что стоит после return,
  // обязано подниматься. Стрелка в const здесь навсегда осталась бы в TDZ,
  // и первый же вызов падал бы «Cannot access before initialization».
  function fmtValue(v, type) {
    return (type === 'inn' || type === 'phone' || type === 'date') ? String(v) : v;
  }

  function values() {
    return Object.fromEntries([...fields].map(([id, f]) => [id, f.api.value()]));
  }

  build();
  fill();

  const onKey = e => {
    if (!(e.ctrlKey || e.metaKey)) return;
    if (e.key === 'Enter') { e.preventDefault(); submit(); }
    if (e.key.toLowerCase() === 's') { e.preventDefault(); save(true); }
  };
  addEventListener('keydown', onKey);

  return () => {
    dead = true;
    clearTimeout(saveTimer);
    destroyPanel();
    unsubReq();
    removeEventListener('keydown', onKey);
  };

  /* ---------- построение формы из описания услуги ---------- */
  function build() {
    mount(sections, ...formSpec.sections.map(sec =>
      h('section', { class: 'stack g-4' },
        // §6/S6 — «Секции формы = H3 + 32px до следующей».
        h('h2', { class: 'h3' }, sec.title),
        h('div', { class: 's-form__grid' }, ...sec.fields.map(build1)))));

    // Контекст справа: данные гражданина (те же вкладки, §6/S6) + требования.
    const panelHost = h('div', {});
    mount(context, panelHost, reqHost);
    destroyPanel = renderDataPanel(panelHost);
    drawRequirements();
  }

  /* Чеклист требований перерисовывается на выдачу скоупа (Д-15). Раньше он
     строился один раз: оператор выдавал «Состав семьи» из панели справа,
     панель оживала, а строка «Скоуп: семья» рядом продолжала висеть с замком —
     два соседних блока об одном и том же говорили разное. */
  function drawRequirements() {
    mount(reqHost, requirements());
  }

  function build1(f) {
    const api = make(f);
    fields.set(f.id, { api, spec: f });

    api.source(f.from ? 'profile' : 'manual');
    if (f.value) api.set(f.value);

    // Валидация на blur (§6/S6). На вводе — только гасим ошибку: ругаться на
    // каждую букву незаполненного поля значит ругаться на процесс печати.
    api.input.addEventListener('blur', () => validate1(f.id));
    api.input.addEventListener('input', () => { api.error(''); touch(); });
    api.input.addEventListener('change', touch);

    return api.el;
  }

  function make(f) {
    const base = { label: f.label, help: f.help, name: f.id, value: f.value };
    if (f.type === 'select') return selectField({ ...base, options: f.options });
    if (f.type === 'radio') return radioGroup({ ...base, options: f.options });
    if (f.type === 'textarea') return textareaField(base);
    if (f.type === 'inn' || f.type === 'phone' || f.type === 'date') {
      return maskedField({ ...base, kind: f.type });
    }
    return field(base);
  }

  /* ---------- требования услуги (правая колонка, §6/S6) ---------- */
  function requirements() {
    const have = getState().session?.scopes || [];
    return h('section', { class: 'panel stack g-3' },
      h('h2', { class: 'label' }, t('form.requirements')),
      h('div', { class: 'check-list' },
        ...svc.scopes.map(id => h('div', { class: `check-item check-item--${have.includes(id) ? 'done' : 'locked'}` },
          icon(have.includes(id) ? 'check' : 'lock'),
          h('span', {}, `${t('form.scope')}: ${SCOPES[id].tab.toLowerCase()}`))),
        ...svc.docs.filter(d => d.required).map(d => h('div', { class: 'check-item check-item--todo' },
          icon('doc'),
          h('span', {}, `${d.name} → ③`)))));
  }

  /* ---------- автозаполнение из скоупов (§6/S6) ---------- */
  async function fill() {
    // Черновик этой же сессии — в памяти; черновик прошлого приёма того же
    // гражданина лежит «на сервере» (§7: TTL истёк → при новом приёме
    // «восстановить черновик?»). Второй запрашиваем, только если первого нет.
    // Свой черновик (этот же приём, шаг назад с S7) и чужой (прошлый приём
    // того же гражданина) — разные вещи, и обходятся по-разному (Д-13).
    const own = getState().session?.draft;
    const draft = own || await application.getDraft(svc.id);
    if (dead) return;

    const need = [...new Set(formSpec.sections.flatMap(s =>
      s.fields.filter(f => f.from).map(f => f.from.split('.')[0])))];

    const data = {};
    const failed = new Set();
    let offline = false;

    for (const scope of need) {
      try {
        data[scope] = await citizen.get(scope);
      } catch (e) {
        // 403/офлайн — не повод падать: поля просто останутся ручными (§7).
        // Но и молчать нельзя: без автозаполнения форма выглядит «просто
        // пустой», и отличить «скоуп не выдан» от бага в коде будет нечем.
        // Код ошибки — не данные гражданина, логировать его §11.2 не мешает.
        console.warn(`form: скоуп "${scope}" не загрузился (${e.code}) — поле останется ручным`);
        data[scope] = null;
        failed.add(scope);
        if (e.code === 'OFFLINE') offline = true;
      }
      if (dead) return;
    }

    const stale = Object.values(data).some(d => d?.stale);

    for (const [id, { api, spec }] of fields) {
      if (!spec.from) continue;
      const [scope, key] = spec.from.split('.');

      // Скоуп не доехал (офлайн/403). Поле остаётся ручным — и чип обязан
      // это сказать: пустое поле с чипом «из профиля» и без банера читается
      // как «реестр вернул пустоту», а не «данных не спрашивали» (Д-14).
      if (failed.has(scope)) {
        api.source('manual');
        api.el.append(h('span', { class: 'field__hint field__hint--warn' },
          icon('info', { size: 16 }), t('form.noAutofillField')));
        continue;
      }

      const value = data[scope]?.[key];
      if (!value) continue;

      // §7 — «Реестр-источник недоступен → поля без автозаполнения → ручной
      // ввод». Непроверенный снимок в официальное заявление не переносим:
      // показать его в S5 с пометкой честно, а вписать молча — нет.
      if (data[scope].stale) {
        api.source('manual');
        api.el.append(h('span', { class: 'field__hint field__hint--warn' },
          icon('info', { size: 16 }), t('form.staleField')));
        continue;
      }

      api.set(fmtValue(value, spec.type));
      api.lock(() => conflictWatch(id, fmtValue(value, spec.type)));
    }

    if (offline) {
      // §7 «Сеть пропала»: объясняем, почему форма пустая, — иначе оператор
      // решит, что реестр не знает гражданина, и начнёт искать причину не там.
      mount(banner, h('div', { class: 'banner banner--warn' },
        icon('info'), h('span', { class: 'banner__text' }, t('form.offlineRegistry'))));
    } else if (stale) {
      mount(banner, h('div', { class: 'banner banner--warn' },
        icon('info'), h('span', { class: 'banner__text' }, t('form.staleRegistry'))));
    }

    // Свой черновик накатываем молча: оператор возвращается с S7 к тому, что
    // сам только что набрал, и спрашивать «восстановить?» про собственный,
    // ещё не остывший ввод — значит прятать его за баннером и требовать
    // лишний клик (Д-13). Чужой (прошлый приём) по-прежнему предлагаем.
    if (own) applyDraft(own, { announce: false });
    else if (draft) restore(draft);

    focusFirstEmpty();
  }

  /* ---------- черновик (§6/S6) ---------- */
  function applyDraft(draft, { announce = true } = {}) {
    for (const [id, v] of Object.entries(draft.values || {})) {
      const f = fields.get(id);
      if (!f) continue;

      // §6/S6 «конфликт данных»: реестр отдал одно, в черновике другое.
      // Молча затирать нельзя ни в одну сторону — оператор должен видеть оба.
      const reg = f.api.value();
      if (reg && v && reg !== v) { conflict(f.api, reg, v); }
      f.api.set(v);
    }
    if (announce) toast(t('form.draftRestored'), 'success');
    focusFirstEmpty();
  }

  function restore(draft) {
    mount(banner, h('div', { class: 'banner banner--info' },
      icon('history'),
      h('span', { class: 'banner__text' }, t('form.draftFound', { t: fmtTime(draft.savedAt) })),
      h('button', {
        class: 'btn btn--ghost btn--s',
        onClick: e => { applyDraft(draft); e.currentTarget.closest('.banner').remove(); },
      }, t('form.draftRestore')),
      h('button', {
        class: 'btn btn--ghost btn--s',
        onClick: e => e.currentTarget.closest('.banner').remove(),
      }, t('form.draftIgnore'))));
  }

  function conflict(api, registryValue, draftValue) {
    api.el.querySelector('.field__hint')?.remove();
    api.el.append(h('span', { class: 'field__hint field__hint--warn' },
      icon('info', { size: 16 }),
      h('span', { class: 'grow' }, t('form.conflict', { v: registryValue })),
      h('button', {
        class: 'btn btn--ghost btn--s', type: 'button',
        onClick: e => { api.set(registryValue); e.currentTarget.closest('.field__hint').remove(); },
      }, t('form.useRegistry'))));
  }

  /* Оператор сам поправил реестровое поле — сверяем при следующем заходе. */
  function conflictWatch(id, registryValue) {
    fields.get(id).registryValue = registryValue;
  }

  function touch() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => save(false), AUTOSAVE_MS);
  }

  async function save(explicit) {
    clearTimeout(saveTimer);
    try {
      const draft = await application.draft({ serviceId: svc.id, values: values() });
      if (dead) return;
      patchSession({ draft });
      savedMark.textContent = t('form.savedAt', { t: fmtTime(draft.savedAt) });
      if (explicit) toast(t('form.draftSaved'), 'success', 2000);
    } catch (e) {
      if (dead) return;
      // Офлайн — не теряем введённое (§7): черновик просто не уехал.
      savedMark.textContent = t('form.saveFailed');
      if (explicit) toast(errText(e), 'error');
    }
  }

  /* ---------- валидация (§6/S6) ---------- */
  function validate1(id) {
    const { api, spec } = fields.get(id);
    const empty = !String(api.value()).trim();

    if (spec.required && empty) { api.error(t('form.required')); return false; }
    if (!empty && api.valid && !api.valid()) { api.error(api.maskError); return false; }

    api.error('');
    return true;
  }

  function submit() {
    const bad = [...fields.keys()].filter(id => !validate1(id));

    if (bad.length) {
      // §6/S6 — сводка сверху, клик = скролл к полю; §9 — сводка получает
      // фокус при сабмите, иначе клавиатурный оператор о ней не узнает.
      mount(summary,
        h('div', { class: 'banner banner--error' },
          icon('info'),
          h('span', { class: 'banner__text' },
            t('form.errors', { n: bad.length, word: plural(bad.length, 'plural.fieldsBad') })),
          h('div', { class: 'row wrap g-2' },
            ...bad.map(id => h('button', {
              class: 'btn btn--ghost btn--s', type: 'button',
              onClick: () => {
                const el = fields.get(id).api.input;
                el.scrollIntoView({ block: 'center', behavior: 'smooth' });
                el.focus();
              },
            }, fields.get(id).spec.label)))));

      summary.hidden = false;
      summary.focus();
      return;
    }

    summary.hidden = true;
    save(false);
    patchSession({ draft: { savedAt: Date.now(), serviceId: svc.id, values: values() } });
    dispatch('GOTO', { step: STEP.DOCS });
  }

  function focusFirstEmpty() {
    for (const [, f] of fields) {
      if (!f.api.input.readOnly && !String(f.api.value()).trim()) { f.api.input.focus(); return; }
    }
    next.focus();
  }
}
