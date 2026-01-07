"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

export type NotificationType = "error" | "notice" | "success";

export type NotificationIconType =
  | "error"
  | "success"
  | "notice"
  | "wallet"
  | "transaction"
  | "network"
  | "warning";

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  iconType?: NotificationIconType;
  duration?: number; // in milliseconds, default 5000
};

type NotificationContextValue = {
  showNotification: (notification: Omit<Notification, "id">) => void;
  notifications: Notification[];
  dismissNotification: (id: string) => void;
};

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined
);

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider");
  }
  return context;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback(
    (notification: Omit<Notification, "id">) => {
      const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newNotification: Notification = {
        ...notification,
        id,
        duration: notification.duration ?? 5000,
      };

      setNotifications((prev) => [newNotification, ...prev]);

      // Auto-dismiss after duration
      const duration = newNotification.duration ?? 5000;
      if (duration > 0) {
        setTimeout(() => {
          setNotifications((prev) => prev.filter((n) => n.id !== id));
        }, duration);
      }
    },
    []
  );

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider
      value={{ showNotification, notifications, dismissNotification }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
