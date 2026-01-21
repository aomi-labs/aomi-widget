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
  private updatesEventSource: EventSource | null = null;

  constructor(private readonly backendUrl: string) {}

  async fetchState(sessionId: string): Promise<ApiStateResponse> {
    console.log("🔵 [fetchState] Called with sessionId:", sessionId);
    const url = `${this.backendUrl}/api/state?session_id=${encodeURIComponent(sessionId)}`;
    console.log("🔵 [fetchState] URL:", url);

    const response = await fetch(url);
    console.log("🔵 [fetchState] Response status:", response.status, response.statusText);

    if (!response.ok) {
      console.error("🔴 [fetchState] Error:", response.status, response.statusText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as ApiStateResponse;
    console.log("🟢 [fetchState] Success:", data);
    return data;
  }

  async postChatMessage(sessionId: string, message: string): Promise<ApiChatResponse> {
    console.log("🔵 [postChatMessage] Called with sessionId:", sessionId, "message:", message);
    const result = await postState<ApiChatResponse>(this.backendUrl, "/api/chat", {
      message,
      session_id: sessionId,
    });
    console.log("🟢 [postChatMessage] Success:", result);
    return result;
  }

  async postSystemMessage(sessionId: string, message: string): Promise<ApiSystemResponse> {
    console.log("🔵 [postSystemMessage] Called with sessionId:", sessionId, "message:", message);
    const result = await postState<ApiSystemResponse>(this.backendUrl, "/api/system", {
      message,
      session_id: sessionId,
    });
    console.log("🟢 [postSystemMessage] Success:", result);
    return result;
  }

  async postInterrupt(sessionId: string): Promise<ApiInterruptResponse> {
    console.log("🔵 [postInterrupt] Called with sessionId:", sessionId);
    const result = await postState<ApiInterruptResponse>(this.backendUrl, "/api/interrupt", {
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

  subscribeSSE(
    sessionId: string,
    onUpdate: (event: ApiSSEEvent) => void,
    onError?: (error: unknown) => void
  ): () => void {
    if (this.updatesEventSource) {
      this.updatesEventSource.close();
    }

    const url = new URL("/api/updates", this.backendUrl);
    url.searchParams.set("session_id", sessionId);
    this.updatesEventSource = new EventSource(url.toString());

    this.updatesEventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as ApiSSEEvent;
        onUpdate(parsed);
      } catch (error) {
        console.error("Failed to parse SSE event:", error);
        onError?.(error);
      }
    };

    this.updatesEventSource.onerror = (error) => {
      console.error("SSE connection error:", error);
      onError?.(error);
    };

    return () => {
      if (this.updatesEventSource) {
        this.updatesEventSource.close();
        this.updatesEventSource = null;
      }
    };
  }

  async fetchThreads(publicKey: string): Promise<ApiThread[]> {
    console.log("🔵 [fetchThreads] Called with publicKey:", publicKey);
    const url = `${this.backendUrl}/api/sessions?public_key=${encodeURIComponent(publicKey)}`;
    console.log("🔵 [fetchThreads] URL:", url);

    const response = await fetch(url);
    console.log("🔵 [fetchThreads] Response status:", response.status);

    if (!response.ok) {
      console.error("🔴 [fetchThreads] Error:", response.status);
      throw new Error(`Failed to fetch threads: HTTP ${response.status}`);
    }

    const data = (await response.json()) as ApiThread[];
    console.log("🟢 [fetchThreads] Success:", data);
    return data;
  }

  async createThread(publicKey?: string, title?: string): Promise<ApiCreateThreadResponse> {
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

    const data = (await response.json()) as ApiCreateThreadResponse;
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

  async getSystemEvents(sessionId: string): Promise<ApiSystemEvent[]> {
    console.log("🔵 [getSystemEvents] Called with sessionId:", sessionId);
    const url = `${this.backendUrl}/api/events?session_id=${encodeURIComponent(sessionId)}`;
    console.log("🔵 [getSystemEvents] URL:", url);

    const response = await fetch(url);
    console.log("🔵 [getSystemEvents] Response status:", response.status);

    if (!response.ok) {
      if (response.status === 404) {
        // Session doesn't exist yet, return empty array
        console.log("🟡 [getSystemEvents] Session not found, returning empty");
        return [];
      }
      console.error("🔴 [getSystemEvents] Error:", response.status);
      throw new Error(`Failed to get system events: HTTP ${response.status}`);
    }

    const data = (await response.json()) as ApiSystemEvent[];
    console.log("🟢 [getSystemEvents] Success:", data);
    return data;
  }
}
