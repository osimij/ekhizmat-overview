import { applyPreferences, getLang, getTheme, setLang, toggleTheme } from '/design-system/js/preferences.js';
import { bindPlatformShortcuts } from '/design-system/js/platform-switcher.js';

const copy = {
  tg: {
    skip: 'Ба мазмуни асосӣ гузаштан', navLabel: 'Платформаҳои eKhizmat', title: 'Ҳамаи платформаҳои eKhizmat',
    intro: 'Муҳити кориро интихоб кунед. Забон ва мавзӯъ ҳангоми гузариш бо шумо мемонанд.',
    langAria: 'Иваз кардани забон', themeAria: 'Иваз кардани тема',
    citizenKicker: 'Барои аҳолӣ', citizenTitle: 'Портали шаҳрванд',
    tsonKicker: 'Барои маркази хизматрасонӣ', tsonTitle: 'Оператори ЦОН',
    ministryKicker: 'Барои идораҳо', ministryTitle: 'Мутахассиси идора',
    adminKicker: 'Барои соҳиби хизмат', adminTitle: 'Маъмури хизмат', materials: 'Маводи таҳиягар',
    mobileTitle: 'eKhizmat барои телефон', mobileText: 'Намунаи нави барномаи мобилӣ: панҷ бахши асосӣ, ҳуҷҷатҳои рақамӣ ва ҷараёни қадам ба қадами хизмат.',
  },
  ru: {
    skip: 'Перейти к основному содержанию', navLabel: 'Платформы eKhizmat', title: 'Все платформы eKhizmat',
    intro: 'Выберите рабочую среду. Язык и тема сохраняются при переходе между платформами.',
    langAria: 'Сменить язык', themeAria: 'Сменить тему',
    citizenKicker: 'Для жителей', citizenTitle: 'Портал гражданина',
    tsonKicker: 'Для центра обслуживания', tsonTitle: 'Оператор ЦОН',
    ministryKicker: 'Для ведомств', ministryTitle: 'Специалист ведомства',
    adminKicker: 'Для владельца услуги', adminTitle: 'Администратор услуг', materials: 'Материалы разработчика',
    mobileTitle: 'eKhizmat для телефона', mobileText: 'Новая модель мобильного приложения: пять основных разделов, цифровые документы и пошаговый сценарий услуги.',
  },
};

function render() {
  applyPreferences();
  const lang = getLang() === 'ru' ? 'ru' : 'tg';
  document.querySelectorAll('[data-copy]').forEach(element => { element.textContent = copy[lang][element.dataset.copy]; });
  document.querySelectorAll('[data-copy-aria]').forEach(element => { element.setAttribute('aria-label', copy[lang][element.dataset.copyAria]); });
  document.getElementById('langLabel').textContent = lang === 'ru' ? 'Русский' : 'Тоҷикӣ';
  document.title = copy[lang].title;
  const query = new URLSearchParams(location.search);
  document.querySelectorAll('[data-route]').forEach(link => {
    const params = new URLSearchParams();
    if (query.get('present') === '1') params.set('present', '1');
    if (query.get('dev') === '1') params.set('dev', '1');
    if (query.has('lang')) params.set('lang', lang);
    if (query.has('theme')) params.set('theme', getTheme());
    if (params.size) link.search = params.toString();
  });
}

document.getElementById('themeToggle').addEventListener('click', () => { toggleTheme(); render(); });
document.getElementById('langToggle').addEventListener('click', () => { setLang(getLang() === 'ru' ? 'tg' : 'ru'); render(); });
bindPlatformShortcuts();
render();
