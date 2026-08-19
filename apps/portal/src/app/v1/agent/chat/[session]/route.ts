import { readAgentDelta } from "@portal/server/agent/routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(
  request: Request,
  context: { params: Promise<{ session: string }> },
) {
  return readAgentDelta(request, (await context.params).session);
}
