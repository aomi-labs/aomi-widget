import { Chain, Hex, TransactionReceipt } from 'viem';

/**
 * Client-side user state synced with the backend.
 * Typically wallet connection info, but can be any key-value data.
 */
type UserState = Record<string, unknown>;
/**
 * Optional logger for debug output. Pass `console` or any compatible object.
 */
type Logger = {
    debug: (...args: unknown[]) => void;
};
type AomiClientOptions = {
    /** Base URL of the Aomi backend (e.g. "https://aomi.dev") */
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
 * Base SSE event - all events have session_id and type
 */
type AomiSSEEvent = {
    type: "title_changed" | "tool_update" | "tool_complete" | "system_notice" | string;
    session_id: string;
    new_title?: string;
    [key: string]: unknown;
};
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
    fetchState(sessionId: string, userState?: UserState): Promise<AomiStateResponse>;
    /**
     * Send a chat message and return updated session state.
     */
    sendMessage(sessionId: string, message: string, options?: {
        app?: string;
        publicKey?: string;
        apiKey?: string;
        userState?: UserState;
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
    }): Promise<{
        success: boolean;
        rig: string;
        baml: string;
        created: boolean;
    }>;
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
    /**
     * Subscribe to an event type. Returns an unsubscribe function.
     */
    on<K extends keyof EventMap & string>(type: K, handler: Listener<EventMap[K]>): () => void;
    /**
     * Subscribe to an event type for a single emission, then auto-unsubscribe.
     */
    once<K extends keyof EventMap & string>(type: K, handler: Listener<EventMap[K]>): () => void;
    /**
     * Emit an event to all listeners of `type` and wildcard `"*"` listeners.
     */
    emit<K extends keyof EventMap & string>(type: K, payload: EventMap[K]): void;
    /**
     * Remove a specific handler from an event type.
     */
    off<K extends keyof EventMap & string>(type: K, handler: Listener<EventMap[K]>): void;
    /**
     * Remove all listeners for all event types.
     */
    removeAllListeners(): void;
}

type WalletTxPayload = {
    to: string;
    value?: string;
    data?: string;
    chainId?: number;
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
};
/**
 * Normalize a wallet_tx_request payload into a consistent shape.
 * Returns `null` if the payload is missing the required `to` field.
 */
declare function normalizeTxPayload(payload: unknown): WalletTxPayload | null;
/**
 * Normalize an EIP-712 signing request payload.
 */
declare function normalizeEip712Payload(payload: unknown): WalletEip712Payload;

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
    /** Polling interval in ms. Default: 500 */
    pollIntervalMs?: number;
    /** Logger for debug output. Pass `console` for verbose logging. */
    logger?: {
        debug: (...args: unknown[]) => void;
    };
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
    private pollIntervalMs;
    private logger?;
    private pollTimer;
    private unsubscribeSSE;
    private _isProcessing;
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
    /** Pending wallet requests waiting for resolve/reject. */
    getPendingRequests(): WalletRequest[];
    /** Whether the AI is currently processing. */
    getIsProcessing(): boolean;
    resolveUserState(userState: UserState): void;
    addExtValue(key: string, value: unknown): void;
    removeExtValue(key: string): void;
    resolveWallet(address: string, chainId?: number): void;
    syncUserState(): Promise<AomiStateResponse>;
    private startPolling;
    private stopPolling;
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
}

type UnwrappedEvent = {
    type: string;
    payload: unknown;
};
/**
 * Unwrap a tagged-enum AomiSystemEvent from the backend into a flat event.
 *
 * ```ts
 * const event: AomiSystemEvent = { InlineCall: { type: "wallet_tx_request", payload: { to: "0x..." } } };
 * const unwrapped = unwrapSystemEvent(event);
 * // => { type: "wallet_tx_request", payload: { to: "0x..." } }
 * ```
 */
declare function unwrapSystemEvent(event: AomiSystemEvent): UnwrappedEvent | null;

