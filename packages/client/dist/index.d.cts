import * as viem from 'viem';
import { Hex, Chain, TransactionReceipt } from 'viem';

declare function address(userState?: UserState | null): string | undefined;
declare function svmAddress(userState?: UserState | null): string | undefined;
declare function chainId(userState?: UserState | null): number | undefined;
declare function ensName(userState?: UserState | null): string | undefined;
declare function aaMode(userState?: UserState | null): UserStateAAMode | null | undefined;
declare function SmartAccount4337(userState?: UserState | null): string | null | undefined;
declare function Delegation7702(userState?: UserState | null): string | null | undefined;
declare function walletKind(userState?: UserState | null): UserStateWalletKind | undefined;
declare function isConnected(userState?: UserState | null): boolean | undefined;
declare function walletProvider(userState?: UserState | null): UserStateWalletProvider | null | undefined;
declare function walletProviderSubject(userState?: UserState | null): string | null | undefined;
declare function authMethod(userState?: UserState | null): UserStateAuthMethod | null | undefined;
declare function authValue(userState?: UserState | null): string | null | undefined;
declare function authVerifiedAt(userState?: UserState | null): number | null | undefined;
declare function sponsored(userState?: UserState | null): boolean | null | undefined;
declare function sponsorProvider(userState?: UserState | null): UserStateSponsorProvider | null | undefined;
declare function sponsorAccount(userState?: UserState | null): string | null | undefined;
declare function withExt(userState: UserState, key: string, value: unknown): UserState;

declare function normalizeUserState(userState?: UserState | null): UserState | undefined;
declare function reconcileUserState(previousUserState?: UserState | null, incomingUserState?: UserState | null): UserState | undefined;

/**
 * Client-side user state synced with the backend.
 * Typically wallet connection info, but can be any key-value data.
 */
type UserStateAAMode = "none" | "4337" | "7702";
type UserStateWalletKind = "eoa" | "smart-account";
type UserStateWalletProvider = "para" | "privy" | "baseAccount";
type UserStateAuthMethod = "google" | "apple" | "facebook" | "x" | "discord" | "github" | "farcaster" | "telegram" | "email" | "phone" | "wagmi";
type UserStateSponsorProvider = "alchemy" | "coinbase" | "pimlico" | "self";
/** Session-level connection facts shared across chain families. */
interface UserStateConnection extends Record<string, unknown> {
    is_connected?: boolean | null;
    provider?: UserStateWalletProvider | null;
    provider_label?: string | null;
    wallet_provider_subject?: string | null;
    auth_method?: UserStateAuthMethod | null;
    auth_value?: string | null;
    auth_verified_at?: number | string | null;
}
/** EVM account-abstraction sub-state (`evm.aa`). */
interface UserStateEvmAa extends Record<string, unknown> {
    mode?: UserStateAAMode | null;
    /** Smart-account executor address (4337). */
    smart_account?: string | null;
    /** 7702 delegation contract address. */
    delegation_7702?: string | null;
    /** Bundler / AA infra provider, e.g. "alchemy". */
    provider?: string | null;
}
/** EVM sponsorship sub-state (`evm.sponsorship`). */
interface UserStateEvmSponsorship extends Record<string, unknown> {
    eligible?: boolean | null;
    required?: boolean | null;
    mode?: string | null;
    sponsored?: boolean | null;
    sponsor_provider?: UserStateSponsorProvider | null;
    sponsor_account?: string | null;
}
/** EVM-family wallet block (`evm`). */
interface UserStateEvm extends Record<string, unknown> {
    address?: string | null;
    chain_id?: number | string | null;
    ens_name?: string | null;
    aa?: UserStateEvmAa | null;
    sponsorship?: UserStateEvmSponsorship | null;
}
/** Solana-family wallet block (`svm`). */
interface UserStateSvm extends Record<string, unknown> {
    address?: string | null;
    cluster?: string | null;
    wallet_name?: string | null;
    transport?: string | null;
    /** Wallet-Standard capability identifiers, e.g. `"can_sign_message"`. */
    capabilities?: string[] | null;
}
/**
 * Backend-pushed in-flight wallet requests, chain-bucketed. Shape is owned by
 * the backend; parsed by helpers like `pendingTxsFromBackendUserState`. The
 * client forwards them transparently via reconciliation.
 */
interface UserStatePending extends Record<string, unknown> {
    evm_txs?: Record<string, unknown> | null;
    evm_sigs?: Record<string, unknown> | null;
    svm_ixs?: Record<string, unknown> | null;
    svm_sigs?: Record<string, unknown> | null;
}
/**
 * Known client surfaces that may want backend-specific UX strategies.
 * Additional string values are allowed for forward compatibility.
 */
type AomiClientType = "ts_cli" | "web_ui" | (string & {});
declare const CLIENT_TYPE_TS_CLI: AomiClientType;
declare const CLIENT_TYPE_WEB_UI: AomiClientType;
/**
 * Client-side user state, canonicalized to the backend's nested snake_case
 * wire shape. EVM and Solana identities are independent blocks (`evm` / `svm`)
 * so a single session can carry both families at once. `normalize` accepts the
 * backend's nested camelCase responses and legacy flat host input, and emits
 * this canonical shape.
 */
interface UserState extends Record<string, unknown> {
    connection?: UserStateConnection | null;
    evm?: UserStateEvm | null;
    svm?: UserStateSvm | null;
    pending?: UserStatePending | null;
    ext?: Record<string, unknown> | null;
    preferences?: Record<string, unknown> | null;
}
declare namespace UserState {
    const normalize: typeof normalizeUserState;
    const reconcile: typeof reconcileUserState;
    const address: typeof address;
    const evmAddress: typeof address;
    const svmAddress: typeof svmAddress;
    const chainId: typeof chainId;
    const ensName: typeof ensName;
    const aaMode: typeof aaMode;
    const SmartAccount4337: typeof SmartAccount4337;
    const Delegation7702: typeof Delegation7702;
    const walletKind: typeof walletKind;
    const isConnected: typeof isConnected;
    const walletProvider: typeof walletProvider;
    const walletProviderSubject: typeof walletProviderSubject;
    const authMethod: typeof authMethod;
    const authValue: typeof authValue;
    const authVerifiedAt: typeof authVerifiedAt;
    const sponsored: typeof sponsored;
    const sponsorProvider: typeof sponsorProvider;
    const sponsorAccount: typeof sponsorAccount;
    const withExt: typeof withExt;
}

/**
 * Optional logger for debug output. Pass `console` or any compatible object.
 */
type Logger = {
    debug: (...args: unknown[]) => void;
};
type AomiClientOptions = {
    /** Base URL of the Aomi backend (e.g. "https://api.aomi.dev" or "/" for same-origin proxying) */
    baseUrl: string;
    /** Optional fetch implementation for payment-aware browser transports and tests. */
    fetch?: typeof fetch;
    /** Default API key for non-default apps */
    apiKey?: string;
    /** Supplies a short-lived Aomi account bearer for REST and SSE requests. */
    getAccountBearer?: GetAccountBearer;
    /** Optional logger for debug output (default: silent) */
    logger?: Logger;
};
type GetAccountBearer = (options?: {
    /** Force a refresh after an API 401. */
    forceRefresh?: boolean;
}) => Promise<string | null | undefined>;
type AomiRequestQueryValue = string | number | boolean | readonly (string | number | boolean)[] | null | undefined;
type AomiPlatformFilter = string | readonly string[] | null | undefined;
type AomiHttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
interface AomiRequestOptions {
    /** Thread id for thread-scoped routes. Kept as sessionId for SDK compatibility. */
    sessionId?: string;
    /** App key for app-key checked routes; defaults to the client's apiKey. */
    apiKey?: string;
    /** Query params appended to the request URL. */
    query?: Record<string, AomiRequestQueryValue>;
    /** JSON request payload. */
    body?: unknown;
    /** Extra request headers. */
    headers?: HeadersInit;
    /** Use the native fetch path instead of a custom payment-aware fetch wrapper. */
    raw?: boolean;
}
interface AomiMessage {
    sender?: "user" | "agent" | "system" | string;
    content?: string;
    timestamp?: string;
    is_streaming?: boolean;
    tool_result?: [string, string] | null;
}
/**
 * GET /api/thread/state
 * Fetches current session state including messages and processing status
 */
