import { auth } from "@aomi-labs/account/better-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const url = new URL(req.url);
  url.pathname = "/api/auth/sign-out";
  url.search = "";
  return auth.handler(
    new Request(url, {
      method: "POST",
      headers: req.headers,
    }),
  );
}