type AAExecutionMode = "4337" | "7702";
type AASponsorshipMode = "disabled" | "optional" | "required";
type WalletExecutionCall = {
    to: string;
    value: string;
    data?: string;
    chainId: number;
};
type WalletAtomicCapability = {
    atomic?: {
        status?: string;
    };
};
type WalletPrimitiveCall = {
    to: Hex;
    value: bigint;
    data?: Hex;
};
interface AAChainConfig {
    chainId: number;
    enabled: boolean;
    defaultMode: AAExecutionMode;
    supportedModes: AAExecutionMode[];
    allowBatching: boolean;
    sponsorship: AASponsorshipMode;
}
interface AAConfig {
    enabled: boolean;
    provider: string;
    fallbackToEoa: boolean;
    chains: AAChainConfig[];
}
interface AAExecutionPlan {
    provider: string;
    chainId: number;
    mode: AAExecutionMode;
    batchingEnabled: boolean;
    sponsorship: AASponsorshipMode;
    fallbackToEoa: boolean;
}
interface AALike {
    provider: string;
    mode: string;
    AAAddress?: Hex;
    delegationAddress?: Hex;
    sendTransaction: (call: WalletPrimitiveCall) => Promise<{
        transactionHash: string;
    }>;
    sendBatchTransaction: (calls: WalletPrimitiveCall[]) => Promise<{
        transactionHash: string;
    }>;
}
interface AAProviderQuery<TAA extends AALike = AALike> {
    AA?: TAA | null;
    isPending?: boolean;
    error?: Error | null;
}
interface AAProviderState<TAA extends AALike = AALike> {
    plan: AAExecutionPlan | null;
    AA?: TAA | null;
    isPending: boolean;
    error: Error | null;
    query?: AAProviderQuery<TAA>;
}
interface TransactionExecutionResult {
    txHash: string;
    txHashes: string[];
    executionKind: string;
    batched: boolean;
    sponsored: boolean;
    AAAddress?: Hex;
    delegationAddress?: Hex;
}
interface SendCallsSyncArgs {
    calls: WalletPrimitiveCall[];
    capabilities?: {
        atomic?: {
            required?: boolean;
        };
    };
}
interface ExecuteWalletCallsParams<TAA extends AALike = AALike> {
    callList: WalletExecutionCall[];
    currentChainId: number;
    capabilities: Record<string, WalletAtomicCapability> | undefined;
    localPrivateKey: `0x${string}` | null;
    providerState: AAProviderState<TAA>;
    sendCallsSyncAsync: (args: SendCallsSyncArgs) => Promise<unknown>;
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
declare function parseAAConfig(value: unknown): AAConfig;
declare function getAAChainConfig(config: AAConfig, calls: WalletExecutionCall[], chainsById: Record<number, Chain>): AAChainConfig | null;
declare function buildAAExecutionPlan(config: AAConfig, chainConfig: AAChainConfig): AAExecutionPlan;
declare function getWalletExecutorReady(providerState: AAProviderState): boolean;
declare const DEFAULT_AA_CONFIG: AAConfig;
declare function executeWalletCalls(params: ExecuteWalletCallsParams): Promise<TransactionExecutionResult>;

interface AlchemyHookParams {
    enabled: boolean;
    apiKey: string;
    chain: Chain;
    rpcUrl: string;
    gasPolicyId?: string;
    mode: AAExecutionMode;
}
type UseAlchemyAAHook<TAA extends AALike = AALike, TQuery extends AAProviderQuery<TAA> = AAProviderQuery<TAA>> = (params?: AlchemyHookParams) => TQuery;
interface CreateAlchemyAAProviderOptions<TAA extends AALike = AALike, TQuery extends AAProviderQuery<TAA> = AAProviderQuery<TAA>> {
    accountAbstractionConfig?: AAConfig;
    useAlchemyAA: UseAlchemyAAHook<TAA, TQuery>;
    chainsById: Record<number, Chain>;
    chainSlugById: Record<number, string>;
    getPreferredRpcUrl: (chain: Chain) => string;
    apiKeyEnvVar?: string;
    gasPolicyEnvVar?: string;
}
declare function createAlchemyAAProvider<TAA extends AALike = AALike, TQuery extends AAProviderQuery<TAA> = AAProviderQuery<TAA>>({ accountAbstractionConfig, useAlchemyAA, chainsById, chainSlugById, getPreferredRpcUrl, }: CreateAlchemyAAProviderOptions<TAA, TQuery>): (calls: WalletExecutionCall[] | null, localPrivateKey: `0x${string}` | null) => AAProviderState<TAA>;

interface PimlicoHookParams {
    enabled: boolean;
    apiKey: string;
    chain: Chain;
    mode: AAExecutionMode;
    rpcUrl?: string;
}
type UsePimlicoAAHook<TAA extends AALike = AALike, TQuery extends AAProviderQuery<TAA> = AAProviderQuery<TAA>> = (params?: PimlicoHookParams) => TQuery;
interface CreatePimlicoAAProviderOptions<TAA extends AALike = AALike, TQuery extends AAProviderQuery<TAA> = AAProviderQuery<TAA>> {
    accountAbstractionConfig?: AAConfig;
    usePimlicoAA: UsePimlicoAAHook<TAA, TQuery>;
    chainsById: Record<number, Chain>;
    apiKeyEnvVar?: string;
    rpcUrl?: string;
}
declare function createPimlicoAAProvider<TAA extends AALike = AALike, TQuery extends AAProviderQuery<TAA> = AAProviderQuery<TAA>>({ accountAbstractionConfig, usePimlicoAA, chainsById, rpcUrl, }: CreatePimlicoAAProviderOptions<TAA, TQuery>): (calls: WalletExecutionCall[] | null, localPrivateKey: `0x${string}` | null) => AAProviderState<TAA>;

/**
 * Reads the first non-empty env var from `candidates`.
 * When `publicOnly` is true, only `NEXT_PUBLIC_*` names are considered.
 */
declare function readEnv(candidates: readonly string[], options?: {
    publicOnly?: boolean;
}): string | undefined;
type AAProvider = "alchemy" | "pimlico";
/**
 * Returns true if the given provider has a configured API key.
 */
declare function isProviderConfigured(provider: AAProvider, options?: {
    publicOnly?: boolean;
}): boolean;
/**
 * Picks the first configured provider (alchemy > pimlico).
 * Throws if neither is configured.
 */
declare function resolveDefaultProvider(options?: {
    publicOnly?: boolean;
}): AAProvider;

type ParaSmartAccountLike = {
    provider: string;
    mode: AAExecutionMode;
    smartAccountAddress: Hex;
    delegationAddress?: Hex;
    sendTransaction: (call: WalletPrimitiveCall, options?: unknown) => Promise<TransactionReceipt>;
    sendBatchTransaction: (calls: WalletPrimitiveCall[], options?: unknown) => Promise<TransactionReceipt>;
};
/**
 * Bridges a `ParaSmartAccountLike` (from `@getpara/aa-*` SDKs) into
 * the library's `AALike` interface:
 * - Maps `smartAccountAddress` → `AAAddress`
 * - Unwraps `TransactionReceipt` → `{ transactionHash }`
 */
declare function adaptSmartAccount(account: ParaSmartAccountLike): AALike;
/**
 * Detects Alchemy gas sponsorship quota errors.
 */
declare function isAlchemySponsorshipLimitError(error: unknown): boolean;

interface AlchemyResolveOptions {
    calls: WalletExecutionCall[] | null;
    localPrivateKey?: `0x${string}` | null;
    accountAbstractionConfig?: AAConfig;
    chainsById: Record<number, Chain>;
    chainSlugById?: Record<number, string>;
    getPreferredRpcUrl?: (chain: Chain) => string;
    modeOverride?: AAExecutionMode;
    publicOnly?: boolean;
    throwOnMissingConfig?: boolean;
    /**
     * Pre-resolved API key. Use this in Next.js client-side code where
     * dynamic `process.env[name]` access doesn't work.
     */
    apiKey?: string;
    gasPolicyId?: string;
}
interface AlchemyResolvedConfig {
    chainConfig: AAChainConfig;
    plan: AAExecutionPlan;
    apiKey: string;
    chain: Chain;
    rpcUrl: string;
    gasPolicyId?: string;
    mode: AAExecutionMode;
}
declare function resolveAlchemyConfig(options: AlchemyResolveOptions): AlchemyResolvedConfig | null;
interface PimlicoResolveOptions {
    calls: WalletExecutionCall[] | null;
    localPrivateKey?: `0x${string}` | null;
    accountAbstractionConfig?: AAConfig;
    chainsById: Record<number, Chain>;
    rpcUrl?: string;
    modeOverride?: AAExecutionMode;
    publicOnly?: boolean;
    throwOnMissingConfig?: boolean;
    /**
     * Pre-resolved API key. Use this in Next.js client-side code where
     * dynamic `process.env[name]` access doesn't work.
     */
    apiKey?: string;
}
interface PimlicoResolvedConfig {
    chainConfig: AAChainConfig;
    plan: AAExecutionPlan;
    apiKey: string;
    chain: Chain;
    rpcUrl?: string;
    mode: AAExecutionMode;
}
declare function resolvePimlicoConfig(options: PimlicoResolveOptions): PimlicoResolvedConfig | null;

type CreateAAOwner = {
    privateKey: `0x${string}`;
} | {
    signer: unknown;
    para: unknown;
    address?: Hex;
} | {
    para: unknown;
    address?: Hex;
};
interface CreateAAProviderStateOptions {
    provider: AAProvider;
    chain: Chain;
    owner: CreateAAOwner;
    rpcUrl: string;
    callList: WalletExecutionCall[];
    mode?: AAExecutionMode;
    apiKey?: string;
    gasPolicyId?: string;
    sponsored?: boolean;
}
/**
 * Creates an `AAProviderState` by instantiating the appropriate smart account
 * via `@getpara/aa-alchemy` or `@getpara/aa-pimlico`.
 *
 * This is the single entry-point for async (non-hook) AA provider state creation.
 */
declare function createAAProviderState(options: CreateAAProviderStateOptions): Promise<AAProviderState>;

export { type AAChainConfig, type AAConfig, type AAExecutionMode, type AAExecutionPlan, type AALike, type AAProvider, type AAProviderQuery, type AAProviderState, type AASponsorshipMode, type AlchemyHookParams, type AlchemyResolveOptions, type AlchemyResolvedConfig, type AomiChatResponse, AomiClient, type AomiClientOptions, type AomiCreateThreadResponse, type AomiInterruptResponse, type AomiMessage, type AomiSSEEvent, type AomiSSEEventType, type AomiStateResponse, type AomiSystemEvent, type AomiSystemResponse, type AomiThread, type CreateAAOwner, type CreateAAProviderStateOptions, type CreateAlchemyAAProviderOptions, type CreatePimlicoAAProviderOptions, DEFAULT_AA_CONFIG, type ExecuteWalletCallsParams, type Logger, type ParaSmartAccountLike, type PimlicoHookParams, type PimlicoResolveOptions, type PimlicoResolvedConfig, type SendCallsSyncArgs, type SendResult, ClientSession as Session, type SessionEventMap, type SessionOptions, type TransactionExecutionResult, TypedEventEmitter, type UnwrappedEvent, type UseAlchemyAAHook, type UsePimlicoAAHook, type UserState, type WalletAtomicCapability, type WalletEip712Payload, type WalletExecutionCall, type WalletPrimitiveCall, type WalletRequest, type WalletRequestKind, type WalletRequestResult, type WalletTxPayload, adaptSmartAccount, buildAAExecutionPlan, createAAProviderState, createAlchemyAAProvider, createPimlicoAAProvider, executeWalletCalls, getAAChainConfig, getWalletExecutorReady, isAlchemySponsorshipLimitError, isAsyncCallback, isInlineCall, isProviderConfigured, isSystemError, isSystemNotice, normalizeEip712Payload, normalizeTxPayload, parseAAConfig, readEnv, resolveAlchemyConfig, resolveDefaultProvider, resolvePimlicoConfig, unwrapSystemEvent };
