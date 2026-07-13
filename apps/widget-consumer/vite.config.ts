import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  // Para's SDK reaches browser-compatible Node shims through its wallet
  // connectors. Keep those details out of the React integration itself.
  plugins: [
    react(),
    nodePolyfills({
      include: ["buffer", "os"],
      // Para imports Node-compatible modules directly. It does not require us
      // to inject mutable Node globals into every Aomi source module.
      globals: { Buffer: false, global: false, process: false },
    }),
  ],
  // The package ships compiled widget CSS; do not inherit the monorepo's
  // Tailwind PostCSS pipeline in this framework-neutral consumer.
  css: { postcss: { plugins: [] } },
  build: {
    manifest: true,
    rollupOptions: {
      input: {
        para: `${root}index.html`,
        providerless: `${root}providerless.html`,
      },
    },
  },
});
