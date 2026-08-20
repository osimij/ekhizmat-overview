/* Login paints 70px / 28px through `transform: scale(--login-scale)`.
   Transform does not shrink the layout box, so the wrapper is sized to the
   painted result. Shared by the workstation lock and the citizen sign-in
   dialog so the third copy cannot drift (design-guide §1 rule 9, rule 21). */

export function presentAtLoginScale(wrap, body) {
  if (!wrap || !body) return;
  const scale = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--login-scale'),
  ) || 0.8;
  wrap.style.width = `${body.offsetWidth * scale}px`;
  wrap.style.height = `${body.offsetHeight * scale}px`;
}
