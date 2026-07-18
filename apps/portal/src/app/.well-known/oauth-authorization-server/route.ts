import { auth } from "@aomi-labs/account/better-auth";
import { oAuthDiscoveryMetadata } from "better-auth/plugins";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// OAuth 2.0 authorization-server discovery for MCP clients: points at the
// better-auth MCP plugin's authorize/token/register endpoints.
export const GET = oAuthDiscoveryMetadata(auth);
