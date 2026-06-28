import { mintAccountBearer } from "./account-bearer";
import { resolveBetterAuthCanonicalUser } from "./canonical-user";
import { resolveBetterAuthSession } from "./better-auth-session";

function bearerFromHeader(headers: Headers): string | undefined {
  const value = headers.get("authorization");
  const match = value?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim();
}

export async function resolveRequestAccountBearer(
  headers: Headers,
): Promise<string | undefined> {
  const incomingBearer = bearerFromHeader(headers);
  if (
    incomingBearer &&
    process.env.AOMI_BFF_ALLOW_DIRECT_ACCOUNT_BEARER === "1"
  ) {
    return incomingBearer;
  }

  const session = await resolveBetterAuthSession(headers);
  if (!session) return undefined;

  const user = await resolveBetterAuthCanonicalUser(
    session.betterAuthUserId,
    session.legacy,
  );
  return mintAccountBearer(user.userId);
}
