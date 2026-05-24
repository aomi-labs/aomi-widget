// =============================================================================
// @aomi-labs/mcp-core — public surface.
// =============================================================================

export { createMcpServer } from "./runtime";
export type { CreateMcpServerDeps } from "./runtime";

export type { AuthPort } from "./ports/auth";
export type { BackendPort, BackendChatReply, PendingTxInfo } from "./ports/backend";
export type { McpCallCtx } from "./types";

export { ConnectProviderArgs, runConnectProvider, summarizeConnectResult } from "./tools/connect-provider";
export type {
  ConnectProviderDeps,
  ConnectProviderInput,
  ConnectProviderResult,
} from "./tools/connect-provider";

export { ConnectAppArgs, runConnectApp } from "./tools/connect-app";
export type { ConnectAppDeps, ConnectAppInput, ConnectAppResult } from "./tools/connect-app";

export { DisconnectProviderArgs, runDisconnectProvider } from "./tools/disconnect-provider";
export type {
  DisconnectProviderDeps,
  DisconnectProviderInput,
  DisconnectResult,
} from "./tools/disconnect-provider";

export { DisconnectAppArgs, runDisconnectApp } from "./tools/disconnect-app";
export type { DisconnectAppDeps, DisconnectAppInput } from "./tools/disconnect-app";

export { ChatArgs, runChat } from "./tools/chat";
export type { ChatDeps, ChatInput } from "./tools/chat";

export { PendingTxArgs, runPendingTx } from "./tools/pending-tx";
export type { PendingTxDeps, PendingTxInput } from "./tools/pending-tx";
