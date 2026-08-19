/* ============================================================
   ui.js — хелперы: h(), mount(), icon(), toast(), modal(), ring().

   Тут же реализованы обещания §9, которые иначе расползутся по экранам:
   фокус-трап, возврат фокуса на триггер, Esc закрывает верхний слой.
   ============================================================ */
import { t } from './i18n.js';
import { openExistingDialog } from '/design-system/js/dialog.js';

/* ---------- h(): гиперскрипт ----------
   Намеренно без innerHTML для текста: значения полей гражданина попадают в
   DOM через textContent, и XSS через ФИО из реестра невозможен в принципе. */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);

  for (const [k, v] of Object.entries(props || {})) {
    if (v === null || v === undefined || v === false) continue;

    if (k === 'class') el.className = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;          // только для своей разметки
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }

  add(el, children);
  return el;
}

function add(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export function mount(host, ...nodes) {
  host.replaceChildren();
  add(host, nodes);
  return host;
}

/* ---------- иконки (§4.3) ---------- */
const SVG_NS = 'http://www.w3.org/2000/svg';

export function icon(name, { size = 24, label = null, cls = '' } = {}) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', `icon${size !== 24 ? ` icon--${size}` : ''}${cls ? ` ${cls}` : ''}`);

  // §9 — иконка без текста получает aria-label, декоративная скрыта.
  if (label) { svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', label); }
  else svg.setAttribute('aria-hidden', 'true');

  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `/design-system/assets/icons.svg#i-${name}`);
  svg.append(use);
  return svg;
}

/* Face-scan frame: idle is a square + icon; scanning adds a marching dotted
   stroke (design-guide §3 live-scan). Markup is shared so identify and enroll
   cannot fork a second language. SVG uses createElementNS — h() would emit
   HTML-namespace tags that do not stroke. */
export function facescanFrame({ size = 72, showStroke = true } = {}) {
  const stroke = document.createElementNS(SVG_NS, 'svg');
  stroke.setAttribute('class', 'facescan__stroke');
  stroke.setAttribute('viewBox', '0 0 100 100');
  stroke.setAttribute('preserveAspectRatio', 'none');
  stroke.setAttribute('aria-hidden', 'true');
  stroke.setAttribute('focusable', 'false');
  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('x', '1.5');
  rect.setAttribute('y', '1.5');
  rect.setAttribute('width', '97');
  rect.setAttribute('height', '97');
  rect.setAttribute('rx', '8');
  rect.setAttribute('pathLength', '100');
  rect.setAttribute('fill', 'none');
  stroke.append(rect);
  return h('div', { class: 'facescan__frame' }, showStroke ? stroke : null, icon('face', { size }));
}

/* Statuses use the shared Hugeicons sprite without repeating the label in
   dense rows. The label remains available to assistive tech and on hover. */
export function statusIcon(tone, label, { iconName = null } = {}) {
  const names = { success:'check', warning:'clock', danger:'x', info:'info', neutral:'dots' };
  return h('span', { class:`status-icon status-icon--${tone}`, role:'img', 'aria-label':label, title:label },
    icon(iconName || names[tone] || names.neutral, { size:16 }));
}

/* Keeps a table heading at its normal left edge while centering the row value
   on the heading text itself. The hidden ruler uses the localized title, so
   the axis remains correct when Russian and Tajik labels have different widths. */
export function titleAlignedCell(columnTitle, content, cls = '') {
  return h('td', { class: cls },
    h('span', { class: 'table-title-align', 'data-column-title': columnTitle },
      h('span', { class: 'table-title-align__value' }, content)));
}

/* ---------- клавиатурная модель таб-листа (§6, §9) ----------
   Свой контрол обязан приезжать с ПОЛНОЙ клавиатурной моделью, иначе он не
   готов: role="tab" обещает скринридеру стрелки, Home и End, и обещание надо
   выполнять. Хелпер один на все таб-листы АРМ — сегмент выбора способа входа
   на S2 и вкладки скоупов на S5 вели себя по-разному ровно потому, что модель
   писалась (точнее, не писалась) в каждом экране заново.

   Roving tabindex, а не tabindex="0" на всех: Tab должен выносить фокус ИЗ
   группы, а не обходить каждую вкладку по очереди. */
