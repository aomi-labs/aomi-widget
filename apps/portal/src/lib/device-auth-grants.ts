import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export type DeviceAuthProvider = "privy" | "para";

export type DeviceAuthGrantPurpose = "login" | "link";

type DeviceAuthGrantBase = {
  code: string;
  state: string;
  codeChallenge: string;
  redirectUri: string;
  betterAuthUserId?: string;
  provider?: DeviceAuthProvider;
  createdAt: number;
};

export type DeviceAuthLoginGrant = DeviceAuthGrantBase & {
  purpose: "login";
  sessionToken: string;
  expiresAt: string | number | Date | null | undefined;
};

export type DeviceAuthLinkGrant = DeviceAuthGrantBase & {
  purpose: "link";
  credential: unknown;
};

export type DeviceAuthGrant = DeviceAuthLoginGrant | DeviceAuthLinkGrant;

export type DeviceAuthLinkIntent = {
  id: string;
  state: string;
  codeChallenge: string;
  redirectUri: string;
  betterAuthUserId: string;
  provider?: DeviceAuthProvider;
  createdAt: number;
};

type IssueGrantInput = Omit<
  DeviceAuthLoginGrant,
  "code" | "createdAt" | "purpose"
>;

const GRANT_TTL_MS = 5 * 60 * 1000;
const grants = new Map<string, DeviceAuthGrant>();
const linkIntents = new Map<string, DeviceAuthLinkIntent>();

export function issueDeviceAuthGrant(
  input: IssueGrantInput,
): DeviceAuthLoginGrant {
  validateState(input.state);
  validateCodeChallenge(input.codeChallenge);
  validateLoopbackRedirectUri(input.redirectUri);
  const grant: DeviceAuthGrant = {
    ...input,
    purpose: "login",
    code: randomBytes(32).toString("base64url"),
    createdAt: Date.now(),
  };
  pruneExpiredDeviceAuthRecords();
  grants.set(grant.code, grant);
  return grant;
}

export function issueDeviceAuthLinkIntent(input: {
  state: string;
  codeChallenge: string;
  redirectUri: string;
  betterAuthUserId: string;
  provider?: DeviceAuthProvider;
}): DeviceAuthLinkIntent {
  validateState(input.state);
  validateCodeChallenge(input.codeChallenge);
  validateLoopbackRedirectUri(input.redirectUri);
  if (!input.betterAuthUserId) throw new Error("invalid_better_auth_user_id");
  const intent: DeviceAuthLinkIntent = {
    ...input,
    id: randomBytes(32).toString("base64url"),
    createdAt: Date.now(),
  };
  pruneExpiredDeviceAuthRecords();
  linkIntents.set(intent.id, intent);
  return intent;
}

export function issueDeviceAuthLinkGrant(input: {
  linkIntent: string;
  state: string;
  redirectUri: string;
  provider: DeviceAuthProvider;
  credential: unknown;
}): DeviceAuthLinkGrant {
  pruneExpiredDeviceAuthRecords();
  const intent = linkIntents.get(input.linkIntent);
  if (!intent) throw new Error("invalid_or_expired_link_intent");
  if (
    !safeEqual(intent.state, input.state) ||
    intent.redirectUri !== input.redirectUri ||
    (intent.provider && intent.provider !== input.provider)
  ) {
    throw new Error("invalid_link_intent");
  }
  if (!input.credential) throw new Error("invalid_provider_credential");
  linkIntents.delete(input.linkIntent);
  const grant: DeviceAuthLinkGrant = {
    purpose: "link",
    code: randomBytes(32).toString("base64url"),
    state: intent.state,
    codeChallenge: intent.codeChallenge,
    redirectUri: intent.redirectUri,
    betterAuthUserId: intent.betterAuthUserId,
    provider: input.provider,
    credential: input.credential,
    createdAt: Date.now(),
  };
  grants.set(grant.code, grant);
  return grant;
}

export function exchangeDeviceAuthGrant(input: {
  code: string;
  state: string;
  codeVerifier: string;
  redirectUri: string;
}): DeviceAuthGrant | null {
  pruneExpiredDeviceAuthRecords();
  const grant = grants.get(input.code);
  if (!grant) return null;
  grants.delete(input.code);
  if (
    !safeEqual(grant.state, input.state) ||
    grant.redirectUri !== input.redirectUri ||
    !safeEqual(grant.codeChallenge, sha256Base64Url(input.codeVerifier))
  ) {
    return null;
  }
  return grant;
}

export function clearDeviceAuthGrantsForTests(): void {
  grants.clear();
  linkIntents.clear();
}

function pruneExpiredDeviceAuthRecords(now = Date.now()): void {
  for (const [code, grant] of grants.entries()) {
    if (now - grant.createdAt > GRANT_TTL_MS) {
      grants.delete(code);
    }
  }
  for (const [id, intent] of linkIntents.entries()) {
    if (now - intent.createdAt > GRANT_TTL_MS) {
      linkIntents.delete(id);
    }
  }
}

function validateState(state: string): void {
  if (!/^[A-Za-z0-9_-]{16,256}$/.test(state)) {
    throw new Error("invalid_state");
  }
}

function validateCodeChallenge(codeChallenge: string): void {
  if (!/^[A-Za-z0-9_-]{32,256}$/.test(codeChallenge)) {
    throw new Error("invalid_code_challenge");
  }
}

function validateLoopbackRedirectUri(redirectUri: string): void {
  let url: URL;
  try {
    url = new URL(redirectUri);
  } catch {
    throw new Error("invalid_redirect_uri");
  }
  if (url.protocol !== "http:") throw new Error("invalid_redirect_uri");
  if (url.username || url.password) throw new Error("invalid_redirect_uri");
  if (!["127.0.0.1", "localhost"].includes(url.hostname)) {
    throw new Error("invalid_redirect_uri");
  }
  if (!/^\d{1,5}$/.test(url.port)) throw new Error("invalid_redirect_uri");
  const port = Number(url.port);
  if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
    throw new Error("invalid_redirect_uri");
  }
  if (url.pathname !== "/callback") throw new Error("invalid_redirect_uri");
  if (url.search || url.hash) throw new Error("invalid_redirect_uri");
}

function sha256Base64Url(value: string): string {
  return createHash("sha256").update(value).digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}
