import { listPublicApps } from "@portal/server/agent/routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = listPublicApps;
