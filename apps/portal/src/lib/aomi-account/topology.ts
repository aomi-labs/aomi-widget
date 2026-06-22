import "server-only";

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { AomiService } from "@aomi-labs/deploy";

// The portal's runtime view of the AOMI service topology. It reads the committed
// `service.portal.toml` mesh (per-env via PORTAL_SERVICE_TOPOLOGY), selects its
// own node (`aomi-bff`), and injects its private signing key from env (the one
// secret — never in the TOML). Both bearer minting paths (user tokens,
// service-to-service) go through this.
//
// The TOML is included in the serverless bundle via `outputFileTracingIncludes`
// in next.config.ts (a dynamic `readFileSync` path isn't auto-traced).

const SELF = "aomi-bff";
const DEFAULT_TOPOLOGY_FILE = "service.portal.toml";

let cached: AomiService | null = null;

/**
 * Read the topology TOML. On Vercel (monorepo, `outputFileTracingRoot` at the
 * repo root) the function's cwd isn't guaranteed to be `apps/portal`, so try the
 * path as given, then under cwd, then under the `apps/portal` layout, before
 * letting `readFileSync` throw a clear ENOENT.
 */
function readTopology(file: string): string {
  const candidates = [
    file,
    join(process.cwd(), file),
    join(process.cwd(), "apps/portal", file),
  ];
  return readFileSync(candidates.find((p) => existsSync(p)) ?? file, "utf8");
}

/** The portal as an `AomiService` (self = `aomi-bff`), loaded once and reused. */
export function portalService(): AomiService {
  if (cached) return cached;
  const file = process.env.PORTAL_SERVICE_TOPOLOGY?.trim() || DEFAULT_TOPOLOGY_FILE;
  cached = AomiService.fromTopology({
    toml: readTopology(file),
    selfName: SELF,
    privateKeyPem: process.env.PORTAL_ACCOUNT_BEARER_PRIVATE_KEY,
  });
  return cached;
}
