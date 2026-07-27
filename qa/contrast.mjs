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
];
const dark = css.slice(css.indexOf("[data-theme='dark']"));
checks.push(['dark primary', hex('--action', dark), hex('--on-blue')]);
for (const [label, fg, bg] of checks) {
  const value = ratio(fg,bg);
  if (value < 4.5) throw new Error(`${label} contrast ${value.toFixed(2)}:1 is below 4.5:1`);
  console.log(`${label}: ${value.toFixed(2)}:1`);
}
