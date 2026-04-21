"use client";

import { createContext, useContext } from "react";
import type { ThreadMessageLike } from "@assistant-ui/react";

import type { UserState } from "@aomi-labs/client";
import type { ThreadMetadata } from "./state/thread-store";
import type {
  EventSubscriber,
  SSEStatus,
} from "./contexts/event-context";
import type {
  Notification,
  NotificationData,
} from "./contexts/notification-context";
import type {
  WalletRequest,
  WalletRequestResult,
} from "./handlers/wallet-handler";

// =============================================================================
// AomiRuntimeApi Type
// =============================================================================

export type AomiRuntimeApi = {
  // -------------------------------------------------------------------------
  // USER API
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // THREAD API
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // CHAT API
  // -------------------------------------------------------------------------
  /** Whether the assistant is currently generating a response */
  isRunning: boolean;
  /** Get messages for a thread (defaults to currentThreadId) */
  getMessages: (threadId?: string) => ThreadMessageLike[];
  /** Send a message to the current thread */
  sendMessage: (text: string) => Promise<void>;
  /** Cancel the current generation */
  cancelGeneration: () => void;

  // -------------------------------------------------------------------------
  // NOTIFICATION API
  // -------------------------------------------------------------------------
  /** All active notifications */
  notifications: Notification[];
  /** Show a notification. Returns the notification ID. */
  showNotification: (params: NotificationData) => string;
  /** Dismiss a notification by ID */
  dismissNotification: (id: string) => void;
  /** Clear all notifications */
  clearAllNotifications: () => void;

  // -------------------------------------------------------------------------
  // WALLET API
  // -------------------------------------------------------------------------
  /** All queued wallet requests (tx + eip712 signing) */
  pendingWalletRequests: WalletRequest[];
  /** Mark a wallet request as being processed */
  startWalletRequest: (id: string) => void;
  /** Complete a wallet request — dequeues + sends response to backend */
  resolveWalletRequest: (id: string, result: WalletRequestResult) => void;
  /** Fail a wallet request — dequeues + sends error to backend */
  rejectWalletRequest: (id: string, error?: string) => void;

  // -------------------------------------------------------------------------
  // EVENT API
  // -------------------------------------------------------------------------
  /** Subscribe to inbound events by type. Returns unsubscribe function. */
  subscribe: (type: string, callback: EventSubscriber) => () => void;
  /** Send a system command to the backend */
  sendSystemCommand: (event: { type: string; sessionId: string; payload: unknown }) => Promise<void>;
  /** Current SSE connection status */
  sseStatus: SSEStatus;
};

// =============================================================================
// Context
// =============================================================================

const AomiRuntimeContext = createContext<AomiRuntimeApi | null>(null);

export const AomiRuntimeApiProvider = AomiRuntimeContext.Provider;

// =============================================================================
// Hook
// =============================================================================

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
export function useAomiRuntime(): AomiRuntimeApi {
  const context = useContext(AomiRuntimeContext);
  if (!context) {
    throw new Error(
      "useAomiRuntime must be used within AomiRuntimeProvider. " +
        "Wrap your app with <AomiRuntimeProvider>...</AomiRuntimeProvider>",
    );
  }
  return context;
}
