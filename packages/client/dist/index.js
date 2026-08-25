var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __objRest = (source, exclude) => {
  var target = {};
  for (var prop in source)
    if (__hasOwnProp.call(source, prop) && exclude.indexOf(prop) < 0)
      target[prop] = source[prop];
  if (source != null && __getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(source)) {
      if (exclude.indexOf(prop) < 0 && __propIsEnum.call(source, prop))
        target[prop] = source[prop];
    }
  return target;
};

// src/app-descriptor.ts
function normalizeAppDescriptor(item) {
  var _a, _b;
  if (typeof item === "string") {
    const name2 = item.trim();
    return name2 ? { name: name2 } : null;
  }
  if (!item || typeof item !== "object") return null;
  const raw = item;
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (!name) return null;
  const descriptor = __spreadProps(__spreadValues({}, raw), {
    name
  });
  const applicationId = (_b = (_a = raw.applicationId) != null ? _a : raw.application_id) != null ? _b : raw.id;
  if (typeof applicationId === "number" || typeof applicationId === "string") {
    descriptor.applicationId = applicationId;
  }
  if (typeof raw.platform === "string") descriptor.platform = raw.platform;
  if (typeof raw.label === "string") descriptor.label = raw.label;
  if (typeof raw.appReleaseTag === "string") {
    descriptor.appReleaseTag = raw.appReleaseTag;
  } else if (typeof raw.app_release_tag === "string") {
    descriptor.appReleaseTag = raw.app_release_tag;
  }
  if (typeof raw.isActive === "boolean") {
    descriptor.isActive = raw.isActive;
  } else if (typeof raw.is_active === "boolean") {
    descriptor.isActive = raw.is_active;
  }
  if (typeof raw.isPublic === "boolean") {
    descriptor.isPublic = raw.isPublic;
  } else if (typeof raw.is_public === "boolean") {
    descriptor.isPublic = raw.is_public;
  }
  if (typeof raw.artifactReady === "boolean") {
    descriptor.artifactReady = raw.artifactReady;
  } else if (typeof raw.artifact_ready === "boolean") {
    descriptor.artifactReady = raw.artifact_ready;
  }
  descriptor.secrets = Array.isArray(raw.secrets) ? raw.secrets : [];
  for (const key of [
    "id",
    "application_id",
    "app_release_tag",
    "is_active",
    "is_public",
    "artifact_ready"
  ]) {
    delete descriptor[key];
  }
  return descriptor;
}
function appIdentityKey(descriptor) {
  var _a, _b;
  const applicationId = (_a = descriptor.applicationId) == null ? void 0 : _a.toString().trim();
  if (applicationId) return `application:${applicationId}`;
  const platform = (_b = descriptor.platform) == null ? void 0 : _b.trim();
  if (platform) return `platform:${platform}:${descriptor.name}`;
  return `name:${descriptor.name}`;
}

// src/agent/transport.ts
var AgentApiError = class extends Error {
  constructor(status, code, message, retryable, requestId, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.retryable = retryable;
    this.requestId = requestId;
    this.details = details;
    this.name = "AgentApiError";
  }
};
var AgentTransport = class {
  constructor(requestResponse) {
    this.requestResponse = requestResponse;
    this.sessions = new AgentSessionsTransport(requestResponse);
  }
  start(request, options = {}) {
    return this.json("POST", "/v1/agent/chat", {
      headers: mutationHeaders(options),
      body: request
    });
  }
  check(sessionId, options = {}) {
    var _a;
    return this.json("GET", `/v1/agent/chat/${encodeURIComponent(sessionId)}`, {
      query: {
        cursor: options.cursor,
        wait: Math.min(Math.max((_a = options.waitMs) != null ? _a : 0, 0), 3e4)
      }
    });
  }
  interrupt(sessionId) {
    return this.json(
      "POST",
      `/v1/agent/chat/${encodeURIComponent(sessionId)}/interrupt`,
      { headers: mutationHeaders() }
    );
  }
  async resolveAction(sessionId, actionId, result, idempotencyKey = randomIdempotencyKey()) {
    const response = await this.json(
      "POST",
      `/v1/agent/chat/${encodeURIComponent(sessionId)}/actions/${encodeURIComponent(actionId)}/result`,
      { headers: { "idempotency-key": idempotencyKey }, body: result }
    );
    return response.action;
  }
  async json(method, path, options) {
    return parseAgentResponse(
      await this.requestResponse(method, path, options)
    );
  }
};
var AgentSessionsTransport = class {
  constructor(requestResponse) {
    this.requestResponse = requestResponse;
  }
  async list(options = {}) {
    return this.json("GET", "/v1/agent/sessions", {
      query: { cursor: options.cursor, limit: options.limit }
    });
  }
  async all() {
    var _a;
    const sessions = [];
    let cursor;
    do {
      const page = await this.list({ cursor, limit: 100 });
      sessions.push(...page.sessions);
      cursor = (_a = page.nextCursor) != null ? _a : void 0;
    } while (cursor);
    return sessions;
  }
  get(sessionId) {
    return this.json(
      "GET",
      `/v1/agent/sessions/${encodeURIComponent(sessionId)}`
    );
  }
  update(sessionId, patch) {
    return this.json(
      "PATCH",
      `/v1/agent/sessions/${encodeURIComponent(sessionId)}`,
      {
        headers: mutationHeaders(),
        body: patch
      }
    );
  }
  async delete(sessionId) {
    await parseAgentResponse(
      await this.requestResponse(
        "DELETE",
        `/v1/agent/sessions/${encodeURIComponent(sessionId)}`,
        { headers: mutationHeaders() }
      )
    );
  }
  async json(method, path, options) {
    return parseAgentResponse(
      await this.requestResponse(method, path, options)
    );
  }
};
async function parseAgentResponse(response) {
  var _a, _b, _c, _d, _e, _f, _g, _h;
  if (response.ok) {
    if (response.status === 204) return void 0;
    return await response.json();
  }
  const body = await response.json().catch(() => null);
  const code = (_b = (_a = body == null ? void 0 : body.error) == null ? void 0 : _a.code) != null ? _b : "agent_request_failed";
  throw new AgentApiError(
    response.status,
    code,
    (_d = (_c = body == null ? void 0 : body.error) == null ? void 0 : _c.message) != null ? _d : `Agent request failed with HTTP ${response.status}`,
    response.status === 408 || response.status === 429 || response.status >= 500,
    (_g = (_f = (_e = body == null ? void 0 : body.error) == null ? void 0 : _e.requestId) != null ? _f : response.headers.get("x-request-id")) != null ? _g : void 0,
    (_h = body == null ? void 0 : body.error) == null ? void 0 : _h.details
  );
}
function mutationHeaders(options = {}) {
  var _a;
  return __spreadValues({
    "idempotency-key": (_a = options.idempotencyKey) != null ? _a : randomIdempotencyKey()
  }, options.paymentSignature ? { "payment-signature": options.paymentSignature } : {});
}
function randomIdempotencyKey() {
  return `idem_${globalThis.crypto.randomUUID().replaceAll("-", "")}`;
}

// src/pipeline/transport.ts
var PipelineApiError = class extends Error {
  constructor(status, code, message, retryable, requestId, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.retryable = retryable;
    this.requestId = requestId;
    this.details = details;
    this.name = "PipelineApiError";
  }
};
var PipelineTransport = class {
  constructor(requestResponse) {
    this.requestResponse = requestResponse;
  }
  listApps(options = {}) {
    return this.json("GET", "/v1/pipeline/apps", {
      query: { limit: options.limit }
    });
  }
  getApp(app) {
    return this.json(
      "GET",
      `/v1/pipeline/apps/${encodeURIComponent(required("app", app))}`
    );
  }
  searchApps(options = {}) {
    return this.json("GET", "/v1/pipeline/search/apps", {
      query: { q: options.q, limit: options.limit }
    });
  }
  listTools(options = {}) {
    return this.json("GET", "/v1/pipeline/tools", {
      query: {
        app: options.app,
        namespace: options.namespace,
        limit: options.limit
      }
    });
  }
  getTool(toolId, options = {}) {
    return this.json(
      "GET",
      `/v1/pipeline/tools/${encodeURIComponent(required("toolId", toolId))}`,
      { query: { app: options.app } }
    );
  }
  searchTools(options = {}) {
    return this.json("GET", "/v1/pipeline/search/tools", {
      query: { q: options.q, app: options.app, limit: options.limit }
    });
  }
  listSkills(options = {}) {
    return this.json("GET", "/v1/pipeline/skills", {
      query: { limit: options.limit }
    });
  }
  getSkill(skillId) {
    return this.json(
      "GET",
      `/v1/pipeline/skills/${encodeURIComponent(required("skillId", skillId))}`
    );
  }
  callTool(request, options) {
    return this.json("POST", "/v1/pipeline/tool-calls", {
      headers: executionHeaders(options),
      body: request
    });
  }
  run(request, options) {
    return this.json("POST", "/v1/pipeline/runs", {
      headers: executionHeaders(options),
      body: request
    });
  }
  async json(method, path, options) {
    return parsePipelineResponse(
      await this.requestResponse(method, path, options)
    );
  }
};
async function parsePipelineResponse(response) {
  var _a, _b, _c, _d, _e, _f, _g, _h;
  if (response.ok) {
    if (response.status === 204) return void 0;
    return await response.json();
  }
  const body = await response.json().catch(() => null);
  throw new PipelineApiError(
    response.status,
    (_b = (_a = body == null ? void 0 : body.error) == null ? void 0 : _a.code) != null ? _b : "pipeline_request_failed",
    (_d = (_c = body == null ? void 0 : body.error) == null ? void 0 : _c.message) != null ? _d : `Pipeline request failed with HTTP ${response.status}`,
    response.status === 408 || response.status === 429 || response.status >= 500,
    (_g = (_f = (_e = body == null ? void 0 : body.error) == null ? void 0 : _e.requestId) != null ? _f : response.headers.get("x-request-id")) != null ? _g : void 0,
    (_h = body == null ? void 0 : body.error) == null ? void 0 : _h.details
  );
}
function required(name, value) {
  const normalized = value.trim();
  if (!normalized) throw new TypeError(`${name} is required`);
  return normalized;
}
function executionHeaders(options) {
  const idempotencyKey = required("idempotencyKey", options.idempotencyKey);
  return __spreadValues({
    "idempotency-key": idempotencyKey
  }, options.paymentSignature ? { "payment-signature": options.paymentSignature } : {});
}

// src/guest-auth.ts
function createGuestSessionProvider(input) {
  var _a;
  const fetchImpl = (_a = input.fetch) != null ? _a : globalThis.fetch.bind(globalThis);
  let credential = null;
  let pending = null;
  const provider = async (options) => {
    if (options == null ? void 0 : options.forceRefresh) credential = null;
    if (credential) return credential;
    pending != null ? pending : pending = signInAnonymous(fetchImpl, input.baseUrl).finally(() => {
      pending = null;
    });
    credential = await pending;
    return credential;
  };
  return Object.assign(provider, {
    clear() {
      credential = null;
    }
  });
}
async function signInAnonymous(fetchImpl, baseUrl) {
  var _a, _b;
  const response = await fetchImpl(
    `${baseUrl.replace(/\/+$/, "")}/api/auth/sign-in/anonymous`,
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json"
      },
      body: "{}",
      credentials: "include"
    }
  );
  if (!response.ok) {
    throw new Error(`Aomi guest sign-in failed with HTTP ${response.status}`);
  }
  const token = (_b = (_a = response.headers.get("set-auth-token")) != null ? _a : response.headers.get("x-auth-token")) != null ? _b : response.headers.get("auth-token");
  if (!token) throw new Error("Aomi guest sign-in returned no bearer session");
  return token;
}

