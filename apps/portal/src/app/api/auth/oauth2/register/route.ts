import { registerOAuthClient } from "@portal/server/agent/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = registerOAuthClient;
