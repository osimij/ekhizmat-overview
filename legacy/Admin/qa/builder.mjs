// Screenshot + drive harness for the STANDALONE builder (Конструктор) console.
// Usage: node qa/builder.mjs [outdir] [baseUrl]
//   - serve the bundle root first, e.g.:  python3 -m http.server 8803 --directory .
//   - captures index/services/new-service/builder × {light,dark} × {desktop,mobile}
//   - drives builder.html: switch stages, add a field from the palette, toggle
//     paid cost, publish — and screenshots each beat
//   - reports any pageerror / console errors per page
// Requires Playwright (npm i -D playwright). Run from the BUILDER/ folder.
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const outdir = process.argv[2] || 'qa/shots';
const base   = process.argv[3] || 'http://localhost:8803/';
const PAGES  = ['index','services','new-service','builder'];
const themes = ['light','dark'];
const vps = [{ name:'d', width:1440, height:900 }, { name:'m', width:390, height:844 }];
mkdirSync(outdir, { recursive: true });

const browser = await chromium.launch();
let shots = 0;
const allErrs = {};

// ---- static set: every page × theme × viewport ----
for (const theme of themes) {
  for (const vp of vps) {
    const ctx = await browser.newContext({ viewport:{ width:vp.width, height:vp.height }, deviceScaleFactor: 2 });
    await ctx.addInitScript((t) => { try { localStorage.setItem('ekh-theme', t); } catch(e){} }, theme);
    await ctx.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => document.body.classList.add('shot')); });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    for (const p of PAGES) {
      try {
        await page.goto(base + p + '.html', { waitUntil:'networkidle', timeout: 15000 });
        await page.waitForTimeout(300);
        await page.mouse.move(0, 0);
        await page.screenshot({ path: `${outdir}/${p}-${theme}-${vp.name}.png`, fullPage: true });
        shots++;
      } catch (e) { console.log('skip', p, theme, vp.name, '—', String(e).split('\n')[0]); }
    }
    if (errs.length) allErrs[`${theme}-${vp.name}`] = [...new Set(errs)].slice(0,6);
    await ctx.close();
  }
}

// ---- driven set: walk the builder (light desktop) ----
{
  const ctx = await browser.newContext({ viewport:{ width:1440, height:900 }, deviceScaleFactor: 2 });
  await ctx.addInitScript((t) => { try { localStorage.setItem('ekh-theme', t); } catch(e){} }, 'light');
  await ctx.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => document.body.classList.add('shot')); });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const shot = async (n) => { await page.mouse.move(0,0); await page.screenshot({ path:`${outdir}/flow-${n}.png`, fullPage:true }); shots++; };
  try {
    await page.goto(base + 'builder.html', { waitUntil:'networkidle', timeout:15000 });
    await page.waitForTimeout(300); await shot('1-fields');
    // open the palette and add a Date field → it appears live in the preview
    await page.click('#addField'); await page.waitForTimeout(250); await shot('2-palette');
    await page.click('.ptile[data-add="date"]'); await page.waitForTimeout(250); await shot('3-field-added');
    // edit the new field's label live
    await page.fill('.fb-item.open [data-cfg="label"]', 'Санаи маросим'); await page.waitForTimeout(200); await shot('4-label-live');
    // switch to delivery stage and make it paid
    await page.click('.stg[data-tab="delivery"]'); await page.waitForTimeout(250);
    await page.click('#dCost label:has(input[value="paid"])'); await page.waitForTimeout(200); await shot('5-paid');
    // back-stage: routing preview = citizen transparency
    await page.click('.stg[data-tab="route"]'); await page.waitForTimeout(250); await shot('6-route');
    // publish
    await page.click('#publishBtn'); await page.waitForTimeout(250); await shot('7-publish');
    await page.click('#pubDo'); await page.waitForTimeout(300); await shot('8-published');
  } catch (e) { console.log('flow error —', String(e).split('\n')[0]); }
  if (errs.length) allErrs['flow'] = [...new Set(errs)].slice(0,6);
  await ctx.close();
}

await browser.close();
console.log('\ndone →', outdir, '(', shots, 'shots )');
if (Object.keys(allErrs).length) { console.log('JS ERRORS:'); for (const k in allErrs) console.log(' ', k, '::', allErrs[k]); }
else console.log('no JS errors');
