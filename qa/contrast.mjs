import { readFile } from 'node:fs/promises';

const css = await readFile('design-system/tokens/color.css', 'utf8');
function hex(name, scope = css) {
  const value = scope.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, 'i'))?.[1];
  if (!value) throw new Error(`Missing literal token ${name}`);
  return value;
}
function rgb(value) { const n = Number.parseInt(value.slice(1), 16); return [(n>>16)&255,(n>>8)&255,n&255]; }
function lum(value) { return rgb(value).map(v=>{v/=255; return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0); }
function ratio(a,b) { const x=lum(a),y=lum(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); }

const checks = [
  ['light primary', hex('--action'), hex('--on-blue')],
  ['light body', hex('--ink'), hex('--bg')],
  ['light secondary', hex('--ink-2'), hex('--panel')],
  // Text on a state tint. These pairs are why --*-ink exists next to the raw
  // state color: the raw one paints glyphs and strokes, the ink one paints
  // text and must clear 4.5:1 on its own tint in both themes.
  ['light green ink on tint', hex('--green-ink'), hex('--green-tint')],
  ['light amber ink on tint', hex('--amber-ink'), hex('--amber-tint')],
  ['light red ink on tint', hex('--red-ink'), hex('--red-tint')],
  ['light blue ink on tint', hex('--blue-ink'), hex('--blue-tint')],
];
// Wallet document identity colours (design-guide §3 / WP8): each card carries
// --pure-white text, so every document hue must clear 4.5:1 in both themes.
const docTokens = ['--doc-passport', '--doc-license', '--doc-tax', '--doc-birth', '--doc-temp'];
for (const token of docTokens) checks.push([`light ${token} on white text`, hex(token), hex('--pure-white')]);

const dark = css.slice(css.indexOf("[data-theme='dark']"));
for (const token of docTokens) checks.push([`dark ${token} on white text`, hex(token, dark), hex('--pure-white')]);
checks.push(['dark primary', hex('--action', dark), hex('--on-blue')]);
checks.push(['dark green ink on tint', hex('--green-ink', dark), hex('--green-tint', dark)]);
checks.push(['dark amber ink on tint', hex('--amber-ink', dark), hex('--amber-tint', dark)]);
checks.push(['dark red ink on tint', hex('--red-ink', dark), hex('--red-tint', dark)]);
checks.push(['dark blue ink on tint', hex('--blue-ink', dark), hex('--blue-tint', dark)]);
for (const [label, fg, bg] of checks) {
  const value = ratio(fg,bg);
  if (value < 4.5) throw new Error(`${label} contrast ${value.toFixed(2)}:1 is below 4.5:1`);
  console.log(`${label}: ${value.toFixed(2)}:1`);
}
