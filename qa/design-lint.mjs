import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

async function files(dir, suffix) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await files(path, suffix));
    else if (path.endsWith(suffix)) out.push(path);
  }
  return out;
}

const errors = [];
const activeCss = [...await files('apps', '.css'), ...await files('design-system/css', '.css')];
const rawColor = /(?<![\w-])#[0-9a-f]{3,8}\b|\brgba?\([^)]*\)/gi;
const negativeLetterSpacing = /letter-spacing\s*:\s*-(?:\d|\.)/i;
const positiveLetterSpacing = /letter-spacing\s*:\s*\+?(?:(?:0?\.\d+)|(?:[1-9]\d*(?:\.\d+)?))(?:em|px|rem|%)/i;
const uppercaseTextTransform = /text-transform\s*:\s*uppercase\b/i;
const loginWordmarkFile = 'design-system/css/patterns.css';
const loginWordmarkTracking = /\.login__brand\s+b[\s\S]{0,120}\{[^}]*letter-spacing\s*:\s*-0\.02em(?:\s*!important)?\s*;/;
const heroTitleFile = 'apps/citizen/app.css';
const heroTitleTracking = /#heroTitle[\s\S]{0,80}\{[^}]*letter-spacing\s*:\s*-0\.02em\s*;/;
const trackingExceptions = [
  { file: loginWordmarkFile, selector: /\.login__brand\s+b\b/ },
  { file: heroTitleFile, selector: /#heroTitle\b/ },
];

function stripTrackingExceptions(file, source) {
  const normalized = file.replaceAll('\\', '/');
  const allowed = trackingExceptions.filter(({ file: path }) => normalized === path || normalized.endsWith(`/${path}`));
  if (!allowed.length) return source;
  return source.replace(/letter-spacing\s*:\s*-0\.02em(?:\s*!important)?\s*;/g, (match, offset) => {
    const before = source.slice(0, offset);
    const open = before.lastIndexOf('{');
    const prevClose = before.lastIndexOf('}', open);
    const selector = before.slice(prevClose + 1, open);
    return allowed.some(({ selector: pattern }) => pattern.test(selector)) ? '' : match;
  });
}

for (const file of activeCss) {
  const source = await readFile(file, 'utf8');
  const spacingSource = stripTrackingExceptions(file, source);
  for (const match of source.matchAll(rawColor)) errors.push(`${file}: raw color ${match[0]}`);
  if (negativeLetterSpacing.test(spacingSource)) errors.push(`${file}: negative letter-spacing is forbidden`);
  if (positiveLetterSpacing.test(spacingSource)) errors.push(`${file}: positive letter-spacing is forbidden`);
  if (uppercaseTextTransform.test(source)) errors.push(`${file}: uppercase text transforms are forbidden`);
  if (/transition\s*:\s*all\b/i.test(source)) errors.push(`${file}: transition: all is forbidden`);
  if (/cubic-bezier\s*\(/i.test(source)) errors.push(`${file}: raw cubic-bezier is forbidden; use a motion token`);
}

const patternsCss = await readFile(loginWordmarkFile, 'utf8');
if (!loginWordmarkTracking.test(patternsCss)) {
  errors.push(`${loginWordmarkFile}: .login__brand b must keep letter-spacing: -0.02em (logotype exception)`);
}
const citizenCss = await readFile(heroTitleFile, 'utf8');
if (!heroTitleTracking.test(citizenCss)) {
  errors.push(`${heroTitleFile}: #heroTitle must keep letter-spacing: -0.02em (display-title exception)`);
}

const sharedTypeTokens = await readFile('design-system/tokens/type.css', 'utf8');
if (!/--tracking\s*:\s*0\s*;/.test(sharedTypeTokens)) errors.push('design-system/tokens/type.css: --tracking must remain 0');

const htmlFiles = ['index.html', ...await files('citizen', '.html'), ...await files('tson', '.html'), ...await files('ministry', '.html'), ...await files('admin', '.html')];
for (const file of htmlFiles) {
  const source = await readFile(file, 'utf8');
  if (/<use\b[^>]*href=["']#/.test(source)) errors.push(`${file}: local icon reference; use canonical sprite`);
  if (/css\/(tokens|base|components)\.css/.test(source)) errors.push(`${file}: app loads a copied foundation`);
}

const storageSources = [...await files('apps', '.js'), ...await files('design-system/js', '.js')];
const allowedKeys = /^(ekh\.(preferences\.(theme|lang)|citizen\.auth|tson\.bind|admin\.rail|ministry\.side))$/;
const allowedSessionKeys = /^(ekh\.(tson|ministry)\.arm)$/;
for (const file of storageSources) {
  const source = await readFile(file, 'utf8');
  if (/<use\b[^>]*href=["']#/.test(source)) errors.push(`${file}: local icon reference; use canonical sprite`);
  for (const match of source.matchAll(/localStorage\.(?:getItem|setItem|removeItem)\(\s*['"]([^'"]+)['"]/g)) {
    if (!match[1].endsWith('.') && !allowedKeys.test(match[1])) errors.push(`${file}: unapproved storage key ${match[1]}`);
  }
  for (const match of source.matchAll(/sessionStorage\.(?:getItem|setItem|removeItem)\(\s*['"]([^'"]+)['"]/g)) {
    if (!allowedSessionKeys.test(match[1])) errors.push(`${file}: unapproved sessionStorage key ${match[1]}`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Design-system lint passed (${activeCss.length} CSS and ${htmlFiles.length} HTML files).`);
