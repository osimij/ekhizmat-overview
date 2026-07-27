import { applyPreferences, toggleTheme, setLang, getLang } from './preferences.js';
import { mountPlatformSwitcher, bindPlatformShortcuts } from './platform-switcher.js';
import * as dialogs from './dialog.js';
import { toast } from './toast.js';
import { mountDemoTools } from './demo-tools.js';

applyPreferences();
window.EKHDialog = dialogs;
window.EKHToast = toast;

addEventListener('DOMContentLoaded', () => {
  mountPlatformSwitcher();
  mountDemoTools();
  bindPlatformShortcuts();
  document.querySelectorAll('[data-shared-theme-toggle]').forEach(button => button.addEventListener('click', toggleTheme));
  document.querySelectorAll('[data-shared-lang-toggle]').forEach(button => button.addEventListener('click', () => setLang(getLang() === 'ru' ? 'tg' : 'ru')));
});
