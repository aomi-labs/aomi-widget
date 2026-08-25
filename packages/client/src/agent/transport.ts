import type { AomiHttpMethod, AomiRequestOptions } from "../types";
import type {
  AgentAction,
  AgentActionResult,
  AgentDelta,
  AgentErrorBody,
  AgentSessionPage,
  AgentSessionRecord,
  AgentStartRequest,
} from "./types";

type RequestResponse = (
  method: AomiHttpMethod,
  path: string,
  options?: AomiRequestOptions,
) => Promise<Response>;

export class AgentApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly retryable: boolean,
    readonly requestId?: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "AgentApiError";
  }
}

/** The single typed transport for every first-party Agent consumer. */
export class AgentTransport {
  readonly sessions: AgentSessionsTransport;

  constructor(private readonly requestResponse: RequestResponse) {
    this.sessions = new AgentSessionsTransport(requestResponse);
  }

  start(
    request: AgentStartRequest,
    options: { idempotencyKey?: string; paymentSignature?: string } = {},
  ): Promise<AgentDelta> {
    return this.json("POST", "/v1/agent/chat", {
      headers: mutationHeaders(options),
      body: request,
    });
  }

  check(
    sessionId: string,
    options: { cursor?: string; waitMs?: number } = {},
  ): Promise<AgentDelta> {
    return this.json("GET", `/v1/agent/chat/${encodeURIComponent(sessionId)}`, {
      query: {
        cursor: options.cursor,
        wait: Math.min(Math.max(options.waitMs ?? 0, 0), 30_000),
      },
    });
  }

  interrupt(sessionId: string): Promise<AgentDelta> {
    return this.json(
      "POST",
      `/v1/agent/chat/${encodeURIComponent(sessionId)}/interrupt`,
      { headers: mutationHeaders() },
    );
  }

  async resolveAction(
    sessionId: string,
    actionId: string,
    result: AgentActionResult,
    idempotencyKey = randomIdempotencyKey(),
  ): Promise<AgentAction> {
    const response = await this.json<{ action: AgentAction }>(
      "POST",
      `/v1/agent/chat/${encodeURIComponent(sessionId)}/actions/${encodeURIComponent(actionId)}/result`,
      { headers: { "idempotency-key": idempotencyKey }, body: result },
    );
    return response.action;
  }

  private async json<T>(
    method: AomiHttpMethod,
    path: string,
    options?: AomiRequestOptions,
  ): Promise<T> {
    return parseAgentResponse<T>(
      await this.requestResponse(method, path, options),
    );
  }
}

export class AgentSessionsTransport {
  constructor(private readonly requestResponse: RequestResponse) {}

  async list(
    options: { cursor?: string; limit?: number } = {},
  ): Promise<AgentSessionPage> {
    return this.json("GET", "/v1/agent/sessions", {
      query: { cursor: options.cursor, limit: options.limit },
    });
  }

  async all(): Promise<AgentSessionRecord[]> {
    const sessions: AgentSessionRecord[] = [];
    let cursor: string | undefined;
    do {
      const page = await this.list({ cursor, limit: 100 });
      sessions.push(...page.sessions);
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    return sessions;
  }

  get(sessionId: string): Promise<AgentSessionRecord> {
    return this.json(
      "GET",
      `/v1/agent/sessions/${encodeURIComponent(sessionId)}`,
    );
  }

  update(
    sessionId: string,
    patch: { title?: string; archived?: boolean },
  ): Promise<AgentSessionRecord> {
    return this.json(
      "PATCH",
      `/v1/agent/sessions/${encodeURIComponent(sessionId)}`,
      {
        headers: mutationHeaders(),
        body: patch,
      },
    );
  }

  async delete(sessionId: string): Promise<void> {
    await parseAgentResponse(
      await this.requestResponse(
        "DELETE",
        `/v1/agent/sessions/${encodeURIComponent(sessionId)}`,
        { headers: mutationHeaders() },
      ),
    );
  }

  private async json<T>(
    method: AomiHttpMethod,
    path: string,
    options?: AomiRequestOptions,
  ): Promise<T> {
    return parseAgentResponse<T>(
      await this.requestResponse(method, path, options),
    );
  }
}

async function parseAgentResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }
  const body = (await response
    .json()
    .catch(() => null)) as AgentErrorBody | null;
  const code = body?.error?.code ?? "agent_request_failed";
  throw new AgentApiError(
    response.status,
    code,
    body?.error?.message ?? `Agent request failed with HTTP ${response.status}`,
    response.status === 408 ||
      response.status === 429 ||
      response.status >= 500,
    body?.error?.requestId ?? response.headers.get("x-request-id") ?? undefined,
    body?.error?.details,
  );
}

function mutationHeaders(
  options: { idempotencyKey?: string; paymentSignature?: string } = {},
): HeadersInit {
  return {
    "idempotency-key": options.idempotencyKey ?? randomIdempotencyKey(),
    ...(options.paymentSignature
      ? { "payment-signature": options.paymentSignature }
      : {}),
  };
}

function randomIdempotencyKey(): string {
  return `idem_${globalThis.crypto.randomUUID().replaceAll("-", "")}`;
}
