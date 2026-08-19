import { interruptAgentTurn } from "@portal/server/agent/routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ session: string }> },
) {
  return interruptAgentTurn(request, (await context.params).session);
}
