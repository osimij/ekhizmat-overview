import './data.js';
import { dispatchLowCode, getLowCodeState, subscribeLowCode } from '../../admin/js/lowcode.js';

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
  var query = new URLSearchParams(location.search);
  function pref(key, fallback) { try { return query.get(key) || localStorage.getItem('ekh.preferences.' + key) || fallback; } catch (e) { return fallback; } }

  /* ------------------------------------------------------------------ */
  /* Состояние                                                          */
  /* ------------------------------------------------------------------ */
  var S = {
    authed: false,
    loginStep: 1,
    lang: pref('lang', 'ru'),
    theme: pref('theme', 'light'),
    view: 'queue',
    cardId: null,
    cardTab: 'overview',
    apps: [],
    notifs: [],
    filters: { svc: '', status: '', sla: 'all', q: '' },
    sort: { key: 'sla', dir: 1 },
    sel: {},                            // id → true (выбранные для массовой обработки)
    batchSvc: '',                       // услуга для экрана массовой обработки
    formDraft: null,
    formReadOnly: false,
    formStep: 'fields',
    formFieldOpen: null,
    formPaletteOpen: false,
    formPreviewOpen: false,
    modal: null,                        // объект текущей модалки
    pop: null                           // 'notif' | 'user' | null
  };

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
    if (d >= 1) s = d + 'д ' + h + 'ч';
    else if (h >= 1) s = h + 'ч ' + m + 'м';
    else s = m + 'м';
    return (neg ? '−' : '') + s;
  }
  function locale() { return S.lang === 'tg' ? 'tg-TJ' : 'ru-RU'; }
  function fmtDate(ts) { return new Intl.DateTimeFormat(locale(), { day:'2-digit', month:'2-digit', year:'numeric' }).format(new Date(ts)); }
  function fmtDateTime(ts) {
    var dt = new Date(ts);
    return new Intl.DateTimeFormat(locale(), { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }).format(dt);
  }
  function fmtAgo(ts) {
    var diff = now() - ts;
    if (diff < HOUR) return Math.max(1, Math.floor(diff / MIN)) + ' мин назад';
    if (diff < DAY) return Math.floor(diff / HOUR) + ' ч назад';
    return Math.floor(diff / DAY) + ' дн назад';
  }
  function money(v) { return v ? new Intl.NumberFormat('ru-RU').format(v) + ' сомони' : ''; }

  function slaState(app) {
    var rem = app.dueAt - now();
    if (rem <= 0) return 'breach';
    if (rem <= WARN) return 'warn';
    return 'ok';
  }
  function statusInfo(key) { return D.STATUS[key] || { ru: key, tg: key, pill: 'pill--draft' }; }
  function statusLabel(key) { var s = statusInfo(key); return s[S.lang] || s.ru; }
  function svc(app) { return D.SERVICE[app.svc]; }
  function lc() { return getLowCodeState(); }
  function localValue(value, fallback) {
    if (typeof value === 'string') return value;
    return value && (value[S.lang] || value.ru || value.tg) || fallback || '';
  }
  function lowCodeStatusLabel(status) {
    return t('form_status_' + status) || status;
  }
  function lowCodeStatusTone(status) {
    return ({ draft:'draft', stage:'stage', in_review:'review', changes_requested:'changes', resubmitted:'review', approved:'approved', rejected:'rejected', published:'published' })[status] || 'draft';
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
      if (q) {
        var hay = (a.number + ' ' + svc(a).name + ' ' + a.applicant.name + ' ' + (a.applicant.tin || '')).toLowerCase();
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
        '<div class="login__subtitle body-l">' + esc(t('login_sub')) + '</div>' +
        '<div class="panel login__card' + (loginErr ? ' is-shake' : '') + '">' +
          (step === 1 ?
            '<div class="stack g-4">' +
              '<div class="login__fields">' +
                '<div class="field login-field--floating"><label class="field__label" for="l-user">' + esc(t('login_user')) + '</label>' +
                  '<input class="field__input" id="l-user" name="username" value="' + esc(D.ME.login) + '" placeholder=" " autocomplete="username" spellcheck="false"></div>' +
                '<div class="field login-field--floating"><label class="field__label" for="l-pass">' + esc(t('login_pass')) + '</label>' +
                  '<div class="field__wrap"><input class="field__input" id="l-pass" name="password" type="password" placeholder=" " autocomplete="current-password"' + (loginErr ? ' aria-invalid="true" aria-describedby="login-error"' : '') + '>' +
                  '<span class="field__affix">' + ic('i-lock', 'icon--20') + '</span></div></div>' +
                (loginErr ? '<span class="field__error" id="login-error" role="alert">' + esc(loginErr) + '</span>' : '') +
              '</div>' +
              '<button class="btn btn--primary btn--l" type="button" data-act="login-next">' + esc(t('login_next')) + '</button>' +
            '</div>'
          :
            '<div class="stack g-4">' +
              '<div class="login__step small">' + esc(t('login_mfa_hint')) + ' <span class="login__mfa-target">•••• 40 22</span></div>' +
              '<div class="field"><span class="field__label" id="l-otp-label">' + esc(t('login_mfa')) + '</span>' +
                '<div class="otp" id="l-otp">' +
                  [0,1,2,3,4,5].map(function(i){return '<input class="otp__cell" name="otp-'+(i+1)+'" inputmode="numeric" maxlength="1" data-otp="'+i+'" autocomplete="one-time-code" aria-label="'+esc(t('login_mfa'))+' '+(i+1)+'"'+(loginErr ? ' aria-invalid="true" aria-describedby="login-error"' : '')+'>';}).join('') +
                '</div></div>' +
              (loginErr ? '<span class="field__error" id="login-error" role="alert">' + esc(loginErr) + '</span>' : '') +
              '<div class="login__actions">' +
                '<button class="btn btn--primary btn--l" type="button" data-act="login-enter">' + ic('i-shield','icon--20') + esc(t('login_enter')) + '</button>' +
                '<button class="btn btn--ghost btn--l" type="button" data-act="login-back">' + esc(t('login_back')) + '</button>' +
              '</div>' +
            '</div>'
          ) +
        '</div>' +
        '<div class="login__legend small"><span class="login__legend-copy">' + esc(t('login_legend_primary')) + '<br>' + esc(t('login_legend_secondary')) + '</span></div></div>' +
      '</div>';
    document.getElementById('root').innerHTML = body;
    S._loginErr = false;
  }

  /* ================================================================== */
  /* РЕНДЕР: каркас приложения                                           */
  /* ================================================================== */
  function navItem(view, icon, label, count, alert) {
    var c = count != null && count > 0
      ? '<span class="nav-count' + (alert ? ' nav-count--alert' : '') + '">' + count + '</span>' : '';
    return '<button class="nav-item' + (S.view === view ? ' is-active' : '') + '" data-act="nav" data-view="' + view + '">' +
      ic(icon) + '<span class="nav-item__label">' + esc(label) + '</span>' + c + '</button>';
  }

  function renderApp() {
    closeLayers(true);
    var qCount = mineActive().length, oCount = overdue().length, iCount = pendingInterop();
    var shell =
      '<div class="app' + '" id="app">' +
        '<div class="side__backdrop" data-act="nav-close"></div>' +

        /* топбар */
        '<header class="topbar app__top">' +
          '<button class="btn btn--icon btn--s nav-toggle iconbtn" data-act="nav-toggle" aria-label="Меню">' + ic('i-dash','icon--20') + '</button>' +
          '<a class="topbar__brand row g-2" href="#" data-act="nav" data-view="queue">' + ic('i-logo') + '<b>eKhizmat</b></a>' +
          '<div class="topbar__bind"><b>' + esc(t('app_title')) + '</b><span class="small">' + esc(D.ME.agency) + '</span></div>' +
          '<div class="field__wrap field__wrap--search topbar__search">' +
            '<span class="field__affix">' + ic('i-search','icon--20') + '</span>' +
            '<input class="field__input" id="top-search" placeholder="' + esc(t('search_ph')) + '" aria-label="' + esc(t('search_ph')) + '" value="' + esc(S.filters.q) + '" data-filter="q">' +
          '</div>' +
          '<div class="topbar__actions">' +
            '<button class="btn btn--icon iconbtn" data-act="notif-open" aria-label="Уведомления" aria-haspopup="dialog" aria-expanded="false">' + ic('i-bell','icon--20') +
              (unreadNotifs() ? '<span class="badge-dot">' + unreadNotifs() + '</span>' : '') + '</button>' +
            '<button class="btn btn--icon iconbtn" data-act="lang" aria-label="Язык · ' + (S.lang === 'ru' ? 'русский' : 'тоҷикӣ') + '">' + ic('i-globe','icon--20') + '</button>' +
            '<button class="btn btn--icon iconbtn" data-act="theme" aria-label="' + esc(t('theme')) + '">' + ic(S.theme === 'dark' ? 'i-sun' : 'i-moon','icon--20') + '</button>' +
            '<button class="btn btn--icon" data-act="user-open" aria-label="Профиль" aria-haspopup="menu" aria-expanded="false" style="padding:0"><span class="avatar">' + esc(D.ME.initials) + '</span></button>' +
          '</div>' +
        '</header>' +

        /* сайдбар */
        '<aside class="app__side"><nav class="side">' +
          '<div class="side__group-label">' + esc(t('nav_group')) + '</div>' +
          navItem('queue', 'i-inbox', t('nav_queue'), qCount, false) +
          navItem('all', 'i-history', t('nav_all'), null, false) +
          navItem('overdue', 'i-clock', t('nav_overdue'), oCount, true) +
          navItem('batch', 'i-users', t('nav_batch'), null, false) +
          '<div class="side__group-label">' + esc(t('nav_group2')) + '</div>' +
          navItem('interop', 'i-refresh', t('nav_interop'), iCount, false) +
          navItem('reports', 'i-dash', t('nav_reports'), null, false) +
          '<div class="side__group-label">' + esc(t('nav_group3')) + '</div>' +
          navItem('forms', 'i-edit', t('nav_forms'), null, false) +
          '<div class="side__spacer"></div>' +
          '<div class="side__foot"><div class="row g-3"><span class="avatar">' + esc(D.ME.initials) + '</span>' +
            '<div class="stack" style="min-width:0"><b class="small" style="color:var(--ink)">' + esc(D.ME.name) + '</b>' +
            '<span class="side__division">' + esc(D.ME.division) + '</span></div></div>' +
          '</div>' +
        '</nav></aside>' +

        /* основная область */
        '<main class="app__main" id="main" tabindex="-1"></main>' +
      '</div>' +
      '<div id="overlay"></div>' +
      '<div class="toasts" id="toasts" aria-live="polite"></div>';
    document.getElementById('root').innerHTML = shell;
    renderMain();
  }

  function unreadNotifs() { return S.notifs.filter(function (n) { return n.unread; }).length; }

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
    else if (S.view === 'batch') html = viewBatch();
    else html = viewQueue();     // queue | all | overdue
    main.innerHTML = html;
    tick();                       // сразу проставить живые сроки
    // синхронизировать активную навигацию (view мог смениться на 'card')
    document.querySelectorAll('.nav-item').forEach(function (b) {
      var activeView = S.view === 'form-builder' ? 'forms' : S.view;
      b.classList.toggle('is-active', b.getAttribute('data-view') === activeView);
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

  function viewForms() {
    S.formDraft = null;
    S.formReadOnly = false;
    var forms = ministryForms(), state = lc();
    var drafts = forms.filter(function (f) { return ['draft','stage','changes_requested','rejected'].indexOf(f.status) >= 0; }).length;
    var review = forms.filter(function (f) { return ['in_review','resubmitted','approved'].indexOf(f.status) >= 0; }).length;
    var published = forms.filter(function (f) { return f.status === 'published'; }).length;
    var h = '<div class="view forms-view">' +
      '<div class="view__head"><div class="view__titles"><h1 class="h2">' + esc(t('forms_title')) + '</h1>' +
      '<div class="view__sub">' + esc(t('forms_sub')) + '</div></div>' +
      '<div class="view__actions"><button class="btn btn--primary" type="button" data-act="form-create">' + ic('i-plus','icon--20') + esc(t('forms_create')) + '</button></div></div>' +
      '<div class="stat-grid forms-stats">' +
        statTile('i-edit', drafts, t('forms_drafts'), '') +
        statTile('i-eye', review, t('forms_review'), review ? 'warn' : '') +
        statTile('i-check', published, t('forms_published'), 'ok') +
        statTile('i-doc', forms.length, t('forms_total'), '') +
      '</div>' +
      '<div class="panel forms-catalog"><div class="forms-catalog__head"><div><h2 class="h3">' + esc(t('forms_registry')) + '</h2><p class="small">' + esc(t('forms_registry_hint')) + '</p></div>' +
      '<span class="form-role">' + ic('i-edit','icon--16') + esc(t('forms_role')) + '</span></div>' +
      '<div class="form-list">';

    forms.forEach(function (form) {
      var openAct = form.current ? 'form-open' : 'form-open-static';
      h += '<button class="form-row" type="button" data-act="' + openAct + '" data-id="' + esc(form.id) + '">' +
        '<span class="form-row__icon ' + esc(form.tone) + '">' + ic(form.icon,'') + '</span>' +
        '<span class="form-row__main"><b>' + esc(form.name) + '</b><span>' + esc(t('form_version')) + ' ' + esc(form.version) + ' · ' + esc(form.meta) + '</span><span class="form-row__audiences">' + formAudienceBadges(form.audience) + '</span></span>' +
        '<span class="form-status form-status--' + lowCodeStatusTone(form.status) + '">' + esc(lowCodeStatusLabel(form.status)) + '</span>' +
        ic('i-chev-r','icon--16') + '</button>';
    });
    h += '</div></div>';
    if (state.comments && state.comments.length) {
      h += '<div class="banner banner--info forms-comment-note">' + ic('i-info','icon--20') + '<span class="banner__text">' + esc(t('forms_comments_waiting').replace('{n}', state.comments.length)) + '</span></div>';
    }
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

  function formPipeline(draft, editable) {
    var groups = formStepGroups();
    var h = '<aside class="mfb-pipeline" aria-label="' + esc(t('form_flow_title')) + '"><div class="mfb-pipeline__head"><h2>' + esc(t('form_flow_title')) + '</h2><span>' + esc(t('form_flow_steps')) + '</span></div>';
    groups.forEach(function (group) {
      h += '<div class="mfb-pipeline__label">' + esc(group.label) + '</div><div class="mfb-pipeline__group" role="tablist" aria-label="' + esc(group.label) + '">';
      group.items.forEach(function (step) {
        var active = S.formStep === step.id;
        h += '<button class="mfb-step" type="button" role="tab" data-act="form-step" data-id="' + step.id + '" aria-selected="' + (active ? 'true' : 'false') + '" tabindex="' + (active ? '0' : '-1') + '">' +
          '<span class="mfb-step__icon">' + ic(step.icon,'icon--16') + '</span><span class="mfb-step__text"><b>' + esc(step.title) + '</b><span>' + esc(step.sub) + '</span></span>' +
          (step.id === 'fields' ? '<span class="mfb-step__count">' + draft.formFields.length + '</span>' : step.id === 'route' && editable ? '<span class="mfb-step__dot" aria-hidden="true"></span>' : '') + '</button>';
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

  function formPreview(draft, title) {
    var fields = draft.formFields.map(formFieldPreview).join('');
    return '<aside class="mfb-preview ' + (S.formPreviewOpen ? 'is-open' : '') + '" id="formPreview" tabindex="0" aria-label="' + esc(t('form_preview')) + '"><div class="mfb-preview__bar"><span class="mfb-live"><i></i>' + esc(t('form_preview')) + '</span><span>' + esc(t('form_preview_mode')) + '</span><button class="btn btn--icon btn--s mfb-preview__close" type="button" data-act="form-preview-toggle" aria-label="' + esc(t('form_preview_close')) + '">' + ic('i-x','icon--16') + '</button></div>' +
      '<div class="mfb-preview__stage"><div class="mfb-phone"><div class="mfb-phone__status"><span>9:41</span><span>● ◒</span></div><div class="mfb-phone__screen"><div class="mfb-preview-head">' + ic('i-logo','icon--20') + '<b>eKhizmat</b><span>Ф</span></div><div class="mfb-preview-progress"><i class="is-on"></i><i></i><i></i><i></i></div><div class="mfb-preview-body"><div class="mfb-preview-audiences">' + formAudienceBadges(draft.audience) + '</div><h2>' + esc(title) + '</h2><p>' + esc(t('form_preview_intro')) + '</p>' + (fields || '<div class="mfb-preview-empty">' + esc(t('form_no_fields')) + '</div>') + '<div class="mfb-preview-actions"><button class="btn btn--secondary" type="button" disabled>' + esc(t('form_preview_back')) + '</button><button class="btn btn--primary" type="button" disabled>' + esc(t('form_preview_continue')) + '</button></div></div></div></div></div></aside>';
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
      return '<article class="mfb-field-item form-field-row ' + (open && editable ? 'is-open' : '') + '" data-form-field-row="' + esc(field.id) + '"><div class="mfb-field-head"><span class="mfb-field-grip" aria-hidden="true"></span>' + opener +
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
    else if (step === 'delivery') body = '<div class="mfb-section-label">' + esc(t('form_delivery_methods')) + '</div><div class="mfb-toggle-list">' + formToggleRow('i-wallet',t('form_delivery_digital'),t('form_delivery_digital_sub'),true,!editable) + formToggleRow('i-doc',t('form_delivery_paper'),t('form_delivery_paper_sub'),false,!editable) + '</div><div class="mfb-section-label">' + esc(t('form_cost')) + '</div><div class="seg mfb-seg"><label><input type="radio" name="form-cost" checked ' + (editable ? '' : 'disabled') + '><span>' + esc(t('form_free')) + '</span></label><label><input type="radio" name="form-cost" ' + (editable ? '' : 'disabled') + '><span>' + esc(t('form_paid')) + '</span></label></div>';
    else if (step === 'review') body = '<div class="mfb-section-label">' + esc(t('form_consent')) + '</div><label class="field"><textarea class="input" rows="3" ' + (editable ? '' : 'disabled') + '>' + esc(t('form_consent_text')) + '</textarea></label><div class="mfb-toggle-list mfb-toggle-list--spaced">' + formToggleRow('i-sign',t('form_esign'),t('form_esign_sub'),true,true) + formToggleRow('i-call',t('form_sms'),t('form_sms_sub'),false,!editable) + '</div>';
    else if (step === 'checks') body = '<div class="mfb-section-label">' + esc(t('form_active_checks')) + '</div><div class="mfb-toggle-list">' + formToggleRow('i-shield',t('form_check_registry'),t('form_check_registry_sub'),true,!editable) + formToggleRow('i-search',t('form_check_duplicate'),t('form_check_duplicate_sub'),true,!editable) + formToggleRow('i-doc',t('form_check_files'),t('form_check_files_sub'),false,!editable) + '</div>';
    else if (step === 'route') body = '<div class="form-name-grid"><label class="field"><span class="field__label">' + esc(t('form_responsible_unit')) + '</span><select class="input" ' + (editable ? '' : 'disabled') + '><option>' + esc(t('form_unit_nko')) + '</option><option>' + esc(t('form_unit_legal')) + '</option></select></label><label class="field"><span class="field__label">' + esc(t('form_reviewer_role')) + '</span><select class="input" ' + (editable ? '' : 'disabled') + '><option>' + esc(t('form_role_specialist')) + '</option><option>' + esc(t('form_role_lead')) + '</option></select></label><label class="field"><span class="field__label">' + esc(t('form_sla')) + '</span><input class="input" value="' + esc(t('form_sla_value')) + '" ' + (editable ? '' : 'disabled') + '></label></div><div class="mfb-toggle-list mfb-toggle-list--spaced">' + formToggleRow('i-bell',t('form_escalation'),t('form_escalation_sub'),true,!editable) + '</div>';
    else body = '<div class="mfb-section-label">' + esc(t('form_result_document')) + '</div><div class="mfb-output-card"><span>' + ic('i-doc','icon--20') + '</span><div><b>' + esc(t('form_result_nko')) + '</b><p>' + esc(t('form_result_nko_sub')) + '</p></div><button class="btn btn--secondary btn--s" type="button" ' + (editable ? '' : 'disabled') + '>' + esc(t('form_template_edit')) + '</button></div><div class="mfb-toggle-list mfb-toggle-list--spaced">' + formToggleRow('i-wallet',t('form_wallet_result'),t('form_wallet_result_sub'),true,!editable) + '</div>';

    var citizenStep = ['confirm','fields','delivery','review'].indexOf(step);
    var stepContext = citizenStep >= 0 ? t('form_step_label') + ' ' + (citizenStep + 1) + ' · ' + t('form_flow_citizen') : t('form_flow_agency');
    return '<section class="mfb-editor" role="tabpanel"><div class="mfb-editor__inner"><header class="mfb-editor__head"><span>' + ic((formStepGroups().reduce(function (all,g) { return all.concat(g.items); },[]).filter(function (item) { return item.id === step; })[0] || {icon:'i-edit'}).icon,'icon--14') + esc(stepContext) + '</span><h1>' + esc(heads[step][0]) + '</h1><p>' + esc(heads[step][1]) + '</p></header>' + body + '</div></section>';
  }

  function viewFormBuilder() {
    var state = lc();
    if (!S.formDraft) S.formDraft = makeFormDraft(state);
    var draft = S.formDraft, editable = isFormEditable();
    var title = localValue(draft.serviceName, t('form_untitled'));
    var status = S.formReadOnly ? 'published' : state.status;
    var comments = (state.comments || []).map(function (comment) {
      return '<article class="form-comment"><div><b>' + esc(comment.author === 'reviewer' ? t('form_reviewer') : t('forms_role')) + '</b><span>' + esc(comment.at) + '</span></div><p>' + esc(comment.body) + '</p></article>';
    }).join('');
    var canSend = editable && draft.formFields.length > 0;
    var sendLabel = state.status === 'changes_requested' ? t('form_resubmit') : t('form_send');

    return '<div class="form-builder-view">' +
      '<header class="mfb-top form-builder-head"><a class="back-link" href="#" data-act="form-back">' + ic('i-chev-l','icon--16') + '<span>' + esc(t('forms_title')) + '</span></a><span class="mfb-divider" aria-hidden="true"></span><span class="mfb-service-icon">' + ic('i-cat-justice','icon--16') + '</span><div class="mfb-title"><h1>' + esc(title) + '</h1><span class="form-status form-status--' + lowCodeStatusTone(status) + '">' + esc(lowCodeStatusLabel(status)) + '</span></div><span class="mfb-spacer"></span><button class="btn btn--secondary btn--s mfb-preview-toggle" type="button" data-act="form-preview-toggle" aria-expanded="' + (S.formPreviewOpen ? 'true' : 'false') + '" aria-controls="formPreview">' + ic('i-eye','icon--16') + esc(t('form_preview')) + '</button>' +
      (editable ? '<div class="mfb-actions"><button class="btn btn--secondary btn--s" type="button" data-act="form-save">' + ic('i-check','icon--16') + esc(t('form_save_short')) + '</button><button class="btn btn--primary btn--s" type="button" data-act="form-send" ' + (canSend ? '' : 'disabled') + '>' + ic('i-users','icon--16') + esc(sendLabel) + '</button></div>' : '') + '</header>' +
      '<div class="mfb-meta"><div class="mfb-meta__main"><span class="mfb-env">Stage</span><span class="form-status form-status--' + lowCodeStatusTone(status) + '">' + esc(lowCodeStatusLabel(status)) + '</span><span>' + esc(t('form_version')) + ' ' + esc(state.serviceVersion) + '</span><span>' + ic('i-edit','icon--14') + esc(t('forms_role')) + '</span></div><div class="mfb-audiences"><b>' + esc(t('form_audiences')) + '</b>' + ['person','business','guest'].map(function (id) { return '<label><input type="checkbox" data-form-audience="' + id + '" ' + (draft.audience.indexOf(id) >= 0 ? 'checked' : '') + ' ' + (editable ? '' : 'disabled') + '><span>' + esc(id === 'person' ? t('form_person') : id === 'business' ? t('form_business') : t('form_guest')) + '</span></label>'; }).join('') + '</div><div class="mfb-meta__comments">' + ic('i-chat','icon--14') + '<span>' + esc(t('form_comments')) + '</span><b>' + (state.comments || []).length + '</b></div></div>' +
      (!editable ? '<div class="banner banner--info form-lock-note">' + ic('i-lock','icon--20') + '<span class="banner__text">' + esc(t(S.formReadOnly ? 'form_readonly_sub' : 'form_locked_review')) + '</span></div>' : '') +
      (comments ? '<div class="mfb-comments banner banner--info">' + ic('i-chat','icon--20') + '<div><b>' + esc(t('form_comments')) + '</b><div class="form-comments">' + comments + '</div></div></div>' : '') +
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
    if (scope === 'all') { title = t('nav_all'); sub = t('of_agency') + ' · ' + D.ME.agency; }
    else if (scope === 'overdue') { title = t('overdue_title'); sub = t('overdue_sub'); }
    else { title = t('queue_title'); sub = t('queue_sub'); }

    var list = sortList(applyFilters(base));
    var selCount = Object.keys(S.sel).filter(function (id) { return S.sel[id] && list.some(function(a){return a.id===id;}); }).length;

    var h = '<div class="view">';
    h += '<div class="view__head"><div class="view__titles"><h1 class="h2">' + esc(title) + '</h1>' +
         '<div class="view__sub">' + esc(sub) + '</div></div></div>';

    if (scope === 'overdue') {
      h += '<div class="banner banner--error mt-2" style="margin-bottom:var(--s-4)">' + ic('i-clock','icon--20') +
           '<span class="banner__text">Нарушение сроков зафиксировано в бизнес-мониторинге и эскалировано руководителю подразделения (§7Б.3).</span></div>';
    }

    // метрики очереди
    if (scope !== 'all') {
      var mine = mineActive();
      h += '<div class="stat-grid">' +
        statTile('i-inbox', mine.length, t('nav_queue'), '') +
        statTile('i-clock', overdue().length, t('rep_breach'), overdue().length ? 'alert' : 'ok') +
        statTile('i-refresh', pendingInterop(), t('awaiting_reply'), pendingInterop() ? 'warn' : '') +
        statTile('i-fire', mine.filter(function(a){return a.priority==='Высокий';}).length, t('priority'), '') +
        '</div>';
    }

    // тулбар фильтров
    h += '<div class="toolbar">' +
      '<div class="field__wrap field__wrap--search"><span class="field__affix">' + ic('i-search','icon--20') + '</span>' +
        '<input class="field__input" placeholder="' + esc(t('search_ph')) + '" aria-label="' + esc(t('search_ph')) + '" value="' + esc(S.filters.q) + '" data-filter="q"></div>' +
      selectFilter('svc', t('f_all_services'), Object.keys(D.SERVICE).map(function (k) { return { v: k, l: D.SERVICE[k].name }; }), S.filters.svc) +
      selectFilter('status', t('f_all_statuses'), Object.keys(D.STATUS).map(function (k) { return { v: k, l: statusLabel(k) }; }), S.filters.status) +
      '<div class="seg" role="tablist" aria-label="Срок">' +
        segItem('sla', 'all', t('sla_all')) + segItem('sla', 'warn', t('sla_warn')) + segItem('sla', 'breach', t('sla_breach')) +
      '</div>' +
      '<div class="toolbar__spacer"></div>' +
      '<span class="small nowrap">' + list.length + ' зап.</span>' +
    '</div>';

    if (!list.length) {
      var empty = (scope === 'queue' && !S.filters.q && !S.filters.svc && !S.filters.status && S.filters.sla === 'all');
      h += '<div class="panel"><div class="empty">' + ic('i-check','icon--48') +
        '<div class="empty__title">' + esc(empty ? t('empty_queue_title') : t('empty_title')) + '</div>' +
        '<div class="empty__hint">' + esc(empty ? t('empty_queue_hint') : t('empty_hint')) + '</div></div></div>';
      h += '</div>';
      return h;
    }

    // заголовок таблицы
    var sortLabel = function (key, base) {
      return S.sort.key === key ? base + ' — сортировка ' + (S.sort.dir === 1 ? 'по возрастанию' : 'по убыванию') : 'Сортировать: ' + base;
    };
    h += '<div class="queue"><div class="q-head">' +
      '<span class="q-checkbox"><input type="checkbox" data-act="sel-all" ' + (selCount && selCount === list.length ? 'checked' : '') + ' aria-label="Выбрать все на странице"></span>' +
      '<span>' + esc(t('col_num')) + '</span>' +
      '<span>' + esc(t('col_service')) + '</span>' +
      '<span>' + esc(t('col_applicant')) + '</span>' +
      '<button data-act="sort" data-key="submitted" class="' + (S.sort.key==='submitted'?'is-sorted':'') + '" aria-label="' + esc(sortLabel('submitted', t('col_submitted'))) + '">' + esc(t('col_submitted')) + ic('i-chev-d','') + '</button>' +
      '<span>' + esc(t('col_status')) + '</span>' +
      '<button data-act="sort" data-key="sla" class="' + (S.sort.key==='sla'?'is-sorted':'') + '" aria-label="' + esc(sortLabel('sla', t('col_sla'))) + '">' + esc(t('col_sla')) + ic('i-chev-d','') + '</button>' +
    '</div><div class="q-list">';

    list.forEach(function (a) { h += rowQueue(a); });
    h += '</div>';

    // полоса массовых операций
    if (selCount > 0) {
      var bs = batchStatus(list);
      var hint = bs === 'mixed' ? t('batch_only_same') : bs === 'critical' ? t('batch_critical') : '';
      h += '<div class="batchbar">' +
        '<span class="batchbar__count">' + esc(t('selected')) + ': <b>' + selCount + '</b></span>' +
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
    return '<div class="stat' + (mod ? ' stat--' + mod : '') + '"><div class="stat__k">' + esc(label) + '</div>' +
      '<div class="stat__v tnum">' + val + '</div></div>';
  }
  function selectFilter(name, allLabel, opts, cur) {
    var o = '<option value="">' + esc(allLabel) + '</option>';
    opts.forEach(function (x) { o += '<option value="' + esc(x.v) + '"' + (cur === x.v ? ' selected' : '') + '>' + esc(x.l) + '</option>'; });
    return '<div class="field__wrap"><select class="field__input" data-filter="' + name + '" aria-label="' + esc(allLabel) + '">' + o + '</select>' +
      '<span class="field__affix">' + ic('i-chev-d','icon--16') + '</span></div>';
  }
  function segItem(name, val, label) {
    return '<button class="seg__item" role="tab" aria-selected="' + (S.filters[name] === val) + '" data-filter="' + name + '" data-val="' + val + '">' + esc(label) + '</button>';
  }

  function slaWord(st) { return st === 'breach' ? 'Срок нарушен' : st === 'warn' ? 'Срок приближается' : 'В пределах срока'; }
  function rowQueue(a) {
    var s = svc(a), st = slaState(a), sel = !!S.sel[a.id];
    var appTin = a.applicant.tin ? 'ИНН ' + a.applicant.tin : '';
    var aria = s.name + ', ' + a.applicant.name + ', ' + statusLabel(a.status) + ', ' + slaWord(st);
    return '<div class="q-row ' + s.hue + (sel ? ' is-selected' : '') + '" data-act="open-card" data-id="' + a.id + '" tabindex="0" role="button" aria-label="' + esc(aria) + '">' +
      '<span class="q-checkbox"><input type="checkbox" class="check__input" data-act="sel-toggle" data-id="' + a.id + '" ' + (sel ? 'checked' : '') + ' aria-label="Выбрать заявление ' + esc(a.number) + '"></span>' +
      '<span class="q-num">' + esc(a.number) + '</span>' +
      '<span class="q-service"><span class="q-glyph">' + ic(s.icon,'') + '</span>' +
        '<span class="stack" style="min-width:0"><span class="q-service__name">' + esc(s.name) + '</span>' +
        '<span class="q-service__cat">' + esc(s.cat) + (a.audience === 'guest' || s.audience === 'guest' ? ' · <span class="audience-badge audience-badge--guest">' + ic('i-user','icon--16') + esc(t('audience_guest')) + '</span>' : '') + (s.critical ? ' · <span class="q-flag">' + ic('i-shield','icon--16') + '4 глаза</span>' : '') + '</span></span></span>' +
      '<span class="q-applicant"><span class="q-applicant__name">' + esc(a.applicant.name) + '</span>' +
        '<span class="q-applicant__meta">' + esc(appTin) + '</span></span>' +
      '<span class="q-date">' + esc(fmtDate(a.submittedAt)) + '</span>' +
      '<span class="q-status"><span class="pill ' + statusInfo(a.status).pill + '"><span class="dot"></span>' + esc(statusLabel(a.status)) + '</span></span>' +
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
      ? '<div class="panel"><div class="sla-ring-wrap"><div class="hero-mark ' + (a.status === 'denied' ? 'hero-mark--error' : '') + '">' + ic(a.status === 'denied' ? 'i-x' : 'i-check', '') + '</div>' +
          '<div class="label">' + esc(t('col_status')) + '</div><div class="sla-caption"><b>' + esc(statusLabel(a.status)) + '</b></div></div></div>'
      : '<div class="panel ' + s.hue + '"><div class="sla-ring-wrap">' + ringSvg(a) +
          '<div class="label">' + esc(t('deadline')) + '</div>' +
          '<div class="sla-caption" data-sla-cap data-due="' + a.dueAt + '">' + slaCaption(a) + '</div></div></div>';
    var side =
      slaPanel +
      '<div class="panel">' +
        '<div class="def">' +
          defRow(t('col_status'), '<span class="pill ' + statusInfo(a.status).pill + '"><span class="dot"></span>' + esc(statusLabel(a.status)) + '</span>') +
          (a.audience === 'guest' ? defRow(t('applicant'), '<span class="audience-badge audience-badge--guest">' + ic('i-user','icon--16') + esc(t('audience_guest')) + '</span>') : '') +
          defRow(t('priority'), esc(a.priority)) +
          defRow(t('executor'), esc(a.assignee === 'me' ? D.ME.name : (a.assigneeName || '—'))) +
          defRow(t('division'), esc(D.ME.division)) +
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
          '<h1 class="h2">' + esc(s.name) + '</h1>' +
          '<div class="card-head__meta"><span class="small">' + esc(s.cat) + '</span>' +
            (a.audience === 'guest' || s.audience === 'guest' ? '<span class="audience-badge audience-badge--guest">' + ic('i-user','icon--16') + esc(t('audience_guest')) + '</span>' : '') +
            (s.critical ? '<span class="chip"><span>' + ic('i-shield','icon--16') + '</span>Решение в четыре глаза</span>' : '') +
          '</div></div></div>' +
      '<div class="tabs" role="tablist" aria-label="' + esc(s.name) + '">' +
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
      defRow(ap.kind === 'org' ? 'Наименование' : 'ФИО', esc(ap.name)) +
      (ap.kind === 'org'
        ? defRow('ИНН', '<span class="def__val--tnum">' + esc(ap.tin) + '</span>') + defRow('Рег. номер', esc(ap.reg)) + defRow('Руководитель', esc(ap.head))
        : defRow('ИНН', '<span class="def__val--tnum">' + esc(ap.tin) + '</span>') + defRow('Дата рождения', esc(ap.dob))) +
      defRow('Телефон', '<span class="def__val--tnum">' + esc(ap.phone) + '</span>') +
      (ap.email ? defRow('E-mail', esc(ap.email)) : '') +
      defRow('Адрес', esc(ap.address));

    var formRows = (a.form || []).map(function (f) {
      var src = f.src === 'реестр' ? '<span class="src src--profile">' + ic('i-shield','icon--16') + esc(t('src_registry')) + '</span>'
              : f.src === 'профиль' ? '<span class="src src--profile">' + esc(t('src_profile')) + '</span>'
              : '<span class="src src--manual">' + esc(t('src_manual')) + '</span>';
      return '<div class="def__row"><span class="def__key">' + esc(f.k) + '</span>' +
        '<span class="def__val">' + esc(f.v) + ' &nbsp;' + src + '</span></div>';
    }).join('');

    return '<div class="panel"><h3 class="h3 panel__title">' + esc(t('applicant')) + '</h3><div class="def">' + appRows + '</div></div>' +
      '<div class="panel mt-4"><h3 class="h3 panel__title">' + esc(t('app_data')) + '</h3><div class="def">' + formRows + '</div></div>';
  }

  function tabDocs(a) {
    if (!(a.docs || []).length) return '<div class="panel"><div class="empty">' + ic('i-paperclip','icon--48') +
      '<div class="empty__title">' + esc(t('no_docs')) + '</div></div></div>';
    var rows = a.docs.map(function (d) {
      return '<div class="doc-row"><span class="doc-row__ico">' + ic('i-doc','') + '</span>' +
        '<span class="doc-row__body"><span class="doc-row__name">' + esc(d.name) + '</span>' +
        '<span class="doc-row__meta">' + d.pages + ' стр. · ' + (d.checked ? 'проверен' : 'не проверен') + '</span></span>' +
        (d.checked ? '<span class="pill pill--active"><span class="dot"></span>Проверен</span>' : '<span class="pill pill--wait"><span class="dot"></span>Не проверен</span>') +
        '<button class="btn btn--ghost btn--s" data-act="noop" aria-label="Просмотреть ' + esc(d.name) + '">' + ic('i-eye','icon--20') + '</button></div>';
    }).join('');
    return '<div class="panel"><h3 class="h3 panel__title">' + esc(t('docs_title')) + '</h3><div class="doc-list">' + rows + '</div></div>';
  }

  function tabInterop(a) {
    var body;
    if (!(a.interop || []).length) {
      body = '<div class="empty">' + ic('i-refresh','icon--48') + '<div class="empty__title">' + esc(t('no_interop')) + '</div></div>';
    } else {
      body = a.interop.map(function (r) {
        var pend = r.status === 'pending';
        return '<div class="interop-item ' + (pend ? 'is-pending' : 'is-received') + '">' +
          '<span class="interop-item__ico">' + ic(pend ? 'i-clock' : 'i-check','') + '</span>' +
          '<span class="interop-item__body"><span class="interop-item__title">' + esc(r.type) + '</span>' +
          '<span class="interop-item__meta">' + esc(r.agency) + ' · ' + (pend ? esc(t('ij_pending')) : (esc(r.value) + ' · ' + fmtAgo(r.at))) + '</span></span>' +
          (pend ? '<span class="spin"></span>' : '<span class="pill pill--active"><span class="dot"></span>' + esc(t('ij_received')) + '</span>') +
        '</div>';
      }).join('');
    }
    return '<div class="panel"><div class="row between" style="align-items:flex-start"><div><h3 class="h3">' + esc(t('interop_title')) + '</h3>' +
      '<div class="small mt-2" style="max-width:52ch">' + esc(t('interop_hint')) + '</div></div>' +
      '<button class="btn btn--secondary btn--s" data-act="act-request">' + ic('i-plus','icon--20') + esc(t('request_info')) + '</button></div>' +
      '<div class="mt-4">' + body + '</div></div>';
  }

  function tabHistory(a) {
    var items = (a.history || []).slice().sort(function (x, y) { return y.at - x.at; });
    var rows = items.map(function (h, idx) {
      return '<div class="trail__item' + (idx === 0 ? '' : ' trail__item--muted') + '">' +
        '<div class="trail__rail"><span class="trail__dot"></span><span class="trail__line"></span></div>' +
        '<div class="trail__body"><div class="trail__action"><b>' + esc(h.actor) + '</b> — ' + esc(h.action) + '</div>' +
        '<div class="trail__meta">' + esc(fmtDateTime(h.at)) + ' · ' + esc(statusLabel(h.status)) + '</div></div></div>';
    }).join('');
    return '<div class="panel"><h3 class="h3 panel__title">' + esc(t('tab_history')) + '</h3><div class="trail">' + rows + '</div>' +
      '<div class="def__source mt-2">' + ic('i-lock','icon--16') + ' Все действия фиксируются в неизменяемом журнале аудита (WORM, §7Б.4)</div></div>';
  }

  function lockedPanel(a) {
    var reason = a.assignee !== 'me' ? t('lp_not_assigned') : t('lp_not_active');
    return '<div class="panel"><div class="banner banner--info">' + ic('i-lock', 'icon--20') +
      '<span class="banner__text">' + esc(reason) + '</span></div></div>';
  }
  function actionsPanel(a) {
    return '<div class="panel"><h3 class="h3 panel__title">Действия</h3><div class="actions-stack">' +
      '<button class="btn btn--primary" data-act="act-decide">' + ic('i-check','icon--20') + esc(t('decide')) + '</button>' +
      '<button class="btn btn--secondary" data-act="act-return">' + ic('i-arrow-ur','icon--20') + esc(t('return_clarify')) + '</button>' +
      '<button class="btn btn--secondary" data-act="act-request">' + ic('i-refresh','icon--20') + esc(t('request_info')) + '</button>' +
    '</div></div>';
  }

  function resultPanel(a) {
    if (a.status === 'denied') {
      return '<div class="panel"><h3 class="h3 panel__title">Результат</h3>' +
        '<div class="banner banner--error">' + ic('i-x','icon--20') + '<span class="banner__text">Оформлен мотивированный отказ.</span></div>' +
        '<div class="def__source mt-4">Основание: ' + esc(a.decision ? a.decision.reason : '—') + '</div></div>';
    }
    return '<div class="panel"><h3 class="h3 panel__title">Результат</h3>' +
      '<div class="banner banner--ok">' + ic('i-sign','icon--20') + '<span class="banner__text"><b>Документ подписан ЭЦП</b><br>Размещён в личном кабинете заявителя</span></div>' +
      resultDoc(a) +
      '<button class="btn btn--secondary mt-4" style="width:100%" data-act="noop">' + ic('i-download','icon--20') + 'Скачать результат</button></div>';
  }

  function resultDoc(a) {
    var s = svc(a);
    return '<div class="mt-4 center"><div class="doc-thumb result-doc" data-act="noop"><div class="doc-page">' +
      '<div class="doc-page__head">' + ic('i-logo','icon--16') + ' Министерство юстиции · eKhizmat</div>' +
      '<div class="doc-page__title">' + esc(s.name) + '</div>' +
      '<div class="doc-page__rows">' +
        '<div class="doc-page__row"><span class="doc-page__key">Заявитель</span><span class="doc-page__val">' + esc(a.applicant.name) + '</span></div>' +
        '<div class="doc-page__row"><span class="doc-page__key">Заявление</span><span class="doc-page__val">' + esc(a.number) + '</span></div>' +
        '<div class="doc-page__row"><span class="doc-page__key">Дата</span><span class="doc-page__val">' + esc(fmtDate(now())) + '</span></div>' +
        '<div class="doc-page__row"><span class="doc-page__key">Решение</span><span class="doc-page__val">Положительное</span></div>' +
      '</div>' +
      '<div class="doc-page__sign">' + ic('i-sign','icon--16') + ' Подписано ЭЦП · ' + esc(a.decision && a.decision.by ? a.decision.by : D.ME.name) + '</div>' +
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
  function slaCaption(a) {
    var rem = a.dueAt - now();
    if (rem <= 0) return '<b style="color:var(--red-ink)">' + esc(t('sla_over')) + ' ' + fmtDur(rem).replace('−','') + '</b>';
    return esc(t('sla_left')) + ' <b>' + fmtDur(rem) + '</b> · до ' + esc(fmtDateTime(a.dueAt));
  }
  function payLabel(a) {
    var p = a.pay || { status: 'Не требуется' };
    var map = { 'Оплачено': 'pill--active', 'Не требуется': 'pill--draft', 'Ожидает оплаты': 'pill--wait', 'Возвращена': 'pill--denied' };
    var txt = p.amount ? p.status + ' · ' + money(p.amount) : p.status;
    return '<span class="pill ' + (map[p.status] || 'pill--draft') + '">' + esc(txt) + '</span>';
  }
  function defRow(k, vHtml) {
    return '<div class="def__row"><span class="def__key">' + esc(k) + '</span><span class="def__val">' + vHtml + '</span></div>';
  }

  /* ---- массовая обработка (§7Б.2) ---- */
  function viewBatch() {
    var h = '<div class="view"><div class="view__head"><div class="view__titles">' +
      '<h1 class="h2">' + esc(t('batch_title')) + '</h1><div class="view__sub">' + esc(t('batch_sub')) + '</div></div></div>';
    // выбор услуги
    var svcCounts = {};
    mineActive().forEach(function (a) { svcCounts[a.svc] = (svcCounts[a.svc] || 0) + 1; });
    h += '<div class="small mt-2" style="margin-bottom:var(--s-3)">' + esc(t('pick_service')) + '</div><div class="chips-row" style="margin-bottom:var(--s-3)">';
    var anySvc = false;
    Object.keys(D.SERVICE).forEach(function (k) {
      var n = svcCounts[k] || 0; if (!n || D.SERVICE[k].critical) return;   // критичные — только «четыре глаза», по одному
      anySvc = true;
      h += '<button class="chip ' + (S.batchSvc === k ? '' : 'chip--locked') + '" data-act="batch-svc" data-svc="' + k + '">' +
        ic(D.SERVICE[k].icon,'icon--16') + esc(D.SERVICE[k].name) + ' · ' + n + '</button>';
    });
    h += '</div>';
    h += '<div class="banner banner--info" style="margin-bottom:var(--s-5)">' + ic('i-shield','icon--20') +
      '<span class="banner__text">' + esc(t('batch_no_critical')) + '</span></div>';
    if (!anySvc) { h += '<div class="panel"><div class="empty">' + ic('i-users','icon--48') +
      '<div class="empty__title">' + esc(t('empty_queue_title')) + '</div>' +
      '<div class="empty__hint">' + esc(t('batch_no_batchable')) + '</div></div></div></div>'; return h; }

    if (!S.batchSvc) { h += '<div class="panel"><div class="empty">' + ic('i-users','icon--48') +
      '<div class="empty__title">' + esc(t('pick_service')) + '</div></div></div></div>'; return h; }

    var list = mineActive().filter(function (a) { return a.svc === S.batchSvc; });
    var selIds = list.filter(function (a) { return S.sel[a.id]; });
    h += '<div class="queue"><div class="q-head">' +
      '<span class="q-checkbox"><input type="checkbox" data-act="sel-all-batch" ' + (selIds.length === list.length && list.length ? 'checked' : '') + ' aria-label="Выбрать все"></span>' +
      '<span>' + esc(t('col_num')) + '</span><span>' + esc(t('col_service')) + '</span><span>' + esc(t('col_applicant')) +
      '</span><span>' + esc(t('col_submitted')) + '</span><span>' + esc(t('col_status')) + '</span><span>' + esc(t('col_sla')) + '</span></div><div class="q-list">';
    list.forEach(function (a) { h += rowQueue(a); });
    h += '</div>';
    if (selIds.length) {
      var bbs = batchStatus(list);
      h += '<div class="batchbar"><span class="batchbar__count">' + esc(t('selected')) + ': <b>' + selIds.length + '</b></span>' +
        '<div class="batchbar__spacer"></div>' +
        '<button class="btn btn--secondary btn--s" data-act="sel-clear">' + esc(t('clear_sel')) + '</button>' +
        '<button class="btn btn--primary btn--s" data-act="batch-decide" ' + (bbs === 'ok' ? '' : 'aria-disabled="true"') + '>' + ic('i-check','icon--20') + esc(t('batch_decide')) + ' ' + selIds.length + '</button></div>';
    }
    h += '</div></div>';
    return h;
  }

  /* ---- журнал межвед-запросов (§7Б.2, §13) ---- */
  function viewInterop() {
    var rows = [];
    S.apps.forEach(function (a) {
      (a.interop || []).forEach(function (r) { rows.push({ a: a, r: r }); });
    });
    rows.sort(function (x, y) { return y.r.at - x.r.at; });
    var body = rows.map(function (x) {
      var pend = x.r.status === 'pending';
      return '<div class="interop-item ' + (pend ? 'is-pending' : 'is-received') + '" data-act="open-card" data-id="' + x.a.id + '" tabindex="0" role="button" aria-label="' + esc(x.r.type + ', ' + x.a.number) + '" style="cursor:pointer">' +
        '<span class="interop-item__ico">' + ic(pend ? 'i-clock' : 'i-check','') + '</span>' +
        '<span class="interop-item__body"><span class="interop-item__title">' + esc(x.r.type) + '</span>' +
        '<span class="interop-item__meta">' + esc(x.r.agency) + ' · ' + esc(x.a.number) + ' · ' + (pend ? esc(t('ij_pending')) : fmtAgo(x.r.at)) + '</span></span>' +
        (pend ? '<span class="spin"></span>' : '<span class="pill pill--active"><span class="dot"></span>' + esc(t('ij_received')) + '</span>') + '</div>';
    }).join('');
    return '<div class="view"><div class="view__head"><div class="view__titles"><h1 class="h2">' + esc(t('ij_title')) + '</h1>' +
      '<div class="view__sub">' + esc(t('ij_sub')) + '</div></div></div>' +
      '<div class="panel">' + (body || '<div class="empty">' + ic('i-refresh','icon--48') + '<div class="empty__title">' + esc(t('no_interop')) + '</div></div>') + '</div></div>';
  }

  /* ---- отчётность по SLA (§7Б.3 → §14) ---- */
  function viewReports() {
    var all = S.apps.length;
    var breachN = S.apps.filter(function (a) { return ACTIVE[a.status] && slaState(a) === 'breach'; }).length;
    var doneN = S.apps.filter(function (a) { return a.status === 'done' || a.status === 'denied'; }).length;
    var h = '<div class="view"><div class="view__head"><div class="view__titles"><h1 class="h2">' + esc(t('rep_title')) + '</h1>' +
      '<div class="view__sub">' + esc(t('rep_sub')) + '</div></div></div>';
    h += '<div class="stat-grid">' +
      statTile('i-inbox', 428, t('rep_total'), '') +
      statTile('i-check', '94%', t('rep_ontime'), 'ok') +
      statTile('i-clock', breachN, t('rep_breach'), breachN ? 'alert' : 'ok') +
      statTile('i-history', '2.4 дн', t('rep_avg'), '') +
      '</div>';
    h += '<div class="panel"><h3 class="h3 panel__title">' + esc(t('rep_spec')) + '</h3><div class="report-table">' +
      '<div class="report-row report-row--head"><span>' + esc(t('rep_spec')) + '</span><span>' + esc(t('rep_col_total')) + '</span>' +
      '<span>' + esc(t('rep_col_breach')) + '</span><span>' + esc(t('rep_col_rate')) + '</span></div>';
    D.REPORT_SPECIALISTS.forEach(function (sp) {
      var rate = Math.round(sp.onTime / sp.total * 100), breach = sp.total - sp.onTime;
      h += '<div class="report-row"><span class="report-row__who"><span class="avatar">' + esc(sp.initials) + '</span>' + esc(sp.name) + '</span>' +
        '<span class="report-row__num">' + sp.total + '</span><span class="report-row__num" style="color:' + (breach ? 'var(--red-ink)' : 'inherit') + '">' + breach + '</span>' +
        '<span class="row g-3"><span class="meter grow"><span class="meter__fill" style="width:' + rate + '%"></span></span><b class="tnum">' + rate + '%</b></span></div>';
    });
    h += '</div></div></div>';
    return h;
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
  function overlayEl() { return document.getElementById('overlay'); }

  function openModal(html, cls) {
    S._modalTrigger = document.activeElement;
    overlayEl().innerHTML = '<div class="overlay" data-act="modal-backdrop"><div class="modal ' + (cls || '') +
      '" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1">' + html + '</div></div>';
    var mod = overlayEl().querySelector('.modal');
    var back = overlayEl().querySelector('.overlay');
    S._modalController = window.EKHDialog?.openExistingDialog(back, { initialFocus:'input:not([type=hidden]),select,textarea,button', trigger:S._modalTrigger }) || null;
    if (!S._modalController) { var focusable = mod.querySelector('input:not([type=hidden]),select,textarea,button'); (focusable || mod).focus(); }
  }
  function closeModal() {
    S.modal = null;
    if (S._modalController) { S._modalController.close(); S._modalController = null; }
    overlayEl().innerHTML = '';
    if (S._modalTrigger && document.body.contains(S._modalTrigger)) { try { S._modalTrigger.focus(); } catch (e) {} }
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
    var types = D.INFO_TYPES.map(function (x) { return '<option>' + esc(x) + '</option>'; }).join('');
    var ags = D.SOURCE_AGENCIES.map(function (x) { return '<option>' + esc(x) + '</option>'; }).join('');
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
        '<div class="field__error" id="ret-err" role="alert" hidden>Укажите, что нужно уточнить.</div></div></div>' +
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
        ? '<span class="pill pill--denied">' + esc(t('dm_deny')) + '</span>'
        : '<span class="pill pill--active"><span class="dot"></span>' + esc(t('dm_approve')) + '</span>';
      openModal(
        '<h3 class="h3 modal__title" id="modal-title">' + esc(t('dm_foureyes_step')) + '</h3>' +
        '<div class="banner banner--warn">' + ic('i-shield','icon--20') + '<span class="banner__text">' + esc(t('dm_foureyes')) + '</span></div>' +
        '<div class="modal__section mt-4">' +
          '<div class="def"><div class="def__row"><span class="def__key">Заявление</span><span class="def__val">' + esc(a.number) + '</span></div>' +
          '<div class="def__row"><span class="def__key">Решение</span><span class="def__val">' + decPill + '</span></div>' +
          '<div class="def__row"><span class="def__key">Первый специалист</span><span class="def__val">' + esc(D.ME.name) + '</span></div></div>' +
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
      '<div class="modal__body small">' + esc(a.number) + ' · ' + esc(s.name) + '</div>' +
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
        '<div class="field__error" id="dm-err" role="alert" hidden>Обоснование обязательно.</div></div></div>' +
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
      '<div class="modal__body small">' + esc(s.name) + ' · ' + ids.length + ' заявл.</div>' +
      '<div class="banner banner--info mt-4">' + ic('i-info','icon--20') + '<span class="banner__text">Одинаковое положительное решение будет применено ко всем выбранным заявлениям. Каждое действие фиксируется в аудите отдельно.</span></div>' +
      '<div class="modal__section mt-4"><div class="field"><label class="field__label" for="batch-reason">' + esc(t('dm_reason')) + '</label>' +
        '<textarea class="field__input" id="batch-reason" placeholder="' + esc(t('dm_reason_ph')) + '">Сведения предоставлены в полном объёме; основания для отказа отсутствуют.</textarea></div></div>' +
      '<div class="modal__foot"><button class="btn btn--ghost" data-act="modal-cancel">' + esc(t('cancel')) + '</button>' +
        '<button class="btn btn--primary" data-act="batch-confirm">' + ic('i-check','icon--20') + esc(t('dm_confirm')) + '</button></div>',
      'modal--batch');
  }

  /* ================================================================== */
  /* Тосты / поповеры                                                   */
  /* ================================================================== */
  function toast(msg, kind) {
    var box = document.getElementById('toasts'); if (!box) return;
    var el = document.createElement('div');
    el.className = 'toast' + (kind ? ' toast--' + kind : '');
    el.setAttribute('role', 'status');
    var icon = kind === 'success' ? 'i-check' : kind === 'error' ? 'i-x' : kind === 'warn' ? 'i-info' : 'i-info';
    el.innerHTML = ic(icon, 'icon--20') + '<span class="grow">' + esc(msg) + '</span>';
    box.appendChild(el);
    setTimeout(function () { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(function () { el.remove(); }, 320); }, 3600);
  }

  function openNotif() {
    S.pop = 'notif';
    var items = S.notifs.slice().sort(function (x, y) { return y.at - x.at; }).map(function (n) {
      return '<button class="notif notif--' + n.kind + '" data-act="notif-go" data-id="' + esc(n.appId) + '" data-nid="' + esc(n.id) + '">' +
        '<span class="notif__ico">' + ic(n.kind === 'breach' ? 'i-clock' : n.kind === 'warn' ? 'i-info' : 'i-check','') + '</span>' +
        '<span class="notif__body"><span class="notif__t"><b>' + esc(n.title) + '</b> — ' + esc(n.text) + '</span>' +
        '<span class="notif__time">' + fmtAgo(n.at) + '</span></span></button>';
    }).join('');
    var nt = document.querySelector('[data-act="notif-open"]'); if (nt) nt.setAttribute('aria-expanded', 'true');
    overlayEl().insertAdjacentHTML('beforeend',
      '<div class="popover notif-pop" id="pop" role="dialog" aria-label="Уведомления">' +
        '<div class="notif-pop__head"><b>Уведомления</b><button class="btn btn--ghost btn--s" data-act="notif-read">Прочитать все</button></div>' +
        '<div class="notif-list">' + (items || '<div class="empty" style="padding:var(--s-8)">' + ic('i-bell','icon--48') + '<div class="empty__title">Нет уведомлений</div></div>') + '</div></div>');
  }
  function openUser() {
    S.pop = 'user';
    var ut = document.querySelector('[data-act="user-open"]'); if (ut) ut.setAttribute('aria-expanded', 'true');
    overlayEl().insertAdjacentHTML('beforeend',
      '<div class="popover menu user-pop" id="pop" role="menu">' +
        '<div class="menu__head"><b>' + esc(D.ME.name) + '</b><span class="small">' + esc(D.ME.role) + ' · ' + esc(D.ME.agency) + '</span></div>' +
        '<hr class="rule">' +
        '<button class="menu__item" data-act="lock">' + ic('i-lock','icon--20') + '<span class="grow">' + esc(t('lock')) + '</span></button>' +
        '<button class="menu__item" data-act="reset">' + ic('i-refresh','icon--20') + '<span class="grow">' + esc(t('reset_demo')) + '</span></button>' +
        '<button class="menu__item" data-act="logout">' + ic('i-out','icon--20') + '<span class="grow">' + esc(t('end_shift')) + '</span></button>' +
      '</div>');
  }
  function closePop() {
    S.pop = null; var p = document.getElementById('pop'); if (p) p.remove();
    ['notif-open', 'user-open'].forEach(function (a) { var b = document.querySelector('[data-act="' + a + '"]'); if (b) b.setAttribute('aria-expanded', 'false'); });
  }
  function closeLayers(all) { closePop(); if (all && S.modal) closeModal(); }

  /* ================================================================== */
  /* Действия / переходы состояний                                      */
  /* ================================================================== */
  function addHistory(a, actor, action, status) { a.history.push({ at: now(), actor: actor, action: action, status: status }); }

  function doRequest() {
    var a = appById(S.modal.appId);
    var type = document.getElementById('rm-type').value, agency = document.getElementById('rm-agency').value;
    a.interop.push({ type: type, agency: agency, status: 'pending', at: now(), value: '' });
    if (ACTIVE[a.status]) a.status = 'info_requested';
    addHistory(a, 'Межвед. сервис', 'Отправлен запрос «' + type + '» в: ' + agency, 'info_requested');
    persist(); closeModal(); toast(t('t_requested'), 'success');
    if (S.view === 'card') renderMain(); refreshChrome();
    // имитация ответа ведомства
    var id = a.id, ln = a.interop.length - 1;
    setTimeout(function () {
      var app = appById(id); if (!app || !app.interop[ln]) return;
      app.interop[ln].status = 'received'; app.interop[ln].at = now();
      app.interop[ln].value = 'Сведения предоставлены';
      if (app.status === 'info_requested') app.status = 'processing';
      addHistory(app, 'Smart Bridge', 'Получен ответ: ' + app.interop[ln].type, 'processing');
      S.notifs.unshift({ id: 'n' + now(), kind: 'info', appId: id, title: 'Получен ответ ведомства', text: app.interop[ln].type + ' · ' + app.number, at: now(), unread: true });
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
    addHistory(a, D.ME.name, 'Возвращено на уточнение: ' + reason, 'clarify');
    persist(); closeModal(); toast(t('t_returned'), 'success');
    S.view = 'queue'; renderMain(); refreshChrome();
  }

  function finalizeApprove(a, reason, second) {
    a.decision = { type: 'approve', reason: reason, by: D.ME.name, second: second || null };
    a.status = 'decided';
    addHistory(a, D.ME.name, 'Принято положительное решение', 'decided');
    if (second) addHistory(a, second, 'Подтверждено вторым специалистом («четыре глаза»)', 'decided');
    a.status = 'done';
    addHistory(a, 'Система', 'Результат сформирован, подписан ЭЦП и выдан заявителю', 'done');
    delete S.sel[a.id];
    persist(); closeModal(); toast(t('t_done'), 'success');
    S.view = 'card'; S.cardId = a.id; S.cardTab = 'history'; renderMain(); refreshChrome();
  }
  function finalizeDeny(a, reason, second) {
    a.decision = { type: 'deny', reason: reason, by: D.ME.name, second: second || null };
    a.status = 'denied';
    addHistory(a, D.ME.name, 'Оформлен мотивированный отказ: ' + reason, 'denied');
    if (second) addHistory(a, second, 'Отказ подтверждён вторым специалистом («четыре глаза»)', 'denied');
    if (a.pay && a.pay.status === 'Оплачено') { a.pay.status = 'Возвращена'; addHistory(a, 'Сервис платежей', 'Инициирован возврат пошлины (Saga)', 'denied'); }
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
      addHistory(a, D.ME.name, 'Пакетное положительное решение', 'decided');
      a.status = 'done';
      addHistory(a, 'Система', 'Результат подписан ЭЦП и выдан', 'done');
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
    var item = document.querySelector('.nav-item[data-view="' + view + '"]'); if (!item) return;
    var c = item.querySelector('.nav-count');
    if (!val) { if (c) c.remove(); return; }
    if (!c) { c = document.createElement('span'); c.className = 'nav-count' + (alert ? ' nav-count--alert' : ''); item.appendChild(c); }
    c.textContent = val;
  }

  /* ================================================================== */
  /* Делегирование событий                                              */
  /* ================================================================== */
  function closest(el, sel) { while (el && el !== document) { if (el.matches && el.matches(sel)) return el; el = el.parentNode; } return null; }

  document.addEventListener('click', function (e) {
    var tgt = closest(e.target, '[data-act]');
    if (!tgt) { if (S.pop) closePop(); return; }
    var act = tgt.getAttribute('data-act');
    var id = tgt.getAttribute('data-id');

    // не закрывать поповер при клике внутри него
    if (S.pop && !closest(e.target, '#pop') && act !== 'notif-open' && act !== 'user-open') closePop();

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
      case 'nav-toggle': document.getElementById('app').classList.toggle('nav-open'); return;
      case 'nav-close': document.getElementById('app').classList.remove('nav-open'); return;

      case 'form-create':
        S._lowCodeBusy = true; dispatchLowCode('RESET'); S._lowCodeBusy = false;
        S.formDraft = {
          serviceName:{ru:'',tg:''}, audience:['person'],
          formFields:[{id:'field-' + Date.now(),label:{ru:t('form_new_field'),tg:t('form_new_field')},type:'text',required:true}]
        };
        S.formReadOnly = false; S.formStep = 'fields'; S.formFieldOpen = S.formDraft.formFields[0].id; S.formPaletteOpen = false; go('form-builder'); return;
      case 'form-open': S.formDraft = null; S.formReadOnly = false; S.formStep = 'fields'; S.formFieldOpen = null; S.formPaletteOpen = false; go('form-builder'); return;
      case 'form-open-static': S.formDraft = staticFormDraft(id); S.formReadOnly = true; S.formStep = 'fields'; S.formFieldOpen = null; S.formPaletteOpen = false; go('form-builder'); return;
      case 'form-back': e.preventDefault(); go('forms'); return;
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
      case 'sel-all-batch': {
        var l = mineActive().filter(function (a) { return a.svc === S.batchSvc; });
        var allS = l.every(function (a) { return S.sel[a.id]; });
        l.forEach(function (a) { S.sel[a.id] = !allS; }); renderMain(); return;
      }
      case 'sel-clear': S.sel = {}; renderMain(); return;
      case 'batch-svc': S.batchSvc = tgt.getAttribute('data-svc'); S.sel = {}; renderMain(); return;

      case 'batch-decide': {
        var scopeList = (S.view === 'batch')
          ? mineActive().filter(function (a) { return a.svc === S.batchSvc; })
          : sortList(applyFilters(currentBase()));
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
      case 'user-open': if (S.pop === 'user') { closePop(); } else { closePop(); openUser(); } return;
      case 'notif-go': {
        var nid = tgt.getAttribute('data-nid'); var nn = S.notifs.filter(function (x) { return x.id === nid; })[0];
        if (nn) nn.unread = false;
        closePop(); openCard(id); refreshChrome(); persist(); return;
      }
      case 'notif-read': S.notifs.forEach(function (n) { n.unread = false; }); closePop(); refreshChrome(); persist(); return;

      case 'lang': S.lang = S.lang === 'ru' ? 'tg' : 'ru'; localStorage.setItem('ekh.preferences.lang', S.lang); document.documentElement.lang = S.lang; renderApp(); return;
      case 'theme': toggleTheme(); return;
      case 'lock': doLock(); return;
      case 'reset': resetData(); S.sel = {}; S.view = 'queue'; renderApp(); toast('Демо-данные восстановлены', 'success'); return;
      case 'logout': S.authed = false; S.loginStep = 1; closeLayers(true); renderLogin(); return;
      case 'unlock': S.locked = false; document.getElementById('lock-root').remove(); document.getElementById('app').classList.remove('is-blurred'); return;
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
      // синхронизировать оба поля поиска, не теряя фокус
      document.querySelectorAll('[data-filter="q"]').forEach(function (el) { if (el !== e.target) el.value = e.target.value; });
      if (S.view !== 'card') renderMainKeepFocus(e.target);
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
  // seg-фильтр SLA (клик по кнопке)
  document.addEventListener('click', function (e) {
    var seg = closest(e.target, '.seg__item[data-filter]');
    if (!seg) return;
    S.filters[seg.getAttribute('data-filter')] = seg.getAttribute('data-val'); renderMain();
  });

  function renderMainKeepFocus(srcInput) {
    // при вводе в тулбаре перерисовываем список, но сохраняем фокус/каретку в верхнем поиске
    var isTop = srcInput.id === 'top-search';
    renderMain();
    var again = isTop ? document.getElementById('top-search') : document.querySelector('.toolbar [data-filter="q"]');
    if (again) { again.focus(); again.setSelectionRange(again.value.length, again.value.length); }
  }

  // Esc закрывает слои; ↑/↓ навигация по очереди опущена ради простоты
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (S.modal) closeModal(); else if (S.pop) closePop();
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
    document.querySelectorAll('.nav-item').forEach(function (b) { b.classList.toggle('is-active', b.getAttribute('data-view') === activeView); });
    var app = document.getElementById('app'); if (app) app.classList.remove('nav-open');
    var main = document.getElementById('main'); if (main) main.scrollTop = 0;
    renderMain();
  }
  function openCard(id) { S.cardId = id; S.view = 'card'; S.cardTab = 'overview'; closeLayers(false); var m = document.getElementById('main'); if (m) m.scrollTop = 0; renderMain(); }

  function toggleTheme() {
    S.theme = S.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', S.theme);
    localStorage.setItem('ekh.preferences.theme', S.theme);
    // обновить иконку кнопки темы
    var b = document.querySelector('[data-act="theme"]'); if (b) b.innerHTML = ic(S.theme === 'dark' ? 'i-sun' : 'i-moon','icon--20');
  }

  function doLock() {
    closeLayers(true);
    S.locked = true;
    var app = document.getElementById('app'); if (app) app.classList.add('is-blurred');
    var lock = document.createElement('div'); lock.id = 'lock-root';
    lock.innerHTML = '<div class="s-locked"><div class="panel s-locked__card">' + ic('i-lock','icon--48') +
      '<h2 class="h2">Рабочее место заблокировано</h2>' +
      '<p class="small">' + esc(D.ME.name) + ' · ' + esc(D.ME.agency) + '</p>' +
      '<input class="field__input" name="password" type="password" autocomplete="current-password" aria-label="Пароль">' +
      '<button class="btn btn--primary" data-act="unlock">Разблокировать</button></div></div>';
    document.getElementById('root').appendChild(lock);
    toast(t('t_locked'), 'success');
  }

  /* ================================================================== */
  /* Запуск                                                             */
  /* ================================================================== */
  function startApp() { S.view = 'queue'; renderApp(); }

  function boot() {
    document.documentElement.setAttribute('data-theme', S.theme);
    document.documentElement.lang = S.lang;
    loadData();
    // авто-разрешение изначально «висящего» межвед-запроса (a4) — демонстрация
    setTimeout(function () {
      var a = appById('a4'); if (!a) return;
      var p = (a.interop || []).filter(function (r) { return r.status === 'pending'; })[0];
      if (!p) return;
      p.status = 'received'; p.at = now(); p.value = 'Сведения из ЕГРЮЛ предоставлены';
      a.status = 'processing'; addHistory(a, 'Smart Bridge', 'Получен ответ ЕГРЮЛ', 'processing');
      S.notifs.unshift({ id: 'n' + now(), kind: 'info', appId: 'a4', title: 'Получен ответ ведомства', text: 'Выписка из ЕГРЮЛ · ' + a.number, at: now(), unread: true });
      persist();
      if (S.authed && (S.view === 'card' && S.cardId === 'a4' || S.view === 'interop' || S.view === 'queue')) renderMain();
      if (S.authed) { refreshChrome(); toast(t('t_received'), 'success'); }
    }, 9000);

    renderLogin();
    setInterval(function () { if (S.authed && !S.locked) tick(); }, 1000);
  }

  subscribeLowCode(function () {
    if (S._lowCodeBusy || !S.authed) return;
    if (S.view === 'forms' || S.view === 'form-builder') renderMain();
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
