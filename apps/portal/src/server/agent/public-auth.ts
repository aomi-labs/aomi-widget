import "server-only";

import { getPool } from "@aomi-labs/account";
import { resolvePortalPrincipal } from "@portal/lib/widget-auth/principal";

import { encodeApplicationId } from "./application-id";
import { resolveApplication } from "./application-discovery";
import {
  resolvePublicPrincipal,
  type CredentialValidators,
} from "./credential-ladder";
import { admitGuest } from "./guest-admission";
import { validateOAuthAccessToken } from "./oauth";

const GUEST_TTL_SECONDS = 60 * 60;
const GUEST_TURN_LIMIT = 20;

export async function resolveAgentPrincipal(
  request: Request,
  input: {
    session?: string;
    applicationId?: bigint;
    allowGuest: boolean;
    requiredScopes?: string[];
  },
) {
  const guestRequest = input.session
    ? withHeader(request, "aomi-guest-session", input.session)
    : request;
  return resolvePublicPrincipal(guestRequest, validators(request, input), {
    allowGuest: input.allowGuest,
    requiredScopes: input.requiredScopes ?? ["agent"],
  });
}

function validators(
  request: Request,
  input: { session?: string; applicationId?: bigint },
): CredentialValidators {
  return {
    oauth: validateOAuthAccessToken,
    cookie: async () => {
      const principal = await resolvePortalPrincipal(request);
      if (principal.kind === "anonymous") return null;
      return {
        canonicalUserId: principal.userId,
        clientId:
          principal.kind === "better_auth"
            ? `portal:${principal.betterAuthUserId}`
            : `widget:${principal.providerIdentityId ?? principal.userId}`,
        scopes: ["agent", "profile"],
      };
    },
    guest: async (session) => guestContext(session, input.applicationId),
  };
}

async function guestContext(sessionId: string, proposedApplication?: bigint) {
  const result = await getPool().query<{
    application_id: string | null;
    started_at: string;
    turns_used: string;
  }>(
    `select t.application_id::text,
            t.started_at::text,
            (select count(*)::text from messages m
              where m.thread_id = t.id and m.sender = 'user') as turns_used
       from threads t
      where t.id = $1 and t.user_id is null`,
    [sessionId],
  );
  const row = result.rows[0];
  const applicationId = row?.application_id
    ? BigInt(row.application_id)
    : proposedApplication;
  if (!applicationId) return null;
  if (proposedApplication && proposedApplication !== applicationId) return null;
  const application = await resolveApplication(
    encodeApplicationId(applicationId),
    {
      includePrivate: false,
    },
  );
  const now = Math.floor(Date.now() / 1_000);
  return admitGuest({
    sessionId,
    applicationId,
    sessionExpiresAt: row
      ? Number(row.started_at) + GUEST_TTL_SECONDS
      : now + GUEST_TTL_SECONDS,
    applicationIsActive: true,
    applicationIsPublic: application.isPublic,
    turnsUsed: row ? Number(row.turns_used) : 0,
    turnLimit: GUEST_TURN_LIMIT,
    now,
  }).principal;
}

function withHeader(request: Request, name: string, value: string): Request {
  const headers = new Headers(request.headers);
  headers.set(name, value);
  return new Request(request, { headers });
}
