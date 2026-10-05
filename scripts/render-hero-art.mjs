// Renders the citizen home hero painting for every screen class with Spatial
// (spatial/dist/renderer.js, the WebGL 2 progressive-blur editor in this repo).
//
//   node scripts/render-hero-art.mjs [--out <dir>] [--png]
//
// Every variant is a crop of the day painting (hero-bg-image.png: the tower on
// its axis at x=1866, transparent sky, pale haze baked into its outer edges) or
// of the same crop of the night painting (Object-dark.png, the same scene drawn
// 1.792× larger), followed by Spatial Directional passes: Blur 35%, Clear
// area 32%, Softness 50%, Fade to color on, Blend width 68% — the trees blur
// progressively from where they start to fade, so each edge is a soft
// transition rather than a cutout turning transparent.
//
// Spatial's fade-to-color mixes the premultiplied pixel toward the edge colour,
// so over a band of that same colour it is exactly an alpha fade. The script
// renders each pass twice — fading to black and to white — and the difference
// is the fade itself; the result keeps real transparency, so the painting
// melts into the band whatever its colour.
import { chromium } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const spatial = join(root, 'spatial/dist');
const arg = name => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };
const out = resolve(arg('--out') ?? join(root, 'apps/citizen/assets'));
mkdirSync(out, { recursive: true });
const writePng = process.argv.includes('--png'); // lossless copies, for inspecting the fades

// Landmarks of the day painting, in its own pixels. Every crop and fade below
// is written in these; the night painting maps onto them by NIGHT.
const AXIS = 1866;    // the tower's centre line
const FOOT = 1712;    // 24px of plaza under the steps at desktop size, well above the baked haze
const SOURCES = [
  { suffix: '', file: 'hero-bg-image.png', scale: 1, dy: 0 },
  { suffix: '-dark', file: 'Object-dark.png', scale: 1.792, dy: -14.3 }, // registered on the tower and ridge
];

// Spatial Directional. Each fade names where the painting
// is still fully opaque and where it has gone fully clear; the focus point and
// arrow are placed so the 68% blend lands exactly between the two.
// The clear area equals the blend's start, so blur and fade begin together and
// the tower is never softened.
const DIRECTIONAL = { mode: 'directional', amount: 35, clear: 32, falloff: 50, edgeEnabled: true, edgeWidth: 68,
  ...JSON.parse(process.env.SPATIAL || '{}') }; // e.g. SPATIAL='{"amount":30}' to try other editor values

// desktop sits beside the copy (1081–1679px), the tower 80px right of the
// midpoint between the catalogue and the container's right edge. At 384px
// tall, 1px there is 4.46 source px: the trees soften and fade from 165px left
// of the tower (just past the platform) and are gone at 335px — before the
// catalogue's edge, so nothing shows behind or between the tiles. On the right
// they run to the painting's edge, where its baked haze — made transparent —
// is the end. desktop-wide (≥1680px) stops inside the viewport, so it lets the
// landscape go from 250px right of the tower. strip (≤1080px) sits under the
// catalogue, centred on the tower, whole to ±1400 source px. Crop widths are
// multiples of 107 so both sizes come out in whole pixels (1712 / 768 = 107 / 48).
const left = { opaque: AXIS - 736, clear: AXIS - 1494 };
const variants = [
  { name: 'home-hero-desktop', crop: [308, 0, 3424, FOOT], heights: [384, 768], fades: [left, { opaque: 3640, clear: 3732 }] },
  { name: 'home-hero-desktop-wide', crop: [308, 0, 3424, FOOT], heights: [384, 768], fades: [left, { opaque: 2981, clear: 3694 }] },
  { name: 'home-hero-strip', crop: [AXIS - 1712, 0, 3424, FOOT], heights: [360, 720],
    fades: [{ opaque: AXIS - 1400, clear: AXIS - 1690 }, { opaque: AXIS + 1400, clear: AXIS + 1690 }] },
];

