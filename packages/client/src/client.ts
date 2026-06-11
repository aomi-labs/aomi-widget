import type {
  AomiAppDescriptor,
  AomiClientOptions,
  AomiMessage,
  AomiChatResponse,
  AomiClearSecretsResponse,
  AomiCreateThreadResponse,
  AomiDeleteByokKeyResponse,
  AomiDeleteSecretResponse,
  AomiIngestSecretsResponse,
  AomiInterruptResponse,
  AomiListByokKeysResponse,
  AomiListSecretsResponse,
  AomiByokKeyEntry,
  AomiSaveByokKeyResponse,
  AomiSSEEvent,
  AomiSimulateResponse,
  AomiStateResponse,
  AomiSystemEvent,
  AomiSystemResponse,
  AomiThread,
  Logger,
} from "./types";
import { UserState, type UserState as UserStateShape } from "./user-state";
import { createSseSubscriber, type SseSubscriber } from "./sse";

// =============================================================================
// Internal helpers
// =============================================================================

const SESSION_ID_HEADER = "X-Session-Id";
const APP_KEY_HEADER = "AOMI-APP-KEY";

function joinApiPath(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl === "/" ? "" : baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}` || normalizedPath;
}

function buildApiUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, string | undefined>,
): string {
  const url = joinApiPath(baseUrl, path);
  if (!query) return url;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    params.set(key, value);
  }

  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
}

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
  fetchImpl: typeof fetch,
  apiKey?: string,
): Promise<T> {
  const query = toQueryString(payload);
  const url = `${baseUrl}${path}${query}`;

  const headers = new Headers(withSessionHeader(sessionId));
  if (apiKey) {
    headers.set(APP_KEY_HEADER, apiKey);
  }

  const response = await fetchImpl(url, {
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
  private readonly fetchImpl: typeof fetch;
  private readonly rawFetchImpl: typeof fetch;
  private readonly logger?: Logger;
  private readonly sseSubscriber: SseSubscriber;

  constructor(options: AomiClientOptions) {
    // Strip trailing slash
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.rawFetchImpl =
      typeof globalThis.fetch === "function"
        ? globalThis.fetch.bind(globalThis)
        : this.fetchImpl;
    this.logger = options.logger;

    this.sseSubscriber = createSseSubscriber({
      backendUrl: this.baseUrl,
      getHeaders: (sessionId) =>
        withSessionHeader(sessionId, { Accept: "text/event-stream" }),
      fetchImpl: this.fetchImpl,
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
    userState?: UserStateShape,
    clientId?: string,
  ): Promise<AomiStateResponse> {
    const normalizedUserState = UserState.normalize(userState);
    const url = buildApiUrl(this.baseUrl, "/api/state", {
      user_state: normalizedUserState
        ? JSON.stringify(normalizedUserState)
        : undefined,
      client_id: clientId,
    });

    const response = await this.fetchImpl(url, {
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
      app?: string;
      publicKey?: string;
      apiKey?: string;
      userState?: UserStateShape;
      clientId?: string;
    },
  ): Promise<AomiChatResponse> {
    const app = options?.app ?? "default";
    const apiKey = options?.apiKey ?? this.apiKey;
    const normalizedUserState = UserState.normalize(options?.userState);

    const payload: Record<string, unknown> = { message, app };
    if (options?.publicKey) {
      payload.public_key = options.publicKey;
    }
    if (normalizedUserState) {
      payload.user_state = JSON.stringify(normalizedUserState);
    }
    if (options?.clientId) {
      payload.client_id = options.clientId;
    }

    return postState<AomiChatResponse>(
      this.baseUrl,
      "/api/chat",
      payload,
      sessionId,
      this.fetchImpl,
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
      this.fetchImpl,
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
      this.fetchImpl,
    );
  }

  // ===========================================================================
  // Secrets
  // ===========================================================================

  /**
   * Ingest secrets for a client. Returns opaque `$SECRET:<name>` handles.
   *
   * When `app` is provided, the values land in the per-app store keyed by
   * `(client_id, app)` — this is the path the Secrets settings page uses
   * (one app at a time). When `app` is omitted, secrets land in the flat
   * client store (used by BYOK and other cross-app pools).
   */
  async ingestSecrets(
    sessionId: string,
    clientId: string,
    secrets: Record<string, string>,
    app?: string,
  ): Promise<AomiIngestSecretsResponse> {
    const url = joinApiPath(this.baseUrl, "/api/secrets");
    const body: { client_id: string; app?: string; secrets: Record<string, string> } = {
      client_id: clientId,
      secrets,
    };
    if (app && app.trim().length > 0) {
      body.app = app.trim();
    }
    const response = await this.fetchImpl(url, {
      method: "POST",
      headers: withSessionHeader(sessionId, {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return (await response.json()) as AomiIngestSecretsResponse;
  }

  /**
   * Clear secrets for a client. With `app`, removes every slot under that
   * app. Without `app`, clears the entire client (legacy behavior — wipes
   * both stores and unbinds the session).
   */
  async clearSecrets(
    sessionId: string,
    clientId: string,
    app?: string,
  ): Promise<AomiClearSecretsResponse> {
    const params: Record<string, string> = { client_id: clientId };
    if (app && app.trim().length > 0) {
      params.app = app.trim();
    }
    const url = buildApiUrl(this.baseUrl, "/api/secrets", params);
    const response = await this.fetchImpl(url, {
      method: "DELETE",
      headers: withSessionHeader(sessionId),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return (await response.json()) as AomiClearSecretsResponse;
  }

  /**
   * Remove a single named secret. With `app`, targets the per-app store
   * under that scope; without, targets the flat store.
   */
  async deleteSecret(
    sessionId: string,
    clientId: string,
    name: string,
    app?: string,
  ): Promise<AomiDeleteSecretResponse> {
    const params: Record<string, string> = { client_id: clientId };
    if (app && app.trim().length > 0) {
      params.app = app.trim();
    }
    const url = buildApiUrl(
      this.baseUrl,
      `/api/secrets/${encodeURIComponent(name)}`,
      params,
    );
    const response = await this.fetchImpl(url, {
      method: "DELETE",
      headers: withSessionHeader(sessionId),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return (await response.json()) as AomiDeleteSecretResponse;
  }

  /**
   * List currently stored secret names per app for this client. The
   * backend never returns raw values; the settings page uses this as the
   * source of truth instead of trusting localStorage.
   */
  async listSecrets(sessionId: string): Promise<AomiListSecretsResponse> {
    const url = joinApiPath(this.baseUrl, "/api/secrets");
    const response = await this.fetchImpl(url, {
      method: "GET",
      headers: withSessionHeader(sessionId),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return (await response.json()) as AomiListSecretsResponse;
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
   * Ensure the backend has an account row for a wallet address.
   *
   * The hosted backend binds wallet-owned session lists through the account
   * table. Calling this before thread list/create keeps first-run wallet flows
   * from creating sessions that exist by ID but do not appear in
   * GET /api/sessions?public_key=...
   */
  async ensureAccount(sessionId: string, publicKey: string): Promise<void> {
    const url = buildApiUrl(this.baseUrl, "/api/settings/account", {
      public_key: publicKey,
    });
    const response = await this.fetchImpl(url, {
      headers: withSessionHeader(sessionId),
    });

    if (!response.ok) {
      throw new Error(`Failed to ensure account: HTTP ${response.status}`);
    }

    await response.json().catch(() => undefined);
  }

  /**
   * List all threads for a wallet address.
   */
  async listThreads(sessionId: string, publicKey: string): Promise<AomiThread[]> {
    const url = buildApiUrl(this.baseUrl, "/api/sessions", {
      public_key: publicKey,
    });
    const response = await this.fetchImpl(url, {
      headers: withSessionHeader(sessionId),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch threads: HTTP ${response.status}`);
    }

    return (await response.json()) as AomiThread[];
  }

  /**
   * Get a single thread by ID.
   */
  async getThread(sessionId: string): Promise<AomiThread> {
    const url = buildApiUrl(
      this.baseUrl,
      `/api/sessions/${encodeURIComponent(sessionId)}`,
    );
    const response = await this.fetchImpl(url, {
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

    const url = buildApiUrl(this.baseUrl, "/api/sessions");
    const response = await this.fetchImpl(url, {
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
    const url = buildApiUrl(
      this.baseUrl,
      `/api/sessions/${encodeURIComponent(sessionId)}`,
    );
    const response = await this.fetchImpl(url, {
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
    const url = buildApiUrl(
      this.baseUrl,
      `/api/sessions/${encodeURIComponent(sessionId)}`,
    );
    const response = await this.fetchImpl(url, {
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
    throw new Error(
      "Failed to archive thread: current backend does not expose /api/sessions/:id/archive",
    );
  }

  /**
   * Unarchive a thread.
   */
  async unarchiveThread(sessionId: string): Promise<void> {
    throw new Error(
      "Failed to unarchive thread: current backend does not expose /api/sessions/:id/unarchive",
    );
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
    const url = buildApiUrl(this.baseUrl, "/api/events", {
      count: count !== undefined ? String(count) : undefined,
    });
    const response = await this.fetchImpl(url, {
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
   * Get available apps as full descriptors (name + declared secret slots).
   * The settings page consumes the slot info to render per-app inputs and
   * the chat shell uses it to gate app load when required slots are unfilled.
   */
  async getApps(
    sessionId: string,
    options?: { publicKey?: string; apiKey?: string },
  ): Promise<AomiAppDescriptor[]> {
    const url = buildApiUrl(this.baseUrl, "/api/session/apps", {
      public_key: options?.publicKey,
    });

    const apiKey = options?.apiKey ?? this.apiKey;
    const headers = new Headers(withSessionHeader(sessionId));
    if (apiKey) {
      headers.set(APP_KEY_HEADER, apiKey);
    }

    const response = await this.rawFetchImpl(url, { headers });

    if (!response.ok) {
      throw new Error(`Failed to get apps: HTTP ${response.status}`);
    }

    return (await response.json()) as AomiAppDescriptor[];
  }

  /**
   * Get available models.
   */
  async getModels(
    sessionId: string,
    options?: { apiKey?: string },
  ): Promise<string[]> {
    const url = buildApiUrl(this.baseUrl, "/api/session/models");
    const apiKey = options?.apiKey ?? this.apiKey;
    const headers = new Headers(withSessionHeader(sessionId));
    if (apiKey) {
      headers.set(APP_KEY_HEADER, apiKey);
    }

    const response = await this.rawFetchImpl(url, {
      headers,
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
    options?: { app?: string; apiKey?: string; clientId?: string },
  ): Promise<{
    success: boolean;
    rig: string;
    baml: string;
    created: boolean;
  }> {
    const apiKey = options?.apiKey ?? this.apiKey;
    const payload: Record<string, unknown> = { rig };
    if (options?.app) {
      payload.app = options.app;
    }
    if (options?.clientId) {
      payload.client_id = options.clientId;
    }

    return postState<{
      success: boolean;
      rig: string;
      baml: string;
      created: boolean;
    }>(
      this.baseUrl,
      "/api/session/model",
      payload,
      sessionId,
      this.fetchImpl,
      apiKey,
    );
  }

  /**
   * List BYOK keys (one per LLM provider) bound to the current session's client.
   */
  async listByokKeys(sessionId: string): Promise<AomiByokKeyEntry[]> {
    const url = buildApiUrl(this.baseUrl, "/api/control/provider-keys");
    const response = await this.fetchImpl(url, {
      headers: withSessionHeader(sessionId),
    });

    if (!response.ok) {
      throw new Error(`Failed to get BYOK keys: HTTP ${response.status}`);
    }

    const data = (await response.json()) as AomiListByokKeysResponse;
    return data.byok_keys ?? [];
  }

  /**
   * Save or replace a BYOK key for the client bound to this session.
   */
  async saveByokKey(
    sessionId: string,
    provider: string,
    byokKey: string,
    label?: string,
  ): Promise<AomiByokKeyEntry> {
    const url = joinApiPath(this.baseUrl, "/api/control/provider-keys");
    const response = await this.fetchImpl(url, {
      method: "POST",
      headers: withSessionHeader(sessionId, {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        provider,
        byok_key: byokKey,
        label,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to save BYOK key: HTTP ${response.status}`);
    }

    const data = (await response.json()) as AomiSaveByokKeyResponse;
    return data.key;
  }

  /**
   * Delete a BYOK key for the client bound to this session.
   */
  async deleteByokKey(
    sessionId: string,
    provider: string,
  ): Promise<boolean> {
    const url = buildApiUrl(
      this.baseUrl,
      `/api/control/provider-keys/${encodeURIComponent(provider)}`,
    );
    const response = await this.fetchImpl(url, {
      method: "DELETE",
      headers: withSessionHeader(sessionId),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete BYOK key: HTTP ${response.status}`);
    }

    const data = (await response.json()) as AomiDeleteByokKeyResponse;
    return data.deleted;
  }

  // ===========================================================================
  // Batch Simulation
  // ===========================================================================

  /**
   * Simulate transactions as an atomic batch.
   * Each tx sees state changes from previous txs (e.g., approve → swap).
   * Sends full tx payloads — the backend does not look up by ID.
   */
  async simulateBatch(
    sessionId: string,
    transactions: Array<{
      to: string;
      value?: string;
      data?: string;
      label?: string;
      chain_id?: number;
      chainId?: number;
    }>,
    options?: { from?: string; chainId?: number },
  ): Promise<AomiSimulateResponse> {
    const url = joinApiPath(this.baseUrl, "/api/simulate");
    const headers = new Headers(
      withSessionHeader(sessionId, { "Content-Type": "application/json" }),
    );
    if (this.apiKey) {
      headers.set(APP_KEY_HEADER, this.apiKey);
    }

    const normalizedTransactions = transactions.map((transaction) => ({
      to: transaction.to,
      value: transaction.value,
      data: transaction.data,
      label: transaction.label,
      chain_id: transaction.chain_id ?? transaction.chainId ?? options?.chainId,
    }));

    const payload = {
      transactions: normalizedTransactions,
      from: options?.from,
      chain_id: options?.chainId,
    };

    const response = await this.fetchImpl(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`HTTP ${response.status}: ${response.statusText}${body ? `\n${body}` : ""}`);
    }

    return (await response.json()) as AomiSimulateResponse;
  }
}
