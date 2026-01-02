import type { MutableRefObject } from "react";

import type { BackendApi } from "../api/client";
import type { Notification } from "../lib/notification-context";
import type { WalletTxRequestPayload } from "../utils/wallet";
import type { ThreadMetadata } from "../state/types";
import { isPlaceholderTitle } from "./utils";
import type { BakendState } from "./backend-state";
import { findTempIdForBackendId } from "./backend-state";

export type BackendSystemEvent =
  | { InlineDisplay: unknown }
  | { SystemNotice: string }
  | { SystemError: string }
  | { AsyncUpdate: unknown };

type EventControllerConfig = {
  backendApiRef: MutableRefObject<BackendApi>;
  backendStateRef: MutableRefObject<BakendState>;
  showNotification: (notification: Omit<Notification, "id">) => void;
  handleWalletTxRequest: (
    sessionId: string,
    threadId: string,
    request: WalletTxRequestPayload
  ) => void;
  setThreadMetadata: (
    updater: (prev: Map<string, ThreadMetadata>) => Map<string, ThreadMetadata>
  ) => void;
};

export class EventController {
  private lastEventIdBySession = new Map<string, number>();
  private eventsInFlight = new Set<string>();
  private updateSubscriptions = new Map<string, () => void>();
  private subscribableSessionId: string | null = null;

  constructor(private readonly config: EventControllerConfig) {}

  setSubscribableSessionId(sessionId: string | null) {
    this.subscribableSessionId = sessionId;
    this.syncSubscriptions();
  }

  private syncSubscriptions() {
    const nextSessions = new Set<string>();
    if (this.subscribableSessionId) {
      nextSessions.add(this.subscribableSessionId);
    }

    // Remove subscriptions for sessions no longer needed
    for (const sessionId of this.updateSubscriptions.keys()) {
      if (!nextSessions.has(sessionId)) {
        this.removeSubscription(sessionId);
      }
    }

    // Add subscriptions for new sessions
    for (const sessionId of nextSessions) {
      this.ensureSubscription(sessionId);
    }
  }

  private ensureSubscription(sessionId: string) {
    if (this.updateSubscriptions.has(sessionId)) return;

    const unsubscribe =
      this.config.backendApiRef.current.subscribeToUpdatesWithNotification(
        sessionId,
        (update) => {
          if (update.type !== "event_available") return;
          void this.drainEvents(update.session_id);
        },
        (error) => {
          console.error("Failed to handle system update SSE:", error);
        }
      );

    this.updateSubscriptions.set(sessionId, unsubscribe);
  }

  private removeSubscription(sessionId: string) {
    const unsubscribe = this.updateSubscriptions.get(sessionId);
    if (!unsubscribe) return;
    unsubscribe();
    this.updateSubscriptions.delete(sessionId);
  }

  async drainEvents(sessionId: string) {
    if (this.eventsInFlight.has(sessionId)) return;
    this.eventsInFlight.add(sessionId);

    try {
      let afterId = this.lastEventIdBySession.get(sessionId) ?? 0;
      for (;;) {
        const events = await this.config.backendApiRef.current.fetchEventsAfter(
          sessionId,
          afterId,
          200
        );
        if (!events.length) break;

        for (const event of events) {
          const eventId =
            typeof event.event_id === "number"
              ? event.event_id
              : Number(event.event_id);
          if (Number.isFinite(eventId)) afterId = Math.max(afterId, eventId);

          if (event.type === "title_changed" && typeof event.new_title === "string") {
            this.applyTitleChanged(sessionId, event.new_title as string);
          }

          if (event.type === "wallet_tx_request") {
            const payload = (event as unknown as { payload?: unknown }).payload;
            if (payload && typeof payload === "object") {
              const req = payload as Record<string, unknown>;
              if (
                typeof req.to === "string" &&
                typeof req.value === "string" &&
                typeof req.data === "string"
              ) {
                const threadId =
                  findTempIdForBackendId(
                    this.config.backendStateRef.current,
                    sessionId
                  ) || sessionId;
                this.config.handleWalletTxRequest(
                  sessionId,
                  threadId,
                  req as unknown as WalletTxRequestPayload
                );
              }
            }
          }
        }

        // If we hit the limit, keep draining in case more events are waiting.
        if (events.length < 200) break;
      }

      this.lastEventIdBySession.set(sessionId, afterId);
    } catch (error) {
      console.error("Failed to fetch async events:", error);
    } finally {
      this.eventsInFlight.delete(sessionId);
    }
  }

  private applyTitleChanged(sessionId: string, newTitle: string) {
    const backendState = this.config.backendStateRef.current;
    const tempId = findTempIdForBackendId(backendState, sessionId);
    const threadIdToUpdate = tempId || sessionId;

    this.config.setThreadMetadata((prev) => {
      const next = new Map(prev);
      const existing = next.get(threadIdToUpdate);
      const normalizedTitle = isPlaceholderTitle(newTitle) ? "" : newTitle;
      const nextStatus = existing?.status === "archived" ? "archived" : "regular";
      next.set(threadIdToUpdate, {
        title: normalizedTitle,
        status: nextStatus,
        lastActiveAt: existing?.lastActiveAt ?? new Date().toISOString(),
      });
      return next;
    });

    if (!isPlaceholderTitle(newTitle) && backendState.creatingThreadId === threadIdToUpdate) {
      backendState.creatingThreadId = null;
    }
  }

  handleBackendSystemEvents(
    sessionId: string,
    threadId: string,
    rawEvents?: unknown[] | null
  ) {
    if (!rawEvents?.length) return;

    for (const raw of rawEvents) {
      const parsed = this.parseBackendSystemEvent(raw);
      if (!parsed) continue;

      if ("InlineDisplay" in parsed) {
        const payload = parsed.InlineDisplay;
        if (!payload || typeof payload !== "object") continue;
        const type = (payload as Record<string, unknown>).type;
        if (type !== "wallet_tx_request") continue;
        const requestValue = (payload as Record<string, unknown>).payload;
        if (!requestValue || typeof requestValue !== "object") continue;
        const req = requestValue as Record<string, unknown>;
        if (
          typeof req.to !== "string" ||
          typeof req.value !== "string" ||
          typeof req.data !== "string"
        ) {
          continue;
        }
        this.config.handleWalletTxRequest(
          sessionId,
          threadId,
          req as unknown as WalletTxRequestPayload
        );
      }

      if ("SystemError" in parsed) {
        this.config.showNotification({
          type: "error",
          iconType: "error",
          title: "Error",
          message: parsed.SystemError,
        });
      }

      if ("SystemNotice" in parsed) {
        this.config.showNotification({
          type: "notice",
          iconType: "notice",
          title: "Notice",
          message: parsed.SystemNotice,
        });
      }
    }
  }

  private parseBackendSystemEvent(value: unknown): BackendSystemEvent | null {
    if (!value || typeof value !== "object") return null;
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length !== 1) return null;
    const [key, payload] = entries[0];
    switch (key) {
      case "InlineDisplay":
        return { InlineDisplay: payload };
      case "SystemNotice":
        return {
          SystemNotice: typeof payload === "string" ? payload : String(payload),
        };
      case "SystemError":
        return {
          SystemError: typeof payload === "string" ? payload : String(payload),
        };
      case "AsyncUpdate":
        return { AsyncUpdate: payload };
      default:
        return null;
    }
  }

  cleanup() {
    for (const unsubscribe of this.updateSubscriptions.values()) {
      unsubscribe();
    }
    this.updateSubscriptions.clear();
  }
}

