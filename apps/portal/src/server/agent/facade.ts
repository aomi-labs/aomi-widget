import { createHash } from "node:crypto";

import type { AomiPublicV1 } from "@aomi-labs/client";

import { decodeApplicationId, encodeApplicationId } from "./application-id";
import {
  projectAgentAction,
  type PublicAgentAction,
} from "./action-projection";
import { CursorCodec } from "./cursor";
import type { PublicPrincipal } from "./internal-principal";
import type { AgentKernel, KernelDelta, KernelSession } from "./kernel";

type Schemas = AomiPublicV1["schemas"];
export type AgentDelta = Schemas["AgentDelta"];
export type AgentSession = Schemas["Session"];
export type StartTurn = Schemas["StartTurnRequest"];
export type ActionResult = Schemas["ActionResult"];

/** Public protocol orchestrator shared in-process by REST and Agent MCP. */
export class AgentFacade {
  constructor(
    private readonly principal: PublicPrincipal,
    private readonly kernel: AgentKernel,
    private readonly cursors: CursorCodec,
  ) {}

  async chat(input: {
    request: StartTurn;
    idempotencyKey: string;
    paymentSignature?: string;
    now?: number;
  }): Promise<AgentDelta> {
    const delta = await this.kernel.startTurn({
      threadId: input.request.session,
      applicationId: decodeApplicationId(input.request.application),
      message: input.request.message,
      model: input.request.model,
      wallets: input.request.wallets,
      idempotencyKey: input.idempotencyKey,
      paymentSignature: input.paymentSignature,
    });
    return this.projectDelta(delta, input.now);
  }

  async check(input: {
    session: string;
    cursor?: string;
    waitMs?: number;
    now?: number;
  }): Promise<AgentDelta> {
    const position = input.cursor
      ? this.cursors.verify(input.cursor, {
          subject: principalSubject(this.principal),
          session: input.session,
          now: input.now,
        })
      : null;
    const delta = await this.kernel.readDelta({
      threadId: input.session,
      after: position
        ? {
            stream_epoch: position.epoch,
            event_sequence: position.sequence,
          }
        : null,
      waitMs: Math.min(Math.max(input.waitMs ?? 0, 0), 30_000),
    });
    return this.projectDelta(delta, input.now);
  }

  async submitAction(input: {
    session: string;
    action: string;
    result: ActionResult;
    idempotencyKey: string;
  }): Promise<PublicAgentAction> {
    return projectAgentAction(
      await this.kernel.submitActionResult({
        threadId: input.session,
        actionId: input.action,
        expectedRevision: input.result.revision,
        idempotencyKey: input.idempotencyKey,
        result: internalResult(input.result),
      }),
    );
  }

  async interrupt(input: {
    session: string;
    idempotencyKey: string;
    now?: number;
  }): Promise<AgentDelta> {
    return this.projectDelta(
      await this.kernel.interrupt({
        threadId: input.session,
        idempotencyKey: input.idempotencyKey,
      }),
      input.now,
    );
  }

  async sessions(input: { cursor?: string; limit?: number } = {}): Promise<{
    sessions: AgentSession[];
    nextCursor: string | null;
  }> {
    const response = await this.kernel.listSessions({
      afterThreadId: input.cursor,
      limit: Math.min(Math.max(input.limit ?? 20, 1), 100),
    });
    return {
      sessions: response.sessions.map(projectSession),
      nextCursor: response.nextThreadId ?? null,
    };
  }

  async updateSession(input: {
    session: string;
    title?: string;
    archived?: boolean;
    idempotencyKey: string;
  }): Promise<AgentSession> {
    return projectSession(
      await this.kernel.updateSession({
        threadId: input.session,
        title: input.title,
        archived: input.archived,
        idempotencyKey: input.idempotencyKey,
      }),
    );
  }

  async deleteSession(input: {
    session: string;
    idempotencyKey: string;
  }): Promise<void> {
    await this.kernel.deleteSession({
      threadId: input.session,
      idempotencyKey: input.idempotencyKey,
    });
  }

