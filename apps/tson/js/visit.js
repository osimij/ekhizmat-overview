/* ============================================================
   visit.js — талон в работе окна: действия, перевод, завершение.

   Общий модуль, потому что одни и те же решения принимаются из двух мест:
   с главной (талон вызван или остался «на приёме») и из сессии (F9 и
   «Завершить приём» в шапке). Диалог завершения, написанный дважды,
   разошёлся бы в первый же день — ровно как это было с S5 и панелью S6.

   Чего здесь нет — решений о доступности. Набор действий, их порядок и
   причины, почему действие недоступно, присылает сервер очереди
   (mock/api.js → queue). Модуль только переводит их в кнопки и подписи.
   ============================================================ */
import { h, mount, icon, modal, toast, statusIcon } from './ui.js';
import { t, errText } from './i18n.js';
import { queue } from './mock/api.js';
import { fmtTime } from './format.js';

/* ---------- подписи ---------- */
const ACTION_KEYS = {
  call: 'queue.act.call',
  start: 'queue.act.start',
  restart: 'queue.act.restart',
  recall: 'queue.act.recall',
  noShow: 'queue.act.noShow',
  transfer: 'queue.act.transfer',
  finish: 'queue.act.finish',
};

export const actionLabel = id => t(ACTION_KEYS[id] || id);

/* Причина приходит кодом с параметрами. Зона — тоже код (docs,
   registration…): подпись зоны на языке интерфейса берём из словаря. */
export function reasonText(reason) {
  if (!reason?.code) return '';
  const params = { ...(reason.params || {}) };
  if (params.zone) params.zone = t(`queue.zone.${params.zone}`);
  return t(`queue.reason.${reason.code}`, params);
}

/* Ошибка действия: если сервер объяснил, почему нельзя, — его причина
   точнее общего «не удалось». */
export const actionErrorText = e => (e?.reason ? reasonText(e.reason) : errText(e));

export const waitMinutes = tk => Math.max(0, Math.floor((Date.now() - tk.issuedAt) / 60_000));

/* «17 мин», а для только что выданного — «< 1 мин»: «0 мин» читалось бы
   как «не ждал вовсе». */
export function waitText(tk) {
  const m = waitMinutes(tk);
  return m < 1 ? t('queue.waitLess') : t('queue.waitMin', { n: m });
}

/* Статус талона в строке очереди — глиф с подписью (§3 «Status in repeated
   rows»): в плотной строке статус — сигнал для сравнения, а текст живёт в
   доступном имени и подсказке. Ожидание нейтрально: это обычное состояние
   очереди, и тридцать янтарных кружков подряд кричали бы о беде, которой
   нет. Дольше нормы говорит само время ожидания. */
export function ticketStatus(tk) {
  if (tk.status === 'called') {
    return { tone: 'info', iconName: 'bell', text: t('queue.status.calledTo', { n: tk.window }) };
  }
  if (tk.status === 'transferred') {
    return { tone: 'info', iconName: 'transfer', text: t('queue.status.transferredTo', { n: tk.window }) };
  }
  if (tk.status === 'serving') {
    return { tone: 'info', iconName: 'user', text: t('queue.status.serving') };
  }
  return { tone: 'neutral', iconName: 'clock', text: t('queue.status.waiting') };
}

export const ticketStatusIcon = tk => {
  const s = ticketStatus(tk);
  return statusIcon(s.tone, s.text, { iconName: s.iconName });
};

/* ---------- группа действий ----------
   Первое действие из ответа сервера — главное (одна главная кнопка на
   решение, §3 «Action color»), остальные — вторичные, столбиком под ним.

   Недоступное действие не прячется и не просто бледнеет: под группой
   стоит причина, а сама кнопка ссылается на неё через aria-describedby.
   aria-disabled, а не disabled: такую кнопку можно найти табом и
   услышать, почему она не работает. Нажатие по ней ничего не делает. */
let reasonSeq = 0;