// src/client.ts
var SESSION_ID_HEADER = "X-Session-Id";
var THREAD_ID_HEADER = "X-Thread-Id";
var APP_KEY_HEADER = "Aomi-App-Key";
function joinApiPath(baseUrl, path) {
  const normalizedBase = baseUrl === "/" ? "" : baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}` || normalizedPath;
}
function applicationIdParam(id) {
  return (id == null ? void 0 : id.toString().trim()) || void 0;
}
function buildApiUrl(baseUrl, path, query) {
  const url = joinApiPath(baseUrl, path);
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === void 0) continue;
    if (typeof value === "string") {
      params.set(key, value);
    } else {
      for (const item of value) {
        params.append(key, item);
      }
    }
  }
  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
}
function normalizeQuery(query) {
  if (!query) return void 0;
  const normalized = {};
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      normalized[key] = value.map((item) => String(item));
      continue;
    }
    normalized[key] = value === null || value === void 0 ? void 0 : String(value);
  }
  return normalized;
}
function normalizePlatformFilter(platforms) {
  const rawValues = Array.isArray(platforms) ? platforms : platforms === null || platforms === void 0 ? [] : [platforms];
  return Array.from(
    new Set(
      rawValues.flatMap((value) => value.split(",")).map((value) => value.trim()).filter(Boolean)
    )
  );
}
function encodeJsonBody(body) {
  return body === void 0 ? void 0 : JSON.stringify(body);
}
function withSessionHeader(sessionId, init) {
  const headers = new Headers(init);
  headers.set(SESSION_ID_HEADER, sessionId);
  headers.set(THREAD_ID_HEADER, sessionId);
  return headers;
}
function wrapFetchWithAccountBearer(fetchImpl, getAccountBearer) {
  if (!getAccountBearer) return fetchImpl;
  return async (input, init) => {
    var _a, _b;
    const request = input instanceof Request ? input : void 0;
    const path = new URL(String((_a = request == null ? void 0 : request.url) != null ? _a : input), "http://localhost").pathname;
    if (path.startsWith("/v1/agent/") || path.startsWith("/v1/pipeline/")) {
      return fetchImpl(request ? request.clone() : input, init);
    }
    const baseHeaders = new Headers((_b = init == null ? void 0 : init.headers) != null ? _b : request == null ? void 0 : request.headers);
    const fetchWithBearer = async (forceRefresh) => {
      const headers = new Headers(baseHeaders);
      let bearer;
      try {
        bearer = await getAccountBearer({ forceRefresh });
      } catch (error) {
        if (getAccountBearer.required) {
          throw error;
        }
        bearer = void 0;
      }
      if (bearer) {
        headers.set("Authorization", `Bearer ${bearer}`);
      }
      return fetchImpl(request ? request.clone() : input, __spreadProps(__spreadValues({}, init), { headers }));
    };
    const response = await fetchWithBearer(false);
    if (response.status !== 401) return response;
    return fetchWithBearer(true);
  };
}
function wrapFetchWithPublicApiAuthorization(input) {
  if (!input.oauth && !input.guest) return input.fetch;
  return async (requestInput, init) => {
    var _a, _b, _c, _d, _e, _f;
    const request = requestInput instanceof Request ? requestInput : void 0;
    const url = new URL(
      String((_a = request == null ? void 0 : request.url) != null ? _a : requestInput),
      absoluteBase(input.baseUrl)
    );
    const policy = publicApiPolicy(
      url,
      (_c = (_b = init == null ? void 0 : init.method) != null ? _b : request == null ? void 0 : request.method) != null ? _c : "GET",
      (_d = init == null ? void 0 : init.headers) != null ? _d : request == null ? void 0 : request.headers
    );
    if (!policy) return input.fetch(requestInput, init);
    const baseHeaders = new Headers((_e = init == null ? void 0 : init.headers) != null ? _e : request == null ? void 0 : request.headers);
    const attempt = async (forceRefresh, dpopNonce2) => {
      var _a2;
      const headers = new Headers(baseHeaders);
      if (input.oauth) {
        const token = await input.oauth({
          resource: policy.resource,
          scopes: policy.scopes,
          forceRefresh
        });
        if (!token)
          throw new Error(
            "No OAuth grant covers this Aomi resource and scope set"
          );
        const tokenType = (_a2 = token.tokenType) != null ? _a2 : "Bearer";
        headers.set("authorization", `${tokenType} ${token.accessToken}`);
        if (tokenType === "DPoP") {
          if (!token.dpopProof) {
            throw new Error("DPoP token provider returned no proof signer");
          }
          headers.set(
            "dpop",
            await token.dpopProof({
              url: url.toString(),
              method: policy.method,
              accessToken: token.accessToken,
              nonce: dpopNonce2
            })
          );
        }
      } else if (input.guest) {
        headers.set(
          "authorization",
          `Bearer ${await input.guest({ forceRefresh })}`
        );
      }
      return input.fetch(request ? request.clone() : requestInput, __spreadProps(__spreadValues({}, init), {
        headers
      }));
    };
    const response = await attempt(false);
    if (response.status !== 401 && response.status !== 403) return response;
    if (input.guest && response.status === 403) return response;
    const dpopNonce = (_f = response.headers.get("dpop-nonce")) != null ? _f : void 0;
    return attempt(!dpopNonce, dpopNonce);
  };
}
function publicApiPolicy(url, method, headers) {
  const origin = url.origin;
  const payment = new Headers(headers).has("payment-signature") ? ["payments:submit"] : [];
  if (url.pathname.startsWith("/v1/agent/")) {
    const scopes = method === "GET" ? ["agent:read"] : /\/actions\/[^/]+\/result$/.test(url.pathname) ? ["agent:actions:resolve"] : ["agent:write"];
    return {
      resource: `${origin}/v1/agent`,
      scopes: [...scopes, ...payment],
      method: method.toUpperCase()
    };
  }
  if (url.pathname.startsWith("/v1/pipeline/")) {
    return {
      resource: `${origin}/v1/pipeline`,
      scopes: [
        method === "GET" ? "pipeline:catalog" : "pipeline:execute",
        ...payment
      ],
      method: method.toUpperCase()
    };
  }
  return null;
}
function absoluteBase(baseUrl) {
  if (/^https?:\/\//.test(baseUrl)) return baseUrl;
  if (typeof location !== "undefined")
    return new URL(baseUrl, location.origin).toString();
  return "http://localhost";
}
function secretNamesFrom(response) {
  var _a;
  if (response.names) return response.names;
  return Object.values((_a = response.by_app) != null ? _a : {}).flat();
}
var AomiClient = class {
  constructor(options) {
    var _a;
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    const fetchImpl = (_a = options.fetch) != null ? _a : globalThis.fetch.bind(globalThis);
    const rawFetchImpl = typeof globalThis.fetch === "function" ? globalThis.fetch.bind(globalThis) : fetchImpl;
    const guest = options.oauth || options.getAccountBearer || options.guest === false ? void 0 : typeof options.guest === "function" ? options.guest : createGuestSessionProvider({
      baseUrl: this.baseUrl,
      fetch: fetchImpl
    });
    this.fetchImpl = wrapFetchWithAccountBearer(
      wrapFetchWithPublicApiAuthorization({
        fetch: fetchImpl,
        baseUrl: this.baseUrl,
        oauth: options.oauth,
        guest
      }),
      options.getAccountBearer
    );
    this.rawFetchImpl = wrapFetchWithAccountBearer(
      wrapFetchWithPublicApiAuthorization({
        fetch: rawFetchImpl,
        baseUrl: this.baseUrl,
        oauth: options.oauth,
        guest
      }),
      options.getAccountBearer
    );
    this.logger = options.logger;
    this.agent = new AgentTransport(
      (method, path, requestOptions) => this.requestResponse(method, path, requestOptions)
    );
    this.pipeline = new PipelineTransport(
      (method, path, requestOptions) => this.requestResponse(method, path, requestOptions)
    );
  }
  // ===========================================================================
  // Transport
  // ===========================================================================
  /**
   * Low-level request escape hatch for the full backend route manifest.
   * Prefer the typed helpers below for common chat/session/account flows.
   */
  async request(method, path, options) {
    var _a;
    const response = await this.requestResponse(method, path, options);
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `HTTP ${response.status}: ${response.statusText}${body ? `
${body}` : ""}`
      );
    }
    if (response.status === 204) return void 0;
    const contentType = (_a = response.headers.get("content-type")) != null ? _a : "";
    return contentType.includes("application/json") ? await response.json() : await response.text();
  }
  /** Raw authenticated response transport shared by JSON, SSE, and MCP clients. */
  async requestResponse(method, path, options) {
    var _a;
    const url = buildApiUrl(this.baseUrl, path, normalizeQuery(options == null ? void 0 : options.query));
    const headers = new Headers(options == null ? void 0 : options.headers);
    if (options == null ? void 0 : options.sessionId) {
      headers.set(SESSION_ID_HEADER, options.sessionId);
      headers.set(THREAD_ID_HEADER, options.sessionId);
    }
    const apiKey = (_a = options == null ? void 0 : options.apiKey) != null ? _a : this.apiKey;
    if (apiKey) {
      headers.set(APP_KEY_HEADER, apiKey);
    }
    if ((options == null ? void 0 : options.body) !== void 0 && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    const response = await ((options == null ? void 0 : options.raw) ? this.rawFetchImpl : this.fetchImpl)(
      url,
      {
        method,
        headers,
        body: encodeJsonBody(options == null ? void 0 : options.body)
      }
    );
    return response;
  }
  // ===========================================================================
  // Secrets
  // ===========================================================================
  /**
   * Ingest client-scoped secrets. Returns opaque `$SECRET:<name>` handles.
   *
   * There is no app scope. A hosted app's Environment belongs to its Builder
   * and is configured in Aomi Build; a per-user copy of it was a second,
   * process-local store that answered the same handle differently depending on
   * which fleet host served the turn. The backend answers 410 to any request
   * that still carries one.
   */
  async ingestSecrets(sessionId, clientId, secrets) {
    const url = joinApiPath(this.baseUrl, "/api/secrets");
    const body = {
      client_id: clientId,
      secrets
    };
    const response = await this.fetchImpl(url, {
      method: "POST",
      headers: withSessionHeader(sessionId, {
        "Content-Type": "application/json"
      }),
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  }
  /** Clear every client-scoped secret and unbind the session. */
  async clearSecrets(sessionId, clientId) {
    const url = buildApiUrl(this.baseUrl, "/api/secrets", {
      client_id: clientId
    });
    const response = await this.fetchImpl(url, {
      method: "DELETE",
      headers: withSessionHeader(sessionId)
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  }
  /** Remove a single named client-scoped secret. */
  async deleteSecret(sessionId, clientId, name) {
    const params = { client_id: clientId };
    const url = buildApiUrl(
      this.baseUrl,
      `/api/secrets/${encodeURIComponent(name)}`,
      params
    );
    const response = await this.fetchImpl(url, {
      method: "DELETE",
      headers: withSessionHeader(sessionId)
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  }
  /**
   * List the stored secret NAMES for this client — never values.
   *
   * Read the result with {@link secretNamesFrom}, which tolerates the
   * pre-cutover `by_app` shape as well as the flat `names` list.
   */
  async listSecrets(sessionId, clientId) {
    const url = clientId && clientId.trim().length > 0 ? buildApiUrl(this.baseUrl, "/api/secrets", { client_id: clientId }) : joinApiPath(this.baseUrl, "/api/secrets");
    const response = await this.fetchImpl(url, {
      method: "GET",
      headers: withSessionHeader(sessionId)
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  }
  // ===========================================================================
  // Control API
  // ===========================================================================
  /**
   * Get available apps as full descriptors (name + declared secret slots).
   * The settings page consumes the slot info to render per-app inputs and
   * the chat shell uses it to gate app load when required slots are unfilled.
   */
  async getApps(sessionId, options) {
    var _a;
    const platforms = normalizePlatformFilter(options == null ? void 0 : options.platforms);
    const url = buildApiUrl(this.baseUrl, "/api/thread/apps", {
      platform: platforms.length > 0 ? platforms : void 0,
      application_id: applicationIdParam(options == null ? void 0 : options.applicationId)
    });
    const apiKey = (_a = options == null ? void 0 : options.apiKey) != null ? _a : this.apiKey;
    const headers = new Headers(withSessionHeader(sessionId));
    if (apiKey) {
      headers.set(APP_KEY_HEADER, apiKey);
    }
    const response = await this.rawFetchImpl(url, { headers });
    if (!response.ok) {
      throw new Error(`Failed to get apps: HTTP ${response.status}`);
    }
    const data = await response.json();
    if (!Array.isArray(data)) return [];
    return data.map((item) => normalizeAppDescriptor(item)).filter((item) => item !== null);
  }
  /**
   * Fetch the account bound to the authenticated request (resolved from the
   * account bearer). Returns `null` when the session is not bound to a real
   * user — the backend answers `/api/account` with HTTP 400 for
   * anonymous sessions, which is the normal "no bearer / not logged in" case
   * rather than an error.
   */
  async fetchAccountProfile(sessionId) {
    const url = buildApiUrl(this.baseUrl, "/api/account");
    const response = await this.rawFetchImpl(url, {
      headers: withSessionHeader(sessionId)
    });
    if (response.status === 400 || response.status === 401 || response.status === 403) {
      return null;
    }
    if (!response.ok) {
      throw new Error(
        `Failed to fetch account profile: HTTP ${response.status}`
      );
    }
    return await response.json();
  }
  /**
   * Fetch the full account for the authenticated request. Throws on any
   * non-OK response; use `fetchAccountProfile` for the null-on-anonymous
   * variant.
   */
  async getAccount(sessionId) {
    const url = buildApiUrl(this.baseUrl, "/api/account");
    const response = await this.fetchImpl(url, {
      headers: withSessionHeader(sessionId)
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch account: HTTP ${response.status}`);
    }
    return await response.json();
  }
  async createAccountApproval(request) {
    return this.request("POST", "/api/account/approvals", {
      body: request,
      raw: true
    });
  }
  /**
   * Mint a Privy browser auth URL bound to the current backend session.
   */
  async beginPrivyAuth(sessionId, options) {
    var _a;
    const url = buildApiUrl(this.baseUrl, "/api/auth/privy/begin");
    const response = await this.rawFetchImpl(url, {
      method: "POST",
      headers: withSessionHeader(sessionId, {
        "Content-Type": "application/json"
      }),
      body: JSON.stringify({
        application: options == null ? void 0 : options.application,
        purpose: (_a = options == null ? void 0 : options.purpose) != null ? _a : "link_wallet",
        wallet_family: (options == null ? void 0 : options.walletFamily) === "evm" ? void 0 : options == null ? void 0 : options.walletFamily
      })
    });
    if (!response.ok) {
      throw new Error(`Failed to begin Privy auth: HTTP ${response.status}`);
    }
    return await response.json();
  }
  /**
   * Start Privy's separate one-time delegated-signer consent. This is not a
   * wallet-link operation and callers should label it as enabling Auto.
   */
  async beginPrivyDelegation(sessionId, options) {
    return this.beginPrivyAuth(sessionId, __spreadProps(__spreadValues({}, options), {
      purpose: "delegate_signing"
    }));
  }
  /**
   * Get available models.
   */
  async getModels(sessionId, options) {
    var _a;
    const url = buildApiUrl(this.baseUrl, "/api/thread/models", {
      application_id: applicationIdParam(options == null ? void 0 : options.applicationId)
    });
    const apiKey = (_a = options == null ? void 0 : options.apiKey) != null ? _a : this.apiKey;
    const headers = new Headers(withSessionHeader(sessionId));
    if (apiKey) {
      headers.set(APP_KEY_HEADER, apiKey);
    }
    const response = await this.rawFetchImpl(url, {
      headers
    });
    if (!response.ok) {
      throw new Error(`Failed to get models: HTTP ${response.status}`);
    }
    return await response.json();
  }
  /**
   * Set the model for a session.
   */
  async setModel(sessionId, rig, options) {
    var _a;
    const apiKey = (_a = options == null ? void 0 : options.apiKey) != null ? _a : this.apiKey;
    const url = buildApiUrl(this.baseUrl, "/api/thread/model", {
      rig,
      app: options == null ? void 0 : options.app,
      application_id: applicationIdParam(options == null ? void 0 : options.applicationId),
      client_id: options == null ? void 0 : options.clientId
    });
    const headers = new Headers(withSessionHeader(sessionId));
    if (apiKey) {
      headers.set(APP_KEY_HEADER, apiKey);
    }
    const response = await this.fetchImpl(url, {
      method: "POST",
      headers
    });
    if (!response.ok) {
      throw new Error(`Failed to set model: HTTP ${response.status}`);
    }
    return await response.json();
  }
  /**
   * List BYOK keys (one per LLM provider) bound to the current account.
   */
  async listByokKeys(sessionId) {
    var _a;
    const url = buildApiUrl(this.baseUrl, "/api/account/payment");
    const response = await this.fetchImpl(url, {
      headers: withSessionHeader(sessionId)
    });
    if (!response.ok) {
      throw new Error(`Failed to get BYOK keys: HTTP ${response.status}`);
    }
    const data = await response.json();
    return (_a = data.byok) != null ? _a : [];
  }
  /**
   * Save or replace a BYOK key for the current account.
   */
  async saveByokKey(sessionId, provider, byokKey, label) {
    const url = joinApiPath(this.baseUrl, "/api/account/payment/byok");
    const response = await this.fetchImpl(url, {
      method: "POST",
      headers: withSessionHeader(sessionId, {
        "Content-Type": "application/json"
      }),
      body: JSON.stringify({
        provider,
        byok_key: byokKey,
        label
      })
    });
    if (!response.ok) {
      throw new Error(`Failed to save BYOK key: HTTP ${response.status}`);
    }
    const data = await response.json();
    return data.key;
  }
  /**
   * Delete a BYOK key for the current account.
   */
  async deleteByokKey(sessionId, provider) {
    const url = buildApiUrl(
      this.baseUrl,
      `/api/account/payment/byok/${encodeURIComponent(provider)}`
    );
    const response = await this.fetchImpl(url, {
      method: "DELETE",
      headers: withSessionHeader(sessionId)
    });
    if (!response.ok) {
      throw new Error(`Failed to delete BYOK key: HTTP ${response.status}`);
    }
    const data = await response.json();
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
  async simulateBatch(sessionId, transactions, options) {
    const url = joinApiPath(this.baseUrl, "/api/exec/simulate");
    const headers = new Headers(
      withSessionHeader(sessionId, { "Content-Type": "application/json" })
    );
    if (this.apiKey) {
      headers.set(APP_KEY_HEADER, this.apiKey);
    }
    const normalizedTransactions = transactions.map((transaction) => {
      var _a, _b;
      return {
        to: transaction.to,
        value: transaction.value,
        data: transaction.data,
        label: transaction.label,
        chain_id: (_b = (_a = transaction.chain_id) != null ? _a : transaction.chainId) != null ? _b : options == null ? void 0 : options.chainId
      };
    });
    const payload = {
      transactions: normalizedTransactions,
      from: options == null ? void 0 : options.from,
      chain_id: options == null ? void 0 : options.chainId
    };
    const response = await this.fetchImpl(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `HTTP ${response.status}: ${response.statusText}${body ? `
${body}` : ""}`
      );
    }
    return await response.json();
  }
};

// src/authorization.ts
function createOAuthTokenProvider(input) {
  var _a, _b;
  let current = (_a = input.initial) != null ? _a : null;
  let pending = null;
  const now = (_b = input.now) != null ? _b : Date.now;
  const provider = async (request) => {
    const matches = (current == null ? void 0 : current.resource) === request.resource && request.scopes.every((scope) => current == null ? void 0 : current.scopes.includes(scope));
    if (current && matches && !request.forceRefresh && current.expiresAt > now() + 3e4) {
      return current;
    }
    if (!current || !matches) return null;
    pending != null ? pending : pending = input.refresh(current, request).finally(() => {
      pending = null;
    });
    current = await pending;
    return current;
  };
  return Object.assign(provider, {
    clear() {
      current = null;
    },
    current: () => current
  });
}
function posterFromClient(client) {
  return (path, body) => client.request("POST", path, { body, raw: true });
}
function authorizationChallenge(post, request) {
  return post("/api/account/authorization/challenge", request);
}
function authorizationCommit(post, request) {
  return post("/api/account/authorization/commit", request);
}
async function ensureSvmWalletBoundVia(post, wallet, signMessage) {
  let challenge;
  try {
    challenge = await authorizationChallenge(post, {
      chain_type: "svm",
      wallet,
      mode: "bind"
    });
  } catch (error) {
    if (isAlreadyBound(error)) return { status: "already_bound" };
    throw error;
  }
  if (!challenge.message_base64) {
    throw new Error("bind challenge returned no svm message payload");
  }
  const signature = await signMessage(base64ToBytes(challenge.message_base64));
  try {
    return {
      status: "bound",
      state: await authorizationCommit(post, {
        permit: challenge.permit,
        signature: bytesToBase64(signature)
      })
    };
  } catch (error) {
    if (isAlreadyBound(error)) return { status: "already_bound" };
    throw error;
  }
}
function ensureSvmWalletBound(client, wallet, signMessage) {
  return ensureSvmWalletBoundVia(posterFromClient(client), wallet, signMessage);
}
function isUnboundWalletError(error) {
  const text = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return text.includes("signing_unbound_wallet");
}
function isAlreadyBound(error) {
  return error instanceof Error && error.message.includes("already_bound");
}
function base64ToBytes(value) {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(value, "base64"));
  }
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}
function bytesToBase64(bytes) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  return btoa(String.fromCharCode(...bytes));
}

