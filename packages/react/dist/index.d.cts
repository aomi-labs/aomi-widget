import { AomiPlatformFilter, AomiClientOptions, AomiClient, SessionOptions, Session, UserState, WalletRequest, WalletRequestResult, AomiSimulateResponse, ChainInfo, AomiAppDescriptor } from '@aomi-labs/client';
export { AomiAppDescriptor, AomiChatResponse, AomiClient, AomiClientOptions, AomiCreateThreadResponse, AomiInterruptResponse, AomiMessage, AomiPlatformFilter, AomiSSEEvent, AomiSecretSlot, AomiStateResponse, AomiSystemEvent, AomiSystemResponse, AomiThread, ChainInfo, MAX_AUTO_FEE_WEI, NativeWalletExecutionPolicy, NativeWalletSponsorship, SponsorshipPaymasterServiceContext, UserState, ViemSignMessageArgs, WalletCapabilities, WalletEip712Payload, WalletRequest, WalletRequestKind, WalletRequestResult, WalletSolanaSignMessagePayload, WalletSolanaSignPayload, WalletTxPayload, aaModeFromExecutionKind, appIdentityKey, appendFeeCallToPayload, buildFeeAAWalletCall, executeWalletCalls, hydrateTxPayloadFromUserState, normalizeAppDescriptor, normalizeSimulatedFee, parseChainId, toAAWalletCall, toAAWalletCalls, toViemSignMessageArgs, toViemSignTypedDataArgs } from '@aomi-labs/client';
import * as react_jsx_runtime from 'react/jsx-runtime';
import * as react from 'react';
import { ReactNode, SetStateAction } from 'react';
import { ThreadMessageLike } from '@assistant-ui/react';
import { ClassValue } from 'clsx';

type AomiRuntimeProviderProps = {
    children: ReactNode;
    backendUrl?: string;
    applicationId?: number | string | null;
    appPlatforms?: AomiPlatformFilter;
    clientOptions?: Omit<AomiClientOptions, "baseUrl">;
    /** Whether a canonical account session can load threads without a wallet. */
    accountSessionAvailable?: boolean;
    /** Optional explicit initial thread. Takes precedence over stored state. */
    initialThreadId?: string;
    /** Persist the active materialized thread in localStorage. Defaults to true. */
    persistThread?: boolean;
    /** Full localStorage key override for vendors that need exact isolation. */
    threadPersistenceKey?: string;
    /** Extra key segment for tenant/user/app scoping without owning the full key. */
    threadPersistenceScope?: string | null;
};
declare function AomiRuntimeProvider({ children, backendUrl, applicationId, appPlatforms, clientOptions, accountSessionAvailable, initialThreadId, persistThread, threadPersistenceKey, threadPersistenceScope, }: Readonly<AomiRuntimeProviderProps>): react_jsx_runtime.JSX.Element;

declare class SessionManager {
    private readonly clientFactory;
    private sessions;
    constructor(clientFactory: () => AomiClient);
    getOrCreate(threadId: string, opts: Omit<SessionOptions, "sessionId">): Session;
    get(threadId: string): Session | undefined;
    get size(): number;
    forEach(callback: (session: Session, threadId: string) => void): void;
    close(threadId: string): void;
    closeIdleExcept(activeThreadId: string, onBeforeClose?: (threadId: string) => void): string[];
    closeAll(): void;
}

type RuntimeUserStateProviderProps = {
    children: ReactNode;
    sessionManager: SessionManager;
    getUserState: () => UserState;
    setUser: (data: Partial<UserState>) => void;
    onUserStateChange: (callback: (user: UserState) => void) => () => void;
};
declare function RuntimeUserStateProvider({ children, sessionManager, getUserState, setUser, onUserStateChange, }: RuntimeUserStateProviderProps): react_jsx_runtime.JSX.Element;

