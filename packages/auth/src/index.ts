// =============================================================================
// @aomi-labs/auth — public surface.
// =============================================================================

export * from "./types";

export { auth } from "./better-auth/auth";
export { authClient } from "./better-auth/auth-client";
export type { AccountAuthEnv } from "./better-auth/env";

export { beginAuth } from "./mcp-approvals/api/begin";
export type { BeginAuthDeps } from "./mcp-approvals/api/begin";

export { awaitAuth } from "./mcp-approvals/api/await";
export type { AwaitAuthDeps, AwaitAuthArgs } from "./mcp-approvals/api/await";

export { lookupApproval } from "./mcp-approvals/api/lookup";
export type { LookupApprovalDeps } from "./mcp-approvals/api/lookup";

export { revokeApproval } from "./mcp-approvals/api/revoke";
export type { RevokeApprovalDeps } from "./mcp-approvals/api/revoke";

export type { Store } from "./mcp-approvals/store";
export { MemoryStore } from "./mcp-approvals/store/memory";

export { BeApprovalsStore } from "./mcp-approvals/secret-store/be-approvals";
export type {
  BeApprovalsStoreConfig,
  CompleteApprovalArgs,
  CompleteApprovalResult,
} from "./mcp-approvals/secret-store/be-approvals";

export type {
  ProviderModule,
  ProviderStartRequest,
  ProviderStartResponse,
  ProviderCallbackRequest,
  ProviderCallbackResponse,
} from "./mcp-approvals/providers/types";
export type { ProviderRegistry } from "./mcp-approvals/providers/registry";
export { MapProviderRegistry } from "./mcp-approvals/providers/registry";
export { dummyProvider } from "./mcp-approvals/providers/dummy";
export {
  makePrivyJwtVerifier,
  makePrivyProvider,
} from "./mcp-approvals/providers/privy";
export type {
  PrivyJwtVerifierConfig,
  PrivyProviderConfig,
  VerifiedPrivyAccessToken,
  VerifyPrivyAccessToken,
} from "./mcp-approvals/providers/privy";
export type * from "./mcp-approvals/types";
