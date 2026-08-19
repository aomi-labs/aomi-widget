import { submitAgentAction } from "@portal/server/agent/routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ session: string; action: string }> },
) {
  const { session, action } = await context.params;
  return submitAgentAction(request, session, action);
}