// src/internal/url.ts
function joinUrl(baseUrl, path) {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

// src/internal/encoding.ts
function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  if (typeof globalThis.atob === "function") {
    return globalThis.atob(normalized);
  }
  const BufferCtor = globalThis.Buffer;
  if (BufferCtor) {
    return BufferCtor.from(normalized, "base64").toString("utf8");
  }
  throw new Error("No base64 decoder is available");
}
function decodeJwtSubject(token) {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const subject = JSON.parse(decodeBase64Url(payload)).sub;
    return typeof subject === "string" && subject.trim() ? subject.trim() : null;
  } catch (e) {
    return null;
  }
}

// src/account-session.ts
var AccountCredentialUnavailableError = class extends Error {
  constructor(message = "Account credential is not available yet") {
    super(message);
    this.name = "AccountCredentialUnavailableError";
  }
};
var DEFAULT_REFRESH_BEFORE_EXPIRY_MS = 2 * 60 * 1e3;
var FAILURE_COOLDOWN_MS = 30 * 1e3;
var CREDENTIAL_UNAVAILABLE_RETRY_DELAYS_MS = [250, 1e3, 3e3];
var EXPIRES_AT_MILLISECONDS_THRESHOLD = 1e11;
var DEFAULT_BETTER_AUTH_TOKEN_PATH = "/api/aomi/account-bearer";
var DEFAULT_BETTER_AUTH_PROVIDER_EXCHANGE_PATH = "/api/auth/aomi/provider/exchange";
function createAccountBearerProvider({
  baseUrl,
  getProviderCredential,
  betterAuthToken,
  fetch: fetchImpl = fetch,
  now = Date.now,
  refreshBeforeExpiryMs = DEFAULT_REFRESH_BEFORE_EXPIRY_MS
}) {
  let cached = null;
  let pending = null;
  let refreshTimer = null;
  let failedAt = null;
  let credentialUnavailableRetryAfter = 0;
  let credentialUnavailableRetryCount = 0;
  const listeners = /* @__PURE__ */ new Set();
  const scheduleRefresh = (session) => {
    if (refreshTimer) clearTimeout(refreshTimer);
    const refreshAt = session.expires_at * 1e3 - refreshBeforeExpiryMs;
    refreshTimer = setTimeout(
      () => {
        void getAccountBearer({ forceRefresh: true }).catch(() => void 0);
      },
      Math.max(refreshAt - now(), 1e3)
    );
  };
  const fetchBetterAuthToken = async () => {
    var _a;
    const response = await fetchImpl(
      joinUrl(
        (_a = betterAuthToken == null ? void 0 : betterAuthToken.baseUrl) != null ? _a : baseUrl,
        DEFAULT_BETTER_AUTH_TOKEN_PATH
      ),
      {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" }
      }
    );
    if (!response.ok) return null;
    const body = await response.json();
    return normalizeBetterAuthTokenResponse(body);
  };
  const exchangeBetterAuthProviderCredential = async () => {
    var _a;
    if ((betterAuthToken == null ? void 0 : betterAuthToken.providerExchange) === false || !getProviderCredential) {
      return null;
    }
    const credential = await getProviderCredential();
    const response = await fetchImpl(
      joinUrl(
        (_a = betterAuthToken == null ? void 0 : betterAuthToken.baseUrl) != null ? _a : baseUrl,
        DEFAULT_BETTER_AUTH_PROVIDER_EXCHANGE_PATH
      ),
      {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(credential)
      }
    );
    if (!response.ok) return null;
    return fetchBetterAuthToken();
  };
  const exchange = async () => {
    const betterAuthJwt = await fetchBetterAuthToken();
    if (betterAuthJwt) return betterAuthJwt;
    const exchangedBetterAuthJwt = await exchangeBetterAuthProviderCredential();
    if (exchangedBetterAuthJwt) return exchangedBetterAuthJwt;
    throw new Error("Failed to exchange Better Auth provider credential");
  };
  const getAccountBearer = async ({
    forceRefresh = false
  } = {}) => {
    var _a;
    const refreshAt = cached ? cached.expires_at * 1e3 - refreshBeforeExpiryMs : 0;
    if (!forceRefresh && cached && now() < refreshAt) {
      return cached.access_token;
    }
    if (failedAt !== null && now() - failedAt < FAILURE_COOLDOWN_MS && !forceRefresh) {
      return void 0;
    }
    if (!forceRefresh && now() < credentialUnavailableRetryAfter) {
      return void 0;
    }
    if (!pending) {
      pending = exchange().then((next) => {
        failedAt = null;
        credentialUnavailableRetryAfter = 0;
        credentialUnavailableRetryCount = 0;
        const previous = cached;
        cached = next;
        scheduleRefresh(next);
        if (previous && (previous.access_token !== next.access_token || previous.expires_at !== next.expires_at)) {
          for (const listener of listeners) listener();
        }
        return next;
      }).catch((error) => {
        if (error instanceof AccountCredentialUnavailableError) {
          const retryDelay = CREDENTIAL_UNAVAILABLE_RETRY_DELAYS_MS[credentialUnavailableRetryCount];
          if (retryDelay === void 0) {
            failedAt = now();
            credentialUnavailableRetryAfter = 0;
          } else {
            credentialUnavailableRetryCount += 1;
            credentialUnavailableRetryAfter = now() + retryDelay;
          }
        } else {
          failedAt = now();
          credentialUnavailableRetryAfter = 0;
          credentialUnavailableRetryCount = 0;
        }
        return null;
      }).finally(() => {
        pending = null;
      });
    }
    return (_a = await pending) == null ? void 0 : _a.access_token;
  };
  getAccountBearer.subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  getAccountBearer.dispose = () => {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = null;
    listeners.clear();
  };
  return getAccountBearer;
}
function normalizeBetterAuthTokenResponse(response) {
  var _a, _b;
  const token = typeof response.bearer === "string" && response.bearer ? response.bearer : "";
  if (!token) {
    throw new Error("Better Auth token response is missing token");
  }
  let payload = null;
  const getPayload = () => {
    payload != null ? payload : payload = decodeJwtPayload(token);
    return payload;
  };
  const expiresAt = Number(
    (_b = (_a = response.expires_at) != null ? _a : response.expiresAt) != null ? _b : getPayload().exp
  );
  if (!Number.isFinite(expiresAt) || expiresAt <= 0) {
    throw new Error("Better Auth token is missing a valid exp claim");
  }
  if (expiresAt > EXPIRES_AT_MILLISECONDS_THRESHOLD) {
    throw new Error("Better Auth token expires_at must be seconds, not ms");
  }
  const getPayloadUserId = () => {
    const claims = getPayload();
    if (typeof claims.aomi_user_id === "string" && claims.aomi_user_id) {
      return claims.aomi_user_id;
    }
    return typeof claims.sub === "string" ? claims.sub : "";
  };
  const userId = typeof response.user_id === "string" && response.user_id ? response.user_id : typeof response.userId === "string" && response.userId ? response.userId : getPayloadUserId();
  if (!userId) {
    throw new Error("Better Auth token is missing a user id claim");
  }
  return {
    access_token: token,
    token_type: "Bearer",
    expires_at: expiresAt,
    user_id: userId
  };
}
function decodeJwtPayload(token) {
  const [, payload] = token.split(".");
  if (!payload) throw new Error("Better Auth token is not a JWT");
  return JSON.parse(decodeBase64Url(payload));
}

// src/siws.ts
function buildSiwsMessage(input) {
  var _a;
  const statement = input.intent === "link" ? "Only sign this message if you want this Solana wallet attached to the current Aomi account." : "Sign in to Aomi.";
  return `${input.domain} wants you to sign in with your Solana account:
${input.address}

${statement}

URI: ${input.uri}
Version: 1
Chain ID: ${input.chainId}
Nonce: ${input.nonce}
Issued At: ${((_a = input.issuedAt) != null ? _a : /* @__PURE__ */ new Date()).toISOString()}`;
}

// src/payment.ts
import { wrapFetchWithPayment } from "@x402/fetch";
var MAX_PAYMENT_CHALLENGES = 4;
function paymentResponseHeader(response) {
  var _a;
  return (_a = response.headers.get("payment-response")) != null ? _a : response.headers.get("x-payment-response");
}
function withInitialResponse(initialResponse, fetchImpl) {
  let pendingResponse = initialResponse;
  return (input, init) => {
    if (pendingResponse) {
      const response = pendingResponse;
      pendingResponse = void 0;
      return Promise.resolve(response);
    }
    return fetchImpl(input, init);
  };
}
async function handlePaymentChallenges(request, initialResponse, fetchImpl, client) {
  let response = initialResponse;
  let attempts = 0;
  while (response.status === 402) {
    if (attempts > 0 && paymentResponseHeader(response) === null) {
      return response;
    }
    if (attempts === MAX_PAYMENT_CHALLENGES) {
      throw new Error(
        `Exceeded ${MAX_PAYMENT_CHALLENGES} sequential x402 payment challenges`
      );
    }
    response = await wrapFetchWithPayment(
      withInitialResponse(response, fetchImpl),
      client
    )(request.clone());
    attempts += 1;
  }
  return response;
}
function wrapFetchWithPaymentChallenges(fetchImpl, client) {
  return async (input, init) => {
    const request = new Request(input, init);
    const response = await fetchImpl(request.clone());
    return handlePaymentChallenges(request, response, fetchImpl, client);
  };
}

// src/widget-session.ts
import { getAddress } from "viem";
import { createSiweMessage } from "viem/siwe";
var EXPIRES_AT_MILLISECONDS_THRESHOLD2 = 1e11;
var MAX_WIDGET_CHALLENGE_LIFETIME_MS = 10 * 60 * 1e3;
var MAX_WIDGET_CHALLENGE_CLOCK_SKEW_MS = 60 * 1e3;
function createProviderCredentialAdapter(input) {
  let inferredFingerprint = null;
  let stagedCredential = null;
  return {
    getFingerprint: async () => {
      const subject = input.getSubject();
      if (subject) return `${input.provider}:${subject}`;
      if (inferredFingerprint) return inferredFingerprint;
      const credential = await input.getCredential();
      if (!credential || credential.provider !== input.provider) return null;
      stagedCredential = credential;
      const tokenSubject = decodeJwtSubject(credential.providerToken);
      inferredFingerprint = tokenSubject ? `${input.provider}:${tokenSubject}` : `${input.provider}:authenticated-session`;
      return inferredFingerprint;
    },
    exchange: async ({ baseUrl, fetch: fetchImpl }) => {
      const credential = stagedCredential != null ? stagedCredential : await input.getCredential();
      stagedCredential = null;
      if (!credential || credential.provider !== input.provider) {
        throw new Error("Widget provider credential is unavailable");
      }
      return exchangeJson(
        fetchImpl,
        joinUrl(baseUrl, "/api/widget/auth/exchange"),
        {
          provider: input.provider,
          environment: input.environment,
          provider_token: credential.providerToken,
          key_id: credential.keyId
        }
      );
    },
    signOut: async () => {
      var _a;
      inferredFingerprint = null;
      stagedCredential = null;
      await ((_a = input.signOut) == null ? void 0 : _a.call(input));
    }
  };
}
function createSignedChallengeAdapter(config) {
  return {
    getFingerprint: async () => config.getFingerprint(config.normalizeSigner(await config.getSigner())),
    exchange: async ({ baseUrl, fetch: fetchImpl }) => {
      const signer = config.normalizeSigner(await config.getSigner());
      const challenge = await challengeJson(
        fetchImpl,
        joinUrl(baseUrl, config.noncePath),
        { wallet_address: signer.address, chain_id: signer.chainId }
      );
      assertChallengeBinding(challenge);
      const message = config.buildMessage({ signer, challenge });
      const signature = await signer.signMessage(message);
      return exchangeJson(fetchImpl, joinUrl(baseUrl, config.verifyPath), {
        message,
        signature,
        wallet_address: signer.address,
        chain_id: signer.chainId
      });
    }
  };
}
function createSiweWidgetAuthAdapter(input) {
  return createSignedChallengeAdapter({
    noncePath: "/api/widget/auth/siwe/nonce",
    verifyPath: "/api/widget/auth/siwe/verify",
    getSigner: input.getSigner,
    normalizeSigner: normalizeSiweSigner,
    getFingerprint: (signer) => `${signer.chainId}:${signer.address.toLowerCase()}`,
    buildMessage: ({ signer, challenge }) => createSiweMessage({
      address: signer.address,
      chainId: signer.chainId,
      domain: challenge.domain,
      uri: challenge.uri,
      version: "1",
      nonce: challenge.nonce,
      issuedAt: new Date(challenge.issuedAt),
      expirationTime: new Date(challenge.expirationTime),
      // Kept identical to the SIWS statement (buildSiwsMessage). The SIWS
      // server verifier requires exactly "Sign in to Aomi."; the SIWE
      // verifier does not check statement text, so aligning is safe.
      statement: "Sign in to Aomi."
    })
  });
}
function createSiwsWidgetAuthAdapter(input) {
  return createSignedChallengeAdapter({
    noncePath: "/api/widget/auth/siws/nonce",
    verifyPath: "/api/widget/auth/siws/verify",
    getSigner: input.getSigner,
    normalizeSigner: (signer) => signer,
    getFingerprint: (signer) => `${signer.chainId}:${signer.address}`,
    buildMessage: ({ signer, challenge }) => buildSiwsMessage({
      address: signer.address,
      chainId: signer.chainId,
      nonce: challenge.nonce,
      intent: "sign-in",
      domain: challenge.domain,
      uri: challenge.uri,
      issuedAt: new Date(challenge.issuedAt)
    })
  });
}
function createWidgetSessionProvider(input) {
  var _a, _b, _c;
  const { adapter } = input;
  const fetchImpl = (_a = input.fetch) != null ? _a : fetch;
  const now = (_b = input.now) != null ? _b : Date.now;
  const refreshBeforeExpiryMs = (_c = input.refreshBeforeExpiryMs) != null ? _c : 6e4;
  let cached = null;
  let pending = null;
  let disposed = false;
  let epoch = 0;
  let latestFingerprint = null;
  let nextFingerprintRequestId = 0;
  let latestResolvedFingerprint = null;
  let lastForcedAccessToken = null;
  const listeners = /* @__PURE__ */ new Set();
  const notify = () => {
    for (const listener of listeners) listener();
  };
  const revokeSession = async (session) => {
    await fetchImpl(joinUrl(input.baseUrl, "/api/widget/auth/session"), {
      method: "DELETE",
      credentials: "omit",
      headers: { Authorization: `Bearer ${session.accessToken}` }
    }).catch(() => void 0);
  };
  const base2 = async ({ forceRefresh = false } = {}) => {
    if (disposed) {
      throw new Error("Widget session provider has been disposed");
    }
    const startEpoch = epoch;
    const fingerprintRequestId = ++nextFingerprintRequestId;
    const fingerprint = await adapter.getFingerprint();
    if (!fingerprint) throw new Error("Widget auth identity is unavailable");
    if (disposed || epoch !== startEpoch) {
      throw new Error("Widget session request was superseded");
    }
    if (latestResolvedFingerprint && latestResolvedFingerprint.requestId > fingerprintRequestId && latestResolvedFingerprint.fingerprint !== fingerprint) {
      throw new Error("Widget session request was superseded");
    }
    if (!latestResolvedFingerprint || fingerprintRequestId > latestResolvedFingerprint.requestId) {
      latestResolvedFingerprint = {
        requestId: fingerprintRequestId,
        fingerprint
      };
    }
    latestFingerprint = fingerprint;
    if ((pending == null ? void 0 : pending.fingerprint) === fingerprint) {
      return (await pending.promise).accessToken;
    }
    const refreshAt = cached ? cached.expiresAt * 1e3 - refreshBeforeExpiryMs : 0;
    if (forceRefresh && (cached == null ? void 0 : cached.fingerprint) === fingerprint && cached.accessToken === lastForcedAccessToken && now() < refreshAt) {
      return cached.accessToken;
    }
    if (!forceRefresh && (cached == null ? void 0 : cached.fingerprint) === fingerprint && now() < refreshAt) {
      return cached.accessToken;
    }
    const stale = cached;
    const retainStaleDuringForcedExchange = Boolean(
      forceRefresh && (stale == null ? void 0 : stale.fingerprint) === fingerprint && now() < refreshAt
    );
    if (retainStaleDuringForcedExchange && stale) {
      lastForcedAccessToken = stale.accessToken;
    } else if (stale) {
      cached = null;
      void revokeSession(stale);
    }
    if (!pending || pending.fingerprint !== fingerprint) {
      let clearPending2 = function() {
        if ((pending == null ? void 0 : pending.promise) === promise) pending = null;
      };
      var clearPending = clearPending2;
      const forcedExchange = forceRefresh;
      const promise = adapter.exchange({ baseUrl: input.baseUrl, fetch: fetchImpl }).then(async (session) => {
        const isCurrent = !disposed && epoch === startEpoch && fingerprint === latestFingerprint;
        if (!isCurrent) {
          await revokeSession(session);
          throw new Error("Widget session exchange was superseded");
        }
        cached = __spreadProps(__spreadValues({}, session), { fingerprint });
        lastForcedAccessToken = forcedExchange ? session.accessToken : null;
        if (retainStaleDuringForcedExchange && stale) {
          void revokeSession(stale);
        }
        notify();
        return session;
      });
      pending = { fingerprint, promise };
      void promise.then(clearPending2, clearPending2);
    }
    return (await pending.promise).accessToken;
  };
  const revoke = async () => {
    const session = cached;
    epoch += 1;
    cached = null;
    pending = null;
    latestResolvedFingerprint = null;
    lastForcedAccessToken = null;
    notify();
    if (session) await revokeSession(session);
  };
  const provider = Object.assign(base2, {
    required: true,
    revoke,
    signOut: async () => {
      var _a2;
      await revoke();
      await ((_a2 = adapter.signOut) == null ? void 0 : _a2.call(adapter));
    },
    dispose: () => {
      disposed = true;
      epoch += 1;
      cached = null;
      pending = null;
      latestResolvedFingerprint = null;
      lastForcedAccessToken = null;
      notify();
      listeners.clear();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }
  });
  return provider;
}
var WidgetChallengeBindingError = class extends Error {
  constructor(message) {
    super(`Widget challenge rejected before signing: ${message}`);
    this.name = "WidgetChallengeBindingError";
  }
};
function assertChallengeBinding(challenge) {
  var _a, _b;
  if (!((_a = challenge.nonce) == null ? void 0 : _a.trim())) {
    throw new WidgetChallengeBindingError("challenge has no nonce");
  }
  const now = Date.now();
  const issued = Date.parse(challenge.issuedAt);
  if (Number.isNaN(issued)) {
    throw new WidgetChallengeBindingError(
      "challenge has no parseable issuedAt"
    );
  }
  if (issued > now + MAX_WIDGET_CHALLENGE_CLOCK_SKEW_MS) {
    throw new WidgetChallengeBindingError("challenge was issued in the future");
  }
  const expires = Date.parse(challenge.expirationTime);
  if (Number.isNaN(expires)) {
    throw new WidgetChallengeBindingError(
      "challenge has no parseable expirationTime"
    );
  }
  if (expires <= now) {
    throw new WidgetChallengeBindingError("challenge is already expired");
  }
  if (expires <= issued || expires - issued > MAX_WIDGET_CHALLENGE_LIFETIME_MS) {
    throw new WidgetChallengeBindingError(
      "challenge validity window is not bounded"
    );
  }
  const pageOrigin = typeof window !== "undefined" && ((_b = window.location) == null ? void 0 : _b.origin) ? window.location.origin : null;
  if (!pageOrigin) return;
  if (challenge.uri !== pageOrigin) {
    throw new WidgetChallengeBindingError(
      `challenge uri "${challenge.uri}" is not this page's origin "${pageOrigin}"`
    );
  }
  const pageHost = new URL(pageOrigin).host;
  if (challenge.domain !== pageHost) {
    throw new WidgetChallengeBindingError(
      `challenge domain "${challenge.domain}" is not this page's host "${pageHost}"`
    );
  }
}
async function challengeJson(fetchImpl, url, body) {
  const response = await fetchImpl(url, requestInit(body));
  if (!response.ok)
    throw new Error(`Widget challenge failed: ${response.status}`);
  const value = await response.json();
  for (const key of [
    "nonce",
    "domain",
    "uri",
    "issued_at",
    "expiration_time"
  ]) {
    if (typeof value[key] !== "string")
      throw new Error("Widget challenge is invalid");
  }
  return {
    nonce: value.nonce,
    domain: value.domain,
    uri: value.uri,
    issuedAt: value.issued_at,
    expirationTime: value.expiration_time
  };
}
async function exchangeJson(fetchImpl, url, body) {
  const response = await fetchImpl(url, requestInit(body));
  if (!response.ok)
    throw new Error(`Widget auth exchange failed: ${response.status}`);
  const value = await response.json();
  if (typeof value.access_token !== "string" || typeof value.expires_at !== "number") {
    throw new Error("Widget session response is invalid");
  }
  if (value.expires_at > EXPIRES_AT_MILLISECONDS_THRESHOLD2) {
    throw new Error("Widget session expires_at must be seconds, not ms");
  }
  return { accessToken: value.access_token, expiresAt: value.expires_at };
}
function requestInit(body) {
  return {
    method: "POST",
    credentials: "omit",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body)
  };
}
function normalizeSiweSigner(signer) {
  if (!Number.isInteger(signer.chainId) || signer.chainId <= 0) {
    throw new Error("Widget SIWE signer has no valid chain id");
  }
  return __spreadProps(__spreadValues({}, signer), { address: getAddress(signer.address) });
}

