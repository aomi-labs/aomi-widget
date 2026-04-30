import { Hex, Chain, TransactionReceipt } from 'viem';

/**
 * Known client surfaces that may want backend-specific UX strategies.
 * Additional string values are allowed for forward compatibility.
 */
type AomiClientType = "ts_cli" | "web_ui" | (string & {});
declare const CLIENT_TYPE_TS_CLI: AomiClientType;
declare const CLIENT_TYPE_WEB_UI: AomiClientType;
/**
 * Client-side user state synced with the backend.
 * Typically wallet connection info, but can be any key-value data.
 */
interface UserState extends Record<string, unknown> {
}
declare namespace UserState {
    /**
     * Canonicalize client-side user state to the backend's snake_case `UserState`.
     * Existing snake_case keys win when both forms are present.
     */
    function normalize(userState?: UserState | null): UserState | undefined;
    /**
     * Reconcile a partial incoming snapshot against the previous canonical state.
     * Preserves wallet context when backend/client snapshots omit address/chain_id.
     */
    function reconcile(previousUserState?: UserState | null, incomingUserState?: UserState | null): UserState | undefined;
    function address(userState?: UserState | null): string | undefined;
    function chainId(userState?: UserState | null): number | undefined;
    function isConnected(userState?: UserState | null): boolean | undefined;
    /**
     * Adds/updates an entry on `userState.ext` while keeping `ext` intentionally untyped.
     */
    function withExt(userState: UserState, key: string, value: unknown): UserState;
}
declare function addUserStateExt(userState: UserState, key: string, value: unknown): UserState;
/**
 * Optional logger for debug output. Pass `console` or any compatible object.
 */
type Logger = {
    debug: (...args: unknown[]) => void;
};
type AomiClientOptions = {
    /** Base URL of the Aomi backend (e.g. "https://api.aomi.dev" or "/" for same-origin proxying) */
    baseUrl: string;
    /** Default API key for non-default apps */
    apiKey?: string;
    /** Optional logger for debug output (default: silent) */
    logger?: Logger;
};
interface AomiMessage {
    sender?: "user" | "agent" | "system" | string;
    content?: string;
    timestamp?: string;
    is_streaming?: boolean;
    tool_result?: [string, string] | null;
}
/**
 * GET /api/state
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
 * POST /api/chat
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
 * POST /api/simulate
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
 * POST /api/interrupt
 * Interrupts current processing and returns updated session state
 */
type AomiInterruptResponse = AomiChatResponse;
/**
 * GET /api/sessions
 * Returns array of AomiThread
 */
interface AomiThread {
    session_id: string;
    title: string;
    is_archived?: boolean;
}
/**
 * POST /api/sessions
 * Creates a new thread/session
 */
interface AomiCreateThreadResponse {
    session_id: string;
    title?: string;
}
/**
 * GET/POST /api/control/provider-keys
 * Lists or saves BYOK provider keys for the bound client.
 */
interface AomiProviderKeyEntry {
    provider: string;
    key_prefix: string;
    label?: string | null;
    is_active: boolean;
}
/**
 * Base SSE event - all events have session_id and type
 */
