/* ============================================================
   qr.js — demo QR drawing shared by every platform.

   The prototype has no QR encoder: it draws a QR-shaped matrix (three finder
   patterns, timing lines, seeded noise) so a code *looks* like the one the
   backend will issue and changes visibly when it is reissued. Same seed, same
   picture — a citizen document keeps its code, a ЦОН sign-in code changes on
   every refresh because its seed is the server challenge.

   Promoted from the citizen wallet (design-guide rule 21) when the ЦОН
   identity gate needed the same drawing. Modules paint with currentColor, so
   the host sets `color: var(--doc-ink)` on paper that stays white in both
   themes — a scanner needs that contrast, not the theme.
   ============================================================ */

const SVG_NS = 'http://www.w3.org/2000/svg';

function seeded(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return (h >>> 0) / 4294967296; };
}

/* Fills an existing <svg> (viewBox 0 0 size size) with modules. */
export function renderQr(svg, seed, size = 29) {
  const N = size, rnd = seeded(String(seed)), m = [];
  for (let y = 0; y < N; y++) m[y] = new Array(N).fill(0);

  const finder = (fx, fy) => {
    for (let y = -1; y <= 7; y++) for (let x = -1; x <= 7; x++) {
      const X = fx + x, Y = fy + y;
      if (X < 0 || Y < 0 || X >= N || Y >= N) continue;
      const ring = x >= 0 && x <= 6 && y >= 0 && y <= 6
        && (x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4));
      m[Y][X] = ring ? 1 : 0;
    }
  };

  // Reserved zones first, so noise never enters a finder pattern.
  const reserved = (x, y) => (x <= 7 && y <= 7) || (x >= N - 8 && y <= 7) || (x <= 7 && y >= N - 8);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (reserved(x, y)) continue;
    if (x === 6 || y === 6) m[y][x] = (x + y) % 2 === 0 ? 1 : 0;   // timing
    else m[y][x] = rnd() < 0.46 ? 1 : 0;
  }
  finder(0, 0); finder(N - 7, 0); finder(0, N - 7);

  let rects = '';
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (m[y][x]) rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="currentColor"/>`;
  }
  svg.innerHTML = rects;
  return svg;
}

/* A new <svg> holding the code — for hosts that build their DOM in JS. */
export function qrSvg(seed, { size = 29, label = '' } = {}) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('shape-rendering', 'crispEdges');
  if (label) {
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', label);
  } else {
    svg.setAttribute('aria-hidden', 'true');
  }
  return renderQr(svg, seed, size);
}
