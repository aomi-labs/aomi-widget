import { authorizeOAuthClient } from "@portal/server/agent/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = authorizeOAuthClient;