type AomiSSEEvent = {
    type: "title_changed" | "tool_update" | "tool_complete" | "system_notice" | string;
    session_id: string;
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
    private readonly logger?;
    private readonly sseSubscriber;
    constructor(options: AomiClientOptions);
    /**
     * Fetch current session state (messages, processing status, title).
     */
    fetchState(sessionId: string, userState?: UserState, clientId?: string): Promise<AomiStateResponse>;
    /**
     * Send a chat message and return updated session state.
     */
    sendMessage(sessionId: string, message: string, options?: {
        app?: string;
        publicKey?: string;
        apiKey?: string;
        userState?: UserState;
        clientId?: string;
    }): Promise<AomiChatResponse>;
    /**
     * Send a system-level message (e.g. wallet state changes, context switches).
     */
    sendSystemMessage(sessionId: string, message: string): Promise<AomiSystemResponse>;
    /**
     * Interrupt the AI's current response.
     */
    interrupt(sessionId: string): Promise<AomiInterruptResponse>;
    /**
     * Ingest secrets for a client. Returns opaque `$SECRET:<name>` handles.
     * Call this once at page load (or when secrets change) with a stable
     * client_id for the browser tab. The same client_id should be passed
     * to `sendMessage` / `fetchState` so sessions get associated.
     */
    ingestSecrets(clientId: string, secrets: Record<string, string>): Promise<AomiIngestSecretsResponse>;
    /**
     * Clear all secrets for a client (e.g. on page unload or logout).
     */
    clearSecrets(clientId: string): Promise<AomiClearSecretsResponse>;
    /**
     * Remove a single secret for a client.
     */
    deleteSecret(clientId: string, name: string): Promise<AomiDeleteSecretResponse>;
    /**
     * Subscribe to real-time SSE updates for a session.
     * Automatically reconnects with exponential backoff on disconnects.
     * Returns an unsubscribe function.
     */
    subscribeSSE(sessionId: string, onUpdate: (event: AomiSSEEvent) => void, onError?: (error: unknown) => void): () => void;
    /**
     * List all threads for a wallet address.
     */
    listThreads(publicKey: string): Promise<AomiThread[]>;
    /**
     * Get a single thread by ID.
     */
    getThread(sessionId: string): Promise<AomiThread>;
    /**
     * Create a new thread. The client generates the session ID.
     */
    createThread(threadId: string, publicKey?: string): Promise<AomiCreateThreadResponse>;
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
     * Get available apps.
     */
    getApps(sessionId: string, options?: {
        publicKey?: string;
        apiKey?: string;
    }): Promise<string[]>;
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
        apiKey?: string;
        clientId?: string;
    }): Promise<{
        success: boolean;
        rig: string;
        baml: string;
        created: boolean;
    }>;
    /**
     * List BYOK provider keys bound to the current session's client.
     */
    listProviderKeys(sessionId: string): Promise<AomiProviderKeyEntry[]>;
    /**
     * Save or replace a BYOK provider key for the client bound to this session.
     */
    saveProviderKey(sessionId: string, provider: string, apiKey: string, label?: string): Promise<AomiProviderKeyEntry>;
    /**
     * Delete a BYOK provider key for the client bound to this session.
     */
    deleteProviderKey(sessionId: string, provider: string): Promise<boolean>;
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
type WalletAtomicCapability = {
    atomic?: {
        status?: string;
    };
};
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
interface SmartAccount {
    provider: string;
    mode: string;
    AAAddress?: Hex;
    delegationAddress?: Hex;
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
    sponsored: boolean;
    AAAddress?: Hex;
    delegationAddress?: Hex;
}
interface AtomicBatchArgs {
    calls: AACallPayload[];
    chainId?: number;
    capabilities?: {
        atomic?: {
            required?: boolean;
            optional?: boolean;
        };
    };
}
interface ExecuteWalletCallsParams<TAccount extends SmartAccount = SmartAccount> {
    callList: AAWalletCall[];
    currentChainId: number;
    capabilities: Record<string, WalletAtomicCapability> | undefined;
    localPrivateKey: `0x${string}` | null;
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
    description?: string;
    eip712Id?: number;
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
declare function parseChainId(value: unknown): number | undefined;
/**
 * Normalize a wallet_tx_request payload into a consistent shape.
 * Hard cutover contract: requires `tx_ids`.
 */
declare function normalizeTxPayload(payload: unknown): WalletTxPayload | null;
declare function hydrateTxPayloadFromUserState(payload: WalletTxPayload, userState: unknown, options?: HydrateTxPayloadOptions): WalletTxPayload;
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

declare function aaModeFromExecutionKind(executionKind: string | undefined): "4337" | "7702" | "none" | undefined;

type WalletRequestKind = "transaction" | "eip712_sign";
type WalletRequest = {
    id: string;
    kind: WalletRequestKind;
    payload: WalletTxPayload | WalletEip712Payload;
    timestamp: number;
};
type WalletRequestResult = {
    txHash?: string;
    signature?: string;
    amount?: string;
    error?: string;
    aaRequestedMode?: "4337" | "7702" | "none";
    aaResolvedMode?: "4337" | "7702" | "none";
    aaFallbackReason?: string;
    executionKind?: string;
    batched?: boolean;
    callCount?: number;
    sponsored?: boolean;
    smartAccountAddress?: string;
    delegationAddress?: string;
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
    /** User public key (wallet address). */
    publicKey?: string;
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
    publicKey?: string;
    apiKey?: string;
    clientId?: string;
    userState?: UserState;
};
/** Events emitted by Session. */
type SessionEventMap = {
    /** A transaction signing request arrived from the backend. */
    wallet_tx_request: WalletRequest;
    /** An EIP-712 signing request arrived from the backend. */
    wallet_eip712_request: WalletRequest;
    /** A system notice from the backend. */
    system_notice: {
        message: string;
    };
    /** A system error from the backend. */
    system_error: {
        message: string;
    };
    /** An async callback event. */
    async_callback: Record<string, unknown>;
    /** SSE: tool execution in progress. */
    tool_update: AomiSSEEvent;
    /** SSE: tool execution completed. */
    tool_complete: AomiSSEEvent;
    /** Session title changed. */
    title_changed: {
        title: string;
    };
    /** Messages updated (new messages from poll or send response). */
    messages: AomiMessage[];
    /** AI started processing. */
    processing_start: undefined;
    /** AI finished processing. */
    processing_end: undefined;
    /** Authoritative pending wallet request list changed. */
    wallet_requests_changed: WalletRequest[];
    /**
     * Backend transitioned from processing to idle (is_processing went false).
     * Unlike `processing_end`, this fires even when there are unresolved local
     * wallet requests.  CLI consumers use it to know that all system events
     * (including wallet requests) have been delivered for the current turn.
     */
    backend_idle: undefined;
    /** An error occurred during polling or SSE. */
    error: {
        error: unknown;
    };
    /** Wildcard: receives all events as { type, payload }. */
    "*": {
        type: string;
        payload: unknown;
    };
};
declare class ClientSession extends TypedEventEmitter<SessionEventMap> {
    /** The underlying low-level client. */
    readonly client: AomiClient;
    /** The session (thread) ID. */
    readonly sessionId: string;
    private app;
    private publicKey?;
    private apiKey?;
    private userState?;
    private clientId;
    private syncPendingTxRequestsFromUserState;
    private pollIntervalMs;
    private logger?;
    private pollTimer;
    private unsubscribeSSE;
    private _isProcessing;
    private _backendWasProcessing;
    private walletRequests;
    private walletRequestNextId;
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
     * Resolve a pending wallet request (transaction or EIP-712 signing).
     * Sends the result to the backend and resumes polling.
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
    syncRuntimeOptions(options: SessionRuntimeOptions): void;
    resolveUserState(userState: UserState): void;
    setClientType(clientType: AomiClientType): void;
    addExtValue(key: string, value: unknown): void;
    removeExtValue(key: string): void;
    resolveWallet(address: string, chainId?: number): void;
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
    private dispatchSystemEvents;
    private handleSSEEvent;
    private enqueueWalletRequest;
    private removeWalletRequest;
    private sendSystemEvent;
    private resolvePending;
    private assertOpen;
    private assertUserStateAligned;
    private getWalletRequestId;
    private syncWalletRequests;
}

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
    provider: string;
    mode: AAMode;
    smartAccountAddress: Hex;
    delegationAddress?: Hex;
    sendTransaction: (call: AACallPayload, options?: unknown) => Promise<TransactionReceipt>;
    sendBatchTransaction: (calls: AACallPayload[], options?: unknown) => Promise<TransactionReceipt>;
};
/**
 * Bridges the provider SDK smart-account shape into the library's
 * SmartAccount interface:
 * - Maps `smartAccountAddress` → `AAAddress`
 * - Unwraps `TransactionReceipt` → `{ transactionHash }`
 */