export function makeTablist(container, { onSelect = null, selector = '[role="tab"]' } = {}) {
  const items = () => [...container.querySelectorAll(selector)].filter(el => !el.disabled);

  const focusAt = i => {
    const list = items();
    if (!list.length) return;
    const next = list[(i + list.length) % list.length];
    list.forEach(el => el.setAttribute('tabindex', el === next ? '0' : '-1'));
    next.focus();
    onSelect?.(next);
  };

  const sync = () => {
    const list = items();
    const current = list.findIndex(el => el.getAttribute('aria-selected') === 'true');
    list.forEach((el, i) => el.setAttribute('tabindex', i === (current === -1 ? 0 : current) ? '0' : '-1'));
  };

  container.addEventListener('keydown', e => {
    const list = items();
    const i = list.indexOf(document.activeElement);
    if (i === -1) return;
    const map = {
      ArrowRight: i + 1, ArrowDown: i + 1,
      ArrowLeft: i - 1, ArrowUp: i - 1,
      Home: 0, End: list.length - 1,
    };
    if (!(e.key in map)) return;
    e.preventDefault();
    focusAt(map[e.key]);
  });

  sync();
  return { sync };
}

/* ---------- канонический фильтр (§3 «Filters», §6 «Dropdown filter») ----------
   Видимая подпись с иконкой 16 + нативный select в рамке 38px со стрелкой из
   спрайта и кольцом на :focus-within. Скин — общий `.ekh-filter` из
   design-system/css/patterns.css; здесь только сборка узла, потому что она
   нужна обеим управленческим панелям. Именно этот вид §3 называет стандартом:
   набор значений фильтра растёт, а подписи по-таджикски длиннее русских —
   выпадающий список держит любое их число в постоянной ширине. */
export function filterSelect(id, iconName, label, options, value, onChange, cls = '') {
  return h('label', { class: `ekh-filter${cls ? ` ${cls}` : ''}`, for: id },
    h('span', { class: 'ekh-filter__label' }, icon(iconName, { size: 16 }), label),
    h('span', { class: 'ekh-filter__field' },
      h('select', { id, 'aria-label': label, onChange: e => onChange(e.target.value) },
        ...options.map(([v, name]) => h('option', { value: v, selected: v === value || null }, name))),
      icon('chev-d', { size: 16 })));
}

/* ---------- тосты ----------
   Тоже под общим именем: `.toast` уже занят в components.css нижним
   центральным тостом гражданина, который до `.show` держит `opacity: 0`. АРМ
   переопределял только фон и рамку, а позицию и прозрачность наследовал — то
   есть КАЖДЫЙ тост АРМ («Скопировано», «Черновик сохранён») рисовался
   невидимым внизу экрана. Под `.ekh-toast` действует одно правило. */
export function toast(text, kind = '', ms = 4000) {
  const host = document.getElementById('toasts');
  if (!host) return;

  const el = h('div', { class: `ekh-toast${kind ? ` ekh-toast--${kind}` : ''}`, role: 'status' },
    icon({ success: 'check', error: 'info', warn: 'info' }[kind] || 'info'),
    h('span', {}, text));

  host.append(el);
  // Тост тоже обязан уйти, а не исчезнуть (§8): сначала обратный сдвиг и
  // затухание, и только потом удаление из DOM.
  setTimeout(() => {
    el.classList.add('is-exiting');
    el.setAttribute('aria-hidden', 'true');   // текст уже прочитан, см. closeLayer
    const wait = exitMs(el);
    if (wait > 0) setTimeout(() => el.remove(), wait);
    else el.remove();
  }, ms);
  return el;
}

/* ---------- слои: модал и фокус (§9) ----------
   Стек, а не одиночка: Esc обязан закрывать ВЕРХНИЙ слой, а на S4 поверх
   drawer'а может открыться модал запроса скоупа. */
const layers = [];

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',');