interface AomiStateResponse {
    messages?: AomiMessage[] | null;
    system_events?: AomiSystemEvent[] | null;
    title?: string | null;
    is_processing?: boolean;
    user_state?: UserState | null;
}
/**
 * POST /api/thread/chat
 * Sends a chat message and returns updated session state
 */
interface AomiChatResponse {
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
interface AomiSystemResponse {
    res?: AomiMessage | null;
}
/**
 * POST /api/exec/simulate
 * Batch-simulate pending transactions atomically (snapshot → sequential send → revert).
 */
interface AomiSimulateFee {
    /** Treasury address to receive the fee. */
    recipient: string;
    /** Fee amount in wei (decimal string). */
    amount_wei: string;
    /** Token type — always "native" for now. */
    token: "native";
}
interface AomiSimulateResponse {
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
            tx: {
                to: string;
                value_wei: string;
                value_eth: string;
                data: string;
            };
        }>;
    };
}
/**
 * POST /api/thread/interrupt
 * Interrupts current processing and returns updated session state
 */
type AomiInterruptResponse = AomiChatResponse;
/**
 * GET /api/threads
 * Returns array of AomiThread
 */
interface AomiThread {
    thread_id?: string;
    session_id: string;
    title: string | null;
    is_archived?: boolean;
}
type AomiAccountResponse = AomiAccountProfile;
/**
 * POST /api/threads
 * Creates a new thread/session
 */
interface AomiCreateThreadResponse {
    thread_id?: string;
    session_id: string;
    title?: string | null;
}
/**
 * GET /api/account
 * The account bound to the authenticated request (resolved from the account
 * bearer). Returned only when the session is bound to a real user; an
 * anonymous session yields HTTP 400.
 */
interface AomiUser {
    user_id: string;
    username?: string | null;
    apps?: string[];
    tier?: string;
    verified_email?: string | null;
    status?: string;
    last_seen_at?: number | null;
    created_at?: number;
    updated_at?: number;
}
interface AomiAuthIdentity {
    id: number;
    application?: string | null;
    wallet_provider: string;
    auth_method: string;
    auth_verified_at?: number | null;
    is_primary: boolean;
    created_at: number;
}
interface AomiIdentityWallet {
    wallet_id?: string | null;
    address: string;
    chain_type: string;
    wallet_provider: string;
}
interface AomiUsageStats {
    period_utc_month?: string;
    input_tokens: number;
    output_tokens: number;
    credit_used: number;
    credit_paid: number;
}
interface AomiAccountProfile {
    user: AomiUser;
    auth_identities?: AomiAuthIdentity[];
    identity_wallets?: AomiIdentityWallet[];
    usage?: AomiUsageStats;
}
interface AomiCreateApprovalRequest {
    auth_identity_id: number;
    grant_kind: string;
    secret_handle: string;
    external_subject?: string | null;
    display_label?: string | null;
    scopes?: string[];
    expires_at?: number | null;
    metadata?: unknown;
}
interface AomiAccessApproval {
    id: number;
    user_id: string;
    auth_identity_id: number;
    external_subject?: string | null;
    display_label?: string | null;
    grant_kind: string;
    scopes: string[];
    secret_handle: string;
    expires_at?: number | null;
    granted_at: number;
    revoked_at?: number | null;
    metadata: unknown;
    created_at: number;
    updated_at: number;
}
interface AomiBeginAccountAuthResponse {
    state_token: string;
    auth_url: string;
    expires_at: number;
}
type AomiWalletFamily = "evm" | "svm";
type AomiAuthWalletFamily = "evm" | "solana";
/**
 * GET/POST/DELETE /api/account/payment/byok
 * Lists or saves BYOK keys (one per LLM provider) for the account.
 */
interface AomiByokKeyEntry {
    provider: string;
    key_prefix: string;
    label?: string | null;
    is_active: boolean;
}
/**
 * Base SSE event. Newer backends may include `thread_id`; `session_id` stays
 * optional for SDK compatibility with existing consumers.
 */
type AomiSSEEvent = {
    type: "title_changed" | "tool_update" | "tool_complete" | "system_notice" | string;
    session_id?: string;
    thread_id?: string;
    new_title?: string;
    [key: string]: unknown;
};
/**
 * POST /api/secrets
 * Ingests secrets for a client, returns opaque handles
 */
interface AomiIngestSecretsResponse {
    handles: Record<string, string>;
}
/**
 * DELETE /api/secrets
 * Clears all secrets for a client
 */
interface AomiClearSecretsResponse {
    cleared: boolean;
}
/**
 * DELETE /api/secrets/:name
 * Removes a single secret for a client
 */
interface AomiDeleteSecretResponse {
    deleted: boolean;
}
/**
 * GET /api/secrets
 * Per-app slot names currently filled for the session's client. The
 * backend never returns raw values; only the names.
 */
interface AomiListSecretsResponse {
    by_app: Record<string, string[]>;
}
/**
 * One per-app secret slot declared by a plugin manifest. Surfaced via
 * `AomiAppDescriptor.secrets` so the frontend can render input rows and
 * gate app load on `required` slots being filled.
 */
interface AomiSecretSlot {
    name: string;
    description: string;
    required: boolean;
}
/**
 * GET /api/thread/apps
 * One entry per app the user can use. `secrets` is empty for apps that
 * declare no slots.
 */
interface AomiAppDescriptor {
    name: string;
    applicationId?: number | string | null;
    platform?: string | null;
    label?: string | null;
    appReleaseTag?: string | null;
    isActive?: boolean | null;
    isPublic?: boolean | null;
    artifactReady?: boolean | null;
    secrets?: AomiSecretSlot[];
}
type AomiSSEEventType = "title_changed" | "tool_update" | "tool_complete" | "system_notice";
/**
 * Backend SystemEvent enum serializes as tagged JSON:
 * - InlineCall: {"InlineCall": {"type": "wallet_tx_request", "payload": {...}}}
 * - SystemNotice: {"SystemNotice": "message"}
 * - SystemError: {"SystemError": "message"}
 * - AsyncCallback: {"AsyncCallback": {...}} (not sent over HTTP)
 */
type AomiSystemEvent = {
    InlineCall: {
        type: string;
        payload?: unknown;
        [key: string]: unknown;
    };
} | {
    SystemNotice: string;
} | {
    SystemError: string;
} | {
    AsyncCallback: Record<string, unknown>;
};
declare function isInlineCall(event: AomiSystemEvent): event is {
    InlineCall: {
        type: string;
        payload?: unknown;
    };
};
declare function isSystemNotice(event: AomiSystemEvent): event is {
    SystemNotice: string;
};
declare function isSystemError(event: AomiSystemEvent): event is {
    SystemError: string;
};
declare function isAsyncCallback(event: AomiSystemEvent): event is {
    AsyncCallback: Record<string, unknown>;
};

