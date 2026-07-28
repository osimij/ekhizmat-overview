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
for (const file of activeCss) {
  const source = await readFile(file, 'utf8');
  for (const match of source.matchAll(rawColor)) errors.push(`${file}: raw color ${match[0]}`);
  if (negativeLetterSpacing.test(source)) errors.push(`${file}: negative letter-spacing is forbidden`);
  if (/transition\s*:\s*all\b/i.test(source)) errors.push(`${file}: transition: all is forbidden`);
}

const htmlFiles = ['index.html', ...await files('citizen', '.html'), ...await files('tson', '.html'), ...await files('ministry', '.html'), ...await files('admin', '.html')];
for (const file of htmlFiles) {
  const source = await readFile(file, 'utf8');
  if (/<use\b[^>]*href=["']#/.test(source)) errors.push(`${file}: local icon reference; use canonical sprite`);
  if (/css\/(tokens|base|components)\.css/.test(source)) errors.push(`${file}: app loads a copied foundation`);
}

const storageSources = [...await files('apps', '.js'), ...await files('design-system/js', '.js')];
const allowedKeys = /^(ekh\.(preferences\.(theme|lang)|citizen\.auth|tson\.bind|admin\.rail))$/;
for (const file of storageSources) {
  const source = await readFile(file, 'utf8');
  if (/<use\b[^>]*href=["']#/.test(source)) errors.push(`${file}: local icon reference; use canonical sprite`);
  for (const match of source.matchAll(/localStorage\.(?:getItem|setItem|removeItem)\(\s*['"]([^'"]+)['"]/g)) {
    if (!match[1].endsWith('.') && !allowedKeys.test(match[1])) errors.push(`${file}: unapproved storage key ${match[1]}`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Design-system lint passed (${activeCss.length} CSS and ${htmlFiles.length} HTML files).`);