// src/internal/env.ts
function safeEnv(read) {
  try {
    return read();
  } catch (e) {
    return void 0;
  }
}

// src/user-state/normalize.ts
function asObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return void 0;
  }
  return value;
}
function asEvmObject(value) {
  return Array.isArray(value) ? asObject(value[0]) : asObject(value);
}
function pick(record, ...keys) {
  if (!record) {
    return void 0;
  }
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key) && record[key] !== void 0) {
      return record[key];
    }
  }
  return void 0;
}
function assignDefined(target, key, value) {
  if (value !== void 0) {
    target[key] = value;
  }
}
function renameKey(obj, from, to) {
  if (from === to) return;
  if (Object.prototype.hasOwnProperty.call(obj, from)) {
    if (!(to in obj) || obj[to] === void 0) {
      obj[to] = obj[from];
    }
    delete obj[from];
  }
}
function liftFlat(obj, flat, to, fromKeys) {
  if (to in obj && obj[to] !== void 0) return;
  const value = pick(flat, ...fromKeys);
  if (value !== void 0) {
    obj[to] = value;
  }
}
var OPAQUE_PENDING_KEYS = /* @__PURE__ */ new Set(["typed_data", "typedData", "domain"]);
function camelToSnake(key) {
  return key.replace(/([A-Z])/g, "_$1").toLowerCase();
}
function snakeizePendingValue(value) {
  if (Array.isArray(value)) {
    return value.map(snakeizePendingValue);
  }
  const obj = asObject(value);
  if (!obj) return value;
  const out = {};
  for (const [key, val] of Object.entries(obj)) {
    const snake = camelToSnake(key);
    out[snake] = OPAQUE_PENDING_KEYS.has(key) || OPAQUE_PENDING_KEYS.has(snake) ? val : snakeizePendingValue(val);
  }
  return out;
}
function snakeizeBucket(bucket) {
  const obj = asObject(bucket);
  if (!obj) return void 0;
  const out = {};
  for (const [id, value] of Object.entries(obj)) {
    out[id] = snakeizePendingValue(value);
  }
  return out;
}
function buildConnection(src, flat) {
  const c = __spreadValues({}, src != null ? src : {});
  renameKey(c, "isConnected", "is_connected");
  renameKey(c, "providerLabel", "provider_label");
  renameKey(c, "walletProviderSubject", "wallet_provider_subject");
  renameKey(c, "authMethod", "auth_method");
  renameKey(c, "authValue", "auth_value");
  renameKey(c, "authVerifiedAt", "auth_verified_at");
  liftFlat(c, flat, "is_connected", ["is_connected", "isConnected"]);
  liftFlat(c, flat, "provider", ["wallet_provider", "walletProvider"]);
  liftFlat(c, flat, "wallet_provider_subject", [
    "wallet_provider_subject",
    "walletProviderSubject"
  ]);
  liftFlat(c, flat, "auth_method", ["auth_method", "authMethod"]);
  liftFlat(c, flat, "auth_value", ["auth_value", "authValue"]);
  liftFlat(c, flat, "auth_verified_at", ["auth_verified_at", "authVerifiedAt"]);
  dropNullKeys(c, "is_connected");
  return Object.keys(c).length ? c : void 0;
}
function buildEvm(src, flat) {
  const e = __spreadValues({}, src != null ? src : {});
  renameKey(e, "chainId", "chain_id");
  renameKey(e, "ensName", "ens_name");
  delete e.aa;
  delete e.sponsorship;
  liftFlat(e, flat, "address", ["address"]);
  liftFlat(e, flat, "chain_id", ["chain_id", "chainId"]);
  if (e.chain_id != null) {
    const cid = parseChainId(e.chain_id);
    if (cid !== void 0) e.chain_id = cid;
    else delete e.chain_id;
  }
  liftFlat(e, flat, "ens_name", ["ens_name", "ensName"]);
  return Object.keys(e).length ? e : void 0;
}
function buildSvm(src, flat) {
  const s = __spreadValues({}, src != null ? src : {});
  renameKey(s, "walletName", "wallet_name");
  liftFlat(s, flat, "address", ["svm_address", "svmAddress"]);
  dropNullKeys(s, "capabilities");
  return Object.keys(s).length ? s : void 0;
}
function buildPending(src, flat) {
  var _a, _b, _c;
  const p = {};
  assignDefined(
    p,
    "evm_txs",
    snakeizeBucket(
      (_a = pick(src, "evm_txs", "evmTxs")) != null ? _a : pick(flat, "pending_txs", "pendingTxs")
    )
  );
  assignDefined(
    p,
    "evm_sigs",
    snakeizeBucket(
      (_b = pick(src, "evm_sigs", "evmSigs")) != null ? _b : pick(flat, "pending_eip712s", "pendingEip712s")
    )
  );
  assignDefined(
    p,
    "svm_ixs",
    snakeizeBucket(
      (_c = pick(src, "svm_ixs", "svmIxs", "solana_txs", "solanaTxs")) != null ? _c : pick(flat, "pending_solana_txs", "pendingSolanaTxs")
    )
  );
  assignDefined(
    p,
    "svm_sigs",
    snakeizeBucket(pick(src, "svm_sigs", "svmSigs", "solana_sigs", "solanaSigs"))
  );
  return Object.keys(p).length ? p : void 0;
}
function dropNullKeys(obj, ...keys) {
  for (const key of keys) {
    if (obj[key] === null || obj[key] === void 0) {
      delete obj[key];
    }
  }
}
function deepMergePreserve(previous, incoming) {
  const out = __spreadValues({}, previous);
  for (const [key, value] of Object.entries(incoming)) {
    const prevObj = asObject(out[key]);
    const incObj = asObject(value);
    if (prevObj && incObj) {
      out[key] = deepMergePreserve(prevObj, incObj);
    } else if (value !== void 0) {
      out[key] = value;
    }
  }
  return out;
}
function parseChainId(value) {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value !== "string") {
    return void 0;
  }
  const trimmed = value.trim();
  if (!trimmed) return void 0;
  const parsed = trimmed.startsWith("0x") ? Number.parseInt(trimmed.slice(2), 16) : Number.parseInt(trimmed, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : void 0;
}
function address(state) {
  var _a;
  const value = (_a = asEvmObject(state == null ? void 0 : state.evm)) == null ? void 0 : _a.address;
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
function svmAddress(state) {
  var _a;
  const value = (_a = asObject(state == null ? void 0 : state.svm)) == null ? void 0 : _a.address;
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
function chainId(state) {
  var _a;
  return parseChainId((_a = asEvmObject(state == null ? void 0 : state.evm)) == null ? void 0 : _a.chain_id);
}
function isConnected(state) {
  var _a;
  const value = (_a = asObject(state == null ? void 0 : state.connection)) == null ? void 0 : _a.is_connected;
  return typeof value === "boolean" ? value : void 0;
}
function sameAddress(a, b) {
  const na = typeof a === "string" ? a.toLowerCase() : void 0;
  const nb = typeof b === "string" ? b.toLowerCase() : void 0;
  return na !== void 0 && na === nb;
}
function normalizeUserState(userState) {
  const src = asObject(userState);
  if (!src) {
    return void 0;
  }
  const out = {};
  const connection = buildConnection(asObject(pick(src, "connection")), src);
  if (connection) out.connection = connection;
  const evm = buildEvm(asEvmObject(pick(src, "evm")), src);
  if (evm) out.evm = evm;
  const svm = buildSvm(asObject(pick(src, "svm", "solana")), src);
  if (svm) out.svm = svm;
  const pending = buildPending(asObject(pick(src, "pending")), src);
  if (pending) out.pending = pending;
  const ext = pick(src, "ext");
  if (ext !== void 0) out.ext = ext;
  const preferences = pick(src, "preferences");
  if (preferences !== void 0)
    out.preferences = preferences;
  return out;
}
function stripDanglingConnection(state) {
  if (isConnected(state) !== true || chainId(state) !== void 0 || svmAddress(state) !== void 0) {
    return state;
  }
  const conn = asObject(state.connection);
  if (!conn) return state;
  const trimmed = __spreadValues({}, conn);
  delete trimmed.is_connected;
  if (Object.keys(trimmed).length) {
    state.connection = trimmed;
  } else {
    delete state.connection;
  }
  return state;
}
function reconcileUserState(previousUserState, incomingUserState) {
  const inc = normalizeUserState(incomingUserState);
  if (!inc) return void 0;
  const prev = normalizeUserState(previousUserState);
  if (!prev) return stripDanglingConnection(inc);
  const out = __spreadValues({}, inc);
  const connectedNotBroken = isConnected(inc) !== false;
  const prevConn = asObject(prev.connection);
  const incConn = asObject(inc.connection);
  if (connectedNotBroken && prevConn) {
    out.connection = incConn ? deepMergePreserve(prevConn, incConn) : prevConn;
  }
  const prevEvm = asObject(prev.evm);
  const incEvm = asObject(inc.evm);
  const sameEvm = !!address(prev) && (!address(inc) || sameAddress(address(prev), address(inc)));
  if (connectedNotBroken && prevEvm && (sameEvm || !incEvm)) {
    out.evm = incEvm ? deepMergePreserve(prevEvm, incEvm) : prevEvm;
  }
  const prevSvm = asObject(prev.svm);
  const incSvm = asObject(inc.svm);
  const sameSvm = !!svmAddress(prev) && (!svmAddress(inc) || svmAddress(prev) === svmAddress(inc));
  if (connectedNotBroken && prevSvm && (sameSvm || !incSvm)) {
    out.svm = incSvm ? deepMergePreserve(prevSvm, incSvm) : prevSvm;
  }
  if (!asObject(inc.pending) && asObject(prev.pending)) {
    out.pending = prev.pending;
  }
  if (inc.ext === void 0 && prev.ext !== void 0) {
    out.ext = prev.ext;
  }
  const outExt = asObject(out.ext);
  if (outExt && Object.keys(outExt).length === 0) {
    delete out.ext;
  }
  if (inc.preferences === void 0 && prev.preferences !== void 0) {
    out.preferences = prev.preferences;
  }
  return stripDanglingConnection(out);
}
function toOwnedUserState(userState) {
  const normalized = normalizeUserState(userState);
  if (!normalized) return void 0;
  const _a = normalized, { pending: _pending } = _a, owned = __objRest(_a, ["pending"]);
  return owned;
}

// src/user-state/accessors.ts
function asObject2(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return void 0;
  }
  return value;
}
function evmBlock(userState) {
  var _a;
  return asObject2((_a = normalizeUserState(userState)) == null ? void 0 : _a.evm);
}
function svmBlock(userState) {
  var _a;
  return asObject2((_a = normalizeUserState(userState)) == null ? void 0 : _a.svm);
}
function connBlock(userState) {
  var _a;
  return asObject2((_a = normalizeUserState(userState)) == null ? void 0 : _a.connection);
}
function parseChainId2(value) {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value !== "string") return void 0;
  const trimmed = value.trim();
  if (!trimmed) return void 0;
  const parsed = trimmed.startsWith("0x") ? Number.parseInt(trimmed.slice(2), 16) : Number.parseInt(trimmed, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : void 0;
}
function optionalString(value) {
  if (value === null) return null;
  return typeof value === "string" && value.trim().length > 0 ? value : void 0;
}
function timestamp(value) {
  if (value === null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value !== "string") return void 0;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : void 0;
}
var AUTH_METHODS = /* @__PURE__ */ new Set([
  "google",
  "apple",
  "facebook",
  "x",
  "discord",
  "github",
  "farcaster",
  "telegram",
  "email",
  "phone",
  "wagmi"
]);
function address2(userState) {
  var _a;
  const value = (_a = evmBlock(userState)) == null ? void 0 : _a.address;
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
var evmAddress = address2;
function svmAddress2(userState) {
  var _a;
  const value = (_a = svmBlock(userState)) == null ? void 0 : _a.address;
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
function chainId2(userState) {
  var _a;
  return parseChainId2((_a = evmBlock(userState)) == null ? void 0 : _a.chain_id);
}
function ensName(userState) {
  var _a;
  const value = (_a = evmBlock(userState)) == null ? void 0 : _a.ens_name;
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
function isConnected2(userState) {
  var _a;
  const value = (_a = connBlock(userState)) == null ? void 0 : _a.is_connected;
  return typeof value === "boolean" ? value : void 0;
}
function walletProvider(userState) {
  var _a;
  const value = (_a = connBlock(userState)) == null ? void 0 : _a.provider;
  if (value === null) return null;
  return value === "para" || value === "privy" || value === "baseAccount" ? value : void 0;
}
function walletProviderSubject(userState) {
  var _a;
  return optionalString((_a = connBlock(userState)) == null ? void 0 : _a.wallet_provider_subject);
}
function authMethod(userState) {
  var _a;
  const value = (_a = connBlock(userState)) == null ? void 0 : _a.auth_method;
  if (value === null) return null;
  return typeof value === "string" && AUTH_METHODS.has(value) ? value : void 0;
}
function authValue(userState) {
  var _a;
  return optionalString((_a = connBlock(userState)) == null ? void 0 : _a.auth_value);
}
function authVerifiedAt(userState) {
  var _a;
  return timestamp((_a = connBlock(userState)) == null ? void 0 : _a.auth_verified_at);
}
function withExt(userState, key, value) {
  var _a, _b;
  const normalizedUserState = (_a = normalizeUserState(userState)) != null ? _a : {};
  const currentExt = (_b = asObject2(normalizedUserState.ext)) != null ? _b : {};
  return __spreadProps(__spreadValues({}, normalizedUserState), {
    ext: __spreadProps(__spreadValues({}, currentExt), {
      [key]: value
    })
  });
}

// src/user-state/index.ts
var CLIENT_TYPE_TS_CLI = "ts_cli";
var CLIENT_TYPE_WEB_UI = "web_ui";
var UserState;
((UserState2) => {
  UserState2.normalize = normalizeUserState;
  UserState2.reconcile = reconcileUserState;
  UserState2.toOwned = toOwnedUserState;
  UserState2.address = address2;
  UserState2.evmAddress = evmAddress;
  UserState2.svmAddress = svmAddress2;
  UserState2.chainId = chainId2;
  UserState2.ensName = ensName;
  UserState2.isConnected = isConnected2;
  UserState2.walletProvider = walletProvider;
  UserState2.walletProviderSubject = walletProviderSubject;
  UserState2.authMethod = authMethod;
  UserState2.authValue = authValue;
  UserState2.authVerifiedAt = authVerifiedAt;
  UserState2.withExt = withExt;
})(UserState || (UserState = {}));

// src/types.ts
var AOMI_TASK_EVENT_TYPES = [
  "task_started",
  "task_activity",
  "task_completed"
];
function isAomiTaskEventType(type) {
  return AOMI_TASK_EVENT_TYPES.includes(type);
}
var asString = (value) => typeof value === "string" ? value : void 0;
function parseAomiTaskEvent(event) {
  var _a, _b, _c, _d;
  const raw = event;
  const type = asString(raw.type);
  if (!type || !isAomiTaskEventType(type)) return null;
  const agentId = asString(raw.agent_id);
  if (!agentId) return null;
  const callId = (_a = asString(raw.call_id)) != null ? _a : "";
  if (type === "task_started") {
    return __spreadValues(__spreadValues({
      type,
      call_id: callId,
      agent_id: agentId,
      label: (_b = asString(raw.label)) != null ? _b : "",
      app: (_c = asString(raw.app)) != null ? _c : null,
      resumed: raw.resumed === true
    }, asString(raw.session_id) ? { session_id: raw.session_id } : null), asString(raw.thread_id) ? { thread_id: raw.thread_id } : null);
  }
  if (type === "task_activity") {
    const childSeq = raw.child_seq;
    if (typeof childSeq !== "number" || !Number.isFinite(childSeq)) return null;
    const kind = raw.kind === "note" ? "note" : "tool_call";
    return __spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues({
      type,
      call_id: callId,
      agent_id: agentId,
      kind,
      child_seq: childSeq
    }, asString(raw.tool_name) ? { tool_name: raw.tool_name } : null), raw.args !== void 0 ? { args: raw.args } : null), asString(raw.result_preview) ? { result_preview: raw.result_preview } : null), asString(raw.text) ? { text: raw.text } : null), asString(raw.session_id) ? { session_id: raw.session_id } : null), asString(raw.thread_id) ? { thread_id: raw.thread_id } : null);
  }
  return __spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues({
    type,
    call_id: callId,
    agent_id: agentId,
    status: (_d = asString(raw.status)) != null ? _d : "completed"
  }, asString(raw.message) ? { message: raw.message } : null), typeof raw.staged_count === "number" ? { staged_count: raw.staged_count } : null), typeof raw.steps === "number" ? { steps: raw.steps } : null), typeof raw.duration_ms === "number" ? { duration_ms: raw.duration_ms } : null), asString(raw.session_id) ? { session_id: raw.session_id } : null), asString(raw.thread_id) ? { thread_id: raw.thread_id } : null);
}