type ThreadContext = {
    currentThreadId: string;
    setCurrentThreadId: (id: string) => void;
    threadViewKey: number;
    bumpThreadViewKey: () => void;
    allThreads: Map<string, ThreadMessageLike[]>;
    setThreads: (updater: SetStateAction<Map<string, ThreadMessageLike[]>>) => void;
    allThreadsMetadata: Map<string, ThreadMetadata>;
    setThreadMetadata: (updater: SetStateAction<Map<string, ThreadMetadata>>) => void;
    threadCnt: number;
    setThreadCnt: (updater: SetStateAction<number>) => void;
    getThreadMessages: (threadId: string) => ThreadMessageLike[];
    setThreadMessages: (threadId: string, messages: ThreadMessageLike[]) => void;
    getThreadMetadata: (threadId: string) => ThreadMetadata | undefined;
    updateThreadMetadata: (threadId: string, updates: Partial<ThreadMetadata>) => void;
    resetToDefault: () => string;
};
type ThreadContextProviderProps = {
    children: ReactNode;
    initialThreadId?: string;
};
declare function useThreadContext(): ThreadContext;
declare function ThreadContextProvider({ children, initialThreadId, }: ThreadContextProviderProps): react_jsx_runtime.JSX.Element;
declare function useCurrentThreadMessages(): ThreadMessageLike[];
declare function useCurrentThreadMetadata(): ThreadMetadata | undefined;

type ThreadStatus = "regular" | "archived";
type ModelSelectionMode = "auto" | "manual";
type ThreadTurnPhase = "idle" | "submitting" | "working";
type ThreadControlState = {
    /** Selected model for this thread (human-readable label) */
    model: string | null;
    /** Whether the selected model should be displayed as auto or explicit */
    modelMode?: ModelSelectionMode;
    /** Selected app for this thread */
    app: string | null;
    /** Concrete backend application row for hosted/platform apps */
    applicationId: number | string | null;
    /** Whether control state has changed but chat hasn't started yet */
    controlDirty: boolean;
    /** Whether this thread is currently processing (assistant generating) */
    isProcessing: boolean;
    /** Fine-grained turn phase for rendering pending/working assistant states */
    turnPhase: ThreadTurnPhase;
    /** Epoch ms when the latest assistant turn completed in this thread. */
    lastCompletedAt?: number;
};
type ThreadMetadata = {
    title: string;
    status: ThreadStatus;
    lastActiveAt?: string | number;
    /** Per-thread control state (model, app selection) */
    control: ThreadControlState;
};
/** Create default control state for a new thread */
declare function initThreadControl(): ThreadControlState;

type InboundEvent = {
    type: string;
    sessionId: string;
    payload?: unknown;
};
type SSEStatus = "connected" | "connecting" | "disconnected";
type EventSubscriber = (event: InboundEvent) => void;
type EventContext = {
    /** Subscribe to events by type. Returns unsubscribe function. */
    subscribe: (type: string, callback: EventSubscriber) => () => void;
    /** Dispatch an event to all matching subscribers (used by orchestrator) */
    dispatch: (event: InboundEvent) => void;
    /** Send an outbound system message to backend */
    sendOutboundSystem: (event: {
        type: string;
        sessionId: string;
        payload: unknown;
    }) => Promise<void>;
    /** Current SSE connection status */
    sseStatus: SSEStatus;
};
declare function useEventContext(): EventContext;
type EventContextProviderProps = {
    children: ReactNode;
    aomiClient: AomiClient;
    sessionId: string;
};
/**
 * Simplified EventContext — a pure pub/sub relay.
 *
 * SSE subscription and system event unwrapping are now handled by ClientSession
 * in the orchestrator. This provider just maintains the subscriber registry
 * and sendOutboundSystem for direct system messages.
 */
declare function EventContextProvider({ children, aomiClient, sessionId, }: EventContextProviderProps): react_jsx_runtime.JSX.Element;

