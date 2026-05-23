// =============================================================================
// @aomi-labs/mcp-core — public surface.
// =============================================================================

export { createMcpServer } from "./runtime";
export type { CreateMcpServerDeps } from "./runtime";

export type { AuthPort } from "./ports/auth";
export type { BackendPort, BackendChatReply, BackendPendingTx } from "./ports/backend";
export type { McpCallCtx } from "./types";

export { ConnectAppArgs, runConnectApp } from "./tools/connect-app";
export type { ConnectAppDeps, ConnectAppInput, ConnectAppResult } from "./tools/connect-app";
