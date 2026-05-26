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
      if (notification.kind === "payment_required") continue;
      if (shownRef.current.has(notification.id)) continue;
      shownRef.current.add(notification.id);
      showToast(notification, dismissNotification);
    }
  }, [notifications, dismissNotification]);

  return <Toaster position="top-center" />;
}

function showToast(
  notification: Notification,
  dismissNotification: (id: string) => void,
) {
  const options = {
    id: notification.id,
    duration: notification.duration ?? Infinity,
    unstyled: true,
    onDismiss: () => dismissNotification(notification.id),
  };

  toast.custom(
    () => (
      <div className="bg-background text-foreground relative mx-auto inline-flex w-fit max-w-[calc(100vw-2rem)] items-center justify-center rounded-xl border px-5 py-3 shadow-lg">
        <button
          type="button"
          aria-label="Close notification"
          className="text-muted-foreground hover:text-foreground absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-md text-sm transition-colors"
          onClick={() => {
            dismissNotification(notification.id);
            toast.dismiss(notification.id);
          }}
        >
          x
        </button>
        <div className="min-w-0 pr-6 text-center text-sm font-medium leading-5">
          {notification.message ?? notification.title}
        </div>
      </div>
    ),
    options,
  );
}