function chrome() {
  const candidates = [
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    join(homedir(), 'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
  ].filter(Boolean);
  return candidates.find(path => existsSync(path));
}

const types = { '.js': 'text/javascript', '.png': 'image/png', '.html': 'text/html' };
const browser = await chromium.launch({ executablePath: chrome(), args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
const page = await browser.newPage();
await page.route('http://spatial.local/**', route => {
  const path = new URL(route.request().url()).pathname;
  const file = path.startsWith('/source/') ? join(root, path.slice(8)) : path === '/' ? null : join(spatial, path);
  if (!file) return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>render</title>' });
  return route.fulfill({ contentType: types[extname(file)] ?? 'application/octet-stream', body: readFileSync(file) });
});
await page.goto('http://spatial.local/');

for (const source of SOURCES) for (const base of variants) {
  const map = x => x * source.scale;
  const variant = {
    crop: [map(base.crop[0]), map(base.crop[1]) + source.dy, map(base.crop[2]), map(base.crop[3])],
    fades: base.fades.map(fade => ({ opaque: map(fade.opaque), clear: map(fade.clear) })),
  };
  for (const [i, height] of base.heights.entries()) {
    const { webp, png } = await page.evaluate(async ({ file, variant, height, directional, writePng }) => {
      const { BlurRenderer } = await import('/renderer.js');
      globalThis.sources ??= {};
      globalThis.sources[file] ??= await createImageBitmap(await (await fetch(`/source/${file}`)).blob(), { colorSpaceConversion: 'none' });
      const bitmap = globalThis.sources[file];
      const [sx, sy, sw, sh] = variant.crop;
      const width = Math.round(sw * height / sh);
      const canvas2d = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

      // Crop and scale the way Spatial scales an import: high-quality canvas
      // resampling. A crop reaching above the painting gets transparent rows.
      let input = canvas2d(width, height);
      const ctx = input.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, width, height);

      const renderer = new BlurRenderer(document.createElement('canvas'));
      let pixels = null;
      for (const fade of variant.fades) {
        renderer.setImage(input, renderer.maxSize);
        const opaque = (fade.opaque - sx) / sw, clear = (fade.clear - sx) / sw;
        const reach = (clear - opaque) / .65; // 68% blend: the fade runs from 32% to 97% of the arrow
        const focus = opaque - .32 * reach;
        const state = { ...directional, x: focus, y: .5, directionX: focus + reach, directionY: .5 };
        const read = edgeColor => {
          renderer.render({ ...state, edgeColor });
          const data = new Uint8Array(width * height * 4);
          renderer.gl.readPixels(0, 0, width, height, renderer.gl.RGBA, renderer.gl.UNSIGNED_BYTE, data);
          return data; // premultiplied, bottom row first
        };
        const black = read('#000000'), white = read('#FFFFFF');
        pixels = new Uint8ClampedArray(width * height * 4);
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const from = ((height - 1 - y) * width + x) * 4, to = (y * width + x) * 4;
            const fade = (white[from] - black[from] + white[from + 1] - black[from + 1] + white[from + 2] - black[from + 2]) / 3;
            // the two renders round independently: under 2/255 is that rounding, not painting
            const alpha = black[from + 3] - fade < 2 ? 0 : black[from + 3] - fade;
            pixels[to + 3] = Math.round(alpha);
            for (let c = 0; c < 3; c++) pixels[to + c] = alpha > 0 ? Math.round(Math.min(255, black[from + c] * 255 / alpha)) : 0;
          }
        }
        input = canvas2d(width, height);
        input.getContext('2d').putImageData(new ImageData(pixels, width, height), 0, 0);
      }
      renderer.dispose();
      const encode = (type, quality) => new Promise(done => input.toBlob(async blob => {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        let text = ''; for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        done(btoa(text));
      }, type, quality));
      return { webp: await encode('image/webp', .9), png: writePng ? await encode('image/png') : null };
    }, { file: source.file, variant, height, directional: DIRECTIONAL, writePng });
    const file = join(out, `${base.name}${source.suffix}${i ? `@${i + 1}x` : ''}`);
    writeFileSync(`${file}.webp`, Buffer.from(webp, 'base64'));
    if (png) writeFileSync(`${file}.png`, Buffer.from(png, 'base64'));
    console.log(`${file}.webp  ${Math.round(Buffer.from(webp, 'base64').length / 1024)} KB`);
  }
}
await browser.close();
