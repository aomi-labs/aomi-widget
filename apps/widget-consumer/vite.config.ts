import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { fileURLToPath } from "node:url";

const polyfillShim = (name: "buffer" | "global" | "process") =>
  fileURLToPath(
    new URL(
      `./node_modules/vite-plugin-node-polyfills/shims/${name}/dist/index.js`,
      import.meta.url,
    ),
  );

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ["buffer", "crypto", "stream", "util"],
    }),
  ],
  // The widget package is a workspace dependency outside this app directory.
  // Keep the polyfill plugin's injected shim imports anchored to this app.
  resolve: {
    dedupe: ["react", "react-dom", "@assistant-ui/react"],
    alias: {
      "vite-plugin-node-polyfills/shims/buffer": polyfillShim("buffer"),
      "vite-plugin-node-polyfills/shims/global": polyfillShim("global"),
      "vite-plugin-node-polyfills/shims/process": polyfillShim("process"),
    },
  },
  server: { port: 3001, strictPort: true },
});
