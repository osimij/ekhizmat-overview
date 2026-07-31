import { access, readFile, readdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'dist');
const requiredRoutes = [
  '/',
  '/citizen/',
  '/tson/',
  '/ministry/',
  '/admin/',
  '/admin/services.html',
  '/admin/forms.html',
  '/admin/form-builder.html',
  '/admin/new-service.html',
  '/admin/builder.html',
  '/admin/review.html',
  '/design-system/styleguide.html',
  '/design-system/assets/icons.svg',
];

function outputPath(urlPath) {
  const clean = urlPath.split(/[?#]/, 1)[0];
  return resolve(output, clean.replace(/^\//, ''), clean.endsWith('/') ? 'index.html' : '');
}

async function assertFile(file, label) {
  try {
    await access(file, constants.R_OK);
  } catch {
    throw new Error(`${label} is missing from the production output: ${file}`);
  }
}

const config = JSON.parse(await readFile(resolve(root, 'vercel.json'), 'utf8'));
if (config.framework !== 'vite' || config.outputDirectory !== 'dist') {
  throw new Error('vercel.json must build the Vite project into dist.');
}

for (const route of requiredRoutes) await assertFile(outputPath(route), route);

const htmlFiles = [];
async function collectHtml(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = resolve(directory, entry.name);
    if (entry.isDirectory()) await collectHtml(file);
    else if (entry.name.endsWith('.html')) htmlFiles.push(file);
  }
}
await collectHtml(output);

for (const htmlFile of htmlFiles) {
  const html = await readFile(htmlFile, 'utf8');
  const references = [...html.matchAll(/(?:src|href)="(\/[^"]+)"/g)].map((match) => match[1]);
  for (const reference of references) {
    if (reference.startsWith('//')) continue;
    await assertFile(outputPath(reference), `${htmlFile} → ${reference}`);
  }
}

console.log(`Vercel readiness passed: ${requiredRoutes.length} public routes and ${htmlFiles.length} HTML entries verified.`);