export function actionGroup(actions, { busy = null, onRun, kbd = {} } = {}) {
  const reasons = [];
  const button = (a, primary) => {
    const off = !a.enabled || (busy && busy !== a.id);
    let reasonId = null;
    if (!a.enabled && a.reason) {
      reasonId = `act-reason-${++reasonSeq}`;
      reasons.push(h('p', { class: 'visit-actions__reason', id: reasonId },
        icon('info', { size: 16 }), h('span', {}, reasonText(a.reason))));
    }
    return h('button', {
      class: `btn ${primary ? 'btn--primary btn--l' : 'btn--secondary'} visit-actions__btn${busy === a.id ? ' btn--loading' : ''}`,
      type: 'button',
      dataset: { action: a.id },
      'aria-disabled': off ? 'true' : null,
      'aria-busy': busy === a.id ? 'true' : null,
      'aria-describedby': reasonId,
      onClick: () => { if (!off) onRun?.(a); },
    },
      h('span', {}, actionLabel(a.id)),
      kbd[a.id] ? h('kbd', { class: 'kbd' }, kbd[a.id]) : null);
  };

  const [first, ...rest] = actions;
  const group = h('div', { class: 'visit-actions' },
    first ? button(first, true) : null,
    rest.length
      ? h('div', { class: 'visit-actions__more' }, ...rest.map(a => button(a, false)))
      : null);

  return reasons.length
    ? h('div', { class: 'stack g-3' }, group, h('div', { class: 'visit-actions__reasons' }, ...reasons))
    : group;
}

/* ---------- причина рядом с выключенной кнопкой диалога ----------
   Подвал диалога: «Выберите окно» слева, действия справа. Та же связка
   aria-disabled + aria-describedby, что и в группе действий. */
function footReason(button) {
  const id = `foot-reason-${++reasonSeq}`;
  const node = h('span', { class: 'visit-foot__reason', id });
  return {
    node,
    set(text) {
      node.textContent = text || '';
      if (text) {
        button.setAttribute('aria-disabled', 'true');
        button.setAttribute('aria-describedby', id);
      } else {
        button.removeAttribute('aria-disabled');
        button.removeAttribute('aria-describedby');
      }
    },
  };
}

/* ============================================================
   Перевод в другое окно
   ============================================================ */
/* Окна центра плиткой 3 × 3 — так, как их видит оператор в зале. Доступные
   выбираются, недоступные остаются на месте с причиной: «закрыто»,
   «перерыв», «другая зона». Перевод подтверждается кнопкой, которая
   называет окно («Перевести в окно 4») — нажимая её, оператор видит, куда
   уйдёт человек, и второй вопрос «вы уверены?» ему не нужен. */