type NotificationType = "notice" | "success" | "error" | "wallet";
type Notification$1 = {
    id: string;
    type: NotificationType;
    /**
     * Optional discriminator for notifications that have a bespoke UI consumer.
     *
     * - `payment_required` is consumed by `PaymentRequiredGate` (apps/shadcn-registry)
     *   as a blocking modal. The toaster skips this kind. As a result, `type`,
     *   `message`, and `duration` are NOT rendered for this kind — only `kind`
     *   matters for routing. Don't bother passing those fields when firing it.
     */
    kind?: "payment_required";
    title: string;
    message?: string;
    duration?: number;
    timestamp: number;
};
type NotificationData = Omit<Notification$1, "id" | "timestamp">;
type NotificationContextApi = {
    /** All active notifications */
    notifications: Notification$1[];
    /** Show a new notification */
    showNotification: (params: NotificationData) => string;
    /** Dismiss a notification by ID */
    dismissNotification: (id: string) => void;
    /** Clear all notifications */
    clearAll: () => void;
};
declare function useNotification(): NotificationContextApi;
type NotificationContextProviderProps = {
    children: ReactNode;
};
declare function NotificationContextProvider({ children, }: NotificationContextProviderProps): react_jsx_runtime.JSX.Element;

type WalletRequestStatus = "pending" | "processing";
type WalletHandlerConfig = {
    /** Get the ClientSession for the current thread. */
    getSession: () => Session | undefined;
};
type WalletHandlerApi = {
    /**
     * All queued wallet requests across every supported kind: EVM txs
     * (`kind: "transaction"`), EIP-712 signs (`kind: "eip712_sign"`), and
     * Solana signs (`kind: "solana_sign"`). Consumers should narrow on
     * `request.kind` before reading `request.payload` — the discriminated
     * union auto-narrows the payload type.
     */
    pendingRequests: WalletRequest[];
    /** True while a visible or callback-in-flight wallet request still exists. */
    hasBlockingWalletRequests: boolean;
    /** Replace pending requests with the session's authoritative snapshot. */
    setRequests: (requests: WalletRequest[]) => void;
    /** Mark a request as in-flight so it is not replayed while awaiting backend ack. */
    startRequest: (id: string) => void;
    /**
     * Complete a request successfully — sends the response wire event to
     * the backend via ClientSession. The `result.kind` discriminator must
     * match the originating request's kind (e.g. `{ kind: "solana_sign",
     * signedTx: "..." }` for a Solana request); ClientSession runtime-checks
     * this and throws on mismatch.
     */
    resolveRequest: (id: string, result: WalletRequestResult) => Promise<void>;
    /** Fail a request — sends error to backend via ClientSession */
    rejectRequest: (id: string, error?: string) => Promise<void>;
};
declare function useWalletHandler({ getSession, }: WalletHandlerConfig): WalletHandlerApi;

