import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@portal": resolve(root, "apps/portal/src"),
      "@aomi-labs/account/account": resolve(
        root,
        "packages/account/src/account.ts",
      ),
      "@aomi-labs/account/better-auth": resolve(
        root,
        "packages/account/src/better-auth/index.ts",
      ),
      "@aomi-labs/account": resolve(root, "packages/account/src/index.ts"),
      "@aomi-labs/service": resolve(root, "packages/service/src/index.ts"),
      "server-only": resolve(root, "apps/portal/__mocks__/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: [
      "apps/portal/src/server/agent/action-projection.test.ts",
      "apps/portal/src/server/agent/application-id.test.ts",
      "apps/portal/src/server/agent/credential-ladder.test.ts",
      "apps/portal/src/server/agent/cursor.test.ts",
      "apps/portal/src/server/agent/facade.test.ts",
      "apps/portal/src/server/agent/guest-admission.test.ts",
      "apps/portal/src/server/agent/internal-principal.test.ts",
      "apps/portal/src/server/agent/http.test.ts",
      "apps/portal/src/server/agent/kernel.test.ts",
      "apps/portal/src/server/agent/mcp.test.ts",
      "apps/portal/src/server/agent/oauth.test.ts",
      "apps/portal/src/server/agent/oauth-postgres.integration.test.ts",
      "apps/portal/src/server/agent/public-contract.test.ts",
      "packages/client/test/public-v1-golden.contract.test.ts",
      "packages/client/test/agent-v1-session.unit.test.ts",
      "packages/client/test/cli/oauth-device.unit.test.ts",
    ],
    restoreMocks: true,
  },
});
