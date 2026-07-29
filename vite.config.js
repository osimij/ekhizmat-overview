import { defineConfig } from 'vite';
import { copyFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const pages = {
  launcher: 'index.html',
  citizen: 'citizen/index.html',
  tson: 'tson/index.html',
  ministry: 'ministry/index.html',
  admin: 'admin/index.html',
  adminServices: 'admin/services.html',
  adminNewService: 'admin/new-service.html',
  adminBuilder: 'admin/builder.html',
  adminReview: 'admin/review.html',
  styleguide: 'design-system/styleguide.html',
};

function copyStableRuntimeFiles() {
  return {
    name: 'copy-stable-runtime-files',
    closeBundle() {
      const assetTarget = resolve(import.meta.dirname, 'dist/design-system/assets');
      mkdirSync(assetTarget, { recursive: true });
      copyFileSync(
        resolve(import.meta.dirname, 'design-system/assets/icons.svg'),
        resolve(assetTarget, 'icons.svg'),
      );

      const docsTarget = resolve(import.meta.dirname, 'dist/docs');
      mkdirSync(docsTarget, { recursive: true });
      for (const file of ['demo-script.md', 'migration-map.md']) {
        copyFileSync(resolve(import.meta.dirname, 'docs', file), resolve(docsTarget, file));
      }
    },
  };
}

export default defineConfig({
  appType: 'mpa',
  plugins: [copyStableRuntimeFiles()],
  build: {
    rollupOptions: {
      input: Object.fromEntries(
        Object.entries(pages).map(([name, file]) => [name, resolve(import.meta.dirname, file)]),
      ),
    },
  },
  server: { open: '/' },
  preview: { open: '/' },
});
