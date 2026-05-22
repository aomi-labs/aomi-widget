/**
 * Common constants used throughout the mini-app.
 */

// ── WalletConnect Storage ──

/** Browser storage key prefixes for wallet session data. */
export const WALLET_STORAGE_KEY_PREFIXES = [
  '@appkit/',
  '@CAPSULE/',
  '@PARA/',
  'wagmi.',
  'WALLETCONNECT_DEEPLINK',
] as const;

/** IndexedDB database name for WalletConnect v2. */
export const WC_IDB_NAME = 'WALLET_CONNECT_V2_INDEXED_DB';

/** IndexedDB object store name for WalletConnect v2. */
export const WC_IDB_STORE = 'keyvaluestorage';

// ── Request TTLs ──

/** Time-to-live for pending transaction and EIP-712 requests (10 minutes). */
export const REQUEST_TTL_MS = 10 * 60 * 1000;

// ── Connect Wallet Constants ──

/** LocalStorage key prefix for tracking force_new token application. */
export const FORCE_NEW_MARKER_PREFIX = 'aomi_force_new_applied_v1';

/** TTL for force_new marker to prevent re-clearing on page refresh (15 minutes). */
export const FORCE_NEW_MARKER_TTL_MS = 15 * 60 * 1000;

/** LocalStorage key for storing connect context (userId, forceNewToken). */
export const CONNECT_CONTEXT_KEY = 'aomi_connect_context_v1';

/** TTL for connect context persistence (30 minutes). */
export const CONNECT_CONTEXT_TTL_MS = 30 * 60 * 1000;

/** Delay before reopening connect modal when returning from result_uri callback (20 seconds). */
export const RESULT_URI_FALLBACK_OPEN_DELAY_MS = 20_000;

/** Delay before reopening connect modal after restoring a session (3.5 seconds). */
export const RESTORED_SESSION_OPEN_DELAY_MS = 3500;

/** Delay after disconnect before reopening connect modal (500ms). */
export const POST_DISCONNECT_MODAL_DELAY_MS = 500;

/** Delay before persisting wallet state to allow IDB writes to complete (2 seconds). */
export const WALLET_PERSIST_DELAY_MS = 2000;

// ── Server WalletConnect Constants ──

/** Timeout for server-side WalletConnect handshake (5 minutes). */
export const SERVER_WC_CONNECT_TIMEOUT_MS = 5 * 60 * 1000;

/** Unified state tracker TTL for connect operation (5 minutes). */
export const WALLET_OP_TTL_CONNECT_MS = 5 * 60 * 1000;

/** Unified state tracker TTL for tx signing operation (10 minutes). */
export const WALLET_OP_TTL_SIGN_TX_MS = 10 * 60 * 1000;

/** Unified state tracker TTL for EIP-712 signing operation (10 minutes). */
export const WALLET_OP_TTL_SIGN_EIP712_MS = 10 * 60 * 1000;

/** Unified state tracker TTL for network switch operation (3 minutes). */
export const WALLET_OP_TTL_SWITCH_NETWORK_MS = 3 * 60 * 1000;

/** Supported EIP-155 chain identifiers for server WalletConnect. */
export const SUPPORTED_EIP155_CHAINS = [
  'eip155:1', // Ethereum Mainnet
  'eip155:42161', // Arbitrum One
  'eip155:10', // Optimism
  'eip155:137', // Polygon
  'eip155:8453', // Base
] as const;

/** Supported WalletConnect methods for server-side sessions. */
export const SUPPORTED_WC_METHODS = [
  'eth_sendTransaction',
  'eth_signTransaction',
  'personal_sign',
  'eth_sign',
  'eth_signTypedData',
  'eth_signTypedData_v4',
  'wallet_switchEthereumChain',
  'wallet_addEthereumChain',
] as const;

/** Supported WalletConnect events for server-side sessions. */
export const SUPPORTED_WC_EVENTS = [
  'chainChanged',
  'accountsChanged',
  'disconnect',
] as const;

// ── Transaction Status Values ──

/** Status when transaction is created and waiting to be sent to wallet. */
export const TX_STATUS_PENDING = 'pending';

/** Status when transaction has been sent to wallet and awaiting user action. */
export const TX_STATUS_AWAITING_WALLET = 'awaiting_wallet';

/** Status when transaction was signed successfully. */
export const TX_STATUS_SIGNED = 'signed';

/** Status when user rejected the transaction. */
export const TX_STATUS_REJECTED = 'rejected';

/** Status when transaction signing failed. */
export const TX_STATUS_FAILED = 'failed';

/** Status when transaction request expired. */
export const TX_STATUS_EXPIRED = 'expired';

// ── Network Switch Status Values ──

/** Status when network switch completed successfully. */
export const NETWORK_STATUS_SWITCHED = 'switched';

// ── Wallet Connection Sources ──

/** Connection originated from mini-app (WebApp modal). */
export const WALLET_SOURCE_MINI_APP = 'mini_app';

/** Connection originated from server-side WalletConnect. */
export const WALLET_SOURCE_SERVER_WC = 'server_wc';

// ── Default Chain IDs ──

/** Default chain ID when none is specified. */
export const DEFAULT_CHAIN_ID = 1;
