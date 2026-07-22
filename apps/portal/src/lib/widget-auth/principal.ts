import {
  hasWidgetSessionBearer,
  observedWidgetOrigin,
  resolveWidgetSession,
} from "@aomi-labs/account/widget-auth";
import {
  getAccountResponseForBetterAuthSession,
  getAccountResponseForWidgetSession,
} from "@aomi-labs/account/account";
import {
  getBetterAuthSession,
  requireAomiSession,
  sessionUserSeed,
} from "@portal/lib/aomi-account/session";

export type PortalPrincipal =
  | {
      kind: "better_auth";
      userId: string;
      betterAuthUserId: string;
      session: Awaited<ReturnType<typeof getBetterAuthSession>>;
    }
  | {
      kind: "widget";
      userId: string;
      authMethod: string;
      expiresAt: number;
      providerIdentityId?: string;
    }
  | { kind: "anonymous" };

export class PortalPrincipalError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
    this.name = "PortalPrincipalError";
  }
}

export async function resolvePortalPrincipal(
  request: Request,
): Promise<PortalPrincipal> {
  const firstParty = isFirstPartyRequest(request);
  if (firstParty) {
    const current = await requireAomiSession(request);
    const betterAuthUserId = current?.session?.user?.id;
    if (current && betterAuthUserId) {
      return {
        kind: "better_auth",
        userId: current.user.id,
        betterAuthUserId,
        session: current.session,
      };
    }
  }

  const widget = await resolveWidgetSession({ request });
  if (widget) return { kind: "widget", ...widget };
  if (hasWidgetSessionBearer(request)) {
    throw new PortalPrincipalError("invalid_widget_session", 401);
  }
  return { kind: "anonymous" };
}

export async function requirePortalPrincipal(
  request: Request,
): Promise<Exclude<PortalPrincipal, { kind: "anonymous" }>> {
  const principal = await resolvePortalPrincipal(request);
  if (principal.kind === "anonymous") {
    throw new PortalPrincipalError("unauthenticated", 401);
  }
  return principal;
}

export async function resolvePortalCanonicalUserId(
  request: Request,
): Promise<string | null> {
  const principal = await resolvePortalPrincipal(request);
  return principal.kind === "anonymous" ? null : principal.userId;
}

export async function accountResponseForPrincipal(
  request: Request,
  principal?: Exclude<PortalPrincipal, { kind: "anonymous" }>,
) {
  const resolved = principal ?? (await requirePortalPrincipal(request));
  if (resolved.kind === "widget") {
    return getAccountResponseForWidgetSession({
      userId: resolved.userId,
      expiresAt: resolved.expiresAt,
      authMethod: resolved.authMethod,
    });
  }
  const seed = sessionUserSeed(resolved.session);
  if (!seed) throw new PortalPrincipalError("unauthenticated", 401);
  return getAccountResponseForBetterAuthSession({
    ...seed,
    expiresAt: resolved.session?.session?.expiresAt,
    fresh: resolved.session?.session?.fresh,
  });
}

function isFirstPartyRequest(request: Request): boolean {
  const origin = observedWidgetOrigin(request);
  if (!origin) return true;
  return origin === new URL(request.url).origin;
}
