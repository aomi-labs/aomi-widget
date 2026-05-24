import { makeCallbackHandler } from "@aomi-labs/auth/routes";
import { getAomiAuth } from "@portal/lib/aomi-auth/local-secret-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function build() {
  const { store, providers, approvalsStore } = getAomiAuth();
  return makeCallbackHandler({ store, providers, approvalsStore });
}

export async function GET(req: Request): Promise<Response> {
  return build()(req, { providerName: "privy" });
}

export async function POST(req: Request): Promise<Response> {
  return build()(req, { providerName: "privy" });
}
