"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { useNotification } from "@aomi-labs/react";
import type { Notification } from "@aomi-labs/react";

import { Toaster } from "./sonner";

export function NotificationToaster() {
  const { notifications, dismissNotification } = useNotification();
  const shownRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const activeIds = new Set(
      notifications.map((notification) => notification.id),
    );
    for (const id of shownRef.current) {
      if (!activeIds.has(id)) {
        shownRef.current.delete(id);
      }
    }

    for (const notification of notifications) {
      if (shownRef.current.has(notification.id)) continue;
      shownRef.current.add(notification.id);
      showToast(notification, dismissNotification);
    }
  }, [notifications, dismissNotification]);

  return <Toaster position="top-right" />;
}

function showToast(
  notification: Notification,
  dismissNotification: (id: string) => void,
) {
  const options = {
    id: notification.id,
    description: notification.title,
    duration: Infinity,
    onDismiss: () => dismissNotification(notification.id),
  };

  if (notification.type === "success") {
    toast.success(notification.title, options);
    return;
  }

  if (notification.type === "error") {
    toast.error(notification.title, options);
    return;
  }

  toast(notification.title, options);
}