// src/event.ts
var TypedEventEmitter = class {
  constructor() {
    this.listeners = /* @__PURE__ */ new Map();
  }
  on(type, handler) {
    let set = this.listeners.get(type);
    if (!set) {
      set = /* @__PURE__ */ new Set();
      this.listeners.set(type, set);
    }
    set.add(handler);
    return () => {
      set.delete(handler);
      if (set.size === 0) {
        this.listeners.delete(type);
      }
    };
  }
  once(type, handler) {
    const wrapper = ((payload) => {
      unsub();
      handler(payload);
    });
    const unsub = this.on(type, wrapper);
    return unsub;
  }
  emit(type, payload) {
    const typeSet = this.listeners.get(type);
    if (typeSet) {
      for (const handler of typeSet) {
        handler(payload);
      }
    }
    if (type !== "*") {
      const wildcardSet = this.listeners.get("*");
      if (wildcardSet) {
        for (const handler of wildcardSet) {
          handler({ type, payload });
        }
      }
    }
  }
  off(type, handler) {
    const set = this.listeners.get(type);
    if (set) {
      set.delete(handler);
      if (set.size === 0) {
        this.listeners.delete(type);
      }
    }
  }
  removeAllListeners() {
    this.listeners.clear();
  }
};

// src/session/json.ts
function stableUserStateString(state) {
  return JSON.stringify(sortJson(state != null ? state : {}));
}
function sortJson(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => sortJson(entry));
  }
  if (value && typeof value === "object") {
    return Object.keys(value).sort().reduce((acc, key) => {
      acc[key] = sortJson(value[key]);
      return acc;
    }, {});
  }
  return value;
}

// src/session/state.ts
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function addExtValue(userState, key, value) {
  const current = userState != null ? userState : {};
  const currentExt = isRecord(current["ext"]) ? current["ext"] : {};
  return __spreadProps(__spreadValues({}, current), {
    ext: __spreadProps(__spreadValues({}, currentExt), {
      [key]: value
    })
  });
}
function removeExtValue(userState, key) {
  if (!userState) return void 0;
  const currentExt = userState["ext"];
  if (!isRecord(currentExt)) return void 0;
  const nextExt = __spreadValues({}, currentExt);
  delete nextExt[key];
  return __spreadProps(__spreadValues({}, userState), { ext: nextExt });
}
function resolveWalletState(userState, address3, chainId3) {
  const prevEvm = isRecord(userState == null ? void 0 : userState.evm) ? userState == null ? void 0 : userState.evm : {};
  const prevConn = isRecord(userState == null ? void 0 : userState.connection) ? userState == null ? void 0 : userState.connection : {};
  return __spreadProps(__spreadValues({}, userState != null ? userState : {}), {
    evm: __spreadProps(__spreadValues({}, prevEvm), {
      address: address3,
      chain_id: chainId3 != null ? chainId3 : 1
    }),
    connection: __spreadProps(__spreadValues({}, prevConn), {
      is_connected: true
    })
  });
}

// src/session/wallet.ts
var SessionWalletController = class {
  constructor(deps) {
    this.deps = deps;
    this.requests = [];
    this.nextId = 1;
    this.resolvedRequestIds = /* @__PURE__ */ new Set();
    this.resolvingRequestIds = /* @__PURE__ */ new Set();
  }
  get length() {
    return this.requests.length;
  }
  list() {
    return [...this.requests];
  }
  find(id) {
    return this.requests.find((request) => request.id === id);
  }
  enqueue(kind, payload) {
    const id = this.requestId(kind, payload);
    const existing = this.find(id);
    const request = this.request(kind, payload, id, existing == null ? void 0 : existing.timestamp);
    if (this.resolvedRequestIds.has(id) && !existing) return request;
    this.requests = existing ? this.requests.map((current) => current.id === id ? request : current) : [...this.requests, request];
    this.changed();
    return request;
  }
  async resolve(requestId, result) {
    const request = this.pending(requestId);
    if (result.kind !== request.kind) {
      throw new Error(
        `WalletRequestResult.kind mismatch for "${requestId}": request is "${request.kind}" but result is "${result.kind}".`
      );
    }
    if (this.resolvingRequestIds.has(requestId)) return;
    this.resolvingRequestIds.add(requestId);
    try {
      await this.deps.resolveAction(request, result);
      this.finish(request);
    } finally {
      this.resolvingRequestIds.delete(requestId);
    }
  }
  async reject(requestId, reason) {
    const request = this.pending(requestId);
    if (this.resolvingRequestIds.has(requestId)) return;
    this.resolvingRequestIds.add(requestId);
    try {
      await this.deps.rejectAction(request, reason);
      this.finish(request);
    } finally {
      this.resolvingRequestIds.delete(requestId);
    }
  }
  dismiss(requestId) {
    const request = this.find(requestId);
    if (request) this.finish(request);
  }
  pending(requestId) {
    const request = this.find(requestId);
    if (!request) {
      throw new Error(`No pending wallet request with id "${requestId}"`);
    }
    return request;
  }
  finish(request) {
    this.requests = this.requests.filter(
      (current) => current.id !== request.id
    );
    this.resolvedRequestIds.add(request.id);
    this.changed();
  }
  requestId(kind, payload) {
    if (kind === "transaction") {
      const requestId = payload.requestId;
      if (requestId) return `txreq-${requestId}`;
    } else if (kind === "signing") {
      return payload.requestId;
    } else {
      const requestId = payload.requestId;
      if (requestId) return requestId;
    }
    return `wreq-${this.nextId++}`;
  }
  request(kind, payload, id, timestamp2 = Date.now()) {
    return { id, kind, payload, timestamp: timestamp2 };
  }
  changed() {
    this.deps.onChange(this.list());
  }
};

// src/aa/policy.ts
function aaModeFromExecutionKind(executionKind) {
  if (!executionKind) return void 0;
  if (executionKind.endsWith("_4337")) return "4337";
  if (executionKind.endsWith("_7702")) return "7702";
  if (executionKind === "eoa") return "none";
  return void 0;
}

