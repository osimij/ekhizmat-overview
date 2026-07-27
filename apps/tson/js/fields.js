/* ============================================================
   fields.js — конструкторы полей §5.2 поверх классов из components.css.

   Появился на Ф4: маски, календарь и чипы источника нужны и форме S6, и
   S2, и замку, а жили в login.js. Дублировать их по экранам означало бы
   получить три немного разных телефона и две даты — при том, что §5 прямо
   требует «ничего сверх этого списка на экранах быть не должно».

   Разметку эти функции не изобретают: только собирают .field / .otp / .src
   из библиотеки. Если поле выглядит не так — правится components.css, а не
   этот файл.
   ============================================================ */
import { h, mount, icon } from './ui.js';
import { t } from './i18n.js';

/* ---------- базовое текстовое поле (§5.2) ---------- */
export function field({ label, value = '', name, type = 'text', help, placeholder, autocomplete = 'off' }) {
  const input = h('input', {
    class: 'field__input', value, name, type, placeholder, autocomplete,
  });
  return wrapField({ label, help, control: input, input });
}

/* ---------- select (§5.2) ----------
   Стрелка — своей иконкой поверх, а не appearance браузера: нативная стрелка
   не подчиняется токенам и в тёмной теме выглядит чужой. */
export function selectField({ label, options = [], value, help, name }) {
  const select = h('select', { class: 'field__input', name },
    ...options.map(o => h('option', { value: o.v, selected: String(o.v) === String(value) }, o.n)));

  const control = h('span', { class: 'field__wrap' }, select,
    h('span', { class: 'field__affix' }, icon('chev-d', { size: 20 })));

  return wrapField({ label, help, control, input: select });
}

/* ---------- пароль (§6/S0) ---------- */
export function passwordField({ label, autocomplete = 'current-password' }) {
  const input = h('input', { class: 'field__input', type: 'password', autocomplete });
  const btn = h('button', {
    class: 'field__affix field__affix--action', type: 'button',
    'aria-label': t('login.showPassword'),
    onClick: () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.setAttribute('aria-label', show ? t('login.hidePassword') : t('login.showPassword'));
      input.focus();
    },
  }, icon('eye', { size: 20 }));

  const control = h('span', { class: 'field__wrap' }, input, btn);
  return wrapField({ label, control, input });
}

/* ---------- поиск (§6/S4) ---------- */
export function searchField({ placeholder, onInput }) {
  const input = h('input', {
    class: 'field__input', type: 'search', placeholder,
    autocomplete: 'off', 'aria-label': placeholder,
    onInput: e => onInput?.(e.target.value),
  });

  const el = h('span', { class: 'field__wrap field__wrap--search' },
    h('span', { class: 'field__affix' }, icon('search', { size: 20 })),
    input);

  return { el, input };
}

/* ---------- маски (§6/S6) ----------
   Маска форматирует, но НЕ блокирует ввод: §6/S6 требует «Не блокировать
   ввод». Оператор печатает цифры как хочет — 123456789, 123 456 789,
   +992901234567 — и видит один и тот же результат. */
const MASKS = {
  inn: {
    max: 9,
    format: d => d.replace(/(\d{3})(?=\d)/g, '$1 ').trim(),
    valid: d => d.length === 9,
    error: 'mask.inn',
  },
  phone: {
    max: 9,
    // +992 — код страны, он не редактируется: это не часть ввода оператора.
    format: d => {
      const p = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean);
      return p.length ? `+992 ${p.join(' ')}` : '';
    },
    valid: d => d.length === 9,
    error: 'mask.phone',
  },
  date: {
    max: 8,
    format: d => {
      const p = [d.slice(0, 2), d.slice(2, 4), d.slice(4, 8)].filter(Boolean);
      return p.join('.');
    },
    valid: d => d.length === 8 && isRealDate(d),
    error: 'mask.date',
  },
};

