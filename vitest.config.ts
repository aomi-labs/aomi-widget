import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "packages/**/*.{test,spec}.{ts,tsx,mjs,cjs,js,jsx}",
      // Portal lib has pure helper tests we want in CI. Keep this narrow —
      // app-level component tests need their own provider setup and aren't
      // covered by this config.
      "apps/portal/src/lib/**/*.{test,spec}.{ts,tsx,mjs,cjs,js,jsx}",
    ],
    exclude: [
      ".claude/**",
      "**/.claude/**",
      "**/node_modules/**",
      "apps/!(portal)/**",
      "apps/portal/{.next,test,scripts,public}/**",
      "dist/**",
    ],
    restoreMocks: true,
  },
});
