import { startAgentTurn } from "@portal/server/agent/routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const POST = startAgentTurn;
