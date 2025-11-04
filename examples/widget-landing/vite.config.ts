import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

const localWidgetEntry = resolve(__dirname, '../../dist/index.mjs');

export default defineConfig({
  root: '.',
  server: {
    port: 5174,
  },
  preview: {
    port: 4174,
  },
  resolve: {
    alias: {
      '@aomi-labs/widget-lib': localWidgetEntry,
    },
  },
  optimizeDeps: {
    exclude: ['@aomi-labs/widget-lib'],
  },
});
