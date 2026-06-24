import { readFileSync } from "node:fs";

import { AomiService } from "@aomi-labs/service";

// The issuer's runtime view of the AOMI service topology. It selects the
// committed portal topology for the target backend, selects its own node
// (`aomi-bff`), and injects its private signing key from env (the one secret —
// never in the TOML). Both bearer minting paths (user tokens, service-to-service)
// go through this.
//
// Server-only: `AomiService.fromTopology` calls `assertServerOnly()`, so this
// throws if it is ever imported into a browser bundle — which is why the whole
// `@aomi-labs/account` package must stay out of client/browser code.

const SELF = "aomi-bff";
const DEFAULT_TOPOLOGY_PATH = "service.portal.toml";
const STAGING_TOPOLOGY_PATH = "service.portal.staging.toml";
const PRODUCTION_TOPOLOGY_PATH = "service.portal.production.toml";

let cached: AomiService | null = null;

// Match on the exact host, not a substring: `api-staging.aomi.dev` is the only
// staging endpoint, and `"...".includes("api.aomi.dev")` would wrongly route it
// to production (signing staging requests with the production key).
const STAGING_HOST = "api-staging.aomi.dev";
const PRODUCTION_HOST = "api.aomi.dev";

function hostOf(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return "";
  try {
    return new URL(trimmed).hostname;
  } catch {
    return trimmed.replace(/^[a-z]+:\/\//, "").split("/")[0].split(":")[0];
  }
}

function portalTopologyPath(): string {
  const host = hostOf(
    process.env.BACKEND_URL ??
      process.env.NEXT_PUBLIC_BACKEND_URL ??
      process.env.AOMI_PROXY_BACKEND_URL ??
      "",
  );

  if (host === STAGING_HOST) return STAGING_TOPOLOGY_PATH;
  if (host === PRODUCTION_HOST) return PRODUCTION_TOPOLOGY_PATH;
  if (process.env.VERCEL_ENV === "production") return PRODUCTION_TOPOLOGY_PATH;
  if (process.env.VERCEL_ENV === "preview") return STAGING_TOPOLOGY_PATH;
  return DEFAULT_TOPOLOGY_PATH;
}

/** The portal as an `AomiService` (self = `aomi-bff`), loaded once and reused. */
export function portalService(): AomiService {
  if (cached) return cached;
  const path = portalTopologyPath();
  const toml = readFileSync(path, "utf8");
  cached = AomiService.fromTopology({
    toml,
    selfName: SELF,
    privateKeyPem: process.env.PORTAL_SERVICE_PRIVATE_KEY,
  });
  return cached;
}
