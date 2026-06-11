import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const currentDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: [resolve(currentDir, "../../vitest.setup.ts")],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: [
      "src/lib/onboarding.test.ts",
      "src/lib/usage-range.test.ts",
    ],
    restoreMocks: true,
  },
});
