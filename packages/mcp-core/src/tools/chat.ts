import { z } from "zod";
import type { BackendPort, BackendChatReply } from "../ports/backend";
import type { McpCallCtx } from "../types";

export const ChatArgs = z.object({
  message: z.string().min(1),
});

export type ChatInput = z.infer<typeof ChatArgs>;

export type ChatDeps = {
  backend: BackendPort;
};

export async function runChat(
  deps: ChatDeps,
  ctx: McpCallCtx,
  input: ChatInput,
): Promise<BackendChatReply> {
  return deps.backend.chat({
    userId: ctx.userId,
    message: input.message,
  });
}
