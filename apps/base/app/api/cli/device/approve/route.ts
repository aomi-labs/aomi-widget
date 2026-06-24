import { NextRequest, NextResponse } from "next/server";
import { approveDeviceSession } from "../../../../../lib/bff/cli-session";
import { resolveBetterAuthCanonicalUser } from "../../../../../lib/bff/canonical-user";
import { resolveBetterAuthSession } from "../../../../../lib/bff/better-auth-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function approvalPage(userCode: string): NextResponse {
  const escaped = userCode.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char] ?? char;
  });
  return new NextResponse(
    `<!doctype html>
<html>
  <body>
    <h1>Approve Aomi CLI Login</h1>
    <p>Code: <strong>${escaped}</strong></p>
    <form method="post">
      <input type="hidden" name="user_code" value="${escaped}" />
      <button type="submit">Approve CLI</button>
    </form>
  </body>
</html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

async function readUserCode(req: NextRequest): Promise<string | undefined> {
  const fromQuery = req.nextUrl.searchParams.get("user_code")?.trim();
  if (fromQuery) return fromQuery;

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await req.json()) as { user_code?: unknown };
    return typeof body.user_code === "string" ? body.user_code.trim() : undefined;
  }

  const form = await req.formData();
  const value = form.get("user_code");
  return typeof value === "string" ? value.trim() : undefined;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  return approvalPage(req.nextUrl.searchParams.get("user_code") ?? "");
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const userCode = await readUserCode(req);
  if (!userCode) {
    return NextResponse.json({ error: "user_code is required" }, { status: 400 });
  }

  const session = await resolveBetterAuthSession(req.headers);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await resolveBetterAuthCanonicalUser(
      session.betterAuthUserId,
      session.legacy,
    );
    const approved = await approveDeviceSession(userCode, user.userId);
    if (!approved) {
      return NextResponse.json(
        { error: "Device code expired or already used" },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: true, user_id: user.userId });
  } catch (error) {
    console.error("Failed to approve CLI device session", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to approve device session" },
      { status: 500 },
    );
  }
}