export function openLayer(node, { onClose = null, closeOnEsc = true } = {}) {
  const trigger = document.activeElement;   // §9 — вернём фокус сюда
  const host = document.getElementById('layers');
  host.append(node);

  const shared = node.matches?.('.ekh-dialog-backdrop')
    ? openExistingDialog(node, { trigger, closeOnEscape: false })
    : null;
  const layer = { node, trigger, onClose, closeOnEsc, shared };
  layers.push(layer);

  // Фокус внутрь: первый интерактивный, иначе сам контейнер.
  const first = node.querySelector(FOCUSABLE);
  (first || node).focus?.();
  if (!first) node.setAttribute('tabindex', '-1');

  node.addEventListener('keydown', e => trap(e, node));
  return () => closeLayer(layer);
}

/* Длительность выхода читаем из токена на самом узле: под prefers-reduced-motion
   все --t-* обнуляются в tokens/motion.css, и отдельной проверки медиа-запроса
   здесь не нужно — ноль честно означает «убрать сразу». */
function exitMs(node) {
  const raw = getComputedStyle(node).getPropertyValue('--t-exit').trim();
  return raw.endsWith('ms') ? parseFloat(raw) : raw.endsWith('s') ? parseFloat(raw) * 1000 : 0;
}

/* §8 — «слой уходит тем же путём, каким пришёл; DOM удаляем ТОЛЬКО после
   окончания выхода — слой, исчезающий на середине, читается как сбой».
   Раньше closeLayer удалял узел синхронно: все четыре типа слоёв приезжали с
   анимацией и пропадали мгновенно.

   Фокус возвращаем сразу, а не после анимации: работа оператора не должна
   ждать 160 мс, и это единственная часть закрытия, которую он чувствует. */
export function closeLayer(layer = layers[layers.length - 1]) {
  if (!layer) return;
  const i = layers.indexOf(layer);
  if (i === -1) return;

  layers.splice(i, 1);

  // Идемпотентность: F9 успевает столкнуться с кликом по той же кнопке, и
  // второй вызов не должен ни ронять анимацию, ни возвращать фокус дважды.
  if (layer.closing) return;
  layer.closing = true;

  layer.shared?.close();
  layer.node.classList.add('is-exiting');
  // Уходящий слой обязан исчезнуть для клавиатуры и скринридера СРАЗУ, а не
  // через 160 мс: иначе, пока рисуется выход, в дереве доступности лежат два
  // меню, и «следующий пункт» может оказаться пунктом уже закрытого.
  layer.node.setAttribute('inert', '');
  layer.node.setAttribute('aria-hidden', 'true');
  layer.onClose?.();
  layer.trigger?.focus?.();   // §9 — фокус возвращается на триггер

  const ms = exitMs(layer.node);
  if (ms > 0) setTimeout(() => layer.node.remove(), ms);
  else layer.node.remove();
}

export function closeTopLayer() {
  const top = layers[layers.length - 1];
  if (top?.closeOnEsc !== false) closeLayer(top);
  return !!top;
}

export function hasLayers() { return layers.length > 0; }

