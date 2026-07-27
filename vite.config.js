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
  styleguide: 'design-system/styleguide.html',
};

function copyStableRuntimeAssets() {
  return {
    name: 'copy-stable-runtime-assets',
    closeBundle() {
      const target = resolve(import.meta.dirname, 'dist/design-system/assets');
      mkdirSync(target, { recursive: true });
      copyFileSync(
        resolve(import.meta.dirname, 'design-system/assets/icons.svg'),
        resolve(target, 'icons.svg'),
      );
    },
  };
}

export default defineConfig({
  appType: 'mpa',
  plugins: [copyStableRuntimeAssets()],
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