// src/session/index.ts
var ClientSession = class extends TypedEventEmitter {
  constructor(clientOrOptions, sessionOptions) {
    var _a, _b, _c, _d;
    super();
    this.agentActions = /* @__PURE__ */ new Map();
    this.pollTimer = null;
    this.pollingActive = false;
    this.pollInFlight = false;
    this.pollFailureCount = 0;
    this._isProcessing = false;
    this._backendWasProcessing = false;
    this._messages = [];
    this.closed = false;
    this.pendingResolve = null;
    this.handleVisibilityChange = () => {
      if (typeof document !== "undefined" && !document.hidden && !this.pollInFlight) {
        this.schedulePoll(0);
      }
    };
    this.client = clientOrOptions instanceof AomiClient ? clientOrOptions : new AomiClient(clientOrOptions);
    this.sessionId = (_a = sessionOptions == null ? void 0 : sessionOptions.sessionId) != null ? _a : crypto.randomUUID();
    this.app = (_b = sessionOptions == null ? void 0 : sessionOptions.app) != null ? _b : "default";
    this.model = sessionOptions == null ? void 0 : sessionOptions.model;
    this.applicationId = sessionOptions == null ? void 0 : sessionOptions.applicationId;
    const initialUserState = UserState.reconcile(
      void 0,
      sessionOptions == null ? void 0 : sessionOptions.userState
    );
    this.userState = (sessionOptions == null ? void 0 : sessionOptions.clientType) ? UserState.withExt(
      initialUserState != null ? initialUserState : {},
      "client_type",
      sessionOptions.clientType
    ) : initialUserState;
    this.clientId = (_c = sessionOptions == null ? void 0 : sessionOptions.clientId) != null ? _c : crypto.randomUUID();
    this.pollIntervalMs = (_d = sessionOptions == null ? void 0 : sessionOptions.pollIntervalMs) != null ? _d : 500;
    this.logger = sessionOptions == null ? void 0 : sessionOptions.logger;
    this.walletController = new SessionWalletController({
      onChange: (requests) => this.emit("wallet_requests_changed", requests),
      resolveAction: (request, result) => this.resolveAgentAction(request, result),
      rejectAction: (request, reason) => this.rejectAgentAction(request, reason)
    });
  }
  // ===========================================================================
  // Public API — Chat
  // ===========================================================================
  /**
   * Send a message and wait for the AI to finish processing.
   *
   * The returned promise resolves when `is_processing` becomes `false` AND
   * there are no pending wallet requests. If a wallet request arrives
   * mid-processing, polling continues but the promise pauses until the
   * request is resolved or rejected via `resolve()` / `reject()`.
   */
  async send(message) {
    this.assertOpen();
    const response = await this.submitChat(message);
    if (!this.agentActive(response) && this.walletController.length === 0) {
      return { messages: this._messages, title: this._title };
    }
    this._isProcessing = true;
    this.emit("processing_start", void 0);
    return new Promise((resolve) => {
      this.pendingResolve = resolve;
      this.startPolling();
    });
  }
  /**
   * Send a message without waiting for completion.
   * Polling starts in the background; listen to events for updates.
   */
  async sendAsync(message) {
    this.assertOpen();
    const response = await this.submitChat(message);
    if (this.agentActive(response)) {
      this._isProcessing = true;
      this.emit("processing_start", void 0);
      this.startPolling();
    }
    return response;
  }
  // ===========================================================================
  // Public API — Wallet Request Resolution
  // ===========================================================================
  /**
   * Resolve a pending wallet request. The `result.kind` discriminator must
   * match the originating request's kind — sending a `transaction` result for a `signing`
   * request would post the wrong wire event with empty fields, so we
   * fail fast at runtime instead.
   */
  async resolve(requestId, result) {
    await this.walletController.resolve(requestId, result);
    this.resumeAfterWalletResponse();
  }
  /**
   * Reject a pending wallet request.
   * Sends an error to the backend and resumes polling.
   */
  async reject(requestId, reason) {
    await this.walletController.reject(requestId, reason);
    this.resumeAfterWalletResponse();
  }
  /**
   * Drop a pending wallet request locally without completing it. Hosts should
   * normally use `resolve` or `reject`; this is reserved for externally
   * acknowledged lifecycle cleanup.
   */
  dismiss(requestId) {
    this.walletController.dismiss(requestId);
    this.resumeAfterWalletResponse();
  }
  // ===========================================================================
  // Public API — Control
  // ===========================================================================
  /**
   * Cancel the AI's current response.
   */
  async interrupt() {
    this.stopPolling();
    this.applyAgentDelta(await this.client.agent.interrupt(this.sessionId));
    this._isProcessing = false;
    this.emit("processing_end", void 0);
    this.resolvePending();
  }
  /**
   * Close the session. Stops polling, unsubscribes SSE, removes all listeners.
   * The session cannot be used after closing.
   */
  close() {
    if (this.closed) return;
    this.closed = true;
    this.stopPolling();
    this.resolvePending();
    this.removeAllListeners();
  }
  // ===========================================================================
  // Public API — Accessors
  // ===========================================================================
  /** Current messages in the session. */
  getMessages() {
    return this._messages;
  }
  /** Current session title. */
  getTitle() {
    return this._title;
  }
  /** Latest authoritative backend user_state snapshot seen by this session. */
  getUserState() {
    return this.userState ? __spreadValues({}, this.userState) : void 0;
  }
  /** Pending wallet requests waiting for resolve/reject. */
  getPendingRequests() {
    return this.walletController.list();
  }
  /** Whether the AI is currently processing. */
  getIsProcessing() {
    return this._isProcessing;
  }
  /** Last status observed from the canonical Agent transport. */
  getAgentStatus() {
    return this.agentStatus;
  }
  syncRuntimeOptions(options) {
    var _a;
    this.app = options.app;
    this.model = options.model;
    this.applicationId = options.applicationId;
    this.clientId = (_a = options.clientId) != null ? _a : this.clientId;
    if (options.userState) {
      this.resolveUserState(options.userState);
    }
  }
  resolveUserState(userState, opts) {
    const previousSerialized = stableUserStateString(this.userState);
    this.userState = UserState.reconcile(this.userState, userState);
    const nextSerialized = stableUserStateString(this.userState);
    if (!(opts == null ? void 0 : opts.skipEmit) && this.userState && previousSerialized !== nextSerialized) {
      this.emit("user_state_updated", this.userState);
    }
  }
  setClientType(clientType) {
    var _a;
    this.resolveUserState(
      UserState.withExt((_a = this.userState) != null ? _a : {}, "client_type", clientType)
    );
  }
  addExtValue(key, value) {
    this.resolveUserState(addExtValue(this.userState, key, value));
  }
  removeExtValue(key) {
    const next = removeExtValue(this.userState, key);
    if (next) {
      this.resolveUserState(next);
    }
  }
  resolveWallet(address3, chainId3) {
    this.resolveUserState(resolveWalletState(this.userState, address3, chainId3));
  }
  async syncUserState() {
    this.assertOpen();
    const delta = await this.client.agent.check(this.sessionId, {
      cursor: this.agentCursor
    });
    this.applyAgentDelta(delta);
    return delta;
  }
  // ===========================================================================
  // Public API — Polling Control
  // ===========================================================================
  /** Whether the session is currently polling for state updates. */
  getIsPolling() {
    return this.pollingActive;
  }
  /**
   * Fetch the current state from the backend (one-shot).
   * Automatically starts polling if the backend is processing.
   */
  async fetchCurrentState() {
    this.assertOpen();
    const delta = await this.client.agent.check(this.sessionId, {
      cursor: this.agentCursor
    });
    this.applyAgentDelta(delta);
    const active = this.agentActive(delta);
    if (active && !this.pollingActive) {
      this._isProcessing = true;
      this.emit("processing_start", void 0);
      this.startPolling();
    } else if (!active) {
      this._isProcessing = false;
    }
  }
  /**
   * Start polling for state updates. Idempotent — no-op if already polling.
   * Useful for resuming polling after resolving a wallet request.
   */
  startPolling() {
    var _a;
    if (this.pollingActive || this.closed) return;
    this.pollingActive = true;
    this._backendWasProcessing = true;
    (_a = this.logger) == null ? void 0 : _a.debug("[session] polling started", this.sessionId);
    if (typeof document !== "undefined") {
      document.addEventListener(
        "visibilitychange",
        this.handleVisibilityChange
      );
    }
    this.schedulePoll(this.currentPollInterval());
  }
  /** Stop polling for state updates. Idempotent — no-op if not polling. */
  stopPolling() {
    var _a;
    this.pollingActive = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    if (typeof document !== "undefined") {
      document.removeEventListener(
        "visibilitychange",
        this.handleVisibilityChange
      );
    }
    (_a = this.logger) == null ? void 0 : _a.debug("[session] polling stopped", this.sessionId);
  }
  async pollTick() {
    var _a;
    if (!this.pollingActive || this.pollInFlight) return;
    this.pollTimer = null;
    this.pollInFlight = true;
    try {
      const delta = await this.client.agent.check(this.sessionId, {
        cursor: this.agentCursor,
        waitMs: 25e3
      });
      if (!this.pollingActive) return;
      this.pollFailureCount = 0;
      this.applyAgentDelta(delta);
      const active = this.agentActive(delta);
      if (this._backendWasProcessing && !active) {
        this.emit("backend_idle", void 0);
      }
      this._backendWasProcessing = active;
      if (!active && this.walletController.length === 0) {
        this.stopPolling();
        this._isProcessing = false;
        this.emit("processing_end", void 0);
        this.resolvePending();
      }
    } catch (error) {
      this.pollFailureCount += 1;
      (_a = this.logger) == null ? void 0 : _a.debug("[session] poll error", error);
      this.emit("error", { error });
    } finally {
      this.pollInFlight = false;
      if (this.pollingActive) {
        this.schedulePoll(
          Math.min(
            this.currentPollInterval() * 2 ** this.pollFailureCount,
            5e3
          )
        );
      }
    }
  }
  currentPollInterval() {
    return typeof document !== "undefined" && document.hidden ? 2e3 : this.pollIntervalMs;
  }
  schedulePoll(delayMs) {
    if (!this.pollingActive || this.closed) return;
    if (this.pollTimer) clearTimeout(this.pollTimer);
    this.pollTimer = setTimeout(() => {
      void this.pollTick();
    }, delayMs);
  }
  /** Shared completion path for send()/sendAsync() after the chat POST. */
  async submitChat(message) {
    var _a;
    const applicationId = Number(this.applicationId);
    const operation = ((_a = this.agentStartOperation) == null ? void 0 : _a.message) === message ? this.agentStartOperation : {
      message,
      idempotencyKey: `idem_${crypto.randomUUID().replaceAll("-", "")}`
    };
    this.agentStartOperation = operation;
    let delta;
    try {
      delta = await this.client.agent.start(
        __spreadProps(__spreadValues(__spreadValues({
          sessionId: this.sessionId,
          clientId: this.clientId,
          message
        }, Number.isSafeInteger(applicationId) && applicationId > 0 ? { applicationId } : { app: this.app }), this.model ? { model: this.model } : {}), {
          wallets: this.agentWallets()
        }),
        { idempotencyKey: operation.idempotencyKey }
      );
    } catch (error) {
      if (error instanceof AgentApiError && !error.retryable) {
        this.agentStartOperation = void 0;
      }
      throw error;
    }
    this.agentStartOperation = void 0;
    this.applyAgentDelta(delta);
    return delta;
  }
  agentActive(delta) {
    return delta.status === "processing" || delta.status === "awaiting_user";
  }
  agentWallets() {
    var _a, _b, _c;
    const normalized = UserState.normalize(this.userState);
    const chainId3 = Number((_a = normalized == null ? void 0 : normalized.evm) == null ? void 0 : _a.chain_id);
    return __spreadValues(__spreadValues({}, ((_b = normalized == null ? void 0 : normalized.evm) == null ? void 0 : _b.address) ? {
      evm: __spreadValues({
        address: normalized.evm.address
      }, Number.isSafeInteger(chainId3) && chainId3 > 0 ? { chainId: chainId3 } : {})
    } : {}), ((_c = normalized == null ? void 0 : normalized.svm) == null ? void 0 : _c.address) ? {
      svm: __spreadValues({
        address: normalized.svm.address
      }, normalized.svm.cluster ? { cluster: normalized.svm.cluster } : {})
    } : {});
  }
  applyAgentDelta(delta) {
    if (delta.sessionId !== this.sessionId) {
      throw new TypeError("Agent response session does not match the request");
    }
    this.agentCursor = delta.cursor;
    this.agentStatus = delta.status;
    let messagesChanged = false;
    for (const incoming of delta.messages) {
      const message = this.agentMessage(incoming);
      const index = message.id ? this._messages.findIndex((current) => current.id === message.id) : -1;
      if (index >= 0) this._messages[index] = message;
      else this._messages.push(message);
      messagesChanged = true;
    }
    if (messagesChanged) this.emit("messages", [...this._messages]);
    if (delta.title && delta.title !== this._title) {
      this._title = delta.title;
      this.emit("title_changed", { title: delta.title });
    }
    this.applyAgentActivity(delta.activity);
    this.syncAgentActions(delta.actions);
  }
  agentMessage(message) {
    var _a;
    return __spreadValues(__spreadValues({
      id: message.id,
      sender: message.role,
      content: message.content,
      timestamp: message.createdAt,
      is_streaming: message.streaming,
      tool_result: (_a = message.toolResult) != null ? _a : null
    }, message.toolName ? { tool_name: message.toolName } : {}), message.toolArguments !== void 0 ? { tool_arguments: message.toolArguments } : {});
  }
  applyAgentActivity(activity) {
    for (const event of activity) {
      const type = typeof event.type === "string" ? event.type : void 0;
      if (type === "tool_complete" || type === "task_started" || type === "task_activity" || type === "task_completed") {
        this.emit(type, event);
      }
    }
  }
  syncAgentActions(actions) {
    const visible = /* @__PURE__ */ new Set();
    for (const action of actions) {
      this.agentActions.set(action.id, action);
      if (action.status !== "pending") continue;
      visible.add(action.id);
      this.enqueueAgentAction(action);
    }
    for (const request of this.walletController.list()) {
      const actionId = this.actionIdForRequest(request.id);
      if (this.agentActions.has(actionId) && !visible.has(actionId)) {
        this.walletController.dismiss(request.id);
      }
    }
  }
  enqueueAgentAction(action) {
    var _a, _b, _c, _d, _e;
    if (action.type === "external_transaction" && action.chainFamily === "evm") {
      const typed2 = action;
      this.walletController.enqueue("transaction", {
        requestId: typed2.id,
        chainId: typed2.chainId,
        aaPreference: "none",
        calls: typed2.transactions.map((transaction, index) => {
          var _a2;
          return {
            txId: index + 1,
            to: transaction.to,
            value: transaction.value,
            data: transaction.data,
            chainId: typed2.chainId,
            from: transaction.from,
            gas: (_a2 = transaction.gas) != null ? _a2 : void 0,
            description: transaction.description
          };
        }),
        txIds: typed2.transactions.map((_, index) => index + 1)
      });
      return;
    }
    if (action.type === "external_transaction") {
      const typed2 = action;
      const transaction = typed2.transactions[0];
      if (transaction) {
        this.walletController.enqueue("solana_sign_and_send", {
          requestId: typed2.id,
          unsignedTx: transaction.unsignedTransactionBase64,
          description: typed2.description,
          cluster: typed2.cluster,
          transactions: typed2.transactions.map((item) => ({
            id: item.id,
            unsignedTx: item.unsignedTransactionBase64,
            description: item.description
          }))
        });
      }
      return;
    }
    const typed = action;
    this.walletController.enqueue("signing", {
      requestId: typed.id,
      chainFamily: typed.chainFamily,
      executionKind: typed.executionKind === "account_abstraction" || typed.executionKind === "hosted" ? "erc4337" : typed.executionKind,
      signer: typed.signer,
      chainId: (_a = typed.chainId) != null ? _a : void 0,
      cluster: (_b = typed.cluster) != null ? _b : void 0,
      description: typed.description,
      payloads: typed.payloads.map((payload) => {
        if (payload.kind === "evm_personal") {
          return { kind: payload.kind, message: payload.message };
        }
        if (payload.kind === "evm_typed_data") {
          return { kind: payload.kind, typedData: payload.typedData };
        }
        if (payload.kind === "svm_message") {
          return { kind: payload.kind, messageBase64: payload.messageBase64 };
        }
        return {
          kind: payload.kind,
          transactionBase64: payload.transactionBase64
        };
      }),
      broadcaster: typed.broadcaster,
      operationId: (_c = typed.operationId) != null ? _c : void 0,
      executor: typed.executor,
      expiresAt: (_d = typed.expiresAt) != null ? _d : void 0,
      callsDigest: typed.callsDigest,
      calls: typed.calls,
      fees: typed.fees,
      sponsorship: (_e = typed.sponsorship) != null ? _e : void 0
    });
  }
  async resolveAgentAction(request, result) {
    var _a, _b, _c;
    const action = this.agentActions.get(this.actionIdForRequest(request.id));
    if (!action)
      throw new Error(`No Agent action for wallet request "${request.id}"`);
    let actionResult;
    if (action.type === "signing_request" && result.kind === "signing") {
      actionResult = {
        status: "signed",
        revision: action.revision,
        outputs: action.payloads.map((payload, index) => __spreadValues({
          id: payload.id
        }, payload.kind === "svm_transaction" ? { signedTransactionBase64: result.signatures[index] } : { signature: result.signatures[index] }))
      };
    } else if (action.type === "external_transaction" && action.chainFamily === "evm" && result.kind === "transaction") {
      const completed = new Set(
        (_a = result.completedTxIds) != null ? _a : action.transactions.map((_, index) => index + 1)
      );
      const failed = new Set((_b = result.failedTxIds) != null ? _b : []);
      actionResult = {
        status: "submitted",
        revision: action.revision,
        legs: action.transactions.map((transaction, index) => {
          var _a2, _b2, _c2;
          return __spreadValues(__spreadValues({
            id: transaction.id,
            status: completed.has(index + 1) ? "submitted" : failed.has(index + 1) ? "failed" : "skipped"
          }, completed.has(index + 1) ? { transactionId: (_b2 = (_a2 = result.txHashes) == null ? void 0 : _a2[index]) != null ? _b2 : result.txHash } : {}), failed.has(index + 1) ? { reason: (_c2 = result.failureReason) != null ? _c2 : "Transaction failed" } : {});
        })
      };
    } else if (action.type === "external_transaction" && action.chainFamily === "svm" && (result.kind === "solana_send" || result.kind === "solana_sign_and_send")) {
      const byId = new Map(
        ((_c = result.legs) != null ? _c : []).map((leg) => [leg.id, leg])
      );
      if (action.transactions.length > 1 && byId.size === 0) {
        throw new Error(
          `SVM Agent batch "${action.id}" requires per-leg wallet results`
        );
      }
      actionResult = {
        status: "submitted",
        revision: action.revision,
        legs: action.transactions.map((transaction, index) => {
          var _a2, _b2;
          const leg = (_a2 = byId.get(transaction.id)) != null ? _a2 : index === 0 && action.transactions.length === 1 ? {
            id: transaction.id,
            status: "submitted",
            signature: result.signature,
            signedTx: result.signedTx
          } : void 0;
          return __spreadValues(__spreadValues(__spreadValues({
            id: transaction.id,
            status: (_b2 = leg == null ? void 0 : leg.status) != null ? _b2 : "skipped"
          }, (leg == null ? void 0 : leg.signature) ? { transactionId: leg.signature } : {}), (leg == null ? void 0 : leg.signedTx) ? { signedTransactionBase64: leg.signedTx } : {}), (leg == null ? void 0 : leg.reason) ? { reason: leg.reason } : {});
        })
      };
    } else {
      throw new Error(`Agent action/result kind mismatch for "${request.id}"`);
    }
    await this.client.agent.resolveAction(
      this.sessionId,
      action.id,
      actionResult
    );
  }
  async rejectAgentAction(request, reason) {
    const action = this.agentActions.get(this.actionIdForRequest(request.id));
    if (!action)
      throw new Error(`No Agent action for wallet request "${request.id}"`);
    await this.client.agent.resolveAction(this.sessionId, action.id, {
      status: "rejected",
      revision: action.revision,
      reason: reason != null ? reason : "Request rejected"
    });
  }
  actionIdForRequest(requestId) {
    return requestId.startsWith("txreq-") ? requestId.slice(6) : requestId;
  }
  resumeAfterWalletResponse() {
    if (!this._isProcessing) {
      this._isProcessing = true;
      this.emit("processing_start", void 0);
    }
    this.startPolling();
  }
  resolvePending() {
    if (this.pendingResolve) {
      const resolve = this.pendingResolve;
      this.pendingResolve = null;
      resolve({ messages: this._messages, title: this._title });
    }
  }
  assertOpen() {
    if (this.closed) {
      throw new Error("Session is closed");
    }
  }
};

