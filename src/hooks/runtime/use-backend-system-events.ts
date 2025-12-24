"use client";

import { useCallback } from "react";

import type { Notification } from "@/lib/notification-context";
import type { WalletTxRequestPayload } from "@/lib/wallet-tx";
import { parseBackendSystemEvent } from "@/lib/runtime-utils";

type WalletTxRequest = WalletTxRequestPayload;

type UseBackendSystemEventsParams = {
  showNotification: (notification: Omit<Notification, "id">) => void;
  handleWalletTxRequest: (sessionId: string, threadId: string, request: WalletTxRequest) => void;
};

export function useBackendSystemEvents({
  showNotification,
  handleWalletTxRequest,
}: UseBackendSystemEventsParams) {
  const handleBackendSystemEvents = useCallback(
    (sessionId: string, threadId: string, rawEvents?: unknown[] | null) => {
      if (!rawEvents?.length) return;

      for (const raw of rawEvents) {
        const parsed = parseBackendSystemEvent(raw);
        if (!parsed) continue;

        if ("InlineDisplay" in parsed) {
          const payload = parsed.InlineDisplay;
          if (!payload || typeof payload !== "object") continue;
          const type = (payload as Record<string, unknown>).type;
          if (type !== "wallet_tx_request") continue;
          const requestValue = (payload as Record<string, unknown>).payload;
          if (!requestValue || typeof requestValue !== "object") continue;
          const req = requestValue as Record<string, unknown>;
          if (typeof req.to !== "string" || typeof req.value !== "string" || typeof req.data !== "string") {
            continue;
          }
          handleWalletTxRequest(sessionId, threadId, req as unknown as WalletTxRequest);
        }

        if ("SystemError" in parsed) {
          showNotification({
            type: "error",
            iconType: "error",
            title: "Error",
            message: parsed.SystemError,
          });
        }

        if ("SystemNotice" in parsed) {
          showNotification({
            type: "notice",
            iconType: "notice",
            title: "Notice",
            message: parsed.SystemNotice,
          });
        }
      }
    },
    [handleWalletTxRequest, showNotification]
  );

  return { handleBackendSystemEvents };
}
