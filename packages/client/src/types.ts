// =============================================================================
// User State
// =============================================================================

/**
 * Client-side user state synced with the backend.
 * Typically wallet connection info, but can be any key-value data.
 */
export type UserStateAAMode = "4337" | "7702";

export interface UserState extends Record<string, unknown> {
  connection?: {
    is_connected?: boolean | null;
    primary_family?: "evm" | "solana" | "dual" | null;
    provider?: string | null;
    provider_label?: string | null;
  };
  evm?: {
    address?: string | null;
    chain_id?: number | string | null;
    ens_name?: string | null;
    aa?: {
      mode?: UserStateAAMode | null;
      smart_account?: string | null;
      provider?: "alchemy" | "pimlico" | null;
    };
    sponsorship?: {
      eligible?: boolean | null;
      required?: boolean | null;
      mode?: "disabled" | "optional" | "required" | null;
    };
  };
  solana?: {
    address?: string | null;
    cluster?: "solana:mainnet" | "solana:devnet" | "solana:testnet" | null;
    wallet_name?: string | null;
    transport?: "extension" | "embedded" | "mwa" | null;
    capabilities?: {
      can_sign_message?: boolean | null;
      can_sign_transaction?: boolean | null;
      can_sign_all_transactions?: boolean | null;
      can_send_transaction?: boolean | null;
      can_sign_and_send_transaction?: boolean | null;
    };
  };
  pending?: {
    evm_txs?: Record<string, unknown>;
    evm_sigs?: Record<string, unknown>;
    solana_txs?: Record<string, unknown>;
    solana_sigs?: Record<string, unknown>;
    eip712_requests?: Record<string, unknown>;
    solana_requests?: Record<string, unknown>;
  };
  ext?: Record<string, unknown> | null;
}

/**
 * Known client surfaces that may want backend-specific UX strategies.
 * Additional string values are allowed for forward compatibility.
 */
export type AomiClientType = "ts_cli" | "web_ui" | (string & {});

export const CLIENT_TYPE_TS_CLI: AomiClientType = "ts_cli";
export const CLIENT_TYPE_WEB_UI: AomiClientType = "web_ui";

const USER_STATE_ROOT_ALIAS_KEYS = new Set([
  "address",
  "chain_id",
  "chainId",
  "is_connected",
  "isConnected",
  "ens_name",
  "ensName",
  "svm_address",
  "svmAddress",
  "aa_mode",
  "aaMode",
  "smart_account",
  "smartAccount",
  "smartAccountAddress",
  "sponsorship",
  "pending_txs",
  "pendingTxs",
  "pending_evm_sigs",
  "pendingEvmSigs",
  "pending_eip712s",
  "pendingEip712s",
  "pending_solana_txs",
  "pendingSolanaTxs",
  "pending_solana_sigs",
  "pendingSolanaSigs",
  "next_id",
  "nextId",
  "connection",
  "evm",
  "solana",
  "pending",
  "ext",
]);

type UnknownRecord = Record<string, unknown>;
type UserStateConnection = NonNullable<UserState["connection"]>;
type UserStateEvm = NonNullable<UserState["evm"]>;
type UserStateEvmAa = NonNullable<UserStateEvm["aa"]>;
type UserStateEvmSponsorship = NonNullable<UserStateEvm["sponsorship"]>;
type UserStateSolana = NonNullable<UserState["solana"]>;
type UserStateSolanaCapabilities = NonNullable<UserStateSolana["capabilities"]>;

function asRecord(value: unknown): UnknownRecord | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as UnknownRecord;
}

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

function parseUserStateConnectionFamily(
  value: unknown,
): UserStateConnection["primary_family"] | undefined {
  return value === "evm" || value === "solana" || value === "dual"
    ? value
    : undefined;
}

function parseUserStateRawChainId(
  value: unknown,
): UserStateEvm["chain_id"] | undefined {
  return typeof value === "number" || typeof value === "string" || value === null
    ? value
    : undefined;
}

