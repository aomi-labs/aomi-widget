"use client";

import {
  AlertCircleIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  XIcon,
  WalletIcon,
  SendIcon,
  Network,
  Info,
} from "lucide-react";
import { useNotification, type Notification as NotificationType } from "@/lib/notification-context";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

export function NotificationContainer() {
  const { notifications, dismissNotification } = useNotification();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={dismissNotification}
        />
      ))}
    </div>
  );
}

type NotificationItemProps = {
  notification: NotificationType;
  onDismiss: (id: string) => void;
};

function NotificationItem({ notification, onDismiss }: NotificationItemProps) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (notification.duration && notification.duration > 0) {
      timeoutRef.current = setTimeout(() => {
        onDismiss(notification.id);
      }, notification.duration);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [notification.id, notification.duration, onDismiss]);

  // Determine icon based on iconType or fall back to type
  const getIcon = () => {
    const iconType = notification.iconType || notification.type;
    switch (iconType) {
      case "wallet":
        return WalletIcon;
      case "transaction":
        return SendIcon;
      case "network":
        return Network;
      case "error":
        return AlertTriangleIcon;
      case "success":
        return CheckCircleIcon;
      case "warning":
        return AlertTriangleIcon;
      case "notice":
      default:
        return Info;
    }
  };

  const Icon = getIcon();

  // Determine icon color based on iconType or fall back to type
  const getIconClassName = () => {
    const iconType = notification.iconType || notification.type;
    switch (iconType) {
      case "wallet":
        return "text-emerald-600 dark:text-emerald-300";
      case "transaction":
        return "text-blue-600 dark:text-blue-300";
      case "network":
        return "text-purple-600 dark:text-purple-300";
      case "error":
      case "warning":
        return "text-red-500 dark:text-red-300";
      case "success":
        return "text-emerald-600 dark:text-emerald-300";
      case "notice":
      default:
        return "text-blue-500 dark:text-blue-300";
    }
  };

  const iconClassName = getIconClassName();

  const bgClassName =
    notification.type === "error"
      ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
      : notification.type === "success"
        ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
        : "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800";

  return (
    <div
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 text-left text-sm shadow-lg animate-in slide-in-from-right fade-in",
        bgClassName
      )}
      role="alert"
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", iconClassName)} />
      <div className="flex flex-1 flex-col gap-1 min-w-0">
        <span className="font-medium text-foreground">{notification.title}</span>
        <div className="leading-relaxed text-muted-foreground">{notification.message}</div>
      </div>
      <button
        onClick={() => onDismiss(notification.id)}
        className="mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-offset-2"
        aria-label="Dismiss notification"
      >
        <XIcon className="size-4" />
      </button>
    </div>
  );
}

