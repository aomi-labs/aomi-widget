import * as react_jsx_runtime from "react/jsx-runtime";
import { ReactNode, SetStateAction } from "react";
import { ThreadMessageLike } from "@assistant-ui/react";
import { ClassValue } from "clsx";

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
 * Backend SystemEvent enum serializes as tagged JSON:
 * - InlineCall: {"InlineCall": {"type": "wallet_tx_request", "payload": {...}}}
 * - SystemNotice: {"SystemNotice": "message"}
 * - SystemError: {"SystemError": "message"}
 * - AsyncCallback: {"AsyncCallback": {...}} (not sent over HTTP)
 */
type ApiSystemEvent =
  | {
      InlineCall: {
        type: string;
        payload?: unknown;
        [key: string]: unknown;
      };
    }
  | {
      SystemNotice: string;
    }
  | {
      SystemError: string;
    }
  | {
      AsyncCallback: Record<string, unknown>;
    };

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
declare function UserContextProvider({
  children,
}: {
  children: ReactNode;
}): react_jsx_runtime.JSX.Element;

declare class BackendApi {
  private readonly backendUrl;
  private sseSubscriber;
  constructor(backendUrl: string);
  fetchState(
    sessionId: string,
    userState?: UserState,
  ): Promise<ApiStateResponse>;
  postChatMessage(
    sessionId: string,
    message: string,
    namespace: string,
    publicKey?: string,
    apiKey?: string,
    userState?: UserState,
  ): Promise<ApiChatResponse>;
  postSystemMessage(
    sessionId: string,
    message: string,
  ): Promise<ApiSystemResponse>;
  postInterrupt(sessionId: string): Promise<ApiInterruptResponse>;
  /**
   * Subscribe to SSE updates for a session.
   * Uses fetch streaming and reconnects on disconnects.
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
    threadId: string,
    publicKey?: string,
  ): Promise<ApiCreateThreadResponse>;
  archiveThread(sessionId: string): Promise<void>;
  unarchiveThread(sessionId: string): Promise<void>;
  deleteThread(sessionId: string): Promise<void>;
  renameThread(sessionId: string, newTitle: string): Promise<void>;
  getSystemEvents(sessionId: string, count?: number): Promise<ApiSystemEvent[]>;
  /**
   * Get allowed namespaces for the current request context.
   */
  getNamespaces(
    sessionId: string,
    publicKey?: string,
    apiKey?: string,
  ): Promise<string[]>;
  /**
   * Get available models.
   */
  getModels(sessionId: string): Promise<string[]>;
  /**
   * Set the model selection for a session.
   */
  setModel(
    sessionId: string,
    rig: string,
    namespace?: string,
    apiKey?: string,
  ): Promise<{
    success: boolean;
    rig: string;
    baml: string;
    created: boolean;
  }>;
}

type AomiRuntimeProviderProps = {
  children: ReactNode;
  backendUrl?: string;
};
declare function AomiRuntimeProvider({
  children,
  backendUrl,
}: Readonly<AomiRuntimeProviderProps>): react_jsx_runtime.JSX.Element;

type ThreadContext = {
  currentThreadId: string;
  setCurrentThreadId: (id: string) => void;
  threadViewKey: number;
  bumpThreadViewKey: () => void;
  allThreads: Map<string, ThreadMessageLike[]>;
  setThreads: (
    updater: SetStateAction<Map<string, ThreadMessageLike[]>>,
  ) => void;
  allThreadsMetadata: Map<string, ThreadMetadata>;
  setThreadMetadata: (
    updater: SetStateAction<Map<string, ThreadMetadata>>,
  ) => void;
  threadCnt: number;
  setThreadCnt: (updater: SetStateAction<number>) => void;
  getThreadMessages: (threadId: string) => ThreadMessageLike[];
  setThreadMessages: (threadId: string, messages: ThreadMessageLike[]) => void;
  getThreadMetadata: (threadId: string) => ThreadMetadata | undefined;
  updateThreadMetadata: (
    threadId: string,
    updates: Partial<ThreadMetadata>,
  ) => void;
};
type ThreadContextProviderProps = {
  children: ReactNode;
  initialThreadId?: string;
};
declare function useThreadContext(): ThreadContext;
declare function ThreadContextProvider({
  children,
  initialThreadId,
}: ThreadContextProviderProps): react_jsx_runtime.JSX.Element;
declare function useCurrentThreadMessages(): ThreadMessageLike[];
declare function useCurrentThreadMetadata(): ThreadMetadata | undefined;

