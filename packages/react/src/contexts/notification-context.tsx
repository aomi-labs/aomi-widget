"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

// =============================================================================
// Types
// =============================================================================

export type NotificationType = "notice" | "success" | "error" | "wallet";

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  timestamp: number;
};

export type ShowNotificationParams = Omit<Notification, "id" | "timestamp">;

export type NotificationContextApi = {
  /** All active notifications */
  notifications: Notification[];
  /** Show a new notification */
  showNotification: (params: ShowNotificationParams) => string;
  /** Dismiss a notification by ID */
  dismissNotification: (id: string) => void;
  /** Clear all notifications */
  clearAll: () => void;
};

// =============================================================================
// Context
// =============================================================================

const NotificationContext = createContext<NotificationContextApi | null>(
  null,
);

// =============================================================================
// Hook
// =============================================================================

export function useNotification(): NotificationContextApi {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotification must be used within NotificationContextProvider",
    );
  }
  return context;
}

// =============================================================================
// Provider
// =============================================================================

let notificationIdCounter = 0;
function generateId(): string {
  return `notif-${Date.now()}-${++notificationIdCounter}`;
}

export type NotificationContextProviderProps = {
  children: ReactNode;
};

export function NotificationContextProvider({
  children,
}: NotificationContextProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback((params: ShowNotificationParams) => {
    const id = generateId();
    const notification: Notification = {
      ...params,
      id,
      timestamp: Date.now(),
    };
    setNotifications((prev) => [notification, ...prev]);
    return id;
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const value: NotificationContextApi = {
    notifications,
    showNotification,
    dismissNotification,
    clearAll,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
