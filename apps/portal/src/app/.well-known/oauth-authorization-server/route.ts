import { auth } from "@aomi-labs/account/better-auth";
import { oauthProviderAuthServerMetadata } from "@better-auth/oauth-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const metadata = oauthProviderAuthServerMetadata(
  auth as unknown as Parameters<typeof oauthProviderAuthServerMetadata>[0],
);

export function GET(request: Request) {
  return metadata(request);
}
