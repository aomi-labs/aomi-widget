import { resolveWidgetCanonicalUserId } from "@aomi-labs/account/widget-auth";
import { resolveBetterAuthCanonicalUserId } from "@portal/lib/aomi-account/canonical-session";

export async function resolvePortalCanonicalUserId(
  request: Request,
): Promise<string | null> {
  const betterAuthUserId = await resolveBetterAuthCanonicalUserId(request);
  if (betterAuthUserId) return betterAuthUserId;
  return resolveWidgetCanonicalUserId(request);
}
