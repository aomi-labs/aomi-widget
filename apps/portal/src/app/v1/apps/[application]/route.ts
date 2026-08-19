import { getPublicApp } from "@portal/server/agent/routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ application: string }> },
) {
  return getPublicApp(request, (await context.params).application);
}