type AomiRuntimeApi = {
    /** Current user state (wallet connection, address, chain, etc.) */
    user: UserState;
    /** Get current user state synchronously (useful in callbacks) */
    getUserState: () => UserState;
    /** Update user state (partial updates merged with existing state) */
    setUser: (data: Partial<UserState>) => void;
    /** Add or overwrite a value in user_state.ext */
    addExtValue: (key: string, value: unknown) => void;
    /** Remove a value from user_state.ext */
    removeExtValue: (key: string) => void;
    /** Subscribe to user state changes. Returns unsubscribe function. */
    onUserStateChange: (callback: (user: UserState) => void) => () => void;
    /** ID of the currently active thread */
    currentThreadId: string;
    /** Key that changes when thread view should remount (use for React key prop) */
    threadViewKey: number;
    /** Metadata for all threads (title, status, lastActiveAt) */
    threadMetadata: Map<string, ThreadMetadata>;
    /** True when the authenticated thread list failed to load. */
    threadListError: boolean;
    /** Get metadata for a specific thread */
    getThreadMetadata: (threadId: string) => ThreadMetadata | undefined;
    /** Create a new thread and return its ID */
    createThread: () => Promise<string>;
    /** Delete a thread by ID */
    deleteThread: (threadId: string) => Promise<void>;
    /** Rename a thread */
    renameThread: (threadId: string, title: string) => Promise<void>;
    /** Archive a thread */
    archiveThread: (threadId: string) => Promise<void>;
    /** Switch to a thread. If thread doesn't exist, creates a new one. */
    selectThread: (threadId: string) => void;
    /** Whether the assistant is currently generating a response */
    isRunning: boolean;
    /** Get messages for a thread (defaults to currentThreadId) */
    getMessages: (threadId?: string) => ThreadMessageLike[];
    /** Send a message to the current thread */
    sendMessage: (text: string) => Promise<void>;
    /** Cancel the current generation */
    cancelGeneration: () => void;
    /** All active notifications */
    notifications: Notification$1[];
    /** Show a notification. Returns the notification ID. */
    showNotification: (params: NotificationData) => string;
    /** Dismiss a notification by ID */
    dismissNotification: (id: string) => void;
    /** Clear all notifications */
    clearAllNotifications: () => void;
    /** All queued wallet requests (tx + eip712 signing) */
    pendingWalletRequests: WalletRequest[];
    /** True while switching wallets or networks could lose an unresolved request. */
    hasBlockingWalletRequests: boolean;
    /** Mark a wallet request as in-flight — suppresses it from the pending list until acked */
    startWalletRequest: (id: string) => void;
    /** Complete a wallet request after the backend acknowledges the response */
    resolveWalletRequest: (id: string, result: WalletRequestResult) => Promise<void>;
    /** Fail a wallet request after the backend acknowledges the error */
    rejectWalletRequest: (id: string, error?: string) => Promise<void>;
    /** Simulate a batch against the current thread session context. */
    simulateBatchTransactions: (transactions: Array<{
        to: string;
        value?: string;
        data?: string;
        label?: string;
        chain_id?: number;
        chainId?: number;
    }>, options?: {
        from?: string;
        chainId?: number;
    }) => Promise<AomiSimulateResponse["result"]>;
    /** Subscribe to inbound events by type. Returns unsubscribe function. */
    subscribe: (type: string, callback: EventSubscriber) => () => void;
    /** Send a system command to the backend */
    sendSystemCommand: (event: {
        type: string;
        sessionId: string;
        payload: unknown;
    }) => Promise<void>;
    /** Record ephemeral UI context for the next model turn on the active thread. */
    recordUiInteraction: (payload: unknown) => Promise<void>;
    /** Current SSE connection status */
    sseStatus: SSEStatus;
};
declare const AomiRuntimeApiProvider: react.Provider<AomiRuntimeApi | null>;
/**
 * Unified hook that provides access to all Aomi runtime APIs.
 *
 * This is the primary way to interact with the Aomi runtime from consumer code.
 * It combines user, thread, chat, notification, and event APIs into a single interface.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const aomi = useAomiRuntime();
 *
 *   // User API
 *   const { user, setUser } = aomi;
 *
 *   // Thread API
 *   const { currentThreadId, createThread, selectThread } = aomi;
 *
 *   // Chat API
 *   const { isRunning, sendMessage, cancelGeneration } = aomi;
 *
 *   // Notification API
 *   const { showNotification } = aomi;
 *
 *   // Event API
 *   const { subscribe, sendSystemCommand, recordUiInteraction } = aomi;
 * }
 * ```
 */
declare function useAomiRuntime(): AomiRuntimeApi;
/** Returns the runtime when mounted, allowing standalone registry previews. */
declare function useOptionalAomiRuntime(): AomiRuntimeApi | null;

