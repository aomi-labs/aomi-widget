import { auth } from "@aomi-labs/account/better-auth";
import { oauthProviderAuthServerMetadata } from "@better-auth/oauth-provider";

import { publicDiscoveryResponse } from "@portal/server/oauth/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const metadata = oauthProviderAuthServerMetadata(
  auth as unknown as Parameters<typeof oauthProviderAuthServerMetadata>[0],
);

export async function GET(request: Request) {
  return publicDiscoveryResponse(await metadata(request));
}

export async function HEAD(request: Request) {
  const response = await GET(request);
  return new Response(null, {
    status: response.status,
    headers: response.headers,
  });
}

export function OPTIONS() {
  return publicDiscoveryResponse(new Response(null, { status: 204 }));
}
