/**
 * Browser-safe access to build-time public environment variables.
 *
 * Next.js only replaces statically named `process.env.NEXT_PUBLIC_*` reads,
 * while Vite consumers may not define `process` in the browser at all. Keep
 * every supported key explicit and guard the object creation so both build
 * systems can consume the same package without a `process` shim.
 */
export const publicEnv =
  typeof process === "undefined"
    ? undefined
    : {
        NODE_ENV: process.env.NODE_ENV,
        NEXT_PUBLIC_AA_PROVIDER: process.env.NEXT_PUBLIC_AA_PROVIDER,
        NEXT_PUBLIC_ALCHEMY_API_KEY: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
        NEXT_PUBLIC_ALCHEMY_GAS_POLICY_ID:
          process.env.NEXT_PUBLIC_ALCHEMY_GAS_POLICY_ID,
        NEXT_PUBLIC_AOMI_WC_PROJECT_ID:
          process.env.NEXT_PUBLIC_AOMI_WC_PROJECT_ID,
        NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
        NEXT_PUBLIC_FULL_TESTNET_RPC_MAP:
          process.env.NEXT_PUBLIC_FULL_TESTNET_RPC_MAP,
        NEXT_PUBLIC_PARA_API_KEY: process.env.NEXT_PUBLIC_PARA_API_KEY,
        NEXT_PUBLIC_PIMLICO_API_KEY: process.env.NEXT_PUBLIC_PIMLICO_API_KEY,
        NEXT_PUBLIC_PRIVY_APP_ID: process.env.NEXT_PUBLIC_PRIVY_APP_ID,
        NEXT_PUBLIC_PROJECT_ID: process.env.NEXT_PUBLIC_PROJECT_ID,
        NEXT_PUBLIC_SOLANA_RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
        NEXT_PUBLIC_SOLANA_RPC_WS_URL:
          process.env.NEXT_PUBLIC_SOLANA_RPC_WS_URL,
        NEXT_PUBLIC_USE_FULL_TESTNET: process.env.NEXT_PUBLIC_USE_FULL_TESTNET,
        NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID:
          process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
      };
