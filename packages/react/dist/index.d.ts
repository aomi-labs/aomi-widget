import * as react_jsx_runtime from "react/jsx-runtime";
import { ReactNode } from "react";

interface AomiMessage {
  sender?: string;
  content?: string;
  timestamp?: string;
  is_streaming?: boolean;
  tool_result?:
    | [string, string]
    | {
        topic?: unknown;
        content?: unknown;
      }
    | null;
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
  private updatesEventSources;
  constructor(backendUrl: string);
  fetchState(
    sessionId: string,
    options?: {
      signal?: AbortSignal;
    },
  ): Promise<ApiStateResponse>;
  postChatMessage(
    sessionId: string,
    message: string,
    publicKey?: string,
  ): Promise<ApiChatResponse>;
  postSystemMessage(
    sessionId: string,
    message: string,
  ): Promise<ApiSystemResponse>;
  postInterrupt(sessionId: string): Promise<ApiInterruptResponse>;
  disconnectSSE(): void;
  setConnectionStatus(on: boolean): void;
  connectSSE(sessionId: string, publicKey?: string): Promise<void>;
  private handleConnectionError;
  /**
   * Subscribe to SSE updates for a session with automatic reconnection.
   * Returns an unsubscribe function.
   */
  subscribeSSE(
    sessionId: string,
    onUpdate: (event: ApiSSEEvent) => void,
    onError?: (error: unknown) => void,
  ): () => void;
  fetchThreads(publicKey: string): Promise<ApiThread[]>;
  fetchThread(sessionId: string): Promise<ApiThread>;
  createThread(
    publicKey?: string,
    title?: string,
  ): Promise<ApiCreateThreadResponse>;
  archiveThread(sessionId: string): Promise<void>;
  unarchiveThread(sessionId: string): Promise<void>;
  deleteThread(sessionId: string): Promise<void>;
  renameThread(sessionId: string, newTitle: string): Promise<void>;
  getSystemEvents(sessionId: string): Promise<ApiSystemEvent[]>;
  /**
   * Fetch events after a specific event ID (for pagination/cursor-based fetching).
   */
  fetchEventsAfter(
    sessionId: string,
    afterId?: number,
    limit?: number,
  ): Promise<ApiSystemEvent[]>;
}

type AomiRuntimeProviderProps = {
  children: ReactNode;
  backendUrl?: string;
  publicKey?: string;
};
declare function AomiRuntimeProvider({
  children,
  backendUrl,
  publicKey,
}: Readonly<AomiRuntimeProviderProps>): react_jsx_runtime.JSX.Element;

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
  sendOutbound: (event: Omit<OutboundEvent, "timestamp">) => void;
  /** Current SSE connection status */
  sseStatus: SSEStatus;
};
declare function useEventContext(): EventContext;
type EventContextProviderProps = {
  children: ReactNode;
  backendApi: BackendApi;
  sessionId: string;
};
declare function EventContextProvider({
  children,
  backendApi,
  sessionId,
}: EventContextProviderProps): react_jsx_runtime.JSX.Element;

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
  sendConnectionChange: (
    status: WalletConnectionStatus,
    address?: string,
  ) => void;
  /** Pending transaction requests from AI */
  pendingTxRequests: WalletTxRequest[];
  /** Clear a pending request after handling */
  clearTxRequest: (index: number) => void;
};
declare function useWalletHandler({
  sessionId,
  onTxRequest,
}: WalletHandlerConfig): WalletHanderApi;

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
declare function useNotificationHandler({
  onNotification,
}?: NotificationHandlerConfig): NotificationApi;

export {
  type AomiMessage,
  AomiRuntimeProvider,
  type AomiRuntimeProviderProps,
  type ApiChatResponse,
  type ApiCreateThreadResponse,
  type ApiInterruptResponse,
  type ApiSSEEvent,
  type ApiStateResponse,
  type ApiSystemEvent,
  type ApiSystemResponse,
  type ApiThread,
  BackendApi,
  type EventBuffer,
  type EventContext,
  EventContextProvider,
  type EventContextProviderProps,
  type EventSubscriber,
  type InboundEvent,
  type Notification,
  type NotificationApi,
  type NotificationHandlerConfig,
  type OutboundEvent,
  type SSEStatus,
  type WalletConnectionStatus,
  type WalletHanderApi,
  type WalletHandlerConfig,
  type WalletTxComplete,
  type WalletTxRequest,
  useEventContext,
  useNotificationHandler,
  useWalletHandler,
};
