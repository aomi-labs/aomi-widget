import { makeBeginHandler } from "@aomi-labs/auth/routes";
import { readEnv } from "@portal/lib/aomi-auth/env";
import { getAomiAuth } from "@portal/lib/aomi-auth/local-secret-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const env = readEnv();
  const { store, providers } = getAomiAuth();
  const handler = makeBeginHandler({
    store,
    providers,
    baseUrl: env.baseUrl,
    authToken: env.authToken,
  });
  return handler(req);
}
