// =============================================================================
// User State
// =============================================================================

/**
 * Client-side user state synced with the backend.
 * Typically wallet connection info, but can be any key-value data.
 */
export type UserStateAAMode = "none" | "4337" | "7702";
export type UserStateWalletKind = "eoa" | "smart-account";
export type UserStateWalletProvider = "para" | "baseAccount";
export type UserStateAuthMethod =
  | "google"
  | "apple"
  | "facebook"
  | "x"
  | "discord"
  | "github"
  | "farcaster"
  | "telegram"
  | "email"
  | "phone"
  | "wagmi";
export type UserStateSponsorProvider =
  | "alchemy"
  | "coinbase"
  | "pimlico"
  | "self";

export interface UserState extends Record<string, unknown> {
  /**
   * Connected account address. When `wallet_kind === "smart-account"` this is
   * the smart account address; when `wallet_kind === "eoa"` it is the EOA.
   */
  address?: string | null;
  wallet_kind?: UserStateWalletKind | null;
  aa_mode?: UserStateAAMode | null;
  /** 4337 smart account address — populated after a 4337 tx resolves. */
  smart_account_4337?: string | null;
  /** 7702 delegation contract address — populated after a 7702 tx resolves. */
  delegation_7702?: string | null;
  chain_id?: number | string | null;
  is_connected?: boolean | null;
  ens_name?: string | null;
  svm_address?: string | null;
  wallet_provider?: UserStateWalletProvider | null;
  auth_method?: UserStateAuthMethod | null;
  sponsored?: boolean | null;
  sponsor_provider?: UserStateSponsorProvider | null;
  sponsor_account?: string | null;

  /**
   * Backend-pushed in-flight wallet requests. Shape is owned by the backend;
   * parsed by helpers like `pendingTxsFromBackendUserState`. The client
   * forwards them transparently via reconciliation.
   */
  pending_txs?: Record<string, unknown> | null;
  pending_eip712s?: Record<string, unknown> | null;
  pending_solana_txs?: Record<string, unknown> | null;
  next_id?: number | null;
}

/**
 * Known client surfaces that may want backend-specific UX strategies.
 * Additional string values are allowed for forward compatibility.
 */
export type AomiClientType = "ts_cli" | "web_ui" | (string & {});

export const CLIENT_TYPE_TS_CLI: AomiClientType = "ts_cli";
export const CLIENT_TYPE_WEB_UI: AomiClientType = "web_ui";

const USER_STATE_KEY_ALIASES: Record<string, string> = {
  chainId: "chain_id",
  isConnected: "is_connected",
  ensName: "ens_name",
  svmAddress: "svm_address",
  walletKind: "wallet_kind",
  aaMode: "aa_mode",
  SmartAccount4337: "smart_account_4337",
  Delegation7702: "delegation_7702",
  pendingTxs: "pending_txs",
  pendingEip712s: "pending_eip712s",
  pendingSolanaTxs: "pending_solana_txs",
  nextId: "next_id",
  walletProvider: "wallet_provider",
  authMethod: "auth_method",
  sponsorProvider: "sponsor_provider",
  sponsorAccount: "sponsor_account",
};

function parseUserStateChainId(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed.startsWith("0x")) {
    const parsedHex = Number.parseInt(trimmed.slice(2), 16);
    return Number.isInteger(parsedHex) && parsedHex > 0 ? parsedHex : undefined;
  }

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function normalizeAddressForComparison(value: string | undefined): string | undefined {
  return typeof value === "string" ? value.toLowerCase() : undefined;
}

function parseUserStateWalletProvider(
  value: unknown,
): UserStateWalletProvider | null | undefined {
  if (value === null) {
    return null;
  }
  return value === "para" || value === "baseAccount" ? value : undefined;
}

const AUTH_METHODS = new Set<UserStateAuthMethod>([
  "google",
  "apple",
  "facebook",
  "x",
  "discord",
  "github",
  "farcaster",
  "telegram",
  "email",
  "phone",
  "wagmi",
]);

