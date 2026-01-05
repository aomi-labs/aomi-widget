import type {
  BackendSessionResponse,
  BackendThreadMetadata,
  CreateThreadResponse,
  SessionMessage,
  SessionResponsePayload,
  SystemEvent,
  SystemResponsePayload,
  SystemUpdateNotification,
} from "./types";

function toQueryString(payload: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

async function postState<T>(
  backendUrl: string,
  path: string,
  payload: Record<string, unknown>
): Promise<T> {
  const query = toQueryString(payload);
  const url = `${backendUrl}${path}${query}`;
  console.log("🔵 [postState] URL:", url);
  console.log("🔵 [postState] Payload:", payload);

  const response = await fetch(url, {
    method: "POST",
  });
  console.log("🔵 [postState] Response status:", response.status);

  if (!response.ok) {
    console.error("🔴 [postState] Error:", response.status, response.statusText);
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = (await response.json()) as T;
  console.log("🟢 [postState] Success:", data);
  return data;
}

export class BackendApi {
  private connectionStatus = false;
  private eventSource: EventSource | null = null;
  private updatesEventSources = new Map<
    string,
    {
      eventSource: EventSource | null;
      retries: number;
      retryTimer: ReturnType<typeof setTimeout> | null;
      stopped: boolean;
      cleanup: () => void;
    }
  >();

  constructor(private readonly backendUrl: string) {}

  async fetchState(
    sessionId: string,
    options?: { signal?: AbortSignal }
  ): Promise<SessionResponsePayload> {
    console.log("🔵 [fetchState] Called with sessionId:", sessionId);
    const url = `${this.backendUrl}/api/state?session_id=${encodeURIComponent(sessionId)}`;
    console.log("🔵 [fetchState] URL:", url);

    const response = await fetch(url, { signal: options?.signal });
    console.log("🔵 [fetchState] Response status:", response.status, response.statusText);

    if (!response.ok) {
      console.error("🔴 [fetchState] Error:", response.status, response.statusText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as SessionResponsePayload;
    console.log("🟢 [fetchState] Success:", data);
    return data;
  }

  async postChatMessage(
    sessionId: string,
    message: string,
    publicKey?: string
  ): Promise<SessionResponsePayload> {
    console.log("🔵 [postChatMessage] Called with sessionId:", sessionId, "message:", message);
    const result = await postState<SessionResponsePayload>(this.backendUrl, "/api/chat", {
      message,
      session_id: sessionId,
      public_key: publicKey,
    });
    console.log("🟢 [postChatMessage] Success:", result);
    return result;
  }

  async postSystemMessage(sessionId: string, message: string): Promise<SystemResponsePayload> {
    console.log("🔵 [postSystemMessage] Called with sessionId:", sessionId, "message:", message);
    const result = await postState<SystemResponsePayload>(this.backendUrl, "/api/system", {
      message,
      session_id: sessionId,
    });
    console.log("🟢 [postSystemMessage] Success:", result);
    return result;
  }

  async postInterrupt(sessionId: string): Promise<SessionResponsePayload> {
    console.log("🔵 [postInterrupt] Called with sessionId:", sessionId);
    const result = await postState<SessionResponsePayload>(this.backendUrl, "/api/interrupt", {
      session_id: sessionId,
    });
    console.log("🟢 [postInterrupt] Success:", result);
    return result;
  }

  disconnectSSE(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.setConnectionStatus(false);
  }

  setConnectionStatus(on: boolean): void {
    this.connectionStatus = on;
  }

  async connectSSE(sessionId: string, publicKey?: string) {
    this.disconnectSSE();

    try {
      const url = new URL(`${this.backendUrl}/api/chat/stream`);
      url.searchParams.set("session_id", sessionId);
      if (publicKey) {
        url.searchParams.set("public_key", publicKey);
      }

      this.eventSource = new EventSource(url.toString());

      this.eventSource.onopen = () => {
        console.log("🌐 SSE connection opened to:", url.toString());
        this.setConnectionStatus(true);
      };

      this.eventSource.onmessage = (event) => {
        try {
          JSON.parse(event.data);
        } catch (error) {
          console.error("Failed to parse SSE data:", error);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error("SSE connection error:", error);
      };
    } catch (error) {
      console.error("Failed to establish SSE connection:", error);
      this.handleConnectionError(sessionId, publicKey);
    }
  }

  private handleConnectionError(sessionId: string, publicKey?: string): void {
    this.setConnectionStatus(false);
    let attempt = 0;
    const total = 3;
    if (attempt < total) {
      attempt++;
      console.log(`Attempting to reconnect (${attempt}/${total})...`);

      setTimeout(() => {
        this.connectSSE(sessionId, publicKey);
      }, 100);
    } else {
      console.error("Max reconnection attempts reached");
      this.setConnectionStatus(false);
    }
  }

  private subscribeToUpdatesInternal<T>(
    sessionId: string,
    onUpdate: (update: T) => void,
    onError: ((error: unknown) => void) | undefined,
    logLabel: string
  ): () => void {
    const updatesUrl = new URL("/api/updates", this.backendUrl);
    updatesUrl.searchParams.set("session_id", sessionId);
    const updatesUrlString = updatesUrl.toString();

    const existing = this.updatesEventSources.get(sessionId);
    if (existing) {
      existing.cleanup();
      this.updatesEventSources.delete(sessionId);
    }

    const subscription = {
      eventSource: null as EventSource | null,
      retries: 0,
      retryTimer: null as ReturnType<typeof setTimeout> | null,
      stopped: false,
      cleanup: () => {
        subscription.stopped = true;
        if (subscription.retryTimer) {
          clearTimeout(subscription.retryTimer);
          subscription.retryTimer = null;
        }
        if (subscription.eventSource) {
          subscription.eventSource.close();
          subscription.eventSource = null;
        }
      },
    };

    const scheduleRetry = () => {
      subscription.retries += 1;
      const delayMs = Math.min(500 * 2 ** (subscription.retries - 1), 10000);
      console.warn(
        `🔁 [${logLabel}] retrying in ${delayMs}ms (attempt ${subscription.retries})`,
        { sessionId }
      );
      subscription.retryTimer = setTimeout(() => {
        open();
      }, delayMs);
    };

    const open = () => {
      if (subscription.stopped) return;
      if (subscription.retryTimer) {
        clearTimeout(subscription.retryTimer);
        subscription.retryTimer = null;
      }
      if (subscription.eventSource) {
        subscription.eventSource.close();
      }

      const updatesEventSource = new EventSource(updatesUrlString);
      subscription.eventSource = updatesEventSource;

      console.log(`🔔 [updates] subscribed`, updatesUrlString);

      updatesEventSource.onopen = () => {
        subscription.retries = 0;
        console.log("🔔 [updates] open", updatesUrlString);
      };

      updatesEventSource.onmessage = (event) => {
        try {
          console.log("🔔 [updates] message", { url: updatesUrlString, data: event.data });
          const parsed = JSON.parse(event.data) as T;
          onUpdate(parsed);
        } catch (error) {
          console.error("Failed to parse system update SSE:", error);
          onError?.(error);
        }
      };

      updatesEventSource.onerror = (error) => {
        console.error("System updates SSE error:", {
          url: updatesUrlString,
          readyState: updatesEventSource.readyState,
          error,
        });
        onError?.(error);
        if (subscription.stopped) return;
        updatesEventSource.close();
        scheduleRetry();
      };
    };

    this.updatesEventSources.set(sessionId, subscription);
    open();

    return () => {
      const current = this.updatesEventSources.get(sessionId);
      if (current === subscription) {
        current.cleanup();
        this.updatesEventSources.delete(sessionId);
      } else {
        subscription.cleanup();
      }
    };
  }

  subscribeToUpdates(
    sessionId: string,
    onUpdate: (update: SystemUpdateNotification) => void,
    onError?: (error: unknown) => void
  ): () => void {
    return this.subscribeToUpdatesInternal(
      sessionId,
      onUpdate,
      onError,
      "subscribeToUpdates"
    );
  }

  async fetchThreads(publicKey: string): Promise<BackendThreadMetadata[]> {
    console.log("🔵 [fetchThreads] Called with publicKey:", publicKey);
    const url = `${this.backendUrl}/api/sessions?public_key=${encodeURIComponent(publicKey)}`;
    console.log("🔵 [fetchThreads] URL:", url);

    const response = await fetch(url);
    console.log("🔵 [fetchThreads] Response status:", response.status);

    if (!response.ok) {
      console.error("🔴 [fetchThreads] Error:", response.status);
      throw new Error(`Failed to fetch threads: HTTP ${response.status}`);
    }

    const data = (await response.json()) as BackendThreadMetadata[];
    console.log("🟢 [fetchThreads] Success:", data);
    return data;
  }

  async createThread(publicKey?: string, title?: string): Promise<CreateThreadResponse> {
    console.log("🔵 [createThread] Called with publicKey:", publicKey, "title:", title);
    const body: Record<string, string> = {};
    if (publicKey) {
      body.public_key = publicKey;
    }
    if (title) {
      body.title = title;
    }
    console.log("🔵 [createThread] Request body:", body);

    const url = `${this.backendUrl}/api/sessions`;
    console.log("🔵 [createThread] URL:", url);

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    console.log("🔵 [createThread] Response status:", response.status);

    if (!response.ok) {
      console.error("🔴 [createThread] Error:", response.status);
      throw new Error(`Failed to create thread: HTTP ${response.status}`);
    }

    const data = (await response.json()) as CreateThreadResponse;
    console.log("🟢 [createThread] Success:", data);
    return data;
  }

  async archiveThread(sessionId: string): Promise<void> {
    console.log("🔵 [archiveThread] Called with sessionId:", sessionId);
    const url = `${this.backendUrl}/api/sessions/${encodeURIComponent(sessionId)}/archive`;
    console.log("🔵 [archiveThread] URL:", url);

    const response = await fetch(url, { method: "POST" });
    console.log("🔵 [archiveThread] Response status:", response.status);

    if (!response.ok) {
      console.error("🔴 [archiveThread] Error:", response.status);
      throw new Error(`Failed to archive thread: HTTP ${response.status}`);
    }
    console.log("🟢 [archiveThread] Success");
  }

  async unarchiveThread(sessionId: string): Promise<void> {
    console.log("🔵 [unarchiveThread] Called with sessionId:", sessionId);
    const url = `${this.backendUrl}/api/sessions/${encodeURIComponent(sessionId)}/unarchive`;
    console.log("🔵 [unarchiveThread] URL:", url);

    const response = await fetch(url, { method: "POST" });
    console.log("🔵 [unarchiveThread] Response status:", response.status);

    if (!response.ok) {
      console.error("🔴 [unarchiveThread] Error:", response.status);
      throw new Error(`Failed to unarchive thread: HTTP ${response.status}`);
    }
    console.log("🟢 [unarchiveThread] Success");
  }

  async deleteThread(sessionId: string): Promise<void> {
    console.log("🔵 [deleteThread] Called with sessionId:", sessionId);
    const url = `${this.backendUrl}/api/sessions/${encodeURIComponent(sessionId)}`;
    console.log("🔵 [deleteThread] URL:", url);

    const response = await fetch(url, { method: "DELETE" });
    console.log("🔵 [deleteThread] Response status:", response.status);

    if (!response.ok) {
      console.error("🔴 [deleteThread] Error:", response.status);
      throw new Error(`Failed to delete thread: HTTP ${response.status}`);
    }
    console.log("🟢 [deleteThread] Success");
  }

  async renameThread(sessionId: string, newTitle: string): Promise<void> {
    console.log("🔵 [renameThread] Called with sessionId:", sessionId, "newTitle:", newTitle);
    const url = `${this.backendUrl}/api/sessions/${encodeURIComponent(sessionId)}`;
    console.log("🔵 [renameThread] URL:", url);

    const response = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle }),
    });
    console.log("🔵 [renameThread] Response status:", response.status);

    if (!response.ok) {
      console.error("🔴 [renameThread] Error:", response.status);
      throw new Error(`Failed to rename thread: HTTP ${response.status}`);
    }
    console.log("🟢 [renameThread] Success");
  }

  async fetchEventsAfter(
    sessionId: string,
    afterId = 0,
    limit = 100
  ): Promise<SystemEvent[]> {
    const url = new URL("/api/events", this.backendUrl);
    url.searchParams.set("session_id", sessionId);
    if (afterId > 0) url.searchParams.set("after_id", String(afterId));
    if (limit) url.searchParams.set("limit", String(limit));

    console.log("🔵 [fetchEventsAfter] URL:", url.toString());

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Failed to fetch events: HTTP ${response.status}`);
    }
    return (await response.json()) as SystemEvent[];
  }

  subscribeToUpdatesWithNotification(
    sessionId: string,
    onUpdate: (update: SystemUpdateNotification) => void,
    onError?: (error: unknown) => void
  ): () => void {
    return this.subscribeToUpdatesInternal(
      sessionId,
      onUpdate,
      onError,
      "subscribeToUpdatesWithNotification"
    );
  }
}
