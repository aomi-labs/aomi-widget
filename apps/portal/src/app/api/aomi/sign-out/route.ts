import { auth } from "@aomi-labs/auth/better-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const result = await auth.api.signOut({ headers: req.headers });
  return Response.json(result);
}
