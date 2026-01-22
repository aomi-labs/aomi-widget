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
import type { UserState } from "../contexts/user-context";

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
  payload: Record<string, unknown>,
): Promise<T> {
  const query = toQueryString(payload);
  const url = `${backendUrl}${path}${query}`;

  const response = await fetch(url, { method: "POST" });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return (await response.json()) as T;
}

export class BackendApi {
  private sseConnections = new Map<string, EventSource>();

  constructor(private readonly backendUrl: string) {}

  async fetchState(
    sessionId: string,
    userState?: UserState,
  ): Promise<ApiStateResponse> {
    const url = new URL("/api/state", this.backendUrl);
    url.searchParams.set("session_id", sessionId);
    if (userState) {
      url.searchParams.set("user_state", JSON.stringify(userState));
    }

    const response = await fetch(url.toString());

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
      session_id: sessionId,
      public_key: publicKey,
    });
  }

  async postSystemMessage(
    sessionId: string,
    message: string,
  ): Promise<ApiSystemResponse> {
    return postState<ApiSystemResponse>(this.backendUrl, "/api/system", {
      message,
      session_id: sessionId,
    });
  }

  async postInterrupt(sessionId: string): Promise<ApiInterruptResponse> {
    return postState<ApiInterruptResponse>(this.backendUrl, "/api/interrupt", {
      session_id: sessionId,
    });
  }

  /**
   * Subscribe to SSE updates for a session.
   * EventSource handles reconnection automatically.
   * Returns an unsubscribe function.
   */
  subscribeSSE(
    sessionId: string,
    onUpdate: (event: ApiSSEEvent) => void,
    onError?: (error: unknown) => void,
  ): () => void {
    // Close existing connection for this session
    this.sseConnections.get(sessionId)?.close();

    const url = new URL("/api/updates", this.backendUrl);
    url.searchParams.set("session_id", sessionId);

    const eventSource = new EventSource(url.toString());
    this.sseConnections.set(sessionId, eventSource);

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as ApiSSEEvent;
        onUpdate(parsed);
      } catch (error) {
        onError?.(error);
      }
    };

    eventSource.onerror = (error) => {
      onError?.(error);
    };

    return () => {
      eventSource.close();
      if (this.sseConnections.get(sessionId) === eventSource) {
        this.sseConnections.delete(sessionId);
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
    const response = await fetch(url);

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
    const response = await fetch(url, { method: "POST" });

    if (!response.ok) {
      throw new Error(`Failed to archive thread: HTTP ${response.status}`);
    }
  }

  async unarchiveThread(sessionId: string): Promise<void> {
    const url = `${this.backendUrl}/api/sessions/${encodeURIComponent(sessionId)}/unarchive`;
    const response = await fetch(url, { method: "POST" });

    if (!response.ok) {
      throw new Error(`Failed to unarchive thread: HTTP ${response.status}`);
    }
  }

  async deleteThread(sessionId: string): Promise<void> {
    const url = `${this.backendUrl}/api/sessions/${encodeURIComponent(sessionId)}`;
    const response = await fetch(url, { method: "DELETE" });

    if (!response.ok) {
      throw new Error(`Failed to delete thread: HTTP ${response.status}`);
    }
  }

  async renameThread(sessionId: string, newTitle: string): Promise<void> {
    const url = `${this.backendUrl}/api/sessions/${encodeURIComponent(sessionId)}`;
    const response = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle }),
    });

    if (!response.ok) {
      throw new Error(`Failed to rename thread: HTTP ${response.status}`);
    }
  }

  async getSystemEvents(sessionId: string): Promise<ApiSystemEvent[]> {
    const url = `${this.backendUrl}/api/events?session_id=${encodeURIComponent(sessionId)}`;
    const response = await fetch(url);

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
    url.searchParams.set("session_id", sessionId);
    if (afterId > 0) url.searchParams.set("after_id", String(afterId));
    if (limit) url.searchParams.set("limit", String(limit));

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Failed to fetch events: HTTP ${response.status}`);
    }

    return (await response.json()) as ApiSystemEvent[];
  }
}
