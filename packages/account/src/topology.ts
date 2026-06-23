import { readFileSync } from "node:fs";

import { AomiService } from "@aomi-labs/service";

// The issuer's runtime view of the AOMI service topology. It reads the committed
// `service.portal.toml` mesh, selects its own node (`aomi-bff`), and injects its
// private signing key from env (the one secret — never in the TOML). Both bearer
// minting paths (user tokens, service-to-service) go through this.
//
// Server-only: `AomiService.fromTopology` calls `assertServerOnly()`, so this
// throws if it is ever imported into a browser bundle — which is why the whole
// `@aomi-labs/account` package must stay out of client/browser code.

const SELF = "aomi-bff";
const DEFAULT_TOPOLOGY_PATH = "service.portal.toml";
const STAGING_TOPOLOGY_PATH = "service.portal.staging.toml";
const PRODUCTION_TOPOLOGY_PATH = "service.portal.production.toml";

let cached: AomiService | null = null;

function portalTopologyPath(): string {
  const backendUrl = (
    process.env.BACKEND_URL ??
    process.env.NEXT_PUBLIC_BACKEND_URL ??
    process.env.AOMI_PROXY_BACKEND_URL ??
    ""
  ).toLowerCase();

  if (backendUrl.includes("api-staging.aomi.dev")) {
    return STAGING_TOPOLOGY_PATH;
  }
  if (backendUrl.includes("api.aomi.dev")) {
    return PRODUCTION_TOPOLOGY_PATH;
  }
  if (process.env.VERCEL_ENV === "production") {
    return PRODUCTION_TOPOLOGY_PATH;
  }
  if (process.env.VERCEL_ENV === "preview") {
    return STAGING_TOPOLOGY_PATH;
  }
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
