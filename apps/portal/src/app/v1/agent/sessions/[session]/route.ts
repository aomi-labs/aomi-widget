import {
  deleteAgentSession,
  updateAgentSession,
} from "@portal/server/agent/routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ session: string }> },
) {
  return updateAgentSession(request, (await context.params).session);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ session: string }> },
) {
  return deleteAgentSession(request, (await context.params).session);
}
