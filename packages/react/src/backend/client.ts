import type {
  ApiChatResponse,
  ApiCreateThreadResponse,
  ApiInterruptResponse,
  ApiSSEEvent,
  ApiStateResponse,
  ApiSystemEvent,
  ApiSystemResponse,
  ApiThread,
} from "./types";

const SESSION_ID_HEADER = "X-Session-Id";
const shouldLogSse = process.env.NODE_ENV !== "production";

type SseSubscription = {
  abortController: AbortController | null;
  retries: number;
  retryTimer: ReturnType<typeof setTimeout> | null;
  stopped: boolean;
  listeners: Set<SseListener>;
  stop: (reason?: string) => void;
};

type SseListener = {
  onUpdate: (event: ApiSSEEvent) => void;
  onError?: (error: unknown) => void;
};

function toQueryString(payload: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function withSessionHeader(
  sessionId: string,
  init?: HeadersInit,
): HeadersInit {
  const headers = new Headers(init);
  headers.set(SESSION_ID_HEADER, sessionId);
  return headers;
}

function extractSseData(rawEvent: string): string | null {
  const dataLines = rawEvent
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart());
  if (!dataLines.length) return null;
  return dataLines.join("\n");
}

async function readSseStream(
  stream: ReadableStream<Uint8Array>,
  signal: AbortSignal,
  onMessage: (data: string) => void,
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
        const data = extractSseData(rawEvent);
        if (data) {
          onMessage(data);
        }
        separatorIndex = buffer.indexOf("\n\n");
      }
    }
  } finally {
    reader.releaseLock();
  }
}