function normalizeAddressForComparison(value: string | undefined): string | undefined {
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

function compactRecord<T extends Record<string, unknown>>(value: T): T | undefined {
  const entries = Object.entries(value).filter(([, entry]) => entry !== undefined);
  if (entries.length === 0) {
    return undefined;
  }
  return Object.fromEntries(entries) as T;
}

function normalizeConnectionState(
  userState: UserState,
): UserState["connection"] | undefined {
  const root = userState as UnknownRecord;
  const connection = asRecord(userState.connection);
  return compactRecord<UserStateConnection>({
    is_connected:
      typeof connection?.is_connected === "boolean"
        ? connection.is_connected
        : typeof connection?.isConnected === "boolean"
          ? connection.isConnected
          : typeof root.is_connected === "boolean"
            ? root.is_connected
            : typeof root.isConnected === "boolean"
              ? root.isConnected
              : undefined,
    primary_family:
      parseUserStateConnectionFamily(connection?.primary_family) ??
      parseUserStateConnectionFamily(connection?.primaryFamily),
    provider:
      typeof connection?.provider === "string"
        ? connection.provider
        : undefined,
    provider_label:
      typeof connection?.provider_label === "string"
        ? connection.provider_label
        : typeof connection?.providerLabel === "string"
          ? connection.providerLabel
          : undefined,
  });
}

function normalizeEvmState(userState: UserState): UserState["evm"] | undefined {
  const root = userState as UnknownRecord;
  const evm = asRecord(userState.evm);
  const evmAa = asRecord(evm?.aa);
  const evmSponsorship = asRecord(evm?.sponsorship);

  const aa = compactRecord<UserStateEvmAa>({
    mode:
      parseUserStateAAMode(evmAa?.mode) ??
      parseUserStateAAMode(evmAa?.aa_mode) ??
      parseUserStateAAMode(root.aa_mode) ??
      parseUserStateAAMode(root.aaMode),
    smart_account:
      parseUserStateOptionalAddress(evmAa?.smart_account) ??
      parseUserStateOptionalAddress(evmAa?.smartAccount) ??
      parseUserStateOptionalAddress(root.smart_account) ??
      parseUserStateOptionalAddress(root.smartAccount) ??
      parseUserStateOptionalAddress(root.smartAccountAddress),
    provider:
      evmAa?.provider === "alchemy" || evmAa?.provider === "pimlico"
        ? evmAa.provider
        : undefined,
  });

  const sponsorship = compactRecord<UserStateEvmSponsorship>({
    eligible:
      typeof evmSponsorship?.eligible === "boolean"
        ? evmSponsorship.eligible
        : undefined,
    required:
      typeof evmSponsorship?.required === "boolean"
        ? evmSponsorship.required
        : undefined,
    mode:
      evmSponsorship?.mode === "disabled" ||
      evmSponsorship?.mode === "optional" ||
      evmSponsorship?.mode === "required"
        ? evmSponsorship.mode
        : undefined,
  });

  return compactRecord<UserStateEvm>({
    address:
      parseUserStateOptionalAddress(evm?.address) ??
      parseUserStateOptionalAddress(root.address),
    chain_id:
      parseUserStateRawChainId(evm?.chain_id) ??
      parseUserStateRawChainId(evm?.chainId) ??
      parseUserStateRawChainId(root.chain_id) ??
      parseUserStateRawChainId(root.chainId),
    ens_name:
      parseUserStateOptionalAddress(evm?.ens_name) ??
      parseUserStateOptionalAddress(evm?.ensName) ??
      parseUserStateOptionalAddress(root.ens_name) ??
      parseUserStateOptionalAddress(root.ensName),
    aa,
    sponsorship:
      sponsorship ??
      (asRecord(root.sponsorship) as UserStateEvmSponsorship | undefined),
  });
}

function normalizeSolanaState(
  userState: UserState,
): UserState["solana"] | undefined {
  const root = userState as UnknownRecord;
  const solana = asRecord(userState.solana);
  const capabilities = asRecord(solana?.capabilities);

  return compactRecord<UserStateSolana>({
    address:
      parseUserStateOptionalAddress(solana?.address) ??
      parseUserStateOptionalAddress(root.solanaAddress) ??
      parseUserStateOptionalAddress(root.svm_address) ??
      parseUserStateOptionalAddress(root.svmAddress),
    cluster:
      solana?.cluster === "solana:mainnet" ||
      solana?.cluster === "solana:devnet" ||
      solana?.cluster === "solana:testnet"
        ? solana.cluster
        : undefined,
    wallet_name:
      parseUserStateOptionalAddress(solana?.wallet_name) ??
      parseUserStateOptionalAddress(solana?.walletName),
    transport:
      solana?.transport === "extension" ||
      solana?.transport === "embedded" ||
      solana?.transport === "mwa"
        ? solana.transport
        : undefined,
    capabilities: compactRecord<UserStateSolanaCapabilities>({
      can_sign_message:
        typeof capabilities?.can_sign_message === "boolean"
          ? capabilities.can_sign_message
          : typeof capabilities?.canSignMessage === "boolean"
            ? capabilities.canSignMessage
            : undefined,
      can_sign_transaction:
        typeof capabilities?.can_sign_transaction === "boolean"
          ? capabilities.can_sign_transaction
          : typeof capabilities?.canSignTransaction === "boolean"
            ? capabilities.canSignTransaction
            : undefined,
      can_sign_all_transactions:
        typeof capabilities?.can_sign_all_transactions === "boolean"
          ? capabilities.can_sign_all_transactions
          : typeof capabilities?.canSignAllTransactions === "boolean"
            ? capabilities.canSignAllTransactions
            : undefined,
      can_send_transaction:
        typeof capabilities?.can_send_transaction === "boolean"
          ? capabilities.can_send_transaction
          : typeof capabilities?.canSendTransaction === "boolean"
            ? capabilities.canSendTransaction
            : undefined,
      can_sign_and_send_transaction:
        typeof capabilities?.can_sign_and_send_transaction === "boolean"
          ? capabilities.can_sign_and_send_transaction
          : typeof capabilities?.canSignAndSendTransaction === "boolean"
            ? capabilities.canSignAndSendTransaction
            : undefined,
    }),
  });
}

function normalizePendingState(
  userState: UserState,
): UserState["pending"] | undefined {
  const root = userState as UnknownRecord;
  const pending = asRecord(userState.pending);
  return compactRecord({
    evm_txs:
      asRecord(pending?.evm_txs) ??
      asRecord(pending?.evmTxs) ??
      asRecord(root.pending_txs) ??
      asRecord(root.pendingTxs),
    evm_sigs:
      asRecord(pending?.evm_sigs) ??
      asRecord(pending?.evmSigs) ??
      asRecord(pending?.eip712_requests) ??
      asRecord(pending?.eip712Requests) ??
      asRecord(root.pending_evm_sigs) ??
      asRecord(root.pendingEvmSigs) ??
      asRecord(root.pending_eip712s) ??
      asRecord(root.pendingEip712s),
    solana_txs:
      asRecord(pending?.solana_txs) ??
      asRecord(pending?.solanaTxs) ??
      asRecord(pending?.solana_requests) ??
      asRecord(pending?.solanaRequests) ??
      asRecord(root.pending_solana_txs) ??
      asRecord(root.pendingSolanaTxs),
    solana_sigs:
      asRecord(pending?.solana_sigs) ??
      asRecord(pending?.solanaSigs) ??
      asRecord(root.pending_solana_sigs) ??
      asRecord(root.pendingSolanaSigs),
  });
}

function clearDisconnectedWalletState(
  userState: UserState,
): UserState {
  const next = UserState.normalize(userState) ?? {};
  return {
    ...next,
    connection: {
      ...(next.connection ?? {}),
      is_connected: false,
      primary_family: null,
    },
    evm: compactRecord({
      ...(next.evm ?? {}),
      address: undefined,
      chain_id: undefined,
      ens_name: undefined,
      aa: compactRecord({
        ...(next.evm?.aa ?? {}),
        mode: null,
        smart_account: null,
        provider: null,
      }),
    }),
    solana: compactRecord({
      ...(next.solana ?? {}),
      address: undefined,
      wallet_name: undefined,
      transport: undefined,
      capabilities: undefined,
    }),
  };
}

function mergeNormalizedUserState(
  previous: UserState | undefined,
  incoming: UserState,
): UserState {
  return {
    ...(previous ?? {}),
    ...incoming,
    connection:
      previous?.connection || incoming.connection
        ? {
            ...(previous?.connection ?? {}),
            ...(incoming.connection ?? {}),
          }
        : undefined,
    evm:
      previous?.evm || incoming.evm
        ? {
            ...(previous?.evm ?? {}),
            ...(incoming.evm ?? {}),
            aa:
              previous?.evm?.aa || incoming.evm?.aa
                ? {
                    ...(previous?.evm?.aa ?? {}),
                    ...(incoming.evm?.aa ?? {}),
                  }
                : undefined,
            sponsorship:
              previous?.evm?.sponsorship || incoming.evm?.sponsorship
                ? {
                    ...(previous?.evm?.sponsorship ?? {}),
                    ...(incoming.evm?.sponsorship ?? {}),
                  }
                : undefined,
          }
        : undefined,
    solana:
      previous?.solana || incoming.solana
        ? {
            ...(previous?.solana ?? {}),
            ...(incoming.solana ?? {}),
            capabilities:
              previous?.solana?.capabilities || incoming.solana?.capabilities
                ? {
                    ...(previous?.solana?.capabilities ?? {}),
                    ...(incoming.solana?.capabilities ?? {}),
                  }
                : undefined,
          }
        : undefined,
    pending:
      previous?.pending || incoming.pending
        ? {
            ...(previous?.pending ?? {}),
            ...(incoming.pending ?? {}),
          }
        : undefined,
    ext:
      incoming.ext !== undefined
        ? incoming.ext
        : previous?.ext,
  };
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
    const connection = normalizeConnectionState(userState);
    const evm = normalizeEvmState(userState);
    const solana = normalizeSolanaState(userState);
    const pending = normalizePendingState(userState);
    const ext = userState.ext === null ? null : asRecord(userState.ext);

    if (connection) normalized.connection = connection;
    if (evm) normalized.evm = evm;
    if (solana) normalized.solana = solana;
    if (pending) normalized.pending = pending;
    if (ext !== undefined) normalized.ext = ext;

    for (const [key, value] of Object.entries(userState)) {
      if (USER_STATE_ROOT_ALIAS_KEYS.has(key)) {
        continue;
      }
      normalized[key] = value;
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
    const reconciled = mergeNormalizedUserState(previous, incoming);

    const previousAddress = address(previous);
    const incomingAddress = address(incoming);
    const previousSolanaAddress = solanaAddress(previous);
    const incomingSolanaAddress = solanaAddress(incoming);
    const incomingConnected = isConnected(incoming);
    const incomingChainId = chainId(incoming);

    const canPreserveConnectedWalletContext = incomingConnected !== false;
    const sameAddress =
      normalizeAddressForComparison(previousAddress) !== undefined &&
      normalizeAddressForComparison(previousAddress) ===
        normalizeAddressForComparison(incomingAddress);

    if (!incomingAddress && canPreserveConnectedWalletContext && previousAddress) {
      reconciled.evm = {
        ...(reconciled.evm ?? {}),
        address: previousAddress,
      };
    }

    if (
      !incomingSolanaAddress &&
      canPreserveConnectedWalletContext &&
      previousSolanaAddress
    ) {
      reconciled.solana = {
        ...(reconciled.solana ?? {}),
        address: previousSolanaAddress,
      };
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
        reconciled.evm = {
          ...(reconciled.evm ?? {}),
          chain_id: chainId(previous),
        };
      }
    }

    const canPreserveAAContext =
      canPreserveConnectedWalletContext &&
      previous !== undefined &&
      (sameAddress || (!incomingAddress && !!previousAddress));

    if (
      !hasOwnKey(incoming.evm?.aa as UserState | undefined, "mode") &&
      canPreserveAAContext &&
      aaMode(previous) !== undefined
    ) {
      reconciled.evm = {
        ...(reconciled.evm ?? {}),
        aa: {
          ...(reconciled.evm?.aa ?? {}),
          mode: aaMode(previous),
        },
      };
    }

    if (
      !hasOwnKey(incoming.evm?.aa as UserState | undefined, "smart_account") &&
      canPreserveAAContext &&
      smartAccount(previous) !== undefined
    ) {
      reconciled.evm = {
        ...(reconciled.evm ?? {}),
        aa: {
          ...(reconciled.evm?.aa ?? {}),
          smart_account: smartAccount(previous),
        },
      };
    }

    if (incoming.connection?.is_connected === false) {
      return clearDisconnectedWalletState(reconciled);
    }

    return reconciled;
  }

  export function address(userState?: UserState | null): string | undefined {
    const normalized = normalize(userState);
    const address = normalized?.evm?.address;
    return typeof address === "string" && address.length > 0 ? address : undefined;
  }

  /**
   * Connected Solana wallet pubkey (base58). Independent of `address`,
   * which is the EVM address. A session may have either, both, or neither.
   */
  export function solanaAddress(userState?: UserState | null): string | undefined {
    const normalized = normalize(userState);
    const value = normalized?.solana?.address;
    return typeof value === "string" && value.length > 0 ? value : undefined;
  }

  export const svmAddress = solanaAddress;

  export function chainId(userState?: UserState | null): number | undefined {
    const normalized = normalize(userState);
    return parseUserStateChainId(normalized?.evm?.chain_id);
  }

  export function isConnected(userState?: UserState | null): boolean | undefined {
    const normalized = normalize(userState);
    const connectionFlag = normalized?.connection?.is_connected;
    if (connectionFlag === false) {
      return false;
    }
    if (connectionFlag === true) {
      return true;
    }
    return Boolean(address(normalized) || solanaAddress(normalized));
  }

  export function aaMode(
    userState?: UserState | null,
  ): UserStateAAMode | null | undefined {
    const normalized = normalize(userState);
    return parseUserStateAAMode(normalized?.evm?.aa?.mode);
  }

  export function smartAccount(
    userState?: UserState | null,
  ): string | null | undefined {
    const normalized = normalize(userState);
    return parseUserStateOptionalAddress(normalized?.evm?.aa?.smart_account);
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

export function getUserStateSolanaAddress(
  userState?: UserState | null,
): string | undefined {
  return UserState.solanaAddress(userState);
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
