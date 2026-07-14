import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const currentDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@portal": resolve(currentDir, "apps/portal/src"),
      "@aomi-labs/account": resolve(currentDir, "packages/account/src"),
      "@aomi-labs/client": resolve(currentDir, "packages/client/src"),
      "@aomi-labs/deploy": resolve(currentDir, "packages/deploy/src"),
      "@aomi-labs/react": resolve(currentDir, "packages/react/src"),
      "@aomi-labs/service": resolve(currentDir, "packages/service/src"),
      "server-only": resolve(
        currentDir,
        "apps/portal/__mocks__/server-only.ts",
      ),
      "client-only": resolve(
        currentDir,
        "apps/portal/__mocks__/client-only.ts",
      ),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "packages/**/*.{test,spec}.{ts,tsx,mjs,cjs,js,jsx}",
      "apps/landing/lib/**/*.{test,spec}.{ts,tsx,mjs,cjs,js,jsx}",
      "apps/portal/src/proxy.test.ts",
      "apps/portal/src/{app,server}/mcp/**/*.{test,spec}.{ts,tsx}",
    ],
    exclude: [".claude/**", "**/.claude/**", "**/node_modules/**", "dist/**"],
    restoreMocks: true,
  },
});
