import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { McpLoginClient } from "./mcp-login-client";
import {
  readSessionCookie,
  SESSION_COOKIE,
} from "@portal/lib/aomi-account/session";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const dynamic = "force-dynamic";

export default async function McpLoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const returnTo = authorizePath(params);
  const cookieStore = await cookies();
  const canonicalUserId = await readSessionCookie(
    cookieStore.get(SESSION_COOKIE)?.value,
  );

  if (canonicalUserId) {
    redirect(
      `/api/auth/aomi/session?return_to=${encodeURIComponent(returnTo)}`,
    );
  }

  return <McpLoginClient returnTo={returnTo} />;
}

function authorizePath(
  params: Record<string, string | string[] | undefined>,
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) query.append(key, item);
      continue;
    }
    if (value !== undefined) query.set(key, value);
  }
  const suffix = query.toString();
  return suffix
    ? `/api/auth/mcp/authorize?${suffix}`
    : "/api/auth/mcp/authorize";
}