declare function adaptSmartAccount(account: SdkSmartAccount): SmartAccount;
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

export { type AACallPayload, type AAChainConfig, type AAConfig, type AAMode, type AAOwner, type AAProvider, type AAResolvedConfig, type AASponsorship, type AAState, type AAWalletCall, type AlchemyHookParams, type AomiChatResponse, type AomiClearSecretsResponse, AomiClient, type AomiClientOptions, type AomiClientType, type AomiCreateThreadResponse, type AomiDeleteSecretResponse, type AomiIngestSecretsResponse, type AomiInterruptResponse, type AomiMessage, type AomiSSEEvent, type AomiSSEEventType, type AomiSimulateFee, type AomiSimulateResponse, type AomiStateResponse, type AomiSystemEvent, type AomiSystemResponse, type AomiThread, type AtomicBatchArgs, CLIENT_TYPE_TS_CLI, CLIENT_TYPE_WEB_UI, type CreateAAStateOptions, type CreateAlchemyAAProviderOptions, type CreatePimlicoAAProviderOptions, DEFAULT_AA_CONFIG, DISABLED_PROVIDER_STATE, type ExecuteWalletCallsParams, type ExecutionResult, type Logger, MAX_AUTO_FEE_WEI, type NormalizedSimulatedFee, type PimlicoHookParams, type PimlicoResolveOptions, type PimlicoResolvedConfig, type SendResult, ClientSession as Session, type SessionEventMap, type SessionOptions, type SmartAccount, TypedEventEmitter, type UnwrappedEvent, type UseAlchemyAAHook, type UsePimlicoAAHook, UserState, type ViemSignTypedDataArgs, type WalletAtomicCapability, type WalletEip712Payload, type WalletRequest, type WalletRequestKind, type WalletRequestResult, type WalletTxAaPreference, type WalletTxCallPayload, type WalletTxPayload, aaModeFromExecutionKind, adaptSmartAccount, addUserStateExt, appendFeeCallToPayload, buildAAExecutionPlan, buildFeeAAWalletCall, createAAProviderState, createAlchemyAAProvider, createPimlicoAAProvider, executeWalletCalls, getAAChainConfig, getWalletExecutorReady, hydrateTxPayloadFromUserState, isAlchemySponsorshipLimitError, isAsyncCallback, isInlineCall, isSystemError, isSystemNotice, normalizeEip712Payload, normalizeSimulatedFee, normalizeTxPayload, parseChainId, resolvePimlicoConfig, toAAWalletCall, toAAWalletCalls, toViemSignTypedDataArgs, unwrapSystemEvent };
