import type { WalletFamily } from "../types";

/** Runtime id vs stable id: wagmi connector `uid` is regenerated every page load;
 * `connector.id` (e.g. "para", "io.metamask", "metaMaskSDK", "walletConnect") is stable
 * across loads. Persist stable ids + addresses; resolve uids at runtime.
 */
export type RegistryConnection = {
  key: string;
  family: WalletFamily;
  uid: string;
  stableId: string;
  kind: "para" | "external-evm" | "walletconnect" | "solana";
  address: string;
  addresses: string[];
  chainId?: number;
  walletName?: string;
};

export type ActiveRef = {
  family: WalletFamily;
  address: string;
  uid?: string;
  stableId?: string;
};

export type RegistryPhase = "booting" | "settling" | "stable" | "rebuilding";

export type EvmGraceState = {
  last: {
    address: string;
    chainId?: number;
    connectorId?: string;
    walletName?: string;
  } | null;
  disconnectedAt: number | null;
};

export type WalletRegistryState = {
  phase: RegistryPhase;
  connections: RegistryConnection[];
  activeByFamily: Partial<Record<WalletFamily, ActiveRef>>;
  intents: {
    droppedAddresses: string[];
    paraDetached: boolean;
    explicitFamilyDisconnect: Partial<Record<WalletFamily, boolean>>;
    pendingSolanaWallet: string | null;
    preferParaOnConnect: boolean;
  };
  heal: {
    expected: Array<{ stableId: string; address: string }>;
    reattachBudget: number;
    suppressedUntil: number | null;
    suppressionReason: string | null;
  };
  evmGrace: EvmGraceState;
  paraSession: { up: boolean; embeddedEvmAddress: string | null };
};

export type RegistryEvent =
  | { type: "boot/init"; persisted: PersistedRegistryV1 | null; now: number }
  | {
      type: "wagmi/connections-changed";
      connections: Array<Omit<RegistryConnection, "key" | "kind">>;
      now: number;
    }
  | { type: "wagmi/config-rebuilt"; now: number }
  | { type: "wagmi/brands-changed"; brands: Record<string, string> }
  | { type: "wagmi/settled"; now: number }
  | {
      type: "para/session-changed";
      up: boolean;
      embeddedEvmAddress: string | null;
      now: number;
    }
  | { type: "para/auth-flow-started"; reason: string; now: number }
  | {
      type: "solana/changed";
      publicKey: string | null;
      walletName: string | null;
      now: number;
    }
  | { type: "solana/connect-requested"; walletName: string; now: number }
  | { type: "solana/connect-settled"; walletName: string; now: number }
  | {
      type: "user/select-active";
      family: WalletFamily;
      address: string;
      uid: string;
      stableId: string;
      now: number;
    }
  | {
      type: "user/connect-succeeded";
      family: WalletFamily;
      address: string;
      uid: string;
      stableId: string;
      now: number;
    }
  | { type: "user/para-reconnect-requested"; now: number }
  | {
      type: "user/disconnect-account";
      address: string;
      uids: string[];
      isParaAccount: boolean;
      othersRemain: boolean;
      markDroppedAddress?: boolean;
      now: number;
    }
  | {
      type: "user/disconnect-family";
      family: WalletFamily | "all";
      now: number;
    };

export type RegistryCommand =
  | { kind: "wagmi/reconnect" }
  | { kind: "wagmi/connect"; stableId: string }
  | { kind: "wagmi/disconnect"; uid: string }
  | { kind: "para/logout" }
  | { kind: "persist" }
  | { kind: "debug"; event: string; data?: Record<string, unknown> };

export type PersistedRegistryV1 = {
  version: 1;
  active: Partial<Record<WalletFamily, { address: string; stableId?: string }>>;
  droppedAddresses: string[];
  paraDetached: boolean;
};

/** Future `GET /api/account/wallets` row; see WALLET-ARCHITECTURE.md §11.3. */
export type WalletLink = {
  address: string;
  family: WalletFamily;
  linkedVia: "para" | "privy" | "challenge";
  subject: string;
  verifiedAt: number;
};

export const REGISTRY_STORAGE_KEY = "aomi.wallet.registry.v1";
export const POPUP_REATTACH_BUDGET = 2;
export const REATTACH_SUPPRESSION_MS = 300_000;
export const SETTLE_QUIET_MS = 1_200;
export const AUTH_FLOW_RECONNECT_SETTLE_MS = 8_000;
export const EVM_IDENTITY_GRACE_MS = 1_800;
