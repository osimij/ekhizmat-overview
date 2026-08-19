/* ============================================================
   S0 · Вход оператора — MFA · #/login  (§6/S0)

   Одна карточка, два шага (креды → OTP), как на АРМ ведомства: плавающие
   подписи, поля-пилюли, «Продолжить», затем код и «Войти». Карточка одна
   не ради красоты: оператор входит так каждое утро, и отдельные страницы
   означали бы лишние перерисовки шелла на пути к работе.

   Привязка к рабочему месту отдельным шагом убрана (по требованию): после
   OTP берётся сохранённая привязка из localStorage, а при первом входе —
   первый ЦОН/окно по умолчанию (см. finishLogin). Оператор при нужде меняет
   её кнопкой «Сменить привязку» в шелле.

   Приёмка §6/S0: нельзя попасть ни на один роут без прохождения обоих шагов.
   Обычный рефреш вкладки восстанавливает оператора (sessionStorage ekh.tson.arm);
   жёсткий рефреш, выход и закрытие вкладки возвращают сюда.
   ============================================================ */
import { h, mount, icon } from '../ui.js';
import { t } from '../i18n.js';
import { dispatch } from '../store.js';
import { load, save } from '../storage.js';
import { auth } from '../mock/api.js';
import { otpInput, setLoading, shake } from '../fields.js';

