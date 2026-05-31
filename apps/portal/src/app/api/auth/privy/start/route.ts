import { makeStartHandler } from "@aomi-labs/auth/routes";
import { readEnv } from "@portal/lib/aomi-auth/env";
import { getAomiAuth } from "@portal/lib/aomi-auth/auth-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const env = readEnv();
  const { store, providers } = getAomiAuth();
  const handler = makeStartHandler({
    store,
    providers,
    baseUrl: env.baseUrl,
  });
  return handler(req, { providerName: "privy" });
}
