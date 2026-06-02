import type { AomiSSEEvent, Logger } from "./types";

export type SseSubscriber = {
  subscribe: (
    sessionId: string,
    onUpdate: (event: AomiSSEEvent) => void,
    onError?: (error: unknown) => void,
  ) => () => void;
};

export type SseSubscriberOptions = {
  backendUrl: string;
  getHeaders: (sessionId: string) => HeadersInit;
  fetchImpl?: typeof fetch;
  logger?: Logger;
};

type SseSubscription = {
  abortController: AbortController | null;
  lastEventId: string | null;
  seenEventIds: Set<string>;
  retries: number;
  retryTimer: ReturnType<typeof setTimeout> | null;
  stopped: boolean;
  listeners: Set<SseListener>;
  stop: (reason?: string) => void;
};

type ParsedSseMessage = {
  data: string;
  id: string | null;
};

type SseListener = {
  onUpdate: (event: AomiSSEEvent) => void;
  onError?: (error: unknown) => void;
};

const MAX_SEEN_EVENT_IDS = 256;

// The server intentionally uses at-least-once delivery around reconnects:
// replay and live streams can overlap, so consumers MUST deduplicate by id.
function extractSseMessage(rawEvent: string): ParsedSseMessage | null {
  const lines = rawEvent.split("\n");
  const dataLines = rawEvent
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart());
  if (!dataLines.length) return null;
  const idLine = lines.find((line) => line.startsWith("id:"));
  return {
    data: dataLines.join("\n"),
    id: idLine ? idLine.slice(3).trimStart() : null,
  };
}

async function readSseStream(
  stream: ReadableStream<Uint8Array>,
  signal: AbortSignal,
  onMessage: (message: ParsedSseMessage) => void,
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (!signal.aborted) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      buffer = buffer.replace(/\r/g, "");

      let separatorIndex = buffer.indexOf("\n\n");
      while (separatorIndex >= 0) {
        const rawEvent = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);
        const message = extractSseMessage(rawEvent);
        if (message) {
          onMessage(message);
        }
        separatorIndex = buffer.indexOf("\n\n");
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export function createSseSubscriber({
  backendUrl,
  getHeaders,
  fetchImpl = fetch,
  logger,
}: SseSubscriberOptions): SseSubscriber {
  const subscriptions = new Map<string, SseSubscription>();

  const subscribe: SseSubscriber["subscribe"] = (
    sessionId,
    onUpdate,
    onError,
  ) => {
    const existing = subscriptions.get(sessionId);
    const listener: SseListener = { onUpdate, onError };
    if (existing) {
      existing.listeners.add(listener);
      logger?.debug("[aomi][sse] listener added", {
        sessionId,
        listeners: existing.listeners.size,
      });
      return () => {
        existing.listeners.delete(listener);
        logger?.debug("[aomi][sse] listener removed", {
          sessionId,
          listeners: existing.listeners.size,
        });
        if (existing.listeners.size === 0) {
          existing.stop("unsubscribe");
          if (subscriptions.get(sessionId) === existing) {
            subscriptions.delete(sessionId);
          }
        }
      };
    }

    const subscription: SseSubscription = {
      abortController: null,
      lastEventId: null,
      seenEventIds: new Set(),
      retries: 0,
      retryTimer: null,
      stopped: false,
      listeners: new Set([listener]),
      stop: (reason?: string) => {
        subscription.stopped = true;
        if (subscription.retryTimer) {
          clearTimeout(subscription.retryTimer);
          subscription.retryTimer = null;
        }
        subscription.abortController?.abort();
        subscription.abortController = null;
        logger?.debug("[aomi][sse] stop", {
          sessionId,
          reason,
          retries: subscription.retries,
        });
      },
    };

    const scheduleRetry = () => {
      if (subscription.stopped) return;
      subscription.retries += 1;
      const delayMs = Math.min(500 * 2 ** (subscription.retries - 1), 10000);
      logger?.debug("[aomi][sse] retry scheduled", {
        sessionId,
        delayMs,
        retries: subscription.retries,
      });
      subscription.retryTimer = setTimeout(() => {
        void open();
      }, delayMs);
    };

    const open = async () => {
      if (subscription.stopped) return;
      if (subscription.retryTimer) {
        clearTimeout(subscription.retryTimer);
        subscription.retryTimer = null;
      }

      const controller = new AbortController();
      subscription.abortController = controller;
      const openedAt = Date.now();

      try {
        const headers = new Headers(getHeaders(sessionId));
        if (subscription.lastEventId) {
          headers.set("Last-Event-ID", subscription.lastEventId);
        }
        const response = await fetchImpl(`${backendUrl}/api/updates`, {
          headers,
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(
            `SSE HTTP ${response.status}: ${response.statusText}`,
          );
        }

        if (!response.body) {
          throw new Error("SSE response missing body");
        }

        subscription.retries = 0;

        await readSseStream(response.body, controller.signal, ({ data, id }) => {
          if (id && subscription.seenEventIds.has(id)) {
            return;
          }
          if (id) {
            subscription.lastEventId = id;
            subscription.seenEventIds.add(id);
            if (subscription.seenEventIds.size > MAX_SEEN_EVENT_IDS) {
              const oldestId = subscription.seenEventIds.values().next().value;
              if (oldestId) subscription.seenEventIds.delete(oldestId);
            }
          }
          let parsed: AomiSSEEvent;
          try {
            parsed = JSON.parse(data) as AomiSSEEvent;
          } catch (error) {
            for (const item of subscription.listeners) {
              item.onError?.(error);
            }
            return;
          }

          for (const item of subscription.listeners) {
            try {
              item.onUpdate(parsed);
            } catch (error) {
              item.onError?.(error);
            }
          }
        });
        logger?.debug("[aomi][sse] stream ended", {
          sessionId,
          aborted: controller.signal.aborted,
          stopped: subscription.stopped,
          durationMs: Date.now() - openedAt,
        });
      } catch (error) {
        if (!controller.signal.aborted && !subscription.stopped) {
          for (const item of subscription.listeners) {
            item.onError?.(error);
          }
        }
      }

      if (!subscription.stopped) {
        scheduleRetry();
      }
    };

    subscriptions.set(sessionId, subscription);
    void open();

    return () => {
      subscription.listeners.delete(listener);
      logger?.debug("[aomi][sse] listener removed", {
        sessionId,
        listeners: subscription.listeners.size,
      });
      if (subscription.listeners.size === 0) {
        subscription.stop("unsubscribe");
        if (subscriptions.get(sessionId) === subscription) {
          subscriptions.delete(sessionId);
        }
      }
    };
  };

  return { subscribe };
}