export function renderLogin(host) {
  let step = 0;                       // 0 креды · 1 OTP
  let creds = null;
  let cooldownTimer = null;

  const card = h('div', { class: 'panel login__card' });

  mount(host,
    h('div', { class: 'login' },
      h('div', { class: 'login__inner' },
        h('div', { class: 'login__brand' },
          icon('logo', { size: 24 }),
          h('b', {}, t('app.name'))),
        card,
        h('div', { class: 'login__legend' },
          h('span', { class: 'login__legend-copy' }, t('login.legend'))))));

  go(0);
  return () => clearInterval(cooldownTimer);

  /* ---------- переключение шагов ---------- */
  function go(next) {
    const back = next < step;
    step = next;
    const view = [stepCreds, stepOtp][step]();

    // §8 — переходы шагов: fade+slide 8px, 180ms. Назад — в другую сторону.
    card.classList.remove('is-in', 'is-back');
    mount(card, view);
    card.classList.add(back ? 'is-back' : 'is-in');

    // Автофокус на первое поле — оператор проходит вход без мыши (P4).
    // Синхронно, а не через rAF: в неотрисовываемой вкладке rAF не выполнится
    // и автофокус молча пропадёт. Поле уже в DOM после mount().
    card.querySelector('input, select')?.focus();
  }

  /* ---------- шаг 1: креды ---------- */
  function stepCreds() {
    const err = h('span', { class: 'field__error', role: 'alert', hidden: true });
    const login = floatingField({
      id: 'l-user',
      label: t('login.login'),
      value: 'operator.sino04',
      name: 'username',
      autocomplete: 'username',
    });
    const pass = floatingField({
      id: 'l-pass',
      label: t('login.password'),
      name: 'password',
      type: 'password',
      autocomplete: 'current-password',
    });
    const submit = h('button', {
      class: 'btn btn--primary btn--l', type: 'submit', 'data-act': 'login-next',
    }, t('login.next'));

    return h('form', {
      class: 'stack login__form login__form--credentials', novalidate: true,
      onSubmit: async e => {
        e.preventDefault();
        err.textContent = '';
        err.hidden = true;
        if (!login.input.value.trim() || !pass.input.value) {
          err.hidden = false;
          err.id = 'login-error';
          err.textContent = t('login.required');
          shake(card);
          (login.input.value.trim() ? pass.input : login.input).focus();
          return;
        }
        setLoading(submit, true);
        try {
          const r = await auth.login(login.input.value.trim(), pass.input.value);
          creds = r.operator;
          go(1);
        } catch (e2) {
          shake(card);
          err.hidden = false;
          err.id = 'login-error';
          err.textContent = e2.code === 'LOCKED_OUT'
            ? t('login.lockout', { t: '00:30' })
            : t('login.badCreds');
          pass.input.setAttribute('aria-invalid', 'true');
          pass.input.setAttribute('aria-describedby', 'login-error');
          pass.input.select();
        } finally {
          setLoading(submit, false);
        }
      },
    },
      h('div', { class: 'login__heading' },
        h('h1', {}, t('login.title'))),
      h('div', { class: 'login__fields' }, login.el, pass.el, err),
      submit);
  }

  /* ---------- шаг 2: OTP ---------- */
  function stepOtp() {
    const err = h('span', { class: 'field__error', role: 'alert', hidden: true });
    const cells = otpInput(code => submitOtp(code));
    cells.el.id = 'l-otp';
    const submit = h('button', {
      class: 'btn btn--primary btn--l', type: 'submit', 'data-act': 'login-enter',
    }, t('login.submit'));
    const back = h('button', {
      class: 'btn btn--ghost btn--l', type: 'button', 'data-act': 'login-back',
      onClick: () => go(0),
    }, t('common.back'));

    const form = h('form', {
      class: 'stack login__form login__form--mfa', novalidate: true,
      onSubmit: e => { e.preventDefault(); submitOtp(cells.value()); },
    },
      h('div', { class: 'login__heading' },
        h('h1', { id: 'l-otp-label' }, t('login.mfa')),
        h('p', {}, t('login.mfaHint'))),
      cells.el,
      err,
      h('div', { class: 'login__actions' }, submit, back));
    cells.el.setAttribute('role', 'group');
    cells.el.setAttribute('aria-labelledby', 'l-otp-label');

    async function submitOtp(code) {
      err.textContent = '';
      err.hidden = true;
      cells.error(false);
      setLoading(submit, true);
      try {
        await auth.otp(code);
        await finishLogin();
      } catch (e2) {
        shake(card);
        cells.error(true);
        if (e2.code === 'LOCKED_OUT') {
          startCooldown(e2.until, err, submit);
        } else {
          err.hidden = false;
          err.id = 'login-error';
          err.textContent = t('login.badOtp', { n: e2.left ?? 2 });
          cells.clear();
        }
      } finally {
        setLoading(submit, false);
      }
    }

    return form;
  }

  /* «Слишком много попыток» — кулдаун с таймером (§6/S0 состояния). */
  function startCooldown(until, err, submit) {
    clearInterval(cooldownTimer);
    // Метка кулдауна: setLoading() уважает её и не включит кнопку в finally,
    // пока таймер жив (Д-07). Снимаем метку, только когда таймер истёк.
    submit.dataset.lockedUntil = String(until);
    submit.disabled = true;

    const tick = () => {
      const left = until - Date.now();
      if (left <= 0) {
        clearInterval(cooldownTimer);
        delete submit.dataset.lockedUntil;
        submit.disabled = false;
        err.textContent = '';
        err.hidden = true;
        return;
      }
      const s = Math.ceil(left / 1000);
      err.hidden = false;
      err.textContent = t('login.lockout', { t: `00:${String(s).padStart(2, '0')}` });
    };
    tick();
    cooldownTimer = setInterval(tick, 1000);
  }

  /* ---------- завершение входа: авто-привязка ----------
     Шага «Привязка к рабочему месту» больше нет. Привязка запоминается между
     входами (§6/S0), поэтому берём сохранённую; при первом входе — первый
     ЦОН/окно из справочника. auth.bind() валидирует и возвращает канонический
     вид, дальше — обе половины машины, как раньше (по одному dispatch). */
  async function finishLogin() {
    const first = TSON_CACHE[0];
    const bind = load('ekh.tson.bind', null)
      || (first ? { tson: first.id, window: first.windows[0] } : null);

    const r = await auth.bind(bind);
    save('ekh.tson.bind', r.bind);

    dispatch('MFA_OK', { operator: creds });
    dispatch('BIND_OK', { bind: { ...r.bind, tsonName: tsonName(r.bind.tson) } });
  }
}

/* Поле входа ведомства: подпись живёт внутри поля и всплывает над обводкой,
   когда есть значение или фокус. placeholder=" " нужен для :placeholder-shown. */
export function floatingField({ id, label, value = '', name, type = 'text', autocomplete }) {
  const input = h('input', {
    class: 'field__input', id, name, type, value,
    placeholder: ' ',
    autocomplete,
    spellcheck: 'false',
  });
  return {
    el: h('div', { class: 'field login-field--floating' },
      h('label', { class: 'field__label', for: id }, label),
      input),
    input,
  };
}

/* ЦОНы нужны синхронно в finishLogin (авто-привязка), а fetch там уже поздно.
   Грузим один раз на старте приложения (см. app.js). */
let TSON_CACHE = [];
export async function preloadTsons() { TSON_CACHE = await auth.tsons(); }
const tsonName = id => TSON_CACHE.find(x => x.id === id)?.name || id;