declare class AomiClient {
    private readonly baseUrl;
    private readonly apiKey?;
    private readonly fetchImpl;
    private readonly rawFetchImpl;
    private readonly logger?;
    private readonly sseSubscriber;
    constructor(options: AomiClientOptions);
    /**
     * Low-level request escape hatch for the full backend route manifest.
     * Prefer the typed helpers below for common chat/session/account flows.
     */
    request<T = unknown>(method: AomiHttpMethod, path: string, options?: AomiRequestOptions): Promise<T>;
    /**
     * Fetch current session state (messages, processing status, title).
     */
    fetchState(sessionId: string, userState?: UserState, clientId?: string): Promise<AomiStateResponse>;
    /**
     * Send a chat message and return updated session state.
     */
    sendMessage(sessionId: string, message: string, options?: {
        app?: string;
        applicationId?: number | string | null;
        apiKey?: string;
        userState?: UserState;
        clientId?: string;
    }): Promise<AomiChatResponse>;
    /**
     * Send a system-level message (e.g. wallet state changes, context switches).
     * Pass `app` to preserve the session's active app context (prevents the
     * backend from resetting to the default app when no app is specified).
     */
    sendSystemMessage(sessionId: string, message: string, options?: {
        app?: string;
        applicationId?: number | string | null;
    }): Promise<AomiSystemResponse>;
    /**
     * Interrupt the AI's current response.
     */
    interrupt(sessionId: string): Promise<AomiInterruptResponse>;
    /**
     * Ingest secrets for a client. Returns opaque `$SECRET:<name>` handles.
     *
     * When `app` is provided, the values land in the per-app store keyed by
     * `(client_id, app)` — this is the path the Secrets settings page uses
     * (one app at a time). When `app` is omitted, secrets land in the flat
     * client store (used by BYOK and other cross-app pools).
     */
    ingestSecrets(sessionId: string, clientId: string, secrets: Record<string, string>, app?: string): Promise<AomiIngestSecretsResponse>;
    /**
     * Clear secrets for a client. With `app`, removes every slot under that
     * app. Without `app`, clears the entire client (legacy behavior — wipes
     * both stores and unbinds the session).
     */
    clearSecrets(sessionId: string, clientId: string, app?: string): Promise<AomiClearSecretsResponse>;
    /**
     * Remove a single named secret. With `app`, targets the per-app store
     * under that scope; without, targets the flat store.
     */
    deleteSecret(sessionId: string, clientId: string, name: string, app?: string): Promise<AomiDeleteSecretResponse>;
    /**
     * List currently stored secret names per app for this client. The
     * backend never returns raw values; the settings page uses this as the
     * source of truth instead of trusting localStorage.
     */
    listSecrets(sessionId: string, clientId?: string): Promise<AomiListSecretsResponse>;
    /**
     * Subscribe to real-time SSE updates for a session.
     * Automatically reconnects with exponential backoff on disconnects.
     * Returns an unsubscribe function.
     */
    subscribeSSE(sessionId: string, onUpdate: (event: AomiSSEEvent) => void, onError?: (error: unknown) => void): () => void;
    /**
     * @deprecated Account bootstrap is handled by session create/chat requests and
     * the account-token exchange. `/api/account` is now an authenticated
     * profile endpoint, so this legacy helper intentionally does nothing.
     */
    ensureAccount(_sessionId: string, _publicKey: string): Promise<void>;
    /**
     * List all threads for the authenticated account.
     */
    listThreads(sessionId: string): Promise<AomiThread[]>;
    /**
     * Get a single thread by ID.
     */
    getThread(sessionId: string): Promise<AomiThread>;
    /**
     * Create a new thread. The client generates the session ID.
     */
    createThread(threadId: string): Promise<AomiCreateThreadResponse>;
    /**
     * Delete a thread by ID.
     */
    deleteThread(sessionId: string): Promise<void>;
    /**
     * Rename a thread.
     */
    renameThread(sessionId: string, newTitle: string): Promise<void>;
    /**
     * Archive a thread.
     */
    archiveThread(sessionId: string): Promise<void>;
    /**
     * Unarchive a thread.
     */
    unarchiveThread(sessionId: string): Promise<void>;
    /**
     * Get system events for a session.
     */
    getSystemEvents(sessionId: string, count?: number): Promise<AomiSystemEvent[]>;
    /**
     * Get available apps as full descriptors (name + declared secret slots).
     * The settings page consumes the slot info to render per-app inputs and
     * the chat shell uses it to gate app load when required slots are unfilled.
     */
    getApps(sessionId: string, options?: {
        apiKey?: string;
        platforms?: AomiPlatformFilter;
    }): Promise<AomiAppDescriptor[]>;
    /**
     * Fetch the account bound to the authenticated request (resolved from the
     * account bearer). Returns `null` when the session is not bound to a real
     * user — the backend answers `/api/account` with HTTP 400 for
     * anonymous sessions, which is the normal "no bearer / not logged in" case
     * rather than an error.
     */
    fetchAccountProfile(sessionId: string): Promise<AomiAccountProfile | null>;
    /**
     * Fetch the full account for the authenticated request. Throws on any
     * non-OK response; use `fetchAccountProfile` for the null-on-anonymous
     * variant.
     */
    getAccount(sessionId: string): Promise<AomiAccountResponse>;
    createAccountApproval(request: AomiCreateApprovalRequest): Promise<AomiAccessApproval>;
    /**
     * Mint a Privy browser auth URL bound to the current backend session.
     */
    beginPrivyAuth(sessionId: string, options?: {
        application?: string;
        walletFamily?: AomiAuthWalletFamily;
    }): Promise<AomiBeginAccountAuthResponse>;
    /**
     * Get available models.
     */
    getModels(sessionId: string, options?: {
        apiKey?: string;
    }): Promise<string[]>;
    /**
     * Set the model for a session.
     */
    setModel(sessionId: string, rig: string, options?: {
        app?: string;
        applicationId?: number | string | null;
        apiKey?: string;
        clientId?: string;
    }): Promise<{
        success: boolean;
        rig: string;
        baml: string;
        created: boolean;
    }>;
    /**
     * List BYOK keys (one per LLM provider) bound to the current account.
     */
    listByokKeys(sessionId: string): Promise<AomiByokKeyEntry[]>;
    /**
     * Save or replace a BYOK key for the current account.
     */
    saveByokKey(sessionId: string, provider: string, byokKey: string, label?: string): Promise<AomiByokKeyEntry>;
    /**
     * Delete a BYOK key for the current account.
     */
    deleteByokKey(sessionId: string, provider: string): Promise<boolean>;
    /**
     * Simulate transactions as an atomic batch.
     * Each tx sees state changes from previous txs (e.g., approve → swap).
     * Sends full tx payloads — the backend does not look up by ID.
     */
    simulateBatch(sessionId: string, transactions: Array<{
        to: string;
        value?: string;
        data?: string;
        label?: string;
        chain_id?: number;
        chainId?: number;
    }>, options?: {
        from?: string;
        chainId?: number;
    }): Promise<AomiSimulateResponse>;
}

