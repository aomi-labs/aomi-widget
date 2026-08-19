import type { PublicPrincipal } from "./internal-principal";

export class PublicCredentialError extends Error {
  constructor(
    readonly code:
      | "invalid_authorization"
      | "invalid_access_token"
      | "insufficient_scope"
      | "invalid_cookie"
      | "invalid_guest_session"
      | "authentication_required",
    readonly status: 401 | 403 = code === "insufficient_scope" ? 403 : 401,
  ) {
    super(code);
  }
}

type AccountSeed = {
  canonicalUserId: string;
  clientId: string;
  scopes: string[];
};

export type CredentialValidators = {
  oauth(accessToken: string): Promise<AccountSeed | null>;
  cookie(request: Request): Promise<AccountSeed | null>;
  guest(session: string): Promise<{
    sessionId: string;
    applicationId: bigint;
    expiresAt: number;
  } | null>;
};

export async function resolvePublicPrincipal(
  request: Request,
  validators: CredentialValidators,
  options: { requiredScopes?: string[]; allowGuest?: boolean } = {},
): Promise<PublicPrincipal> {
  const authorization = request.headers.get("authorization");
  if (authorization !== null) {
    const match = /^Bearer (aomi_at_[A-Za-z0-9._~-]+)$/.exec(authorization);
    if (!match) throw new PublicCredentialError("invalid_authorization");
    const account = await validators.oauth(match[1]);
    if (!account) throw new PublicCredentialError("invalid_access_token");
    requireScopes(account.scopes, options.requiredScopes ?? []);
    return { kind: "account", ...account };
  }

  const cookie = await validators.cookie(request);
  if (cookie) {
    requireScopes(cookie.scopes, options.requiredScopes ?? []);
    return { kind: "account", ...cookie };
  }

  const guestHeader = request.headers.get("aomi-guest-session");
  if (guestHeader !== null) {
    if (
      !options.allowGuest ||
      !/^sess_[A-Za-z0-9_-]{16,128}$/.test(guestHeader)
    ) {
      throw new PublicCredentialError("invalid_guest_session");
    }
    const guest = await validators.guest(guestHeader);
    if (!guest) throw new PublicCredentialError("invalid_guest_session");
    return { kind: "guest", ...guest };
  }

  throw new PublicCredentialError("authentication_required");
}

function requireScopes(actual: string[], required: string[]): void {
  const available = new Set(actual);
  if (!required.every((scope) => available.has(scope))) {
    throw new PublicCredentialError("insufficient_scope");
  }
}
