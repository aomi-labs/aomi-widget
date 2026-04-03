import { WalletTxPayload, WalletEip712Payload, AomiSystemEvent, AomiClient } from '@aomi-labs/client';
export { AomiChatResponse, AomiClient, AomiClientOptions, AomiCreateThreadResponse, AomiInterruptResponse, AomiMessage, AomiSSEEvent, AomiStateResponse, AomiSystemEvent, AomiSystemResponse, AomiThread, WalletEip712Payload, WalletTxPayload, toViemSignTypedDataArgs } from '@aomi-labs/client';
import * as react_jsx_runtime from 'react/jsx-runtime';
import { ReactNode, SetStateAction } from 'react';
import { ThreadMessageLike } from '@assistant-ui/react';
import { ClassValue } from 'clsx';

type AomiRuntimeProviderProps = {
    children: ReactNode;
    backendUrl?: string;
};
declare function AomiRuntimeProvider({ children, backendUrl, }: Readonly<AomiRuntimeProviderProps>): react_jsx_runtime.JSX.Element;

type UserState = {
    address?: string;
    chainId?: number;
    isConnected: boolean;
    ensName?: string;
    ext?: Record<string, unknown>;
};
declare function useUser(): {
    user: UserState;
    setUser: (data: Partial<UserState>) => void;
    addExtValue: (key: string, value: unknown) => void;
    removeExtValue: (key: string) => void;
    getUserState: () => UserState;
    onUserStateChange: (callback: (user: UserState) => void) => () => void;
};
declare function UserContextProvider({ children }: {
    children: ReactNode;
}): react_jsx_runtime.JSX.Element;

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
type ThreadControlState = {
    /** Selected model for this thread (human-readable label) */
    model: string | null;
    /** Selected app for this thread */
    app: string | null;
    /** Whether control state has changed but chat hasn't started yet */
    controlDirty: boolean;
    /** Whether this thread is currently processing (assistant generating) */
    isProcessing: boolean;
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
    status: "pending" | "fetched";
    timestamp: number;
};
type OutboundEvent = {
    type: string;
    sessionId: string;
    payload: unknown;
    timestamp: number;
};
type SSEStatus = "connected" | "connecting" | "disconnected";
type EventSubscriber = (event: InboundEvent) => void;
type EventBuffer = {
    inboundQueue: InboundEvent[];
    outboundQueue: OutboundEvent[];
    sseStatus: SSEStatus;
    lastEventId: string | null;
    subscribers: Map<string, Set<EventSubscriber>>;
};

