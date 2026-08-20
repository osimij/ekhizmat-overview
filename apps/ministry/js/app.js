import './data.js';
import { dispatchLowCode, getLowCodeState, subscribeLowCode } from '../../admin/js/lowcode.js';
/* Theme and language belong to design-system/js/preferences.js — the single
   owner of the `ekh.preferences.*` keys (§1 rule 7). Ministry used to keep its
   own binary light/dark toggle, which could not store the third state
   («как в системе») and applied the theme after boot, past first paint. The
   pre-paint script lives in ministry/index.html (§7). */
import { getLang, setLang, getThemeChoice, setTheme } from '/design-system/js/preferences.js';

/* ============================================================
   app.js — прототип «АРМ специалиста ведомства» (§7Б ТЗ eKhizmat).
   Без бэкенда и без фреймворков: обычный DOM + делегирование событий.
   Дизайн-система подключается стилями (tokens/base/components), здесь —
   только поведение и композиция экранов ведомства.
   ============================================================ */
(function () {
  'use strict';
  var D = window.DATA;
  var MIN = D.MIN, HOUR = D.HOUR, DAY = 24 * HOUR;
  var WARN = 60 * MIN;                 // порог «приближение срока» (§7Б.3)

  /* ------------------------------------------------------------------ */
  /* Состояние                                                          */
  /* ------------------------------------------------------------------ */
  var S = {
    authed: false,
    loginStep: 1,
    lang: getLang() === 'tg' ? 'tg' : 'ru',
    sideCollapsed: (function () { try { return localStorage.getItem('ekh.ministry.side') === '1'; } catch (e) { return false; } })(),
    view: 'queue',
    cardId: null,
    cardTab: 'overview',
    apps: [],
    notifs: [],
    filters: { svc: '', status: '', sla: 'all', priority: '', io: '', period: '', q: '' },
    sort: { key: 'sla', dir: 1 },
    sel: {},                            // id → true (выбранные для массовой обработки)
    formDraft: null,
    formReadOnly: false,
    formStep: 'fields',
    formFieldOpen: null,
    formPaletteOpen: false,
    formPreviewOpen: false,
    statIntroPending: false,
    formsFacet: '',                     // '' | 'draft' | 'review' | 'published'
    filterOpen: null,                      // 'svc' | 'status' | null
    modal: null,                        // объект текущей модалки
    pop: null                           // 'notif' | 'user' | null
  };

  /* §7 — фильтры живут в адресе: перезагрузка, «назад» и присланная ссылка
     должны открывать то, на что оператор смотрел. Строка поиска `q` в адрес не
     попадает никогда: в ней бывает ФИО заявителя, а приватный контракт рабочего
     места запрещает персональные данные в адресной строке (§7, платформенное
     исключение). Восстанавливаем только по явному списку значений. */
  var URL_FILTERS = ['svc', 'status', 'sla', 'priority', 'io', 'period'];
  function filterAllowed(key, value) {
    if (!value) return key !== 'sla';
    if (key === 'svc') return Object.prototype.hasOwnProperty.call(D.SERVICE, value);
    if (key === 'status') return Object.prototype.hasOwnProperty.call(D.STATUS, value);
    if (key === 'sla') return value === 'all' || value === 'warn' || value === 'breach';
    if (key === 'priority') return value === 'high';
    if (key === 'io') return value === 'pending' || value === 'received';
    if (key === 'period') return D.REPORT_PERIODS.some(function (x) { return x.id === value; });
    return false;
  }
  function readFiltersFromUrl() {
    var params = new URLSearchParams(location.search);
    URL_FILTERS.forEach(function (key) {
      var value = params.get(key);
      if (value != null && filterAllowed(key, value)) S.filters[key] = value;
    });
  }
  function writeFiltersToUrl() {
    var params = new URLSearchParams(location.search);
    URL_FILTERS.forEach(function (key) {
      var value = S.filters[key];
      var isDefault = key === 'sla' ? value === 'all' : !value;
      if (isDefault) params.delete(key); else params.set(key, value);
    });
    var query = params.toString();
    try { history.replaceState(null, '', location.pathname + (query ? '?' + query : '') + location.hash); } catch (e) {}
  }
  function setFilter(key, value) {
    S.filters[key] = value;
    writeFiltersToUrl();
    renderMain();
  }

  /* Сессия оператора в этой вкладке. F5 оставляет на месте; Cmd+Shift+R /
     Ctrl+F5 / выход / закрытие вкладки возвращают на вход. Заявки ведомства
     по-прежнему только в памяти. */
  var ARM_VIEWS = { queue:1, all:1, overdue:1, reports:1, interop:1, forms:1 };
  function readArm() {
    try { return JSON.parse(sessionStorage.getItem('ekh.ministry.arm') || 'null'); }
    catch (e) { return null; }
  }
  function writeArm() {
    if (!S.authed) { clearArm(); return; }
    var view = ARM_VIEWS[S.view] ? S.view : 'queue';
    try { sessionStorage.setItem('ekh.ministry.arm', JSON.stringify({ view: view })); } catch (e) {}
  }
  function clearArm() {
    try { sessionStorage.removeItem('ekh.ministry.arm'); } catch (e) {}
  }
  addEventListener('keydown', function (e) {
    var hardR = (e.key === 'r' || e.key === 'R') && (e.metaKey || e.ctrlKey) && e.shiftKey;
    var hardF5 = e.key === 'F5' && (e.shiftKey || e.ctrlKey);
    if (hardR || hardF5) clearArm();
  }, true);

  /* ------------------------------------------------------------------ */
  /* i18n / утилиты                                                     */
  /* ------------------------------------------------------------------ */
  function t(k) { var d = D.I18N[S.lang] || D.I18N.ru; return d[k] != null ? d[k] : (D.I18N.ru[k] || k); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function ic(name, cls) { return '<svg class="icon ' + (cls || '') + '" aria-hidden="true"><use href="/design-system/assets/icons.svg#' + name + '"/></svg>'; }
  function now() { return Date.now(); }

  function fmtDur(ms) {
    var neg = ms < 0; ms = Math.abs(ms);
    var d = Math.floor(ms / DAY), h = Math.floor((ms % DAY) / HOUR), m = Math.floor((ms % HOUR) / MIN);
    var s;
    if (S.lang === 'tg') {
      if (d >= 1) s = d + 'р ' + h + 'с';
      else if (h >= 1) s = h + 'с ' + m + 'дқ';
      else s = m + 'дқ';
    } else if (d >= 1) s = d + 'д ' + h + 'ч';
    else if (h >= 1) s = h + 'ч ' + m + 'м';
    else s = m + 'м';
    return (neg ? '−' : '') + s;
  }
  /* Таджикского нет в ICU браузеров: Intl молча падает на en-US и печатает
     07/26/2026 вместо 26.07.2026. Список локалей оставляет намерение и
     деградирует к той же кириллической конвенции дат (§9). */
  function locale() { return S.lang === 'tg' ? ['tg-TJ', 'ru-RU'] : 'ru-RU'; }
  function fmtDate(ts) { return new Intl.DateTimeFormat(locale(), { day:'2-digit', month:'2-digit', year:'numeric' }).format(new Date(ts)); }
  function fmtDateTime(ts) {
    var dt = new Date(ts);
    return new Intl.DateTimeFormat(locale(), { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }).format(dt);
  }
  function fmtAgo(ts) {
    var diff = now() - ts;
    if (S.lang === 'tg') {
      if (diff < HOUR) return Math.max(1, Math.floor(diff / MIN)) + ' дақиқа пеш';
      if (diff < DAY) return Math.floor(diff / HOUR) + ' соат пеш';
      return Math.floor(diff / DAY) + ' рӯз пеш';
    }
    if (diff < HOUR) return Math.max(1, Math.floor(diff / MIN)) + ' мин назад';
    if (diff < DAY) return Math.floor(diff / HOUR) + ' ч назад';
    return Math.floor(diff / DAY) + ' дн назад';
  }
  function money(v) { return v ? new Intl.NumberFormat(locale()).format(v) + ' сомони' : ''; }

  function slaState(app) {
    var rem = app.dueAt - now();
    if (rem <= 0) return 'breach';
    if (rem <= WARN) return 'warn';
    return 'ok';
  }
  function statusInfo(key) { return D.STATUS[key] || { ru: key, tg: key, pill: 'pill--draft' }; }
  function statusLabel(key) { var s = statusInfo(key); return s[S.lang] || s.ru; }
  function statusIcon(tone, label, iconName) {
    return '<span class="status-icon status-icon--' + tone + '" role="img" aria-label="' + esc(label) + '" title="' + esc(label) + '">' + ic(iconName || (tone === 'success' ? 'i-check' : tone === 'warning' ? 'i-clock' : tone === 'danger' ? 'i-x' : tone === 'info' ? 'i-info' : 'i-dots'), '') + '</span>';
  }
  /* §3: пилюля статуса остаётся законной в шапке карточки — там статус и есть
     главное содержимое вида. В плотной строке списка её место занимает
     .status-icon, и обе сразу не рисуются никогда (правило 6). */
  function appStatusPill(key) {
    var tone = ({ draft:'', submitted:'info', awaiting_pay:'warning', processing:'info', info_requested:'warning', clarify:'warning', decided:'success', done:'success', denied:'danger', withdrawn:'' })[key] || '';
    return '<span class="status-pill' + (tone ? ' status-pill--' + tone : '') + '">' + esc(statusLabel(key)) + '</span>';
  }
  function appStatusIcon(key) {
    var tone = ({ draft:'neutral', submitted:'info', awaiting_pay:'warning', processing:'warning', info_requested:'warning', clarify:'warning', decided:'success', done:'success', denied:'danger', withdrawn:'neutral' })[key] || 'neutral';
    var iconName = ({ draft:'i-edit', submitted:'i-clock', awaiting_pay:'i-clock', processing:'i-clock', info_requested:'i-info', clarify:'i-edit', decided:'i-check', done:'i-check', denied:'i-x', withdrawn:'i-history' })[key];
    return statusIcon(tone, statusLabel(key), iconName);
  }
  function svc(app) { return D.SERVICE[app.svc]; }
  function lc() { return getLowCodeState(); }
  function localValue(value, fallback) {
    if (typeof value === 'string') return value;
    return value && (value[S.lang] || value.ru || value.tg) || fallback || '';
  }
  function serviceName(service) { return localValue(service && service.name); }
  function serviceCategory(service) { return localValue(service && service.cat); }
  function agencyName() { return localValue(D.ME.agency); }
  function divisionName() { return localValue(D.ME.division); }
  function roleName() { return localValue(D.ME.role); }
  function priorityLabel(value) { return value === 'Высокий' ? t('priority_high') : t('priority_normal'); }
  function payStatusLabel(value) {
    return ({ 'Оплачено':t('pay_paid'), 'Не требуется':t('pay_none'), 'Ожидает оплаты':t('pay_wait'), 'Возвращена':t('pay_ret') })[value] || value;
  }
  function payStatusIcon(value) {
    var tone = ({ 'Оплачено':'success', 'Не требуется':'neutral', 'Ожидает оплаты':'warning', 'Возвращена':'danger' })[value] || 'neutral';
    var iconName = ({ 'Оплачено':'i-check', 'Не требуется':'i-dash', 'Ожидает оплаты':'i-clock', 'Возвращена':'i-refresh' })[value];
    return statusIcon(tone, payStatusLabel(value), iconName);
  }
  var DATA_LABEL_TG = {
    'Полное наименование':'Номи пурра',
    'Организационно-правовая форма':'Шакли ташкилию ҳуқуқӣ',
    'Цель деятельности':'Мақсади фаъолият',
    'ИНН учредителя':'РМА-и муассис',
    'Юридический адрес':'Суроғаи ҳуқуқӣ',
    'ФИО заявителя':'Ному насаби аризадиҳанда',
    'Стаж юридической работы':'Собиқаи кори ҳуқуқӣ',
    'Округ деятельности':'Ҳавзаи фаъолият',
    'Диплом о высшем образовании':'Дипломи таҳсилоти олӣ',
    'Тип документа':'Навъи ҳуҷҷат',
    'Страна назначения':'Кишвари таъинот',
    'ФИО владельца':'Ному насаби соҳиби ҳуҷҷат',
    'ИНН юридического лица':'РМА-и шахси ҳуқуқӣ',
    'Форма выписки':'Шакли иқтибос',
    'Текущее имя':'Номи ҷорӣ',
    'Новое имя':'Номи нав',
    'Основание':'Асос',
    'Наименование':'Ном',
    'Вид деятельности':'Навъи фаъолият',
    'Уставный капитал':'Сармояи оинномавӣ',
    'ИНН директора':'РМА-и директор',
    'Жених':'Домод',
    'Невеста':'Арӯс',
    'Дата церемонии':'Санаи маросим',
    'Отдел ЗАГС':'Шуъбаи САҲШ',
    'Наименование головной организации':'Номи ташкилоти асосӣ',
    'Страна регистрации':'Кишвари бақайдгирӣ',
    'Регистрационный номер':'Рақами бақайдгирӣ',
    'Руководитель филиала':'Роҳбари филиал'
  };
  function dataLabel(value) { return S.lang === 'tg' ? (DATA_LABEL_TG[value] || value) : value; }
  function lowCodeStatusLabel(status) {
    return t('form_status_' + status) || status;
  }
  function lowCodeStatusTone(status) {
    return ({ draft:'draft', stage:'stage', in_review:'review', changes_requested:'changes', resubmitted:'review', approved:'approved', rejected:'rejected', published:'published' })[status] || 'draft';
  }
  function lowCodeStatusIcon(status) {
    var tone = ({ draft:'neutral', stage:'info', in_review:'info', changes_requested:'warning', resubmitted:'info', approved:'success', rejected:'danger', published:'success' })[status] || 'neutral';
    var iconName = ({ draft:'i-edit', stage:'i-clock', in_review:'i-clock', changes_requested:'i-edit', resubmitted:'i-refresh', approved:'i-check', rejected:'i-x', published:'i-check' })[status];
    return statusIcon(tone, lowCodeStatusLabel(status), iconName);
  }

  /* ------------------------------------------------------------------ */
  /* Данные: материализация и хранение                                  */
  /* ------------------------------------------------------------------ */
  function materialize() {
    var b = now();
    var apps = D.seed().map(function (a) {
      a.submittedAt = b - a.submittedAgo;
      a.dueAt = b + a.dueOffsetMin * MIN;
      if (a.pay && a.pay.ago != null) a.pay.at = b - a.pay.ago;
      (a.interop || []).forEach(function (r) { r.at = r.status === 'received' ? b - r.ago : b; });
      (a.history || []).forEach(function (h) { h.at = b - h.ago; });
      if (!a.assignee) a.assignee = 'other';
      if (a.decision === undefined) a.decision = null;
      return a;
    });
    var notifs = D.seedNotifs().map(function (nn) { nn.at = b - nn.ago; return nn; });
    return { apps: apps, notifs: notifs };
  }
  function persist() { /* demo records intentionally remain in memory only */ }
  function loadData() {
    var m = materialize(); S.apps = m.apps; S.notifs = m.notifs;
  }
  function resetData() { var m = materialize(); S.apps = m.apps; S.notifs = m.notifs; }
  function appById(id) { for (var i = 0; i < S.apps.length; i++) if (S.apps[i].id === id) return S.apps[i]; return null; }

  /* ------------------------------------------------------------------ */
  /* Выборки для видов                                                  */
  /* ------------------------------------------------------------------ */
  var ACTIVE = { processing: 1, info_requested: 1, clarify: 1 };
  function mineActive() { return S.apps.filter(function (a) { return a.assignee === 'me' && ACTIVE[a.status]; }); }
  function overdue() { return mineActive().filter(function (a) { return slaState(a) === 'breach'; }); }
  function pendingInterop() {
    var n = 0; S.apps.forEach(function (a) { (a.interop || []).forEach(function (r) { if (r.status === 'pending') n++; }); }); return n;
  }

  function applyFilters(list) {
    var f = S.filters, q = f.q.trim().toLowerCase();
    return list.filter(function (a) {
      if (f.svc && a.svc !== f.svc) return false;
      if (f.status && a.status !== f.status) return false;
      if (f.sla !== 'all') { var st = slaState(a); if (f.sla === 'warn' && st === 'ok') return false; if (f.sla === 'breach' && st !== 'breach') return false; }
      if (f.priority === 'high' && a.priority !== 'Высокий') return false;
      if (q) {
        var hay = (a.number + ' ' + serviceName(svc(a)) + ' ' + a.applicant.name + ' ' + (a.applicant.tin || '')).toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
  }
  function slaRank(a) { var st = slaState(a); return st === 'breach' ? 0 : st === 'warn' ? 1 : 2; }
  function sortList(list) {
    var k = S.sort.key, dir = S.sort.dir;
    return list.slice().sort(function (a, b) {
      if (k === 'submitted') return (a.submittedAt - b.submittedAt) * dir;
      // 'sla' (§7Б.2 — «по сроку и приоритету»): бакет срочности → приоритет → срок
      var ra = slaRank(a), rb = slaRank(b);
      if (ra !== rb) return (ra - rb) * dir;
      var pa = a.priority === 'Высокий' ? 0 : 1, pb = b.priority === 'Высокий' ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return (a.dueAt - b.dueAt) * dir;
    });
  }

  /* ================================================================== */
  /* РЕНДЕР: вход (§7Б.4)                                                */
  /* ================================================================== */
  function renderLogin() {
    var step = S.loginStep;
    var loginErr = S._loginErr || '';
    var body =
      '<div class="login">' +
        '<div class="login__inner"><div class="login__brand">' + ic('i-logo') + '<b>eKhizmat</b></div>' +
        '<div class="panel login__card' + (loginErr ? ' is-shake' : '') + '">' +
          (step === 1 ?
            '<div class="stack login__form login__form--credentials">' +
              '<div class="login__heading"><h1>' + esc(t('login_title')) + '</h1></div>' +
              '<div class="login__fields">' +
                '<div class="field login-field--floating"><label class="field__label" for="l-user">' + esc(t('login_user')) + '</label>' +
                  '<input class="field__input" id="l-user" name="username" value="' + esc(D.ME.login) + '" placeholder=" " autocomplete="username" spellcheck="false"></div>' +
                '<div class="field login-field--floating"><label class="field__label" for="l-pass">' + esc(t('login_pass')) + '</label>' +
                  '<input class="field__input" id="l-pass" name="password" type="password" placeholder=" " autocomplete="current-password"' + (loginErr ? ' aria-invalid="true" aria-describedby="login-error"' : '') + '></div>' +
                (loginErr ? '<span class="field__error" id="login-error" role="alert">' + esc(loginErr) + '</span>' : '') +
              '</div>' +
              '<button class="btn btn--primary btn--l" type="button" data-act="login-next">' + esc(t('login_next')) + '</button>' +
            '</div>'
          :
            '<div class="stack login__form login__form--mfa">' +
              '<div class="login__heading"><h1 id="l-otp-label">' + esc(t('login_mfa')) + '</h1>' +
                '<p>' + esc(t('login_mfa_hint')) + '</p></div>' +
              '<div class="otp" id="l-otp" role="group" aria-labelledby="l-otp-label">' +
                  [0,1,2,3,4,5].map(function(i){return '<input class="otp__cell" name="otp-'+(i+1)+'" inputmode="numeric" maxlength="1" data-otp="'+i+'" autocomplete="one-time-code" aria-label="'+esc(t('login_mfa'))+' '+(i+1)+'"'+(loginErr ? ' aria-invalid="true" aria-describedby="login-error"' : '')+'>';}).join('') +
              '</div>' +
              (loginErr ? '<span class="field__error" id="login-error" role="alert">' + esc(loginErr) + '</span>' : '') +
              '<div class="login__actions">' +
                '<button class="btn btn--primary btn--l" type="button" data-act="login-enter">' + esc(t('login_enter')) + '</button>' +
                '<button class="btn btn--ghost btn--l" type="button" data-act="login-back">' + esc(t('login_back')) + '</button>' +
              '</div>' +
            '</div>'
          ) +
        '</div>' +
        '<div class="login__legend"><span class="login__legend-copy">' + esc(t('login_legend_primary')) + '</span></div></div>' +
        /* Rule 31 / §9: language must be switchable before sign-in, and it is
           one quiet --ink-2 icon — a blue ghost gear beside the floating
           platform switcher reads as a second primary on the gate. */
        '<button class="btn btn--icon login__prefs" type="button" data-act="prefs-open" aria-label="' + esc(t('preferences')) + '" aria-haspopup="dialog" aria-expanded="false" aria-controls="pop">' + ic('i-gear','icon--20') + '</button>' +
      '</div>';
    document.getElementById('root').innerHTML = body;
    S._loginErr = false;
  }

  /* ================================================================== */
  /* РЕНДЕР: каркас приложения                                           */
  /* ================================================================== */
  function navItem(view, icon, label, count, alert) {
    var c = count != null && count > 0
      ? '<span class="ekh-side__count' + (alert ? ' ekh-side__count--alert' : '') + '">' + count + '</span>' : '';
    return '<button class="ekh-side__item"' + (S.view === view ? ' aria-current="true"' : '') + ' data-act="nav" data-view="' + view + '" title="' + esc(label) + '">' +
      ic(icon) + '<span class="ekh-side__text">' + esc(label) + '</span>' + c + '</button>';
  }

  function renderApp() {
    closeLayers(true);
    var qCount = mineActive().length, oCount = overdue().length, iCount = pendingInterop();
    var narrowNav = window.matchMedia('(max-width: 960px)').matches;
    var navExpanded = narrowNav ? false : !S.sideCollapsed;
    var navToggleLabel = narrowNav ? t('menu') : t(S.sideCollapsed ? 'expand_sidebar' : 'collapse_sidebar');
    var shell =
      '<div class="app ekh-side-shell' + (S.sideCollapsed ? ' side-collapsed' : '') + '" id="app">' +
        '<div class="side__backdrop" data-act="nav-close"></div>' +

        /* топбар */
        '<header class="topbar app__top">' +
          '<button class="ekh-side-toggle nav-toggle" data-act="nav-toggle" aria-controls="ministry-sidebar" aria-expanded="' + navExpanded + '" aria-label="' + esc(navToggleLabel) + '" title="' + esc(navToggleLabel) + '">' +
            ic('i-chev-l','nav-toggle__desktop-icon') + ic('i-dash','nav-toggle__mobile-icon') + '</button>' +
          '<a class="topbar__brand row g-2" href="#" data-act="nav" data-view="queue">' + ic('i-logo') + '<b>eKhizmat</b></a>' +
          '<div class="topbar__bind"><b>' + esc(t('app_title')) + '</b><span class="small">' + esc(agencyName()) + '</span></div>' +
          '<div class="field__wrap field__wrap--search topbar__search">' +
            '<span class="field__affix">' + ic('i-search','icon--20') + '</span>' +
            '<input class="field__input" id="top-search" placeholder="' + esc(t('search_ph')) + '" aria-label="' + esc(t('search_ph')) + '" value="' + esc(S.filters.q) + '" data-filter="q">' +
          '</div>' +
          /* §3 «Top bar»: справа только слот роли. Язык и тема переехали в
             поповер профиля у карточки оператора (§3 «Global preferences»,
             правило 12) — их ставят раз в смену. Колокольчик остаётся: это
             эскалации по срокам (§7Б.3), они глобальны и релевантны на любом
             экране — тот самый тест, который §3 предъявляет постоянной раме. */
          '<div class="topbar__actions">' +
            '<button class="btn btn--icon iconbtn" data-act="notif-open" aria-label="' + esc(t('notifications')) + '" aria-haspopup="dialog" aria-expanded="false">' + ic('i-bell','icon--20') +
              (unreadNotifs() ? '<span class="badge-dot">' + unreadNotifs() + '</span>' : '') + '</button>' +
          '</div>' +
        '</header>' +

        /* сайдбар */
        '<aside class="app__side" id="ministry-sidebar"><nav class="ekh-side">' +
          '<div class="ekh-side__label">' + esc(t('nav_group')) + '</div>' +
          navItem('queue', 'i-inbox', t('nav_queue'), qCount, false) +
          navItem('all', 'i-history', t('nav_all'), null, false) +
          navItem('overdue', 'i-clock', t('nav_overdue'), oCount, true) +
          '<div class="ekh-side__label">' + esc(t('nav_group2')) + '</div>' +
          navItem('interop', 'i-refresh', t('nav_interop'), iCount, false) +
          navItem('reports', 'i-dash', t('nav_reports'), null, false) +
          '<div class="ekh-side__label">' + esc(t('nav_group3')) + '</div>' +
          navItem('forms', 'i-edit', t('nav_forms'), null, false) +
          '<div class="ekh-side__spacer"></div>' +
          '<button type="button" class="ekh-side__user" data-act="profile-open" aria-haspopup="dialog" aria-expanded="false" aria-controls="ministryProfilePop" title="' + esc(D.ME.name + ' · ' + roleName()) + '">' +
            '<span class="ekh-side__avatar" aria-hidden="true">' + esc(D.ME.initials) + '</span>' +
            '<span class="ekh-side__identity"><b>' + esc(D.ME.name) + '</b>' +
            '<span>' + esc(divisionName()) + '</span></span>' +
          '</button>' +
        '</nav></aside>' +

        /* основная область */
        '<main class="app__main" id="main" tabindex="-1"></main>' +
      '</div>' +
      '<div id="overlay"></div>' +
      '<div class="ekh-toast-region ekh-toast-region--top ekh-toast-region--stack" id="toasts" aria-live="polite"></div>';
    document.documentElement.classList.toggle('side-collapsed', S.sideCollapsed);
    document.getElementById('root').innerHTML = shell;
    renderMain();
  }

  function unreadNotifs() { return S.notifs.filter(function (n) { return n.unread; }).length; }

  function syncNavToggle() {
    var app = document.getElementById('app');
    var button = document.querySelector('[data-act="nav-toggle"]');
    if (!app || !button) return;
    var narrow = window.matchMedia('(max-width: 960px)').matches;
    if (!narrow) app.classList.remove('nav-open');
    var expanded = narrow ? app.classList.contains('nav-open') : !app.classList.contains('side-collapsed');
    var label = narrow ? t('menu') : t(expanded ? 'collapse_sidebar' : 'expand_sidebar');
    button.setAttribute('aria-expanded', String(expanded));
    button.setAttribute('aria-label', label);
    button.setAttribute('title', label);
  }

  function toggleNav() {
    var app = document.getElementById('app');
    if (!app) return;
    if (window.matchMedia('(max-width: 960px)').matches) {
      app.classList.toggle('nav-open');
    } else {
      S.sideCollapsed = !S.sideCollapsed;
      try { localStorage.setItem('ekh.ministry.side', S.sideCollapsed ? '1' : '0'); } catch (e) {}
      /* arm the width tween only for a real toggle — re-renders stay static */
      app.classList.add('ekh-side-anim');
      app.classList.toggle('side-collapsed', S.sideCollapsed);
      /* The shared rail reads the state from <html> (§3 sidebar contract), and
         so does the compact profile popover; the shell grid reads it from
         `.app`. Both must agree. */
      document.documentElement.classList.toggle('side-collapsed', S.sideCollapsed);
    }
    syncNavToggle();
  }

  /* ================================================================== */
  /* РЕНДЕР: основная область по видам                                   */
  /* ================================================================== */
  function renderMain() {
    var main = document.getElementById('main');
    if (!main) return;
    var shell = document.getElementById('app');
    if (shell) {
      shell.classList.toggle('is-form-workspace', S.view === 'forms' || S.view === 'form-builder');
      shell.classList.toggle('is-form-builder', S.view === 'form-builder');
    }
    var html;
    if (S.view === 'card') html = viewCard();
    else if (S.view === 'forms') html = viewForms();
    else if (S.view === 'form-builder') html = viewFormBuilder();
    else if (S.view === 'reports') html = viewReports();
    else if (S.view === 'interop') html = viewInterop();
    else html = viewQueue();     // queue | all | overdue
    main.innerHTML = html;
    if (S.statIntroPending) S.statIntroPending = false;
    tick();                       // сразу проставить живые сроки
    // синхронизировать активную навигацию (view мог смениться на 'card')
    document.querySelectorAll('.ekh-side__item').forEach(function (b) {
      var activeView = S.view === 'form-builder' ? 'forms' : S.view;
      if (b.getAttribute('data-view') === activeView) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
    });
  }

  /* ---- формы услуг: автор ведомства → проверка портала ---- */
  function formAudienceBadges(audience) {
    var labels = { person:t('form_person'), business:t('form_business'), guest:t('form_guest') };
    var selected = audience || [];
    return ['person','business','guest'].filter(function (id) { return selected.indexOf(id) >= 0; }).map(function (id) {
      return '<span class="form-audience form-audience--' + esc(id) + '">' + esc(labels[id] || id) + '</span>';
    }).join('');
  }

  function ministryForms() {
    var state = lc();
    return [
      {
        id:'shared', current:true, icon:'i-users', tone:'hue-indigo',
        name:localValue(state.serviceName, t('form_default_name')),
        status:state.status, version:state.serviceVersion, audience:state.audience,
        meta:t('form_updated_now')
      },
      { id:'apostille', icon:'i-cat-cert', tone:'hue-teal', name:S.lang === 'tg' ? 'Гузоштани апостил' : 'Проставление апостиля', status:'published', version:'1.8', audience:['person','guest'], meta:t('form_updated_4d') },
      { id:'notary', icon:'i-cat-license', tone:'hue-amber', name:S.lang === 'tg' ? 'Иҷозатнома барои фаъолияти нотариалӣ' : 'Лицензия на нотариальную деятельность', status:'published', version:'2.1', audience:['person'], meta:t('form_updated_12d') },
      { id:'extract', icon:'i-doc', tone:'hue-blue', name:S.lang === 'tg' ? 'Иқтибос аз феҳристи шахсони ҳуқуқӣ' : 'Выписка из реестра юридических лиц', status:'approved', version:'0.9', audience:['business','guest'], meta:t('form_updated_yesterday') }
    ];
  }

  /* Полоса версии по правилу 26: компактный vN, состояние несёт фон (зелёный —
     опубликовано, янтарный — черновик или проверка, нейтральный — архив),
     слегка скруглённый, без значка внутри. Текст статуса живёт в title и
     .sr-only, поэтому цвет не единственный канал (§9). */
  function formVersionStrip(form) {
    /* Зелёный — только «опубликовано»: подтверждённая, но ещё не выложенная
       версия остаётся работой в пути, а не живой формой (правило 26). */
    var tone = form.status === 'published' ? 'published' : 'draft';
    var label = lowCodeStatusLabel(form.status);
    return '<span class="form-mini-version form-mini-version--' + tone + '" title="' + esc(label) + '">' +
      '<b>v' + esc(form.version) + '</b><span class="sr-only">' + esc(label) + '</span></span>';
  }
  function viewForms() {
    S.formDraft = null;
    S.formReadOnly = false;
    var forms = ministryForms(), state = lc();
    var DRAFT = ['draft','stage','changes_requested','rejected'], REVIEW = ['in_review','resubmitted','approved'];
    var drafts = forms.filter(function (f) { return DRAFT.indexOf(f.status) >= 0; }).length;
    var review = forms.filter(function (f) { return REVIEW.indexOf(f.status) >= 0; }).length;
    var published = forms.filter(function (f) { return f.status === 'published'; }).length;
    var facet = S.formsFacet;
    var shown = forms.filter(function (f) {
      if (facet === 'draft') return DRAFT.indexOf(f.status) >= 0;
      if (facet === 'review') return REVIEW.indexOf(f.status) >= 0;
      if (facet === 'published') return f.status === 'published';
      return true;
    });
    var commentsN = (state.comments || []).length;
    /* Синий на действии страницы-обзора — вторая главная кнопка (правило 15):
       создание формы остаётся, но тихой пилюлей. */
    var h = '<div class="view forms-view">' +
      '<div class="view__head"><div class="view__titles"><h1 class="h2">' + esc(t('forms_title')) + '</h1>' +
      '<div class="view__sub">' + esc(t('forms_sub')) + '</div></div>' +
      '<div class="view__actions"><button class="btn btn--quiet" type="button" data-act="form-create">' + ic('i-plus','icon--16') + esc(t('forms_create')) + '</button></div></div>' +
      '<div class="stat-grid forms-stats">' +
        statFilter(drafts, t('forms_drafts'), '', facet === 'draft', 'forms-facet', 'draft') +
        statFilter(review, t('forms_review'), review ? 'warn' : '', facet === 'review', 'forms-facet', 'review') +
        statFilter(published, t('forms_published'), 'ok', facet === 'published', 'forms-facet', 'published') +
      '</div>' +
      '<div class="panel forms-catalog"><div class="forms-catalog__head"><h2 class="h3">' + esc(t('forms_registry')) + '</h2></div>' +
      '<div class="form-list" aria-live="polite">';

    shown.forEach(function (form) {
      var openAct = form.current ? 'form-open' : 'form-open-static';
      var comments = form.current && commentsN
        ? '<span class="form-row__comments">' + ic('i-chat','icon--16') + esc(t('forms_comments_chip').replace('{n}', commentsN)) + '</span>'
        : '';
      h += '<button class="form-row" type="button" data-act="' + openAct + '" data-id="' + esc(form.id) + '">' +
        '<span class="form-row__icon ' + esc(form.tone) + '">' + ic(form.icon,'') + '</span>' +
        '<span class="form-row__main"><b>' + esc(form.name) + '</b><span>' + esc(form.meta) + '</span>' +
        '<span class="form-row__audiences">' + formAudienceBadges(form.audience) + comments + '</span></span>' +
        formVersionStrip(form) +
        ic('i-chev-r','icon--16') + '</button>';
    });
    h += '</div></div>';
    return h + '</div>';
  }

  function makeFormDraft(state) {
    var fields = state.formFields && state.formFields.length ? state.formFields : [
      { id:'field-1', label:{ru:'Название организации',tg:'Номи ташкилот'}, type:'text', required:true }
    ];
    return {
      serviceName:{ ru:localValue(state.serviceName, t('form_default_name')), tg:state.serviceName && state.serviceName.tg || '' },
      audience:(state.audience || ['person']).slice(),
      formFields:fields.map(function (field) {
        return { id:field.id, label:{ ru:field.label && field.label.ru || localValue(field.label,''), tg:field.label && field.label.tg || '' }, type:field.type || 'text', required:field.required !== false };
      })
    };
  }

  function isFormEditable() {
    if (S.formReadOnly) return false;
    return ['draft','stage','changes_requested','rejected'].indexOf(lc().status) >= 0;
  }

  function formStepGroups() {
    return [
      { label:t('form_flow_citizen'), items:[
        { id:'confirm', icon:'i-shield', title:t('form_step_confirm'), sub:t('form_step_confirm_sub') },
        { id:'fields', icon:'i-edit', title:t('form_step_fields'), sub:t('form_step_fields_sub') },
        { id:'delivery', icon:'i-wallet', title:t('form_step_delivery'), sub:t('form_step_delivery_sub') },
        { id:'review', icon:'i-sign', title:t('form_step_review'), sub:t('form_step_review_sub') }
      ]},
      { label:t('form_flow_agency'), items:[
        { id:'checks', icon:'i-check', title:t('form_step_checks'), sub:t('form_step_checks_sub') },
        { id:'route', icon:'i-users', title:t('form_step_route'), sub:t('form_step_route_sub') },
        { id:'issue', icon:'i-doc', title:t('form_step_issue'), sub:t('form_step_issue_sub') }
      ]}
    ];
  }

  function formFieldTypeLabel(type) { return t('form_type_' + (type || 'text')); }
  function formFieldTypeIcon(type) {
    return ({ textarea:'i-edit', select:'i-dots', date:'i-calendar', file:'i-upload', checkbox:'i-check' })[type] || 'i-edit';
  }

  /* Правило 22: в рельсе только названия шагов. Подзаголовок каждого шага
     повторял то, что и так печатает шапка выбранной панели, а янтарная точка
     на шаге маршрута была сигналом без объяснения и без доступного имени.
     Счётчик «7 шагов» пересказывал сам список. */
  function formPipeline(draft, editable) {
    var groups = formStepGroups();
    var h = '<aside class="mfb-pipeline" aria-label="' + esc(t('form_flow_title')) + '"><div class="mfb-pipeline__head"><h2>' + esc(t('form_flow_title')) + '</h2></div>';
    groups.forEach(function (group) {
      h += '<div class="mfb-pipeline__label">' + esc(group.label) + '</div><div class="mfb-pipeline__group" role="tablist" aria-label="' + esc(group.label) + '">';
      group.items.forEach(function (step) {
        var active = S.formStep === step.id;
        h += '<button class="mfb-step" type="button" role="tab" data-act="form-step" data-id="' + step.id + '" aria-selected="' + (active ? 'true' : 'false') + '" tabindex="' + (active ? '0' : '-1') + '">' +
          '<span class="mfb-step__icon">' + ic(step.icon,'icon--16') + '</span><span class="mfb-step__text"><b>' + esc(step.title) + '</b></span>' +
          (step.id === 'fields' ? '<span class="mfb-step__count">' + draft.formFields.length + '</span>' : '') + '</button>';
      });
      h += '</div>';
    });
    return h + '</aside>';
  }

  function formToggleRow(icon, title, meta, checked, disabled) {
    return '<label class="mfb-toggle-row"><span class="mfb-toggle-row__icon">' + ic(icon,'icon--16') + '</span><span class="mfb-toggle-row__text"><b>' + esc(title) + '</b><span>' + esc(meta) + '</span></span><span class="sw"><input type="checkbox" ' + (checked ? 'checked ' : '') + (disabled ? 'disabled ' : '') + '><span class="knob"></span></span></label>';
  }

  function formFieldPreview(field) {
    var label = localValue(field.label, t('form_untitled_field')) + (field.required ? ' *' : '');
    var common = '<span class="field__label" data-preview-field="' + esc(field.id) + '">' + esc(label) + '</span>';
    if (field.type === 'textarea') return '<label class="field">' + common + '<textarea class="input" rows="2" disabled placeholder="' + esc(t('form_preview_placeholder')) + '"></textarea></label>';
    if (field.type === 'select') return '<label class="field">' + common + '<select class="input" disabled><option>' + esc(t('form_preview_select')) + '</option></select></label>';
    if (field.type === 'date') return '<label class="field">' + common + '<input class="input" type="date" disabled></label>';
    if (field.type === 'file') return '<div class="mfb-preview-upload">' + ic('i-upload','icon--20') + '<span><b>' + esc(label) + '</b><small>' + esc(t('form_preview_upload')) + '</small></span></div>';
    if (field.type === 'checkbox') return '<label class="mfb-preview-check"><input type="checkbox" disabled><span>' + esc(label) + '</span></label>';
    return '<label class="field">' + common + '<input class="input" disabled placeholder="' + esc(t('form_preview_placeholder')) + '"></label>';
  }

  /* Правило 23: постоянная рама не пульсирует — вместо синей пилюли с зелёной
     точкой здесь тихая подпись. Сам аппарат — общий `.pv-phone` (§6 «Device
     previews»): настоящая геометрия iPhone 17 Pro Max и никакой поддельной
     строки состояния ОС. Подпись — под устройством. */
  function formPreview(draft, title) {
    var fields = draft.formFields.map(formFieldPreview).join('');
    return '<aside class="mfb-preview ' + (S.formPreviewOpen ? 'is-open' : '') + '" id="formPreview" tabindex="0" aria-label="' + esc(t('form_preview')) + '">' +
      '<div class="mfb-preview__bar">' +
      '<button class="btn btn--icon btn--s mfb-preview__close" type="button" data-act="form-preview-toggle" aria-label="' + esc(t('form_preview_close')) + '">' + ic('i-x','icon--16') + '</button></div>' +
      /* Экран внутри макета — своя область прокрутки, поэтому у него должен быть
       свой таб-стоп: прокручиваемый блок без него недостижим с клавиатуры (§9). */
      '<div class="mfb-preview__stage"><div class="pv-phone"><div class="pv-screen"><span class="pv-island" aria-hidden="true"></span><div class="pv-app" tabindex="0" role="group" aria-label="' + esc(t('form_preview_caption')) + '">' +
      '<div class="mfb-preview-head">' + ic('i-logo','icon--20') + '<b>eKhizmat</b><span>Ф</span></div>' +
      '<div class="mfb-preview-progress"><i class="is-on"></i><i></i><i></i><i></i></div>' +
      '<div class="mfb-preview-body"><div class="mfb-preview-audiences">' + formAudienceBadges(draft.audience) + '</div><h2>' + esc(title) + '</h2><p>' + esc(t('form_preview_intro')) + '</p>' +
      (fields || '<div class="mfb-preview-empty">' + esc(t('form_no_fields')) + '</div>') +
      '<div class="mfb-preview-actions mobile-preview-actions"><button class="btn btn--secondary" type="button" disabled>' + esc(t('form_preview_back')) + '</button><button class="btn btn--primary" type="button" disabled>' + esc(t('form_preview_continue')) + '</button></div></div>' +
      '</div></div></div>' +
      '<span class="pv-caption">' + esc(t('form_preview_caption')) + '</span></div></aside>';
  }

  function formFieldsEditor(draft, editable) {
    var fields = draft.formFields.map(function (field, index) {
      var open = S.formFieldOpen === field.id;
      var label = localValue(field.label, t('form_untitled_field'));
      var requiredMark = field.required
        ? '<span class="mfb-required-mark" aria-hidden="true">*</span><span class="sr-only">, ' + esc(t('form_required')) + '</span>'
        : '';
      var summary = '<span class="mfb-field-icon">' + ic(formFieldTypeIcon(field.type),'icon--16') + '</span><span class="mfb-field-title"><b>' + esc(label) + requiredMark + '</b><span><em>' + esc(formFieldTypeLabel(field.type)) + '</em></span></span>';
      var opener = editable
        ? '<button class="mfb-field-open" type="button" data-act="form-field-open" data-id="' + esc(field.id) + '" aria-expanded="' + (open ? 'true' : 'false') + '">' + summary + '</button>'
        : '<div class="mfb-field-open mfb-field-open--static">' + summary + '</div>';
      return '<article class="mfb-field-item form-field-row ' + (open && editable ? 'is-open' : '') + '" data-form-field-row="' + esc(field.id) + '"><div class="mfb-field-head">' + opener +
        (editable ? '<span class="mfb-field-actions"><button class="btn btn--icon btn--s" type="button" data-act="form-field-up" data-id="' + esc(field.id) + '" aria-label="' + esc(t('form_move_up')) + '" ' + (index === 0 ? 'disabled' : '') + '>' + ic('i-chev-d','icon--16 mfb-icon-up') + '</button><button class="btn btn--icon btn--s" type="button" data-act="form-field-down" data-id="' + esc(field.id) + '" aria-label="' + esc(t('form_move_down')) + '" ' + (index === draft.formFields.length - 1 ? 'disabled' : '') + '>' + ic('i-chev-d','icon--16') + '</button><button class="btn btn--icon btn--s" type="button" data-act="form-remove-field" data-id="' + esc(field.id) + '" aria-label="' + esc(t('form_remove_field')) + '">' + ic('i-trash','icon--16') + '</button></span>' : '') + '</div>' +
        (open && editable ? '<div class="mfb-field-body"><div class="form-name-grid"><label class="field"><span class="field__label">' + esc(t('form_field_label')) + ' · ' + esc(S.lang.toUpperCase()) + '</span><input class="input" data-form-field-label="' + esc(field.id) + '" value="' + esc(field.label && field.label[S.lang] || '') + '"></label><label class="field"><span class="field__label">' + esc(t('form_field_type')) + '</span><select class="input" data-form-field-type="' + esc(field.id) + '">' + ['text','textarea','select','date','file','checkbox'].map(function (type) { return '<option value="' + type + '" ' + (field.type === type ? 'selected' : '') + '>' + esc(formFieldTypeLabel(type)) + '</option>'; }).join('') + '</select></label></div><label class="mfb-required"><input class="check__input" type="checkbox" data-form-field-required="' + esc(field.id) + '" ' + (field.required ? 'checked' : '') + '><span>' + esc(t('form_required_field')) + '</span></label></div>' : '') + '</article>';
    }).join('');

    var types = ['text','textarea','select','date','file','checkbox'];
    var palette = S.formPaletteOpen && editable ? '<div class="mfb-palette" role="group" aria-label="' + esc(t('form_choose_type')) + '"><div class="mfb-palette__head"><b>' + esc(t('form_choose_type')) + '</b><button class="btn btn--icon btn--s" type="button" data-act="form-add-field" aria-label="' + esc(t('form_palette_close')) + '">' + ic('i-x','icon--16') + '</button></div><div class="mfb-palette__grid">' + types.map(function (type) { return '<button type="button" data-act="form-add-field-type" data-id="' + type + '"><span>' + ic(formFieldTypeIcon(type),'icon--20') + '</span><b>' + esc(formFieldTypeLabel(type)) + '</b><small>' + esc(t('form_type_' + type + '_hint')) + '</small></button>'; }).join('') + '</div></div>' : '';

    return '<div class="mfb-name-grid"><label class="field"><span class="field__label">' + esc(t('form_name_ru')) + '</span><input class="input" data-form-name="ru" value="' + esc(draft.serviceName.ru || '') + '" ' + (editable ? '' : 'disabled') + '></label><label class="field"><span class="field__label">' + esc(t('form_name_tg')) + '</span><input class="input" data-form-name="tg" value="' + esc(draft.serviceName.tg || '') + '" ' + (editable ? '' : 'disabled') + '></label></div><div class="mfb-field-list">' + (fields || '<div class="mfb-fields-empty">' + ic('i-edit','icon--24') + '<b>' + esc(t('form_no_fields')) + '</b><span>' + esc(t('form_no_fields_hint')) + '</span></div>') + '</div>' + (editable ? '<button class="btn btn--secondary form-add-field" type="button" data-act="form-add-field">' + ic('i-plus','icon--16') + esc(t('form_add_field')) + '</button>' + palette : '');
  }

  function formEditorPane(draft, editable) {
    var step = S.formStep;
    var heads = {
      confirm:[t('form_step_confirm'),t('form_editor_confirm_intro')], fields:[t('form_step_fields'),t('form_editor_fields_intro')], delivery:[t('form_step_delivery'),t('form_editor_delivery_intro')], review:[t('form_step_review'),t('form_editor_review_intro')], checks:[t('form_step_checks'),t('form_editor_checks_intro')], route:[t('form_step_route'),t('form_editor_route_intro')], issue:[t('form_step_issue'),t('form_editor_issue_intro')]
    };
    var body = '';
    if (step === 'fields') body = formFieldsEditor(draft, editable);
    else if (step === 'confirm') body = '<div class="mfb-section-label">' + esc(t('form_prefilled_data')) + '</div><div class="mfb-toggle-list">' + formToggleRow('i-user',t('form_prefill_person'),t('form_prefill_person_sub'),true,!editable) + formToggleRow('i-building',t('form_prefill_org'),t('form_prefill_org_sub'),true,!editable) + formToggleRow('i-pin',t('form_prefill_address'),t('form_prefill_address_sub'),false,!editable) + '</div>';
    else if (step === 'delivery') body = '<div class="mfb-section-label">' + esc(t('form_delivery_methods')) + '</div><div class="mfb-toggle-list">' + formToggleRow('i-wallet',t('form_delivery_digital'),t('form_delivery_digital_sub'),true,!editable) + formToggleRow('i-doc',t('form_delivery_paper'),t('form_delivery_paper_sub'),false,!editable) + '</div><div class="mfb-section-label">' + esc(t('form_cost')) + '</div><div class="cost-options"><label><input type="radio" name="form-cost" checked ' + (editable ? '' : 'disabled') + '><span>' + esc(t('form_free')) + '</span></label><label><input type="radio" name="form-cost" ' + (editable ? '' : 'disabled') + '><span>' + esc(t('form_paid')) + '</span></label></div>';
    else if (step === 'review') body = '<div class="mfb-section-label">' + esc(t('form_consent')) + '</div><label class="field"><textarea class="input" rows="3" ' + (editable ? '' : 'disabled') + '>' + esc(t('form_consent_text')) + '</textarea></label><div class="mfb-toggle-list mfb-toggle-list--spaced">' + formToggleRow('i-sign',t('form_esign'),t('form_esign_sub'),true,true) + formToggleRow('i-call',t('form_sms'),t('form_sms_sub'),false,!editable) + '</div>';
    else if (step === 'checks') body = '<div class="mfb-section-label">' + esc(t('form_active_checks')) + '</div><div class="mfb-toggle-list">' + formToggleRow('i-shield',t('form_check_registry'),t('form_check_registry_sub'),true,!editable) + formToggleRow('i-search',t('form_check_duplicate'),t('form_check_duplicate_sub'),true,!editable) + formToggleRow('i-doc',t('form_check_files'),t('form_check_files_sub'),false,!editable) + '</div>';
    else if (step === 'route') body = '<div class="form-name-grid"><label class="field"><span class="field__label">' + esc(t('form_responsible_unit')) + '</span><select class="input" ' + (editable ? '' : 'disabled') + '><option>' + esc(t('form_unit_nko')) + '</option><option>' + esc(t('form_unit_legal')) + '</option></select></label><label class="field"><span class="field__label">' + esc(t('form_reviewer_role')) + '</span><select class="input" ' + (editable ? '' : 'disabled') + '><option>' + esc(t('form_role_specialist')) + '</option><option>' + esc(t('form_role_lead')) + '</option></select></label><label class="field"><span class="field__label">' + esc(t('form_sla')) + '</span><input class="input" value="' + esc(t('form_sla_value')) + '" ' + (editable ? '' : 'disabled') + '></label></div><div class="mfb-toggle-list mfb-toggle-list--spaced">' + formToggleRow('i-bell',t('form_escalation'),t('form_escalation_sub'),true,!editable) + '</div>';
    else body = '<div class="mfb-section-label">' + esc(t('form_result_document')) + '</div><div class="mfb-output-card"><span>' + ic('i-doc','icon--20') + '</span><div><b>' + esc(t('form_result_nko')) + '</b><p>' + esc(t('form_result_nko_sub')) + '</p></div><button class="btn btn--secondary btn--s" type="button" ' + (editable ? '' : 'disabled') + '>' + esc(t('form_template_edit')) + '</button></div><div class="mfb-toggle-list mfb-toggle-list--spaced">' + formToggleRow('i-wallet',t('form_wallet_result'),t('form_wallet_result_sub'),true,!editable) + '</div>';

    var citizenStep = ['confirm','fields','delivery','review'].indexOf(step);
    var stepContext = citizenStep >= 0 ? t('form_step_label') + ' ' + (citizenStep + 1) + ' · ' + t('form_flow_citizen') : t('form_flow_agency');
    /* The editor pane is its own scroll region (§5 shell-lock), so it must be
       reachable from the keyboard — a scrollable box with no tab stop strands
       anyone not using a mouse (§9). */
    return '<section class="mfb-editor" role="tabpanel" tabindex="0"><div class="mfb-editor__inner"><header class="mfb-editor__head"><span>' + ic((formStepGroups().reduce(function (all,g) { return all.concat(g.items); },[]).filter(function (item) { return item.id === step; })[0] || {icon:'i-edit'}).icon,'icon--14') + esc(stepContext) + '</span><h1>' + esc(heads[step][0]) + '</h1><p>' + esc(heads[step][1]) + '</p></header>' + body + '</div></section>';
  }

  function viewFormBuilder() {
    var state = lc();
    if (!S.formDraft) S.formDraft = makeFormDraft(state);
    var draft = S.formDraft, editable = isFormEditable();
    var title = localValue(draft.serviceName, t('form_untitled'));
    var status = S.formReadOnly ? 'published' : state.status;
    var canSend = editable && draft.formFields.length > 0;
    var sendLabel = state.status === 'changes_requested' ? t('form_resubmit') : t('form_send');

    return '<div class="form-builder-view">' +
      '<header class="mfb-top form-builder-head"><a class="back-link" href="#" data-act="form-back">' + ic('i-chev-l','icon--16') + '<span>' + esc(t('forms_title')) + '</span></a><span class="mfb-divider" aria-hidden="true"></span><span class="mfb-service-icon">' + ic('i-cat-justice','icon--16') + '</span><div class="mfb-title"><h1>' + esc(title) + '</h1><span class="form-status form-status--' + lowCodeStatusTone(status) + '">' + lowCodeStatusIcon(status) + '</span></div><span class="mfb-spacer"></span><button class="btn btn--secondary btn--s mfb-preview-toggle" type="button" data-act="form-preview-toggle" aria-expanded="' + (S.formPreviewOpen ? 'true' : 'false') + '" aria-controls="formPreview">' + ic('i-eye','icon--16') + esc(t('form_preview')) + '</button>' +
      (editable ? '<div class="mfb-actions"><button class="btn btn--secondary btn--s" type="button" data-act="form-save">' + ic('i-check','icon--16') + esc(t('form_save_short')) + '</button><button class="btn btn--primary btn--s" type="button" data-act="form-send" ' + (canSend ? '' : 'disabled') + '>' + ic('i-users','icon--16') + esc(sendLabel) + '</button></div>' : '') + '</header>' +
      '<div class="mfb-meta"><div class="mfb-meta__main"><span class="mfb-env">Stage</span><span>' + esc(t('form_version')) + ' ' + esc(state.serviceVersion) + '</span></div><div class="mfb-audiences"><b>' + esc(t('form_audiences')) + '</b>' + ['person','business','guest'].map(function (id) { return '<label><input type="checkbox" data-form-audience="' + id + '" ' + (draft.audience.indexOf(id) >= 0 ? 'checked' : '') + ' ' + (editable ? '' : 'disabled') + '><span>' + esc(id === 'person' ? t('form_person') : id === 'business' ? t('form_business') : t('form_guest')) + '</span></label>'; }).join('') + '</div><button type="button" class="mfb-meta__comments" data-act="form-comments" aria-haspopup="dialog" aria-expanded="false" aria-controls="pop"' + ((state.comments || []).length ? '' : ' disabled') + '>' + ic('i-chat','icon--14') + '<span>' + esc(t('form_comments')) + '</span><b>' + (state.comments || []).length + '</b></button></div>' +
      (!editable ? '<div class="banner banner--info form-lock-note">' + ic('i-lock','icon--20') + '<span class="banner__text">' + esc(t(S.formReadOnly ? 'form_readonly_sub' : 'form_locked_review')) + '</span></div>' : '') +
      '<div class="form-builder-grid mfb-work">' + formPipeline(draft, editable) + formEditorPane(draft, editable) + formPreview(draft, title) + '</div>' +
      (S.formPreviewOpen ? '<button class="mfb-preview-backdrop" type="button" data-act="form-preview-toggle" aria-label="' + esc(t('form_preview_close')) + '"></button>' : '') +
    '</div>';
  }

  function staticFormDraft(id) {
    var form = ministryForms().filter(function (item) { return item.id === id; })[0];
    if (!form) return null;
    return {
      serviceName:{ ru:form.name, tg:form.name },
      audience:form.audience.slice(),
      formFields:[
        { id:id + '-request', label:{ru:t('form_static_request'),tg:t('form_static_request')}, type:'text', required:true },
        { id:id + '-contact', label:{ru:t('form_static_contact'),tg:t('form_static_contact')}, type:'text', required:true }
      ]
    };
  }

  function persistFormDraft(saveStage) {
    if (!S.formDraft) return;
    S._lowCodeBusy = true;
    dispatchLowCode('UPDATE_SERVICE', { serviceName:S.formDraft.serviceName, formFields:S.formDraft.formFields });
    var currentAudience = getLowCodeState().audience || [];
    ['person','business','guest'].forEach(function (id) {
      if ((S.formDraft.audience.indexOf(id) >= 0) !== (currentAudience.indexOf(id) >= 0)) {
        dispatchLowCode('SET_AUDIENCE', { value:id });
        currentAudience = getLowCodeState().audience || [];
      }
    });
    if (saveStage) dispatchLowCode('SAVE_STAGE');
    S._lowCodeBusy = false;
  }

  /* ---- очередь / все / просроченные ---- */
  function viewQueue() {
    var scope = S.view;                    // queue | all | overdue
    var base;
    if (scope === 'all') base = S.apps.slice();
    else if (scope === 'overdue') base = overdue();
    else base = mineActive();

    var title, sub;
    if (scope === 'all') { title = t('nav_all'); sub = t('of_agency') + ' · ' + agencyName(); }
    else if (scope === 'overdue') { title = t('overdue_title'); sub = t('overdue_sub'); }
    else { title = t('queue_title'); sub = t('queue_sub'); }

    var list = sortList(applyFilters(base));
    var selCount = Object.keys(S.sel).filter(function (id) { return S.sel[id] && list.some(function(a){return a.id===id;}); }).length;

    var h = '<div class="view">';
    h += '<div class="view__head"><div class="view__titles"><h1 class="h2">' + esc(title) + '</h1>' +
         '<div class="view__sub">' + esc(sub) + '</div></div></div>';

    if (scope === 'overdue') {
      h += '<div class="banner banner--error queue-note">' + ic('i-clock','icon--20') +
           '<span class="banner__text">' + esc(t('overdue_banner')) + '</span></div>';
    }

    // метрики очереди — каждая плитка включает состояние, которое называет
    if (scope !== 'all') {
      var mine = mineActive();
      var f = S.filters;
      var noFilters = !f.svc && !f.status && f.sla === 'all' && !f.priority;
      h += '<div class="stat-grid' + (S.statIntroPending ? ' stat-grid--intro' : '') + '">' +
        statFilter(mine.length, t('nav_queue'), '', noFilters, 'stat-clear') +
        statFilter(overdue().length, t('rep_breach'), overdue().length ? 'alert' : 'ok', f.sla === 'breach', 'stat-sla') +
        statFilter(mine.filter(function (a) { return a.status === 'info_requested'; }).length, t('awaiting_reply'), f.status === 'info_requested' ? 'warn' : '', f.status === 'info_requested', 'stat-status') +
        statFilter(mine.filter(function (a) { return a.priority === 'Высокий'; }).length, t('priority'), '', f.priority === 'high', 'stat-priority') +
        '</div>';
    }

    // тулбар фильтров. Поиск — только в топбаре: два поля на одно состояние
    // читаются как два разных поиска (правило 7).
    h += '<div class="toolbar">' +
      selectFilter('svc', t('f_all_services'), Object.keys(D.SERVICE).map(function (k) { return { v: k, l: serviceName(D.SERVICE[k]) }; }), S.filters.svc) +
      selectFilter('status', t('f_all_statuses'), Object.keys(D.STATUS).map(function (k) { return { v: k, l: statusLabel(k) }; }), S.filters.status) +
      selectFilter('sla', t('sla_all'), [{ v: 'warn', l: t('sla_warn') }, { v: 'breach', l: t('sla_breach') }], S.filters.sla === 'all' ? '' : S.filters.sla, t('deadline')) +
      '<div class="toolbar__spacer"></div>' +
      '<span class="small nowrap" aria-live="polite">' + list.length + ' ' + esc(t('applications_short')) + '</span>' +
    '</div>';

    if (!list.length) {
      var empty = (scope === 'queue' && !S.filters.q && !S.filters.svc && !S.filters.status && S.filters.sla === 'all' && !S.filters.priority);
      h += '<div class="panel panel--pad"><div class="empty">' + ic('i-check','icon--48') +
        '<div class="empty__title">' + esc(empty ? t('empty_queue_title') : t('empty_title')) + '</div>' +
        '<div class="empty__hint">' + esc(empty ? t('empty_queue_hint') : t('empty_hint')) + '</div></div></div>';
      h += '</div>';
      return h;
    }

    // заголовок таблицы
    var sortLabel = function (key, base) {
      return S.sort.key === key ? base + ' — ' + (S.sort.dir === 1 ? t('sort_ascending') : t('sort_descending')) : t('sort_by') + ': ' + base;
    };
    h += '<div class="queue"><div class="q-head">' +
      '<span class="q-checkbox"><input type="checkbox" data-act="sel-all" ' + (selCount && selCount === list.length ? 'checked' : '') + ' aria-label="' + esc(t('select_all_page')) + '"></span>' +
      '<span>' + esc(t('col_num')) + '</span>' +
      '<span>' + esc(t('col_service')) + '</span>' +
      '<span>' + esc(t('col_applicant')) + '</span>' +
      sortHead('submitted', t('col_submitted'), sortLabel) +
      '<span>' + esc(t('col_status')) + '</span>' +
      sortHead('sla', t('col_sla'), sortLabel) +
    '</div><div class="q-list" aria-live="polite">';

    list.forEach(function (a) { h += rowQueue(a); });
    h += '</div>';

    // полоса массовых операций
    if (selCount > 0) {
      var bs = batchStatus(list);
      var hint = bs === 'mixed' ? t('batch_only_same') : bs === 'critical' ? t('batch_critical') : '';
      h += '<div class="batchbar">' +
        '<span class="batchbar__count" aria-live="polite">' + esc(t('selected')) + ': <b>' + selCount + '</b></span>' +
        (hint ? '<span class="batchbar__hint small">' + esc(hint) + '</span>' : '') +
        '<div class="batchbar__spacer"></div>' +
        '<button class="btn btn--secondary btn--s" data-act="sel-clear">' + esc(t('clear_sel')) + '</button>' +
        '<button class="btn btn--primary btn--s" data-act="batch-decide" ' + (bs === 'ok' ? '' : 'aria-disabled="true"') + '>' +
          ic('i-check','icon--20') + esc(t('batch_decide')) + ' ' + selCount + '</button>' +
      '</div>';
    }

    h += '</div></div>';
    return h;
  }

  function statTile(icon, val, label, mod) {
    return '<div class="stat' + (mod ? ' stat--' + mod : '') + '"><div class="stat__v tnum">' + val + '</div>' +
      '<div class="stat__k">' + esc(label) + '</div></div>';
  }
  /* §3 «KPI / stat cards»: когда плитка называет состояние списка, она и есть
     переключатель этого состояния — <button> с aria-pressed, а не декорация
     над таблицей. */
  function statFilter(val, label, mod, pressed, act, value) {
    return '<button type="button" class="stat' + (mod ? ' stat--' + mod : '') + '" aria-pressed="' + (pressed ? 'true' : 'false') + '" data-act="' + act + '"' + (value != null ? ' data-val="' + esc(value) + '"' : '') + '>' +
      '<span class="stat__v tnum">' + val + '</span><span class="stat__k">' + esc(label) + '</span></button>';
  }
  function selectFilter(name, allLabel, opts, cur, label) {
    var items = [{ v: '', l: allLabel }].concat(opts);
    var selected = items.filter(function (x) { return x.v === cur; })[0] || items[0];
    var open = S.filterOpen === name;
    var listId = 'filter-' + name + '-list';
    var o = '';
    items.forEach(function (x) {
      var isSelected = cur === x.v;
      o += '<button class="filter-select__option' + (isSelected ? ' is-selected' : '') + '" type="button" role="option" aria-selected="' + isSelected + '" data-act="filter-option" data-filter-name="' + name + '" data-val="' + esc(x.v) + '">' +
        '<span>' + esc(x.l) + '</span>' + (isSelected ? ic('i-check','icon--16') : '') + '</button>';
    });
    return '<div class="filter-select filter-select--' + name + (open ? ' is-open' : '') + '">' +
      (label ? '<span class="filter-select__label">' + esc(label) + '</span>' : '') +
      '<button class="filter-select__trigger" type="button" data-act="filter-toggle" data-filter-name="' + name + '" aria-label="' + esc(label ? label + ': ' + selected.l : allLabel) + '" aria-haspopup="listbox" aria-expanded="' + open + '" aria-controls="' + listId + '">' +
        '<span>' + esc(selected.l) + '</span>' + ic('i-chev-d','icon--16') + '</button>' +
      '<div class="filter-select__menu" id="' + listId + '" role="listbox" aria-label="' + esc(allLabel) + '"' + (open ? '' : ' hidden') + '>' + o + '</div></div>';
  }
  /* Направление сортировки объявлено в aria-label — рисунок обязан совпадать
     с объявлением (§9): по возрастанию шеврон переворачивается. */
  function sortHead(key, label, sortLabel) {
    var active = S.sort.key === key;
    var cls = (active ? 'is-sorted' : '') + (active && S.sort.dir === 1 ? ' is-asc' : '');
    return '<button data-act="sort" data-key="' + key + '" class="' + cls.trim() + '" aria-label="' + esc(sortLabel(key, label)) + '">' + esc(label) + ic('i-chev-d','') + '</button>';
  }
  function slaWord(st) { return st === 'breach' ? t('sla_word_breach') : st === 'warn' ? t('sla_word_warn') : t('sla_word_ok'); }
  function rowQueue(a) {
    var s = svc(a), st = slaState(a), sel = !!S.sel[a.id];
    var appTin = a.applicant.tin ? t('tin_abbr') + ' ' + a.applicant.tin : '';
    var aria = serviceName(s) + ', ' + a.applicant.name + ', ' + statusLabel(a.status) + ', ' + slaWord(st);
    return '<div class="q-row' + (sel ? ' is-selected' : '') + '" data-act="open-card" data-id="' + a.id + '" tabindex="0" role="button" aria-label="' + esc(aria) + '">' +
      '<span class="q-checkbox"><input type="checkbox" class="check__input" data-act="sel-toggle" data-id="' + a.id + '" ' + (sel ? 'checked' : '') + ' aria-label="' + esc(t('select_application')) + ' ' + esc(a.number) + '"></span>' +
      '<span class="q-num">' + esc(a.number) + '</span>' +
      '<span class="q-service"><span class="stack"><span class="q-service__name">' + esc(serviceName(s)) + '</span>' +
        '<span class="q-service__cat">' + esc(serviceCategory(s)) + (s.critical ? ' · <span class="q-flag">' + esc(t('four_eyes_short')) + '</span>' : '') + '</span></span></span>' +
      '<span class="q-applicant"><span class="q-applicant__name">' + esc(a.applicant.name) + '</span>' +
        '<span class="q-applicant__meta">' + esc(appTin) + '</span></span>' +
      '<span class="q-date">' + esc(fmtDate(a.submittedAt)) + '</span>' +
      '<span class="q-status">' + appStatusIcon(a.status) + '</span>' +
      '<span class="q-sla"><span class="sla sla--' + st + '" data-sla data-due="' + a.dueAt + '" title="' + esc(slaWord(st)) + '" aria-label="' + esc(slaWord(st)) + '"><span class="dot"></span>' +
        '<svg class="icon icon--16 sla__ico" aria-hidden="true"><use href="/design-system/assets/icons.svg#i-clock"/></svg>' +
        '<span class="sla__time">' + fmtDur(a.dueAt - now()) + '</span></span></span>' +
    '</div>';
  }

  // 'none' | 'mixed' (разные услуги/неактивные) | 'critical' (четыре глаза) | 'ok'
  function selectedIn(list) {
    return Object.keys(S.sel).filter(function (id) { return S.sel[id] && list.some(function (a) { return a.id === id; }); });
  }
  function batchStatus(list) {
    var ids = selectedIn(list);
    if (!ids.length) return 'none';
    var first = appById(ids[0]);
    if (!ids.every(function (id) { var a = appById(id); return a && a.svc === first.svc && ACTIVE[a.status]; })) return 'mixed';
    if (svc(first).critical) return 'critical';
    return 'ok';
  }

  /* ---- карточка заявления (§7Б.2) ---- */
  function viewCard() {
    var a = appById(S.cardId);
    if (!a) { S.view = 'queue'; return viewQueue(); }
    var s = svc(a), st = slaState(a), rem = a.dueAt - now();
    var decided = (a.status === 'done' || a.status === 'denied');

    // правая колонка: SLA-кольцо (или итог) + реквизиты + действия
    var slaPanel = decided
      /* Решённое заявление: знак исхода вместо кольца. Подпись «Статус ·
         Исполнено» под ним не нужна — статус уже стоит пилюлей в шапке
         карточки (правило 6); имя знака живёт в aria-label. */
      ? '<div class="panel panel--pad"><div class="sla-ring-wrap"><div class="hero-mark ' + (a.status === 'denied' ? 'hero-mark--error' : '') + '" role="img" aria-label="' + esc(statusLabel(a.status)) + '" title="' + esc(statusLabel(a.status)) + '">' + ic(a.status === 'denied' ? 'i-x' : 'i-check', '') + '</div>' +
          '<div class="sla-caption">' + esc(decidedAtLabel(a)) + '</div></div></div>'
      : '<div class="panel panel--pad"><div class="sla-ring-wrap">' + ringSvg(a) +
          '<div class="label">' + esc(t('deadline')) + '</div>' +
          '<div class="sla-caption" data-sla-cap data-due="' + a.dueAt + '">' + slaCaption(a) + '</div></div></div>';
    var side =
      slaPanel +
      '<div class="panel panel--pad">' +
        '<div class="def">' +
          (a.audience === 'guest' ? defRow(t('applicant'), '<span class="audience-badge audience-badge--guest">' + ic('i-user','icon--16') + esc(t('audience_guest')) + '</span>') : '') +
          defRow(t('priority'), esc(priorityLabel(a.priority))) +
          defRow(t('executor'), esc(a.assignee === 'me' ? D.ME.name : (a.assigneeName || '—'))) +
          defRow(t('division'), esc(divisionName())) +
          defRow(t('payment'), payLabel(a)) +
        '</div>' +
      '</div>' +
      (decided ? resultPanel(a) : (a.assignee === 'me' && ACTIVE[a.status] ? actionsPanel(a) : lockedPanel(a)));

    // основная колонка: шапка + вкладки
    var docsN = (a.docs || []).length, interN = (a.interop || []).length;
    var main =
      '<a class="back-link" href="#" data-act="nav" data-view="queue">' + ic('i-chev-l','icon--16') + esc(t('back')) + '</a>' +
      '<div class="card-head"><span class="card-head__glyph ' + s.hue + '">' + ic(s.icon,'') + '</span>' +
        '<div class="card-head__titles"><div class="card-head__num">' + esc(a.number) + '</div>' +
          '<h1 class="h2">' + esc(serviceName(s)) + '</h1>' +
          '<div class="card-head__meta">' + appStatusPill(a.status) + '<span class="small">' + esc(serviceCategory(s)) + '</span>' +
            (a.audience === 'guest' || s.audience === 'guest' ? '<span class="audience-badge audience-badge--guest">' + ic('i-user','icon--16') + esc(t('audience_guest')) + '</span>' : '') +
            (s.critical ? '<span class="chip"><span>' + ic('i-shield','icon--16') + '</span>' + esc(t('four_eyes')) + '</span>' : '') +
          '</div></div></div>' +
      '<div class="tabs" role="tablist" aria-label="' + esc(serviceName(s)) + '">' +
        cardTab('overview', t('tab_overview')) +
        cardTab('docs', t('tab_docs'), docsN) +
        cardTab('interop', t('tab_interop'), interN) +
        cardTab('history', t('tab_history')) +
      '</div>' +
      '<div id="tabpanel" role="tabpanel" tabindex="0" aria-labelledby="tab-' + S.cardTab + '">' + cardTabBody(a) + '</div>';

    return '<div class="view"><div class="card"><div class="card__main">' + main + '</div>' +
      '<div class="card__side">' + side + '</div></div></div>';
  }

  function cardTab(name, label, badge) {
    var sel = S.cardTab === name;
    return '<button class="tab" role="tab" id="tab-' + name + '" aria-selected="' + sel + '" aria-controls="tabpanel" tabindex="' + (sel ? '0' : '-1') + '" data-act="tab" data-tab="' + name + '">' +
      esc(label) + (badge ? ' <span class="tab-badge">' + badge + '</span>' : '') + '</button>';
  }

  function cardTabBody(a) {
    if (S.cardTab === 'docs') return tabDocs(a);
    if (S.cardTab === 'interop') return tabInterop(a);
    if (S.cardTab === 'history') return tabHistory(a);
    return tabOverview(a);
  }

  function tabOverview(a) {
    var ap = a.applicant;
    var appRows =
      defRow(ap.kind === 'org' ? t('field_org_name') : t('field_full_name'), esc(ap.name)) +
      (ap.kind === 'org'
        ? defRow(t('tin_abbr'), '<span class="def__val--tnum">' + esc(ap.tin) + '</span>') + defRow(t('field_reg_num'), esc(ap.reg)) + defRow(t('field_manager'), esc(ap.head))
        : defRow(t('tin_abbr'), '<span class="def__val--tnum">' + esc(ap.tin) + '</span>') + defRow(t('field_dob'), esc(ap.dob))) +
      defRow(t('field_phone'), '<span class="def__val--tnum">' + esc(ap.phone) + '</span>') +
      (ap.email ? defRow('E-mail', esc(ap.email)) : '') +
      defRow(t('field_address'), esc(ap.address));

    var formRows = (a.form || []).map(function (f) {
      var src = f.src === 'реестр' ? '<span class="src src--profile">' + ic('i-shield','icon--16') + esc(t('src_registry')) + '</span>'
              : f.src === 'профиль' ? '<span class="src src--profile">' + esc(t('src_profile')) + '</span>'
              : '<span class="src src--manual">' + esc(t('src_manual')) + '</span>';
      return '<div class="def__row"><span class="def__key">' + esc(dataLabel(f.k)) + '</span>' +
        '<span class="def__val">' + esc(f.v) + ' &nbsp;' + src + '</span></div>';
    }).join('');

    return '<div class="panel panel--pad"><h3 class="h3 panel__title">' + esc(t('applicant')) + '</h3><div class="def">' + appRows + '</div></div>' +
      '<div class="panel panel--pad mt-4"><h3 class="h3 panel__title">' + esc(t('app_data')) + '</h3><div class="def">' + formRows + '</div></div>';
  }

  function tabDocs(a) {
    if (!(a.docs || []).length) return '<div class="panel panel--pad"><div class="empty">' + ic('i-paperclip','icon--48') +
      '<div class="empty__title">' + esc(t('no_docs')) + '</div></div></div>';
    var rows = a.docs.map(function (d) {
      /* Заливка за иконкой в плотной повторяющейся строке перевешивает текст
         рядом (§6 «Icon fills»), а «Проверен» стояло и в мета-строке, и в
         значке справа. Остаётся голый глиф слева и один носитель статуса
         справа (правила 5 и 6). */
      return '<div class="doc-row">' + ic('i-doc','icon--20 doc-row__glyph') +
        '<span class="doc-row__body"><span class="doc-row__name">' + esc(d.name) + '</span>' +
        '<span class="doc-row__meta">' + d.pages + ' ' + esc(t('pages_short')) + '</span></span>' +
        (d.checked ? statusIcon('success', t('checked'), 'i-check') : statusIcon('warning', t('unchecked'), 'i-clock')) +
        '<button class="btn btn--ghost btn--s" data-act="noop" aria-label="' + esc(t('view_document')) + ' ' + esc(d.name) + '">' + ic('i-eye','icon--20') + '</button></div>';
    }).join('');
    return '<div class="panel panel--pad"><h3 class="h3 panel__title">' + esc(t('docs_title')) + '</h3><div class="doc-list">' + rows + '</div></div>';
  }

  function tabInterop(a) {
    var body;
    if (!(a.interop || []).length) {
      body = '<div class="empty">' + ic('i-refresh','icon--48') + '<div class="empty__title">' + esc(t('no_interop')) + '</div></div>';
    } else {
      body = a.interop.map(function (r) {
        var pend = r.status === 'pending';
        /* Ведущий кружок и хвостовой значок — два представления одного факта
           (правило 6). Слева остаётся голый глиф, справа — единственный
           носитель состояния: .status-icon для полученного, .spin для
           ожидающего. */
        return '<div class="interop-item">' + ic('i-refresh','icon--20 interop-item__glyph') +
          '<span class="interop-item__body"><span class="interop-item__title">' + esc(localValue(r.type)) + '</span>' +
          '<span class="interop-item__meta">' + esc(localValue(r.agency)) + ' · ' + (pend ? esc(t('ij_pending')) : (esc(localValue(r.value)) + ' · ' + fmtAgo(r.at))) + '</span></span>' +
          (pend ? '<span class="spin" role="img" aria-label="' + esc(t('ij_pending')) + '" title="' + esc(t('ij_pending')) + '"></span>' : statusIcon('success', t('ij_received'), 'i-check')) +
        '</div>';
      }).join('');
    }
    return '<div class="panel panel--pad"><div class="panel__head-row"><div><h3 class="h3">' + esc(t('interop_title')) + '</h3>' +
      '<div class="small panel__hint">' + esc(t('interop_hint')) + '</div></div>' +
      '<button class="btn btn--secondary btn--s" data-act="act-request">' + ic('i-plus','icon--20') + esc(t('request_info')) + '</button></div>' +
      '<div class="mt-4">' + body + '</div></div>';
  }

  function tabHistory(a) {
    var items = (a.history || []).slice().sort(function (x, y) { return y.at - x.at; });
    var rows = items.map(function (h, idx) {
      return '<div class="trail__item' + (idx === 0 ? '' : ' trail__item--muted') + '">' +
        '<div class="trail__rail"><span class="trail__dot"></span><span class="trail__line"></span></div>' +
        '<div class="trail__body"><div class="trail__action"><b>' + esc(localValue(h.actor)) + '</b> — ' + esc(localValue(h.action)) + '</div>' +
        '<div class="trail__meta">' + esc(fmtDateTime(h.at)) + ' · ' + esc(statusLabel(h.status)) + '</div></div></div>';
    }).join('');
    return '<div class="panel panel--pad"><h3 class="h3 panel__title">' + esc(t('tab_history')) + '</h3><div class="trail">' + rows + '</div>' +
      '<div class="def__source mt-2">' + ic('i-lock','icon--16') + ' ' + esc(t('audit_immutable')) + '</div></div>';
  }

  function lockedPanel(a) {
    var reason = a.assignee !== 'me' ? t('lp_not_assigned') : t('lp_not_active');
    return '<div class="panel panel--pad"><div class="banner banner--info">' + ic('i-lock', 'icon--20') +
      '<span class="banner__text">' + esc(reason) + '</span></div></div>';
  }
  function actionsPanel(a) {
    return '<div class="panel panel--pad"><h3 class="h3 panel__title">' + esc(t('actions')) + '</h3><div class="actions-stack">' +
      '<button class="btn btn--primary" data-act="act-decide">' + ic('i-check','icon--20') + esc(t('decide')) + '</button>' +
      '<button class="btn btn--secondary" data-act="act-return">' + ic('i-arrow-ur','icon--20') + esc(t('return_clarify')) + '</button>' +
      '<button class="btn btn--secondary" data-act="act-request">' + ic('i-refresh','icon--20') + esc(t('request_info')) + '</button>' +
    '</div></div>';
  }

  function resultPanel(a) {
    if (a.status === 'denied') {
      return '<div class="panel panel--pad"><h3 class="h3 panel__title">' + esc(t('result')) + '</h3>' +
        '<div class="banner banner--error">' + ic('i-x','icon--20') + '<span class="banner__text">' + esc(t('result_denied')) + '</span></div>' +
        '<div class="def__source mt-4">' + esc(t('result_reason')) + ': ' + esc(a.decision ? a.decision.reason : '—') + '</div></div>';
    }
    return '<div class="panel panel--pad"><h3 class="h3 panel__title">' + esc(t('result')) + '</h3>' +
      '<div class="banner banner--ok">' + ic('i-sign','icon--20') + '<span class="banner__text"><b>' + esc(t('result_signed')) + '</b><br>' + esc(t('result_available')) + '</span></div>' +
      resultDoc(a) +
      '<button class="btn btn--secondary btn-block mt-4" data-act="noop">' + ic('i-download','icon--20') + esc(t('download_result')) + '</button></div>';
  }

  function resultDoc(a) {
    var s = svc(a);
    return '<div class="mt-4 center"><div class="doc-thumb result-doc" data-act="noop"><div class="doc-page">' +
      '<div class="doc-page__head">' + ic('i-logo','icon--16') + ' ' + esc(agencyName()) + ' · eKhizmat</div>' +
      '<div class="doc-page__title">' + esc(serviceName(s)) + '</div>' +
      '<div class="doc-page__rows">' +
        '<div class="doc-page__row"><span class="doc-page__key">' + esc(t('document_applicant')) + '</span><span class="doc-page__val">' + esc(a.applicant.name) + '</span></div>' +
        '<div class="doc-page__row"><span class="doc-page__key">' + esc(t('document_application')) + '</span><span class="doc-page__val">' + esc(a.number) + '</span></div>' +
        '<div class="doc-page__row"><span class="doc-page__key">' + esc(t('document_date')) + '</span><span class="doc-page__val">' + esc(fmtDate(now())) + '</span></div>' +
        '<div class="doc-page__row"><span class="doc-page__key">' + esc(t('document_decision')) + '</span><span class="doc-page__val">' + esc(t('document_positive')) + '</span></div>' +
      '</div>' +
      '<div class="doc-page__sign">' + ic('i-sign','icon--16') + ' ' + esc(t('document_esigned')) + ' · ' + esc(a.decision && a.decision.by ? a.decision.by : D.ME.name) + '</div>' +
    '</div></div></div>';
  }

  function ringSvg(a) {
    var s = svc(a), rem = a.dueAt - now();
    var frac = Math.max(0, Math.min(1, rem / (s.slaHours * HOUR)));
    var C = 339.292; var off = C * (1 - frac);
    var st = slaState(a);
    var cls = st === 'breach' ? 'ring--danger' : st === 'warn' ? 'ring--warn' : '';
    return '<div class="ring ' + cls + '" data-ring data-due="' + a.dueAt + '" data-window="' + (s.slaHours * HOUR) + '">' +
      '<svg class="ring__svg" viewBox="0 0 120 120">' +
      '<circle class="ring__track" cx="60" cy="60" r="54"></circle>' +
      '<circle class="ring__bar" cx="60" cy="60" r="54" style="stroke-dasharray:' + C + ';stroke-dashoffset:' + off + '"></circle></svg>' +
      '<div class="ring__value" data-ring-val>' + fmtDur(rem) + '</div></div>';
  }
  /* Подпись под кольцом не повторяет само кольцо (правило 6): остаток времени
     уже стоит в его центре, поэтому здесь только срок — «до 21.08.2026, 14:00».
     Просрочка — исключение: «на сколько» это не то же, что «сколько осталось». */
  /* Под знаком исхода — когда решение принято. «Кто» уже стоит строкой
     «Исполнитель» рядом, статус — пилюлей в шапке (правило 6). */
  function decidedAtLabel(a) {
    var last = (a.history || []).slice().sort(function (x, y) { return y.at - x.at; })[0];
    return last ? fmtDateTime(last.at) : '';
  }
  function slaCaption(a) {
    var rem = a.dueAt - now();
    if (rem <= 0) return '<b class="sla-caption__breach">' + esc(t('sla_over')) + ' ' + fmtDur(rem).replace('−','') + '</b>';
    return esc(t('until')) + ' <b>' + esc(fmtDateTime(a.dueAt)) + '</b>';
  }
  /* Значение строки должно читаться как значение: без суммы у «Не требуется»
     и «Ожидает оплаты» в колонке оставался один значок, то есть пустая ячейка
     со смыслом только в подсказке (§9 — цвет и иконка не единственный канал). */
  function payLabel(a) {
    var p = a.pay || { status: 'Не требуется' };
    return '<span class="payment-status">' + payStatusIcon(p.status) +
      '<span>' + esc(p.amount ? money(p.amount) : payStatusLabel(p.status)) + '</span></span>';
  }
  function defRow(k, vHtml) {
    return '<div class="def__row"><span class="def__key">' + esc(k) + '</span><span class="def__val">' + vHtml + '</span></div>';
  }

  /* ---- журнал межвед-запросов (§7Б.2, §13) ----
     Работа оператора на этом экране — «найти, что застряло», поэтому сверху
     стоят сводные показатели, а плитка «Ожидают ответа» и есть фильтр этого
     состояния (§3 «KPI / stat cards»). */
  function viewInterop() {
    var rows = [];
    S.apps.forEach(function (a) {
      (a.interop || []).forEach(function (r) { rows.push({ a: a, r: r }); });
    });
    rows.sort(function (x, y) { return y.r.at - x.r.at; });
    var pendingN = rows.filter(function (x) { return x.r.status === 'pending'; }).length;
    var io = S.filters.io;
    var shown = rows.filter(function (x) {
      if (io === 'pending') return x.r.status === 'pending';
      if (io === 'received') return x.r.status !== 'pending';
      return true;
    });
    var body = shown.map(function (x) {
      var pend = x.r.status === 'pending';
      return '<div class="interop-item" data-act="open-card" data-id="' + x.a.id + '" tabindex="0" role="button" aria-label="' + esc(localValue(x.r.type) + ', ' + x.a.number) + '">' +
        ic('i-refresh','icon--20 interop-item__glyph') +
        '<span class="interop-item__body"><span class="interop-item__title">' + esc(localValue(x.r.type)) + '</span>' +
        '<span class="interop-item__meta">' + esc(localValue(x.r.agency)) + ' · ' + esc(x.a.number) + ' · ' + (pend ? esc(t('ij_pending')) : fmtAgo(x.r.at)) + '</span></span>' +
        (pend ? '<span class="spin" role="img" aria-label="' + esc(t('ij_pending')) + '" title="' + esc(t('ij_pending')) + '"></span>' : statusIcon('success', t('ij_received'), 'i-check')) + '</div>';
    }).join('');
    return '<div class="view"><div class="view__head"><div class="view__titles"><h1 class="h2">' + esc(t('ij_title')) + '</h1>' +
      '<div class="view__sub">' + esc(t('ij_sub')) + '</div></div></div>' +
      '<div class="stat-grid">' +
        statFilter(pendingN, t('ij_awaiting'), pendingN ? 'warn' : '', io === 'pending', 'stat-io') +
        statTile('', D.INTEROP_DEMO.receivedToday, t('ij_received_today'), '') +
        statTile('', esc(t('ij_avg_value')), t('ij_avg'), '') +
      '</div>' +
      '<div class="toolbar">' +
        selectFilter('io', t('ij_all'), [{ v: 'pending', l: t('ij_state_pending') }, { v: 'received', l: t('ij_state_received') }], io, t('ij_state')) +
        '<div class="toolbar__spacer"></div>' +
        '<span class="small nowrap" aria-live="polite">' + shown.length + ' ' + esc(t('ij_count')) + '</span>' +
      '</div>' +
      '<div class="panel panel--pad" aria-live="polite">' + (body || '<div class="empty">' + ic('i-refresh','icon--48') + '<div class="empty__title">' + esc(t('no_interop')) + '</div></div>') + '</div></div>';
  }

  /* ---- отчётность по SLA (§7Б.3 → §14) ----
     Читается сверху вниз как один вопрос: сводка → по услугам → по
     специалистам → ритм поступления. Живые числа считаются по S.apps, всё
     периодическое приходит из именованных демо-констант data.js. */
  function reportPeriod() {
    var id = S.filters.period || D.REPORT_PERIODS[0].id;
    return D.REPORT_DEMO[id] ? id : D.REPORT_PERIODS[0].id;
  }
  function reportRow(name, total, breach, extraClass) {
    var rate = total ? Math.round((total - breach) / total * 100) : 0;
    return '<div class="report-row' + (extraClass ? ' ' + extraClass : '') + '">' +
      '<span class="report-row__who">' + name + '</span>' +
      '<span class="report-row__num">' + total + '</span>' +
      '<span class="report-row__num' + (breach ? ' report-row__num--breach' : '') + '">' + breach + '</span>' +
      '<span class="report-row__rate"><span class="meter grow"><span class="meter__fill" style="width:' + rate + '%"></span></span><b class="tnum">' + rate + '%</b></span></div>';
  }
  function reportHead(firstColumn) {
    return '<div class="report-row report-row--head"><span>' + esc(firstColumn) + '</span>' +
      '<span>' + esc(t('rep_col_total')) + '</span><span>' + esc(t('rep_col_breach')) + '</span>' +
      '<span>' + esc(t('rep_col_rate')) + '</span></div>';
  }
  /* Правило 44: полноширинные горизонтальные строки дней, календарная неделя
     пн→вс, число на каждой строке. Компонент общий с ЦОН. */
  function weekChart(values) {
    var days = ['rep_week_mon','rep_week_tue','rep_week_wed','rep_week_thu','rep_week_fri','rep_week_sat','rep_week_sun'].map(t);
    var peak = Math.max.apply(null, values);
    return '<div class="week-chart" role="img" aria-label="' + esc(t('rep_intake_aria')) + '">' +
      values.map(function (v, i) {
        return '<div class="week-chart__row' + (v === peak ? ' week-chart__row--peak' : '') + '">' +
          '<span class="week-chart__day">' + esc(days[i]) + '</span>' +
          '<span class="week-chart__track" aria-hidden="true"><span class="week-chart__fill" style="width:' + Math.round(v / peak * 100) + '%"></span></span>' +
          '<span class="week-chart__value tnum">' + v + '</span></div>';
      }).join('') + '</div>';
  }
  function viewReports() {
    var periodId = reportPeriod(), demo = D.REPORT_DEMO[periodId];
    var breachN = S.apps.filter(function (a) { return ACTIVE[a.status] && slaState(a) === 'breach'; }).length;
    var h = '<div class="view"><div class="view__head"><div class="view__titles"><h1 class="h2">' + esc(t('rep_title')) + '</h1>' +
      '<div class="view__sub">' + esc(t('rep_sub')) + '</div></div>' +
      '<div class="view__actions">' +
        selectFilter('period', localValue(D.REPORT_PERIODS[0]), D.REPORT_PERIODS.map(function (x) { return { v: x.id, l: localValue(x) }; }), periodId, t('rep_period')) +
      '</div></div>';
    h += '<div class="stat-grid">' +
      statTile('', demo.total, t('rep_total'), '') +
      statTile('', demo.onTimeRate + '%', t('rep_ontime'), 'ok') +
      statTile('', breachN, t('rep_breach'), breachN ? 'alert' : 'ok') +
      statTile('', esc(localValue(demo.avgDays)), t('rep_avg'), '') +
      '</div>';

    h += '<div class="panel panel--pad"><h3 class="h3 panel__title">' + esc(t('rep_by_service')) + '</h3><div class="report-table">' +
      reportHead(t('rep_col_service'));
    Object.keys(D.SERVICE).forEach(function (key) {
      var pair = demo.services[key]; if (!pair) return;
      h += reportRow('<span class="report-row__service">' + esc(serviceName(D.SERVICE[key])) + '</span>', pair[0], pair[1]);
    });
    h += '</div></div>';

    h += '<div class="panel panel--pad mt-4"><h3 class="h3 panel__title">' + esc(t('rep_by_specialist')) + '</h3><div class="report-table">' +
      reportHead(t('rep_spec'));
    D.REPORT_SPECIALISTS.forEach(function (sp) {
      h += reportRow('<span class="avatar">' + esc(sp.initials) + '</span>' + esc(sp.name), sp.total, sp.total - sp.onTime);
    });
    h += '</div></div>';

    h += '<div class="panel panel--pad mt-4"><h3 class="h3 panel__title">' + esc(t('rep_intake')) + '</h3>' + weekChart(demo.week) + '</div>';
    return h + '</div>';
  }

  /* ================================================================== */
  /* Живой отсчёт сроков (SLA)                                           */
  /* ================================================================== */
  function tick() {
    var r = now();
    document.querySelectorAll('[data-sla]').forEach(function (el) {
      var due = +el.getAttribute('data-due'), rem = due - r;
      var timeEl = el.querySelector('.sla__time'); if (timeEl) timeEl.textContent = fmtDur(rem);
      var st = rem <= 0 ? 'breach' : rem <= WARN ? 'warn' : 'ok';
      el.classList.remove('sla--ok', 'sla--warn', 'sla--breach');
      el.classList.add('sla--' + st);
      var word = slaWord(st); el.title = word; el.setAttribute('aria-label', word);
    });
    document.querySelectorAll('[data-sla-cap]').forEach(function (el) {
      var due = +el.getAttribute('data-due'), a = { dueAt: due };
      el.innerHTML = slaCaption(a);
    });
    document.querySelectorAll('[data-ring]').forEach(function (el) {
      var due = +el.getAttribute('data-due'), win = +el.getAttribute('data-window'), rem = due - r;
      var frac = Math.max(0, Math.min(1, rem / win)), C = 339.292;
      var bar = el.querySelector('.ring__bar'); if (bar) bar.style.strokeDashoffset = (C * (1 - frac));
      el.classList.remove('ring--warn', 'ring--danger');
      if (rem <= 0) el.classList.add('ring--danger'); else if (rem <= WARN) el.classList.add('ring--warn');
      var v = el.querySelector('[data-ring-val]'); if (v) v.textContent = fmtDur(rem);
    });
  }

  /* ================================================================== */
  /* Модальные окна                                                     */
  /* ================================================================== */
  /* Слой поверх приложения. На воротах входа шелла ещё нет, а тихая
     шестерёнка настроек уже есть — тогда слоем становится #root. */
  function overlayEl() { return document.getElementById('overlay') || document.getElementById('root'); }

  function openModal(html, cls) {
    var previousController = S._modalController;
    if (!previousController) S._modalTrigger = document.activeElement;
    else previousController.close();
    overlayEl().innerHTML = '<div class="overlay" data-act="modal-backdrop"><div class="modal ' + (cls || '') +
      '" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1">' + html + '</div></div>';
    var mod = overlayEl().querySelector('.modal');
    var back = overlayEl().querySelector('.overlay');
    var controller = window.EKHDialog?.openExistingDialog(back, {
      initialFocus:'input:not([type=hidden]),select,textarea,button',
      trigger:S._modalTrigger,
      onClosed:function () { back.remove(); }
    }) || null;
    S._modalController = controller;
    if (!S._modalController) { var focusable = mod.querySelector('input:not([type=hidden]),select,textarea,button'); (focusable || mod).focus(); }
  }
  function closeModal() {
    S.modal = null;
    var controller = S._modalController;
    var back = overlayEl().querySelector('.overlay');
    S._modalController = null;
    if (controller) controller.close();
    else {
      back?.remove();
      if (S._modalTrigger && document.body.contains(S._modalTrigger)) { try { S._modalTrigger.focus(); } catch (e) {} }
    }
    S._modalTrigger = null;
  }
  function trapFocus(container, e) {
    var f = [].filter.call(
      container.querySelectorAll('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])'),
      function (el) { return el.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1], ae = document.activeElement;
    if (f.indexOf(ae) === -1) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && ae === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && ae === last) { e.preventDefault(); first.focus(); }
  }

  /* — запрос сведений (Smart Bridge) — */
  function modalRequest(a) {
    S.modal = { type: 'request', appId: a.id };
    var types = D.INFO_TYPES.map(function (x, index) { return '<option value="' + index + '">' + esc(localValue(x)) + '</option>'; }).join('');
    var ags = D.SOURCE_AGENCIES.map(function (x, index) { return '<option value="' + index + '">' + esc(localValue(x)) + '</option>'; }).join('');
    openModal(
      '<h3 class="h3 modal__title" id="modal-title">' + esc(t('rm_title')) + '</h3>' +
      '<div class="modal__section">' +
        '<div class="field"><label class="field__label" for="rm-type">' + esc(t('rm_type')) + '</label><div class="field__wrap"><select class="field__input" id="rm-type">' + types + '</select><span class="field__affix">' + ic('i-chev-d','icon--16') + '</span></div></div>' +
        '<div class="field"><label class="field__label" for="rm-agency">' + esc(t('rm_agency')) + '</label><div class="field__wrap"><select class="field__input" id="rm-agency">' + ags + '</select><span class="field__affix">' + ic('i-chev-d','icon--16') + '</span></div></div>' +
      '</div>' +
      '<div class="modal__foot"><button class="btn btn--ghost" data-act="modal-cancel">' + esc(t('cancel')) + '</button>' +
        '<button class="btn btn--primary" data-act="rm-send">' + ic('i-refresh','icon--20') + esc(t('rm_send')) + '</button></div>',
      'modal--request');
  }

  /* — возврат на уточнение — */
  function modalReturn(a) {
    S.modal = { type: 'return', appId: a.id };
    openModal(
      '<h3 class="h3 modal__title" id="modal-title">' + esc(t('ret_title')) + '</h3>' +
      '<div class="modal__body small">' + esc(a.number) + ' · ' + esc(a.applicant.name) + '</div>' +
      '<div class="modal__section mt-4"><div class="field"><label class="field__label" for="ret-reason">' + esc(t('ret_reason')) + '</label>' +
        '<textarea class="field__input" id="ret-reason" placeholder="' + esc(t('ret_reason_ph')) + '" aria-describedby="ret-err"></textarea>' +
        '<div class="field__error" id="ret-err" role="alert" hidden>' + esc(t('ret_required')) + '</div></div></div>' +
      '<div class="modal__foot"><button class="btn btn--ghost" data-act="modal-cancel">' + esc(t('cancel')) + '</button>' +
        '<button class="btn btn--primary" data-act="ret-send">' + ic('i-arrow-ur','icon--20') + esc(t('ret_send')) + '</button></div>',
      'modal--return');
  }

  /* — решение (+ четыре глаза для критичных) — */
  function modalDecide(a) {
    S.modal = { type: 'decide', appId: a.id, choice: 'approve', step: 1 };
    renderDecideModal();
  }
  function renderDecideModal() {
    var a = appById(S.modal.appId), s = svc(a), m = S.modal;
    if (m.step === 2) {
      // шаг «четыре глаза»
      var opts = D.COLLEAGUES.map(function (c) { return '<option>' + esc(c.name) + '</option>'; }).join('');
      var isDeny = m.choice === 'deny';
      var decPill = isDeny
        ? statusIcon('danger', t('dm_deny'), 'i-x')
        : statusIcon('success', t('dm_approve'), 'i-check');
      openModal(
        '<h3 class="h3 modal__title" id="modal-title">' + esc(t('dm_foureyes_step')) + '</h3>' +
        '<div class="banner banner--warn">' + ic('i-shield','icon--20') + '<span class="banner__text">' + esc(t('dm_foureyes')) + '</span></div>' +
        '<div class="modal__section mt-4">' +
          '<div class="def"><div class="def__row"><span class="def__key">' + esc(t('document_application')) + '</span><span class="def__val">' + esc(a.number) + '</span></div>' +
          '<div class="def__row"><span class="def__key">' + esc(t('document_decision')) + '</span><span class="def__val">' + decPill + '</span></div>' +
          '<div class="def__row"><span class="def__key">' + esc(t('first_specialist')) + '</span><span class="def__val">' + esc(D.ME.name) + '</span></div></div>' +
          '<div class="field mt-2"><label class="field__label" for="dm-second">' + esc(t('dm_second')) + '</label><div class="field__wrap"><select class="field__input" id="dm-second">' + opts + '</select><span class="field__affix">' + ic('i-chev-d','icon--16') + '</span></div></div>' +
        '</div>' +
        '<div class="modal__foot"><button class="btn btn--ghost" data-act="dm-back">' + esc(t('login_back')) + '</button>' +
          '<button class="btn ' + (isDeny ? 'btn--danger' : 'btn--primary') + '" data-act="dm-confirm">' + ic('i-sign','icon--20') + esc(t('dm_confirm')) + '</button></div>',
        'modal--decision');
      return;
    }
    // шаг 1 — выбор решения + обоснование
    var approveChecked = m.choice === 'approve', denyChecked = m.choice === 'deny';
    var primaryLabel = s.critical ? t('dm_send_second') : (denyChecked ? t('dm_deny') : t('dm_confirm'));
    openModal(
      '<h3 class="h3 modal__title" id="modal-title">' + esc(t('dm_title')) + '</h3>' +
      '<div class="modal__body small">' + esc(a.number) + ' · ' + esc(serviceName(s)) + '</div>' +
      '<div class="modal__section mt-4" role="radiogroup" aria-label="' + esc(t('dm_title')) + '">' +
        '<label class="radio-card' + (approveChecked ? ' is-checked' : '') + '">' +
          '<input type="radio" name="dm" class="radio__input" value="approve" ' + (approveChecked ? 'checked' : '') + '>' +
          '<span class="radio-card__body"><span class="radio-card__t">' + esc(t('dm_approve')) + '</span><span class="radio-card__d">' + esc(t('dm_approve_d')) + '</span></span></label>' +
        '<label class="radio-card radio-card--deny' + (denyChecked ? ' is-checked' : '') + '">' +
          '<input type="radio" name="dm" class="radio__input" value="deny" ' + (denyChecked ? 'checked' : '') + '>' +
          '<span class="radio-card__body"><span class="radio-card__t">' + esc(t('dm_deny')) + '</span><span class="radio-card__d">' + esc(t('dm_deny_d')) + '</span></span></label>' +
      '</div>' +
      '<div class="modal__section mt-4"><div class="field"><label class="field__label" for="dm-reason">' + esc(t('dm_reason')) + '</label>' +
        '<textarea class="field__input" id="dm-reason" placeholder="' + esc(t('dm_reason_ph')) + '" aria-describedby="dm-err">' + esc(m.reason || '') + '</textarea>' +
        '<div class="field__error" id="dm-err" role="alert" hidden>' + esc(t('dm_reason_required')) + '</div></div></div>' +
      (s.critical ? '<div class="banner banner--warn mt-4">' + ic('i-shield','icon--20') + '<span class="banner__text">' + esc(t('dm_foureyes')) + '</span></div>' : '') +
      '<div class="modal__foot"><button class="btn btn--ghost" data-act="modal-cancel">' + esc(t('cancel')) + '</button>' +
        '<button class="btn ' + (denyChecked ? 'btn--danger' : 'btn--primary') + '" data-act="dm-primary">' + esc(primaryLabel) + '</button></div>',
      'modal--decision');
  }

  /* — массовое решение — */
  function modalBatch(ids) {
    S.modal = { type: 'batch', ids: ids };
    var a0 = appById(ids[0]), s = svc(a0);
    openModal(
      '<h3 class="h3 modal__title" id="modal-title">' + esc(t('batch_decide')) + ' ' + ids.length + '</h3>' +
      '<div class="modal__body small">' + esc(serviceName(s)) + ' · ' + ids.length + ' ' + esc(t('applications_short')) + '</div>' +
      '<div class="banner banner--info mt-4">' + ic('i-info','icon--20') + '<span class="banner__text">' + esc(t('batch_confirm_hint')) + '</span></div>' +
      '<div class="modal__section mt-4"><div class="field"><label class="field__label" for="batch-reason">' + esc(t('dm_reason')) + '</label>' +
        '<textarea class="field__input" id="batch-reason" placeholder="' + esc(t('dm_reason_ph')) + '">' + esc(t('batch_reason_default')) + '</textarea></div></div>' +
      '<div class="modal__foot"><button class="btn btn--ghost" data-act="modal-cancel">' + esc(t('cancel')) + '</button>' +
        '<button class="btn btn--primary" data-act="batch-confirm">' + ic('i-check','icon--20') + esc(t('dm_confirm')) + '</button></div>',
      'modal--batch');
  }

  /* ================================================================== */
  /* Тосты / поповеры                                                   */
  /* ================================================================== */
  var toastRecords = [];
  var toastRegion = null;
  var toastRegionHovered = false;

  function motionMs(element, token) {
    var value = getComputedStyle(element).getPropertyValue(token).trim();
    if (!value) return 0;
    return value.endsWith('ms') ? parseFloat(value) || 0 : (parseFloat(value) || 0) * 1000;
  }
  function pauseToast(record) {
    if (!record.timer) return;
    clearTimeout(record.timer);
    record.timer = null;
    record.remaining = Math.max(0, record.remaining - (Date.now() - record.startedAt));
  }
  function dismissToast(record) {
    if (!record || record.closing) return;
    record.closing = true;
    pauseToast(record);
    record.toast.classList.remove('is-in');
    record.toast.classList.add('is-out');
    record.slot.classList.add('is-out');
    var duration = motionMs(record.slot, '--t-exit');
    var done = false;
    var finish = function () {
      if (done) return;
      done = true;
      record.slot.removeEventListener('transitionend', onEnd);
      clearTimeout(fallback);
      record.slot.remove();
      toastRecords = toastRecords.filter(function (item) { return item !== record; });
    };
    var onEnd = function (event) { if (event.target === record.slot) finish(); };
    var fallback = setTimeout(finish, duration + 50);
    if (duration) record.slot.addEventListener('transitionend', onEnd); else finish();
  }
  function resumeToast(record) {
    if (record.closing || record.timer || !record.slot.isConnected) return;
    if (record.remaining <= 0) { dismissToast(record); return; }
    record.startedAt = Date.now();
    record.timer = setTimeout(function () { record.timer = null; record.remaining = 0; dismissToast(record); }, record.remaining);
  }
  function syncToastTimers() {
    toastRecords = toastRecords.filter(function (record) { return record.slot.isConnected; });
    var paused = document.hidden || toastRegionHovered;
    toastRecords.forEach(function (record) { if (paused) pauseToast(record); else resumeToast(record); });
  }
  function bindToastRegion(box) {
    if (toastRegion === box) return;
    toastRegion = box;
    toastRegionHovered = false;
    box.addEventListener('pointerenter', function () { toastRegionHovered = true; syncToastTimers(); });
    box.addEventListener('pointerleave', function () { toastRegionHovered = false; syncToastTimers(); });
  }

  function toast(msg, kind) {
    var box = document.getElementById('toasts'); if (!box) return;
    bindToastRegion(box);
    var slot = document.createElement('div');
    slot.className = 'ekh-toast-slot';
    var inner = document.createElement('div');
    inner.className = 'ekh-toast-slot__inner';
    var el = document.createElement('div');
    el.className = 'ekh-toast' + (kind ? ' ekh-toast--' + kind : '');
    el.setAttribute('role', 'status');
    var icon = kind === 'success' ? 'i-check' : kind === 'error' ? 'i-x' : kind === 'warn' ? 'i-info' : 'i-info';
    el.innerHTML = ic(icon, 'icon--20') + '<span class="grow">' + esc(msg) + '</span>' +
      '<button class="ekh-toast__close" type="button" aria-label="' + esc(t('close_notification')) + '">' + ic('i-x','icon--16') + '</button>';
    inner.appendChild(el); slot.appendChild(inner); box.appendChild(slot);
    var record = { slot:slot, toast:el, remaining:3600, startedAt:0, timer:null, closing:false };
    toastRecords.push(record);
    el.querySelector('.ekh-toast__close').addEventListener('click', function () { dismissToast(record); });
    requestAnimationFrame(function () { if (el.isConnected) el.classList.add('is-in'); });
    syncToastTimers();
  }

  function revealPop() {
    var pop = document.getElementById('pop');
    requestAnimationFrame(function () { if (pop?.isConnected) pop.classList.add('is-open'); });
  }

  function openNotif() {
    S.pop = 'notif';
    var items = S.notifs.slice().sort(function (x, y) { return y.at - x.at; }).map(function (n) {
      /* §6 «Icon fills»: заливка живёт только в статус-кружках таблиц и на
         плитках каталога. В ленте уведомлений — голый цветной глиф, потолще
         штрихом взамен потерянного кружка (канон строки-алерта). */
      return '<button class="notif notif--' + n.kind + '" data-act="notif-go" data-id="' + esc(n.appId) + '" data-nid="' + esc(n.id) + '">' +
        ic(n.kind === 'breach' ? 'i-clock' : n.kind === 'warn' ? 'i-info' : 'i-check','icon--20 notif__glyph') +
        '<span class="notif__body"><span class="notif__t"><b>' + esc(localValue(n.title)) + '</b> — ' + esc(localValue(n.text)) + '</span>' +
        '<span class="notif__time">' + fmtAgo(n.at) + '</span></span></button>';
    }).join('');
    var nt = document.querySelector('[data-act="notif-open"]'); if (nt) nt.setAttribute('aria-expanded', 'true');
    overlayEl().insertAdjacentHTML('beforeend',
      '<div class="popover notif-pop" id="pop" role="dialog" aria-label="' + esc(t('notifications')) + '">' +
        '<div class="notif-pop__head"><b>' + esc(t('notifications')) + '</b><button class="btn btn--ghost btn--s" data-act="notif-read">' + esc(t('notifications_read_all')) + '</button></div>' +
        '<div class="notif-list">' + (items || '<div class="empty">' + ic('i-bell','icon--48') + '<div class="empty__title">' + esc(t('notifications_empty')) + '</div></div>') + '</div></div>');
    revealPop();
  }
  /* Профиль и настройки — общий компонент `.ekh-profile-pop`
     (design-system/css/components.css, §3 «Global preferences», §6 «Profile
     popover»). Третью рукописную копию этого поповера — после админки и ЦОН —
     заводить нельзя (правило 21), поэтому здесь только разметка и поведение.
     Строка языка: подпись + текущее значение + chevron, без глобуса; тема —
     три состояния с aria-pressed, где «как в системе» это отдельный ответ. */
  function langLabel(code) { return code === 'tg' ? t('lang_tg') : t('lang_ru'); }
  function prefLangRow() {
    return '<div class="dd lang ekh-profile-pop__row-host">' +
      '<button class="dd-btn ekh-profile-pop__row" type="button" data-act="pref-lang" aria-haspopup="listbox" aria-expanded="false" aria-label="' + esc(t('language')) + '">' +
        '<span class="ekh-profile-pop__row-label">' + esc(t('language')) + '</span>' +
        '<span id="langCur">' + esc(langLabel(S.lang)) + '</span>' +
        ic('i-chev-r','ekh-profile-pop__chev') + ic('i-globe','ekh-profile-pop__compact-icon') +
      '</button>' +
      '<div class="dd-menu" role="listbox" aria-label="' + esc(t('language')) + '">' +
        ['ru','tg'].map(function (code) {
          var on = S.lang === code;
          return '<button role="option" type="button" data-act="pref-lang-set" data-lang="' + code + '" aria-selected="' + on + '">' +
            '<span>' + esc(langLabel(code)) + '</span>' + ic('i-check','icon--16') + '</button>';
        }).join('') +
      '</div></div>';
  }
  function prefThemeRow() {
    var current = getThemeChoice();
    var options = [['system','i-theme-system','theme_system'], ['light','i-sun','theme_light'], ['dark','i-moon','theme_dark']];
    return '<div class="ekh-profile-pop__row ekh-profile-pop__row--theme">' +
      '<span class="ekh-profile-pop__row-label">' + esc(t('theme')) + '</span>' +
      '<div class="ekh-profile-pop__theme-options" role="group" aria-label="' + esc(t('theme')) + '">' +
        options.map(function (o) {
          var label = t(o[2]);
          return '<button type="button" class="ekh-profile-pop__theme-choice ekh-profile-pop__theme-choice--' + o[0] + '" data-act="pref-theme" data-theme-choice="' + o[0] + '" aria-pressed="' + (current === o[0]) + '" aria-label="' + esc(label) + '" title="' + esc(label) + '">' + ic(o[1],'') + '</button>';
        }).join('') +
      '</div></div>';
  }
  function prefActionRow(act, icon, label) {
    return '<button class="ekh-profile-pop__row ekh-profile-pop__row--action" type="button" data-act="' + act + '">' +
      ic(icon,'icon--16') + '<span class="ekh-profile-pop__row-label">' + esc(label) + '</span></button>';
  }
  function openProfile(trigger) {
    S.pop = 'user';
    trigger.setAttribute('aria-expanded', 'true');
    var signedIn = S.authed;
    overlayEl().insertAdjacentHTML('beforeend',
      '<div class="ekh-profile-pop" id="pop" role="dialog" aria-label="' + esc(t(signedIn ? 'profile' : 'preferences')) + '">' +
        (signedIn
          ? '<div class="ekh-profile-pop__card">' +
              '<span class="ekh-side__avatar" aria-hidden="true">' + esc(D.ME.initials) + '</span>' +
              '<span class="ekh-profile-pop__identity"><b>' + esc(D.ME.name) + '</b><span>' + esc(roleName() + ' · ' + agencyName()) + '</span></span>' +
            '</div>' +
            '<div class="ekh-profile-pop__divider" aria-hidden="true"></div>'
          : '') +
        '<div class="ekh-profile-pop__preferences">' + prefLangRow() + prefThemeRow() + '</div>' +
        (signedIn
          ? '<div class="ekh-profile-pop__divider" aria-hidden="true"></div>' +
            '<div class="ekh-profile-pop__preferences">' +
              prefActionRow('lock', 'i-lock', t('lock')) +
              prefActionRow('reset', 'i-refresh', t('reset_demo')) +
              prefActionRow('logout', 'i-out', t('end_shift')) +
            '</div>'
          : '') +
      '</div>');
    positionProfile(trigger);
    revealPop();
  }
  /* Поповер растёт из своего триггера (§8). У карточки оператора он всплывает
     над ней по ширине рельса, у шестерёнки входа — из правого верхнего угла. */
  function positionProfile(trigger) {
    var pop = document.getElementById('pop'); if (!pop) return;
    var rect = trigger.getBoundingClientRect();
    var side = closest(trigger, '.ekh-side');
    S._profileSide = !!side;
    if (side) {
      var cs = getComputedStyle(side), sideRect = side.getBoundingClientRect();
      var left = sideRect.left + (parseFloat(cs.paddingLeft) || 0);
      var right = sideRect.right - (parseFloat(cs.paddingRight) || 0);
      /* Свёрнутый рельс уже 66px: компактный вариант поповера прячет подписи, а
         у ведомства в нём ещё и три действия — «Заблокировать» одной иконкой
         это загадка, а не контрол. Поэтому под рельсом поповер сохраняет свою
         ширину и встаёт рядом с ним, а не внутри. */
      if (!S.sideCollapsed) {
        pop.classList.add('ekh-profile-pop--side');
        pop.style.setProperty('--profile-pop-max-w', (right - left) + 'px');
      }
      var popRect = pop.getBoundingClientRect();
      var top = rect.top - popRect.height - 8;
      pop.style.transformOrigin = 'bottom left';
      if (top < 8) { top = rect.bottom + 8; pop.style.transformOrigin = 'top left'; }
      pop.style.top = Math.max(8, Math.min(top, innerHeight - popRect.height - 8)) + 'px';
      var x = S.sideCollapsed ? sideRect.right + 8 : left;
      pop.style.left = Math.max(8, Math.min(x, innerWidth - popRect.width - 8)) + 'px';
      return;
    }
    var r = pop.getBoundingClientRect();
    pop.style.transformOrigin = 'top right';
    pop.style.top = Math.max(8, Math.min(rect.bottom + 8, innerHeight - r.height - 8)) + 'px';
    pop.style.left = Math.max(8, Math.min(rect.right - r.width, innerWidth - r.width - 8)) + 'px';
  }
  /* Замечания проверяющего жили баннером во всю ширину между мета-полосой и
     рабочей областью и отодвигали редактор вниз. Теперь они за своим счётчиком:
     цифра на полосе — вход, поповер — список (§6). */
  function openFormComments(trigger) {
    S.pop = 'comments';
    trigger.setAttribute('aria-expanded', 'true');
    var items = (lc().comments || []).map(function (comment) {
      return '<article class="form-comment"><div><b>' + esc(comment.author === 'reviewer' ? t('form_reviewer') : t('forms_role')) + '</b><span>' + esc(comment.at) + '</span></div><p>' + esc(localValue(comment.body)) + '</p></article>';
    }).join('');
    overlayEl().insertAdjacentHTML('beforeend',
      '<div class="popover form-comments-pop" id="pop" role="dialog" aria-label="' + esc(t('form_comments')) + '">' +
        '<div class="form-comments">' + items + '</div></div>');
    var pop = document.getElementById('pop');
    var rect = trigger.getBoundingClientRect(), popRect = pop.getBoundingClientRect();
    pop.style.transformOrigin = 'top right';
    pop.style.top = Math.max(8, Math.min(rect.bottom + 8, innerHeight - popRect.height - 8)) + 'px';
    pop.style.left = Math.max(8, Math.min(rect.right - popRect.width, innerWidth - popRect.width - 8)) + 'px';
    revealPop();
  }
  function closePop() {
    S.pop = null; var p = document.getElementById('pop'); if (p) p.remove();
    ['notif-open', 'profile-open', 'prefs-open', 'form-comments'].forEach(function (a) {
      document.querySelectorAll('[data-act="' + a + '"]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    });
  }
  function closeLayers(all) { closePop(); if (all && S.modal) closeModal(); }

  /* ================================================================== */
  /* Действия / переходы состояний                                      */
  /* ================================================================== */
  function addHistory(a, actor, action, status) { a.history.push({ at: now(), actor: actor, action: action, status: status }); }

  function doRequest() {
    var a = appById(S.modal.appId);
    var type = D.INFO_TYPES[Number(document.getElementById('rm-type').value)];
    var agency = D.SOURCE_AGENCIES[Number(document.getElementById('rm-agency').value)];
    a.interop.push({ type: type, agency: agency, status: 'pending', at: now(), value: '' });
    if (ACTIVE[a.status]) a.status = 'info_requested';
    addHistory(a, {ru:'Межвед. сервис',tg:'Хизмати байниидоравӣ'}, {
      ru:'Отправлен запрос «' + type.ru + '» в: ' + agency.ru,
      tg:'Дархости «' + type.tg + '» ба ' + agency.tg + ' фиристода шуд'
    }, 'info_requested');
    persist(); closeModal(); toast(t('t_requested'), 'success');
    if (S.view === 'card') renderMain(); refreshChrome();
    // имитация ответа ведомства
    var id = a.id, ln = a.interop.length - 1;
    setTimeout(function () {
      var app = appById(id); if (!app || !app.interop[ln]) return;
      app.interop[ln].status = 'received'; app.interop[ln].at = now();
      app.interop[ln].value = { ru:'Сведения предоставлены', tg:'Маълумот пешниҳод шуд' };
      if (app.status === 'info_requested') app.status = 'processing';
      addHistory(app, 'Smart Bridge', {
        ru:'Получен ответ: ' + app.interop[ln].type.ru,
        tg:'Ҷавоб гирифта шуд: ' + app.interop[ln].type.tg
      }, 'processing');
      S.notifs.unshift({ id: 'n' + now(), kind: 'info', appId: id, title: {ru:'Получен ответ ведомства',tg:'Ҷавоби идора гирифта шуд'}, text: {ru:app.interop[ln].type.ru + ' · ' + app.number,tg:app.interop[ln].type.tg + ' · ' + app.number}, at: now(), unread: true });
      persist(); toast(t('t_received'), 'success');
      if (S.view === 'card' && S.cardId === id) renderMain();
      refreshChrome();
    }, 4200);
  }

  function doReturn() {
    var a = appById(S.modal.appId);
    var rt = document.getElementById('ret-reason');
    var reason = rt.value.trim();
    if (!reason) { document.getElementById('ret-err').hidden = false; rt.setAttribute('aria-invalid', 'true'); rt.focus(); return; }
    a.status = 'clarify';
    addHistory(a, D.ME.name, {ru:'Возвращено на уточнение: ' + reason,tg:'Барои аниқкунӣ баргардонида шуд: ' + reason}, 'clarify');
    persist(); closeModal(); toast(t('t_returned'), 'success');
    S.view = 'queue'; renderMain(); refreshChrome();
  }

  function finalizeApprove(a, reason, second) {
    a.decision = { type: 'approve', reason: reason, by: D.ME.name, second: second || null };
    a.status = 'decided';
    addHistory(a, D.ME.name, {ru:'Принято положительное решение',tg:'Қарори мусбат қабул шуд'}, 'decided');
    if (second) addHistory(a, second, {ru:'Подтверждено вторым специалистом («четыре глаза»)',tg:'Мутахассиси дуюм тасдиқ кард («чор чашм»)'}, 'decided');
    a.status = 'done';
    addHistory(a, {ru:'Система',tg:'Система'}, {ru:'Результат сформирован, подписан ЭЦП и выдан заявителю',tg:'Натиҷа таҳия, бо ИРА имзо ва ба аризадиҳанда дода шуд'}, 'done');
    delete S.sel[a.id];
    persist(); closeModal(); toast(t('t_done'), 'success');
    S.view = 'card'; S.cardId = a.id; S.cardTab = 'history'; renderMain(); refreshChrome();
  }
  function finalizeDeny(a, reason, second) {
    a.decision = { type: 'deny', reason: reason, by: D.ME.name, second: second || null };
    a.status = 'denied';
    addHistory(a, D.ME.name, {ru:'Оформлен мотивированный отказ: ' + reason,tg:'Радди асоснок таҳия шуд: ' + reason}, 'denied');
    if (second) addHistory(a, second, {ru:'Отказ подтверждён вторым специалистом («четыре глаза»)',tg:'Радро мутахассиси дуюм тасдиқ кард («чор чашм»)'}, 'denied');
    if (a.pay && a.pay.status === 'Оплачено') { a.pay.status = 'Возвращена'; addHistory(a, {ru:'Сервис платежей',tg:'Хизмати пардохт'}, {ru:'Инициирован возврат пошлины (Saga)',tg:'Баргардонидани боҷ оғоз шуд (Saga)'}, 'denied'); }
    delete S.sel[a.id];
    persist(); closeModal(); toast(t('t_denied'), 'warn');
    S.view = 'card'; S.cardId = a.id; S.cardTab = 'history'; renderMain(); refreshChrome();
  }

  function doDecidePrimary() {
    var a = appById(S.modal.appId), s = svc(a);
    var ta = document.getElementById('dm-reason');
    var reason = ta.value.trim();
    if (!reason) { document.getElementById('dm-err').hidden = false; ta.setAttribute('aria-invalid', 'true'); ta.focus(); return; }
    S.modal.reason = reason;
    // критичное решение (и положительное, и отрицательное) — «четыре глаза» (§7Б.2)
    if (s.critical) { S.modal.step = 2; renderDecideModal(); return; }
    if (S.modal.choice === 'deny') finalizeDeny(a, reason, null);
    else finalizeApprove(a, reason, null);
  }
  function doDecideConfirm() {
    var a = appById(S.modal.appId);
    var second = document.getElementById('dm-second').value;
    toast(t('t_second'), 'success');
    if (S.modal.choice === 'deny') finalizeDeny(a, S.modal.reason, second);
    else finalizeApprove(a, S.modal.reason, second);
  }

  function doBatchConfirm() {
    var ids = S.modal.ids, reason = document.getElementById('batch-reason').value.trim() || '—';
    ids.forEach(function (id) {
      var a = appById(id);
      if (!a || !ACTIVE[a.status] || svc(a).critical) return;   // защита: критичные/неактивные не одобряем пакетно
      a.decision = { type: 'approve', reason: reason, by: D.ME.name };
      addHistory(a, D.ME.name, {ru:'Пакетное положительное решение',tg:'Қарори мусбати гурӯҳӣ'}, 'decided');
      a.status = 'done';
      addHistory(a, {ru:'Система',tg:'Система'}, {ru:'Результат подписан ЭЦП и выдан',tg:'Натиҷа бо ИРА имзо ва дода шуд'}, 'done');
    });
    S.sel = {}; persist(); closeModal(); toast(t('t_batch_done') + ' (' + ids.length + ')', 'success');
    renderMain(); refreshChrome();
  }

  function refreshChrome() {
    // обновить счётчики навигации и бейдж уведомлений без полного ре-рендера
    var q = mineActive().length, o = overdue().length, i = pendingInterop();
    setNavCount('queue', q, false); setNavCount('overdue', o, true); setNavCount('interop', i, false);
    var bell = document.querySelector('[data-act="notif-open"] .badge-dot');
    var host = document.querySelector('[data-act="notif-open"]');
    if (host) { if (bell) bell.remove(); if (unreadNotifs()) host.insertAdjacentHTML('beforeend', '<span class="badge-dot">' + unreadNotifs() + '</span>'); }
  }
  function setNavCount(view, val, alert) {
    var item = document.querySelector('.ekh-side__item[data-view="' + view + '"]'); if (!item) return;
    var c = item.querySelector('.ekh-side__count');
    if (!val) { if (c) c.remove(); return; }
    if (!c) { c = document.createElement('span'); c.className = 'ekh-side__count' + (alert ? ' ekh-side__count--alert' : ''); item.appendChild(c); }
    c.textContent = val;
  }

  /* ================================================================== */
  /* Делегирование событий                                              */
  /* ================================================================== */
  function closest(el, sel) { while (el && el !== document) { if (el.matches && el.matches(sel)) return el; el = el.parentNode; } return null; }

  function closeFilterMenu() {
    if (!S.filterOpen) return;
    S.filterOpen = null;
    document.querySelectorAll('.filter-select').forEach(function (el) { el.classList.remove('is-open'); });
    document.querySelectorAll('.filter-select__trigger').forEach(function (el) { el.setAttribute('aria-expanded', 'false'); });
    document.querySelectorAll('.filter-select__menu').forEach(function (el) { el.hidden = true; });
  }
  function setFilterMenu(name, open) {
    closeFilterMenu();
    if (!open) return;
    S.filterOpen = name;
    var root = document.querySelector('.filter-select--' + name);
    if (!root) return;
    root.classList.add('is-open');
    root.querySelector('.filter-select__trigger').setAttribute('aria-expanded', 'true');
    root.querySelector('.filter-select__menu').hidden = false;
  }

  document.addEventListener('click', function (e) {
    var tgt = closest(e.target, '[data-act]');
    if (!tgt) { if (S.pop) closePop(); closeFilterMenu(); return; }
    var act = tgt.getAttribute('data-act');
    var id = tgt.getAttribute('data-id');

    if (S.filterOpen && act !== 'filter-toggle' && act !== 'filter-option') closeFilterMenu();

    // не закрывать поповер при клике внутри него
    if (S.pop && !closest(e.target, '#pop') && act !== 'notif-open' && act !== 'profile-open' && act !== 'prefs-open' && act !== 'form-comments') closePop();

    switch (act) {
      case 'login-next': {
        var loginUser = document.getElementById('l-user');
        var loginPass = document.getElementById('l-pass');
        if (!loginUser.value.trim() || !loginPass.value) {
          S._loginErr = t('login_required'); renderLogin();
          (document.getElementById(!loginUser.value.trim() ? 'l-user' : 'l-pass') || document.body).focus();
          return;
        }
        S._loginErr = '';
        S.loginStep = 2; renderLogin(); document.querySelector('[data-otp="0"]')?.focus(); return;
      }
      case 'login-back': S._loginErr = ''; S.loginStep = 1; renderLogin(); return;
      case 'login-enter': {
        var loginCode = Array.prototype.map.call(document.querySelectorAll('[data-otp]'), function (el) { return el.value; }).join('');
        if (!/^\d{6}$/.test(loginCode)) {
          S._loginErr = t('login_mfa_required'); renderLogin(); document.querySelector('[data-otp="0"]')?.focus(); return;
        }
        if (loginCode === '111111') {
          S._loginErr = t('login_mfa_invalid'); renderLogin(); document.querySelector('[data-otp="0"]')?.focus(); return;
        }
        S._loginErr = '';
        S.authed = true; startApp(); return;
      }

      case 'nav': e.preventDefault(); go(tgt.getAttribute('data-view')); return;
      case 'nav-toggle': toggleNav(); return;
      case 'nav-close': document.getElementById('app').classList.remove('nav-open'); syncNavToggle(); return;

      case 'filter-toggle': {
        var filterName = tgt.getAttribute('data-filter-name');
        setFilterMenu(filterName, S.filterOpen !== filterName); return;
      }
      case 'filter-option': {
        var optionFilter = tgt.getAttribute('data-filter-name');
        var optionValue = tgt.getAttribute('data-val');
        S.filterOpen = null;
        setFilter(optionFilter, optionFilter === 'sla' && !optionValue ? 'all' : optionValue);
        return;
      }
      case 'stat-clear': S.filters.svc = ''; S.filters.status = ''; S.filters.priority = ''; setFilter('sla', 'all'); return;
      case 'stat-sla': setFilter('sla', S.filters.sla === 'breach' ? 'all' : 'breach'); return;
      case 'stat-status': setFilter('status', S.filters.status === 'info_requested' ? '' : 'info_requested'); return;
      case 'stat-priority': setFilter('priority', S.filters.priority === 'high' ? '' : 'high'); return;
      case 'stat-io': setFilter('io', S.filters.io === 'pending' ? '' : 'pending'); return;
      case 'forms-facet': {
        var facet = tgt.getAttribute('data-val');
        S.formsFacet = S.formsFacet === facet ? '' : facet;
        renderMain(); return;
      }

      case 'form-create':
        /* RESET восстанавливает демо-состояние «на рассмотрении» — созданная
           форма тогда открывается уже запертой. NEW_DRAFT кладёт общий процесс
           в черновик, с которого автор ведомства и начинает. */
        S._lowCodeBusy = true; dispatchLowCode('NEW_DRAFT'); S._lowCodeBusy = false;
        S.formDraft = {
          serviceName:{ru:'',tg:''}, audience:['person'],
          formFields:[{id:'field-' + Date.now(),label:{ru:t('form_new_field'),tg:t('form_new_field')},type:'text',required:true}]
        };
        S.formReadOnly = false; S.formStep = 'fields'; S.formFieldOpen = S.formDraft.formFields[0].id; S.formPaletteOpen = false; go('form-builder'); return;
      case 'form-open': S.formDraft = null; S.formReadOnly = false; S.formStep = 'fields'; S.formFieldOpen = null; S.formPaletteOpen = false; go('form-builder'); return;
      case 'form-open-static': S.formDraft = staticFormDraft(id); S.formReadOnly = true; S.formStep = 'fields'; S.formFieldOpen = null; S.formPaletteOpen = false; go('form-builder'); return;
      case 'form-back': e.preventDefault(); go('forms'); return;
      case 'form-comments': {
        var commentsOpen = S.pop === 'comments';
        closePop();
        if (!commentsOpen) openFormComments(tgt);
        return;
      }
      case 'form-step': S.formStep = id; S.formPaletteOpen = false; renderMain(); return;
      case 'form-preview-toggle': S.formPreviewOpen = !S.formPreviewOpen; renderMain(); return;
      case 'form-add-field':
        S.formPaletteOpen = !S.formPaletteOpen;
        renderMain(); return;
      case 'form-add-field-type': {
        var newField = {id:'field-' + Date.now(),label:{ru:t('form_new_field'),tg:t('form_new_field')},type:id || 'text',required:true};
        S.formDraft.formFields.push(newField); S.formFieldOpen = newField.id; S.formPaletteOpen = false;
        renderMain(); return;
      }
      case 'form-field-open': S.formFieldOpen = S.formFieldOpen === id ? null : id; renderMain(); return;
      case 'form-field-up':
      case 'form-field-down': {
        var fieldIndex = S.formDraft.formFields.map(function (field) { return field.id; }).indexOf(id);
        var nextIndex = act === 'form-field-up' ? fieldIndex - 1 : fieldIndex + 1;
        if (fieldIndex >= 0 && nextIndex >= 0 && nextIndex < S.formDraft.formFields.length) {
          var moved = S.formDraft.formFields.splice(fieldIndex, 1)[0];
          S.formDraft.formFields.splice(nextIndex, 0, moved);
          renderMain();
        }
        return;
      }
      case 'form-remove-field':
        S.formDraft.formFields = S.formDraft.formFields.filter(function (field) { return field.id !== id; });
        if (S.formFieldOpen === id) S.formFieldOpen = null;
        renderMain(); return;
      case 'form-save':
        persistFormDraft(true); renderMain(); toast(t('form_saved_toast'), 'success'); return;
      case 'form-send': {
        var name = localValue(S.formDraft.serviceName,'').trim();
        if (!name) { toast(t('form_name_required'), 'warn'); document.querySelector('[data-form-name="' + S.lang + '"]')?.focus(); return; }
        persistFormDraft(true);
        var submitEvent = getLowCodeState().status === 'changes_requested' ? 'RESUBMIT' : 'SEND_REVIEW';
        S._lowCodeBusy = true; dispatchLowCode(submitEvent); S._lowCodeBusy = false;
        renderMain(); toast(t(submitEvent === 'RESUBMIT' ? 'form_resubmitted_toast' : 'form_sent_toast'), 'success'); return;
      }

      case 'open-card': openCard(id); return;
      case 'tab': S.cardTab = tgt.getAttribute('data-tab'); renderMain(); return;

      case 'sort': {
        var k = tgt.getAttribute('data-key');
        if (S.sort.key === k) S.sort.dir *= -1; else { S.sort.key = k; S.sort.dir = 1; }
        renderMain(); return;
      }
      case 'sel-toggle': e.stopPropagation(); S.sel[id] = !S.sel[id]; renderMain(); return;
      case 'sel-all': {
        var list = sortList(applyFilters(currentBase()));
        var allSel = list.every(function (a) { return S.sel[a.id]; });
        list.forEach(function (a) { S.sel[a.id] = !allSel; }); renderMain(); return;
      }
      case 'sel-clear': S.sel = {}; renderMain(); return;

      case 'batch-decide': {
        var scopeList = sortList(applyFilters(currentBase()));
        var bstat = batchStatus(scopeList);
        if (bstat === 'mixed') { toast(t('batch_only_same'), 'warn'); return; }
        if (bstat === 'critical') { toast(t('batch_critical'), 'warn'); return; }
        if (bstat !== 'ok') return;
        modalBatch(selectedIn(scopeList)); return;
      }
      case 'batch-confirm': doBatchConfirm(); return;

      case 'act-request': modalRequest(appById(S.cardId)); return;
      case 'act-return': modalReturn(appById(S.cardId)); return;
      case 'act-decide': modalDecide(appById(S.cardId)); return;

      case 'rm-send': doRequest(); return;
      case 'ret-send': doReturn(); return;
      case 'dm-primary': doDecidePrimary(); return;
      case 'dm-back': S.modal.step = 1; renderDecideModal(); return;
      case 'dm-confirm': doDecideConfirm(); return;

      case 'modal-cancel': closeModal(); return;
      case 'modal-backdrop': if (e.target === tgt) closeModal(); return;

      case 'notif-open': if (S.pop === 'notif') { closePop(); } else { closePop(); openNotif(); } return;
      case 'profile-open':
      case 'prefs-open': {
        var wasOpen = S.pop === 'user';
        closePop();
        if (!wasOpen) openProfile(tgt);
        return;
      }
      case 'pref-lang': {
        var dd = closest(tgt, '.dd');
        var open = !dd.classList.contains('open');
        dd.classList.toggle('open', open);
        /* Внутри рельса выносной список уходит вправо, а не вниз: под карточкой
           оператора места нет (§6 «Profile popover», dd-right). */
        dd.classList.toggle('dd-right', open && !!S._profileSide);
        tgt.setAttribute('aria-expanded', String(open));
        if (open) dd.querySelector('.dd-menu button')?.focus();
        return;
      }
      case 'pref-lang-set': {
        var nextLang = tgt.getAttribute('data-lang');
        if (nextLang !== S.lang) { S.lang = nextLang; setLang(nextLang); }
        closePop();
        if (S.authed) renderApp(); else renderLogin();
        return;
      }
      case 'pref-theme': {
        setTheme(tgt.getAttribute('data-theme-choice'));
        var choice = getThemeChoice();
        document.querySelectorAll('#pop [data-act="pref-theme"]').forEach(function (b) {
          b.setAttribute('aria-pressed', String(b.getAttribute('data-theme-choice') === choice));
        });
        return;
      }
      case 'notif-go': {
        var nid = tgt.getAttribute('data-nid'); var nn = S.notifs.filter(function (x) { return x.id === nid; })[0];
        if (nn) nn.unread = false;
        closePop(); openCard(id); refreshChrome(); persist(); return;
      }
      case 'notif-read': S.notifs.forEach(function (n) { n.unread = false; }); closePop(); refreshChrome(); persist(); return;

      case 'lock': doLock(); return;
      case 'reset': resetData(); S.sel = {}; S.view = 'queue'; renderApp(); toast(t('reset_done'), 'success'); return;
      case 'logout': S.authed = false; S.loginStep = 1; closeLayers(true); clearArm(); renderLogin(); return;
      case 'unlock': doUnlock(); return;
      case 'noop': return;
    }
  });

  document.addEventListener('input', function (e) {
    var nameLang = e.target.getAttribute && e.target.getAttribute('data-form-name');
    if (nameLang && S.formDraft) {
      S.formDraft.serviceName[nameLang] = e.target.value;
      var previewTitle = document.querySelector('.mfb-preview-body h2');
      var pageTitle = document.querySelector('.mfb-title h1');
      var nextTitle = localValue(S.formDraft.serviceName, t('form_untitled'));
      if (previewTitle) previewTitle.textContent = nextTitle;
      if (pageTitle) pageTitle.textContent = nextTitle;
      return;
    }
    var fieldId = e.target.getAttribute && e.target.getAttribute('data-form-field-label');
    if (fieldId && S.formDraft) {
      var draftField = S.formDraft.formFields.filter(function (field) { return field.id === fieldId; })[0];
      if (draftField) draftField.label[S.lang] = e.target.value;
      var previewLabel = document.querySelector('[data-preview-field="' + fieldId + '"]');
      var fieldTitle = document.querySelector('[data-form-field-row="' + fieldId + '"] .mfb-field-title b');
      if (previewLabel) previewLabel.textContent = (e.target.value || t('form_untitled_field')) + (draftField && draftField.required ? ' *' : '');
      if (fieldTitle) fieldTitle.textContent = e.target.value || t('form_untitled_field');
      return;
    }
    var cell = closest(e.target, '[data-otp]');
    if (!cell) return;
    cell.value = cell.value.replace(/\D/g, '').slice(0, 1);
    if (cell.value) {
      var next = document.querySelector('[data-otp="' + (Number(cell.getAttribute('data-otp')) + 1) + '"]');
      if (next) next.focus();
    }
  });

  document.addEventListener('keydown', function (e) {
    var cell = closest(e.target, '[data-otp]');
    if (cell) {
      var index = Number(cell.getAttribute('data-otp'));
      if (e.key === 'Backspace' && !cell.value && index > 0) document.querySelector('[data-otp="' + (index - 1) + '"]')?.focus();
      if (e.key === 'ArrowLeft' && index > 0) { e.preventDefault(); document.querySelector('[data-otp="' + (index - 1) + '"]')?.focus(); }
      if (e.key === 'ArrowRight' && index < 5) { e.preventDefault(); document.querySelector('[data-otp="' + (index + 1) + '"]')?.focus(); }
    }
    if (e.key === 'Enter' && S.loginStep === 1 && document.getElementById('l-pass')) document.querySelector('[data-act="login-next"]')?.click();
    if (e.key === 'Enter' && S.loginStep === 2 && document.getElementById('l-otp')) document.querySelector('[data-act="login-enter"]')?.click();
  });

  document.addEventListener('paste', function (e) {
    if (!closest(e.target, '[data-otp]')) return;
    var digits = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    if (!digits) return;
    e.preventDefault();
    Array.prototype.forEach.call(document.querySelectorAll('[data-otp]'), function (cell, i) { cell.value = digits[i] || ''; });
    (document.querySelector('[data-otp="' + Math.min(digits.length, 5) + '"]') || e.target).focus();
  });

  // фильтры: input / change
  document.addEventListener('input', function (e) {
    var f = e.target.getAttribute && e.target.getAttribute('data-filter');
    if (!f) return;
    if (f === 'q') {
      S.filters.q = e.target.value;
      /* Поиск живёт только в топбаре, поэтому синхронизировать нечего —
         достаточно вернуть каретку после перерисовки списка. */
      if (S.view !== 'card') {
        var caret = e.target.selectionStart;
        renderMain();
        var again = document.getElementById('top-search');
        if (again) { again.focus(); again.setSelectionRange(caret, caret); }
      }
    }
  });
  document.addEventListener('change', function (e) {
    var fieldType = e.target.getAttribute && e.target.getAttribute('data-form-field-type');
    if (fieldType && S.formDraft) {
      var typeField = S.formDraft.formFields.filter(function (field) { return field.id === fieldType; })[0];
      if (typeField) typeField.type = e.target.value;
      renderMain(); return;
    }
    var fieldRequired = e.target.getAttribute && e.target.getAttribute('data-form-field-required');
    if (fieldRequired && S.formDraft) {
      var requiredField = S.formDraft.formFields.filter(function (field) { return field.id === fieldRequired; })[0];
      if (requiredField) requiredField.required = e.target.checked;
      renderMain(); return;
    }
    var audience = e.target.getAttribute && e.target.getAttribute('data-form-audience');
    if (audience && S.formDraft) {
      if (e.target.checked && S.formDraft.audience.indexOf(audience) < 0) S.formDraft.audience.push(audience);
      if (!e.target.checked) S.formDraft.audience = S.formDraft.audience.filter(function (id) { return id !== audience; });
      if (!S.formDraft.audience.length) { S.formDraft.audience.push(audience); e.target.checked = true; toast(t('form_audience_required'), 'warn'); }
      renderMain(); return;
    }
    // выбор решения (нативные радио, доступны с клавиатуры)
    if (e.target.name === 'dm' && S.modal && S.modal.type === 'decide') {
      S.modal.choice = e.target.value;
      var ta = document.getElementById('dm-reason'); if (ta) S.modal.reason = ta.value;
      renderDecideModal();
      var checked = document.querySelector('#overlay input[name="dm"]:checked'); if (checked) checked.focus();
      return;
    }
    var f = e.target.getAttribute && e.target.getAttribute('data-filter');
    if (!f) return;
    if (f === 'svc' || f === 'status') { S.filters[f] = e.target.value; renderMain(); }
  });
  // Esc закрывает слои; ↑/↓ навигация по очереди опущена ради простоты
  document.addEventListener('keydown', function (e) {
    if (S.locked) {
      var lockCard = document.querySelector('#lock-root .s-locked__card');
      if (e.key === 'Escape') { e.preventDefault(); return; }
      if (e.key === 'Tab' && lockCard) trapFocus(lockCard, e);
      return;
    }
    var filterTrigger = closest(e.target, '.filter-select__trigger');
    var filterOption = closest(e.target, '.filter-select__option');
    if (filterTrigger && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      var triggerName = filterTrigger.getAttribute('data-filter-name');
      setFilterMenu(triggerName, true);
      var triggerOptions = [].slice.call(document.querySelectorAll('.filter-select--' + triggerName + ' .filter-select__option'));
      var selectedOption = triggerOptions.filter(function (el) { return el.getAttribute('aria-selected') === 'true'; })[0];
      (selectedOption || triggerOptions[e.key === 'ArrowDown' ? 0 : triggerOptions.length - 1])?.focus();
      return;
    }
    if (filterOption && ['ArrowDown','ArrowUp','Home','End'].indexOf(e.key) >= 0) {
      e.preventDefault();
      var filterOptions = [].slice.call(filterOption.parentNode.querySelectorAll('.filter-select__option'));
      var optionIndex = filterOptions.indexOf(filterOption);
      if (e.key === 'Home') optionIndex = 0;
      else if (e.key === 'End') optionIndex = filterOptions.length - 1;
      else optionIndex = (optionIndex + (e.key === 'ArrowDown' ? 1 : -1) + filterOptions.length) % filterOptions.length;
      filterOptions[optionIndex].focus(); return;
    }
    if (e.key === 'Escape') {
      var openFlyout = document.querySelector('#pop .dd.open');
      if (openFlyout) {
        openFlyout.classList.remove('open', 'dd-right');
        var flyoutTrigger = openFlyout.querySelector('.dd-btn');
        if (flyoutTrigger) { flyoutTrigger.setAttribute('aria-expanded', 'false'); flyoutTrigger.focus(); }
        return;
      }
      if (S.filterOpen) {
        var openFilterName = S.filterOpen;
        closeFilterMenu();
        document.querySelector('.filter-select--' + openFilterName + ' .filter-select__trigger')?.focus();
      }
      else if (S.modal) closeModal(); else if (S.pop) closePop();
      else if (document.getElementById('app')) document.getElementById('app').classList.remove('nav-open');
      return;
    }
    // фокус-ловушка внутри модалки
    if (S.modal && e.key === 'Tab') { var mod = overlayEl().querySelector('.modal'); if (mod) trapFocus(mod, e); return; }

    var ae = document.activeElement;
    // активация кликабельной строки (role=button на div) с клавиатуры
    if ((e.key === 'Enter' || e.key === ' ') && ae && ae.matches &&
        ae.matches('[data-act][tabindex="0"]:not(button):not(a):not(input):not(select):not(textarea)')) {
      e.preventDefault(); ae.click(); return;
    }
    if (ae && ae.matches && ae.matches('.mfb-step') && ['ArrowRight','ArrowLeft','ArrowDown','ArrowUp','Home','End'].indexOf(e.key) >= 0) {
      e.preventDefault();
      var flowTabs = [].slice.call(document.querySelectorAll('.mfb-step'));
      var flowIndex = flowTabs.indexOf(ae);
      if (e.key === 'Home') flowIndex = 0;
      else if (e.key === 'End') flowIndex = flowTabs.length - 1;
      else flowIndex = (flowIndex + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + flowTabs.length) % flowTabs.length;
      var flowId = flowTabs[flowIndex].getAttribute('data-id');
      flowTabs[flowIndex].click();
      document.querySelector('.mfb-step[data-id="' + flowId + '"]')?.focus();
      return;
    }
    // стрелки по вкладкам карточки (roving tabindex)
    if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && ae && ae.matches && ae.matches('.tabs .tab')) {
      e.preventDefault();
      var tabs = [].slice.call(ae.parentNode.querySelectorAll('.tab'));
      var i = tabs.indexOf(ae);
      var n = e.key === 'ArrowRight' ? (i + 1) % tabs.length : (i - 1 + tabs.length) % tabs.length;
      tabs[n].click();
      var again = document.querySelectorAll('.tabs .tab')[n]; if (again) again.focus();
      return;
    }
    if (e.key === '/' && S.authed && !S.modal && ae.tagName !== 'INPUT' && ae.tagName !== 'TEXTAREA') {
      e.preventDefault(); var s = document.getElementById('top-search'); if (s) s.focus();
    }
  });

  /* ------- вспомогательные переходы ------- */
  function currentBase() {
    if (S.view === 'all') return S.apps.slice();
    if (S.view === 'overdue') return overdue();
    return mineActive();
  }
  function go(view) {
    S.view = view; S.cardId = null; S.sel = {}; closeLayers(false);
    var activeView = view === 'form-builder' ? 'forms' : view;
    document.querySelectorAll('.ekh-side__item').forEach(function (b) {
      if (b.getAttribute('data-view') === activeView) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
    });
    var app = document.getElementById('app'); if (app) app.classList.remove('nav-open');
    syncNavToggle();
    var main = document.getElementById('main'); if (main) main.scrollTop = 0;
    renderMain();
    writeArm();
  }
  function openCard(id) { S.cardId = id; S.view = 'card'; S.cardTab = 'overview'; closeLayers(false); var m = document.getElementById('main'); if (m) m.scrollTop = 0; renderMain(); }

  /* Замок — модалка поверх того экрана, на котором остановились (правило 42,
     §3 «Workstation lock»): шелл остаётся смонтированным и размывается, а
     заголовок, поле и кнопка — те же классы S0 при --login-scale, поэтому
     оператор отвечает на один вопрос в той же типографике, в которой входил.
     Композиция общая с ЦОН (design-system/css/patterns.css).

     Размытие — только визуальный слой: данные под ним живые и есть в DOM,
     поэтому замок обязан быть модальным по-настоящему — фокус заперт внутри,
     Escape его не снимает. Иначе «блокировка» обходится клавишей Tab. */
  function doLock() {
    closeLayers(true);
    S.locked = true;
    var app = document.getElementById('app'); if (app) app.classList.add('is-blurred');
    var lock = document.createElement('div'); lock.id = 'lock-root';
    lock.innerHTML =
      '<div class="s-locked">' +
        '<div class="login__brand s-locked__brand">' + ic('i-logo') + '<b>eKhizmat</b></div>' +
        '<form class="panel login__card s-locked__card" role="dialog" aria-modal="true" aria-labelledby="lock-title" novalidate>' +
          '<div class="s-locked__scale"><div class="s-locked__body">' +
            ic('i-lock','s-locked__icon') +
            '<div class="s-locked__copy"><div class="login__heading">' +
              '<h1 id="lock-title">' + esc(t('locked_title')) + '</h1>' +
              '<p>' + esc(D.ME.name + ' · ' + agencyName()) + '</p>' +
            '</div></div>' +
            '<div class="s-locked__controls">' +
              '<div class="login__fields">' +
                '<div class="field login-field--floating"><label class="field__label" for="lock-pass">' + esc(t('login_pass')) + '</label>' +
                  '<input class="field__input" id="lock-pass" name="password" type="password" placeholder=" " autocomplete="current-password"></div>' +
                '<span class="field__error" id="lock-error" role="alert" hidden></span>' +
              '</div>' +
              '<div class="login__actions"><button class="btn btn--primary btn--l" type="submit" data-act="unlock">' + esc(t('unlock')) + '</button></div>' +
            '</div>' +
          '</div></div>' +
        '</form>' +
        '<p class="s-locked__legend">' + esc(t('login_legend_primary')) + '</p>' +
      '</div>';
    document.getElementById('root').appendChild(lock);
    var card = lock.querySelector('.s-locked__card');
    card.addEventListener('submit', function (e) { e.preventDefault(); doUnlock(); });
    fitLockScale();
    lock.querySelector('#lock-pass').focus();
    toast(t('t_locked'), 'success');
  }
  /* Login paints its 70px controls through `transform: scale(--login-scale)`,
     and a transform does not shrink the layout box — so the wrapper is sized
     to the painted result by hand. */
  function fitLockScale() {
    var wrap = document.querySelector('#lock-root .s-locked__scale');
    var body = document.querySelector('#lock-root .s-locked__body');
    if (!wrap || !body) return;
    var scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--login-scale')) || 0.8;
    wrap.style.width = (body.offsetWidth * scale) + 'px';
    wrap.style.height = (body.offsetHeight * scale) + 'px';
  }
  function doUnlock() {
    var input = document.getElementById('lock-pass');
    var error = document.getElementById('lock-error');
    if (!input.value.trim()) {
      error.textContent = t('lock_password_required');
      error.hidden = false;
      input.setAttribute('aria-invalid', 'true');
      fitLockScale();
      input.focus();
      return;
    }
    S.locked = false;
    document.getElementById('lock-root').remove();
    document.getElementById('app').classList.remove('is-blurred');
    document.querySelector('.ekh-side__user')?.focus();
  }

  /* ================================================================== */
  /* Запуск                                                             */
  /* ================================================================== */
  function startApp() { S.view = 'queue'; S.statIntroPending = true; renderApp(); writeArm(); }

  function boot() {
    /* Тему и lang уже поставил preferences.js (и предотрисовочный скрипт в
       <head>); здесь их только читают. */
    loadData();
    document.addEventListener('visibilitychange', syncToastTimers);
    window.addEventListener('resize', syncNavToggle);
    // авто-разрешение изначально «висящего» межвед-запроса (a4) — демонстрация
    setTimeout(function () {
      var a = appById('a4'); if (!a) return;
      var p = (a.interop || []).filter(function (r) { return r.status === 'pending'; })[0];
      if (!p) return;
      p.status = 'received'; p.at = now(); p.value = {ru:'Сведения из ЕГРЮЛ предоставлены',tg:'Маълумот аз ФЯШҲ пешниҳод шуд'};
      a.status = 'processing'; addHistory(a, 'Smart Bridge', {ru:'Получен ответ ЕГРЮЛ',tg:'Ҷавоби ФЯШҲ гирифта шуд'}, 'processing');
      S.notifs.unshift({ id: 'n' + now(), kind: 'info', appId: 'a4', title:{ru:'Получен ответ ведомства',tg:'Ҷавоби идора гирифта шуд'}, text:{ru:'Выписка из ЕГРЮЛ · ' + a.number,tg:'Иқтибос аз ФЯШҲ · ' + a.number}, at: now(), unread: true });
      persist();
      if (S.authed && (S.view === 'card' && S.cardId === 'a4' || S.view === 'interop' || S.view === 'queue')) renderMain();
      if (S.authed) { refreshChrome(); toast(t('t_received'), 'success'); }
    }, 9000);

    readFiltersFromUrl();
    var snap = readArm();
    if (snap) {
      S.authed = true;
      S.view = ARM_VIEWS[snap.view] ? snap.view : 'queue';
      renderApp();
    } else {
      renderLogin();
    }
    setInterval(function () { if (S.authed && !S.locked) tick(); }, 1000);
  }

  subscribeLowCode(function () {
    if (S._lowCodeBusy || !S.authed) return;
    if (S.view === 'forms' || S.view === 'form-builder') renderMain();
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
