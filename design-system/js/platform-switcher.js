import { getLang, getMode } from './preferences.js';
import { bindMenu } from './menu.js';

const platforms = [
  { id: 'citizen', href: '/citizen/', icon: 'user-add', tg: 'Портали шаҳрванд', ru: 'Портал гражданина', detailTg: 'Хизматҳои рақамӣ', detailRu: 'Цифровые услуги', tone: 't-blue' },
  { id: 'tson', href: '/tson/', icon: 'building', tg: 'Оператори ЦОН', ru: 'Оператор ЦОН', detailTg: 'Қабули шаҳрванд', detailRu: 'Приём граждан', tone: 't-teal' },
  { id: 'ministry', href: '/ministry/', icon: 'inbox', tg: 'Мутахассиси идора', ru: 'Специалист ведомства', detailTg: 'Баррасии аризаҳо', detailRu: 'Рассмотрение заявлений', tone: 't-violet' },
  { id: 'admin', href: '/admin/', icon: 'gear', tg: 'Маъмури хизмат', ru: 'Администратор услуг', detailTg: 'Сохтан ва нашр', detailRu: 'Создание и публикация', tone: 't-amber' },
];

function linkWithContext(href) {
  const params = new URLSearchParams();
  if (getMode() === 'present') params.set('present', '1');
  const queryLang = new URLSearchParams(location.search).get('lang');
  const queryTheme = new URLSearchParams(location.search).get('theme');
  if (queryLang) params.set('lang', queryLang);
  if (queryTheme) params.set('theme', queryTheme);
  return `${href}${params.size ? `?${params}` : ''}`;
}

export function createPlatformSwitcher(current) {
  const lang = getLang() === 'ru' ? 'ru' : 'tg';
  const root = document.createElement('div');
  root.className = 'ekh-platforms';
  root.dataset.sharedPlatformSwitcher = '';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'ekh-platforms__button';
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-haspopup', 'menu');
  button.setAttribute('aria-label', lang === 'ru' ? 'Платформы' : 'Платформаҳо');
  button.innerHTML = `<svg aria-hidden="true"><use href="/design-system/assets/icons.svg#i-dots"></use></svg><span>${lang === 'ru' ? 'Платформы' : 'Платформаҳо'}</span>`;
  const menu = document.createElement('div');
  menu.className = 'ekh-platforms__menu';
  menu.setAttribute('role', 'menu');
  menu.hidden = true;
  menu.innerHTML = `<a href="/" role="menuitem"><span class="ekh-platforms__tile t-slate"><svg aria-hidden="true"><use href="/design-system/assets/icons.svg#i-logo"></use></svg></span><span><strong>${lang === 'ru' ? 'Все платформы' : 'Ҳамаи платформаҳо'}</strong><small>eKhizmat</small></span></a>${platforms.map(item => `<a href="${linkWithContext(item.href)}" role="menuitem"${current === item.id ? ' aria-current="page"' : ''}><span class="ekh-platforms__tile ${item.tone}"><svg aria-hidden="true"><use href="/design-system/assets/icons.svg#i-${item.icon}"></use></svg></span><span><strong>${item[lang]}</strong><small>${lang === 'ru' ? item.detailRu : item.detailTg}</small></span></a>`).join('')}`;
  root.append(button, menu);
  bindMenu(button, menu);
  return root;
}

function findHost() {
  const selectors = [
    '[data-platform-switcher-host]',
    '.adm-top .at-right',
    '.bld-top .hdr-acts',
    '.hdr-acts',
    '.hdr-actions',
    '.header-actions',
    '.topbar__actions',
    '#topbar',
    '.topbar',
    '.bp-right',
  ];
  for (const selector of selectors) {
    const host = document.querySelector(selector);
    if (host && !host.closest('[data-dev-only], [data-prototype]')) return host;
  }
  return null;
}

function tryMount(current) {
  if (document.querySelector('[data-shared-platform-switcher]')) return true;
  const host = findHost();
  if (!host) return false;
  host.append(createPlatformSwitcher(current));
  return true;
}

export function mountPlatformSwitcher(current = document.body.dataset.platform) {
  if (!tryMount(current)) {
    const fallback = createPlatformSwitcher(current);
    fallback.classList.add('ekh-platforms--floating');
    document.body.append(fallback);
  }
  const observer = new MutationObserver(() => {
    const switcher = document.querySelector('[data-shared-platform-switcher]');
    const host = findHost();
    if (switcher?.classList.contains('ekh-platforms--floating') && host) {
      switcher.classList.remove('ekh-platforms--floating');
      host.append(switcher);
    } else if (!switcher) {
      tryMount(current);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

export function bindPlatformShortcuts() {
  const map = { '0': '/', '1': '/citizen/', '2': '/tson/', '3': '/ministry/', '4': '/admin/' };
  addEventListener('keydown', event => {
    if (event.metaKey || event.ctrlKey || event.altKey || event.defaultPrevented) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName) || event.target.isContentEditable) return;
    if (map[event.key]) location.href = linkWithContext(map[event.key]);
  });
}