type AccountCredentialProvider = () => Promise<{
    provider: "para" | "privy" | (string & {});
    tokenKind?: string;
    providerToken: string;
    keyId?: string;
}>;
declare class AccountCredentialUnavailableError extends Error {
    constructor(message?: string);
}
type AccountSessionExchangeResponse = {
    access_token: string;
    token_type: "Bearer";
    expires_at: number;
    user_id: string;
};
type BetterAuthTokenResponse = {
    /** Aomi AccountBearer shape from /api/aomi/account-bearer. */
    bearer?: string;
    expires_at?: number;
    expiresAt?: number;
    user_id?: string;
    userId?: string;
};
type BetterAuthAccountTokenSourceOptions = {
    /** Portal/auth origin. Defaults to `baseUrl` when omitted. */
    baseUrl?: string;
    /**
     * When enabled, a missing Better Auth cookie can be created by exchanging the
     * connected wallet provider credential. Disable this when another account
     * runtime already owns provider exchange to avoid duplicate wallet prompts.
     */
    providerExchange?: boolean;
};
type AccountBearerProviderOptions = {
    baseUrl: string;
    getProviderCredential?: AccountCredentialProvider;
    betterAuthToken?: BetterAuthAccountTokenSourceOptions;
    fetch?: typeof fetch;
    now?: () => number;
    refreshBeforeExpiryMs?: number;
};
type AccountBearerProvider = GetAccountBearer & {
    subscribe: (listener: () => void) => () => void;
    dispose: () => void;
};
/** Cache and refresh the short-lived Aomi bearer used for backend requests. */
declare function createAccountBearerProvider({ baseUrl, getProviderCredential, betterAuthToken, fetch: fetchImpl, now, refreshBeforeExpiryMs, }: AccountBearerProviderOptions): AccountBearerProvider;

/**
 * Canonical home for app-descriptor identity logic. The backend speaks
 * snake_case and may scope a single app `name` across multiple platforms, so
 * both normalization (wire shape → descriptor) and identity (descriptor →
 * stable key) live here to keep every consumer — client, React control state,
 * UI selectors, and any future server/BFF code — in lockstep.
 */
/**
 * Coerce an arbitrary wire item (string id, camelCase object, or snake_case
 * object) into a single camelCase {@link AomiAppDescriptor}. Returns null for
 * anything without a usable `name`.
 */
declare function normalizeAppDescriptor(item: unknown): AomiAppDescriptor | null;
/**
 * Stable key identifying an app for dedup and selection-matching. Prefers the
 * concrete backend `applicationId`, falls back to `platform:name`, then `name`.
 * Server-side dedup and client-side selection must agree, so both call this.
 */
declare function appIdentityKey(descriptor: AomiAppDescriptor): string;

type Listener<T = unknown> = (payload: T) => void;
/**
 * Minimal typed event emitter with wildcard support.
 *
 * ```ts
 * type Events = { message: string; error: { code: number } };
 * const ee = new TypedEventEmitter<Events>();
 * ee.on("message", (msg) => console.log(msg));
 * ee.emit("message", "hello");
 * ```
 */
declare class TypedEventEmitter<EventMap extends Record<string, unknown> = Record<string, unknown>> {
    private listeners;
    on<K extends keyof EventMap & string>(type: K, handler: Listener<EventMap[K]>): () => void;
    once<K extends keyof EventMap & string>(type: K, handler: Listener<EventMap[K]>): () => void;
    emit<K extends keyof EventMap & string>(type: K, payload: EventMap[K]): void;
    off<K extends keyof EventMap & string>(type: K, handler: Listener<EventMap[K]>): void;
    removeAllListeners(): void;
}

type UnwrappedEvent = {
    type: string;
    payload: unknown;
};
declare function unwrapSystemEvent(event: AomiSystemEvent): UnwrappedEvent | null;

type AAProvider = "alchemy" | "pimlico";
type AAMode = "4337" | "7702";
type AASponsorship = "disabled" | "optional" | "required";
type AAWalletCall = {
    to: Hex;
    value: bigint;
    data?: Hex;
    chainId: number;
};
type WalletCapabilities = {
    atomic?: {
        status?: string;
    };
    paymasterService?: {
        supported?: boolean;
    };
    [key: string]: unknown;
};
type WalletAtomicCapability = WalletCapabilities;
interface AAChainConfig {
    chainId: number;
    enabled: boolean;
    defaultMode: AAMode;
    supportedModes: AAMode[];
    allowBatching: boolean;
    sponsorship: AASponsorship;
}
interface AAConfig {
    enabled: boolean;
    provider: AAProvider;
    chains: AAChainConfig[];
}
interface AAResolvedConfig {
    provider: AAProvider;
    chainId: number;
    mode: AAMode;
    batchingEnabled: boolean;
    sponsorship: AASponsorship;
}
/** The subset of AAWalletCall passed to smart account send methods (chainId already resolved). */
type AACallPayload = Omit<AAWalletCall, "chainId">;
/**
 * Smart account used for AA execution. `address` is the EOA signer — the same
 * value the user sees as their connected wallet address (`AomiSessionIdentity.address`).
 *
 * Exactly one of the mode-discriminated address fields is meaningful:
 * - `mode === "4337"` ⟹ `SmartAccount4337` is the AA contract address;
 *   `Delegation7702` is undefined.
 * - `mode === "7702"` ⟹ `Delegation7702` is the delegation target contract;
 *   `SmartAccount4337` is undefined.
 */
interface SmartAccount {
    provider: "alchemy" | "pimlico";
    mode: "4337" | "7702";
    address: Hex;
    SmartAccount4337?: Hex;
    Delegation7702?: Hex;
    sendTransaction: (call: AACallPayload) => Promise<{
        transactionHash: string;
    }>;
    sendBatchTransaction: (calls: AACallPayload[]) => Promise<{
        transactionHash: string;
    }>;
}
interface AAState<TAccount extends SmartAccount = SmartAccount> {
    resolved: AAResolvedConfig | null;
    account?: TAccount | null;
    pending: boolean;
    error: Error | null;
}
interface ExecutionResult {
    txHash: string;
    txHashes: string[];
    executionKind: string;
    batched: boolean;
    /**
     * Whether gas was paid by a paymaster.
     *
     * - `true`: paymaster paid, verified by the protocol (4337 userOp success
     *   requires paymaster validation; `sponsorship.mode === "required"`
     *   fails the tx if the paymaster rejects).
     * - `false`: no paymaster was attached (EOA path, or sendCalls fallback
     *   to sequential after sponsored-batch error).
     * - `undefined`: paymaster config was passed but the wallet may have
     *   silently fallen back to user-paid (Base Account with
     *   `sponsorship.mode === "optional"`). We cannot tell post-hoc without
     *   decoding the userOp logs.
     */
    sponsored: boolean | undefined;
    SmartAccount4337?: Hex;
    Delegation7702?: Hex;
}
interface AtomicBatchArgs {
    calls: AACallPayload[];
    chainId?: number;
    connector?: unknown;
    capabilities?: {
        atomic?: {
            required?: boolean;
            optional?: boolean;
        };
        paymasterService?: {
            context?: Record<string, unknown>;
            optional?: boolean;
            url: string;
        };
        [key: string]: unknown;
    };
    forceAtomic?: boolean;
    pollingInterval?: number;
    status?: (status: unknown) => boolean;
    throwOnFailure?: boolean;
    timeout?: number;
    version?: string;
}
type NativeWalletSponsorship = {
    mode: "disabled";
} | {
    mode: "optional";
    paymasterServiceUrl?: string;
    paymasterServiceContext?: SponsorshipPaymasterServiceContext;
} | {
    mode: "required";
    paymasterServiceUrl?: string;
    paymasterServiceContext?: SponsorshipPaymasterServiceContext;
};
type SponsorshipPaymasterServiceContext = Record<string, unknown> & {
    erc20?: never;
    paymasterAddress?: never;
};
interface NativeWalletExecutionPolicy {
    executionKind?: string;
    requiresAtomicForBatch?: boolean;
    sendCallsTimeoutMs?: number;
    sendCallsVersion?: string;
    sponsorship?: NativeWalletSponsorship;
}
interface ExecuteWalletCallsParams<TAccount extends SmartAccount = SmartAccount> {
    callList: AAWalletCall[];
    currentChainId: number;
    capabilities: Record<string, WalletCapabilities> | undefined;
    localPrivateKey: `0x${string}` | null;
    nativeWalletExecution?: NativeWalletExecutionPolicy;
    providerState: AAState<TAccount>;
    sendCallsSyncAsync: (args: AtomicBatchArgs) => Promise<unknown>;
    sendTransactionAsync: (args: {
        chainId: number;
        to: Hex;
        value: bigint;
        data?: Hex;
    }) => Promise<string>;
    switchChainAsync: (params: {
        chainId: number;
    }) => Promise<unknown>;
    chainsById: Record<number, Chain>;
    getPreferredRpcUrl: (chain: Chain) => string;
}
declare function getAAChainConfig(config: AAConfig, calls: AAWalletCall[], chainsById: Record<number, Chain>): AAChainConfig | null;
declare function buildAAExecutionPlan(config: AAConfig, chainConfig: AAChainConfig): AAResolvedConfig;
declare function getWalletExecutorReady(providerState: AAState): boolean;
declare const DEFAULT_AA_CONFIG: AAConfig;
declare const DISABLED_PROVIDER_STATE: AAState;

