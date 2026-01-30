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
import { createSseSubscriber, type SseSubscriber } from "./sse";
import type { UserState } from "../contexts/user-context";

const SESSION_ID_HEADER = "X-Session-Id";
const API_KEY_HEADER = "X-API-Key";

function toQueryString(payload: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function withSessionHeader(sessionId: string, init?: HeadersInit): HeadersInit {
  const headers = new Headers(init);
  headers.set(SESSION_ID_HEADER, sessionId);
  return headers;
}

async function postState<T>(
  backendUrl: string,
  path: string,
  payload: Record<string, unknown>,
  sessionId: string,
  apiKey?: string,
): Promise<T> {
  const query = toQueryString(payload);
  const url = `${backendUrl}${path}${query}`;

  const headers = new Headers(withSessionHeader(sessionId));
  if (apiKey) {
    headers.set(API_KEY_HEADER, apiKey);
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return (await response.json()) as T;
}

export class BackendApi {
  private sseSubscriber: SseSubscriber;

  constructor(private readonly backendUrl: string) {
    this.sseSubscriber = createSseSubscriber({
      backendUrl,
      getHeaders: (sessionId) =>
        withSessionHeader(sessionId, { Accept: "text/event-stream" }),
    });
  }

  async fetchState(
    sessionId: string,
    userState?: UserState,
  ): Promise<ApiStateResponse> {
    const url = new URL("/api/state", this.backendUrl);
    if (userState) {
      url.searchParams.set("user_state", JSON.stringify(userState));
    }

    const response = await fetch(url.toString(), {
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
    namespace: string,
    publicKey?: string,
    apiKey?: string,
  ): Promise<ApiChatResponse> {
    const payload: Record<string, unknown> = { message, namespace };
    if (publicKey) {
      payload.public_key = publicKey;
    }

    return postState<ApiChatResponse>(
      this.backendUrl,
      "/api/chat",
      payload,
      sessionId,
      apiKey,
    );
  }

  async postSystemMessage(
    sessionId: string,
    message: string,
  ): Promise<ApiSystemResponse> {
    return postState<ApiSystemResponse>(
      this.backendUrl,
      "/api/system",
      {
        message,
      },
      sessionId,
    );
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
    return this.sseSubscriber.subscribe(sessionId, onUpdate, onError);
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
    threadId: string,
    publicKey?: string,
  ): Promise<ApiCreateThreadResponse> {
    const body: Record<string, string> = {};
    if (publicKey) body.public_key = publicKey;

    const url = `${this.backendUrl}/api/sessions`;
    const response = await fetch(url, {
      method: "POST",
      headers: withSessionHeader(threadId, {
        "Content-Type": "application/json",
      }),
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

  async getSystemEvents(
    sessionId: string,
    count?: number,
  ): Promise<ApiSystemEvent[]> {
    const url = new URL("/api/events", this.backendUrl);
    if (count !== undefined) {
      url.searchParams.set("count", String(count));
    }
    const response = await fetch(url.toString(), {
      headers: withSessionHeader(sessionId),
    });

    if (!response.ok) {
      if (response.status === 404) return [];
      throw new Error(`Failed to get system events: HTTP ${response.status}`);
    }

    return (await response.json()) as ApiSystemEvent[];
  }

  // ===========================================================================
  // Control API
  // ===========================================================================

  /**
   * Get allowed namespaces for the current request context.
   */
  async getNamespaces(
    sessionId: string,
    publicKey?: string,
    apiKey?: string,
  ): Promise<string[]> {
    const url = new URL("/api/control/namespaces", this.backendUrl);
    if (publicKey) {
      url.searchParams.set("public_key", publicKey);
    }

    const headers = new Headers(withSessionHeader(sessionId));
    if (apiKey) {
      headers.set(API_KEY_HEADER, apiKey);
    }

    const response = await fetch(url.toString(), { headers });

    if (!response.ok) {
      throw new Error(`Failed to get namespaces: HTTP ${response.status}`);
    }

    return (await response.json()) as string[];
  }

  /**
   * Get available models.
   */
  async getModels(sessionId: string): Promise<string[]> {
    const url = new URL("/api/control/models", this.backendUrl);

    const response = await fetch(url.toString(), {
      headers: withSessionHeader(sessionId),
    });

    if (!response.ok) {
      throw new Error(`Failed to get models: HTTP ${response.status}`);
    }

    return (await response.json()) as string[];
  }

  /**
   * Set the model selection for a session.
   */
  async setModel(
    sessionId: string,
    rig: string,
    namespace?: string,
  ): Promise<{
    success: boolean;
    rig: string;
    baml: string;
    created: boolean;
  }> {
    const payload: Record<string, unknown> = { rig };
    if (namespace) {
      payload.namespace = namespace;
    }

    return postState<{
      success: boolean;
      rig: string;
      baml: string;
      created: boolean;
    }>(this.backendUrl, "/api/control/model", payload, sessionId);
  }
}