function parseUserStateAuthMethod(
  value: unknown,
): UserStateAuthMethod | null | undefined {
  if (value === null) {
    return null;
  }
  return typeof value === "string" && AUTH_METHODS.has(value as UserStateAuthMethod)
    ? (value as UserStateAuthMethod)
    : undefined;
}

function parseUserStateSponsored(value: unknown): boolean | null | undefined {
  if (value === null) {
    return null;
  }
  return typeof value === "boolean" ? value : undefined;
}

function parseUserStateSponsorProvider(
  value: unknown,
): UserStateSponsorProvider | null | undefined {
  if (value === null) {
    return null;
  }
  return value === "alchemy" ||
    value === "coinbase" ||
    value === "pimlico" ||
    value === "self"
    ? value
    : undefined;
}

function parseUserStateWalletKind(
  value: unknown,
): UserStateWalletKind | null | undefined {
  if (value === null) {
    return null;
  }
  return value === "eoa" || value === "smart-account" ? value : undefined;
}

function parseUserStateAAMode(
  value: unknown,
): UserStateAAMode | null | undefined {
  if (value === null) {
    return null;
  }
  return value === "none" || value === "4337" || value === "7702"
    ? value
    : undefined;
}

function parseUserStateOptionalAddress(
  value: unknown,
): string | null | undefined {
  if (value === null) {
    return null;
  }
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function hasOwnKey(record: UserState | undefined, key: string): boolean {
  return record !== undefined && Object.prototype.hasOwnProperty.call(record, key);
}

export namespace UserState {
  /**
   * Canonicalize client-side user state to the backend's snake_case `UserState`.
   * Existing snake_case keys win when both forms are present.
   */
  export function normalize(userState?: UserState | null): UserState | undefined {
    if (!userState) {
      return undefined;
    }

    const normalized: UserState = {};
    for (const [key, value] of Object.entries(userState)) {
      const normalizedKey = USER_STATE_KEY_ALIASES[key] ?? key;
      if (normalizedKey in normalized) {
        continue;
      }
      normalized[normalizedKey] = value;
    }

    return normalized;
  }

  /**
   * Reconcile a partial incoming snapshot against the previous canonical state.
   * Preserves wallet context when backend/client snapshots omit address/chain_id.
   */
  export function reconcile(
    previousUserState?: UserState | null,
    incomingUserState?: UserState | null,
  ): UserState | undefined {
    const incoming = normalize(incomingUserState);
    if (!incoming) {
      return undefined;
    }

    const previous = normalize(previousUserState);
    const reconciled: UserState = { ...incoming };

    const previousAddress = address(previous);
    const incomingAddress = address(incoming);
    const incomingConnected = isConnected(incoming);
    const incomingChainId = chainId(incoming);

    const canPreserveConnectedWalletContext = incomingConnected !== false;
    const sameAddress =
      normalizeAddressForComparison(previousAddress) !== undefined &&
      normalizeAddressForComparison(previousAddress) ===
        normalizeAddressForComparison(incomingAddress);

    if (!incomingAddress && canPreserveConnectedWalletContext && previousAddress) {
      reconciled.address = previousAddress;
    }

    // Same preservation rule for the SVM (Solana) pubkey: if the incoming
    // snapshot omits `svm_address` but we previously had one and the
    // connection isn't being explicitly broken, keep it. EVM and SVM
    // identities are independent — neither field's presence implies the
    // other.
    const previousSvm = svmAddress(previous);
    const incomingSvm = svmAddress(incoming);
    if (!incomingSvm && canPreserveConnectedWalletContext && previousSvm) {
      reconciled.svm_address = previousSvm;
    }

    if (
      incomingChainId === undefined &&
      canPreserveConnectedWalletContext &&
      previous &&
      chainId(previous) !== undefined
    ) {
      const canPreserveChain =
        sameAddress || (!incomingAddress && !!previousAddress);
      if (canPreserveChain) {
        reconciled.chain_id = chainId(previous);
      }
    }

    const canPreserveAAContext =
      canPreserveConnectedWalletContext &&
      previous !== undefined &&
      (sameAddress || (!incomingAddress && !!previousAddress));

    if (
      !hasOwnKey(incoming, "wallet_kind") &&
      canPreserveAAContext &&
      walletKind(previous) !== undefined
    ) {
      reconciled.wallet_kind = walletKind(previous);
    }

    if (
      !hasOwnKey(incoming, "aa_mode") &&
      canPreserveAAContext &&
      aaMode(previous) !== undefined
    ) {
      reconciled.aa_mode = aaMode(previous);
    }

    if (
      !hasOwnKey(incoming, "smart_account_4337") &&
      canPreserveAAContext &&
      SmartAccount4337(previous) !== undefined
    ) {
      reconciled.smart_account_4337 = SmartAccount4337(previous);
    }

    if (
      !hasOwnKey(incoming, "delegation_7702") &&
      canPreserveAAContext &&
      Delegation7702(previous) !== undefined
    ) {
      reconciled.delegation_7702 = Delegation7702(previous);
    }

    if (
      !hasOwnKey(incoming, "ens_name") &&
      canPreserveAAContext &&
      ensName(previous) !== undefined
    ) {
      reconciled.ens_name = ensName(previous);
    }

    if (
      !hasOwnKey(incoming, "wallet_provider") &&
      canPreserveAAContext &&
      walletProvider(previous) !== undefined
    ) {
      reconciled.wallet_provider = walletProvider(previous);
    }

    if (
      !hasOwnKey(incoming, "auth_method") &&
      canPreserveAAContext &&
      authMethod(previous) !== undefined
    ) {
      reconciled.auth_method = authMethod(previous);
    }

    if (
      !hasOwnKey(incoming, "sponsored") &&
      canPreserveAAContext &&
      sponsored(previous) !== undefined
    ) {
      reconciled.sponsored = sponsored(previous);
    }

    if (
      !hasOwnKey(incoming, "sponsor_provider") &&
      canPreserveAAContext &&
      sponsorProvider(previous) !== undefined
    ) {
      reconciled.sponsor_provider = sponsorProvider(previous);
    }

    if (
      !hasOwnKey(incoming, "sponsor_account") &&
      canPreserveAAContext &&
      sponsorAccount(previous) !== undefined
    ) {
      reconciled.sponsor_account = sponsorAccount(previous);
    }

    // Never keep `is_connected: true` without a valid chain id.
    if (isConnected(reconciled) === true && chainId(reconciled) === undefined) {
      delete reconciled.is_connected;
    }

    return reconciled;
  }

  export function address(userState?: UserState | null): string | undefined {
    const normalized = normalize(userState);
    const address = normalized?.address;
    return typeof address === "string" && address.length > 0 ? address : undefined;
  }

  export function walletKind(
    userState?: UserState | null,
  ): UserStateWalletKind | null | undefined {
    const normalized = normalize(userState);
    return parseUserStateWalletKind(normalized?.wallet_kind);
  }

  export function aaMode(
    userState?: UserState | null,
  ): UserStateAAMode | null | undefined {
    const normalized = normalize(userState);
    return parseUserStateAAMode(normalized?.aa_mode);
  }

  export function SmartAccount4337(
    userState?: UserState | null,
  ): string | null | undefined {
    const normalized = normalize(userState);
    return parseUserStateOptionalAddress(normalized?.smart_account_4337);
  }

  export function Delegation7702(
    userState?: UserState | null,
  ): string | null | undefined {
    const normalized = normalize(userState);
    return parseUserStateOptionalAddress(normalized?.delegation_7702);
  }

  /**
   * Connected Solana wallet pubkey (base58). Independent of `address`,
   * which is the EVM address. A session may have either, both, or neither.
   */
  export function svmAddress(userState?: UserState | null): string | undefined {
    const normalized = normalize(userState);
    const value = normalized?.svm_address;
    return typeof value === "string" && value.length > 0 ? value : undefined;
  }

  export function chainId(userState?: UserState | null): number | undefined {
    const normalized = normalize(userState);
    return parseUserStateChainId(normalized?.chain_id);
  }

  export function isConnected(userState?: UserState | null): boolean | undefined {
    const normalized = normalize(userState);
    const isConnected = normalized?.is_connected;
    return typeof isConnected === "boolean" ? isConnected : undefined;
  }

  export function ensName(userState?: UserState | null): string | undefined {
    const normalized = normalize(userState);
    const value = normalized?.ens_name;
    return typeof value === "string" && value.length > 0 ? value : undefined;
  }

  export function walletProvider(
    userState?: UserState | null,
  ): UserStateWalletProvider | null | undefined {
    const normalized = normalize(userState);
    return parseUserStateWalletProvider(normalized?.wallet_provider);
  }

  export function authMethod(
    userState?: UserState | null,
  ): UserStateAuthMethod | null | undefined {
    const normalized = normalize(userState);
    return parseUserStateAuthMethod(normalized?.auth_method);
  }

  export function sponsored(
    userState?: UserState | null,
  ): boolean | null | undefined {
    const normalized = normalize(userState);
    return parseUserStateSponsored(normalized?.sponsored);
  }

  export function sponsorProvider(
    userState?: UserState | null,
  ): UserStateSponsorProvider | null | undefined {
    const normalized = normalize(userState);
    return parseUserStateSponsorProvider(normalized?.sponsor_provider);
  }

  export function sponsorAccount(
    userState?: UserState | null,
  ): string | null | undefined {
    const normalized = normalize(userState);
    return parseUserStateOptionalAddress(normalized?.sponsor_account);
  }

  /**
   * Adds/updates an entry on `userState.ext` while keeping `ext` intentionally untyped.
   */
  export function withExt(
    userState: UserState,
    key: string,
    value: unknown,
  ): UserState {
    const normalizedUserState = normalize(userState) ?? {};
    const currentExt = normalizedUserState["ext"];
    const extRecord =
      typeof currentExt === "object" &&
      currentExt !== null &&
      !Array.isArray(currentExt)
        ? (currentExt as Record<string, unknown>)
        : {};

    return {
      ...normalizedUserState,
      ext: {
        ...extRecord,
        [key]: value,
      },
    };
  }
}

// =============================================================================
// Logger
// =============================================================================

/**
 * Optional logger for debug output. Pass `console` or any compatible object.
 */
export type Logger = {
  debug: (...args: unknown[]) => void;
};

// =============================================================================
// Client Options
// =============================================================================

export type AomiClientOptions = {
  /** Base URL of the Aomi backend (e.g. "https://api.aomi.dev" or "/" for same-origin proxying) */
  baseUrl: string;
  /** Optional fetch implementation for payment-aware browser transports and tests. */
  fetch?: typeof fetch;
  /** Default API key for non-default apps */
  apiKey?: string;
  /** Optional logger for debug output (default: silent) */
  logger?: Logger;
};

// =============================================================================
// Base Types
// =============================================================================

export interface AomiMessage {
  sender?: "user" | "agent" | "system" | string;
  content?: string;
  timestamp?: string;
  is_streaming?: boolean;
  tool_result?: [string, string] | null;
}

// =============================================================================
// API Response Types
// =============================================================================

/**
 * GET /api/state
 * Fetches current session state including messages and processing status
 */
export interface AomiStateResponse {
  messages?: AomiMessage[] | null;
  system_events?: AomiSystemEvent[] | null;
  title?: string | null;
  is_processing?: boolean;
  user_state?: UserState | null;
}

/**
 * POST /api/chat
 * Sends a chat message and returns updated session state
 */
export interface AomiChatResponse {
  messages?: AomiMessage[] | null;
  system_events?: AomiSystemEvent[] | null;
  title?: string | null;
  is_processing?: boolean;
  user_state?: UserState | null;
}

/**
 * POST /api/system
 * Sends a system message and returns the response message
 */
export interface AomiSystemResponse {
  res?: AomiMessage | null;
}

/**
 * POST /api/simulate
 * Batch-simulate pending transactions atomically (snapshot → sequential send → revert).
 */
export interface AomiSimulateFee {
  /** Treasury address to receive the fee. */
  recipient: string;
  /** Fee amount in wei (decimal string). */
  amount_wei: string;
  /** Token type — always "native" for now. */
  token: "native";
}

export interface AomiSimulateResponse {
  result: {
    batch_success: boolean;
    stateful: boolean;
    from: string;
    network: string;
    total_gas?: number;
    fee?: AomiSimulateFee;
    steps: Array<{
      step: number;
      label: string;
      success: boolean;
      result?: string | null;
      revert_reason?: string | null;
      gas_used?: number;
      tx: { to: string; value_wei: string; value_eth: string; data: string };
    }>;
  };
}

/**
 * POST /api/interrupt
 * Interrupts current processing and returns updated session state
 */
export type AomiInterruptResponse = AomiChatResponse;

/**
 * GET /api/sessions
 * Returns array of AomiThread
 */
export interface AomiThread {
  session_id: string;
  title: string;
  is_archived?: boolean;
}

/**
 * POST /api/sessions
 * Creates a new thread/session
 */
export interface AomiCreateThreadResponse {
  session_id: string;
  title?: string;
}

/**
 * GET/POST /api/control/provider-keys
 * Lists or saves BYOK keys (one per LLM provider) for the bound client.
 */
export interface AomiByokKeyEntry {
  provider: string;
  key_prefix: string;
  label?: string | null;
  is_active: boolean;
}

export interface AomiListByokKeysResponse {
  byok_keys: AomiByokKeyEntry[];
}

export interface AomiSaveByokKeyResponse {
  key: AomiByokKeyEntry;
}

export interface AomiDeleteByokKeyResponse {
  deleted: boolean;
}

// =============================================================================
// SSE Event Types (/api/updates)
// =============================================================================

/**
 * Base SSE event - all events have session_id and type
 */
export type AomiSSEEvent = {
  type:
    | "title_changed"
    | "tool_update"
    | "tool_complete"
    | "system_notice"
    | string;
  session_id: string;
  new_title?: string;
  [key: string]: unknown;
};

/**
 * POST /api/secrets
 * Ingests secrets for a client, returns opaque handles
 */
export interface AomiIngestSecretsResponse {
  handles: Record<string, string>;
}

/**
 * DELETE /api/secrets
 * Clears all secrets for a client
 */
export interface AomiClearSecretsResponse {
  cleared: boolean;
}

/**
 * DELETE /api/secrets/:name
 * Removes a single secret for a client
 */
export interface AomiDeleteSecretResponse {
  deleted: boolean;
}

export type AomiSSEEventType =
  | "title_changed"
  | "tool_update"
  | "tool_complete"
  | "system_notice";

// =============================================================================
// System Events (/api/events)
// =============================================================================

/**
 * Backend SystemEvent enum serializes as tagged JSON:
 * - InlineCall: {"InlineCall": {"type": "wallet_tx_request", "payload": {...}}}
 * - SystemNotice: {"SystemNotice": "message"}
 * - SystemError: {"SystemError": "message"}
 * - AsyncCallback: {"AsyncCallback": {...}} (not sent over HTTP)
 */
export type AomiSystemEvent =
  | { InlineCall: { type: string; payload?: unknown; [key: string]: unknown } }
  | { SystemNotice: string }
  | { SystemError: string }
  | { AsyncCallback: Record<string, unknown> };

// =============================================================================
// Type Guards
// =============================================================================

export function isInlineCall(
  event: AomiSystemEvent,
): event is { InlineCall: { type: string; payload?: unknown } } {
  return "InlineCall" in event;
}

export function isSystemNotice(
  event: AomiSystemEvent,
): event is { SystemNotice: string } {
  return "SystemNotice" in event;
}

export function isSystemError(
  event: AomiSystemEvent,
): event is { SystemError: string } {
  return "SystemError" in event;
}

export function isAsyncCallback(
  event: AomiSystemEvent,
): event is { AsyncCallback: Record<string, unknown> } {
  return "AsyncCallback" in event;
}
