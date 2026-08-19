import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "apps/portal/src/server/agent/application-id.test.ts",
      "apps/portal/src/server/agent/public-contract.test.ts",
      "packages/client/test/public-v1-golden.contract.test.ts",
    ],
    restoreMocks: true,
  },
});
