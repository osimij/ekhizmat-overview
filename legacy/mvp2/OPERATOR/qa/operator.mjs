// Screenshot + drive harness for the STANDALONE operator (service-window) console.
// Usage: node qa/operator.mjs [outdir] [baseUrl]
//   - serve the bundle root first, e.g.:  python3 -m http.server 8802 --directory .
//   - captures op-login/op-queue/op-verify × {light,dark} × {desktop,mobile}
//   - drives op-verify through identity checks → consent → e-sign → handover
//   - reports any pageerror / console errors per page
// Requires Playwright (npm i -D playwright). Run from the OPERATOR/ folder.
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const outdir = process.argv[2] || 'qa/shots';
const base   = process.argv[3] || 'http://localhost:8802/';
const PAGES  = ['op-login','op-queue','op-verify'];
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

// ---- driven set: walk the operator session (light desktop) ----
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
    await page.goto(base + 'op-verify.html', { waitUntil:'networkidle', timeout:15000 });
    await page.waitForTimeout(300);
    // step 1: scan → record + doc check; face; sms via OTP modal
    await page.click('#scanBtn'); await page.waitForTimeout(250); await shot('1-scanned');
    await page.click('#faceBtn'); await page.waitForTimeout(150);
    await page.click('#smsBtn');  await page.waitForTimeout(250); await shot('2-otp-open');
    await page.click('#otpModal .btn-pri'); await page.waitForTimeout(250); await shot('3-id-confirmed');
    // advance to step 2
    await page.click('#cont1'); await page.waitForTimeout(300);
    // consent on → assisted fields unlock with op-tags
    await page.click('#consentSw'); await page.waitForTimeout(250); await shot('4-consent-on');
    // advance to step 3 (review & e-sign)
    await page.click('[data-step="2"] .btn-pri'); await page.waitForTimeout(300); await shot('5-review');
    // open approve modal then confirm → step 4
    await page.click('[data-open="approveModal"]'); await page.waitForTimeout(250); await shot('6-approve');
    await page.click('#approveModal .btn-pri'); await page.waitForTimeout(300); await shot('7-issued');
  } catch (e) { console.log('flow error —', String(e).split('\n')[0]); }
  if (errs.length) allErrs['flow'] = [...new Set(errs)].slice(0,6);
  await ctx.close();
}

await browser.close();
console.log('\ndone →', outdir, '(', shots, 'shots )');
if (Object.keys(allErrs).length) { console.log('JS ERRORS:'); for (const k in allErrs) console.log(' ', k, '::', allErrs[k]); }
else console.log('no JS errors');
