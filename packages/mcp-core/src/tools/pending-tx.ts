import { z } from "zod";
import type { BackendPort, PendingTxInfo } from "../ports/backend";
import type { McpCallCtx } from "../types";

export const PendingTxArgs = z.object({});

export type PendingTxInput = z.infer<typeof PendingTxArgs>;

export type PendingTxDeps = {
  backend: BackendPort;
};

export async function runPendingTx(
  deps: PendingTxDeps,
  ctx: McpCallCtx,
  _input: PendingTxInput,
): Promise<{ pending: PendingTxInfo[] }> {
  return {
    pending: await deps.backend.listPendingTx({ userId: ctx.userId }),
  };
}
