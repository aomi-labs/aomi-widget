import * as react_jsx_runtime from 'react/jsx-runtime';
import { ReactNode, SetStateAction } from 'react';
import { ThreadMessageLike } from '@assistant-ui/react';
import { ClassValue } from 'clsx';

type UserState = {
    address?: string;
    chainId?: number;
    isConnected: boolean;
    ensName?: string;
};
declare function useUser(): {
    user: UserState;
    setUser: (data: Partial<UserState>) => void;
    getUserState: () => UserState;
    onUserStateChange: (callback: (user: UserState) => void) => () => void;
};
declare function UserContextProvider({ children }: {
    children: ReactNode;
}): react_jsx_runtime.JSX.Element;

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
    system_events?: ApiSystemEvent[] | null;
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
    system_events?: ApiSystemEvent[] | null;
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
 * Backend SystemEvent enum serializes as tagged JSON:
 * - InlineCall: {"InlineCall": {"type": "wallet_tx_request", "payload": {...}}}
 * - SystemNotice: {"SystemNotice": "message"}
 * - SystemError: {"SystemError": "message"}
 * - AsyncCallback: {"AsyncCallback": {...}}
 */
type ApiSystemEvent = {
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

declare class BackendApi {
    private readonly backendUrl;
    private sseConnections;
    constructor(backendUrl: string);
    fetchState(sessionId: string): Promise<ApiStateResponse>;
    postChatMessage(sessionId: string, message: string, publicKey?: string): Promise<ApiChatResponse>;
    postSystemMessage(sessionId: string, message: string): Promise<ApiSystemResponse>;
    postInterrupt(sessionId: string): Promise<ApiInterruptResponse>;
    /**
     * Subscribe to SSE updates for a session.
     * EventSource handles reconnection automatically.
     * Returns an unsubscribe function.
     */
    subscribeSSE(sessionId: string, onUpdate: (event: ApiSSEEvent) => void, onError?: (error: unknown) => void): () => void;
    fetchThreads(publicKey: string): Promise<ApiThread[]>;
    fetchThread(sessionId: string): Promise<ApiThread>;
    createThread(publicKey?: string, title?: string): Promise<ApiCreateThreadResponse>;
    archiveThread(sessionId: string): Promise<void>;
    unarchiveThread(sessionId: string): Promise<void>;
    deleteThread(sessionId: string): Promise<void>;
    renameThread(sessionId: string, newTitle: string): Promise<void>;
    getSystemEvents(sessionId: string): Promise<ApiSystemEvent[]>;
    fetchEventsAfter(sessionId: string, afterId?: number, limit?: number): Promise<ApiSystemEvent[]>;
}

type AomiRuntimeProviderProps = {
    children: ReactNode;
    backendUrl?: string;
    publicKey?: string;
};
declare function AomiRuntimeProvider({ children, backendUrl, publicKey, }: Readonly<AomiRuntimeProviderProps>): react_jsx_runtime.JSX.Element;

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
type EventBuffer = {
    inboundQueue: InboundEvent[];
    outboundQueue: OutboundEvent[];
    sseStatus: SSEStatus;
    lastEventId: string | null;
    subscribers: Map<string, Set<EventSubscriber>>;
};

type EventContext = {
    /** Subscribe to inbound events by type. Returns unsubscribe function. */
    subscribe: (type: string, callback: EventSubscriber) => () => void;
    /** Send an outbound event to backend immediately */
    sendOutboundSystem: (event: Omit<OutboundEvent, "timestamp">) => void;
    /** Dispatch system events from HTTP polling into the event buffer */
    dispatchInboundSystem: (sessionId: string, events: ApiSystemEvent[]) => void;
    /** Current SSE connection status */
    sseStatus: SSEStatus;
};
declare function useEventContext(): EventContext;
type EventContextProviderProps = {
    children: ReactNode;
    backendApi: BackendApi;
    sessionId: string;
};
declare function EventContextProvider({ children, backendApi, sessionId, }: EventContextProviderProps): react_jsx_runtime.JSX.Element;

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
    /** Send wallet connection status change and update user state */
    sendConnectionChange: (status: WalletConnectionStatus, address?: string, chainId?: number) => void;
    /** Pending transaction requests from AI */
    pendingTxRequests: WalletTxRequest[];
    /** Clear a pending request after handling */
    clearTxRequest: (index: number) => void;
};
declare function useWalletHandler({ sessionId, onTxRequest, }: WalletHandlerConfig): WalletHanderApi;

type Notification$1 = {
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
    onNotification?: (notification: Notification$1) => void;
};
type NotificationApi = {
    /** All notifications */
    notifications: Notification$1[];
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

/**
 * Utility function to merge Tailwind CSS classes with conflict resolution.
 * Combines clsx for conditional classes and tailwind-merge for deduplication.
 */
declare function cn(...inputs: ClassValue[]): string;

type NotificationType = "notice" | "success" | "error" | "wallet";
type Notification = {
    id: string;
    type: NotificationType;
    title: string;
    message?: string;
    duration?: number;
    timestamp: number;
};
type ShowNotificationParams = Omit<Notification, "id" | "timestamp">;
type NotificationContextApi = {
    /** All active notifications */
    notifications: Notification[];
    /** Show a new notification */
    showNotification: (params: ShowNotificationParams) => string;
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

type WalletFooterProps = {
    wallet: UserState;
    setWallet: (data: Partial<UserState>) => void;
};

export { type AomiMessage, AomiRuntimeProvider, type AomiRuntimeProviderProps, type ApiChatResponse, type ApiCreateThreadResponse, type ApiInterruptResponse, type ApiSSEEvent, type ApiStateResponse, type ApiSystemEvent, type ApiSystemResponse, type ApiThread, BackendApi, type EventBuffer, type EventContext, EventContextProvider, type EventContextProviderProps, type EventSubscriber, type Notification$1 as HandlerNotification, type InboundEvent, type Notification, type NotificationApi, NotificationContextProvider, type NotificationContextProviderProps, type NotificationContextApi as NotificationContextValue, type NotificationHandlerConfig, type NotificationType, type OutboundEvent, type SSEStatus, type ShowNotificationParams, type ThreadContext, ThreadContextProvider, type ThreadMetadata, UserContextProvider, type UserState, type UserState as WalletButtonState, type WalletConnectionStatus, type WalletFooterProps, type WalletHanderApi, type WalletHandlerConfig, type WalletTxComplete, type WalletTxRequest, cn, useCurrentThreadMessages, useCurrentThreadMetadata, useEventContext, useNotification, useNotificationHandler, useThreadContext, useUser, useWalletHandler };