type WalletTxAaPreference = "auto" | "eip4337" | "eip7702" | "none";
type WalletTxCallPayload = {
    txId: number;
    to: string;
    value?: string;
    data?: string;
    chainId?: number;
    from?: string;
    gas?: string;
    description?: string;
};
type WalletTxPayload = {
    to?: string;
    value?: string;
    data?: string;
    chainId?: number;
    txId?: number;
    txIds?: number[];
    aaPreference?: WalletTxAaPreference;
    aaStrict?: boolean;
    requestId?: string;
    calls?: WalletTxCallPayload[];
};
type HydrateTxPayloadOptions = {
    strict?: boolean;
};
type WalletEip712Payload = {
    typed_data?: {
        domain?: {
            chainId?: number | string;
        };
        types?: Record<string, Array<{
            name: string;
            type: string;
        }>>;
        primaryType?: string;
        message?: Record<string, unknown>;
    };
    non_typed_data?: string;
    description?: string;
    eip712Id?: number;
};
/**
 * Wire payload for `wallet::solana_sign_request`. Mirrors `WalletEip712Payload`
 * in shape — singular sign-only — but carries a base64-encoded serialized
 * Solana transaction instead of EIP-712 typed data.
 *
 * `unsignedTx` is base64 of `VersionedTransaction.serialize()` (legacy
 * `Transaction.serialize()` also accepted by adapters). The host doesn't
 * decode it; the wallet adapter handles deserialization.
 */
type WalletSolanaSignPayload = {
    /** Base64 of the unsigned Solana transaction. */
    unsignedTx?: string;
    /** Human-readable summary shown alongside the wallet's decoded preview. */
    description?: string;
    /** CAIP-2 cluster string (`"solana:mainnet"` / `"solana:devnet"`). */
    cluster?: string;
    /** Server-side correlation id for the staged sign request. */
    pendingSolanaId?: number;
};
type WalletSolanaSignMessagePayload = {
    /** Base64 of the raw message bytes to sign. */
    message?: string;
    /** Human-readable summary shown alongside the wallet's decoded preview. */
    description?: string;
    /** CAIP-2 cluster string (`"solana:mainnet"` / `"solana:devnet"`). */
    cluster?: string;
    /** Server-side correlation id for the staged sign request. */
    pendingSolanaId?: number;
};
type NormalizedSolanaWalletRequest = {
    kind: "solana_sign" | "solana_sign_message" | "solana_send" | "solana_sign_and_send";
    payload: WalletSolanaSignPayload | WalletSolanaSignMessagePayload;
};
type ViemSignTypedDataArgs = {
    domain?: Record<string, unknown>;
    types: Record<string, Array<{
        name: string;
        type: string;
    }>>;
    primaryType: string;
    message?: Record<string, unknown>;
};
type ViemSignMessageArgs = {
    message: string | {
        raw: Hex;
    };
};
declare function parseChainId(value: unknown): number | undefined;
/**
 * Normalize a wallet_tx_request payload into a consistent shape.
 * Hard cutover contract: requires `tx_ids`.
 */
declare function normalizeTxPayload(payload: unknown): WalletTxPayload | null;
declare function hydrateTxPayloadFromUserState(payload: WalletTxPayload, userState: unknown, options?: HydrateTxPayloadOptions): WalletTxPayload;
/**
 * Normalize a `wallet::solana_sign_request` payload into a consistent shape.
 *
 * Accepts the various nesting levels the backend can ship: top-level args,
 * `{ args: { ... } }`, snake_case (`unsigned_tx`, `pending_solana_id`) or
 * camelCase (`unsignedTx`, `pendingSolanaId`). Single source of truth for
 * the SDK's view of the request — both the dispatch path and the
 * `syncWalletRequests` reconstruction loop go through here.
 */
declare function normalizeSolanaSignPayload(payload: unknown): WalletSolanaSignPayload;
declare function normalizeSolanaSignMessagePayload(payload: unknown): WalletSolanaSignMessagePayload;
declare function normalizeSolanaWalletRequest(payload: unknown): NormalizedSolanaWalletRequest | null;
/**
 * Normalize an EIP-712 signing request payload.
 */
declare function normalizeEip712Payload(payload: unknown): WalletEip712Payload;
/**
 * Convert a normalized WalletTxPayload into AAWalletCalls.
 * This is the single boundary conversion point from backend payloads to AA-ready calls.
 */
declare function toAAWalletCalls(payload: WalletTxPayload, defaultChainId?: number): AAWalletCall[];
declare function toAAWalletCall(payload: WalletTxPayload, defaultChainId?: number): AAWalletCall;
/**
 * Convert normalized EIP-712 payloads into the viem signing shape used by both
 * the CLI and widget component layers.
 */
declare function toViemSignTypedDataArgs(payload: WalletEip712Payload): ViemSignTypedDataArgs | null;
/**
 * Convert normalized ERC-191/personal_sign payloads into viem signMessage args.
 * Hex strings are opaque bytes; all other strings are signed as UTF-8 text.
 */
declare function toViemSignMessageArgs(payload: WalletEip712Payload): ViemSignMessageArgs | null;

