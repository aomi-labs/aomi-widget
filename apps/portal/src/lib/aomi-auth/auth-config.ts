// =============================================================================
// Singleton Store + ApprovalsStore + ProviderRegistry for the portal runtime.
// =============================================================================
//
// Local in-memory `Store` mirrors what BE persists in Postgres
// (access_approval + pending_auths) so portal lookups stay fast and
// authoritative for the auth-flow window. The actual writes go through
// `BeApprovalsStore` → BE's `/api/_internal/approvals`, which atomically
// upserts DbAuthIdentity, ingests secrets to SecretVault keyed by
// auth_identity_id, and inserts DbAccessApproval.
//
// Production needs portal to read approvals from BE directly (drop the
// local mirror); same interface, just a different `Store` impl.

import {
  BeApprovalsStore,
  MapProviderRegistry,
  MemoryStore,
  dummyProvider,
  makePrivyJwtVerifier,
  makePrivyProvider,
  type ProviderModule,
  type ProviderRegistry,
  type Store,
} from "@aomi-labs/auth";
import { readEnv } from "./env";

// Use globalThis to survive HMR within `next dev`. Without this, every
// route reload re-initializes the singletons and we lose pending state
// between begin → callback.
type Globals = typeof globalThis & {
  __aomiAuth?: {
    store: Store;
    approvalsStore: BeApprovalsStore;
    providers: ProviderRegistry;
  };
};

function init(): NonNullable<Globals["__aomiAuth"]> {
  const env = readEnv();

  const store: Store = new MemoryStore();

  const approvalsStore = new BeApprovalsStore({
    beUrl: env.beUrl,
    authToken: env.authToken,
  });

  const registered: ProviderModule[] = [dummyProvider];
  if (env.privyAppId && env.privyJwtVerificationKey) {
    registered.push(
      makePrivyProvider({
        appId: env.privyAppId,
        signerId: env.privySignerId,
        verifyAccessToken: makePrivyJwtVerifier({
          appId: env.privyAppId,
          jwtVerificationKey: env.privyJwtVerificationKey,
        }),
      }),
    );
  }
  const providers = new MapProviderRegistry(registered);

  return { store, approvalsStore, providers };
}

export function getAomiAuth(): NonNullable<Globals["__aomiAuth"]> {
  const g = globalThis as Globals;
  if (!g.__aomiAuth) {
    g.__aomiAuth = init();
  }
  return g.__aomiAuth;
}
