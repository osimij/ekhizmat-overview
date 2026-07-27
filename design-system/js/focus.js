export function getFocusable(root) {
  return [...root.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )].filter(element => !element.hidden && element.getClientRects().length);
}

export function trapFocus(root, event) {
  if (event.key !== 'Tab') return;
  const focusable = getFocusable(root);
  if (!focusable.length) { event.preventDefault(); root.focus(); return; }
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

export function focusSafely(root, selector) {
  const target = selector ? root.querySelector(selector) : null;
  (target || getFocusable(root)[0] || root).focus({ preventScroll: true });
}