type WalletRequestKind = "transaction" | "eip712_sign" | "solana_sign" | "solana_sign_message" | "solana_send" | "solana_sign_and_send";
type WalletRequest = {
    id: string;
    kind: "transaction";
    payload: WalletTxPayload;
    timestamp: number;
} | {
    id: string;
    kind: "eip712_sign";
    payload: WalletEip712Payload;
    timestamp: number;
} | {
    id: string;
    kind: "solana_sign";
    payload: WalletSolanaSignPayload;
    timestamp: number;
} | {
    id: string;
    kind: "solana_sign_message";
    payload: WalletSolanaSignMessagePayload;
    timestamp: number;
} | {
    id: string;
    kind: "solana_send";
    payload: WalletSolanaSignPayload;
    timestamp: number;
} | {
    id: string;
    kind: "solana_sign_and_send";
    payload: WalletSolanaSignPayload;
    timestamp: number;
};
type WalletRequestResult = {
    kind: "transaction";
    txHash: string;
    amount?: string;
    aaRequestedMode?: "4337" | "7702" | "none";
    aaResolvedMode?: "4337" | "7702" | "none";
    aaFallbackReason?: string;
    executionKind?: string;
    batched?: boolean;
    callCount?: number;
    sponsored?: boolean;
    SmartAccount4337?: string;
    Delegation7702?: string;
} | {
    kind: "eip712_sign";
    signature: string;
} | {
    kind: "solana_sign";
    /** Base64 of the full signed Solana transaction bytes. */
    signedTx: string;
} | {
    kind: "solana_sign_message";
    signature: string;
} | {
    kind: "solana_send";
    signature: string;
    signedTx?: string;
} | {
    kind: "solana_sign_and_send";
    signature: string;
    signedTx?: string;
};
type SendResult = {
    messages: AomiMessage[];
    title?: string;
};
type SessionOptions = {
    /** Session ID. Auto-generated (crypto.randomUUID) if omitted. */
    sessionId?: string;
    /** App for chat messages. Default: "default" */
    app?: string;
    /** Optional concrete application row to route chat/model calls to. */
    applicationId?: number | string | null;
    /** API key override. */
    apiKey?: string;
    /** User state to send with requests (wallet connection info, etc). */
    userState?: UserState;
    /** Optional client type hint forwarded to the backend via userState.ext.client_type. */
    clientType?: AomiClientType;
    /** Stable client ID used for secret-vault association. */
    clientId?: string;
    /**
     * When true (default), synthesize pending transaction wallet requests from
     * `user_state.pending_txs` during state sync. Web UI should disable this and
     * rely on explicit `wallet_tx_request` events from `send_transaction_to_wallet`.
     */
    syncPendingTxRequestsFromUserState?: boolean;
    /** Polling interval in ms. Default: 500 */
    pollIntervalMs?: number;
    /** Logger for debug output. Pass `console` for verbose logging. */
    logger?: {
        debug: (...args: unknown[]) => void;
    };
};
type SessionRuntimeOptions = {
    app: string;
    applicationId?: number | string | null;
    apiKey?: string;
    clientId?: string;
    userState?: UserState;
};
type SessionEventMap = {
    wallet_tx_request: WalletRequest;
    wallet_eip712_request: WalletRequest;
    wallet_solana_sign_request: WalletRequest;
    wallet_solana_sign_message_request: WalletRequest;
    wallet_solana_send_request: WalletRequest;
    wallet_solana_sign_and_send_request: WalletRequest;
    system_notice: {
        message: string;
    };
    system_error: {
        message: string;
    };
    async_callback: Record<string, unknown>;
    tool_update: AomiSSEEvent;
    tool_complete: AomiSSEEvent;
    title_changed: {
        title: string;
    };
    messages: AomiMessage[];
    user_state_updated: UserState;
    processing_start: undefined;
    processing_end: undefined;
    wallet_requests_changed: WalletRequest[];
    backend_idle: undefined;
    error: {
        error: unknown;
    };
    "*": {
        type: string;
        payload: unknown;
    };
};

declare function aaModeFromExecutionKind(executionKind: string | undefined): "4337" | "7702" | "none" | undefined;

declare class ClientSession extends TypedEventEmitter<SessionEventMap> {
    readonly client: AomiClient;
    readonly sessionId: string;
    private app;
    private applicationId?;
    private apiKey?;
    private userState?;
    private clientId;
    private syncPendingTxRequestsFromUserState;
    private pollIntervalMs;
    private logger?;
    private pollTimer;
    private unsubscribeSSE;
    private isSSEActive;
    private _isProcessing;
    private _backendWasProcessing;
    private walletController;
    private _messages;
    private _title?;
    private closed;
    private pendingResolve;
    constructor(clientOrOptions: AomiClient | AomiClientOptions, sessionOptions?: SessionOptions);
    /**
     * Send a message and wait for the AI to finish processing.
     *
     * The returned promise resolves when `is_processing` becomes `false` AND
     * there are no pending wallet requests. If a wallet request arrives
     * mid-processing, polling continues but the promise pauses until the
     * request is resolved or rejected via `resolve()` / `reject()`.
     */
    send(message: string): Promise<SendResult>;
    /**
     * Send a message without waiting for completion.
     * Polling starts in the background; listen to events for updates.
     */
    sendAsync(message: string): Promise<AomiChatResponse>;
    /**
     * Resolve a pending wallet request (transaction, EIP-712, or Solana
     * sign). The `result.kind` discriminator must match the originating
     * request's kind — sending a `transaction` result for an `eip712_sign`
     * request would post the wrong wire event with empty fields, so we
     * fail fast at runtime instead.
     */
    resolve(requestId: string, result: WalletRequestResult): Promise<void>;
    /**
     * Reject a pending wallet request.
     * Sends an error to the backend and resumes polling.
     */
    reject(requestId: string, reason?: string): Promise<void>;
    /**
     * Cancel the AI's current response.
     */
    interrupt(): Promise<void>;
    /**
     * Close the session. Stops polling, unsubscribes SSE, removes all listeners.
     * The session cannot be used after closing.
     */
    close(): void;
    /** Current messages in the session. */
    getMessages(): AomiMessage[];
    /** Current session title. */
    getTitle(): string | undefined;
    /** Latest authoritative backend user_state snapshot seen by this session. */
    getUserState(): UserState | undefined;
    /** Pending wallet requests waiting for resolve/reject. */
    getPendingRequests(): WalletRequest[];
    /** Whether the AI is currently processing. */
    getIsProcessing(): boolean;
    getIsSSEActive(): boolean;
    setSSEActive(active: boolean): void;
    syncRuntimeOptions(options: SessionRuntimeOptions): void;
    resolveUserState(userState: UserState, opts?: {
        skipEmit?: boolean;
    }): void;
    setClientType(clientType: AomiClientType): void;
    addExtValue(key: string, value: unknown): void;
    removeExtValue(key: string): void;
    resolveWallet(address: string, chainId?: number, aa?: {
        aaMode?: UserStateAAMode | null;
        smartAccount?: string | null;
        smartAccount4337?: string | null;
        delegation7702?: string | null;
    }): void;
    syncUserState(): Promise<AomiStateResponse>;
    /** Whether the session is currently polling for state updates. */
    getIsPolling(): boolean;
    /**
     * Fetch the current state from the backend (one-shot).
     * Automatically starts polling if the backend is processing.
     */
    fetchCurrentState(): Promise<void>;
    /**
     * Start polling for state updates. Idempotent — no-op if already polling.
     * Useful for resuming polling after resolving a wallet request.
     */
    startPolling(): void;
    /** Stop polling for state updates. Idempotent — no-op if not polling. */
    stopPolling(): void;
    private pollTick;
    private applyState;
    private handleSSEEvent;
    private sendSystemEvent;
    private resolvePending;
    private assertOpen;
    private assertUserStateAligned;
}

