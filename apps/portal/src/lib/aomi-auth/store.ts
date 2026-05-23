// =============================================================================
// Singleton Store + SecretStore + ProviderRegistry for the portal runtime.
// =============================================================================
//
// v1 lives in-process. Multiple Next route invocations within one dev-server
// process share this singleton — fine for `next dev` and the single-instance
// prototype. Production needs Postgres + KV; the interfaces stay the same.

import {
  BeVaultSecretStore,
  MapProviderRegistry,
  MemorySecretStore,
  MemoryStore,
  dummyProvider,
  type ProviderRegistry,
  type SecretStore,
  type Store,
} from "@aomi-labs/auth";
import { readEnv } from "./env";

// Use globalThis to survive HMR within `next dev`. Without this, every
// route reload re-initializes the singletons and we lose pending state
// between begin → callback.
type Globals = typeof globalThis & {
  __aomiAuth?: {
    store: Store;
    secretStore: SecretStore;
    providers: ProviderRegistry;
  };
};

function init(): NonNullable<Globals["__aomiAuth"]> {
  const env = readEnv();

  const store: Store = new MemoryStore();

  // Default to be-vault when AOMI_BE_URL is reachable; tests can override
  // by mutating globalThis.__aomiAuth before issuing requests.
  let secretStore: SecretStore;
  if (process.env.AOMI_SECRET_STORE === "memory") {
    secretStore = new MemorySecretStore();
  } else {
    secretStore = new BeVaultSecretStore({
      beUrl: env.beUrl,
      authToken: env.authToken,
    });
  }

  const providers = new MapProviderRegistry([dummyProvider]);

  return { store, secretStore, providers };
}

export function getAomiAuth(): NonNullable<Globals["__aomiAuth"]> {
  const g = globalThis as Globals;
  if (!g.__aomiAuth) {
    g.__aomiAuth = init();
  }
  return g.__aomiAuth;
}
