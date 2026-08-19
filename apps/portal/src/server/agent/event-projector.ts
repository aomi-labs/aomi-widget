import type { CursorCodec } from "./cursor";

export type KernelPosition = { streamEpoch: string; eventSequence: number };
export type KernelDelta = {
  turnStatus: string;
  events: Array<Record<string, unknown>>;
  actions: Array<Record<string, unknown>>;
  position: KernelPosition;
  resyncRequired: boolean;
};

export type PublicDelta = KernelDelta & { cursor: string };

export type KernelEventReader = {
  readDelta(input: {
    session: string;
    after: KernelPosition | null;
    waitMs: number;
  }): Promise<KernelDelta>;
};

export class AgentEventProjector {
  constructor(
    private readonly cursors: CursorCodec,
    private readonly kernel: KernelEventReader,
  ) {}

  async longPoll(input: {
    subject: string;
    session: string;
    cursor?: string;
    waitMs?: number;
    now?: number;
  }): Promise<PublicDelta> {
    const after = input.cursor
      ? this.cursors.verify(input.cursor, {
          subject: input.subject,
          session: input.session,
          now: input.now,
        })
      : null;
    const delta = await this.kernel.readDelta({
      session: input.session,
      after: after
        ? { streamEpoch: after.epoch, eventSequence: after.sequence }
        : null,
      waitMs: Math.min(Math.max(input.waitMs ?? 0, 0), 30_000),
    });
    return {
      ...delta,
      cursor: this.cursors.issue({
        subject: input.subject,
        session: input.session,
        epoch: delta.position.streamEpoch,
        sequence: delta.position.eventSequence,
        now: input.now,
      }),
    };
  }

  async sse(
    input: Parameters<AgentEventProjector["longPoll"]>[0],
  ): Promise<string> {
    const delta = await this.longPoll(input);
    return `event: delta\ndata: ${JSON.stringify(delta)}\n\n`;
  }
}