type ChainInfo = {
    id: number;
    name: string;
    ticker: string;
};
declare const monad: {
    blockExplorers: {
        readonly default: {
            readonly name: "Monad Explorer";
            readonly url: "https://monadexplorer.com";
        };
    };
    blockTime?: number | undefined | undefined;
    contracts?: {
        [x: string]: viem.ChainContract | {
            [sourceId: number]: viem.ChainContract | undefined;
        } | undefined;
        ensRegistry?: viem.ChainContract | undefined;
        ensUniversalResolver?: viem.ChainContract | undefined;
        multicall3?: viem.ChainContract | undefined;
        erc6492Verifier?: viem.ChainContract | undefined;
    } | undefined;
    ensTlds?: readonly string[] | undefined;
    id: 143;
    name: "Monad";
    nativeCurrency: {
        readonly decimals: 18;
        readonly name: "Monad";
        readonly symbol: "MON";
    };
    experimental_preconfirmationTime?: number | undefined | undefined;
    rpcUrls: {
        readonly default: {
            readonly http: readonly ["https://rpc.monad.xyz"];
        };
    };
    sourceId?: number | undefined | undefined;
    testnet?: boolean | undefined | undefined;
    custom?: Record<string, unknown> | undefined;
    extendSchema?: Record<string, unknown> | undefined;
    fees?: viem.ChainFees<undefined> | undefined;
    formatters?: undefined;
    prepareTransactionRequest?: ((args: viem.PrepareTransactionRequestParameters, options: {
        phase: "beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters";
    }) => Promise<viem.PrepareTransactionRequestParameters>) | [fn: ((args: viem.PrepareTransactionRequestParameters, options: {
        phase: "beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters";
    }) => Promise<viem.PrepareTransactionRequestParameters>) | undefined, options: {
        runAt: readonly ("beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters")[];
    }] | undefined;
    serializers?: viem.ChainSerializers<undefined, viem.TransactionSerializable> | undefined;
    verifyHash?: ((client: viem.Client, parameters: viem.VerifyHashActionParameters) => Promise<viem.VerifyHashActionReturnType>) | undefined;
};
declare const monadTestnet: {
    blockExplorers: {
        readonly default: {
            readonly name: "Monad Testnet Explorer";
            readonly url: "https://testnet.monadexplorer.com";
        };
    };
    blockTime?: number | undefined | undefined;
    contracts?: {
        [x: string]: viem.ChainContract | {
            [sourceId: number]: viem.ChainContract | undefined;
        } | undefined;
        ensRegistry?: viem.ChainContract | undefined;
        ensUniversalResolver?: viem.ChainContract | undefined;
        multicall3?: viem.ChainContract | undefined;
        erc6492Verifier?: viem.ChainContract | undefined;
    } | undefined;
    ensTlds?: readonly string[] | undefined;
    id: 10143;
    name: "Monad Testnet";
    nativeCurrency: {
        readonly decimals: 18;
        readonly name: "Monad";
        readonly symbol: "MON";
    };
    experimental_preconfirmationTime?: number | undefined | undefined;
    rpcUrls: {
        readonly default: {
            readonly http: readonly ["https://testnet-rpc.monad.xyz"];
        };
    };
    sourceId?: number | undefined | undefined;
    testnet: true;
    custom?: Record<string, unknown> | undefined;
    extendSchema?: Record<string, unknown> | undefined;
    fees?: viem.ChainFees<undefined> | undefined;
    formatters?: undefined;
    prepareTransactionRequest?: ((args: viem.PrepareTransactionRequestParameters, options: {
        phase: "beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters";
    }) => Promise<viem.PrepareTransactionRequestParameters>) | [fn: ((args: viem.PrepareTransactionRequestParameters, options: {
        phase: "beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters";
    }) => Promise<viem.PrepareTransactionRequestParameters>) | undefined, options: {
        runAt: readonly ("beforeFillTransaction" | "beforeFillParameters" | "afterFillParameters")[];
    }] | undefined;
    serializers?: viem.ChainSerializers<undefined, viem.TransactionSerializable> | undefined;
    verifyHash?: ((client: viem.Client, parameters: viem.VerifyHashActionParameters) => Promise<viem.VerifyHashActionReturnType>) | undefined;
};
declare const SUPPORTED_CHAINS: readonly [{
    readonly id: 1;
    readonly name: "Ethereum";
    readonly ticker: "ETH";
}, {
    readonly id: 137;
    readonly name: "Polygon";
    readonly ticker: "MATIC";
}, {
    readonly id: 42161;
    readonly name: "Arbitrum";
    readonly ticker: "ARB";
}, {
    readonly id: 8453;
    readonly name: "Base";
    readonly ticker: "BASE";
}, {
    readonly id: 10;
    readonly name: "Optimism";
    readonly ticker: "OP";
}, {
    readonly id: 11155111;
    readonly name: "Sepolia";
    readonly ticker: "SEP";
}, {
    readonly id: 59144;
    readonly name: "Linea Mainnet";
    readonly ticker: "LINEA";
}, {
    readonly id: 59141;
    readonly name: "Linea Sepolia Testnet";
    readonly ticker: "LINEA";
}, {
    readonly id: 143;
    readonly name: "Monad";
    readonly ticker: "MON";
}, {
    readonly id: 10143;
    readonly name: "Monad Testnet";
    readonly ticker: "MON";
}, {
    readonly id: 31337;
    readonly name: "Anvil (local)";
    readonly ticker: "ETH";
}];
declare const SUPPORTED_CHAIN_IDS: (1 | 10 | 137 | 42161 | 8453 | 143 | 10143 | 11155111 | 59144 | 59141 | 31337)[];
declare const CHAIN_NAMES: Record<number, string>;
/** Alchemy network slugs for proxy URL construction. */
declare const ALCHEMY_CHAIN_SLUGS: Record<number, string>;
declare const CHAINS_BY_ID: Record<number, Chain>;

declare function executeWalletCalls(params: ExecuteWalletCallsParams): Promise<ExecutionResult>;

/** Max fee auto-injection threshold (0.05 native token). */
declare const MAX_AUTO_FEE_WEI: bigint;
type NormalizedSimulatedFee = {
    recipient: Hex;
    amountWei: bigint;
};
declare function normalizeSimulatedFee(fee: AomiSimulateFee): NormalizedSimulatedFee | null;
declare function buildFeeAAWalletCall(fee: AomiSimulateFee, chainId: number): AAWalletCall | null;
declare function appendFeeCallToPayload(payload: WalletTxPayload, fee: AomiSimulateFee, defaultChainId: number, options?: {
    forceAaPreference?: WalletTxAaPreference;
    strictAa?: boolean;
}): WalletTxPayload;

interface AlchemyHookParams {
    enabled: boolean;
    apiKey: string;
    chain: Chain;
    rpcUrl: string;
    gasPolicyId?: string;
    mode: AAMode;
}
type AlchemyHookState<TAccount extends SmartAccount = SmartAccount> = {
    account?: TAccount | null;
    pending?: boolean;
    error?: Error | null;
};
type UseAlchemyAAHook<TAccount extends SmartAccount = SmartAccount> = (params?: AlchemyHookParams) => AlchemyHookState<TAccount>;
interface CreateAlchemyAAProviderOptions<TAccount extends SmartAccount = SmartAccount> {
    accountAbstractionConfig?: AAConfig;
    useAlchemyAA: UseAlchemyAAHook<TAccount>;
    chainsById: Record<number, Chain>;
    chainSlugById: Record<number, string>;
    getPreferredRpcUrl: (chain: Chain) => string;
    apiKeyEnvVar?: string;
    gasPolicyEnvVar?: string;
}
declare function createAlchemyAAProvider<TAccount extends SmartAccount = SmartAccount>({ accountAbstractionConfig, useAlchemyAA, chainsById, chainSlugById, getPreferredRpcUrl, }: CreateAlchemyAAProviderOptions<TAccount>): (calls: AAWalletCall[] | null, localPrivateKey: `0x${string}` | null) => AAState<TAccount>;

type AAOwner = {
    kind: "direct";
    privateKey: `0x${string}`;
} | {
    kind: "session";
    adapter: string;
    session: unknown;
    signer?: unknown;
    address?: Hex;
} | {
    kind: "external-wallet";
    signer: unknown;
    address: Hex;
};

