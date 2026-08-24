import { auth } from "@aomi-labs/account/better-auth";
import { oauthProviderResourceClient } from "@better-auth/oauth-provider/resource-client";
import { oauthFeatures } from "@portal/server/oauth/features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!oauthFeatures.issuance()) return new Response(null, { status: 404 });
  return Response.json(
    await oauthProviderResourceClient(auth)
      .getActions()
      .getProtectedResourceMetadata(),
  );
}