export function maskedField({ label, kind, value = '', help, name }) {
  const m = MASKS[kind];
  const input = h('input', {
    class: 'field__input field__input--masked', name,
    inputmode: 'numeric', autocomplete: 'off',
    placeholder: { inn: '123 456 789', phone: '+992 __ ___ __ __', date: t('mask.datePlaceholder') }[kind],
  });

  const apply = () => {
    const d = input.value.replace(/\D/g, '');
    // Телефон: живущий в значении код 992 не должен съедать разряды номера.
    const body = kind === 'phone' && d.startsWith('992') ? d.slice(3) : d;
    input.value = m.format(body.slice(0, m.max));
  };

  input.addEventListener('input', apply);
  if (value) { input.value = String(value); apply(); }

  const control = kind === 'date' ? withCalendar(input) : input;
  const api = wrapField({ label, help, control, input });

  // Значение может прийти не только из-под пальцев, но и из реестра
  // (автозаполнение S6). Маска обязана лечь и на него: без этого ИНН из
  // профиля показывался бы как «123456789», а введённый руками — как
  // «123 456 789», и оператор видел бы два разных ИНН у одного человека.
  api.set = v => { input.value = String(v ?? ''); apply(); };

  api.raw = () => (kind === 'phone'
    ? input.value.replace(/\D/g, '').replace(/^992/, '')
    : input.value.replace(/\D/g, ''));
  api.valid = () => m.valid(api.raw());
  // Ключ, а не текст: сообщение об ошибке маски оператор читает на своём
  // языке, а MASKS — таблица правил, ей словарь знать незачем.
  api.maskError = t(m.error);
  return api;
}

/* Календарь по иконке (§6/S6). Нативный date-инпут держим рядом и невидимым:
   он даёт настоящий пикер и клавиатурную дату, но его собственная раскладка
   зависит от локали браузера и показала бы mm/dd/yyyy на англоязычной машине.
   Поэтому видимое поле — наше, с маской дд.мм.гггг, а нативное только
   открывается по кнопке и отдаёт результат. */
function withCalendar(input) {
  const picker = h('input', { class: 'field__picker', type: 'date', tabindex: '-1', 'aria-hidden': 'true' });

  picker.addEventListener('change', () => {
    if (!picker.value) return;
    const [y, m, d] = picker.value.split('-');
    input.value = `${d}.${m}.${y}`;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('blur'));
  });

  const btn = h('button', {
    class: 'field__affix field__affix--action', type: 'button',
    'aria-label': t('form.pickDate'),
    onClick: () => {
      // showPicker() есть не везде; без него остаётся ручной ввод по маске,
      // и это рабочий путь, а не поломка.
      if (typeof picker.showPicker === 'function') picker.showPicker();
      else input.focus();
    },
  }, icon('calendar', { size: 20 }));

  return h('span', { class: 'field__wrap' }, input, picker, btn);
}

function isRealDate(d) {
  const day = +d.slice(0, 2), mon = +d.slice(2, 4), year = +d.slice(4, 8);
  if (mon < 1 || mon > 12 || day < 1 || year < 1900 || year > 2100) return false;
  return day <= new Date(year, mon, 0).getDate();
}

/* ---------- textarea (§5.2) ---------- */
export function textareaField({ label, value = '', help, name, rows = 3 }) {
  const input = h('textarea', { class: 'field__input', name, rows }, value);
  return wrapField({ label, help, control: input, input });
}

/* ---------- радио-группа (§6/S6 «ЯЗЫК (◉ тоҷикӣ ○ русский)») ---------- */
export function radioGroup({ label, options = [], value, name }) {
  const inputs = options.map(o => h('input', {
    class: 'radio__input', type: 'radio', name, value: o.v, checked: String(o.v) === String(value),
  }));

  const control = h('div', { class: 'radio-group', role: 'radiogroup', 'aria-label': label },
    ...options.map((o, i) => h('label', { class: 'radio' }, inputs[i], h('span', {}, o.n))));

  const api = wrapField({ label, control, input: inputs[0], asLabel: false });
  api.value = () => inputs.find(x => x.checked)?.value ?? '';
  return api;
}

/* Источники значения поля. Ключ — он же модификатор класса .src--*, поэтому
   вид чипа задаётся в components.css, а не здесь (§11.2). */
const SRC = {
  profile:  { icon: 'shield', key: 'form.fromProfile' },
  manual:   { icon: 'edit',   key: 'form.entered' },
  mrz:      { icon: 'check',  key: 'enroll.srcMrz' },
  ocr:      { icon: 'sign',   key: 'enroll.srcOcr' },
  check:    { icon: 'info',   key: 'enroll.srcCheck' },
  verified: { icon: 'shield', key: 'enroll.srcVerified' },
};

/* ---------- сборка обёртки ----------
   label связан с control через <label> (§9 «каждый инпут связан label'ом»),
   помощь и ошибка — через aria-describedby, чтобы скринридер читал причину,
   а не просто «поле недопустимо». */
let uid = 0;

