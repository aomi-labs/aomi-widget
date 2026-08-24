import { auth } from "@aomi-labs/account/better-auth";
import { oauthProviderAuthServerMetadata } from "@better-auth/oauth-provider";
import { oauthFeatures } from "@portal/server/oauth/features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const metadata = oauthProviderAuthServerMetadata(
  auth as unknown as Parameters<typeof oauthProviderAuthServerMetadata>[0],
);

export function GET(request: Request) {
  if (!oauthFeatures.issuance()) return new Response(null, { status: 404 });
  return metadata(request);
}