export function openTransfer(tk, win, { onDone } = {}) {
  let chosen = null;
  let sending = false;
  let close = () => {};

  const body = h('div', { class: 'stack g-4 s-transfer' });
  const cancel = h('button', { class: 'btn btn--secondary', type: 'button', onClick: () => close() }, t('common.cancel'));
  // Подпись в span: .btn--loading прячет детей-элементы, а голый текст
  // остался бы виден поверх спиннера.
  const confirm = h('button', { class: 'btn btn--primary', type: 'button', onClick: submit },
    h('span', {}, t('transfer.confirm')));
  const reason = footReason(confirm);
  reason.set(t('transfer.pick'));

  close = modal({
    title: t('transfer.title', { no: tk.no }),
    body,
    actions: [reason.node, cancel, confirm],
    wide: true,
    className: 's-transfer-dialog',
  });

  load();

  async function load(error = null) {
    mount(body, lead(), h('div', { class: 's-transfer__grid', 'aria-busy': 'true' },
      ...Array.from({ length: 9 }, () => h('div', { class: 'skel s-transfer__skel' }))));
    try {
      const targets = await queue.targets(tk.id, win);
      draw(targets, error);
    } catch (e) {
      mount(body, lead(),
        h('div', { class: 'banner banner--error' }, icon('info'),
          h('span', { class: 'banner__text' }, actionErrorText(e))),
        h('div', {}, h('button', { class: 'btn btn--secondary btn--s', type: 'button', onClick: () => load() }, t('queue.retry'))));
      reason.set(t('transfer.noData'));
    }
  }

  function lead() {
    return h('p', { class: 'body' },
      t('transfer.lead', { svc: tk.service.name, zone: t(`queue.zone.${tk.zone}`) }));
  }

  function draw(targets, error) {
    const open = targets.filter(x => x.enabled);
    if (chosen && !open.some(x => x.no === chosen)) chosen = null;

    const tiles = targets.map(target => {
      const input = h('input', {
        class: 'radio__input', type: 'radio', name: `transfer-${tk.id}`, value: String(target.no),
        disabled: !target.enabled, checked: chosen === target.no,
        onChange: () => { chosen = target.no; sync(); },
      });
      return h('label', { class: `s-transfer__win${target.enabled ? '' : ' is-off'}` },
        input,
        h('span', { class: 's-transfer__copy' },
          h('span', { class: 's-transfer__name' }, t('queue.windowN', { n: target.no })),
          h('span', { class: 's-transfer__meta' }, target.enabled
            ? (target.waiting ? t('transfer.waiting', { n: target.waiting }) : t('transfer.free'))
            : reasonText(target.reason))));
    });

    mount(body,
      lead(),
      error ? h('div', { class: 'banner banner--error' }, icon('info'), h('span', { class: 'banner__text' }, error)) : null,
      open.length ? null : h('div', { class: 'banner banner--warn' }, icon('info'),
        h('span', { class: 'banner__text' }, reasonText({ code: 'NO_TARGET', params: { zone: tk.zone } }))),
      h('div', { class: 's-transfer__grid', role: 'radiogroup', 'aria-label': t('transfer.gridAria') }, ...tiles));

    sync(open.length ? null : t('transfer.none'));
  }

  function sync(blocked = null) {
    confirm.replaceChildren(h('span', {}, chosen ? t('transfer.confirmTo', { n: chosen }) : t('transfer.confirm')));
    reason.set(blocked || (chosen ? '' : t('transfer.pick')));
  }

  async function submit() {
    if (!chosen || sending) return;
    sending = true;
    confirm.classList.add('btn--loading');
    confirm.setAttribute('aria-busy', 'true');
    cancel.setAttribute('aria-disabled', 'true');
    try {
      const r = await queue.transfer(tk.id, win, chosen);
      close();
      toast(t('queue.toast.transferred', { no: tk.no, n: r.window }), 'success');
      onDone?.();
    } catch (e) {
      // Окно могло закрыться, пока диалог был открыт: список перечитываем,
      // а причину показываем над плитками — там, где оператор выбирает заново.
      sending = false;
      confirm.classList.remove('btn--loading');
      confirm.removeAttribute('aria-busy');
      cancel.removeAttribute('aria-disabled');
      chosen = null;
      load(actionErrorText(e));
    }
  }
}

/* ============================================================
   Завершение приёма с результатом
   ============================================================ */
/* Пять исходов, которые различает отчётность центра. «Заявление принято»
   доступно, только если в этом приёме заявление действительно
   зарегистрировано, — это решает сервер, и тогда же он отдаёт номер,
   который стоит в подсказке и выбран заранее. Иначе ничего не выбрано:
   угадать за оператора, чем кончился разговор, нельзя, и кнопка ждёт
   выбора с подписью «Выберите результат». */
