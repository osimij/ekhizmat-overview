/* ============================================================
   S0 · Вход оператора — MFA · #/login  (§6/S0)

   Два шага в ОДНОЙ карточке (креды → OTP), слайд-влево 200ms. Карточка одна
   не ради красоты: оператор входит так каждое утро, и отдельные страницы
   означали бы лишние перерисовки шелла на пути к работе.

   Привязка к рабочему месту отдельным шагом убрана (по требованию): после
   OTP берётся сохранённая привязка из localStorage, а при первом входе —
   первый ЦОН/окно по умолчанию (см. finishLogin). Оператор при нужде меняет
   её кнопкой «Сменить привязку» в шелле.

   Приёмка §6/S0: нельзя попасть ни на один роут без прохождения обоих шагов;
   рефреш страницы возвращает на S0. Второе обеспечено тем, что
   store.initial() всегда AUTH — авторизация не восстанавливается из storage.
   ============================================================ */
import { h, mount, icon, toast } from '../ui.js';
import { t } from '../i18n.js';
import { dispatch } from '../store.js';
import { load, save } from '../storage.js';
import { auth } from '../mock/api.js';
import { field, passwordField, otpInput, setLoading, shake } from '../fields.js';

/* Версия АРМ в подвале S0 (§6/S0). Держим строкой здесь, а не в словаре:
   номер версии не переводится, и в i18n он бы разъехался между языками. */
const VERSION = '1.3.0';

export function renderLogin(host) {
  let step = 0;                       // 0 креды · 1 OTP · 2 привязка
  let creds = null;
  let cooldownTimer = null;

  const card = h('div', { class: 's-login__card panel' });
  const slider = h('div', { class: 's-login__slider' }, card);

  mount(host,
    h('div', { class: 's-login' },
      h('div', { class: 's-login__brand' },
        icon('logo', { size: 24 }),
        h('span', { class: 'h3' }, t('login.title'))),
      h('p', { class: 'small s-login__subtitle' }, t('app.subtitle')),
      slider,
      // §6/S0 требует в подвале версию рядом с «Сессия действует…» (Д-21):
      // при разборе инцидента первое, что спрашивают у оператора, — какая
      // версия АРМ на окне, и искать её в devtools ему нечем.
      h('p', { class: 'small s-login__legend' },
        t('login.legend'),
        h('span', { class: 'ink-faint' }, ' · '),
        h('span', { class: 'tnum ink-faint' }, `${t('app.version')} ${VERSION}`))));

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
    //
    // select тоже ищем: на шаге привязки полей ввода нет вообще, там два
    // <select> (ЦОН и окно), и запрос только по input не находил ничего —
    // фокус молча не вставал, и шаг требовал мыши (Д-20).
    card.querySelector('input, select')?.focus();
  }

  /* ---------- шаг 1: креды ---------- */
  function stepCreds() {
    const err = h('span', { class: 'field__error', role: 'alert' });
    const login = field({ label: t('login.login'), value: 'operator.sino04', name: 'username', autocomplete: 'username' });
    const pass = passwordField({ label: t('login.password') });
    const submit = h('button', { class: 'btn btn--primary btn--l s-login__submit', type: 'submit' },
      t('login.submit'));

    const form = h('form', {
      class: 'stack g-4', novalidate: true,
      onSubmit: async e => {
        e.preventDefault();
        err.textContent = '';
        setLoading(submit, true);
        try {
          const r = await auth.login(login.input.value.trim(), pass.input.value);
          creds = r.operator;
          go(1);
        } catch (e2) {
          shake(card);
          err.textContent = e2.code === 'LOCKED_OUT'
            ? t('login.lockout', { t: '00:30' })
            : t('login.badCreds');
          pass.input.select();
        } finally {
          setLoading(submit, false);
        }
      },
    },
      stepLabel(1), login.el, pass.el, err, submit);

    return form;
  }

  /* ---------- шаг 2: OTP ---------- */
  function stepOtp() {
    const err = h('span', { class: 'field__error', role: 'alert' });
    const cells = otpInput(code => submitOtp(code));
    const submit = h('button', { class: 'btn btn--primary btn--l s-login__submit', type: 'submit' },
      t('login.submit'));

    const resend = h('button', {
      class: 'btn btn--ghost btn--l', type: 'button',
      onClick: async () => { await auth.resendOtp(); toast(t('login.otpResent'), 'success'); },
    }, t('login.otpResend'));

    const form = h('form', {
      class: 'stack g-4', novalidate: true,
      onSubmit: e => { e.preventDefault(); submitOtp(cells.value()); },
    },
      stepLabel(2),
      h('span', { class: 'label' }, t('login.otpTitle')),
      cells.el,
      err,
      submit,
      h('div', { class: 'row center' }, resend));

    async function submitOtp(code) {
      err.textContent = '';
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
        return;
      }
      const s = Math.ceil(left / 1000);
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

  function stepLabel(n) {
    return h('span', { class: 'small s-login__step' }, t('login.step', { n }));
  }
}

/* ЦОНы нужны синхронно в finishLogin (авто-привязка), а fetch там уже поздно.
   Грузим один раз на старте приложения (см. app.js). */
let TSON_CACHE = [];
export async function preloadTsons() { TSON_CACHE = await auth.tsons(); }
const tsonName = id => TSON_CACHE.find(x => x.id === id)?.name || id;
