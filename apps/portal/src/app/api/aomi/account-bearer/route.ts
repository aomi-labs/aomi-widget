import { createBearerTokenRoute } from "@aomi-labs/account";
import { resolveBetterAuthCanonicalUserId } from "@portal/lib/aomi-account/canonical-session";

export const GET = createBearerTokenRoute({
  resolveCanonicalUserId: resolveBetterAuthCanonicalUserId,
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
