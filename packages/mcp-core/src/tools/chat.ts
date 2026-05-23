// =============================================================================
// aomi_chat — MCP tool that round-trips a message to the Aomi agent.
// =============================================================================
//
// Blocking shape: the tool waits for the BE's `processing_end` (or
// `backend_idle` if a wallet request is staged) and returns one response.
// Streaming via MCP progress notifications is a v2 conversation.
//
// Returns the agent's final reply text plus any wallet requests queued
// during this turn (diff against pre-call snapshot).

import { z } from "zod";
import type { BackendPort } from "../ports/backend";
import type { McpCallCtx } from "../types";

export const ChatArgs = z.object({
  message: z
    .string()
    .min(1)
    .describe("Message to send to the Aomi agent."),
});

export type ChatInput = z.infer<typeof ChatArgs>;

export interface ChatDeps {
  backend: BackendPort;
}

export async function runChat(
  deps: ChatDeps,
  ctx: McpCallCtx,
  input: ChatInput,
) {
  return deps.backend.chat({ userId: ctx.userId, message: input.message });
}
