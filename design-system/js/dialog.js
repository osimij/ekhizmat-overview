import { focusSafely, trapFocus } from './focus.js';

const stack = [];

function setBackgroundInert(active) {
  [...document.body.children].forEach(child => {
    if (child.classList.contains('ekh-dialog-backdrop') || child.classList.contains('ekh-toast-region') || child.querySelector?.('.ekh-dialog-backdrop')) return;
    if (active) child.setAttribute('inert', '');
    else child.removeAttribute('inert');
  });
}

function lockScroll() {
  const width = innerWidth - document.documentElement.clientWidth;
  document.documentElement.style.setProperty('--ekh-scrollbar', `${width}px`);
  document.body.classList.add('has-ekh-modal');
}

function unlockScroll() {
  document.body.classList.remove('has-ekh-modal');
  document.documentElement.style.removeProperty('--ekh-scrollbar');
}

export function openDialog(options = {}) {
  const trigger = options.trigger || document.activeElement;
  const backdrop = document.createElement('div');
  backdrop.className = 'ekh-dialog-backdrop';
  const dialog = document.createElement('section');
  dialog.className = `ekh-dialog${options.wide ? ' ekh-dialog--wide' : ''}`;
  dialog.tabIndex = -1;
  dialog.setAttribute('role', options.alert ? 'alertdialog' : 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  const id = `ekh-dialog-${crypto.randomUUID()}`;
  dialog.setAttribute('aria-labelledby', `${id}-title`);
  if (options.description) dialog.setAttribute('aria-describedby', `${id}-description`);
  dialog.innerHTML = `
    <header class="ekh-dialog__head">
      <div>
        <h2 id="${id}-title">${options.title || ''}</h2>
        ${options.description ? `<p id="${id}-description">${options.description}</p>` : ''}
      </div>
      <button class="ekh-dialog__close" type="button" data-dialog-close aria-label="${options.closeLabel || 'Пӯшидан'}">
        <svg aria-hidden="true"><use href="/design-system/assets/icons.svg#i-x"></use></svg>
      </button>
    </header>
    <div class="ekh-dialog__body"></div>
    ${options.actions ? '<footer class="ekh-dialog__actions"></footer>' : ''}`;
  const body = dialog.querySelector('.ekh-dialog__body');
  if (options.content instanceof Node) body.append(options.content);
  else body.innerHTML = options.content || '';
  if (options.actions) {
    const actions = dialog.querySelector('.ekh-dialog__actions');
    for (const action of options.actions) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `btn ${action.className || 'btn-sec'}`;
      button.textContent = action.label;
      if (action.autofocus) button.dataset.dialogInitial = '';
      button.addEventListener('click', async () => {
        const result = await action.onClick?.({ close });
        if (result !== false && action.close !== false) close(action.value);
      });
      actions.append(button);
    }
  }
  backdrop.append(dialog);
  document.body.append(backdrop);
  stack.push({ backdrop, dialog, trigger });
  lockScroll();
  setBackgroundInert(true);

  function close(value) {
    if (!backdrop.isConnected) return;
    backdrop.classList.remove('is-open');
    const finish = () => {
      backdrop.remove();
      const index = stack.findIndex(entry => entry.backdrop === backdrop);
      if (index >= 0) stack.splice(index, 1);
      if (!stack.length) { unlockScroll(); setBackgroundInert(false); }
      else setBackgroundInert(true);
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
      options.onClose?.(value);
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) finish();
    else setTimeout(finish, 160);
  }

  dialog.querySelector('[data-dialog-close]').addEventListener('click', () => close());
  backdrop.addEventListener('mousedown', event => {
    if (event.target === backdrop && options.closeOnBackdrop !== false) close();
  });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Escape' && options.closeOnEscape !== false) { event.preventDefault(); close(); }
    trapFocus(dialog, event);
  });
  requestAnimationFrame(() => {
    backdrop.classList.add('is-open');
    focusSafely(dialog, options.initialFocus || '[data-dialog-initial]');
  });
  return { close, element: dialog };
}

export function confirmDialog({ title, description, confirmText, cancelText, danger = false, onConfirm, trigger }) {
  return openDialog({
    title,
    description,
    alert: danger,
    trigger,
    actions: [
      { label: cancelText || 'Бекор кардан', className: 'btn-sec' },
      { label: confirmText || 'Тасдиқ', className: danger ? 'btn-danger' : 'btn-pri', autofocus: !danger, onClick: onConfirm },
    ],
  });
}

export function closeTopDialog() { stack.at(-1)?.backdrop.querySelector('[data-dialog-close]')?.click(); }

const legacyDialogs = new WeakMap();

export function openExistingDialog(backdrop, { initialFocus, trigger = document.activeElement, closeOnBackdrop = true, closeOnEscape = true } = {}) {
  if (legacyDialogs.has(backdrop)) return legacyDialogs.get(backdrop);
  const dialog = backdrop.querySelector('.modal, [role="document"]') || backdrop.firstElementChild;
  backdrop.classList.add('ekh-dialog-backdrop', 'open');
  dialog?.classList.add('ekh-dialog');
  backdrop.setAttribute('aria-modal', 'true');
  if (!backdrop.getAttribute('role')) backdrop.setAttribute('role', 'dialog');
  stack.push({ backdrop, dialog, trigger });
  lockScroll();
  setBackgroundInert(true);
  const onKey = event => {
    if (event.key === 'Escape' && closeOnEscape) { event.preventDefault(); close(); }
    if (dialog) trapFocus(dialog, event);
  };
  const onPointer = event => { if (event.target === backdrop && closeOnBackdrop) close(); };
  function close() {
    backdrop.classList.remove('is-open', 'open', 'ekh-dialog-backdrop');
    dialog?.classList.remove('ekh-dialog');
    backdrop.removeEventListener('keydown', onKey);
    backdrop.removeEventListener('mousedown', onPointer);
    legacyDialogs.delete(backdrop);
    const index = stack.findIndex(entry => entry.backdrop === backdrop);
    if (index >= 0) stack.splice(index, 1);
    if (!stack.length) { unlockScroll(); setBackgroundInert(false); }
    if (trigger?.isConnected && !trigger.hidden) trigger.focus({ preventScroll: true });
  }
  backdrop.addEventListener('keydown', onKey);
  backdrop.addEventListener('mousedown', onPointer);
  requestAnimationFrame(() => {
    backdrop.classList.add('is-open');
    if (dialog) focusSafely(dialog, initialFocus);
  });
  const controller = { close, element: dialog };
  legacyDialogs.set(backdrop, controller);
  return controller;
}

export function closeExistingDialog(backdrop) { legacyDialogs.get(backdrop)?.close(); }
