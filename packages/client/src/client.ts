import type {
  AomiAccountProfile,
  AomiAuthWalletFamily,
  AomiAppDescriptor,
  AomiBeginAccountAuthResponse,
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
  GetAccountAccessToken,
  Logger,
} from "./types";
import { UserState, type UserState as UserStateShape } from "./user-state";
import { createSseSubscriber, type SseSubscriber } from "./sse";

// =============================================================================
// Internal helpers
// =============================================================================

const SESSION_ID_HEADER = "X-Session-Id";
const APP_KEY_HEADER = "AOMI-APP-KEY";

function previewText(value: string, max = 80): string {
  const singleLine = value.replace(/\s+/g, " ").trim();
  if (singleLine.length <= max) return singleLine;
  return `${singleLine.slice(0, max - 1)}…`;
}

// Fields the server originated and stores authoritatively. The client only
// echoes pending state back to identify which entries it knows about; the
// payload bodies (raw tx bytes, signing messages, etc.) should not travel
// back across the wire.
const BULKY_PENDING_FIELDS = new Set<string>([
  "messageBase64",
  "message_base64",
  "messageSha256",
  "message_sha256",
  "unsignedTx",
  "unsigned_tx",
  "typed_data",
  "typedData",
  "tx_data",
  "txData",
  "transaction",
  "transactionBase64",
  "transaction_base64",
]);

function pruneBucket(
  bucket: Record<string, unknown> | null | undefined,
): Record<string, unknown> | undefined {
  if (!bucket) return undefined;
  const out: Record<string, unknown> = {};
  for (const [id, entry] of Object.entries(bucket)) {
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      const rec = entry as Record<string, unknown>;
      const pruned: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(rec)) {
        if (!BULKY_PENDING_FIELDS.has(k)) pruned[k] = v;
      }
      out[id] = pruned;
    } else {
      out[id] = entry;
    }
  }
  return out;
}

function stripBulkyPendingFields(
  userState: UserStateShape | undefined,
): UserStateShape | undefined {
  if (!userState?.pending) return userState;
  const pending = userState.pending;
  const legacyPending = pending as Record<string, unknown>;
  return {
    ...userState,
    pending: {
      ...pending,
      evm_txs: pruneBucket(pending.evm_txs),
      evm_sigs: pruneBucket(pending.evm_sigs),
      svm_ixs: pruneBucket(pending.svm_ixs),
      solana_txs: pruneBucket(
        legacyPending.solana_txs as Record<string, unknown> | null | undefined,
      ),
      solana_sigs: pruneBucket(
        legacyPending.solana_sigs as Record<string, unknown> | null | undefined,
      ),
      svm_sigs: pruneBucket(
        legacyPending.svm_sigs as Record<string, unknown> | null | undefined,
      ),
    },
  };
}

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

function withSessionHeader(sessionId: string, init?: HeadersInit): HeadersInit {
  const headers = new Headers(init);
  headers.set(SESSION_ID_HEADER, sessionId);
  return headers;
}

async function fetchStateResponse(
  fetchImpl: typeof fetch,
  url: string,
  sessionId: string,
): Promise<Response> {
  return fetchImpl(url, {
    headers: withSessionHeader(sessionId),
  });
}

function wrapFetchWithAccountBearer(
  fetchImpl: typeof fetch,
  getAccountAccessToken?: GetAccountAccessToken,
): typeof fetch {
  if (!getAccountAccessToken) return fetchImpl;

  return async (input, init) => {
    const baseHeaders = new Headers(
      init?.headers ?? (input instanceof Request ? input.headers : undefined),
    );
    const fetchWithBearer = async (forceRefresh: boolean) => {
      const headers = new Headers(baseHeaders);
      // The account bearer is additive — never let a failing token source break
      // the request. A throwing/absent token just means no Authorization header.
      let accessToken: string | null | undefined;
      try {
        accessToken = await getAccountAccessToken({ forceRefresh });
      } catch {
        accessToken = undefined;
      }
      if (accessToken) {
        headers.set("Authorization", `Bearer ${accessToken}`);
      }
      return fetchImpl(input, { ...init, headers });
    };

    const response = await fetchWithBearer(false);
    if (response.status !== 401) return response;
    return fetchWithBearer(true);
  };
}

function supportsTokenRefreshSubscription(
  provider: GetAccountAccessToken | undefined,
): provider is GetAccountAccessToken & {
  subscribe: (listener: () => void) => () => void;
} {
  return (
    typeof (provider as { subscribe?: unknown } | undefined)?.subscribe ===
    "function"
  );
}

