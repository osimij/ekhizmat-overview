import { applyPreferences, getLang, getTheme, setLang, toggleTheme } from '/design-system/js/preferences.js';
import { bindPlatformShortcuts } from '/design-system/js/platform-switcher.js';

const copy = {
  tg: {
    skip: 'Ба мазмуни асосӣ гузаштан', eyebrow: 'Як экосистема · чор муҳит', title: 'Платформаҳои eKhizmat',
    intro: 'Муҳити кориро интихоб кунед. Забон ва мавзӯъ ҳангоми гузариш бо шумо мемонанд.',
    citizenKicker: 'Барои аҳолӣ', citizenTitle: 'Портали шаҳрванд', citizenText: 'Хизматҳои давлатӣ, аризаҳо ва ҳамёни ҳуҷҷатҳо дар як ҷо.',
    tsonKicker: 'Барои маркази хизматрасонӣ', tsonTitle: 'Оператори ЦОН', tsonText: 'Қабули бехатар, розигӣ ва иҷрои хизмат дар назди шаҳрванд.',
    ministryKicker: 'Барои идораҳо', ministryTitle: 'Мутахассиси идора', ministryText: 'Навбат, муҳлати SLA, санҷиш ва қабули қарор аз рӯи аризаҳо.',
    adminKicker: 'Барои соҳиби хизмат', adminTitle: 'Маъмури хизмат', adminText: 'Сохтан, санҷидан, мувофиқа ва нашр кардани хизматҳои рақамӣ.', materials: 'Маводи таҳиягар',
    mobileKicker: 'Консепсияи интерактивӣ', mobileTitle: 'eKhizmat барои телефон', mobileText: 'Намунаи нави барномаи мобилӣ: панҷ бахши асосӣ, ҳуҷҷатҳои рақамӣ ва ҷараёни қадам ба қадами хизмат.', mobileCta: 'Санҷидани прототип',
  },
  ru: {
    skip: 'Перейти к основному содержанию', eyebrow: 'Одна экосистема · четыре среды', title: 'Платформы eKhizmat',
    intro: 'Выберите рабочую среду. Язык и тема сохраняются при переходе между платформами.',
    citizenKicker: 'Для жителей', citizenTitle: 'Портал гражданина', citizenText: 'Государственные услуги, заявления и кошелёк документов в одном месте.',
    tsonKicker: 'Для центра обслуживания', tsonTitle: 'Оператор ЦОН', tsonText: 'Безопасный приём, согласие и оказание услуги вместе с гражданином.',
    ministryKicker: 'Для ведомств', ministryTitle: 'Специалист ведомства', ministryText: 'Очередь, сроки SLA, проверка и принятие решений по заявлениям.',
    adminKicker: 'Для владельца услуги', adminTitle: 'Администратор услуг', adminText: 'Создание, проверка, согласование и публикация цифровых услуг.', materials: 'Материалы разработчика',
    mobileKicker: 'Интерактивная концепция', mobileTitle: 'eKhizmat для телефона', mobileText: 'Новая модель мобильного приложения: пять основных разделов, цифровые документы и пошаговый сценарий услуги.', mobileCta: 'Попробовать прототип',
  },
};

function render() {
  applyPreferences();
  const lang = getLang() === 'ru' ? 'ru' : 'tg';
  document.querySelectorAll('[data-copy]').forEach(element => { element.textContent = copy[lang][element.dataset.copy]; });
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