type ThreadStatus = "regular" | "archived" | "pending";
type ThreadControlState = {
  /** Selected model for this thread (human-readable label) */
  model: string | null;
  /** Selected namespace for this thread */
  namespace: string | null;
  /** Whether control state has changed but chat hasn't started yet */
  controlDirty: boolean;
  /** Whether this thread is currently processing (assistant generating) */
  isProcessing: boolean;
};
type ThreadMetadata = {
  title: string;
  status: ThreadStatus;
  lastActiveAt?: string | number;
  /** Per-thread control state (model, namespace selection) */
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
declare function NotificationContextProvider({
  children,
}: NotificationContextProviderProps): react_jsx_runtime.JSX.Element;

type AomiRuntimeApi = {
  /** Current user state (wallet connection, address, chain, etc.) */
  user: UserState;
  /** Get current user state synchronously (useful in callbacks) */
  getUserState: () => UserState;
  /** Update user state (partial updates merged with existing state) */
  setUser: (data: Partial<UserState>) => void;
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
  /** Subscribe to inbound events by type. Returns unsubscribe function. */
  subscribe: (type: string, callback: EventSubscriber) => () => void;
  /** Send a system command to the backend */
  sendSystemCommand: (event: Omit<OutboundEvent, "timestamp">) => void;
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
  /** Send wallet connection status change and update user state */
  sendConnectionChange: (
    status: WalletConnectionStatus,
    address?: string,
    chainId?: number,
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

/** Global control state (shared across all threads) */
type ControlState = {
  /** API key for authenticated requests */
  apiKey: string | null;
  /** Available models fetched from backend */
  availableModels: string[];
  /** Authorized namespaces fetched from backend */
  authorizedNamespaces: string[];
  /** Default model (first from availableModels) */
  defaultModel: string | null;
  /** Default namespace (from authorizedNamespaces) */
  defaultNamespace: string | null;
};
type ControlContextApi = {
  /** Global state (apiKey, available models/namespaces) */
  state: ControlState;
  /** Update global state (apiKey only) */
  setApiKey: (apiKey: string | null) => void;
  /** Fetch available models from backend */
  getAvailableModels: () => Promise<string[]>;
  /** Fetch authorized namespaces from backend */
  getAuthorizedNamespaces: () => Promise<string[]>;
  /** Get current thread's control state */
  getCurrentThreadControl: () => ThreadControlState;
  /** Select a model for the current thread (updates metadata + calls backend) */
  onModelSelect: (model: string) => Promise<void>;
  /** Select a namespace for the current thread (updates metadata only) */
  onNamespaceSelect: (namespace: string) => void;
  /** Whether the current thread is processing (disables control switching) */
  isProcessing: boolean;
  /** Mark control state as synced (called after chat starts) */
  markControlSynced: () => void;
  /** Get global control state */
  getControlState: () => ControlState;
  /** Subscribe to global state changes */
  onControlStateChange: (callback: (state: ControlState) => void) => () => void;
  /** @deprecated Use getCurrentThreadControl().namespace instead */
  setState: (
    updates: Partial<{
      namespace: string | null;
      apiKey: string | null;
    }>,
  ) => void;
};
declare function useControl(): ControlContextApi;
type ControlContextProviderProps = {
  children: ReactNode;
  backendApi: BackendApi;
  sessionId: string;
  publicKey?: string;
  /** Get metadata for a thread */
  getThreadMetadata: (threadId: string) => ThreadMetadata | undefined;
  /** Update metadata for a thread */
  updateThreadMetadata: (
    threadId: string,
    updates: Partial<ThreadMetadata>,
  ) => void;
};
declare function ControlContextProvider({
  children,
  backendApi,
  sessionId,
  publicKey,
  getThreadMetadata,
  updateThreadMetadata,
}: ControlContextProviderProps): react_jsx_runtime.JSX.Element;

export {
  type AomiMessage,
  type AomiRuntimeApi,
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
  type ControlContextApi,
  ControlContextProvider,
  type ControlContextProviderProps,
  type ControlState,
  type EventBuffer,
  type EventContext,
  EventContextProvider,
  type EventContextProviderProps,
  type EventSubscriber,
  type Notification as HandlerNotification,
  type InboundEvent,
  type Notification$1 as Notification,
  type NotificationApi,
  NotificationContextProvider,
  type NotificationContextProviderProps,
  type NotificationContextApi as NotificationContextValue,
  type NotificationHandlerConfig,
  type NotificationType,
  type OutboundEvent,
  type SSEStatus,
  type NotificationData as ShowNotificationParams,
  type ThreadContext,
  ThreadContextProvider,
  type ThreadControlState,
  type ThreadMetadata,
  type UserConfig,
  UserContextProvider,
  type UserState,
  type UserState as WalletButtonState,
  type WalletConnectionStatus,
  type WalletHanderApi,
  type WalletHandlerConfig,
  type WalletTxComplete,
  type WalletTxRequest,
  cn,
  formatAddress,
  getNetworkName,
  initThreadControl,
  useAomiRuntime,
  useControl,
  useCurrentThreadMessages,
  useCurrentThreadMetadata,
  useEventContext,
  useNotification,
  useNotificationHandler,
  useThreadContext,
  useUser,
  useWalletHandler,
};