async function postState<T>(
  backendUrl: string,
  path: string,
  payload: Record<string, unknown>,
  sessionId?: string,
): Promise<T> {
  const query = toQueryString(payload);
  const url = `${backendUrl}${path}${query}`;

  const response = await fetch(url, {
    method: "POST",
    headers: sessionId ? withSessionHeader(sessionId) : undefined,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return (await response.json()) as T;
}

export class BackendApi {
  private sseConnections = new Map<string, SseSubscription>();

  constructor(private readonly backendUrl: string) {}

  async fetchState(sessionId: string): Promise<ApiStateResponse> {
    const url = `${this.backendUrl}/api/state`;
    const response = await fetch(url, {
      headers: withSessionHeader(sessionId),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return (await response.json()) as ApiStateResponse;
  }

  async postChatMessage(
    sessionId: string,
    message: string,
    publicKey?: string,
  ): Promise<ApiChatResponse> {
    return postState<ApiChatResponse>(this.backendUrl, "/api/chat", {
      message,
      public_key: publicKey,
    }, sessionId);
  }

  async postSystemMessage(
    sessionId: string,
    message: string,
  ): Promise<ApiSystemResponse> {
    return postState<ApiSystemResponse>(this.backendUrl, "/api/system", {
      message,
    }, sessionId);
  }

  async postInterrupt(sessionId: string): Promise<ApiInterruptResponse> {
    return postState<ApiInterruptResponse>(
      this.backendUrl,
      "/api/interrupt",
      {},
      sessionId,
    );
  }

  /**
   * Subscribe to SSE updates for a session.
   * Uses fetch streaming and reconnects on disconnects.
   * Returns an unsubscribe function.
   */
  subscribeSSE(
    sessionId: string,
    onUpdate: (event: ApiSSEEvent) => void,
    onError?: (error: unknown) => void,
  ): () => void {
    const existing = this.sseConnections.get(sessionId);
    const listener: SseListener = { onUpdate, onError };
    if (existing) {
      existing.listeners.add(listener);
      if (shouldLogSse) {
        console.debug("[aomi][sse] listener added", {
          sessionId,
          listeners: existing.listeners.size,
        });
      }
      return () => {
        existing.listeners.delete(listener);
        if (shouldLogSse) {
          console.debug("[aomi][sse] listener removed", {
            sessionId,
            listeners: existing.listeners.size,
          });
        }
        if (existing.listeners.size === 0) {
          existing.stop("unsubscribe");
          if (this.sseConnections.get(sessionId) === existing) {
            this.sseConnections.delete(sessionId);
          }
        }
      };
    }

    const subscription: SseSubscription = {
      abortController: null,
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
        if (shouldLogSse) {
          console.debug("[aomi][sse] stop", {
            sessionId,
            reason,
            retries: subscription.retries,
          });
        }
      },
    };

    const scheduleRetry = () => {
      if (subscription.stopped) return;
      subscription.retries += 1;
      const delayMs = Math.min(500 * 2 ** (subscription.retries - 1), 10000);
      if (shouldLogSse) {
        console.debug("[aomi][sse] retry scheduled", {
          sessionId,
          delayMs,
          retries: subscription.retries,
        });
      }
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
        const response = await fetch(`${this.backendUrl}/api/updates`, {
          headers: withSessionHeader(sessionId, {
            Accept: "text/event-stream",
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`SSE HTTP ${response.status}: ${response.statusText}`);
        }

        if (!response.body) {
          throw new Error("SSE response missing body");
        }

        subscription.retries = 0;

        await readSseStream(response.body, controller.signal, (data) => {
          let parsed: ApiSSEEvent;
          try {
            parsed = JSON.parse(data) as ApiSSEEvent;
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
        if (shouldLogSse) {
          console.debug("[aomi][sse] stream ended", {
            sessionId,
            aborted: controller.signal.aborted,
            stopped: subscription.stopped,
            durationMs: Date.now() - openedAt,
          });
        }
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

    this.sseConnections.set(sessionId, subscription);
    void open();

    return () => {
      subscription.listeners.delete(listener);
      if (shouldLogSse) {
        console.debug("[aomi][sse] listener removed", {
          sessionId,
          listeners: subscription.listeners.size,
        });
      }
      if (subscription.listeners.size === 0) {
        subscription.stop("unsubscribe");
        if (this.sseConnections.get(sessionId) === subscription) {
          this.sseConnections.delete(sessionId);
        }
      }
    };
  }

  async fetchThreads(publicKey: string): Promise<ApiThread[]> {
    const url = `${this.backendUrl}/api/sessions?public_key=${encodeURIComponent(publicKey)}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch threads: HTTP ${response.status}`);
    }

    return (await response.json()) as ApiThread[];
  }

  async fetchThread(sessionId: string): Promise<ApiThread> {
    const url = `${this.backendUrl}/api/sessions/${encodeURIComponent(sessionId)}`;
    const response = await fetch(url, {
      headers: withSessionHeader(sessionId),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return (await response.json()) as ApiThread;
  }

  async createThread(
    publicKey?: string,
    title?: string,
  ): Promise<ApiCreateThreadResponse> {
    const body: Record<string, string> = {};
    if (publicKey) body.public_key = publicKey;
    if (title) body.title = title;

    const url = `${this.backendUrl}/api/sessions`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Failed to create thread: HTTP ${response.status}`);
    }

    return (await response.json()) as ApiCreateThreadResponse;
  }

  async archiveThread(sessionId: string): Promise<void> {
    const url = `${this.backendUrl}/api/sessions/${encodeURIComponent(sessionId)}/archive`;
    const response = await fetch(url, {
      method: "POST",
      headers: withSessionHeader(sessionId),
    });

    if (!response.ok) {
      throw new Error(`Failed to archive thread: HTTP ${response.status}`);
    }
  }

  async unarchiveThread(sessionId: string): Promise<void> {
    const url = `${this.backendUrl}/api/sessions/${encodeURIComponent(sessionId)}/unarchive`;
    const response = await fetch(url, {
      method: "POST",
      headers: withSessionHeader(sessionId),
    });

    if (!response.ok) {
      throw new Error(`Failed to unarchive thread: HTTP ${response.status}`);
    }
  }

  async deleteThread(sessionId: string): Promise<void> {
    const url = `${this.backendUrl}/api/sessions/${encodeURIComponent(sessionId)}`;
    const response = await fetch(url, {
      method: "DELETE",
      headers: withSessionHeader(sessionId),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete thread: HTTP ${response.status}`);
    }
  }

  async renameThread(sessionId: string, newTitle: string): Promise<void> {
    const url = `${this.backendUrl}/api/sessions/${encodeURIComponent(sessionId)}`;
    const response = await fetch(url, {
      method: "PATCH",
      headers: withSessionHeader(sessionId, {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({ title: newTitle }),
    });

    if (!response.ok) {
      throw new Error(`Failed to rename thread: HTTP ${response.status}`);
    }
  }

  async getSystemEvents(sessionId: string): Promise<ApiSystemEvent[]> {
    const url = `${this.backendUrl}/api/events`;
    const response = await fetch(url, {
      headers: withSessionHeader(sessionId),
    });

    if (!response.ok) {
      if (response.status === 404) return [];
      throw new Error(`Failed to get system events: HTTP ${response.status}`);
    }

    return (await response.json()) as ApiSystemEvent[];
  }

  async fetchEventsAfter(
    sessionId: string,
    afterId = 0,
    limit = 100,
  ): Promise<ApiSystemEvent[]> {
    const url = new URL("/api/events", this.backendUrl);
    if (afterId > 0) url.searchParams.set("after_id", String(afterId));
    if (limit) url.searchParams.set("limit", String(limit));

    const response = await fetch(url.toString(), {
      headers: withSessionHeader(sessionId),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch events: HTTP ${response.status}`);
    }

    return (await response.json()) as ApiSystemEvent[];
  }
}
