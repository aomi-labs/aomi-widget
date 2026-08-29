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
  start(intent, options = {}) {
    return this.json("POST", "/v1/agent/chat", {
      headers: mutationHeaders(options),
      body: intent
    });
  }
  poll(sessionId, options = {}) {
    var _a;
    return this.json("GET", `/v1/agent/chat/${encodeURIComponent(sessionId)}`, {
      query: {
        cursor: options.cursor,
        wait: Math.min(Math.max((_a = options.waitMs) != null ? _a : 0, 0), 3e4)
      }
    });
  }
  interrupt(sessionId, turnId, idempotencyKey = randomIdempotencyKey()) {
    return this.json(
      "POST",
      `/v1/agent/chat/${encodeURIComponent(sessionId)}/interrupt`,
      {
        headers: { "idempotency-key": idempotencyKey },
        body: { turnId }
      }
    );
  }
  async respondToAction(sessionId, actionId, revision, result, idempotencyKey = randomIdempotencyKey()) {
    const response = await this.json(
      "POST",
      `/v1/agent/chat/${encodeURIComponent(sessionId)}/actions/${encodeURIComponent(actionId)}/result`,
      {
        headers: { "idempotency-key": idempotencyKey },
        body: { revision, result }
      }
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
  list(options = {}) {
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
    return this.json("GET", `/v1/agent/sessions/${encodeURIComponent(sessionId)}`);
  }
  update(sessionId, patch) {
    return this.json("PATCH", `/v1/agent/sessions/${encodeURIComponent(sessionId)}`, {
      headers: mutationHeaders(),
      body: patch
    });
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
    return parseAgentResponse(await this.requestResponse(method, path, options));
  }
};
function mutationHeaders(options = {}) {
  var _a;
  return __spreadValues({
    "idempotency-key": (_a = options.idempotencyKey) != null ? _a : randomIdempotencyKey()
  }, options.paymentSignature ? { "payment-signature": options.paymentSignature } : {});
}
function randomIdempotencyKey() {
  var _a, _b, _c;
  return (_c = (_b = (_a = globalThis.crypto) == null ? void 0 : _a.randomUUID) == null ? void 0 : _b.call(_a)) != null ? _c : `agent_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
async function parseAgentResponse(response) {
  var _a;
  if (response.ok) {
    if (response.status === 204) return void 0;
    return await response.json();
  }
  let body;
  try {
    body = await response.json();
  } catch (e) {
  }
  const raw = body == null ? void 0 : body.error;
  const code = typeof raw === "string" ? raw : typeof raw === "object" && raw !== null && "code" in raw ? String(raw.code) : "agent_request_failed";
  throw new AgentApiError(
    response.status,
    code,
    code.replaceAll("_", " "),
    response.status === 408 || response.status === 429 || response.status >= 500,
    (_a = response.headers.get("x-request-id")) != null ? _a : void 0,
    raw
  );
}

// src/pipeline/schema.ts
var PipelineSchemaError = class extends TypeError {
  constructor(path, message) {
    super(`${path}: ${message}`);
    this.path = path;
    this.name = "PipelineSchemaError";
  }
};
function validatePipelineArguments(value, schema) {
  validate(value, schema, "$arguments");
}
function validate(value, schema, path) {
  var _a;
  if (schema === true) return;
  if (schema === false) throw new PipelineSchemaError(path, "is not allowed");
  const variants = (_a = schema.oneOf) != null ? _a : schema.anyOf;
  if (Array.isArray(variants) && variants.length > 0) {
    const accepted = variants.some((variant) => {
      if (!isSchema(variant)) return false;
      try {
        validate(value, variant, path);
        return true;
      } catch (error) {
        if (error instanceof PipelineSchemaError) return false;
        throw error;
      }
    });
    if (!accepted) {
      throw new PipelineSchemaError(path, "does not match an accepted shape");
    }
    return;
  }
  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    throw new PipelineSchemaError(path, "is not an allowed value");
  }
  const type = schema.type;
  if (typeof type === "string" && !matchesType(value, type)) {
    throw new PipelineSchemaError(path, `must be ${article(type)}${type}`);
  }
  if (type === "object" || schema.properties || schema.required) {
    if (!isRecord(value)) {
      throw new PipelineSchemaError(path, "must be an object");
    }
    const required2 = Array.isArray(schema.required) ? schema.required.filter(
      (item) => typeof item === "string"
    ) : [];
    for (const key of required2) {
      if (!(key in value)) {
        throw new PipelineSchemaError(`${path}.${key}`, "is required");
      }
    }
    if (isRecord(schema.properties)) {
      for (const [key, childSchema] of Object.entries(schema.properties)) {
        if (key in value && isSchema(childSchema)) {
          validate(value[key], childSchema, `${path}.${key}`);
        }
      }
    }
  }
  if (type === "array" && Array.isArray(value) && isSchema(schema.items)) {
    value.forEach(
      (item, index) => validate(item, schema.items, `${path}[${index}]`)
    );
  }
}
function matchesType(value, type) {
  switch (type) {
    case "null":
      return value === null;
    case "array":
      return Array.isArray(value);
    case "object":
      return isRecord(value);
    case "integer":
      return typeof value === "number" && Number.isInteger(value);
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "string":
      return typeof value === "string";
    case "boolean":
      return typeof value === "boolean";
    default:
      return true;
  }
}
function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function isSchema(value) {
  return typeof value === "boolean" || isRecord(value);
}
function article(value) {
  return /^[aeiou]/i.test(value) ? "an " : "a ";
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
var EvmPipelineTransport = class {
  constructor(requestResponse) {
    this.requestResponse = requestResponse;
  }
  build(input) {
    return json(this.requestResponse, "POST", "/v1/pipeline/evm/build", {
      body: jsonBody(input)
    });
  }
  stage(input) {
    return json(this.requestResponse, "POST", "/v1/pipeline/evm/stage", {
      body: jsonBody(input)
    });
  }
  simulate(build) {
    return json(this.requestResponse, "POST", "/v1/pipeline/evm/simulate", {
      body: { build: jsonBody(build) }
    });
  }
  commit(build, options = {}) {
    return json(this.requestResponse, "POST", "/v1/pipeline/evm/commit", {
      headers: commitHeaders(build.digest, options),
      body: { build: jsonBody(build) }
    });
  }
};
var SvmPipelineTransport = class {
  constructor(requestResponse) {
    this.requestResponse = requestResponse;
  }
  build(input) {
    return json(this.requestResponse, "POST", "/v1/pipeline/svm/build", {
      body: jsonBody(input)
    });
  }
  stage(input) {
    return json(this.requestResponse, "POST", "/v1/pipeline/svm/stage", {
      body: jsonBody(input)
    });
  }
  simulate(build) {
    return json(this.requestResponse, "POST", "/v1/pipeline/svm/simulate", {
      body: { build: jsonBody(build) }
    });
  }
  commit(build, options = {}) {
    return json(this.requestResponse, "POST", "/v1/pipeline/svm/commit", {
      headers: commitHeaders(build.digest, options),
      body: { build: jsonBody(build) }
    });
  }
};
var PipelineOperationTransport = class {
  constructor(requestResponse, scope, owner) {
    this.requestResponse = requestResponse;
    this.href = `/v1/pipeline/${scope}/${encodeURIComponent(required("name", owner))}`;
  }
  directory() {
    return json(this.requestResponse, "GET", this.href);
  }
  operations() {
    return json(this.requestResponse, "GET", `${this.href}/operations`);
  }
  operation(name) {
    return json(
      this.requestResponse,
      "GET",
      `${this.href}/operations/${encodeURIComponent(required("operation", name))}`
    );
  }
  invoke(name, args, options) {
    return invokeOperation(
      this.requestResponse,
      `${this.href}/operations/${encodeURIComponent(required("operation", name))}`,
      args,
      options
    );
  }
};
var PipelineSkillTransport = class extends PipelineOperationTransport {
  constructor(skillRequestResponse, skill) {
    super(skillRequestResponse, "skills", skill);
    this.skillRequestResponse = skillRequestResponse;
  }
  async instructions() {
    const response = await this.skillRequestResponse(
      "GET",
      `${this.href}/SKILL.md`,
      { headers: { accept: "text/markdown" } }
    );
    if (!response.ok) throw await pipelineError(response);
    return response.text();
  }
};
var PipelineAppsTransport = class {
  constructor(requestResponse) {
    this.requestResponse = requestResponse;
  }
  list() {
    return json(this.requestResponse, "GET", "/v1/pipeline/apps");
  }
  get(app) {
    return new PipelineOperationTransport(this.requestResponse, "apps", app);
  }
};
var PipelineSkillsTransport = class {
  constructor(requestResponse) {
    this.requestResponse = requestResponse;
  }
  list() {
    return json(this.requestResponse, "GET", "/v1/pipeline/skills");
  }
  get(skill) {
    return new PipelineSkillTransport(this.requestResponse, skill);
  }
};
var PipelineTransport = class {
  constructor(requestResponse) {
    this.requestResponse = requestResponse;
    this.evm = new EvmPipelineTransport(requestResponse);
    this.svm = new SvmPipelineTransport(requestResponse);
    this.apps = new PipelineAppsTransport(requestResponse);
    this.skills = new PipelineSkillsTransport(requestResponse);
  }
  root() {
    return json(this.requestResponse, "GET", "/v1/pipeline");
  }
  read(path = "/v1/pipeline") {
    return json(this.requestResponse, "GET", pipelinePath(path));
  }
  app(name) {
    return this.apps.get(name);
  }
  skill(name) {
    return this.skills.get(name);
  }
  invoke(path, args, options) {
    return invokeOperation(
      this.requestResponse,
      operationPath(path),
      args,
      options
    );
  }
};
async function invokeOperation(requestResponse, path, args, options = {}) {
  if (options.validate !== false) {
    const descriptor = await json(
      requestResponse,
      "GET",
      path
    );
    validatePipelineArguments(args, descriptor.inputSchema);
  }
  return json(requestResponse, "POST", path, {
    headers: mutationHeaders2(options),
    body: jsonBody(args)
  });
}
async function json(requestResponse, method, path, options) {
  return parsePipelineResponse(await requestResponse(method, path, options));
}
async function parsePipelineResponse(response) {
  if (response.ok) {
    if (response.status === 204) return void 0;
    return await response.json();
  }
  throw await pipelineError(response);
}
async function pipelineError(response) {
  var _a, _b, _c, _d;
  const body = await response.json().catch(() => null);
  const error = asRecord(body == null ? void 0 : body.error);
  return new PipelineApiError(
    response.status,
    (_a = stringValue(error == null ? void 0 : error.code)) != null ? _a : "pipeline_request_failed",
    (_b = stringValue(error == null ? void 0 : error.message)) != null ? _b : `Pipeline request failed with HTTP ${response.status}`,
    response.status === 408 || response.status === 429 || response.status >= 500,
    (_d = (_c = stringValue(error == null ? void 0 : error.requestId)) != null ? _c : response.headers.get("x-request-id")) != null ? _d : void 0,
    error == null ? void 0 : error.details
  );
}
function jsonBody(value) {
  return normalizeJson(value);
}
function normalizeJson(value) {
  if (typeof value === "bigint") return value.toString(10);
  if (Array.isArray(value)) return value.map(normalizeJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, normalizeJson(item)])
    );
  }
  return value;
}
function required(name, value) {
  const normalized = value.trim();
  if (!normalized) throw new TypeError(`${name} is required`);
  return normalized;
}
function pipelinePath(path) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const full = normalized.startsWith("/v1/pipeline") ? normalized : `/v1/pipeline${normalized}`;
  if (full !== "/v1/pipeline" && !full.startsWith("/v1/pipeline/")) {
    throw new TypeError("path must resolve beneath /v1/pipeline");
  }
  return full.replace(/\/+$/, "");
}
function operationPath(path) {
  const full = pipelinePath(path);
  if (!/\/operations\/[^/]+$/.test(full)) {
    throw new TypeError("operation path must end in /operations/{operation}");
  }
  return full;
}
function commitHeaders(digest, options) {
  var _a;
  return mutationHeaders2(__spreadProps(__spreadValues({}, options), {
    idempotencyKey: (_a = options.idempotencyKey) != null ? _a : digest
  }));
}
function mutationHeaders2(options) {
  var _a;
  return __spreadValues({
    "idempotency-key": required(
      "idempotencyKey",
      (_a = options.idempotencyKey) != null ? _a : randomIdempotencyKey2()
    )
  }, options.paymentSignature ? { "payment-signature": options.paymentSignature } : {});
}
function randomIdempotencyKey2() {
  return `idem_${globalThis.crypto.randomUUID().replaceAll("-", "")}`;
}
function asRecord(value) {
  return typeof value === "object" && value !== null ? value : void 0;
}
function stringValue(value) {
  return typeof value === "string" ? value : void 0;
}

// src/guest-auth.ts
function createGuestSessionProvider(input) {
  var _a;
  const fetchImpl = (_a = input.fetch) != null ? _a : globalThis.fetch.bind(globalThis);
  let credential = null;
  let pending = null;
  const provider2 = async (options) => {
    if (options == null ? void 0 : options.forceRefresh) credential = null;
    if (credential) return credential;
    pending != null ? pending : pending = signInAnonymous(fetchImpl, input.baseUrl).finally(() => {
      pending = null;
    });
    credential = await pending;
    return credential;
  };
  return Object.assign(provider2, {
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
  async saveByokKey(sessionId, provider2, byokKey, label) {
    const url = joinApiPath(this.baseUrl, "/api/account/payment/byok");
    const response = await this.fetchImpl(url, {
      method: "POST",
      headers: withSessionHeader(sessionId, {
        "Content-Type": "application/json"
      }),
      body: JSON.stringify({
        provider: provider2,
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
  async deleteByokKey(sessionId, provider2) {
    const url = buildApiUrl(
      this.baseUrl,
      `/api/account/payment/byok/${encodeURIComponent(provider2)}`
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

// src/actions/capabilities.ts
function canExecute(action, capabilities) {
  return Boolean(capabilities[action.request.type]);
}
function execute(action, capabilities, signal) {
  switch (action.request.type) {
    case "execute_evm": {
      const capability = capabilities.execute_evm;
      if (!capability) throw unsupported(action);
      return capability(action.request, signal);
    }
    case "execute_svm": {
      const capability = capabilities.execute_svm;
      if (!capability) throw unsupported(action);
      return capability(action.request, signal);
    }
    case "sign": {
      const capability = capabilities.sign;
      if (!capability) throw unsupported(action);
      return capability(action.request, signal);
    }
  }
}
function unsupported(action) {
  return new Error(
    `No capability is configured for Action "${action.request.type}"`
  );
}

// src/actions/action-handler.ts
var ActionHandler = class extends TypedEventEmitter {
  constructor(capabilities, respond) {
    super();
    this.capabilities = capabilities;
    this.respond = respond;
    this.actions = /* @__PURE__ */ new Map();
    this.attempts = /* @__PURE__ */ new Map();
    this.snapshot = [];
  }
  ingest(action) {
    const previous = this.actions.get(action.id);
    if (previous && previous.revision >= action.revision) return false;
    this.actions.set(action.id, action);
    const attempt = this.attempts.get(action.id);
    if (attempt && (action.revision > attempt.revision || action.state !== "pending")) {
      attempt.controller.abort();
      this.attempts.delete(action.id);
      this.emit("attempt_changed", void 0);
    }
    this.snapshot = [...this.actions.values()].sort(
      (left, right) => left.sequence - right.sequence
    );
    this.emit("changed", this.snapshot);
    return true;
  }
  get(id) {
    return this.actions.get(id);
  }
  all() {
    return this.snapshot;
  }
  allAttempts() {
    return new Map(
      [...this.attempts].map(([id, attempt]) => [id, publicAttempt(attempt)])
    );
  }
  pending() {
    return this.all().filter((action) => action.state === "pending");
  }
  attempt(id) {
    const attempt = this.attempts.get(id);
    if (!attempt) return void 0;
    return publicAttempt(attempt);
  }
  isBlocking() {
    return this.pending().length > 0 || this.attempts.size > 0;
  }
  subscribe(listener) {
    const actions = this.on("changed", listener);
    const attempts = this.on("attempt_changed", listener);
    return () => {
      actions();
      attempts();
    };
  }
  setCapabilities(capabilities) {
    this.capabilities = capabilities;
  }
  canExecute(id) {
    const action = this.actions.get(id);
    return Boolean(
      action && action.state === "pending" && canExecute(action, this.capabilities)
    );
  }
  execute(id) {
    const current = this.attempts.get(id);
    if (current == null ? void 0 : current.promise) return current.promise;
    if (current == null ? void 0 : current.result)
      return this.sendResult(this.pendingAction(id), current);
    const action = this.pendingAction(id);
    const attempt = {
      actionId: action.id,
      revision: action.revision,
      state: "executing",
      controller: new AbortController(),
      idempotencyKey: crypto.randomUUID()
    };
    this.attempts.set(id, attempt);
    this.emit("attempt_changed", publicAttempt(attempt));
    return this.track(action.id, attempt, async () => {
      try {
        const result = await execute(
          action,
          this.capabilities,
          attempt.controller.signal
        );
        attempt.result = result;
        return await this.respondWithResult(action, attempt);
      } catch (error) {
        this.fail(attempt, error);
        throw error;
      }
    });
  }
  submitResult(id, result) {
    const current = this.attempts.get(id);
    if (current == null ? void 0 : current.promise) return current.promise;
    const action = this.pendingAction(id);
    const attempt = current != null ? current : {
      actionId: action.id,
      revision: action.revision,
      state: "responding",
      controller: new AbortController(),
      idempotencyKey: crypto.randomUUID()
    };
    attempt.result = result;
    this.attempts.set(id, attempt);
    return this.sendResult(action, attempt);
  }
  reject(id, reason = "Request rejected") {
    return this.submitResult(id, { status: "rejected", reason });
  }
  retry(id) {
    const attempt = this.attempts.get(id);
    return (attempt == null ? void 0 : attempt.result) ? this.sendResult(this.pendingAction(id), attempt) : this.execute(id);
  }
  abort(id) {
    const attempt = this.attempts.get(id);
    if (!attempt) return;
    attempt.controller.abort();
    this.attempts.delete(id);
    this.emit("attempt_changed", void 0);
  }
  close() {
    for (const attempt of this.attempts.values()) attempt.controller.abort();
    this.attempts.clear();
    this.actions.clear();
    this.snapshot = [];
    this.removeAllListeners();
  }
  sendResult(action, attempt) {
    if (attempt.promise) return attempt.promise;
    return this.track(action.id, attempt, async () => {
      try {
        return await this.respondWithResult(action, attempt);
      } catch (error) {
        this.fail(attempt, error);
        throw error;
      }
    });
  }
  respondWithResult(action, attempt) {
    if (!attempt.result) throw new Error(`Action "${action.id}" has no result`);
    attempt.state = "responding";
    attempt.error = void 0;
    this.emit("attempt_changed", publicAttempt(attempt));
    return this.respond(action, attempt.result, attempt.idempotencyKey).then((next) => {
      this.ingest(next);
      this.emit("resolved", next);
      return next;
    });
  }
  track(id, attempt, operation) {
    const promise = operation();
    attempt.promise = promise;
    const clear = () => {
      if (this.attempts.get(id) === attempt) attempt.promise = void 0;
    };
    void promise.then(clear, clear);
    return promise;
  }
  fail(attempt, error) {
    if (this.attempts.get(attempt.actionId) !== attempt) return;
    attempt.state = "failed";
    attempt.error = error;
    this.emit("attempt_changed", publicAttempt(attempt));
  }
  pendingAction(id) {
    const action = this.actions.get(id);
    if (!action || action.state !== "pending") {
      throw new Error(`No pending Action with id "${id}"`);
    }
    return action;
  }
};
function publicAttempt(attempt) {
  return __spreadValues({
    actionId: attempt.actionId,
    revision: attempt.revision,
    state: attempt.state
  }, attempt.error === void 0 ? {} : { error: attempt.error });
}

// src/authorization.ts
function createOAuthTokenProvider(input) {
  var _a, _b;
  let current = (_a = input.initial) != null ? _a : null;
  let pending = null;
  const now = (_b = input.now) != null ? _b : Date.now;
  const provider2 = async (request) => {
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
  return Object.assign(provider2, {
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
  const signature2 = await signMessage(base64ToBytes(challenge.message_base64));
  try {
    return {
      status: "bound",
      state: await authorizationCommit(post, {
        permit: challenge.permit,
        signature: bytesToBase64(signature2)
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

// src/aa/policy.ts
function aaModeFromExecutionKind(executionKind) {
  if (!executionKind) return void 0;
  if (executionKind.endsWith("_4337")) return "4337";
  if (executionKind.endsWith("_7702")) return "7702";
  if (executionKind === "eoa") return "none";
  return void 0;
}

// src/session/index.ts
var TERMINAL_TURN_STATES = /* @__PURE__ */ new Set([
  "complete",
  "interrupted",
  "failed"
]);
var TERMINAL_EVENT_DRAIN_MS = 6e4;
var ClientSession = class {
  constructor(clientOrOptions, sessionOptions) {
    this.pollTimer = null;
    this.pollingActive = false;
    this.pollInFlight = false;
    this.pollFailureCount = 0;
    this.awaitingResume = false;
    this.isSubmitting = false;
    this.events = [];
    this.eventIds = /* @__PURE__ */ new Set();
    this.messages = [];
    this.closed = false;
    this.pendingResolve = null;
    this.listeners = /* @__PURE__ */ new Set();
    this.actionUnsubscribers = [];
    this.applyingPage = false;
    this.getSnapshot = () => this.snapshot;
    this.subscribe = (listener) => {
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    };
    this.handleVisibilityChange = () => {
      if (typeof document !== "undefined" && !document.hidden && !this.pollInFlight) {
        this.schedulePoll(0);
      }
    };
    var _a, _b, _c, _d, _e;
    this.client = clientOrOptions instanceof AomiClient ? clientOrOptions : new AomiClient(clientOrOptions);
    this.sessionId = (_a = sessionOptions == null ? void 0 : sessionOptions.sessionId) != null ? _a : crypto.randomUUID();
    this.app = (_b = sessionOptions == null ? void 0 : sessionOptions.app) != null ? _b : "default";
    this.model = sessionOptions == null ? void 0 : sessionOptions.model;
    this.applicationId = sessionOptions == null ? void 0 : sessionOptions.applicationId;
    this.getUserState = sessionOptions == null ? void 0 : sessionOptions.getUserState;
    this.clientId = (_c = sessionOptions == null ? void 0 : sessionOptions.clientId) != null ? _c : crypto.randomUUID();
    this.pollIntervalMs = (_d = sessionOptions == null ? void 0 : sessionOptions.pollIntervalMs) != null ? _d : 500;
    this.logger = sessionOptions == null ? void 0 : sessionOptions.logger;
    this.actions = new ActionHandler(
      (_e = sessionOptions == null ? void 0 : sessionOptions.actions) != null ? _e : {},
      (action, result, idempotencyKey) => this.client.agent.respondToAction(
        this.sessionId,
        action.id,
        action.revision,
        result,
        idempotencyKey
      )
    );
    this.snapshot = this.buildSnapshot();
    this.actionUnsubscribers.push(
      this.actions.subscribe(() => {
        if (!this.applyingPage) this.publish();
      }),
      this.actions.on("resolved", () => {
        this.awaitingResume = true;
        this.startPolling();
      })
    );
  }
  async send(message) {
    const page = await this.submit(message);
    if (this.isTerminal()) {
      this.drainTerminalPage(page);
      return this.result();
    }
    if (this.turnState !== "awaiting_action" || page.has_more) {
      this.startPolling();
    }
    return new Promise((resolve) => {
      this.pendingResolve = resolve;
    });
  }
  async sendAsync(message) {
    const page = await this.submit(message);
    if (this.isTerminal()) {
      this.drainTerminalPage(page);
      return page;
    }
    if (this.turnState !== "awaiting_action" || page.has_more) {
      this.startPolling();
    }
    return page;
  }
  async interrupt() {
    if (!this.turnId) throw new Error("No active turn to interrupt");
    this.stopPolling();
    this.applyEventPage(
      await this.client.agent.interrupt(this.sessionId, this.turnId)
    );
    if (this.isTerminal()) this.finish();
  }
  syncRuntimeOptions(options) {
    var _a;
    this.app = options.app;
    this.model = options.model;
    this.applicationId = options.applicationId;
    this.clientId = (_a = options.clientId) != null ? _a : this.clientId;
    this.getUserState = options.getUserState;
    if (options.actions) this.actions.setCapabilities(options.actions);
  }
  async sync() {
    this.assertOpen();
    return this.fetchPage();
  }
  async fetchCurrentState() {
    const page = await this.sync();
    if (this.isTerminal()) this.finish();
    else if (this.turnState && this.turnState !== "awaiting_action") {
      this.startPolling();
    }
    if (page.has_more) this.startPolling();
  }
  startPolling() {
    var _a;
    if (this.pollingActive || this.closed) return;
    this.pollingActive = true;
    (_a = this.logger) == null ? void 0 : _a.debug("[session] polling started", this.sessionId);
    if (typeof document !== "undefined") {
      document.addEventListener(
        "visibilitychange",
        this.handleVisibilityChange
      );
    }
    this.publish();
    this.schedulePoll(0);
  }
  stopPolling() {
    var _a;
    if (!this.pollingActive && !this.pollTimer) return;
    this.pollingActive = false;
    if (this.pollTimer) clearTimeout(this.pollTimer);
    this.pollTimer = null;
    if (typeof document !== "undefined") {
      document.removeEventListener(
        "visibilitychange",
        this.handleVisibilityChange
      );
    }
    (_a = this.logger) == null ? void 0 : _a.debug("[session] polling stopped", this.sessionId);
    this.publish();
  }
  close() {
    if (this.closed) return;
    this.closed = true;
    this.stopPolling();
    this.resolvePending();
    for (const unsubscribe of this.actionUnsubscribers) unsubscribe();
    this.actionUnsubscribers = [];
    this.actions.close();
    this.listeners.clear();
  }
  async submit(message) {
    var _a, _b;
    this.assertOpen();
    const text = message.trim();
    if (!text) throw new TypeError("message is required");
    const applicationId = Number(this.applicationId);
    const operation = ((_a = this.startOperation) == null ? void 0 : _a.message) === text ? this.startOperation : {
      message: text,
      idempotencyKey: `idem_${crypto.randomUUID().replaceAll("-", "")}`
    };
    this.startOperation = operation;
    this.awaitingResume = false;
    this.terminalDrainUntil = void 0;
    this.isSubmitting = true;
    this.error = void 0;
    this.publish();
    try {
      const state = (_b = this.getUserState) == null ? void 0 : _b.call(this);
      const page = await this.client.agent.start(
        __spreadValues(__spreadValues(__spreadValues({
          sessionId: this.sessionId,
          clientId: this.clientId,
          message: text
        }, Number.isSafeInteger(applicationId) && applicationId > 0 ? { applicationId } : { app: this.app }), this.model ? { model: this.model } : {}), state ? {
          userState: state
        } : {}),
        { idempotencyKey: operation.idempotencyKey }
      );
      this.startOperation = void 0;
      this.applyEventPage(page);
      return page;
    } catch (error) {
      this.error = error;
      if (error instanceof AgentApiError && !error.retryable) {
        this.startOperation = void 0;
      }
      throw error;
    } finally {
      this.isSubmitting = false;
      this.publish();
    }
  }
  async fetchPage(waitMs = 0) {
    try {
      const page = await this.client.agent.poll(this.sessionId, {
        cursor: this.cursor,
        waitMs
      });
      this.applyEventPage(page);
      return page;
    } catch (error) {
      if (!(error instanceof AgentApiError) || error.code !== "invalid_cursor") {
        throw error;
      }
      this.cursor = void 0;
      const page = await this.client.agent.poll(this.sessionId);
      this.applyEventPage(page);
      return page;
    }
  }
  applyEventPage(page) {
    var _a;
    if (page.session_id !== this.sessionId) {
      throw new TypeError("Agent response session does not match the request");
    }
    this.applyingPage = true;
    try {
      for (const event of page.events) {
        if (this.eventIds.has(event.event_id)) continue;
        const previous = this.events.at(-1);
        if (previous && event.sequence <= previous.sequence) {
          throw new TypeError("Agent events are not monotonically ordered");
        }
        this.eventIds.add(event.event_id);
        this.events.push(event);
        this.turnId = (_a = event.turn_id) != null ? _a : this.turnId;
        switch (event.type) {
          case "message":
            this.applyMessage(event);
            break;
          case "turn_state_changed":
            this.turnState = event.state;
            if (event.state !== "awaiting_action") {
              this.awaitingResume = false;
            }
            break;
          case "title_changed":
            this.title = event.title;
            break;
          case "action":
            this.actions.ingest(event);
            break;
        }
      }
      this.cursor = page.cursor;
      this.error = void 0;
    } finally {
      this.applyingPage = false;
    }
    this.publish();
  }
  applyMessage(event) {
    var _a;
    const key = (_a = event.message_key) != null ? _a : event.event_id;
    const index = this.messages.findIndex(
      (message) => {
        var _a2;
        return ((_a2 = message.message_key) != null ? _a2 : message.event_id) === key;
      }
    );
    if (index >= 0) this.messages[index] = event;
    else this.messages.push(event);
  }
  async pollTick() {
    var _a;
    if (!this.pollingActive || this.pollInFlight) return;
    this.pollTimer = null;
    this.pollInFlight = true;
    try {
      const page = await this.fetchPage(25e3);
      this.pollFailureCount = 0;
      if (this.isTerminal()) this.drainTerminalPage(page);
      else if (this.turnState === "awaiting_action" && !this.awaitingResume && !page.has_more) {
        this.stopPolling();
      }
    } catch (error) {
      this.pollFailureCount += 1;
      this.error = error;
      (_a = this.logger) == null ? void 0 : _a.debug("[session] poll error", error);
      this.publish();
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
  finish() {
    this.awaitingResume = false;
    this.terminalDrainUntil = void 0;
    this.stopPolling();
    this.resolvePending();
  }
  drainTerminalPage(page) {
    var _a;
    this.resolvePending();
    const hasTitle = page.events.some(
      (event) => event.type === "title_changed"
    );
    if (hasTitle || this.title) {
      this.finish();
      return;
    }
    (_a = this.terminalDrainUntil) != null ? _a : this.terminalDrainUntil = Date.now() + TERMINAL_EVENT_DRAIN_MS;
    if (page.events.length === 0 && Date.now() >= this.terminalDrainUntil) {
      this.finish();
      return;
    }
    this.startPolling();
  }
  isTerminal() {
    return Boolean(this.turnState && TERMINAL_TURN_STATES.has(this.turnState));
  }
  result() {
    return { messages: this.messages, title: this.title };
  }
  resolvePending() {
    const resolve = this.pendingResolve;
    this.pendingResolve = null;
    resolve == null ? void 0 : resolve(this.result());
  }
  buildSnapshot() {
    return __spreadValues(__spreadProps(__spreadValues(__spreadProps(__spreadValues(__spreadValues(__spreadValues({
      sessionId: this.sessionId
    }, this.cursor ? { cursor: this.cursor } : {}), this.turnId ? { turnId: this.turnId } : {}), this.turnState ? { turnState: this.turnState } : {}), {
      events: [...this.events],
      messages: [...this.messages],
      actions: this.actions.all()
    }), this.title ? { title: this.title } : {}), {
      isPolling: this.pollingActive,
      isSubmitting: this.isSubmitting,
      actionAttempts: this.actions.allAttempts()
    }), this.error === void 0 ? {} : { error: this.error });
  }
  publish() {
    this.snapshot = this.buildSnapshot();
    for (const listener of this.listeners) listener();
  }
  currentPollInterval() {
    return typeof document !== "undefined" && document.hidden ? 2e3 : this.pollIntervalMs;
  }
  schedulePoll(delayMs) {
    if (!this.pollingActive || this.closed) return;
    if (this.pollTimer) clearTimeout(this.pollTimer);
    this.pollTimer = setTimeout(() => void this.pollTick(), delayMs);
  }
  assertOpen() {
    if (this.closed) throw new Error("Session is closed");
  }
};

// src/sdk/agent.ts
var AgentRun = class extends TypedEventEmitter {
  constructor(client, prompt, actions, options = {}) {
    super();
    const userState = options.userState;
    this.session = new ClientSession(client, __spreadProps(__spreadValues({}, options), {
      actions,
      getUserState: () => userState
    }));
    const revisions = /* @__PURE__ */ new Map();
    let reportedError;
    const unsubscribe = this.session.subscribe(() => {
      var _a;
      const snapshot = this.session.getSnapshot();
      for (const action of snapshot.actions) {
        if (((_a = revisions.get(action.id)) != null ? _a : -1) >= action.revision) continue;
        revisions.set(action.id, action.revision);
        this.emit("action", action);
      }
      if (snapshot.error !== void 0 && snapshot.error !== reportedError) {
        reportedError = snapshot.error;
        this.emit("error", { error: snapshot.error });
      }
    });
    this.completion = Promise.resolve().then(() => this.session.send(prompt)).then((result) => {
      const completed = __spreadProps(__spreadValues({}, result), {
        sessionId: this.session.sessionId,
        actions: this.session.actions.all()
      });
      this.emit("completed", completed);
      unsubscribe();
      this.session.close();
      return completed;
    }).catch((error) => {
      this.emit("error", { error });
      unsubscribe();
      this.session.close();
      throw error;
    });
    void this.completion.catch(() => void 0);
  }
  result() {
    return this.completion;
  }
  then(onfulfilled, onrejected) {
    return this.completion.then(onfulfilled, onrejected);
  }
  interrupt() {
    return this.session.interrupt();
  }
  respond(actionId, result) {
    return this.session.actions.submitResult(actionId, result);
  }
  reject(actionId, reason) {
    return this.session.actions.reject(actionId, reason);
  }
};
var AomiAgent = class {
  constructor(raw, client, actions = {}) {
    this.raw = raw;
    this.client = client;
    this.actions = actions;
  }
  run(prompt, options) {
    var _a;
    const normalized = prompt.trim();
    if (!normalized) throw new TypeError("prompt is required");
    return new AgentRun(
      this.client,
      normalized,
      (_a = options == null ? void 0 : options.actions) != null ? _a : this.actions,
      options
    );
  }
};

// src/sdk/build.ts
var EvmStaged = class {
  constructor(raw, transport) {
    this.raw = raw;
    this.transport = transport;
  }
  get version() {
    return this.raw.version;
  }
  get status() {
    return this.raw.status;
  }
  get actions() {
    return this.raw.actions.map((action) => __spreadProps(__spreadValues({}, action), {
      chainFamily: "evm",
      kind: "calls"
    }));
  }
  get digest() {
    return this.raw.digest;
  }
  async simulate() {
    return new EvmBuild(
      await this.transport.simulate(this.raw),
      this.transport
    );
  }
  toJSON() {
    return this.raw;
  }
};
var EvmBuild = class {
  constructor(raw, transport) {
    this.raw = raw;
    this.transport = transport;
  }
  get version() {
    return this.raw.version;
  }
  get status() {
    return this.raw.status;
  }
  get actions() {
    return this.raw.actions.map((action) => __spreadProps(__spreadValues({}, action), {
      chainFamily: "evm",
      kind: "calls"
    }));
  }
  get summary() {
    return this.raw.summary;
  }
  get simulation() {
    return this.raw.simulation;
  }
  get digest() {
    return this.raw.digest;
  }
  async commit(options) {
    return this.transport.commit(this.raw, options);
  }
  toJSON() {
    return this.raw;
  }
};
var SvmStaged = class {
  constructor(raw, transport) {
    this.raw = raw;
    this.transport = transport;
  }
  get version() {
    return this.raw.version;
  }
  get status() {
    return this.raw.status;
  }
  get actions() {
    return this.raw.actions.map((action) => __spreadProps(__spreadValues({}, action), {
      chainFamily: "svm"
    }));
  }
  get digest() {
    return this.raw.digest;
  }
  async simulate() {
    return new SvmBuild(
      await this.transport.simulate(this.raw),
      this.transport
    );
  }
  toJSON() {
    return this.raw;
  }
};
var SvmBuild = class {
  constructor(raw, transport) {
    this.raw = raw;
    this.transport = transport;
  }
  get version() {
    return this.raw.version;
  }
  get status() {
    return this.raw.status;
  }
  get actions() {
    return this.raw.actions.map((action) => __spreadProps(__spreadValues({}, action), {
      chainFamily: "svm"
    }));
  }
  get summary() {
    return this.raw.summary;
  }
  get simulation() {
    return this.raw.simulation;
  }
  get digest() {
    return this.raw.digest;
  }
  async commit(options) {
    return this.transport.commit(this.raw, options);
  }
  toJSON() {
    return this.raw;
  }
};

// src/sdk/pipeline.ts
var AomiEvmPipeline = class {
  constructor(raw) {
    this.raw = raw;
  }
  async build(input) {
    if ("calls" in input) {
      return (await this.stage(input)).simulate();
    }
    return new EvmBuild(await this.raw.build(input), this.raw);
  }
  async stage(input) {
    const request = "actions" in input ? input : {
      actions: [
        {
          chainId: input.chainId,
          calls: input.calls,
          description: input.description
        }
      ]
    };
    return new EvmStaged(await this.raw.stage(request), this.raw);
  }
  async simulate(build) {
    const value = build instanceof EvmStaged ? build.raw : build;
    return new EvmBuild(await this.raw.simulate(value), this.raw);
  }
  commit(build, options) {
    const value = build instanceof EvmBuild ? build : new EvmBuild(build, this.raw);
    return value.commit(options);
  }
};
var AomiSvmPipeline = class {
  constructor(raw) {
    this.raw = raw;
  }
  async build(input) {
    if ("kind" in input) {
      return (await this.stage(input)).simulate();
    }
    return new SvmBuild(await this.raw.build(input), this.raw);
  }
  async stage(input) {
    return new SvmStaged(await this.raw.stage(input), this.raw);
  }
  async simulate(build) {
    const value = build instanceof SvmStaged ? build.raw : build;
    return new SvmBuild(await this.raw.simulate(value), this.raw);
  }
  commit(build, options) {
    const value = build instanceof SvmBuild ? build : new SvmBuild(build, this.raw);
    return value.commit(options);
  }
};
var AomiPipelineOperationScope = class {
  constructor(raw, evm, svm) {
    this.raw = raw;
    this.evm = evm;
    this.svm = svm;
  }
  directory() {
    return this.raw.directory();
  }
  operations() {
    return this.raw.operations();
  }
  operation(name) {
    return this.raw.operation(name);
  }
  invoke(name, args, options) {
    return this.raw.invoke(name, args, options);
  }
  async build(name, args, options = {}) {
    var _a, _b;
    const descriptor = await this.raw.operation(name);
    validatePipelineArguments(args, descriptor.inputSchema);
    const chainFamily = (_b = (_a = options.chainFamily) != null ? _a : descriptor.chainFamily) != null ? _b : inferChainFamily(args);
    const input = { operation: descriptor.href, arguments: args };
    return chainFamily === "svm" ? this.svm.build(input) : this.evm.build(input);
  }
};
var AomiPipelineSkillScope = class extends AomiPipelineOperationScope {
  constructor(skillRaw, evm, svm) {
    super(skillRaw, evm, svm);
    this.skillRaw = skillRaw;
  }
  instructions() {
    return this.skillRaw.instructions();
  }
};
var AomiPipeline = class {
  constructor(raw) {
    this.raw = raw;
    this.evm = new AomiEvmPipeline(raw.evm);
    this.svm = new AomiSvmPipeline(raw.svm);
  }
  app(name) {
    return new AomiPipelineOperationScope(
      this.raw.app(name),
      this.evm,
      this.svm
    );
  }
  skill(name) {
    return new AomiPipelineSkillScope(this.raw.skill(name), this.evm, this.svm);
  }
};
function inferChainFamily(args) {
  return "cluster" in args || "instructions" in args || "transaction" in args ? "svm" : "evm";
}

// src/sdk/aomi.ts
var Aomi = class {
  constructor(options) {
    const _a = options, { actions } = _a, clientOptions = __objRest(_a, ["actions"]);
    this.raw = new AomiClient(clientOptions);
    this.pipeline = new AomiPipeline(this.raw.pipeline);
    this.agent = new AomiAgent(this.raw.agent, this.raw, actions);
  }
};

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
      const signature2 = await signer.signMessage(message);
      return exchangeJson(fetchImpl, joinUrl(baseUrl, config.verifyPath), {
        message,
        signature: signature2,
        wallet_address: signer.address,
        chain_id: signer.chainId
      });
    }
  };
}
function createSiweAccountAuthAdapter(input) {
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
function createSiwsAccountAuthAdapter(input) {
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
function createAccountSessionProvider(input) {
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
  const provider2 = Object.assign(base2, {
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
  return provider2;
}
var AccountChallengeBindingError = class extends Error {
  constructor(message) {
    super(`Widget challenge rejected before signing: ${message}`);
    this.name = "AccountChallengeBindingError";
  }
};
function assertChallengeBinding(challenge) {
  var _a, _b;
  if (!((_a = challenge.nonce) == null ? void 0 : _a.trim())) {
    throw new AccountChallengeBindingError("challenge has no nonce");
  }
  const now = Date.now();
  const issued = Date.parse(challenge.issuedAt);
  if (Number.isNaN(issued)) {
    throw new AccountChallengeBindingError(
      "challenge has no parseable issuedAt"
    );
  }
  if (issued > now + MAX_WIDGET_CHALLENGE_CLOCK_SKEW_MS) {
    throw new AccountChallengeBindingError("challenge was issued in the future");
  }
  const expires = Date.parse(challenge.expirationTime);
  if (Number.isNaN(expires)) {
    throw new AccountChallengeBindingError(
      "challenge has no parseable expirationTime"
    );
  }
  if (expires <= now) {
    throw new AccountChallengeBindingError("challenge is already expired");
  }
  if (expires <= issued || expires - issued > MAX_WIDGET_CHALLENGE_LIFETIME_MS) {
    throw new AccountChallengeBindingError(
      "challenge validity window is not bounded"
    );
  }
  const pageOrigin = typeof window !== "undefined" && ((_b = window.location) == null ? void 0 : _b.origin) ? window.location.origin : null;
  if (!pageOrigin) return;
  if (challenge.uri !== pageOrigin) {
    throw new AccountChallengeBindingError(
      `challenge uri "${challenge.uri}" is not this page's origin "${pageOrigin}"`
    );
  }
  const pageHost = new URL(pageOrigin).host;
  if (challenge.domain !== pageHost) {
    throw new AccountChallengeBindingError(
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

// src/user-state/accessors.ts
function asObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return void 0;
  }
  return value;
}
function evmBlock(userState) {
  return asObject(userState == null ? void 0 : userState.evm);
}
function svmBlock(userState) {
  return asObject(userState == null ? void 0 : userState.svm);
}
function connBlock(userState) {
  return asObject(userState == null ? void 0 : userState.connection);
}
function parseChainId(value) {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value !== "string") return void 0;
  const trimmed = value.trim();
  if (!trimmed) return void 0;
  const parsed = trimmed.startsWith("0x") ? Number.parseInt(trimmed.slice(2), 16) : Number.parseInt(trimmed, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : void 0;
}
function address(userState) {
  var _a;
  const value = (_a = evmBlock(userState)) == null ? void 0 : _a.address;
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
var evmAddress = address;
function svmAddress(userState) {
  var _a;
  const value = (_a = svmBlock(userState)) == null ? void 0 : _a.address;
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
function chainId(userState) {
  var _a;
  return parseChainId((_a = evmBlock(userState)) == null ? void 0 : _a.chain_id);
}
function ensName(userState) {
  var _a;
  const value = (_a = evmBlock(userState)) == null ? void 0 : _a.ens_name;
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
function isConnected(userState) {
  var _a;
  const value = (_a = connBlock(userState)) == null ? void 0 : _a.is_connected;
  return typeof value === "boolean" ? value : void 0;
}
function provider(userState) {
  var _a;
  const value = (_a = connBlock(userState)) == null ? void 0 : _a.provider;
  if (value === null) return null;
  return typeof value === "string" ? value : void 0;
}
function authMethod(userState) {
  var _a;
  const value = (_a = connBlock(userState)) == null ? void 0 : _a.auth_method;
  if (value === null) return null;
  return typeof value === "string" ? value : void 0;
}
function withExt(userState, key, value) {
  var _a;
  const currentExt = (_a = asObject(userState.ext)) != null ? _a : {};
  return __spreadProps(__spreadValues({}, userState), {
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
  UserState2.address = address;
  UserState2.evmAddress = evmAddress;
  UserState2.svmAddress = svmAddress;
  UserState2.chainId = chainId;
  UserState2.ensName = ensName;
  UserState2.isConnected = isConnected;
  UserState2.provider = provider;
  UserState2.authMethod = authMethod;
  UserState2.withExt = withExt;
})(UserState || (UserState = {}));

// src/wallet-utils.ts
function asRecord2(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return void 0;
  return value;
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
function parseChainId2(value) {
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
function isHexBytes(value) {
  return /^0x(?:[0-9a-fA-F]{2})*$/.test(value);
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
    domain: asRecord2(typedData.domain),
    types: Object.fromEntries(
      Object.entries((_a = typedData.types) != null ? _a : {}).filter(
        ([typeName]) => typeName !== "EIP712Domain"
      )
    ),
    primaryType,
    message: asRecord2(typedData.message)
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

// src/wallet/capabilities.ts
function walletCapabilities(wallets) {
  var _a, _b, _c, _d;
  return __spreadValues(__spreadValues(__spreadValues({}, ((_a = wallets.evm) == null ? void 0 : _a.sendCalls) || ((_b = wallets.evm) == null ? void 0 : _b.sendTransaction) ? { execute_evm: executeEvm(wallets.evm) } : {}), ((_c = wallets.svm) == null ? void 0 : _c.signAndSendTransaction) || ((_d = wallets.svm) == null ? void 0 : _d.sendTransaction) ? { execute_svm: executeSvm(wallets.svm) } : {}), canSign(wallets) ? { sign: sign(wallets) } : {});
}
function executeEvm(wallet) {
  return async (request, signal) => {
    const { transactions } = request;
    const first = transactions[0];
    if (!first) throw new Error("EVM Action contains no transactions");
    if (transactions.some(
      (transaction) => transaction.chain_id !== first.chain_id || transaction.from.toLowerCase() !== wallet.address.toLowerCase()
    )) {
      throw new Error("The active EVM wallet does not match the Action");
    }
    if (chainId2(wallet) !== first.chain_id) {
      if (!wallet.switchChain) {
        throw new Error(`EVM wallet cannot switch to chain ${first.chain_id}`);
      }
      await wallet.switchChain(first.chain_id);
    }
    assertActive(signal);
    const calls = transactions.map(({ to, data, value }) => ({
      to,
      data,
      value
    }));
    const hashes = [];
    if (wallet.sendCalls) {
      hashes.push(
        ...transactionHashes(
          await wallet.sendCalls({ chainId: first.chain_id, calls })
        )
      );
    } else if (wallet.sendTransaction) {
      for (const call of calls) {
        assertActive(signal);
        hashes.push(
          ...transactionHashes(
            await wallet.sendTransaction(__spreadValues({ chainId: first.chain_id }, call))
          )
        );
      }
    }
    if (hashes.length === 0) {
      throw new Error("EVM wallet returned no transaction hash");
    }
    return {
      status: "submitted",
      legs: transactions.map((_, index) => {
        var _a;
        return {
          id: `leg_${index + 1}`,
          status: "submitted",
          transactionId: (_a = hashes[index]) != null ? _a : hashes[hashes.length - 1]
        };
      })
    };
  };
}
function executeSvm(wallet) {
  return async (request, signal) => {
    var _a;
    const { transactions } = request;
    const first = transactions[0];
    if (!first) throw new Error("SVM Action contains no transactions");
    if (transactions.some(
      (transaction) => transaction.cluster !== first.cluster || transaction.payer !== wallet.address
    )) {
      throw new Error("The active SVM wallet does not match the Action");
    }
    await switchCluster(wallet, first.cluster);
    const legs = [];
    for (const [index, transaction] of transactions.entries()) {
      assertActive(signal);
      const transactionBase64 = transaction.unsigned_transaction_base64;
      if (!transactionBase64) {
        throw new Error("SVM Action has no unsigned transaction bytes");
      }
      const result = wallet.signAndSendTransaction ? await wallet.signAndSendTransaction({
        transactionBase64,
        cluster: transaction.cluster
      }) : wallet.sendTransaction ? await wallet.sendTransaction({
        transactionBase64,
        cluster: transaction.cluster
      }) : void 0;
      if (result === void 0)
        throw new Error("SVM wallet cannot send transactions");
      legs.push(__spreadValues({
        id: `leg_${index + 1}`,
        status: "submitted",
        transactionId: (_a = transactionHashes(result)[0]) != null ? _a : signature(result)
      }, typeof result === "object" && "signedTransaction" in result ? { signedTransactionBase64: result.signedTransaction } : {}));
    }
    return { status: "submitted", legs };
  };
}
function sign(wallets) {
  return async (request, signal) => {
    const outputs = [];
    if (request.chainFamily === "evm") {
      const wallet = wallets.evm;
      if (!wallet) throw new Error("No EVM wallet is configured");
      if (wallet.address.toLowerCase() !== request.signer.toLowerCase()) {
        throw new Error("The active EVM wallet is not the requested signer");
      }
      if (request.chainId && chainId2(wallet) !== request.chainId) {
        if (!wallet.switchChain) {
          throw new Error(
            `EVM wallet cannot switch to chain ${request.chainId}`
          );
        }
        await wallet.switchChain(request.chainId);
      }
      for (const [index, payload] of request.payloads.entries()) {
        assertActive(signal);
        if (payload.kind === "evm_personal") {
          if (!wallet.signMessage)
            throw new Error("EVM wallet cannot sign messages");
          outputs.push({
            id: `payload_${index + 1}`,
            signature: signature(
              await wallet.signMessage({
                message: payload.message,
                chainId: request.chainId
              })
            )
          });
        } else if (payload.kind === "evm_typed_data") {
          if (!wallet.signTypedData) {
            throw new Error("EVM wallet cannot sign typed data");
          }
          outputs.push({
            id: `payload_${index + 1}`,
            signature: signature(
              await wallet.signTypedData({
                typedData: payload.typed_data,
                chainId: request.chainId
              })
            )
          });
        } else {
          throw new Error("EVM signing Action contains an SVM payload");
        }
      }
    } else {
      const wallet = wallets.svm;
      if (!wallet) throw new Error("No SVM wallet is configured");
      if (wallet.address !== request.signer) {
        throw new Error("The active SVM wallet is not the requested signer");
      }
      await switchCluster(wallet, request.cluster);
      for (const [index, payload] of request.payloads.entries()) {
        assertActive(signal);
        if (payload.kind === "svm_message") {
          if (!wallet.signMessage)
            throw new Error("SVM wallet cannot sign messages");
          outputs.push({
            id: `payload_${index + 1}`,
            signature: signature(
              await wallet.signMessage({
                messageBase64: payload.message_base64,
                cluster: request.cluster
              })
            )
          });
        } else if (payload.kind === "svm_transaction") {
          if (!wallet.signTransaction) {
            throw new Error("SVM wallet cannot sign transactions");
          }
          const result = await wallet.signTransaction({
            transactionBase64: payload.transaction_base64,
            cluster: request.cluster
          });
          outputs.push(
            request.operationId ? { id: `payload_${index + 1}`, signature: signature(result) } : {
              id: `payload_${index + 1}`,
              signedTransactionBase64: signedTransaction(result)
            }
          );
        } else {
          throw new Error("SVM signing Action contains an EVM payload");
        }
      }
    }
    return { status: "signed", outputs };
  };
}
function canSign({ evm, svm }) {
  return Boolean(
    (evm == null ? void 0 : evm.signMessage) || (evm == null ? void 0 : evm.signTypedData) || (svm == null ? void 0 : svm.signMessage) || (svm == null ? void 0 : svm.signTransaction)
  );
}
function chainId2(wallet) {
  return typeof wallet.chainId === "function" ? wallet.chainId() : wallet.chainId;
}
function cluster(wallet) {
  return typeof wallet.cluster === "function" ? wallet.cluster() : wallet.cluster;
}
async function switchCluster(wallet, next) {
  if (!next || next === cluster(wallet)) return;
  if (!wallet.switchCluster)
    throw new Error(`SVM wallet cannot switch to ${next}`);
  await wallet.switchCluster(next);
}
function transactionHashes(result) {
  var _a;
  if (typeof result === "string") return [result];
  if (Array.isArray(result.hashes)) return result.hashes.filter(isString);
  if (Array.isArray(result.transactionHashes)) {
    return result.transactionHashes.filter(isString);
  }
  const hash = (_a = result.hash) != null ? _a : result.transactionHash;
  return hash ? [hash] : [];
}
function signature(result) {
  if (typeof result === "string") return result;
  if (result.signature) return result.signature;
  throw new Error("Wallet returned no signature");
}
function signedTransaction(result) {
  if (typeof result === "string") return result;
  if (result.signedTransaction) return result.signedTransaction;
  throw new Error("Wallet returned no signed transaction");
}
function assertActive(signal) {
  if (signal.aborted) throw new Error("Action execution was aborted");
}
function isString(value) {
  return typeof value === "string";
}

// src/wallet/user-state.ts
function walletUserState(wallets) {
  var _a, _b, _c, _d;
  if (!wallets.evm && !wallets.svm) return void 0;
  const chainId3 = typeof ((_a = wallets.evm) == null ? void 0 : _a.chainId) === "function" ? wallets.evm.chainId() : (_b = wallets.evm) == null ? void 0 : _b.chainId;
  const cluster2 = typeof ((_c = wallets.svm) == null ? void 0 : _c.cluster) === "function" ? wallets.svm.cluster() : (_d = wallets.svm) == null ? void 0 : _d.cluster;
  return __spreadValues(__spreadValues({
    connection: { is_connected: true }
  }, wallets.evm ? {
    evm: __spreadValues({
      address: wallets.evm.address
    }, chainId3 === void 0 ? {} : { chain_id: chainId3 })
  } : {}), wallets.svm ? {
    svm: __spreadValues({
      address: wallets.svm.address
    }, cluster2 === void 0 ? {} : { cluster: cluster2 })
  } : {});
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
  const asRecord3 = capabilities;
  const eip155Key = `eip155:${chainId3}`;
  const decimalKey = String(chainId3);
  const hexKey = `0x${chainId3.toString(16)}`;
  return (_b = (_a = asRecord3[eip155Key]) != null ? _a : asRecord3[decimalKey]) != null ? _b : asRecord3[hexKey];
}

// src/aa/fee.ts
import { getAddress as getAddress2 } from "viem";
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
    recipient: getAddress2(fee.recipient),
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
  AccountChallengeBindingError,
  AccountCredentialUnavailableError,
  ActionHandler,
  AgentApiError,
  AgentRun,
  AgentTransport,
  Aomi,
  AomiAgent,
  AomiClient,
  AomiEvmPipeline,
  AomiPipeline,
  AomiPipelineOperationScope,
  AomiPipelineSkillScope,
  AomiSvmPipeline,
  CHAINS_BY_ID,
  CHAIN_NAMES,
  CLIENT_TYPE_TS_CLI,
  CLIENT_TYPE_WEB_UI,
  EvmBuild,
  EvmPipelineTransport,
  EvmStaged,
  MAX_AUTO_FEE_WEI,
  PartialWalletExecutionError,
  PipelineApiError,
  PipelineAppsTransport,
  PipelineOperationTransport,
  PipelineSchemaError,
  PipelineSkillTransport,
  PipelineSkillsTransport,
  PipelineTransport,
  SUPPORTED_CHAINS,
  SUPPORTED_CHAIN_IDS,
  ClientSession as Session,
  SvmBuild,
  SvmPipelineTransport,
  SvmStaged,
  TypedEventEmitter,
  UserState,
  aaModeFromExecutionKind,
  appIdentityKey,
  appendFeeCallToPayload,
  arcTestnet,
  authorizationChallenge,
  authorizationCommit,
  buildFeeAAWalletCall,
  buildSiwsMessage,
  createAccountBearerProvider,
  createAccountSessionProvider,
  createGuestSessionProvider,
  createOAuthTokenProvider,
  createProviderCredentialAdapter,
  createSiweAccountAuthAdapter,
  createSiwsAccountAuthAdapter,
  ensureSvmWalletBound,
  ensureSvmWalletBoundVia,
  executeWalletCalls,
  handlePaymentChallenges,
  isUnboundWalletError,
  megaeth,
  monad,
  monadTestnet,
  normalizeAppDescriptor,
  normalizeSimulatedFee,
  normalizeSolanaCluster,
  parseChainId2 as parseChainId,
  partialWalletExecution,
  posterFromClient,
  robinhood,
  safeEnv,
  secretNamesFrom,
  toAAWalletCall,
  toAAWalletCalls,
  toViemSignMessageArgs,
  toViemSignTypedDataArgs,
  validatePipelineArguments,
  walletCapabilities,
  walletUserState,
  wrapFetchWithPaymentChallenges
};
//# sourceMappingURL=index.js.map