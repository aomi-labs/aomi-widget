import type {
  AomiClientOptions,
  AomiMessage,
  AomiChatResponse,
  AomiCreateThreadResponse,
  AomiInterruptResponse,
  AomiSSEEvent,
  AomiStateResponse,
  AomiSystemEvent,
  AomiSystemResponse,
  AomiThread,
  Logger,
  UserState,
} from "./types";
import { createSseSubscriber, type SseSubscriber } from "./sse";

// =============================================================================
// Internal helpers
// =============================================================================

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

function withSessionHeader(
  sessionId: string,
  init?: HeadersInit,
): HeadersInit {
  const headers = new Headers(init);
  headers.set(SESSION_ID_HEADER, sessionId);
  return headers;
}

async function postState<T>(
  baseUrl: string,
  path: string,
  payload: Record<string, unknown>,
  sessionId: string,
  apiKey?: string,
): Promise<T> {
  const query = toQueryString(payload);
  const url = `${baseUrl}${path}${query}`;

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

// =============================================================================
// AomiClient
// =============================================================================

export class AomiClient {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly logger?: Logger;
  private readonly sseSubscriber: SseSubscriber;

  constructor(options: AomiClientOptions) {
    // Strip trailing slash
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    this.logger = options.logger;

    this.sseSubscriber = createSseSubscriber({
      backendUrl: this.baseUrl,
      getHeaders: (sessionId) =>
        withSessionHeader(sessionId, { Accept: "text/event-stream" }),
      logger: this.logger,
    });
  }

  // ===========================================================================
  // Chat & State
  // ===========================================================================

  /**
   * Fetch current session state (messages, processing status, title).
   */
  async fetchState(
    sessionId: string,
    userState?: UserState,
  ): Promise<AomiStateResponse> {
    const url = new URL("/api/state", this.baseUrl);
    if (userState) {
      url.searchParams.set("user_state", JSON.stringify(userState));
    }

    const response = await fetch(url.toString(), {
      headers: withSessionHeader(sessionId),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return (await response.json()) as AomiStateResponse;
  }

  /**
   * Send a chat message and return updated session state.
   */
  async sendMessage(
    sessionId: string,
    message: string,
    options?: {
      namespace?: string;
      publicKey?: string;
      apiKey?: string;
      userState?: UserState;
    },
  ): Promise<AomiChatResponse> {
    const namespace = options?.namespace ?? "default";
    const apiKey = options?.apiKey ?? this.apiKey;

    const payload: Record<string, unknown> = { message, namespace };
    if (options?.publicKey) {
      payload.public_key = options.publicKey;
    }
    if (options?.userState) {
      payload.user_state = JSON.stringify(options.userState);
    }

    return postState<AomiChatResponse>(
      this.baseUrl,
      "/api/chat",
      payload,
      sessionId,
      apiKey,
    );
  }

  /**
   * Send a system-level message (e.g. wallet state changes, context switches).
   */
  async sendSystemMessage(
    sessionId: string,
    message: string,
  ): Promise<AomiSystemResponse> {
    return postState<AomiSystemResponse>(
      this.baseUrl,
      "/api/system",
      { message },
      sessionId,
    );
  }

  /**
   * Interrupt the AI's current response.
   */
  async interrupt(sessionId: string): Promise<AomiInterruptResponse> {
    return postState<AomiInterruptResponse>(
      this.baseUrl,
      "/api/interrupt",
      {},
      sessionId,
    );
  }

  // ===========================================================================
  // SSE (Real-time Updates)
  // ===========================================================================

  /**
   * Subscribe to real-time SSE updates for a session.
   * Automatically reconnects with exponential backoff on disconnects.
   * Returns an unsubscribe function.
   */
  subscribeSSE(
    sessionId: string,
    onUpdate: (event: AomiSSEEvent) => void,
    onError?: (error: unknown) => void,
  ): () => void {
    return this.sseSubscriber.subscribe(sessionId, onUpdate, onError);
  }

  // ===========================================================================
  // Thread / Session Management
  // ===========================================================================

  /**
   * List all threads for a wallet address.
   */
  async listThreads(publicKey: string): Promise<AomiThread[]> {
    const url = `${this.baseUrl}/api/sessions?public_key=${encodeURIComponent(publicKey)}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch threads: HTTP ${response.status}`);
    }

    return (await response.json()) as AomiThread[];
  }

  /**
   * Get a single thread by ID.
   */
  async getThread(sessionId: string): Promise<AomiThread> {
    const url = `${this.baseUrl}/api/sessions/${encodeURIComponent(sessionId)}`;
    const response = await fetch(url, {
      headers: withSessionHeader(sessionId),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return (await response.json()) as AomiThread;
  }

  /**
   * Create a new thread. The client generates the session ID.
   */
  async createThread(
    threadId: string,
    publicKey?: string,
  ): Promise<AomiCreateThreadResponse> {
    const body: Record<string, string> = {};
    if (publicKey) body.public_key = publicKey;

    const url = `${this.baseUrl}/api/sessions`;
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

    return (await response.json()) as AomiCreateThreadResponse;
  }

  /**
   * Delete a thread by ID.
   */
  async deleteThread(sessionId: string): Promise<void> {
    const url = `${this.baseUrl}/api/sessions/${encodeURIComponent(sessionId)}`;
    const response = await fetch(url, {
      method: "DELETE",
      headers: withSessionHeader(sessionId),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete thread: HTTP ${response.status}`);
    }
  }

  /**
   * Rename a thread.
   */
  async renameThread(sessionId: string, newTitle: string): Promise<void> {
    const url = `${this.baseUrl}/api/sessions/${encodeURIComponent(sessionId)}`;
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

  /**
   * Archive a thread.
   */
  async archiveThread(sessionId: string): Promise<void> {
    const url = `${this.baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/archive`;
    const response = await fetch(url, {
      method: "POST",
      headers: withSessionHeader(sessionId),
    });

    if (!response.ok) {
      throw new Error(`Failed to archive thread: HTTP ${response.status}`);
    }
  }

  /**
   * Unarchive a thread.
   */
  async unarchiveThread(sessionId: string): Promise<void> {
    const url = `${this.baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/unarchive`;
    const response = await fetch(url, {
      method: "POST",
      headers: withSessionHeader(sessionId),
    });

    if (!response.ok) {
      throw new Error(`Failed to unarchive thread: HTTP ${response.status}`);
    }
  }

  // ===========================================================================
  // System Events
  // ===========================================================================

  /**
   * Get system events for a session.
   */
  async getSystemEvents(
    sessionId: string,
    count?: number,
  ): Promise<AomiSystemEvent[]> {
    const url = new URL("/api/events", this.baseUrl);
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

    return (await response.json()) as AomiSystemEvent[];
  }

  // ===========================================================================
  // Control API
  // ===========================================================================

  /**
   * Get available namespaces.
   */
  async getNamespaces(
    sessionId: string,
    options?: { publicKey?: string; apiKey?: string },
  ): Promise<string[]> {
    const url = new URL("/api/control/namespaces", this.baseUrl);
    if (options?.publicKey) {
      url.searchParams.set("public_key", options.publicKey);
    }

    const apiKey = options?.apiKey ?? this.apiKey;
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
    const url = new URL("/api/control/models", this.baseUrl);

    const response = await fetch(url.toString(), {
      headers: withSessionHeader(sessionId),
    });

    if (!response.ok) {
      throw new Error(`Failed to get models: HTTP ${response.status}`);
    }

    return (await response.json()) as string[];
  }

  /**
   * Set the model for a session.
   */
  async setModel(
    sessionId: string,
    rig: string,
    options?: { namespace?: string; apiKey?: string },
  ): Promise<{
    success: boolean;
    rig: string;
    baml: string;
    created: boolean;
  }> {
    const apiKey = options?.apiKey ?? this.apiKey;
    const payload: Record<string, unknown> = { rig };
    if (options?.namespace) {
      payload.namespace = options.namespace;
    }

    return postState<{
      success: boolean;
      rig: string;
      baml: string;
      created: boolean;
    }>(this.baseUrl, "/api/control/model", payload, sessionId, apiKey);
  }
}