/* Фокус-трап: Tab по кругу внутри слоя (§9). */
function trap(e, node) {
  if (e.key !== 'Tab') return;
  const items = [...node.querySelectorAll(FOCUSABLE)].filter(el => el.offsetParent !== null);
  if (!items.length) return;

  const first = items[0], last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

/* ---------- модал ----------
   Классы общие — `.ekh-dialog-backdrop` / `.ekh-dialog` из
   design-system/css/patterns.css. Раньше АРМ рисовал модал под именами
   `.overlay` / `.modal`, а те же имена уже описаны в components.css (компактный
   диалог гражданина: 380px, текст по центру, кнопки стопкой). Два определения
   одного класса на одной странице — это §1 правило 6: подложка брала цвет из
   app.css (--ink 40% — в тёмной теме это БЕЛЫЙ, и модал не затемнял экран, а
   осветлял), а карточка одновременно ехала по своей анимации `pop` и по
   переходу общего диалога, отчего в первые 200 мс была полупрозрачной.
   Под каноническим именем действует ровно одно правило. */
export function modal({ title, body, actions = [], wide = false, className = '', onClose = null }) {
  const titleId = `m-${Math.random().toString(36).slice(2, 8)}`;

  const card = h('div', {
    class: `ekh-dialog${wide ? ' ekh-dialog--wide' : ''}${className ? ` ${className}` : ''}`,
    role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId,
  },
    h('h2', { class: 'modal__title', id: titleId }, title),
    h('div', { class: 'modal__body' }, body),
    h('div', { class: 'modal__foot' }, actions));

  const overlay = h('div', { class: 'ekh-dialog-backdrop' }, card);

  // Клик по подложке = отмена. Только по самой подложке, не по карточке.
  overlay.addEventListener('mousedown', e => { if (e.target === overlay) closeTopLayer(); });

  return openLayer(overlay, { onClose });
}

/* ---------- ящик (drawer) ----------
   Оборачиваем панель в прозрачную подложку: она ничего не красит, а только
   ловит клик мимо ящика. Esc работал и раньше, а мышью закрыть можно было
   только найдя крестик — то есть у одного действия было два разных пути в
   зависимости от того, чем работает оператор (§9: интерфейс отвечает
   одинаково независимо от способа ввода). Подложка непрозрачности не даёт
   намеренно: ящик не блокирует работу, под ним видно тот же экран. */
export function drawerLayer(panel, { onClose = null } = {}) {
  const scrim = h('div', { class: 'drawer-scrim' }, panel);
  scrim.addEventListener('mousedown', e => { if (e.target === scrim) closeTopLayer(); });
  return openLayer(scrim, { onClose });
}

/* Подтверждение разрушающего действия (§P5: «разрушающие действия —
   только через подтверждение»). */
export function confirmDanger({ title, body, confirmText, onConfirm }) {
  let close;
  const cancel = h('button', { class: 'btn btn--secondary', onClick: () => close() }, t('common.cancel'));
  const ok = h('button', {
    class: 'btn btn--danger',
    onClick: () => { close(); onConfirm(); },
  }, confirmText);

  close = modal({ title, body, actions: [cancel, ok] });
  return close;
}

/* ---------- таймер-кольцо (§5.3) ---------- */
const R = 54, C = 2 * Math.PI * R;

export function ring({ size = '', label = '00:00', frac = 1 } = {}) {
  const bar = document.createElementNS(SVG_NS, 'circle');
  for (const [k, v] of Object.entries({
    class: 'ring__bar', cx: 60, cy: 60, r: R,
    'stroke-dasharray': C.toFixed(2),
    'stroke-dashoffset': (C * (1 - frac)).toFixed(2),
  })) bar.setAttribute(k, v);

  const track = document.createElementNS(SVG_NS, 'circle');
  for (const [k, v] of Object.entries({ class: 'ring__track', cx: 60, cy: 60, r: R })) {
    track.setAttribute(k, v);
  }

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'ring__svg');
  svg.setAttribute('viewBox', '0 0 120 120');
  svg.setAttribute('aria-hidden', 'true');
  svg.append(track, bar);

  // §9 — role="timer" + aria-live="off": объявляем только на порогах,
  // иначе скринридер тараторит каждую секунду.
  const value = h('span', { class: 'ring__value', role: 'timer', 'aria-live': 'off' }, label);
  const root = h('div', { class: `ring${size ? ` ring--${size}` : ''}` });
  root.append(svg, value);

  root.update = (frac2, label2, tone) => {
    bar.setAttribute('stroke-dashoffset', (C * (1 - frac2)).toFixed(2));
    value.textContent = label2;
    root.className = `ring${size ? ` ring--${size}` : ''}${tone ? ` ring--${tone}` : ''}`;
  };
  return root;
}

/* ---------- формат ---------- */
export const mmss = ms => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

/* Маски вне рабочей зоны (§10): ФИО «А***в Ф.», ИНН «••• ••6 789». */
export const maskName = full => {
  if (!full) return '';
  const [last = '', first = ''] = full.split(/\s+/);
  const short = last.length > 2 ? `${last[0]}***${last.slice(-1)}` : last;
  return `${short}${first ? ` ${first[0]}.` : ''}`;
};

export const maskInn = inn => {
  const d = String(inn || '').replace(/\D/g, '');
  return d.length < 4 ? '•••' : `••• ••${d.slice(-4, -3)} ${d.slice(-3)}`;
};
