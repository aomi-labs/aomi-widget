import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["apps/base/app/**/*.{test,spec}.{ts,tsx}"],
    restoreMocks: true,
  },
});
