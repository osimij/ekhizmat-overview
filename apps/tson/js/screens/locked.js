/* ============================================================
   LOCKED · Блокировка рабочего места  (§6/S9c, §7)

   «Бездействие 3:00 → экран LOCKED (размытие всего канваса + карточка
   "Введите пароль", Keycloak re-auth). Сессия гражданина продолжает тикать.»

   Отсюда два неочевидных следствия:

   1. LOCK НЕ стирает данные (в отличие от любого другого ухода из сессии).
      Оператор отошёл, гражданин ждёт за окошком — приём не окончен.
      Поэтому в store LOCK исключён из wipe-правила.

   2. Размытие — это только визуальный слой. Данные под ним живые и есть в DOM,
      поэтому замок обязан быть модальным по-настоящему: фокус заперт внутри,
      Tab не уводит под блюр. Иначе «блокировка» обходится клавишей Tab.
   ============================================================ */
import { h, mount, icon } from '../ui.js';
import { t } from '../i18n.js';
import { dispatch, getState, ST } from '../store.js';
import { auth } from '../mock/api.js';

export function renderLocked(host) {
  const err = h('span', { class: 'field__error', role: 'alert' });
  const input = h('input', {
    class: 'field__input', type: 'password', autocomplete: 'current-password',
    'aria-label': t('locked.hint'),
  });
  const submit = h('button', { class: 'btn btn--primary btn--l', type: 'submit' }, t('locked.unlock'));

  // Сессия гражданина продолжает тикать — оператор должен видеть это
  // до разблокировки, иначе вернётся к истёкшему TTL без предупреждения.
  const running = getState().lockedFrom === ST.SESSION;

  const card = h('form', {
    class: 's-locked__card panel',
    novalidate: true,
    role: 'dialog', 'aria-modal': 'true',
    onSubmit: async e => {
      e.preventDefault();
      err.textContent = '';
      submit.classList.add('btn--loading');
      submit.disabled = true;
      try {
        await auth.reauth(input.value);
        dispatch('UNLOCK');
      } catch {
        err.textContent = t('locked.badPassword');
        input.select();
      } finally {
        submit.classList.remove('btn--loading');
        submit.disabled = false;
      }
    },
  },
    icon('lock', { size: 48, cls: 'ink-faint' }),
    // Заголовок и подсказка — одна подпись, не два блока карточки: --s-2
    // вместо карточного --s-3 (design-guide §5, связанные подписи 4–8px).
    h('div', { class: 'stack g-2 s-locked__copy' },
      h('h2', { class: 'h3' }, t('locked.title')),
      h('p', { class: 'small ink-2' }, t('locked.hint'))),
    running ? h('p', { class: 'chip' }, icon('clock', { size: 16 }), t('locked.sessionRunning')) : null,
    input,
    err,
    submit);

  mount(host, h('div', { class: 's-locked' }, card));

  // Фокус ставим синхронно, а не через requestAnimationFrame: rAF не
  // выполняется, пока вкладка не отрисовывается, — а заблокировать АРМ
  // (Ctrl+L) и сразу уйти в другое окно оператор может запросто. Тогда
  // фокус в замок молча не встал бы. Элемент уже в DOM после mount().
  input.focus();

  // Фокус-трап: без него Tab уводит под размытый канвас, к живым данным.
  const onKey = e => {
    if (e.key !== 'Tab') return;
    const items = [...card.querySelectorAll('input,button')].filter(el => !el.disabled);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    else if (!card.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
  };
  document.addEventListener('keydown', onKey, true);

  return () => document.removeEventListener('keydown', onKey, true);
}