type Notification = {
    id: string;
    type: string;
    title: string;
    body?: unknown;
    handled: boolean;
    timestamp: number;
    sessionId: string;
};
type NotificationHandlerConfig = {
    /** Callback when new notification arrives */
    onNotification?: (notification: Notification) => void;
};
type NotificationApi = {
    /** All notifications */
    notifications: Notification[];
    /** Unhandled count */
    unhandledCount: number;
    /** Mark notification as handled */
    markDone: (id: string) => void;
};
declare function useNotificationHandler({ onNotification, }?: NotificationHandlerConfig): NotificationApi;

declare function useUser(): {
    user: UserState;
    setUser: (data: Partial<UserState>) => void;
    addExtValue: (key: string, value: unknown) => void;
    removeExtValue: (key: string) => void;
    getUserState: () => UserState;
    onUserStateChange: (callback: (user: UserState) => void) => () => void;
};
/**
 * Idempotent provider: if a parent already provided `UserContext`, render
 * children straight through. Otherwise mount a fresh store.
 *
 * The widget layers (`AomiFrame.Root` / `AomiRuntime`) and the wallet-kit
 * layers (`AomiParaProvider` / `AomiBaseAccountProvider`) both want to be
 * usable standalone. Each historically wrapped with `<ExtUserProvider>` —
 * but when they nest, the inner provider created a *second* store that
 * shadowed the outer. The chat composer would read from one store while
 * `AomiWalletKitSync` wrote to another, so wallet connects never
 * propagated to the chat's `user_state`. Collapsing nested mounts to the
 * outermost store fixes that without forcing host apps to wire the
 * provider themselves.
 */
declare function ExtUserProvider({ children }: {
    children: ReactNode;
}): react_jsx_runtime.JSX.Element;

/**
 * Utility function to merge Tailwind CSS classes with conflict resolution.
 * Combines clsx for conditional classes and tailwind-merge for deduplication.
 */
declare function cn(...inputs: ClassValue[]): string;
/**
 * User configuration props for footer components.
 * Provides user state and setter from UserContext.
 */
type UserConfig = {
    user: UserState;
    setUser: (data: Partial<UserState>) => void;
};
declare const getNetworkName: (chainId: number | string | undefined) => string;
declare const formatAddress: (addr?: string) => string;

/** All chains supported by the application. Sourced from @aomi-labs/client. */
declare const SUPPORTED_CHAINS: ChainInfo[];
/** Look up ChainInfo by chain ID. Returns undefined for unknown chains. */
declare const getChainInfo: (chainId: number | undefined) => ChainInfo | undefined;

/**
 * Resolve the actual backend model for auto mode.
 * Prefers the current auto model before falling back to older balanced defaults
 * and then backend order.
 */
declare function resolveAutoModel(models: string[]): string | null;

type ApiKeyState = {
    apiKey: string | null;
};
type ApiKeyActions = {
    setApiKey: (apiKey: string | null) => void;
};

type StoredByokKey = {
    apiKey: string;
    keyPrefix: string;
    label?: string;
};
type ByokState = {
    byokKeys: Record<string, StoredByokKey>;
};
type SecretsActions = {
    ingestSecrets: (secrets: Record<string, string>, app?: string) => Promise<Record<string, string>>;
    clearSecrets: (app?: string) => Promise<void>;
    deleteSecret: (name: string, app?: string) => Promise<void>;
    listSecrets: () => Promise<Record<string, string[]>>;
};
type ByokActions = SecretsActions & {
    setByok: (provider: string, apiKey: string, label?: string) => Promise<void>;
    removeByok: (provider: string) => Promise<void>;
    getByokKeys: () => Record<string, StoredByokKey>;
    hasByok: (provider?: string) => boolean;
};

type AuthEndpointsState = {
    availableModels: string[];
    defaultModel: string | null;
    authorizedApps: string[];
    appDescriptors: AomiAppDescriptor[];
    defaultApp: string | null;
};
type AuthEndpointsActions = {
    /** Force a refresh of the models list. */
    getAvailableModels: () => Promise<string[]>;
    /** Force a refresh of the authorized apps list. */
    getAuthorizedApps: () => Promise<string[]>;
};

