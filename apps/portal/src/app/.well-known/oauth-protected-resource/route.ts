import { auth } from "@aomi-labs/account/better-auth";
import { oauthProviderResourceClient } from "@better-auth/oauth-provider/resource-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    await oauthProviderResourceClient(auth)
      .getActions()
      .getProtectedResourceMetadata(),
  );
}