function wrapField({ label, help, control, input, asLabel = true }) {
  const id = `f-${++uid}`;
  const helpEl = help ? h('span', { class: 'field__help', id: `${id}-h` }, help) : null;
  const errEl = h('span', { class: 'field__error', id: `${id}-e`, role: 'alert', hidden: true });

  const labelEl = h('span', { class: 'field__label' }, label);
  const el = h(asLabel ? 'label' : 'div', { class: 'field' }, labelEl, control, helpEl, errEl);

  if (!asLabel) labelEl.setAttribute('id', `${id}-l`);
  input.setAttribute('id', id);
  input.setAttribute('aria-describedby', help ? `${id}-h ${id}-e` : `${id}-e`);

  const api = {
    el, input, labelEl,
    value: () => input.value,
    set: v => { input.value = v ?? ''; },

    error(msg) {
      el.classList.toggle('field--error', !!msg);
      errEl.hidden = !msg;
      errEl.textContent = msg || '';
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    },

    /* Чип источника значения (§5.2): «из профиля» (blue-tint) / «введено».
       С §6/S2b источников стало больше двух: паспорт приносит значения из
       машиночитаемой зоны (сверены контрольной цифрой) и из визуальной
       (распознаны, могут врать). Оператор принимает решение «верить или
       проверять» по этому чипу, поэтому «распознано» и «сверено по MRZ»
       обязаны выглядеть по-разному — таблица вместо тернарника. */
    source(kind) {
      labelEl.querySelector('.src')?.remove();
      const s = SRC[kind];
      if (!s) return;
      labelEl.append(h('span', { class: `src src--${kind}` },
        icon(s.icon, { size: 16 }), t(s.key)));
    },

    /* Реестровое поле read-only с кнопкой «изменить» (§6/S6) — защита от
       случайной порчи данных реестра, но не запрет их поправить. */
    lock(onUnlock) {
      input.readOnly = true;
      el.classList.add('field--locked');
      const btn = h('button', {
        class: 'field__unlock btn btn--ghost btn--s', type: 'button',
        onClick: () => {
          input.readOnly = false;
          el.classList.remove('field--locked');
          btn.remove();
          api.source('manual');
          input.focus();
          onUnlock?.();
        },
      }, icon('edit', { size: 16 }), t('form.edit'));
      labelEl.append(btn);
    },
  };
  return api;
}

/* ---------- OTP: автопереход, paste всего кода (§6/S0, §6/S2) ---------- */
export function otpInput(onComplete) {
  const cells = Array.from({ length: 6 }, (_, i) => h('input', {
    class: 'otp__cell', maxlength: '1', inputmode: 'numeric',
    'aria-label': t('otp.digit', { n: i + 1 }), autocomplete: 'one-time-code',
  }));

  const el = h('div', { class: 'otp' }, ...cells);
  const value = () => cells.map(c => c.value).join('');

  cells.forEach((cell, i) => {
    cell.addEventListener('input', () => {
      cell.value = cell.value.replace(/\D/g, '').slice(0, 1);
      if (cell.value && i < 5) cells[i + 1].focus();
      if (value().length === 6) onComplete(value());
    });

    // Backspace на пустой ячейке уводит назад — иначе исправить опечатку
    // можно только мышью.
    cell.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !cell.value && i > 0) cells[i - 1].focus();
      if (e.key === 'ArrowLeft' && i > 0) cells[i - 1].focus();
      if (e.key === 'ArrowRight' && i < 5) cells[i + 1].focus();
    });

    cell.addEventListener('paste', e => {
      e.preventDefault();
      const digits = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
      digits.split('').forEach((d, k) => { if (cells[k]) cells[k].value = d; });
      cells[Math.min(digits.length, 5)].focus();
      if (value().length === 6) onComplete(value());
    });
  });

  return {
    el, value,
    error: on => el.classList.toggle('otp--error', on),
    clear: () => { cells.forEach(c => { c.value = ''; }); cells[0].focus(); },
    focus: () => cells[0].focus(),
  };
}

/* ---------- состояния кнопки (§5.1) ---------- */
export function setLoading(btn, on) {
  btn.classList.toggle('btn--loading', on);
  // Кулдаун (§6/S0, Д-07) держит кнопку выключенной поверх loading: снятие
  // загрузки в finally не должно её включать, пока тикает таймер блокировки.
  // Раньше setLoading(false) безусловно перетирал disabled кулдауна, и после
  // трёх неверных OTP кнопка оставалась кликабельной при живом таймере.
  if (!on && Number(btn.dataset.lockedUntil) > Date.now()) { btn.disabled = true; return; }
  btn.disabled = on;
}

/* Ошибка кредов — шейк 2×4px (§6/S0). */
export function shake(el) {
  el.classList.remove('is-shake');
  void el.offsetWidth;          // рестарт анимации
  el.classList.add('is-shake');
}
