"use client";

import { useCallback, useEffect, useState } from "react";
import { useEventContext } from "../contexts/event-context";
import type { InboundEvent } from "../state/event-buffer";

export type Notification = {
  id: string;
  type: string;
  title: string;
  body?: unknown; // Could be JSON object or string
  handled: boolean;
  timestamp: number;
  sessionId: string;
};

export type NotificationHandlerConfig = {
  /** Callback when new notification arrives */
  onNotification?: (notification: Notification) => void;
};

export type NotificationApi = {
  /** All notifications */
  notifications: Notification[];
  /** Unhandled count */
  unhandledCount: number;
  /** Mark notification as handled */
  markDone: (id: string) => void;
};

let notificationIdCounter = 0;
function generateNotificationId(): string {
  return `notif-${Date.now()}-${++notificationIdCounter}`;
}

export function useNotificationHandler({
  onNotification,
}: NotificationHandlerConfig = {}): NotificationApi {
  const { subscribe } = useEventContext();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // ---------------------------------------------------------------------------
  // Subscribe to notification events
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = subscribe("notification", (event: InboundEvent) => {
      const payload = event.payload as Record<string, unknown>;

      const notification: Notification = {
        id: generateNotificationId(),
        type: (payload.type as string) ?? "notification",
        title: (payload.title as string) ?? "Notification",
        body: payload.body,
        handled: false,
        timestamp: event.timestamp,
        sessionId: event.sessionId,
      };

      setNotifications((prev) => [notification, ...prev]);
      onNotification?.(notification);
    });

    return unsubscribe;
  }, [subscribe, onNotification]);

  // ---------------------------------------------------------------------------
  // Computed: unhandled count
  // ---------------------------------------------------------------------------
  const unhandledCount = notifications.filter((n) => !n.handled).length;

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
  const markHandled = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, handled: true } : n)),
    );
  }, []);

  return {
    notifications,
    unhandledCount,
    markDone: markHandled,
  };
}
