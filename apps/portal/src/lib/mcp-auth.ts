import { betterAuth, type BetterAuthPlugin } from "better-auth";
import { createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { mcp } from "better-auth/plugins";
import { PostgresDialect } from "kysely";
import { getPool } from "@aomi-labs/account";
import {
  readSessionCookie,
  SESSION_COOKIE,
} from "@portal/lib/aomi-account/session";

const DEFAULT_BASE_URL = "http://localhost:3000";
const DEFAULT_MCP_RESOURCE = "http://127.0.0.1:3010/mcp";
const MCP_SCOPE = "aomi:mcp";

export const auth = betterAuth({
  basePath: "/api/auth",
  baseURL:
    process.env.BETTER_AUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_PORTAL_URL?.trim() ||
    DEFAULT_BASE_URL,
  secret:
    process.env.BETTER_AUTH_SECRET?.trim() ||
    process.env.PORTAL_ONLY_SESSION_SECRET?.trim(),
  database: {
    dialect: new PostgresDialect({ pool: getPool() }),
    type: "postgres",
    casing: "camel",
  },
  plugins: [
    mcp({
      loginPage: "/mcp/login",
      resource:
        process.env.AOMI_MCP_RESOURCE_URL?.trim() || DEFAULT_MCP_RESOURCE,
      oidcConfig: {
        loginPage: "/mcp/login",
        defaultScope: `openid profile email offline_access ${MCP_SCOPE}`,
        requirePKCE: true,
        scopes: [MCP_SCOPE],
      },
    }),
    aomiSessionBridge(),
  ],
});

function aomiSessionBridge(): BetterAuthPlugin {
  return {
    id: "aomi-session-bridge",
    endpoints: {
      aomiSessionBridge: createAuthEndpoint(
        "/aomi/session",
        { method: "GET" },
        async (ctx) => {
          const canonicalUserId = await readSessionCookie(
            cookieValue(ctx.request?.headers, SESSION_COOKIE),
          );
          if (!canonicalUserId) {
            throw ctx.redirect("/mcp/login");
          }

          let user =
            await ctx.context.internalAdapter.findUserById(canonicalUserId);
          if (!user) {
            user = await ctx.context.internalAdapter.createUser({
              id: canonicalUserId,
              name: "Aomi user",
              email: `${canonicalUserId}@users.aomi.local`,
              emailVerified: true,
            });
          }

          const session = await ctx.context.internalAdapter.createSession(
            user.id,
          );
          await setSessionCookie(ctx, { session, user }, false);
          throw ctx.redirect(returnPath(ctx.request));
        },
      ),
    },
  };
}

function cookieValue(
  headers: Headers | undefined,
  name: string,
): string | undefined {
  const cookieHeader = headers?.get("cookie");
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName === name) return decodeURIComponent(rawValue.join("="));
  }
  return undefined;
}

function returnPath(request: Request | undefined): string {
  if (!request) return "/api/auth/mcp/authorize";
  const value = new URL(request.url).searchParams.get("return_to");
  if (!value || !value.startsWith("/api/auth/mcp/authorize")) {
    return "/api/auth/mcp/authorize";
  }
  return value;
}