interface PimlicoResolveOptions {
    calls: AAWalletCall[] | null;
    localPrivateKey?: `0x${string}` | null;
    accountAbstractionConfig?: AAConfig;
    chainsById: Record<number, Chain>;
    rpcUrl?: string;
    modeOverride?: AAMode;
    publicOnly?: boolean;
    throwOnMissingConfig?: boolean;
    apiKey?: string;
}
interface PimlicoResolvedConfig extends AAResolvedConfig {
    apiKey: string;
    chain: Chain;
    rpcUrl?: string;
}
declare function resolvePimlicoConfig(options: PimlicoResolveOptions): PimlicoResolvedConfig | null;

interface PimlicoHookParams {
    enabled: boolean;
    apiKey: string;
    chain: Chain;
    mode: AAMode;
    rpcUrl?: string;
}
type PimlicoHookState<TAccount extends SmartAccount = SmartAccount> = {
    account?: TAccount | null;
    pending?: boolean;
    error?: Error | null;
};
type UsePimlicoAAHook<TAccount extends SmartAccount = SmartAccount> = (params?: PimlicoHookParams) => PimlicoHookState<TAccount>;
interface CreatePimlicoAAProviderOptions<TAccount extends SmartAccount = SmartAccount> {
    accountAbstractionConfig?: AAConfig;
    usePimlicoAA: UsePimlicoAAHook<TAccount>;
    chainsById: Record<number, Chain>;
    apiKeyEnvVar?: string;
    rpcUrl?: string;
}
declare function createPimlicoAAProvider<TAccount extends SmartAccount = SmartAccount>({ accountAbstractionConfig, usePimlicoAA, chainsById, rpcUrl, }: CreatePimlicoAAProviderOptions<TAccount>): (calls: AAWalletCall[] | null, localPrivateKey: `0x${string}` | null) => AAState<TAccount>;

type SdkSmartAccount = {
    /** Para SDKs emit uppercase (e.g. "ALCHEMY", "PIMLICO"); normalized by the adapter. */
    provider: string;
    mode: AAMode;
    smartAccountAddress: Hex;
    delegationAddress?: Hex;
    sendTransaction: (call: AACallPayload, options?: unknown) => Promise<TransactionReceipt>;
    sendBatchTransaction: (calls: AACallPayload[], options?: unknown) => Promise<TransactionReceipt>;
};
/**
 * Bridges the provider SDK smart-account shape into the library's
 * `SmartAccount` interface.
 *
 * - `address` is the EOA signer — must be supplied by the caller (the SDK
 *   account object only exposes the *executing* address, which differs from
 *   the signer in 4337 mode).
 * - `SmartAccount4337` is the AA contract address (only set in 4337 mode).
 * - `Delegation7702` is the delegation target contract (only set in 7702 mode).
 */
declare function adaptSmartAccount(account: SdkSmartAccount, address: Hex): SmartAccount;
/**
 * Detects Alchemy gas sponsorship quota errors.
 */
declare function isAlchemySponsorshipLimitError(error: unknown): boolean;

interface CreateAAStateOptions {
    provider: AAProvider;
    chain: Chain;
    owner: AAOwner;
    rpcUrl: string;
    callList: AAWalletCall[];
    mode?: AAMode;
    apiKey?: string;
    gasPolicyId?: string;
    sponsored?: boolean;
    /** Backend proxy base URL for Alchemy. Used when apiKey is omitted. */
    proxyBaseUrl?: string;
}
/**
 * Creates an AA state by instantiating the appropriate smart account via
 * `@getpara/aa-alchemy` or `@getpara/aa-pimlico`.
 */
declare function createAAProviderState(options: CreateAAStateOptions): Promise<AAState>;

export { type AACallPayload, type AAChainConfig, type AAConfig, type AAMode, type AAOwner, type AAProvider, type AAResolvedConfig, type AASponsorship, type AAState, type AAWalletCall, ALCHEMY_CHAIN_SLUGS, type AccountBearerProvider, type AccountBearerProviderOptions, type AccountCredentialProvider, AccountCredentialUnavailableError, type AccountSessionExchangeResponse, type AlchemyHookParams, type AomiAccessApproval, type AomiAccountProfile, type AomiAccountResponse, type AomiAppDescriptor, type AomiAuthIdentity, type AomiChatResponse, type AomiClearSecretsResponse, AomiClient, type AomiClientOptions, type AomiClientType, type AomiCreateApprovalRequest, type AomiCreateThreadResponse, type AomiDeleteSecretResponse, type AomiHttpMethod, type AomiIdentityWallet, type AomiIngestSecretsResponse, type AomiInterruptResponse, type AomiListSecretsResponse, type AomiMessage, type AomiPlatformFilter, type AomiRequestOptions, type AomiRequestQueryValue, type AomiSSEEvent, type AomiSSEEventType, type AomiSecretSlot, type AomiSimulateFee, type AomiSimulateResponse, type AomiStateResponse, type AomiSystemEvent, type AomiSystemResponse, type AomiThread, type AomiUsageStats, type AomiUser, type AomiWalletFamily, type AtomicBatchArgs, type BetterAuthAccountTokenSourceOptions, type BetterAuthTokenResponse, CHAINS_BY_ID, CHAIN_NAMES, CLIENT_TYPE_TS_CLI, CLIENT_TYPE_WEB_UI, type ChainInfo, type CreateAAStateOptions, type CreateAlchemyAAProviderOptions, type CreatePimlicoAAProviderOptions, DEFAULT_AA_CONFIG, DISABLED_PROVIDER_STATE, type ExecuteWalletCallsParams, type ExecutionResult, type GetAccountBearer, type Logger, MAX_AUTO_FEE_WEI, type NativeWalletExecutionPolicy, type NativeWalletSponsorship, type NormalizedSimulatedFee, type NormalizedSolanaWalletRequest, type PimlicoHookParams, type PimlicoResolveOptions, type PimlicoResolvedConfig, SUPPORTED_CHAINS, SUPPORTED_CHAIN_IDS, type SendResult, ClientSession as Session, type SessionEventMap, type SessionOptions, type SmartAccount, type SponsorshipPaymasterServiceContext, TypedEventEmitter, type UnwrappedEvent, type UseAlchemyAAHook, type UsePimlicoAAHook, UserState, type UserStateAAMode, type UserStateAuthMethod, type UserStateSponsorProvider, type UserStateWalletKind, type UserStateWalletProvider, type ViemSignMessageArgs, type ViemSignTypedDataArgs, type WalletAtomicCapability, type WalletCapabilities, type WalletEip712Payload, type WalletRequest, type WalletRequestKind, type WalletRequestResult, type WalletSolanaSignMessagePayload, type WalletSolanaSignPayload, type WalletTxAaPreference, type WalletTxCallPayload, type WalletTxPayload, aaModeFromExecutionKind, adaptSmartAccount, appIdentityKey, appendFeeCallToPayload, buildAAExecutionPlan, buildFeeAAWalletCall, createAAProviderState, createAccountBearerProvider, createAlchemyAAProvider, createPimlicoAAProvider, executeWalletCalls, getAAChainConfig, getWalletExecutorReady, hydrateTxPayloadFromUserState, isAlchemySponsorshipLimitError, isAsyncCallback, isInlineCall, isSystemError, isSystemNotice, monad, monadTestnet, normalizeAppDescriptor, normalizeEip712Payload, normalizeSimulatedFee, normalizeSolanaSignMessagePayload, normalizeSolanaSignPayload, normalizeSolanaWalletRequest, normalizeTxPayload, parseChainId, resolvePimlicoConfig, toAAWalletCall, toAAWalletCalls, toViemSignMessageArgs, toViemSignTypedDataArgs, unwrapSystemEvent };
