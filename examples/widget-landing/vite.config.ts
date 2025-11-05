import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 5174,
  },
  preview: {
    port: 4174,
  },
});
