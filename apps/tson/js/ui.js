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

/* ---------- тосты (§5.3) ---------- */
export function toast(text, kind = '', ms = 4000) {
  const host = document.getElementById('toasts');
  if (!host) return;

  const el = h('div', { class: `toast${kind ? ` toast--${kind}` : ''}`, role: 'status' },
    icon({ success: 'check', error: 'info', warn: 'info' }[kind] || 'info'),
    h('span', {}, text));

  host.append(el);
  setTimeout(() => el.remove(), ms);
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

  const shared = node.matches?.('.overlay') && node.querySelector('.modal')
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

export function closeLayer(layer = layers[layers.length - 1]) {
  if (!layer) return;
  const i = layers.indexOf(layer);
  if (i === -1) return;

  layers.splice(i, 1);
  layer.shared?.close();
  layer.node.remove();
  layer.onClose?.();
  layer.trigger?.focus?.();   // §9 — фокус возвращается на триггер
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

/* ---------- модал (§5.3) ---------- */
export function modal({ title, body, actions = [], wide = false, onClose = null }) {
  const titleId = `m-${Math.random().toString(36).slice(2, 8)}`;

  const card = h('div', {
    class: `modal${wide ? ' modal--wide' : ''}`,
    role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId,
  },
    h('h2', { class: 'h3 modal__title', id: titleId }, title),
    h('div', { class: 'modal__body' }, body),
    h('div', { class: 'modal__foot' }, actions));

  const overlay = h('div', { class: 'overlay' }, card);

  // Клик по подложке = отмена. Только по самой подложке, не по карточке.
  overlay.addEventListener('mousedown', e => { if (e.target === overlay) closeTopLayer(); });

  return openLayer(overlay, { onClose });
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
