/* ============================================================
   LOCKED · Блокировка рабочего места  (§6/S9c, §7)

   «Бездействие 3:00 → экран LOCKED (размытие всего канваса + карточка
   "Введите пароль", Keycloak re-auth). Сессия гражданина продолжает тикать.»

   Холст — тот экран, на котором остановились: шелл остаётся в DOM, блюрится
   и тонируется. Поверх — одна модалка. Поля, заголовок и кнопка — те же, что
   на S0, через `--login-scale`.

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
import { floatingField } from './login.js';

/* Login paints 70px / 28px through `transform: scale(--login-scale)`. Transform
   does not shrink the layout box, so this wrapper is sized to the painted size. */
function presentAtLoginScale(wrap, body) {
  const scale = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--login-scale'),
  ) || 0.8;
  wrap.style.width = `${body.offsetWidth * scale}px`;
  wrap.style.height = `${body.offsetHeight * scale}px`;
}

export function renderLocked(host) {
  const err = h('span', { class: 'field__error', role: 'alert', hidden: true });
  const pass = floatingField({
    id: 'locked-pass',
    label: t('login.password'),
    name: 'password',
    type: 'password',
    autocomplete: 'current-password',
  });
  const submit = h('button', { class: 'btn btn--primary btn--l', type: 'submit' }, t('locked.unlock'));

  // Сессия гражданина продолжает тикать — оператор должен видеть это
  // до разблокировки, иначе вернётся к истёкшему TTL без предупреждения.
  const running = getState().lockedFrom === ST.SESSION;

  const body = h('div', { class: 's-locked__body' },
    icon('lock-pass', { size: 48, cls: 's-locked__icon' }),
    h('div', { class: 's-locked__copy' },
      h('div', { class: 'login__heading' },
        h('h1', { id: 'locked-title' }, t('locked.title')),
        h('p', {}, t('locked.hint'))),
      running ? h('p', { class: 'chip' }, icon('clock', { size: 16 }), t('locked.sessionRunning')) : null),
    h('div', { class: 's-locked__controls' },
      h('div', { class: 'login__fields' }, pass.el, err),
      h('div', { class: 'login__actions' }, submit)));
  const scaleWrap = h('div', { class: 's-locked__scale' }, body);

  const card = h('form', {
    class: 'panel login__card s-locked__card',
    novalidate: true,
    role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'locked-title',
    onSubmit: async e => {
      e.preventDefault();
      err.textContent = '';
      err.hidden = true;
      presentAtLoginScale(scaleWrap, body);
      submit.classList.add('btn--loading');
      submit.disabled = true;
      try {
        await auth.reauth(pass.input.value);
        dispatch('UNLOCK');
      } catch {
        err.hidden = false;
        err.textContent = t('locked.badPassword');
        presentAtLoginScale(scaleWrap, body);
        pass.input.select();
      } finally {
        submit.classList.remove('btn--loading');
        submit.disabled = false;
      }
    },
  }, scaleWrap);

  mount(host, h('div', { class: 's-locked' },
    h('div', { class: 'login__brand s-locked__brand' }, icon('logo', { size: 24 }), h('b', {}, t('app.name'))),
    card,
    h('p', { class: 's-locked__legend' }, t('login.legend'))));

  presentAtLoginScale(scaleWrap, body);
  const fitScale = new ResizeObserver(() => presentAtLoginScale(scaleWrap, body));
  fitScale.observe(body);

  // Фокус ставим синхронно, а не через requestAnimationFrame: rAF не
  // выполняется, пока вкладка не отрисовывается, — а заблокировать АРМ
  // (Ctrl+L) и сразу уйти в другое окно оператор может запросто. Тогда
  // фокус в замок молча не встал бы. Элемент уже в DOM после mount().
  pass.input.focus();

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

  return () => {
    fitScale.disconnect();
    document.removeEventListener('keydown', onKey, true);
  };
}