type ApplicationId = number | string | null;
type AppSelectionOptions = {
    applicationId?: ApplicationId;
};
type PerThreadControlActions = {
    getCurrentThreadControl: () => ThreadControlState;
    getCurrentThreadApp: () => string;
    getCurrentThreadApplicationId: () => ApplicationId;
    getPreferredThreadControl: () => ThreadControlState;
    onModelSelect: (model: string, options?: {
        mode?: ModelSelectionMode;
    }) => Promise<void>;
    onAppSelect: (app: string, options?: AppSelectionOptions) => void;
    markControlSynced: () => void;
    syncCurrentThreadControl: (options?: {
        ignoreProcessing?: boolean;
    }) => Promise<void>;
};

/**
 * Aggregated control state. Mirrors the historical shape so callers reading
 * `useControl().state` keep working. New code should prefer the focused
 * hooks and read their narrower slices directly.
 */
type ControlState = ApiKeyState & ByokState & AuthEndpointsState & {
    clientId: string | null;
};
type ControlContextApi = ApiKeyActions & ByokActions & AuthEndpointsActions & PerThreadControlActions & {
    state: ControlState;
    isProcessing: boolean;
    /** Synchronous getter used by the runtime to read the latest state from a
     *  callback that fires outside render. */
    getControlState: () => ControlState;
};
declare function useControl(): ControlContextApi;
declare function useApiKey(): {
    state: ApiKeyState & {
        clientId: string | null;
    };
    actions: ApiKeyActions;
};
declare function useByok(): {
    state: ByokState;
    actions: ByokActions;
};
declare function useAuthEndpoints(): {
    state: AuthEndpointsState;
    actions: AuthEndpointsActions;
};
declare function usePerThreadControl(): {
    actions: PerThreadControlActions;
    isProcessing: boolean;
};
type ControlContextProviderProps = {
    children: ReactNode;
    aomiClient: AomiClient;
    sessionId: string;
    getThreadMetadata: (threadId: string) => ThreadMetadata | undefined;
    updateThreadMetadata: (threadId: string, partial: Partial<ThreadMetadata>) => void;
    appPlatforms?: AomiPlatformFilter;
};
declare function ControlContextProvider({ children, aomiClient, sessionId, getThreadMetadata, updateThreadMetadata, appPlatforms, }: ControlContextProviderProps): react_jsx_runtime.JSX.Element;

export { type AomiRuntimeApi, AomiRuntimeApiProvider, AomiRuntimeProvider, type AomiRuntimeProviderProps, type ControlContextApi, ControlContextProvider, type ControlContextProviderProps, type ControlState, type EventContext, EventContextProvider, type EventContextProviderProps, type EventSubscriber, ExtUserProvider, type InboundEvent, type ModelSelectionMode, type Notification$1 as Notification, type NotificationApi, NotificationContextProvider, type NotificationContextProviderProps, type NotificationContextApi as NotificationContextValue, type NotificationHandlerConfig, type NotificationType, RuntimeUserStateProvider, type SSEStatus, SUPPORTED_CHAINS, type NotificationData as ShowNotificationParams, type StoredByokKey, type ThreadContext, ThreadContextProvider, type ThreadControlState, type ThreadMetadata, type ThreadTurnPhase, type UserConfig, type WalletHandlerApi, type WalletHandlerConfig, type WalletRequestStatus, cn, formatAddress, getChainInfo, getNetworkName, initThreadControl, resolveAutoModel, useAomiRuntime, useApiKey, useAuthEndpoints, useByok, useControl, useCurrentThreadMessages, useCurrentThreadMetadata, useEventContext, useNotification, useNotificationHandler, useOptionalAomiRuntime, usePerThreadControl, useThreadContext, useUser, useWalletHandler };
