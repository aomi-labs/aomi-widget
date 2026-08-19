import { AomiClient } from "./client";
import type { components } from "./generated/public-v1/types";
import type { AomiClientOptions } from "./types";

type Schemas = components["schemas"];

export type AgentV1SessionOptions = {
  application: Schemas["ApplicationId"];
  sessionId?: Schemas["SessionId"];
  model?: string;
  wallets?: Schemas["WalletContext"];
};

/**
 * Typed v1 Agent session. Public transport concerns stay here; action and
 * event authority remains behind the BFF's internal Rust-kernel boundary.
 */
export class V1ClientSession {
  readonly client: AomiClient;
  readonly sessionId: Schemas["SessionId"];
  readonly application: Schemas["ApplicationId"];

  private readonly model: string;
  private readonly wallets?: Schemas["WalletContext"];
  private cursor?: Schemas["Cursor"];

  constructor(
    clientOrOptions: AomiClient | AomiClientOptions,
    options: AgentV1SessionOptions,
  ) {
    this.client =
      clientOrOptions instanceof AomiClient
        ? clientOrOptions
        : new AomiClient(clientOrOptions);
    this.sessionId = options.sessionId ?? `sess_${randomId()}`;
    this.application = options.application;
    this.model = options.model ?? "default";
    this.wallets = options.wallets;
  }

  async chat(
    message: string,
    options: { idempotencyKey?: string; paymentSignature?: string } = {},
  ): Promise<Schemas["AgentDelta"]> {
    const delta = await this.client.request<Schemas["AgentDelta"]>(
      "POST",
      "/v1/agent/chat",
      {
        headers: mutationHeaders(options),
        body: {
          session: this.sessionId,
          application: this.application,
          message,
          model: this.model,
          ...(this.wallets ? { wallets: this.wallets } : {}),
        } satisfies Schemas["StartTurnRequest"],
      },
    );
    return this.remember(delta);
  }

  async check(
    options: {
      cursor?: Schemas["Cursor"];
      waitMs?: number;
    } = {},
  ): Promise<Schemas["AgentDelta"]> {
    const delta = await this.client.request<Schemas["AgentDelta"]>(
      "GET",
      `/v1/agent/chat/${encodeURIComponent(this.sessionId)}`,
      {
        query: {
          cursor: options.cursor ?? this.cursor,
          wait: Math.min(Math.max(options.waitMs ?? 0, 0), 30_000),
        },
      },
    );
    return this.remember(delta);
  }

  async *watch(
    options: {
      signal?: AbortSignal;
      waitMs?: number;
    } = {},
  ): AsyncGenerator<Schemas["AgentDelta"]> {
    while (!options.signal?.aborted) {
      const response = await this.client.requestResponse(
        "GET",
        `/v1/agent/chat/${encodeURIComponent(this.sessionId)}`,
        {
          headers: { accept: "text/event-stream" },
          query: {
            cursor: this.cursor,
            wait: Math.min(Math.max(options.waitMs ?? 25_000, 0), 30_000),
          },
        },
      );
      const delta = parseSseDelta(await response.text());
      yield this.remember(delta);
    }
  }

  async submitAction(
    action: Schemas["ActionId"],
    result: Schemas["ActionResult"],
    idempotencyKey = `idem_${randomId()}`,
  ): Promise<Schemas["AgentAction"]> {
    const response = await this.client.request<{
      action: Schemas["AgentAction"];
    }>(
      "POST",
      `/v1/agent/chat/${encodeURIComponent(this.sessionId)}/actions/${encodeURIComponent(action)}/result`,
      { headers: { "idempotency-key": idempotencyKey }, body: result },
    );
    return response.action;
  }

  async interrupt(
    idempotencyKey = `idem_${randomId()}`,
  ): Promise<{ turn: Schemas["Turn"]; cursor: Schemas["Cursor"] }> {
    const response = await this.client.request<{
      turn: Schemas["Turn"];
      cursor: Schemas["Cursor"];
    }>(
      "POST",
      `/v1/agent/chat/${encodeURIComponent(this.sessionId)}/interrupt`,
      { headers: { "idempotency-key": idempotencyKey } },
    );
    this.cursor = response.cursor;
    return response;
  }

  private remember(delta: Schemas["AgentDelta"]): Schemas["AgentDelta"] {
    if (delta.session !== this.sessionId) {
      throw new TypeError("Agent response session does not match the request");
    }
    this.cursor = delta.cursor;
    return delta;
  }
}

export type AgentApiMigrationFlags = Readonly<{
  chat: boolean;
  externalTransaction: boolean;
  signing: boolean;
  sessions: boolean;
}>;

/** Conservative rollback default for gradual web, widget, and CLI adoption. */
export const AGENT_API_MIGRATION_DISABLED: AgentApiMigrationFlags = {
  chat: false,
  externalTransaction: false,
  signing: false,
  sessions: false,
};

function mutationHeaders(options: {
  idempotencyKey?: string;
  paymentSignature?: string;
}): HeadersInit {
  return {
    "idempotency-key": options.idempotencyKey ?? `idem_${randomId()}`,
    ...(options.paymentSignature
      ? { "payment-signature": options.paymentSignature }
      : {}),
  };
}

function randomId(): string {
  return globalThis.crypto.randomUUID().replaceAll("-", "");
}

function parseSseDelta(payload: string): Schemas["AgentDelta"] {
  for (const block of payload.split(/\r?\n\r?\n/)) {
    const data = block
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (data) return JSON.parse(data) as Schemas["AgentDelta"];
  }
  throw new TypeError("Agent SSE response did not contain a delta event");
}
