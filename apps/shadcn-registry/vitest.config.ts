import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const currentDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(currentDir, "src"),
      "@getpara/react-sdk/styles.css": resolve(
        currentDir,
        "src/test/mocks/empty-style.ts",
      ),
      "@getpara/react-sdk": resolve(
        currentDir,
        "src/test/mocks/para-react-sdk.tsx",
      ),
      "@getpara/solana-wallet-connectors/connectors": resolve(
        currentDir,
        "src/test/mocks/para-solana-wallet-connectors.tsx",
      ),
      "@getpara/solana-wallet-connectors": resolve(
        currentDir,
        "src/test/mocks/para-solana-wallet-connectors.tsx",
      ),
      "@privy-io/react-auth/solana": resolve(
        currentDir,
        "src/test/mocks/privy-solana.tsx",
      ),
      "@privy-io/react-auth/smart-wallets": resolve(
        currentDir,
        "src/test/mocks/privy-smart-wallets.tsx",
      ),
      "@privy-io/react-auth": resolve(
        currentDir,
        "src/test/mocks/privy-react-auth.tsx",
      ),
      "@privy-io/wagmi": resolve(currentDir, "src/test/mocks/privy-wagmi.tsx"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: [resolve(currentDir, "../../vitest.setup.ts")],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    restoreMocks: true,
  },
});
