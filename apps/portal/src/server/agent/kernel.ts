import "server-only";

import { configuredBackendUrl } from "@portal/server/backend-url";

import {
  mintInternalPrincipal,
  type PublicPrincipal,
} from "./internal-principal";
import type { KernelAgentAction } from "./action-projection";

export type KernelPosition = {
  stream_epoch: string;
  event_sequence: number;
};

export type KernelSnapshot = {
  messages: Array<Record<string, unknown>>;
  system_events: Array<Record<string, unknown>>;
  title?: string | null;
  is_processing: boolean;
  user_state?: Record<string, unknown> | null;
};

export type KernelDelta = {
  response_type: "delta";
  thread_id: string;
  turn_status: string;
  snapshot: KernelSnapshot;
  events: Array<{
    event_sequence: number;
    event_type: string;
    payload: Record<string, unknown>;
  }>;
  actions: KernelAgentAction[];
  position: KernelPosition;
  resync_required: boolean;
};

export type KernelSession = {
  thread_id: string;
  application_id?: string | number | null;
  title: string;
  archived: boolean;
  created_at: number;
  updated_at: number;
};

export class AgentKernelError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
    readonly headers: Headers,
  ) {
    super(`Agent kernel returned HTTP ${status}`);
  }
}

export interface AgentKernel {
  startTurn(input: {
    threadId: string;
    applicationId: bigint;
    message: string;
    model?: string;
    wallets?: {
      evm?: { address: string; chainId: number };
      svm?: { address: string; cluster: string };
    };
    idempotencyKey: string;
    paymentSignature?: string;
  }): Promise<KernelDelta>;
  readDelta(input: {
    threadId: string;
    after: KernelPosition | null;
    waitMs: number;
  }): Promise<KernelDelta>;
  submitActionResult(input: {
    threadId: string;
    actionId: string;
    expectedRevision: number;
    idempotencyKey: string;
    result: Record<string, unknown>;
  }): Promise<KernelAgentAction>;
  interrupt(input: {
    threadId: string;
    idempotencyKey: string;
  }): Promise<KernelDelta>;
  listSessions(input: {
    afterThreadId?: string;
    limit: number;
  }): Promise<{ sessions: KernelSession[]; nextThreadId?: string | null }>;
  updateSession(input: {
    threadId: string;
    title?: string;
    archived?: boolean;
    idempotencyKey: string;
  }): Promise<KernelSession>;
  deleteSession(input: {
    threadId: string;
    idempotencyKey: string;
  }): Promise<void>;
}

export class RustAgentKernel implements AgentKernel {
  constructor(
    private readonly principal: PublicPrincipal,
    private readonly backendUrl = configuredBackendUrl(),
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async startTurn(input: Parameters<AgentKernel["startTurn"]>[0]) {
    return this.request<KernelDelta>("/api/_internal/agent/turns", {
      method: "POST",
      body: JSON.stringify({
        thread_id: input.threadId,
        application_id: input.applicationId.toString(),
        message: input.message,
        model: input.model,
        wallet_context: {
          evm: input.wallets?.evm
            ? {
                address: input.wallets.evm.address,
                chain_id: input.wallets.evm.chainId,
              }
            : undefined,
          svm: input.wallets?.svm,
        },
        idempotency_key: input.idempotencyKey,
        payment_signature: input.paymentSignature,
      }),
    });
  }

  async readDelta(input: Parameters<AgentKernel["readDelta"]>[0]) {
    const url = new URL(
      `/api/_internal/agent/sessions/${encodeURIComponent(input.threadId)}/delta`,
      this.backendUrl,
    );
    if (input.after) {
      url.searchParams.set("stream_epoch", input.after.stream_epoch);
      url.searchParams.set(
        "event_sequence",
        String(input.after.event_sequence),
      );
    }
    url.searchParams.set("wait_ms", String(input.waitMs));
    return this.request<KernelDelta>(url, { method: "GET" });
  }

  async submitActionResult(
    input: Parameters<AgentKernel["submitActionResult"]>[0],
  ) {
    const response = await this.request<
      {
        response_type: "action";
      } & KernelAgentAction
    >(
      `/api/_internal/agent/sessions/${encodeURIComponent(input.threadId)}/actions/${encodeURIComponent(input.actionId)}/result`,
      {
        method: "POST",
        body: JSON.stringify({
          expected_revision: input.expectedRevision,
          idempotency_key: input.idempotencyKey,
          result: input.result,
        }),
      },
    );
    const { response_type: _, ...action } = response;
    return action as KernelAgentAction;
  }

  async interrupt(input: Parameters<AgentKernel["interrupt"]>[0]) {
    return this.request<KernelDelta>(
      `/api/_internal/agent/sessions/${encodeURIComponent(input.threadId)}/interrupt`,
      {
        method: "POST",
        body: JSON.stringify({ idempotency_key: input.idempotencyKey }),
      },
    );
  }

  async listSessions(input: Parameters<AgentKernel["listSessions"]>[0]) {
    const url = new URL("/api/_internal/agent/sessions", this.backendUrl);
    url.searchParams.set("limit", String(input.limit));
    if (input.afterThreadId) {
      url.searchParams.set("after_thread_id", input.afterThreadId);
    }
    const response = await this.request<{
      response_type: "sessions";
      sessions: KernelSession[];
      next_thread_id?: string | null;
    }>(url, { method: "GET" });
    return {
      sessions: response.sessions,
      nextThreadId: response.next_thread_id,
    };
  }

  async updateSession(input: Parameters<AgentKernel["updateSession"]>[0]) {
    const response = await this.request<
      {
        response_type: "session";
      } & KernelSession
    >(`/api/_internal/agent/sessions/${encodeURIComponent(input.threadId)}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: input.title,
        archived: input.archived,
        idempotency_key: input.idempotencyKey,
      }),
    });
    const { response_type: _, ...session } = response;
    return session;
  }

  async deleteSession(input: Parameters<AgentKernel["deleteSession"]>[0]) {
    await this.request(
      `/api/_internal/agent/sessions/${encodeURIComponent(input.threadId)}`,
      {
        method: "DELETE",
        body: JSON.stringify({ idempotency_key: input.idempotencyKey }),
      },
    );
  }

  private async request<T = unknown>(
    path: string | URL,
    init: RequestInit,
  ): Promise<T> {
    const { bearer } = await mintInternalPrincipal(this.principal);
    const headers = new Headers(init.headers);
    headers.set("authorization", `Bearer ${bearer}`);
    if (init.body !== undefined)
      headers.set("content-type", "application/json");
    const url = path instanceof URL ? path : new URL(path, this.backendUrl);
    const response = await this.fetcher(url, {
      ...init,
      cache: "no-store",
      headers,
    });
    const text = await response.text();
    const body = parseBody(text);
    if (!response.ok) {
      throw new AgentKernelError(response.status, body, response.headers);
    }
    return body as T;
  }
}

function parseBody(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { error: "invalid_kernel_response" };
  }
}