// src/wallet-utils.ts
import { getAddress as getAddress2 } from "viem";
function asRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return void 0;
  return value;
}
function pendingTxsFromUserState(userState) {
  var _a, _b;
  const normalized = UserState.normalize(userState);
  const pending = asRecord(normalized == null ? void 0 : normalized.pending);
  return (_b = asRecord(pending == null ? void 0 : pending.evm_txs)) != null ? _b : asRecord((_a = asRecord(userState)) == null ? void 0 : _a.pending_txs);
}
function getToolArgs(payload) {
  var _a;
  const root = asRecord(payload);
  const nestedArgs = asRecord(root == null ? void 0 : root.args);
  return (_a = nestedArgs != null ? nestedArgs : root) != null ? _a : {};
}
function parseChainKind(value) {
  return value === "evm" || value === "svm" ? value : void 0;
}
function normalizeSolanaCluster(value) {
  if (typeof value !== "string") return void 0;
  const trimmed = value.trim();
  if (!trimmed) return void 0;
  switch (trimmed.toLowerCase()) {
    case "mainnet":
    case "mainnet-beta":
    case "solana:mainnet":
    case "solana:mainnet-beta":
      return "solana:mainnet";
    case "devnet":
    case "solana:devnet":
      return "solana:devnet";
    case "testnet":
    case "solana:testnet":
      return "solana:testnet";
    default:
      return trimmed;
  }
}
function inferSolanaRequestKind(payload) {
  const rawKind = typeof payload.kind === "string" ? payload.kind : typeof payload.request_kind === "string" ? payload.request_kind : typeof payload.requestKind === "string" ? payload.requestKind : void 0;
  switch (rawKind) {
    case "solana_sign_message":
    case "message_sign":
      return "solana_sign_message";
    case "solana_send":
    case "send_transaction":
      return "solana_send";
    case "solana_sign_and_send":
    case "sign_and_send_transaction":
      return "solana_sign_and_send";
    default:
      return "solana_sign";
  }
}
function parseChainId3(value) {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value > 0 ? value : void 0;
  }
  if (typeof value !== "string") return void 0;
  const trimmed = value.trim();
  if (!trimmed) return void 0;
  const parsed = trimmed.startsWith("0x") ? parseCanonicalInteger(trimmed.slice(2), 16) : parseCanonicalInteger(trimmed, 10);
  return parsed !== void 0 && parsed > 0 ? parsed : void 0;
}
function parseCanonicalInteger(value, radix) {
  if (value === "") return void 0;
  const pattern = radix === 16 ? /^[0-9a-fA-F]+$/ : /^[0-9]+$/;
  if (!pattern.test(value)) return void 0;
  const parsed = Number.parseInt(value, radix);
  return Number.isSafeInteger(parsed) ? parsed : void 0;
}
function parseTxIds(value) {
  if (!Array.isArray(value)) return [];
  const parsed = value.map((entry) => parsePendingId(entry)).filter((entry) => typeof entry === "number");
  const unique = Array.from(new Set(parsed));
  unique.sort((left, right) => left - right);
  return unique;
}
function parsePendingId(value) {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value !== "string") return void 0;
  const trimmed = value.trim();
  if (!trimmed) return void 0;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : void 0;
}
function parseValue(value) {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }
  return void 0;
}
function parseBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return void 0;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") return true;
  if (normalized === "false" || normalized === "0") return false;
  return void 0;
}
function parseString(value) {
  return typeof value === "string" ? value : void 0;
}
function isHexBytes(value) {
  return /^0x(?:[0-9a-fA-F]{2})*$/.test(value);
}
function normalizeAaPreference(value) {
  if (typeof value !== "string") return void 0;
  const normalized = value.trim().toLowerCase();
  if (normalized === "auto" || normalized === "eip4337" || normalized === "eip7702" || normalized === "none") {
    return normalized;
  }
  return void 0;
}
function normalizeAddress(value) {
  if (typeof value !== "string") return void 0;
  const trimmed = value.trim();
  if (!trimmed) return void 0;
  try {
    return getAddress2(trimmed);
  } catch (e) {
    if (/^0x[0-9a-fA-F]{40}$/.test(trimmed)) {
      return getAddress2(trimmed.toLowerCase());
    }
    return void 0;
  }
}
function normalizePendingTxData(pendingEntry) {
  const data = typeof pendingEntry.data === "string" ? pendingEntry.data : void 0;
  if (!data) {
    return void 0;
  }
  const kind = typeof pendingEntry.kind === "string" ? pendingEntry.kind.toLowerCase() : void 0;
  if (kind === "native_transfer") {
    return void 0;
  }
  return data;
}
function normalizeTxPayload(payload) {
  var _a, _b, _c, _d, _e, _f, _g;
  const root = asRecord(payload);
  const args = getToolArgs(payload);
  const ctx = asRecord(root == null ? void 0 : root.ctx);
  const txIds = parseTxIds((_a = args.tx_ids) != null ? _a : args.txIds);
  if (txIds.length === 0) return null;
  const to = normalizeAddress(args.to);
  const value = parseValue(args.value);
  const data = typeof args.data === "string" ? args.data : void 0;
  const chainId3 = (_d = (_c = (_b = parseChainId3(args.chainId)) != null ? _b : parseChainId3(args.chain_id)) != null ? _c : parseChainId3(ctx == null ? void 0 : ctx.user_chain_id)) != null ? _d : parseChainId3(ctx == null ? void 0 : ctx.userChainId);
  const requestId = typeof args.tx_id === "string" ? args.tx_id : typeof args.txId === "string" ? args.txId : void 0;
  const aaPreference = (_f = normalizeAaPreference((_e = args.aa_preference) != null ? _e : args.aaPreference)) != null ? _f : "auto";
  const aaStrict = parseBoolean((_g = args.aa_strict) != null ? _g : args.aaStrict);
  const txId = txIds.length === 1 ? txIds[0] : void 0;
  return {
    to,
    value,
    data,
    chainId: chainId3,
    txId,
    txIds,
    aaPreference,
    aaStrict,
    requestId
  };
}
function hydrateTxPayloadFromUserState(payload, userState, options) {
  var _a, _b, _c, _d, _e, _f, _g;
  const strict = (options == null ? void 0 : options.strict) === true;
  const txIds = Array.isArray(payload.txIds) && payload.txIds.length > 0 ? payload.txIds : payload.txId !== void 0 ? [payload.txId] : [];
  if (txIds.length === 0) {
    if (strict) {
      throw new Error("pending_tx_not_found");
    }
    return payload;
  }
  const pendingTxsRaw = pendingTxsFromUserState(userState);
  if (!pendingTxsRaw) {
    if (strict) {
      throw new Error("pending_tx_not_found");
    }
    return payload;
  }
  const calls = [];
  for (const txId of txIds) {
    const pendingEntry = asRecord(pendingTxsRaw[String(txId)]);
    if (!pendingEntry) {
      if (strict) {
        throw new Error("pending_tx_not_found");
      }
      continue;
    }
    const to = normalizeAddress(pendingEntry.to);
    if (!to) {
      if (strict) {
        throw new Error("pending_transaction_missing_call_data");
      }
      continue;
    }
    calls.push({
      txId,
      to,
      value: parseValue(pendingEntry.value),
      data: normalizePendingTxData(pendingEntry),
      chainId: (_b = (_a = parseChainId3(pendingEntry.chain_id)) != null ? _a : parseChainId3(pendingEntry.chainId)) != null ? _b : parseChainId3(payload.chainId),
      from: typeof pendingEntry.from === "string" ? pendingEntry.from : void 0,
      gas: typeof pendingEntry.gas === "string" ? pendingEntry.gas : void 0,
      description: typeof pendingEntry.label === "string" ? pendingEntry.label : typeof pendingEntry.description === "string" ? pendingEntry.description : void 0
    });
  }
  if (calls.length === 0) {
    if (strict) {
      throw new Error("pending_tx_not_found");
    }
    return payload;
  }
  const first = calls[0];
  return __spreadProps(__spreadValues({}, payload), {
    txIds,
    txId: (_c = payload.txId) != null ? _c : first.txId,
    to: (_d = payload.to) != null ? _d : first.to,
    value: (_e = payload.value) != null ? _e : first.value,
    data: (_f = payload.data) != null ? _f : first.data,
    chainId: (_g = payload.chainId) != null ? _g : first.chainId,
    calls
  });
}
function normalizeSolanaSignPayload(payload) {
  var _a, _b, _c, _d, _e, _f;
  const args = getToolArgs(payload);
  const unsignedTxRaw = (_a = args.unsigned_tx) != null ? _a : args.unsignedTx;
  const unsignedTx = typeof unsignedTxRaw === "string" ? unsignedTxRaw : void 0;
  const description = typeof args.description === "string" ? args.description : void 0;
  const cluster = normalizeSolanaCluster(args.cluster);
  const rawPendingIds = (_b = args.svm_tx_ids) != null ? _b : args.svm_ix_ids;
  const pendingSolanaIds = Array.isArray(rawPendingIds) ? rawPendingIds.map(parsePendingId).filter((id) => id !== void 0) : void 0;
  const pendingSolanaId = (_f = (_e = (_d = (_c = parsePendingId(args.pendingSolanaId)) != null ? _c : parsePendingId(args.pending_solana_id)) != null ? _d : parsePendingId(args.pendingSvmSigId)) != null ? _e : parsePendingId(args.pending_svm_sig_id)) != null ? _f : pendingSolanaIds == null ? void 0 : pendingSolanaIds[0];
  return {
    unsignedTx,
    description,
    cluster,
    pendingSolanaId,
    pendingSolanaIds
  };
}
function normalizeSolanaSignMessagePayload(payload) {
  var _a, _b, _c, _d, _e;
  const args = getToolArgs(payload);
  const messageRaw = (_b = (_a = args.message_base64) != null ? _a : args.messageBase64) != null ? _b : args.message;
  const message = typeof messageRaw === "string" ? messageRaw : void 0;
  const description = typeof args.description === "string" ? args.description : void 0;
  const cluster = normalizeSolanaCluster(args.cluster);
  const pendingSolanaId = (_e = (_d = (_c = parsePendingId(args.pendingSolanaId)) != null ? _c : parsePendingId(args.pending_solana_id)) != null ? _d : parsePendingId(args.pendingSvmSigId)) != null ? _e : parsePendingId(args.pending_svm_sig_id);
  return { message, description, cluster, pendingSolanaId };
}
function normalizeSolanaWalletRequest(payload) {
  var _a, _b, _c;
  const root = asRecord(payload);
  const args = getToolArgs(payload);
  const solanaRequest = __spreadValues(__spreadValues({}, root != null ? root : {}), args);
  const chainKind = (_c = (_b = (_a = parseChainKind(args.chain_kind)) != null ? _a : parseChainKind(args.chain_family)) != null ? _b : parseChainKind(root == null ? void 0 : root.chain_kind)) != null ? _c : parseChainKind(root == null ? void 0 : root.chain_family);
  if (chainKind !== "svm") {
    return null;
  }
  const kind = inferSolanaRequestKind(solanaRequest);
  if (kind === "solana_sign_message") {
    const normalized2 = normalizeSolanaSignMessagePayload(payload);
    return normalized2.message ? { kind, payload: normalized2 } : null;
  }
  const normalized = normalizeSolanaSignPayload(payload);
  return normalized.unsignedTx ? { kind, payload: normalized } : null;
}
function normalizeEip712Payload(payload) {
  var _a, _b, _c, _d, _e;
  const args = getToolArgs(payload);
  const typedDataRaw = (_b = (_a = args.typed_data) != null ? _a : args["712_typed_data"]) != null ? _b : args.typedData;
  const nonTypedData = parseString((_c = args.non_typed_data) != null ? _c : args.nonTypedData);
  let typedData;
  if (typeof typedDataRaw === "string") {
    try {
      const parsed = JSON.parse(typedDataRaw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        typedData = parsed;
      }
    } catch (e) {
      typedData = void 0;
    }
  } else if (typedDataRaw && typeof typedDataRaw === "object" && !Array.isArray(typedDataRaw)) {
    typedData = typedDataRaw;
  }
  const description = typeof args.description === "string" ? args.description : void 0;
  const eip712Id = (_e = (_d = parsePendingId(args.eip712Id)) != null ? _d : parsePendingId(args.pending_eip712_id)) != null ? _e : parsePendingId(args.pendingEip712Id);
  return {
    typed_data: typedData,
    non_typed_data: nonTypedData,
    description,
    eip712Id
  };
}
function toAAWalletCalls(payload, defaultChainId = 1) {
  var _a, _b;
  const calls = ((_a = payload.calls) == null ? void 0 : _a.length) ? payload.calls : payload.to ? [
    {
      txId: (_b = payload.txId) != null ? _b : 0,
      to: payload.to,
      value: payload.value,
      data: payload.data,
      chainId: payload.chainId
    }
  ] : [];
  if (calls.length === 0) {
    throw new Error("pending_transaction_missing_call_data");
  }
  return calls.map((call) => {
    var _a2, _b2, _c;
    return {
      to: call.to,
      value: BigInt((_a2 = call.value) != null ? _a2 : "0"),
      data: call.data ? call.data : void 0,
      chainId: (_c = (_b2 = call.chainId) != null ? _b2 : payload.chainId) != null ? _c : defaultChainId
    };
  });
}
function toAAWalletCall(payload, defaultChainId = 1) {
  return toAAWalletCalls(payload, defaultChainId)[0];
}
function toViemSignTypedDataArgs(payload) {
  var _a;
  const typedData = payload.typed_data;
  const primaryType = typeof (typedData == null ? void 0 : typedData.primaryType) === "string" && typedData.primaryType.trim().length > 0 ? typedData.primaryType : void 0;
  if (!typedData || !primaryType) {
    return null;
  }
  return {
    domain: asRecord(typedData.domain),
    types: Object.fromEntries(
      Object.entries((_a = typedData.types) != null ? _a : {}).filter(
        ([typeName]) => typeName !== "EIP712Domain"
      )
    ),
    primaryType,
    message: asRecord(typedData.message)
  };
}
function toViemSignMessageArgs(payload) {
  const nonTypedData = payload.non_typed_data;
  if (typeof nonTypedData !== "string" || nonTypedData.length === 0) {
    return null;
  }
  return {
    message: isHexBytes(nonTypedData) ? { raw: nonTypedData } : nonTypedData
  };
}

// src/chains.ts
import { defineChain } from "viem";
import {
  mainnet,
  polygon,
  arbitrum,
  optimism,
  base,
  baseSepolia,
  sepolia,
  linea,
  lineaSepolia,
  foundry
} from "viem/chains";
var monad = defineChain({
  id: 143,
  name: "Monad",
  nativeCurrency: {
    decimals: 18,
    name: "Monad",
    symbol: "MON"
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.monad.xyz"]
    }
  },
  blockExplorers: {
    default: {
      name: "Monad Explorer",
      url: "https://monadexplorer.com"
    }
  }
});
var monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Monad",
    symbol: "MON"
  },
  rpcUrls: {
    default: {
      http: ["https://testnet-rpc.monad.xyz"]
    }
  },
  blockExplorers: {
    default: {
      name: "Monad Testnet Explorer",
      url: "https://testnet.monadexplorer.com"
    }
  },
  testnet: true
});
var robinhood = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.mainnet.chain.robinhood.com"]
    }
  },
  blockExplorers: {
    default: {
      name: "Robinhood Chain Explorer",
      url: "https://robinhoodchain.blockscout.com"
    }
  }
});
var megaeth = defineChain({
  id: 4326,
  name: "MegaETH",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18
  },
  rpcUrls: {
    default: {
      http: ["https://mainnet.megaeth.com/rpc"]
    }
  },
  blockExplorers: {
    default: {
      name: "MegaETH Explorer",
      url: "https://mega.etherscan.io"
    }
  }
});
var arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    // Arc RPC quantities use 18-decimal native precision, but EIP-3085 chain
    // metadata uses USDC's 6 display decimals. Callers handling raw
    // eth_getBalance/msg.value must retain the 18-decimal internal boundary.
    decimals: 6
  },
  rpcUrls: {
    default: {
      http: [
        "https://rpc.testnet.arc.io",
        "https://rpc.drpc.testnet.arc.io",
        "https://rpc.quicknode.testnet.arc.io"
      ]
    }
  },
  blockExplorers: {
    default: {
      name: "ArcScan",
      url: "https://testnet.arcscan.app"
    }
  },
  testnet: true
});
var SUPPORTED_CHAINS = [
  { id: 1, name: "Ethereum", ticker: "ETH" },
  { id: 137, name: "Polygon", ticker: "MATIC" },
  { id: 42161, name: "Arbitrum", ticker: "ARB" },
  { id: 8453, name: "Base", ticker: "BASE" },
  { id: 84532, name: "Base Sepolia", ticker: "ETH" },
  { id: 10, name: "Optimism", ticker: "OP" },
  { id: 11155111, name: "Sepolia", ticker: "SEP" },
  { id: 59144, name: "Linea Mainnet", ticker: "LINEA" },
  { id: 59141, name: "Linea Sepolia Testnet", ticker: "LINEA" },
  { id: 143, name: "Monad", ticker: "MON" },
  { id: 10143, name: "Monad Testnet", ticker: "MON" },
  { id: 4663, name: "Robinhood Chain", ticker: "ETH" },
  { id: 4326, name: "MegaETH", ticker: "ETH" },
  { id: 5042002, name: "Arc Testnet", ticker: "USDC" },
  { id: 31337, name: "Anvil (local)", ticker: "ETH" }
];
var SUPPORTED_CHAIN_IDS = SUPPORTED_CHAINS.map((chain) => chain.id);
var CHAIN_NAMES = Object.fromEntries(
  SUPPORTED_CHAINS.map((chain) => [chain.id, chain.name])
);
var ALCHEMY_CHAIN_SLUGS = {
  1: "eth-mainnet",
  137: "polygon-mainnet",
  42161: "arb-mainnet",
  8453: "base-mainnet",
  84532: "base-sepolia",
  10: "opt-mainnet",
  11155111: "eth-sepolia",
  59144: "linea-mainnet",
  59141: "linea-sepolia",
  4663: "robinhood-mainnet",
  4326: "megaeth-mainnet"
};
var CHAINS_BY_ID = {
  1: mainnet,
  137: polygon,
  42161: arbitrum,
  10: optimism,
  8453: base,
  84532: baseSepolia,
  11155111: sepolia,
  59144: linea,
  59141: lineaSepolia,
  143: monad,
  10143: monadTestnet,
  4663: robinhood,
  4326: megaeth,
  5042002: arcTestnet,
  31337: foundry
};

