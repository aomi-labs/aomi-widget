import type { components } from "../generated/agent-v1/types";

type Schemas = components["schemas"];

export type AgentStatus = Schemas["AgentDelta"]["status"];
export type AgentMessage = Schemas["AgentMessage"];
export type AgentActivity = Schemas["AgentActivity"];
export type AgentActionBase = Schemas["AgentActionBase"];
export type EvmTransactionIntent = Schemas["EvmTransactionIntent"];
export type SvmTransactionIntent = Schemas["SvmTransactionIntent"];
export type EvmExternalTransactionAction =
  Schemas["EvmExternalTransactionAction"];
export type SvmExternalTransactionAction =
  Schemas["SvmExternalTransactionAction"];
export type AgentSignablePayload = Schemas["SignablePayload"];
export type SigningRequestAction = Schemas["SigningRequestAction"];
export type AgentAction = Schemas["AgentAction"];
export type AgentDelta = Schemas["AgentDelta"];
export type AgentWalletContext = Schemas["WalletContext"];
export type AgentStartRequest = Schemas["StartTurnRequest"];
export type AgentActionResult = Schemas["ActionResult"];
export type AgentSessionRecord = Schemas["AgentSession"];
export type AgentSessionPage = Schemas["SessionPage"];
export type AgentErrorBody = Schemas["ErrorEnvelope"];
