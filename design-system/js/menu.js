import { getFocusable } from './focus.js';

export function bindMenu(button, menu) {
  const close = ({ restore = false } = {}) => {
    button.setAttribute('aria-expanded', 'false');
    menu.hidden = true;
    if (restore) button.focus();
  };
  const open = () => {
    button.setAttribute('aria-expanded', 'true');
    menu.hidden = false;
    getFocusable(menu)[0]?.focus();
  };
  button.addEventListener('click', event => {
    event.stopPropagation();
    menu.hidden ? open() : close();
  });
  menu.addEventListener('keydown', event => {
    const items = getFocusable(menu);
    const index = items.indexOf(document.activeElement);
    if (event.key === 'Escape') { event.preventDefault(); close({ restore: true }); }
    if (event.key === 'ArrowDown') { event.preventDefault(); items[(index + 1) % items.length]?.focus(); }
    if (event.key === 'ArrowUp') { event.preventDefault(); items[(index - 1 + items.length) % items.length]?.focus(); }
  });
  addEventListener('click', event => { if (!menu.contains(event.target) && event.target !== button) close(); });
  return { open, close };
}
