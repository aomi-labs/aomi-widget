// Types & constants
export type {
  AomiAuthAdapter,
  AomiAuthIdentity,
  AomiAuthStatus,
  WalletEip712Payload,
  WalletTxPayload,
} from "./types";
export {
  AOMI_AUTH_BOOTING_IDENTITY,
  AOMI_AUTH_DISCONNECTED_IDENTITY,
} from "./types";

// Identity helpers
export {
  formatAddress,
  formatAuthProvider,
  inferAuthProvider,
} from "./auth-identity";

// Context & hook
export { AomiAuthAdapterContext, useAomiAuthAdapter } from "./context";

// Providers
// Para provider is exported separately via "@aomi-labs/widget-lib/auth-providers/para"
// to avoid pulling @getpara/react-sdk into apps that don't need it.
export { AomiBaseAccountProvider } from "./providers/base-account";
