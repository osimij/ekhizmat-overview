/* Unified sidebar (.ekh-side) behavior: collapse persistence, aria sync and
   animation gating. The markup/geometry contract lives in css/sidebar.css.

   initSidebar({ shell, key, labels }) —
   - shell: the element (or selector) that receives `side-collapsed`; pass a
     stable node (admin uses <html> so an inline head script can restore the
     state before first paint on every page of the MPA);
   - key: localStorage key for persistence;
   - labels: (collapsed) => ({ action }) — the toggle's aria-label/title in
     the platform's current language; re-run via handle.sync() on language
     change.
   The width tween is armed by adding `ekh-side-anim` on the shell only when
   the user actually toggles, so page loads never animate.

   SPA platforms that rebuild their shell each render (ministry) keep their
   own state wiring and only follow the CSS contract: render `side-collapsed`
   into the shell class, add `ekh-side-anim` before flipping it. */

function read(key){ try { return localStorage.getItem(key) === '1'; } catch (error) { return false; } }
function write(key, value){ try { localStorage.setItem(key, value ? '1' : '0'); } catch (error) {} }

export function initSidebar(options){
  const shell = typeof options.shell === 'string' ? document.querySelector(options.shell) : options.shell;
  if (!shell) return null;

  function sync(collapsed){
    shell.classList.toggle('side-collapsed', collapsed);
    const text = options.labels ? options.labels(collapsed) : null;
    document.querySelectorAll('[data-ekh-side-toggle]').forEach(button => {
      button.setAttribute('aria-expanded', String(!collapsed));
      if (text && text.action) { button.setAttribute('aria-label', text.action); button.title = text.action; }
    });
  }

  sync(read(options.key));
  document.addEventListener('click', event => {
    const toggle = event.target.closest('[data-ekh-side-toggle]');
    if (!toggle) return;
    shell.classList.add('ekh-side-anim');
    const collapsed = !shell.classList.contains('side-collapsed');
    write(options.key, collapsed);
    sync(collapsed);
  });

  return {
    sync(){ sync(read(options.key)); },
    set(collapsed){ write(options.key, collapsed); sync(collapsed); },
  };
}

if (typeof window !== 'undefined') window.ekhSide = { initSidebar };