  private projectDelta(delta: KernelDelta, now?: number): AgentDelta {
    const cursor = this.cursors.issue({
      subject: principalSubject(this.principal),
      session: delta.thread_id,
      epoch: delta.position.stream_epoch,
      sequence: delta.position.event_sequence,
      now,
    });
    return {
      session: delta.thread_id,
      turn: { status: publicTurnStatus(delta.turn_status) },
      messages: delta.snapshot.messages.map((message, index) =>
        projectMessage(delta.thread_id, message, index),
      ),
      activity: delta.snapshot.system_events
        .map(projectActivity)
        .filter((event): event is Schemas["Activity"] => event !== null),
      actions: delta.actions.map(projectAgentAction),
      cursor,
    };
  }
}

function internalResult(result: ActionResult): Record<string, unknown> {
  if (result.status === "submitted") {
    return {
      result_type: "external_transaction",
      legs: result.legs.map((leg) => ({
        leg_id: leg.id,
        status: leg.status,
        transaction_id: leg.transactionId,
        signed_transaction_base64: leg.signedTransactionBase64,
        reason: leg.reason,
      })),
    };
  }
  if (result.status === "signed") {
    return {
      result_type: "signing",
      outputs: result.outputs.map((output) => ({
        payload_id: output.id,
        signature: output.signature,
        signed_transaction_base64: output.signedTransactionBase64,
      })),
    };
  }
  return { result_type: "rejected", reason: result.reason };
}

function projectSession(session: KernelSession): AgentSession {
  if (session.application_id === null || session.application_id === undefined) {
    throw new TypeError("kernel session is missing its application identity");
  }
  const applicationId = BigInt(String(session.application_id));
  return {
    id: session.thread_id,
    application: encodeApplicationId(applicationId),
    title: session.title,
    archived: session.archived,
    createdAt: new Date(session.created_at * 1_000).toISOString(),
    updatedAt: new Date(session.updated_at * 1_000).toISOString(),
  };
}

function projectMessage(
  session: string,
  message: Record<string, unknown>,
  index: number,
): Schemas["Message"] {
  const sender = String(message.sender ?? message.role ?? "system");
  const timestamp = message.timestamp;
  const seconds =
    typeof timestamp === "number"
      ? timestamp
      : typeof timestamp === "string" && Number.isFinite(Number(timestamp))
        ? Number(timestamp)
        : 0;
  const content = String(message.content ?? "");
  const id = createHash("sha256")
    .update(`${session}:${index}:${sender}:${seconds}:${content}`)
    .digest("base64url")
    .slice(0, 22);
  return {
    id: `msg_${id}`,
    role:
      sender === "agent" || sender === "assistant"
        ? "assistant"
        : sender === "user"
          ? "user"
          : "system",
    content,
    createdAt: new Date(seconds * 1_000).toISOString(),
  };
}

function projectActivity(
  raw: Record<string, unknown>,
  index: number,
): Schemas["Activity"] | null {
  const event = record(raw.InlineCall) ?? raw;
  const type = String(event.type ?? "");
  const createdAt = new Date(
    Number(event.created_at ?? event.timestamp ?? 0) * 1_000,
  ).toISOString();
  if (type.includes("tool")) {
    return {
      type: "tool",
      id: String(event.id ?? event.call_id ?? `tool_${index}`),
      name: String(event.tool_name ?? event.name ?? "tool"),
      status: type.includes("complete") ? "completed" : "updated",
      createdAt,
      details: event,
    };
  }
  if (
    type === "task_started" ||
    type === "task_activity" ||
    type === "task_completed"
  ) {
    return {
      type: "task",
      id: String(event.agent_id ?? event.id ?? `task_${index}`),
      status:
        type === "task_started"
          ? "started"
          : type === "task_completed"
            ? String(event.status) === "failed"
              ? "failed"
              : "completed"
            : "activity",
      createdAt,
      details: event,
    };
  }
  return null;
}

function publicTurnStatus(status: string): Schemas["Turn"]["status"] {
  switch (status) {
    case "thinking":
    case "awaiting_input":
    case "completed":
    case "failed":
    case "interrupted":
      return status;
    case "awaiting_action":
      return "awaiting_input";
    default:
      return "idle";
  }
}

function principalSubject(principal: PublicPrincipal): string {
  return principal.kind === "account"
    ? principal.canonicalUserId
    : `guest:${principal.sessionId}`;
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