type NotificationType = "notice" | "success" | "error" | "wallet";
type Notification$1 = {
    id: string;
    type: NotificationType;
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

type WalletRequestKind = "transaction" | "eip712_sign";
type WalletRequestStatus = "pending" | "processing";
type WalletRequest = {
    id: string;
    kind: WalletRequestKind;
    payload: WalletTxPayload | WalletEip712Payload;
    status: WalletRequestStatus;
    timestamp: number;
};
type WalletBuffer = {
    queue: WalletRequest[];
    nextId: number;
};

type WalletRequestResult = {
    txHash?: string;
    signature?: string;
    amount?: string;
};
type WalletHandlerConfig = {
    sessionId: string;
    /** Called after a wallet request is resolved/rejected and the outbound event is sent.
     *  Used by core.tsx to start polling for the AI's response. */
    onRequestComplete?: () => void;
};
type WalletHandlerApi = {
    /** All queued wallet requests (tx + eip712) */
    pendingRequests: WalletRequest[];
    /** Mark a request as being processed */
    startProcessing: (id: string) => void;
    /** Complete a request successfully — dequeues + sends response to backend */
    resolveRequest: (id: string, result: WalletRequestResult) => void;
    /** Fail a request — dequeues + sends error to backend */
    rejectRequest: (id: string, error?: string) => void;
};
declare function useWalletHandler({ sessionId, onRequestComplete, }: WalletHandlerConfig): WalletHandlerApi;

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
    /** Mark a wallet request as being processed */
    startWalletRequest: (id: string) => void;
    /** Complete a wallet request — dequeues + sends response to backend */
    resolveWalletRequest: (id: string, result: WalletRequestResult) => void;
    /** Fail a wallet request — dequeues + sends error to backend */
    rejectWalletRequest: (id: string, error?: string) => void;
    /** Subscribe to inbound events by type. Returns unsubscribe function. */
    subscribe: (type: string, callback: EventSubscriber) => () => void;
    /** Send a system command to the backend */
    sendSystemCommand: (event: Omit<OutboundEvent, "timestamp">) => Promise<void>;
    /** Current SSE connection status */
    sseStatus: SSEStatus;
};
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
 *   const { subscribe, sendSystemCommand } = aomi;
 * }
 * ```
 */
declare function useAomiRuntime(): AomiRuntimeApi;

type EventContext = {
    /** Subscribe to inbound events by type. Returns unsubscribe function. */
    subscribe: (type: string, callback: EventSubscriber) => () => void;
    /** Send an outbound event to backend immediately */
    sendOutboundSystem: (event: Omit<OutboundEvent, "timestamp">) => Promise<void>;
    /** Dispatch system events from HTTP polling into the event buffer */
    dispatchInboundSystem: (sessionId: string, events: AomiSystemEvent[]) => void;
    /** Current SSE connection status */
    sseStatus: SSEStatus;
};
declare function useEventContext(): EventContext;
type EventContextProviderProps = {
    children: ReactNode;
    aomiClient: AomiClient;
    sessionId: string;
};
declare function EventContextProvider({ children, aomiClient, sessionId, }: EventContextProviderProps): react_jsx_runtime.JSX.Element;

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
/** Static metadata for a supported chain */
type ChainInfo = {
    id: number;
    name: string;
    ticker: string;
};
/** All chains supported by the application. Single source of truth. */
declare const SUPPORTED_CHAINS: ChainInfo[];
/** Look up ChainInfo by chain ID. Returns undefined for unknown chains. */
declare const getChainInfo: (chainId: number | undefined) => ChainInfo | undefined;

/** Global control state (shared across all threads) */
type ControlState = {
    /** API key for authenticated requests */
    apiKey: string | null;
    /** Available models fetched from backend */
    availableModels: string[];
    /** Authorized apps fetched from backend */
    authorizedApps: string[];
    /** Default model (first from availableModels) */
    defaultModel: string | null;
    /** Default app (from authorizedApps) */
    defaultApp: string | null;
};
type ControlContextApi = {
    /** Global state (apiKey, available models/apps) */
    state: ControlState;
    /** Update global state (apiKey only) */
    setApiKey: (apiKey: string | null) => void;
    /** Fetch available models from backend */
    getAvailableModels: () => Promise<string[]>;
    /** Fetch authorized apps from backend */
    getAuthorizedApps: () => Promise<string[]>;
    /** Get current thread's control state */
    getCurrentThreadControl: () => ThreadControlState;
    /** Get the current thread's effective app after auth fallback */
    getCurrentThreadApp: () => string;
    /** Select a model for the current thread (updates metadata + calls backend) */
    onModelSelect: (model: string) => Promise<void>;
    /** Select an app for the current thread (updates metadata only) */
    onAppSelect: (app: string) => void;
    /** Whether the current thread is processing (disables control switching) */
    isProcessing: boolean;
    /** Mark control state as synced (called after chat starts) */
    markControlSynced: () => void;
    /** Get global control state */
    getControlState: () => ControlState;
    /** Subscribe to global state changes */
    onControlStateChange: (callback: (state: ControlState) => void) => () => void;
    /** @deprecated Use getCurrentThreadControl().app instead */
    setState: (updates: Partial<{
        app: string | null;
        apiKey: string | null;
    }>) => void;
};
declare function useControl(): ControlContextApi;
type ControlContextProviderProps = {
    children: ReactNode;
    aomiClient: AomiClient;
    sessionId: string;
    publicKey?: string;
    /** Get metadata for a thread */
    getThreadMetadata: (threadId: string) => ThreadMetadata | undefined;
    /** Update metadata for a thread */
    updateThreadMetadata: (threadId: string, updates: Partial<ThreadMetadata>) => void;
};
declare function ControlContextProvider({ children, aomiClient, sessionId, publicKey, getThreadMetadata, updateThreadMetadata, }: ControlContextProviderProps): react_jsx_runtime.JSX.Element;

export { type AomiRuntimeApi, AomiRuntimeProvider, type AomiRuntimeProviderProps, type ChainInfo, type ControlContextApi, ControlContextProvider, type ControlContextProviderProps, type ControlState, type EventBuffer, type EventContext, EventContextProvider, type EventContextProviderProps, type EventSubscriber, type InboundEvent, type Notification$1 as Notification, type NotificationApi, NotificationContextProvider, type NotificationContextProviderProps, type NotificationContextApi as NotificationContextValue, type NotificationHandlerConfig, type NotificationType, type OutboundEvent, type SSEStatus, SUPPORTED_CHAINS, type NotificationData as ShowNotificationParams, type ThreadContext, ThreadContextProvider, type ThreadControlState, type ThreadMetadata, type UserConfig, UserContextProvider, type UserState, type WalletBuffer, type WalletHandlerApi, type WalletHandlerConfig, type WalletRequest, type WalletRequestKind, type WalletRequestResult, type WalletRequestStatus, cn, formatAddress, getChainInfo, getNetworkName, initThreadControl, useAomiRuntime, useControl, useCurrentThreadMessages, useCurrentThreadMetadata, useEventContext, useNotification, useNotificationHandler, useThreadContext, useUser, useWalletHandler };
