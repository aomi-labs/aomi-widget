import "server-only";

import { randomUUID } from "node:crypto";

import { portalService } from "@aomi-labs/account";

const AUDIENCE = "aomi-backend";
const MAX_TTL_SECONDS = 5 * 60;

export type AccountInternalPrincipal = {
  kind: "account";
  canonicalUserId: string;
  clientId: string;
  scopes: string[];
};

export type GuestInternalPrincipal = {
  kind: "guest";
  sessionId: string;
  applicationId: bigint;
  expiresAt: number;
};

export type PublicPrincipal = AccountInternalPrincipal | GuestInternalPrincipal;

export async function mintInternalPrincipal(
  principal: PublicPrincipal,
  options: { now?: number; jti?: string } = {},
): Promise<{ bearer: string; expiresAt: number }> {
  const now = options.now ?? Math.floor(Date.now() / 1000);
  const jti = options.jti ?? randomUUID();
  const ttlSeconds =
    principal.kind === "guest"
      ? Math.min(MAX_TTL_SECONDS, principal.expiresAt - now)
      : MAX_TTL_SECONDS;
  if (ttlSeconds <= 0) throw new Error("guest_session_expired");

  const signed = await portalService().mint({
    role: principal.kind === "account" ? "user" : "guest",
    subject:
      principal.kind === "account"
        ? principal.canonicalUserId
        : `guest:${principal.sessionId}`,
    audience: AUDIENCE,
    ttlSeconds,
    claims:
      principal.kind === "account"
        ? {
            principal_kind: "account",
            client_id: principal.clientId,
            scopes: normalizedScopes(principal.scopes),
            jti,
          }
        : {
            principal_kind: "guest",
            session_id: principal.sessionId,
            application_id: principal.applicationId.toString(),
            custody: "external_signing",
            scopes: ["agent:chat"],
            jti,
          },
  });
  return { bearer: signed.accessToken, expiresAt: signed.expiresAt };
}

function normalizedScopes(scopes: string[]): string[] {
  return [
    ...new Set(scopes.map((scope) => scope.trim()).filter(Boolean)),
  ].sort();
}
