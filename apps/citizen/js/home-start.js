/* ============================================================
   Home «three steps» band (signed out): the steps are a vertical tablist,
   the chosen one opens its folder with the step's words and a cropped piece
   of the real interface.

   The first look: when the folder first comes into view, it turns through
   the three steps once, a line filling under the chosen tab as it waits
   (the dwell is the bar's CSS animation; its end moves on), and settles on
   step one, where the sign-in is. It shows that the steps open, then it is
   the citizen's: any click or key inside the band ends it for good. It holds
   still while keyboard focus is inside and while the band is out of view, and never starts under reduced motion. Nothing turns by itself
   after that first round (the news band's rule).
   ============================================================ */

export function initHomeStart({ reduceMotion }){
  const root = document.getElementById("start");
  if (!root) return;
  const tabs = [...root.querySelectorAll('[role="tab"]')];
  const panels = tabs.map(tab => document.getElementById(tab.getAttribute("aria-controls")));
  let current = tabs.findIndex(tab => tab.getAttribute("aria-selected") === "true");
  let touring = false, seen = 0;

  function select(index, { focus = false } = {}){
    current = (index + tabs.length) % tabs.length;
    tabs.forEach((tab, i) => {
      const on = i === current;
      tab.setAttribute("aria-selected", String(on));
      tab.tabIndex = on ? 0 : -1;
      panels[i].hidden = !on;
    });
    if (focus) tabs[current].focus();
  }

  function endTour(){
    touring = false;
    root.classList.remove("is-touring", "is-paused");
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => { endTour(); select(i); });
    tab.addEventListener("keydown", event => {
      const step = { ArrowDown:1, ArrowRight:1, ArrowUp:-1, ArrowLeft:-1 }[event.key];
      const next = step ? current + step : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : null;
      if (next === null) return;
      event.preventDefault();
      endTour();
      select(next, { focus:true });
    });
    /* the dwell ran out on this tab: open the next one, or end the round on step one */
    tab.querySelector(".start-tab__bar").addEventListener("animationend", () => {
      if (!touring || i !== current) return;
      seen += 1;
      if (seen >= tabs.length){ select(0); endTour(); }
      else select(current + 1);
    });
  });

  /* a click anywhere in the band (Sign in, a link, a tab) hands it to the citizen */
  root.addEventListener("click", endTour);

  if (reduceMotion() || !("IntersectionObserver" in window)) return;
  let started = false;
  const folder = root.querySelector(".start-folder");
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !started){
      started = true;
      touring = true;
      seen = 0;
      select(0);
      root.classList.add("is-touring");
    }
    if (touring) root.classList.toggle("is-paused", !entry.isIntersecting);
  }, { threshold:.6 }).observe(folder);
}
