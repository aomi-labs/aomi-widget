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
    /** Default API key for non-default namespaces */
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
interface ApiStateResponse {
    messages?: AomiMessage[] | null;
    system_events?: ApiSystemEvent[] | null;
    title?: string | null;
    is_processing?: boolean;
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
    type: "title_changed" | "tool_update" | "tool_complete" | "system_notice" | string;
    session_id: string;
    new_title?: string;
    [key: string]: unknown;
};
type ApiSSEEventType = "title_changed" | "tool_update" | "tool_complete" | "system_notice";
/**
 * Backend SystemEvent enum serializes as tagged JSON:
 * - InlineCall: {"InlineCall": {"type": "wallet_tx_request", "payload": {...}}}
 * - SystemNotice: {"SystemNotice": "message"}
 * - SystemError: {"SystemError": "message"}
 * - AsyncCallback: {"AsyncCallback": {...}} (not sent over HTTP)
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
declare function isInlineCall(event: ApiSystemEvent): event is {
    InlineCall: {
        type: string;
        payload?: unknown;
    };
};
declare function isSystemNotice(event: ApiSystemEvent): event is {
    SystemNotice: string;
};
declare function isSystemError(event: ApiSystemEvent): event is {
    SystemError: string;
};
declare function isAsyncCallback(event: ApiSystemEvent): event is {
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
    fetchState(sessionId: string, userState?: UserState): Promise<ApiStateResponse>;
    /**
     * Send a chat message and return updated session state.
     */
    sendMessage(sessionId: string, message: string, options?: {
        namespace?: string;
        publicKey?: string;
        apiKey?: string;
        userState?: UserState;
    }): Promise<ApiChatResponse>;
    /**
     * Send a system-level message (e.g. wallet state changes, context switches).
     */
    sendSystemMessage(sessionId: string, message: string): Promise<ApiSystemResponse>;
    /**
     * Interrupt the AI's current response.
     */
    interrupt(sessionId: string): Promise<ApiInterruptResponse>;
    /**
     * Subscribe to real-time SSE updates for a session.
     * Automatically reconnects with exponential backoff on disconnects.
     * Returns an unsubscribe function.
     */
    subscribeSSE(sessionId: string, onUpdate: (event: ApiSSEEvent) => void, onError?: (error: unknown) => void): () => void;
    /**
     * List all threads for a wallet address.
     */
    listThreads(publicKey: string): Promise<ApiThread[]>;
    /**
     * Get a single thread by ID.
     */
    getThread(sessionId: string): Promise<ApiThread>;
    /**
     * Create a new thread. The client generates the session ID.
     */
    createThread(threadId: string, publicKey?: string): Promise<ApiCreateThreadResponse>;
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
    getSystemEvents(sessionId: string, count?: number): Promise<ApiSystemEvent[]>;
    /**
     * Get available namespaces.
     */
    getNamespaces(sessionId: string, options?: {
        publicKey?: string;
        apiKey?: string;
    }): Promise<string[]>;
    /**
     * Get available models.
     */
    getModels(sessionId: string): Promise<string[]>;
    /**
     * Set the model for a session.
     */
    setModel(sessionId: string, rig: string, options?: {
        namespace?: string;
        apiKey?: string;
    }): Promise<{
        success: boolean;
        rig: string;
        baml: string;
        created: boolean;
    }>;
}

export { AomiClient, type AomiClientOptions, type AomiMessage, type ApiChatResponse, type ApiCreateThreadResponse, type ApiInterruptResponse, type ApiSSEEvent, type ApiSSEEventType, type ApiStateResponse, type ApiSystemEvent, type ApiSystemResponse, type ApiThread, type Logger, type UserState, isAsyncCallback, isInlineCall, isSystemError, isSystemNotice };
