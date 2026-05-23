import { makeAwaitHandler } from "@aomi-labs/auth/routes";
import { getAomiAuth } from "@portal/lib/aomi-auth/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Vercel Pro caps at 60s; matches our default timeout. Local `next dev`
// has no cap.
export const maxDuration = 60;

export async function GET(
  req: Request,
  ctx: { params: Promise<{ state: string }> },
): Promise<Response> {
  const { state } = await ctx.params;
  const { store } = getAomiAuth();
  const handler = makeAwaitHandler({ store });
  return handler(req, { state });
}
