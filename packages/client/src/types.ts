// =============================================================================
// User State
// =============================================================================

/**
 * Client-side user state synced with the backend.
 * Typically wallet connection info, but can be any key-value data.
 */
export type UserStateAAMode = "4337" | "7702";

export interface UserState extends Record<string, unknown> {
  address?: string | null;
  chain_id?: number | string | null;
  is_connected?: boolean | null;
  svm_address?: string | null;
  aa_mode?: UserStateAAMode | null;
  smart_account?: string | null;
}

/**
 * Known client surfaces that may want backend-specific UX strategies.
 * Additional string values are allowed for forward compatibility.
 */
export type AomiClientType = "ts_cli" | "web_ui" | (string & {});

export const CLIENT_TYPE_TS_CLI: AomiClientType = "ts_cli";
export const CLIENT_TYPE_WEB_UI: AomiClientType = "web_ui";

/** Wire values accepted by `/api/chat?payment_method=...`. */
export type AomiPaymentMethod = "null" | "byok" | "tempo" | "coinbase";

const USER_STATE_KEY_ALIASES: Record<string, string> = {
  chainId: "chain_id",
  isConnected: "is_connected",
  ensName: "ens_name",
  svmAddress: "svm_address",
  pendingTxs: "pending_txs",
  pendingEip712s: "pending_eip712s",
  pendingSolanaTxs: "pending_solana_txs",
  nextId: "next_id",
  aaMode: "aa_mode",
  smartAccount: "smart_account",
  smartAccountAddress: "smart_account",
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

function normalizeAddressForComparison(
  value: string | undefined,
): string | undefined {
  return typeof value === "string" ? value.toLowerCase() : undefined;
}

function parseUserStateAAMode(value: unknown): UserStateAAMode | null | undefined {
  if (value === null) {
    return null;
  }
  return value === "4337" || value === "7702" ? value : undefined;
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
  export function normalize(
    userState?: UserState | null,
  ): UserState | undefined {
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

    if (
      !incomingAddress &&
      canPreserveConnectedWalletContext &&
      previousAddress
    ) {
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
      !hasOwnKey(incoming, "aa_mode") &&
      canPreserveAAContext &&
      aaMode(previous) !== undefined
    ) {
      reconciled.aa_mode = aaMode(previous);
    }

    if (
      !hasOwnKey(incoming, "smart_account") &&
      canPreserveAAContext &&
      smartAccount(previous) !== undefined
    ) {
      reconciled.smart_account = smartAccount(previous);
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
    return typeof address === "string" && address.length > 0
      ? address
      : undefined;
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

  export function isConnected(
    userState?: UserState | null,
  ): boolean | undefined {
    const normalized = normalize(userState);
    const isConnected = normalized?.is_connected;
    return typeof isConnected === "boolean" ? isConnected : undefined;
  }

  export function aaMode(
    userState?: UserState | null,
  ): UserStateAAMode | null | undefined {
    const normalized = normalize(userState);
    return parseUserStateAAMode(normalized?.aa_mode);
  }

  export function smartAccount(
    userState?: UserState | null,
  ): string | null | undefined {
    const normalized = normalize(userState);
    return parseUserStateOptionalAddress(normalized?.smart_account);
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

export function normalizeUserState(
  userState?: UserState | null,
): UserState | undefined {
  return UserState.normalize(userState);
}

export function getUserStateAddress(
  userState?: UserState | null,
): string | undefined {
  return UserState.address(userState);
}

export function getUserStateChainId(
  userState?: UserState | null,
): number | undefined {
  return UserState.chainId(userState);
}

export function getUserStateIsConnected(
  userState?: UserState | null,
): boolean | undefined {
  return UserState.isConnected(userState);
}

export function getUserStateAAMode(
  userState?: UserState | null,
): UserStateAAMode | null | undefined {
  return UserState.aaMode(userState);
}

export function getUserStateSmartAccount(
  userState?: UserState | null,
): string | null | undefined {
  return UserState.smartAccount(userState);
}

export function addUserStateExt(
  userState: UserState,
  key: string,
  value: unknown,
): UserState {
  return UserState.withExt(userState, key, value);
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
  /** Optional EVM private key used to auto-sign x402 coinbase payment challenges. */
  x402PrivateKey?: string;
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
 * Lists or saves BYOK provider keys for the bound client.
 */
export interface AomiProviderKeyEntry {
  provider: string;
  key_prefix: string;
  label?: string | null;
  is_active: boolean;
}

export interface AomiListProviderKeysResponse {
  provider_keys: AomiProviderKeyEntry[];
}

export interface AomiSaveProviderKeyResponse {
  key: AomiProviderKeyEntry;
}

export interface AomiDeleteProviderKeyResponse {
  deleted: boolean;
}

export interface AomiPaymentOverviewByokEntry {
  provider: string;
  label?: string | null;
}

export interface AomiPaymentOverviewStreamEntry {
  method: string;
  receipt_id: string;
}

export interface AomiPaymentOverviewResponse {
  byok: AomiPaymentOverviewByokEntry[];
  streams: AomiPaymentOverviewStreamEntry[];
}

export interface AomiSaveTempoPaymentResponse {
  method: {
    method: string;
    receipt_id: string;
  };
}

export interface AomiDeletePaymentResponse {
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
