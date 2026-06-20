// =============================================================================
// @aomi-labs/mcp-core — public surface.
// =============================================================================

export { createMcpServer } from "./runtime";
export type { CreateMcpServerDeps } from "./runtime";

export type {
  BackendPort,
  BackendChatReply,
  PendingTxInfo,
} from "./ports/backend";
export type { McpCallCtx } from "./types";

export { buildBackendPort } from "./backends/aomi-client";
export type { BackendPortDeps } from "./backends/aomi-client";

export { ChatArgs, runChat } from "./tools/chat";
export type { ChatDeps, ChatInput } from "./tools/chat";

export { PendingTxArgs, runPendingTx } from "./tools/pending-tx";
export type { PendingTxDeps, PendingTxInput } from "./tools/pending-tx";
