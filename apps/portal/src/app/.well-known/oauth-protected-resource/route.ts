import { auth } from "@aomi-labs/account/better-auth";
import { oAuthProtectedResourceMetadata } from "better-auth/plugins";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Protected-resource metadata the /api/mcp WWW-Authenticate challenge points
// MCP clients at, per the MCP authorization spec.
export const GET = oAuthProtectedResourceMetadata(auth);
