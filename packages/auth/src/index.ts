// =============================================================================
// @aomi-labs/auth — public surface.
// =============================================================================

export * from "./types";

export { beginAuth } from "./api/begin";
export type { BeginAuthDeps } from "./api/begin";

export { awaitAuth } from "./api/await";
export type { AwaitAuthDeps, AwaitAuthArgs } from "./api/await";

export { lookupApproval } from "./api/lookup";
export type { LookupApprovalDeps } from "./api/lookup";

export { revokeApproval } from "./api/revoke";
export type { RevokeApprovalDeps } from "./api/revoke";

export type { Store } from "./store";
export { MemoryStore } from "./store/memory";

export type { SecretStore } from "./secret-store";
export { BeVaultSecretStore } from "./secret-store/be-vault";
export type { BeVaultConfig } from "./secret-store/be-vault";
export { MemorySecretStore } from "./secret-store/memory";
export { BeApprovalsStore } from "./secret-store/be-approvals";
export type {
  BeApprovalsStoreConfig,
  CompleteApprovalArgs,
  CompleteApprovalResult,
} from "./secret-store/be-approvals";

export type {
  ProviderModule,
  ProviderStartRequest,
  ProviderStartResponse,
  ProviderCallbackRequest,
  ProviderCallbackResponse,
} from "./providers/types";
export type { ProviderRegistry } from "./providers/registry";
export { MapProviderRegistry } from "./providers/registry";
export { dummyProvider } from "./providers/dummy";
export { makePrivyProvider } from "./providers/privy";
export type { PrivyProviderConfig } from "./providers/privy";