async function postState<T>(
  baseUrl: string,
  path: string,
  payload: Record<string, unknown>,
  sessionId: string,
  fetchImpl: typeof fetch,
  apiKey?: string,
  logger?: Logger,
): Promise<T> {
  const url = `${baseUrl}${path}`;
  const body = JSON.stringify(payload);

  const headers = new Headers(withSessionHeader(sessionId));
  headers.set("Content-Type", "application/json");
  if (apiKey) {
    headers.set(APP_KEY_HEADER, apiKey);
  }

  logger?.debug("[aomi][client] POST start", {
    path,
    sessionId,
    hasApiKey: Boolean(apiKey),
    bodyLength: body.length,
  });

  let pendingWarning: ReturnType<typeof setTimeout> | undefined;
  if (typeof setTimeout === "function") {
    pendingWarning = setTimeout(() => {
      logger?.debug("[aomi][client] POST still pending", {
        path,
        sessionId,
        bodyLength: body.length,
      });
    }, 5000);
  }

  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers,
      body,
    });
  } finally {
    if (pendingWarning) {
      clearTimeout(pendingWarning);
    }
  }

  logger?.debug("[aomi][client] POST response", {
    path,
    sessionId,
    status: response.status,
    ok: response.ok,
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
    const fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
    const rawFetchImpl =
      typeof globalThis.fetch === "function"
        ? globalThis.fetch.bind(globalThis)
        : fetchImpl;
    this.fetchImpl = wrapFetchWithAccountBearer(
      fetchImpl,
      options.getAccountAccessToken,
    );
    this.rawFetchImpl = wrapFetchWithAccountBearer(
      rawFetchImpl,
      options.getAccountAccessToken,
    );
    this.logger = options.logger;

    this.sseSubscriber = createSseSubscriber({
      backendUrl: this.baseUrl,
      getHeaders: (sessionId) =>
        withSessionHeader(sessionId, { Accept: "text/event-stream" }),
      // Keep SSE on the browser-native fetch path. Payment/auth wrappers used
      // by some web runtimes can delay or buffer streaming responses.
      fetchImpl: this.rawFetchImpl,
      logger: this.logger,
    });
    if (supportsTokenRefreshSubscription(options.getAccountAccessToken)) {
      options.getAccountAccessToken.subscribe(() => {
        this.sseSubscriber.reconnect("account-token-refreshed");
      });
    }
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
    const normalizedUserState = stripBulkyPendingFields(
      UserState.normalize(userState),
    );
    const urlWithSyncParams = buildApiUrl(this.baseUrl, "/api/state", {
      user_state: normalizedUserState
        ? JSON.stringify(normalizedUserState)
        : undefined,
      client_id: clientId,
    });
    const bareUrl = buildApiUrl(this.baseUrl, "/api/state");
    const shouldRetryWithoutSyncParams =
      Boolean(normalizedUserState) || Boolean(clientId);

    this.logger?.debug("[aomi][client] GET /api/state start", {
      sessionId,
      clientId,
      hasUserState: Boolean(normalizedUserState),
    });

    let response = await fetchStateResponse(
      this.rawFetchImpl,
      urlWithSyncParams,
      sessionId,
    );

    if (
      !response.ok &&
      shouldRetryWithoutSyncParams &&
      (response.status === 400 || response.status === 414)
    ) {
      this.logger?.debug(
        "[aomi][client] GET /api/state retrying without sync params",
        {
          sessionId,
          initialStatus: response.status,
          hadClientId: Boolean(clientId),
          hadUserState: Boolean(normalizedUserState),
        },
      );
      response = await fetchStateResponse(
        this.rawFetchImpl,
        bareUrl,
        sessionId,
      );
    }

    this.logger?.debug("[aomi][client] GET /api/state response", {
      sessionId,
      status: response.status,
      ok: response.ok,
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
    const url = buildApiUrl(this.baseUrl, "/api/chat", {
      app,
      message,
      public_key: options?.publicKey,
      user_state: normalizedUserState
        ? JSON.stringify(normalizedUserState)
        : undefined,
      client_id: options?.clientId,
    });

    this.logger?.debug("[aomi][client] POST /api/chat prepared", {
      sessionId,
      app,
      publicKey: options?.publicKey,
      clientId: options?.clientId,
      hasUserState: Boolean(normalizedUserState),
      messagePreview: previewText(message),
    });

    const headers = new Headers(withSessionHeader(sessionId));
    if (apiKey) {
      headers.set(APP_KEY_HEADER, apiKey);
    }

    this.logger?.debug("[aomi][client] POST start", {
      path: "/api/chat",
      sessionId,
      hasApiKey: Boolean(apiKey),
      url,
    });

    const response = await this.fetchImpl(url, {
      method: "POST",
      headers,
    });

    this.logger?.debug("[aomi][client] POST response", {
      path: "/api/chat",
      sessionId,
      status: response.status,
      ok: response.ok,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return (await response.json()) as AomiChatResponse;
  }

  /**
   * Send a system-level message (e.g. wallet state changes, context switches).
   * Pass `app` to preserve the session's active app context (prevents the
   * backend from resetting to the default app when no app is specified).
   */
  async sendSystemMessage(
    sessionId: string,
    message: string,
    options?: { app?: string },
  ): Promise<AomiSystemResponse> {
    const payload: Record<string, unknown> = { message };
    if (options?.app) {
      payload.app = options.app;
    }
    this.logger?.debug("[aomi][client] POST /api/system prepared", {
      sessionId,
      app: options?.app,
      messagePreview: previewText(message),
    });
    return postState<AomiSystemResponse>(
      this.baseUrl,
      "/api/system",
      payload,
      sessionId,
      this.fetchImpl,
      undefined,
      this.logger,
    );
  }

  /**
   * Interrupt the AI's current response.
   */
  async interrupt(sessionId: string): Promise<AomiInterruptResponse> {
    this.logger?.debug("[aomi][client] POST /api/interrupt prepared", {
      sessionId,
    });
    return postState<AomiInterruptResponse>(
      this.baseUrl,
      "/api/interrupt",
      {},
      sessionId,
      this.fetchImpl,
      undefined,
      this.logger,
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
    const body: {
      client_id: string;
      app?: string;
      secrets: Record<string, string>;
    } = {
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
   * @deprecated Account bootstrap is handled by session create/chat requests and
   * the account-token exchange. `/api/settings/account` is now an authenticated
   * profile endpoint, so this legacy helper intentionally does nothing.
   */
  async ensureAccount(_sessionId: string, _publicKey: string): Promise<void> {
    return undefined;
  }

  /**
   * List all threads for a wallet address.
   */
  async listThreads(
    sessionId: string,
    publicKey: string,
  ): Promise<AomiThread[]> {
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

    const data = (await response.json()) as unknown;
    if (!Array.isArray(data)) return [];
    return data
      .map((item) => {
        if (typeof item === "string") {
          return { name: item };
        }
        if (item && typeof item === "object" && "name" in item) {
          const name = (item as { name?: unknown }).name;
          if (typeof name === "string" && name.trim().length > 0) {
            return item as AomiAppDescriptor;
          }
        }
        return null;
      })
      .filter((item): item is AomiAppDescriptor => item !== null);
  }

  /**
   * Fetch the account bound to the authenticated request (resolved from the
   * account bearer). Returns `null` when the session is not bound to a real
   * user — the backend answers `/api/settings/account` with HTTP 400 for
   * anonymous sessions, which is the normal "no bearer / not logged in" case
   * rather than an error.
   */
  async fetchAccountProfile(
    sessionId: string,
  ): Promise<AomiAccountProfile | null> {
    const url = buildApiUrl(this.baseUrl, "/api/settings/account");
    const response = await this.rawFetchImpl(url, {
      headers: withSessionHeader(sessionId),
    });

    if (
      response.status === 400 ||
      response.status === 401 ||
      response.status === 403
    ) {
      return null;
    }
    if (!response.ok) {
      throw new Error(
        `Failed to fetch account profile: HTTP ${response.status}`,
      );
    }

    return (await response.json()) as AomiAccountProfile;
  }

  /**
   * Mint a Privy browser auth URL bound to the current backend session.
   */
  async beginPrivyAuth(
    sessionId: string,
    options?: { application?: string; walletFamily?: AomiAuthWalletFamily },
  ): Promise<AomiBeginAccountAuthResponse> {
    const url = buildApiUrl(this.baseUrl, "/api/auth/privy/begin");
    const response = await this.rawFetchImpl(url, {
      method: "POST",
      headers: withSessionHeader(sessionId, {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        application: options?.application,
        wallet_family:
          options?.walletFamily === "evm" ? undefined : options?.walletFamily,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to begin Privy auth: HTTP ${response.status}`);
    }

    return (await response.json()) as AomiBeginAccountAuthResponse;
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
    const url = buildApiUrl(this.baseUrl, "/api/session/model", {
      rig,
      app: options?.app,
      client_id: options?.clientId,
    });

    const headers = new Headers(withSessionHeader(sessionId));
    if (apiKey) {
      headers.set(APP_KEY_HEADER, apiKey);
    }

    const response = await this.fetchImpl(url, {
      method: "POST",
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to set model: HTTP ${response.status}`);
    }

    return (await response.json()) as {
      success: boolean;
      rig: string;
      baml: string;
      created: boolean;
    };
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
  async deleteByokKey(sessionId: string, provider: string): Promise<boolean> {
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
      throw new Error(
        `HTTP ${response.status}: ${response.statusText}${body ? `\n${body}` : ""}`,
      );
    }

    return (await response.json()) as AomiSimulateResponse;
  }
}
