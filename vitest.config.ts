import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "packages/**/*.{test,spec}.{ts,tsx,mjs,cjs,js,jsx}",
      "apps/portal/src/app/mcp/connect/provider-credential.test.ts",
    ],
    exclude: [".claude/**", "**/.claude/**", "**/node_modules/**", "dist/**"],
    restoreMocks: true,
  },
});
