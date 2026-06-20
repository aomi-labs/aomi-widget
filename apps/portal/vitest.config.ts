import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const currentDir = fileURLToPath(new URL(".", import.meta.url));
const srcDir = resolve(currentDir, "src");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@portal": srcDir,
      "server-only": resolve(currentDir, "__mocks__/server-only.ts"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: [resolve(currentDir, "../../vitest.setup.ts")],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    server: {
      deps: {
        inline: ["server-only"],
      },
    },
    exclude: [
      "src/lib/onboarding.test.ts",
      "src/lib/usage-range.test.ts",
    ],
    restoreMocks: true,
  },
});