export function openFinish(tk, win, { inSession = false, guest = false, serviceName = null, onDone } = {}) {
  const service = serviceName || tk.service.name;
  let chosen = null;
  let sending = false;
  let close = () => {};

  const body = h('div', { class: 'stack g-4 s-finish' });
  const cancel = h('button', { class: 'btn btn--secondary', type: 'button', onClick: () => close() }, t('common.cancel'));
  const confirm = h('button', { class: 'btn btn--primary', type: 'button', onClick: submit },
    h('span', {}, t('visit.finish.confirm')));
  const reason = footReason(confirm);
  reason.set(t('visit.finish.pick'));

  close = modal({
    title: t('visit.finish.title', { no: tk.no }),
    body,
    actions: [reason.node, cancel, confirm],
    // Широкий: на 480 подсказки переносились, и на 1280 × 720 подвал с
    // «Завершить приём» уезжал за край диалога.
    wide: true,
    className: 's-finish-dialog',
  });

  load();

  async function load(error = null) {
    mount(body, h('p', { class: 'body' }, service),
      h('div', { class: 'stack g-2' }, ...Array.from({ length: 5 }, () => h('div', { class: 'skel s-finish__skel' }))));
    try {
      draw(await queue.results(tk.id), error);
    } catch (e) {
      mount(body, h('p', { class: 'body' }, service),
        h('div', { class: 'banner banner--error' }, icon('info'), h('span', { class: 'banner__text' }, actionErrorText(e))),
        h('div', {}, h('button', { class: 'btn btn--secondary btn--s', type: 'button', onClick: () => load() }, t('queue.retry'))));
      reason.set(t('visit.finish.noData'));
    }
  }

  function draw(options, error) {
    const accepted = options.find(o => o.id === 'accepted' && o.enabled);
    if (!chosen && accepted) chosen = 'accepted';

    const rows = options.map(o => {
      const hintId = `fin-${o.id}-${++reasonSeq}`;
      const hint = o.enabled
        ? (o.id === 'accepted' && o.app ? t('visit.result.acceptedNo', { no: o.app }) : t(`visit.result.${o.id}.hint`))
        : reasonText(o.reason);
      return h('label', { class: `s-finish__opt${o.enabled ? '' : ' is-off'}` },
        h('input', {
          class: 'radio__input', type: 'radio', name: `finish-${tk.id}`, value: o.id,
          disabled: !o.enabled, checked: chosen === o.id, 'aria-describedby': hintId,
          onChange: () => { chosen = o.id; reason.set(''); },
        }),
        h('span', { class: 's-finish__copy' },
          h('span', { class: 's-finish__name' }, t(`visit.result.${o.id}`)),
          h('span', { class: `s-finish__hint${o.enabled ? '' : ' s-finish__hint--off'}`, id: hintId }, hint)));
    });

    mount(body,
      h('p', { class: 'body' }, service),
      error ? h('div', { class: 'banner banner--error' }, icon('info'), h('span', { class: 'banner__text' }, error)) : null,
      h('fieldset', { class: 's-finish__set' },
        h('legend', { class: 'label' }, t('visit.finish.legend')),
        h('div', { class: 's-finish__list' }, ...rows)),
      // Что случится с данными — одной строкой, а не списком из трёх пунктов:
      // оператор читал его сотни раз, и решение здесь — результат, а не wipe.
      inSession && !guest ? h('p', { class: 'small ink-2' }, t('visit.finish.wipe')) : null);

    reason.set(chosen ? '' : t('visit.finish.pick'));
  }

  async function submit() {
    if (!chosen || sending) return;
    sending = true;
    confirm.classList.add('btn--loading');
    confirm.setAttribute('aria-busy', 'true');
    cancel.setAttribute('aria-disabled', 'true');
    try {
      await queue.finish(tk.id, win, chosen);
      close();
      onDone?.(chosen);
    } catch (e) {
      sending = false;
      confirm.classList.remove('btn--loading');
      confirm.removeAttribute('aria-busy');
      cancel.removeAttribute('aria-disabled');
      load(actionErrorText(e));
    }
  }
}

/* «Вызван в 14:32», «Повторный вызов в 14:35», «На приёме с 14:36». */
export function ticketMoment(tk) {
  if (tk.status === 'serving') return t('queue.moment.serving', { t: fmtTime(tk.startedAt) });
  if (tk.status === 'called') {
    return tk.recalls
      ? t('queue.moment.recalled', { t: fmtTime(tk.calledAt), n: tk.recalls + 1, max: tk.maxRecalls + 1 })
      : t('queue.moment.called', { t: fmtTime(tk.calledAt) });
  }
  return '';
}