// src/aa/execute.ts
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
var ERC20_PAYMENT_CONTEXT_KEYS = /* @__PURE__ */ new Set(["erc20", "paymasterAddress"]);
var AA_DEBUG_STORAGE_KEYS = ["aomi:debug-aa", "AOMI_DEBUG_AA"];
var PartialWalletExecutionError = class extends Error {
  constructor(error, completedTxHashes, failedCallIndex) {
    const failureReason = walletExecutionFailureReason(error);
    super(failureReason);
    this.name = "PartialWalletExecutionError";
    this.partial = {
      completedTxHashes: [...completedTxHashes],
      failedCallIndex,
      failureReason
    };
  }
};
function walletExecutionFailureReason(error) {
  if (error && typeof error === "object") {
    for (const field of ["details", "shortMessage"]) {
      const value = error[field];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }
  const message = error instanceof Error ? error.message : String(error);
  return message.split(/\n(?:\n|URL:|Request body:|Request Arguments:)/, 1)[0].trim();
}
function partialWalletExecution(error) {
  if (!error || typeof error !== "object" || !("partial" in error)) {
    return void 0;
  }
  const partial = error.partial;
  if (!partial || !Array.isArray(partial.completedTxHashes) || partial.completedTxHashes.length === 0 || !partial.completedTxHashes.every((hash) => typeof hash === "string") || !Number.isInteger(partial.failedCallIndex) || typeof partial.failureReason !== "string") {
    return void 0;
  }
  return partial;
}
function normalizeRpcCallData(data) {
  return data === "0x" ? void 0 : data;
}
function isAADebugEnabled() {
  const debugGlobal = globalThis;
  if (debugGlobal.__AOMI_DEBUG_AA === true) {
    return true;
  }
  try {
    return AA_DEBUG_STORAGE_KEYS.some((key) => {
      var _a;
      const value = (_a = debugGlobal.localStorage) == null ? void 0 : _a.getItem(key);
      return value === "1" || value === "true";
    });
  } catch (e) {
    return false;
  }
}
function debugAA(label, data) {
  if (!isAADebugEnabled()) return;
  console.info(`[aomi][aa][debug] ${label}`, data);
}
async function executeWalletCalls(params) {
  var _a, _b, _c;
  const {
    callList,
    currentChainId,
    capabilities,
    localPrivateKey,
    nativeWalletExecution,
    sendCallsSyncAsync,
    sendTransactionAsync,
    switchChainAsync,
    chainsById,
    getPreferredRpcUrl
  } = params;
  const hashes = [];
  const normalizedCalls = callList.map((call) => __spreadProps(__spreadValues({}, call), {
    data: normalizeRpcCallData(call.data)
  }));
  const requiresAtomicForBatch = Boolean(nativeWalletExecution == null ? void 0 : nativeWalletExecution.requiresAtomicForBatch) && normalizedCalls.length > 1;
  const nativeExecutionKind = (_a = nativeWalletExecution == null ? void 0 : nativeWalletExecution.executionKind) != null ? _a : "eoa";
  const sponsorship = nativeWalletExecution == null ? void 0 : nativeWalletExecution.sponsorship;
  const requiresSponsoredSendCalls = (sponsorship == null ? void 0 : sponsorship.mode) === "required";
  if (localPrivateKey) {
    if (requiresSponsoredSendCalls) {
      throw new Error("wallet_sponsorship_requires_send_calls");
    }
    if (requiresAtomicForBatch) {
      throw new Error("wallet_atomic_batch_required");
    }
    for (const [callIndex, call] of normalizedCalls.entries()) {
      try {
        const chain = chainsById[call.chainId];
        if (!chain) {
          throw new Error(`Unsupported chain ${call.chainId}`);
        }
        const rpcUrl = getPreferredRpcUrl(chain);
        if (!rpcUrl) {
          throw new Error(`No RPC for chain ${call.chainId}`);
        }
        const account = privateKeyToAccount(localPrivateKey);
        const walletClient = createWalletClient({
          account,
          chain,
          transport: http(rpcUrl)
        });
        const hash = await walletClient.sendTransaction({
          account,
          to: call.to,
          value: call.value,
          data: call.data
        });
        const publicClient = createPublicClient({
          chain,
          transport: http(rpcUrl)
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== "success") {
          throw new Error(`Transaction ${hash} reverted`);
        }
        hashes.push(hash);
      } catch (error) {
        if (hashes.length > 0) {
          throw new PartialWalletExecutionError(error, hashes, callIndex);
        }
        throw error;
      }
    }
    return {
      txHash: hashes[hashes.length - 1],
      txHashes: hashes,
      executionKind: "eoa",
      batched: normalizedCalls.length > 1,
      sponsored: false
    };
  }
  const chainIds = Array.from(
    new Set(normalizedCalls.map((call) => call.chainId))
  );
  if (chainIds.length > 1) {
    throw new Error("mixed_chain_bundle_not_supported");
  }
  const chainId3 = chainIds[0];
  if (currentChainId !== chainId3) {
    await switchChainAsync({ chainId: chainId3 });
  }
  const chainCaps = resolveChainCapabilities(capabilities, chainId3);
  const atomicStatus = (_b = chainCaps == null ? void 0 : chainCaps.atomic) == null ? void 0 : _b.status;
  const canUseAtomicSendCalls = normalizedCalls.length > 1 && (atomicStatus === "supported" || atomicStatus === "ready");
  const canUseSendCalls = canUseAtomicSendCalls || requiresSponsoredSendCalls;
  const sendCallsCapabilities = buildSendCallsCapabilities({
    chainCaps,
    nativeWalletExecution,
    requiresAtomicForBatch,
    canUseAtomicSendCalls
  });
  debugAA("native-wallet-sendCalls-plan", {
    callCount: normalizedCalls.length,
    chainId: chainId3,
    chainCaps,
    canUseAtomicSendCalls,
    canUseSendCalls,
    nativeExecutionKind,
    requiresAtomicForBatch,
    sponsorshipMode: (_c = sponsorship == null ? void 0 : sponsorship.mode) != null ? _c : "disabled",
    sendCallsCapabilities
  });
  const sendSequentially = async () => {
    if (requiresAtomicForBatch) {
      throw new Error("wallet_atomic_batch_required");
    }
    for (const call of normalizedCalls) {
      const hash = await sendTransactionAsync({
        chainId: call.chainId,
        to: call.to,
        value: call.value,
        data: call.data
      });
      hashes.push(hash);
    }
  };
  let usedPaymasterService = false;
  let usedSendCalls = false;
  if (canUseSendCalls) {
    try {
      const sendCallsArgs = {
        chainId: chainId3,
        calls: normalizedCalls.map(({ to, value, data }) => ({
          to,
          value,
          data
        })),
        capabilities: sendCallsCapabilities,
        forceAtomic: requiresAtomicForBatch,
        status: (result) => (result == null ? void 0 : result.status) === "success",
        throwOnFailure: true,
        timeout: nativeWalletExecution == null ? void 0 : nativeWalletExecution.sendCallsTimeoutMs,
        version: nativeWalletExecution == null ? void 0 : nativeWalletExecution.sendCallsVersion
      };
      debugAA("native-wallet-sendCalls-args", sendCallsArgs);
      const batchResult = await sendCallsSyncAsync(__spreadValues({}, sendCallsArgs));
      debugAA("native-wallet-sendCalls-result", batchResult);
      hashes.push(...extractBatchTransactionHashes(batchResult));
      usedPaymasterService = Boolean(sendCallsCapabilities == null ? void 0 : sendCallsCapabilities.paymasterService);
      usedSendCalls = true;
    } catch (error) {
      if (!canFallbackToSequentialWalletSends(error, requiresSponsoredSendCalls)) {
        throw error;
      }
      await sendSequentially();
    }
  } else {
    await sendSequentially();
  }
  const sponsoredResult = !usedSendCalls ? false : (sponsorship == null ? void 0 : sponsorship.mode) === "optional" ? void 0 : usedPaymasterService;
  return {
    txHash: hashes[hashes.length - 1],
    txHashes: hashes,
    executionKind: usedSendCalls ? nativeExecutionKind : "eoa",
    batched: normalizedCalls.length > 1,
    sponsored: sponsoredResult
  };
}
function extractBatchTransactionHashes(batchResult) {
  var _a;
  const receipts = (_a = batchResult.receipts) != null ? _a : [];
  const hashes = receipts.flatMap((receipt) => {
    var _a2;
    const hash = (_a2 = receipt.transactionHash) != null ? _a2 : receipt.hash;
    return hash ? [hash] : [];
  });
  if (hashes.length === 0) {
    throw new Error("wallet_send_calls_missing_transaction_hash");
  }
  return hashes;
}
function buildSendCallsCapabilities({
  chainCaps,
  nativeWalletExecution,
  requiresAtomicForBatch,
  canUseAtomicSendCalls
}) {
  var _a, _b;
  const capabilities = {};
  if (canUseAtomicSendCalls) {
    capabilities.atomic = requiresAtomicForBatch ? { required: true } : { optional: true };
  }
  const sponsorship = nativeWalletExecution == null ? void 0 : nativeWalletExecution.sponsorship;
  if ((sponsorship == null ? void 0 : sponsorship.mode) === "required") {
    if (!sponsorship.paymasterServiceUrl) {
      throw new Error("wallet_paymaster_service_url_required");
    }
    if (((_a = chainCaps == null ? void 0 : chainCaps.paymasterService) == null ? void 0 : _a.supported) !== true) {
      throw new Error("wallet_paymaster_service_unsupported");
    }
    const context = sanitizeSponsorshipPaymasterServiceContext(
      sponsorship.paymasterServiceContext
    );
    capabilities.paymasterService = {
      url: sponsorship.paymasterServiceUrl,
      context: context != null ? context : {}
    };
  } else if ((sponsorship == null ? void 0 : sponsorship.mode) === "optional" && sponsorship.paymasterServiceUrl && ((_b = chainCaps == null ? void 0 : chainCaps.paymasterService) == null ? void 0 : _b.supported) === true) {
    const context = sanitizeSponsorshipPaymasterServiceContext(
      sponsorship.paymasterServiceContext
    );
    capabilities.paymasterService = __spreadValues({
      url: sponsorship.paymasterServiceUrl,
      optional: true
    }, context ? { context } : {});
  }
  return Object.keys(capabilities).length > 0 ? capabilities : void 0;
}
function sanitizeSponsorshipPaymasterServiceContext(context) {
  if (!context) return void 0;
  const filteredEntries = Object.entries(context).filter(
    ([key]) => !ERC20_PAYMENT_CONTEXT_KEYS.has(key)
  );
  if (filteredEntries.length === Object.keys(context).length) {
    return context;
  }
  console.warn(
    "[aomi][aa] Ignoring ERC20 paymaster payment context on a sponsorship request"
  );
  const filteredContext = Object.fromEntries(
    filteredEntries
  );
  return Object.keys(filteredContext).length > 0 ? filteredContext : void 0;
}
function isUnsupportedAtomicCapabilityError(error) {
  const message = error instanceof Error ? error.message : String(error);
  const lowered = message.toLowerCase();
  return lowered.includes("unsupported non-optional capabilities: atomic") || lowered.includes("unsupported") && lowered.includes("atomic") || lowered.includes("wallet does not support") && lowered.includes("capabilit");
}
function isRecoverableOptionalPaymasterError(error) {
  const message = error instanceof Error ? error.message : String(error);
  const lowered = message.toLowerCase();
  return lowered.includes("paymaster") || lowered.includes("sponsor") || lowered.includes("erc-7677");
}
function canFallbackToSequentialWalletSends(error, requiresSponsoredSendCalls) {
  if (requiresSponsoredSendCalls) {
    return false;
  }
  return isUnsupportedAtomicCapabilityError(error) || isRecoverableOptionalPaymasterError(error);
}
function resolveChainCapabilities(capabilities, chainId3) {
  var _a, _b;
  if (!capabilities) {
    return void 0;
  }
  const asRecord2 = capabilities;
  const eip155Key = `eip155:${chainId3}`;
  const decimalKey = String(chainId3);
  const hexKey = `0x${chainId3.toString(16)}`;
  return (_b = (_a = asRecord2[eip155Key]) != null ? _a : asRecord2[decimalKey]) != null ? _b : asRecord2[hexKey];
}

// src/aa/fee.ts
import { getAddress as getAddress3 } from "viem";
var MAX_AUTO_FEE_WEI = BigInt("50000000000000000");
var ZERO_WEI = BigInt("0");
function toPayloadCalls(payload, defaultChainId) {
  var _a, _b;
  if (Array.isArray(payload.calls) && payload.calls.length > 0) {
    return payload.calls;
  }
  if (!payload.to) {
    throw new Error("pending_transaction_missing_call_data");
  }
  return [
    {
      txId: (_a = payload.txId) != null ? _a : 0,
      to: payload.to,
      value: payload.value,
      data: payload.data,
      chainId: (_b = payload.chainId) != null ? _b : defaultChainId
    }
  ];
}
function normalizeSimulatedFee(fee) {
  const amountWei = BigInt(fee.amount_wei);
  if (amountWei === ZERO_WEI) {
    return null;
  }
  if (amountWei < ZERO_WEI) {
    throw new Error(`Invalid fee amount: ${fee.amount_wei}`);
  }
  if (amountWei > MAX_AUTO_FEE_WEI) {
    throw new Error("fee_exceeds_safety_limit");
  }
  return {
    recipient: getAddress3(fee.recipient),
    amountWei
  };
}
function buildFeeAAWalletCall(fee, chainId3) {
  const normalizedFee = normalizeSimulatedFee(fee);
  if (!normalizedFee) {
    return null;
  }
  return {
    to: normalizedFee.recipient,
    value: normalizedFee.amountWei,
    chainId: chainId3
  };
}
function appendFeeCallToPayload(payload, fee, defaultChainId, options) {
  var _a, _b;
  const feeCall = normalizeSimulatedFee(fee);
  if (!feeCall) {
    return payload;
  }
  const calls = toPayloadCalls(payload, defaultChainId);
  const forceAaPreference = (_a = options == null ? void 0 : options.forceAaPreference) != null ? _a : "eip7702";
  const strictAa = (_b = options == null ? void 0 : options.strictAa) != null ? _b : true;
  return __spreadProps(__spreadValues({}, payload), {
    // Fee call must be the final call in the AA batch.
    calls: [
      ...calls,
      {
        txId: 0,
        to: feeCall.recipient,
        value: feeCall.amountWei.toString(),
        chainId: defaultChainId
      }
    ],
    // Force AA mode once fee is appended so single user tx + fee still batches via AA.
    aaPreference: forceAaPreference,
    // Do not silently downgrade fee-injected batch requests to EOA.
    aaStrict: strictAa
  });
}
export {
  ALCHEMY_CHAIN_SLUGS,
  AOMI_TASK_EVENT_TYPES,
  AccountCredentialUnavailableError,
  AgentApiError,
  AgentTransport,
  AomiClient,
  CHAINS_BY_ID,
  CHAIN_NAMES,
  CLIENT_TYPE_TS_CLI,
  CLIENT_TYPE_WEB_UI,
  MAX_AUTO_FEE_WEI,
  PartialWalletExecutionError,
  PipelineApiError,
  PipelineTransport,
  SUPPORTED_CHAINS,
  SUPPORTED_CHAIN_IDS,
  ClientSession as Session,
  TypedEventEmitter,
  UserState,
  WidgetChallengeBindingError,
  aaModeFromExecutionKind,
  appIdentityKey,
  appendFeeCallToPayload,
  arcTestnet,
  authorizationChallenge,
  authorizationCommit,
  buildFeeAAWalletCall,
  buildSiwsMessage,
  createAccountBearerProvider,
  createGuestSessionProvider,
  createOAuthTokenProvider,
  createProviderCredentialAdapter,
  createSiweWidgetAuthAdapter,
  createSiwsWidgetAuthAdapter,
  createWidgetSessionProvider,
  ensureSvmWalletBound,
  ensureSvmWalletBoundVia,
  executeWalletCalls,
  handlePaymentChallenges,
  hydrateTxPayloadFromUserState,
  isAomiTaskEventType,
  isUnboundWalletError,
  megaeth,
  monad,
  monadTestnet,
  normalizeAppDescriptor,
  normalizeEip712Payload,
  normalizeSimulatedFee,
  normalizeSolanaCluster,
  normalizeSolanaSignMessagePayload,
  normalizeSolanaSignPayload,
  normalizeSolanaWalletRequest,
  normalizeTxPayload,
  parseAomiTaskEvent,
  parseChainId3 as parseChainId,
  partialWalletExecution,
  posterFromClient,
  robinhood,
  safeEnv,
  secretNamesFrom,
  toAAWalletCall,
  toAAWalletCalls,
  toViemSignMessageArgs,
  toViemSignTypedDataArgs,
  wrapFetchWithPaymentChallenges
};
//# sourceMappingURL=index.js.map