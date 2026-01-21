import * as react_jsx_runtime from 'react/jsx-runtime';
import * as react from 'react';
import { ReactNode, SetStateAction } from 'react';
import { ThreadMessageLike } from '@assistant-ui/react';

interface AomiMessage {
    sender?: string;
    content?: string;
    timestamp?: string;
    is_streaming?: boolean;
    tool_result?: [string, string] | {
        topic?: unknown;
        content?: unknown;
    } | null;
}
/**
 * GET /api/state
 * Fetches current session state including messages and processing status
 */
interface ApiStateResponse {
    messages?: AomiMessage[] | null;
    title?: string | null;
    is_processing?: boolean;
    session_exists?: boolean;
    session_id?: string;
}
/**
 * POST /api/chat
 * Sends a chat message and returns updated session state
 */
interface ApiChatResponse {
    messages?: AomiMessage[] | null;
    title?: string | null;
    is_processing?: boolean;
}
/**
 * POST /api/system
 * Sends a system message and returns the response message
 */
interface ApiSystemResponse {
    res?: AomiMessage | null;
}
/**
 * POST /api/interrupt
 * Interrupts current processing and returns updated session state
 */
type ApiInterruptResponse = ApiChatResponse;
/**
 * GET /api/sessions
 * Returns array of ApiThread
 */
interface ApiThread {
    session_id: string;
    title: string;
    is_archived?: boolean;
    created_at?: string;
    updated_at?: string;
    last_active_at?: string;
}
/**
 * POST /api/sessions
 * Creates a new thread/session
 */
interface ApiCreateThreadResponse {
    session_id: string;
    title?: string;
}
/**
 * Base SSE event - all events have session_id and type
 */
type ApiSSEEvent = {
    type: string;
    session_id: string;
    [key: string]: unknown;
};
/**
 * GET /api/events
 * Returns async callback events from backend (wallet tx requests, notifications, etc.)
 */
type ApiSystemEvent = {
    type: string;
    [key: string]: unknown;
};

declare class BackendApi {
    private readonly backendUrl;
    private connectionStatus;
    private eventSource;
    private updatesEventSource;
    constructor(backendUrl: string);
    fetchState(sessionId: string): Promise<ApiStateResponse>;
    postChatMessage(sessionId: string, message: string): Promise<ApiChatResponse>;
    postSystemMessage(sessionId: string, message: string): Promise<ApiSystemResponse>;
    postInterrupt(sessionId: string): Promise<ApiInterruptResponse>;
    disconnectSSE(): void;
    setConnectionStatus(on: boolean): void;
    connectSSE(sessionId: string, publicKey?: string): Promise<void>;
    private handleConnectionError;
    subscribeSSE(sessionId: string, onUpdate: (event: ApiSSEEvent) => void, onError?: (error: unknown) => void): () => void;
    fetchThreads(publicKey: string): Promise<ApiThread[]>;
    createThread(publicKey?: string, title?: string): Promise<ApiCreateThreadResponse>;
    archiveThread(sessionId: string): Promise<void>;
    unarchiveThread(sessionId: string): Promise<void>;
    deleteThread(sessionId: string): Promise<void>;
    renameThread(sessionId: string, newTitle: string): Promise<void>;
    getSystemEvents(sessionId: string): Promise<ApiSystemEvent[]>;
}

type AomiRuntimeProviderProps = {
    children: ReactNode;
    backendUrl?: string;
    publicKey?: string;
};
declare function AomiRuntimeProvider({ children, backendUrl, publicKey, }: Readonly<AomiRuntimeProviderProps>): react_jsx_runtime.JSX.Element;

/**
 * RuntimeActions is now mostly deprecated.
 * Use useEventContext() for event-based communication instead:
 * - enqueueOutbound() to send events to backend
 * - subscribe() to listen for events
 */
type RuntimeActions = Record<string, never>;
declare const RuntimeActionsProvider: react.Provider<RuntimeActions | undefined>;
declare function useRuntimeActions(): RuntimeActions;

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
    priority: "high" | "normal";
    timestamp: number;
};
type SSEStatus = "connected" | "connecting" | "disconnected";
type EventSubscriber = (event: InboundEvent) => void;

type EventContext = {
    /** Subscribe to inbound events by type. Returns unsubscribe function. */
    subscribe: (type: string, callback: EventSubscriber) => () => void;
    /** Send an outbound event to backend immediately */
    sendOutbound: (event: Omit<OutboundEvent, "timestamp">) => void;
    /** Current SSE connection status */
    sseStatus: SSEStatus;
};
declare function useEventContext(): EventContext;

type WalletTxRequest = {
    to: string;
    value?: string;
    data?: string;
    chainId?: number;
};
type WalletTxComplete = {
    txHash: string;
    status: "success" | "failed";
    amount?: string;
    token?: string;
};
type WalletConnectionStatus = "connected" | "disconnected";
type WalletHandlerConfig = {
    sessionId: string;
    onTxRequest?: (request: WalletTxRequest) => void;
};
type WalletHanderApi = {
    /** Send transaction completion event to backend */
    sendTxComplete: (tx: WalletTxComplete) => void;
    /** Send wallet connection status change */
    sendConnectionChange: (status: WalletConnectionStatus, address?: string) => void;
    /** Pending transaction requests from AI */
    pendingTxRequests: WalletTxRequest[];
    /** Clear a pending request after handling */
    clearTxRequest: (index: number) => void;
};
declare function useWalletHandler({ sessionId, onTxRequest, }: WalletHandlerConfig): WalletHanderApi;

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

type ThreadStatus = "regular" | "archived" | "pending";
type ThreadMetadata = {
    title: string;
    status: ThreadStatus;
    lastActiveAt?: string | number;
};

type ThreadContext = {
    currentThreadId: string;
    setCurrentThreadId: (id: string) => void;
    threadViewKey: number;
    bumpThreadViewKey: () => void;
    threads: Map<string, ThreadMessageLike[]>;
    setThreads: (updater: SetStateAction<Map<string, ThreadMessageLike[]>>) => void;
    threadMetadata: Map<string, ThreadMetadata>;
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

export { type AomiMessage, AomiRuntimeProvider, type ApiChatResponse, type ApiCreateThreadResponse, type ApiInterruptResponse, type ApiSSEEvent, type ApiStateResponse, type ApiSystemEvent, type ApiSystemResponse, type ApiThread, BackendApi, type Notification, RuntimeActionsProvider, ThreadContextProvider, type ThreadMetadata, type ThreadStatus, type WalletConnectionStatus, type WalletTxComplete, type WalletTxRequest, useCurrentThreadMessages, useCurrentThreadMetadata, useEventContext, useNotificationHandler, useRuntimeActions, useThreadContext, useWalletHandler };
