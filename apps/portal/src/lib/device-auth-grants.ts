import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export type DeviceAuthProvider = "privy" | "para";

export type DeviceAuthGrant = {
  code: string;
  state: string;
  codeChallenge: string;
  redirectUri: string;
  sessionToken: string;
  expiresAt: string | number | Date | null | undefined;
  betterAuthUserId?: string;
  provider?: DeviceAuthProvider;
  createdAt: number;
};

type IssueGrantInput = Omit<DeviceAuthGrant, "code" | "createdAt">;

const GRANT_TTL_MS = 5 * 60 * 1000;
const grants = new Map<string, DeviceAuthGrant>();

export function issueDeviceAuthGrant(input: IssueGrantInput): DeviceAuthGrant {
  validateState(input.state);
  validateCodeChallenge(input.codeChallenge);
  validateLoopbackRedirectUri(input.redirectUri);
  const grant: DeviceAuthGrant = {
    ...input,
    code: randomBytes(32).toString("base64url"),
    createdAt: Date.now(),
  };
  pruneExpiredGrants();
  grants.set(grant.code, grant);
  return grant;
}

export function exchangeDeviceAuthGrant(input: {
  code: string;
  state: string;
  codeVerifier: string;
  redirectUri: string;
}): DeviceAuthGrant | null {
  pruneExpiredGrants();
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
}

function pruneExpiredGrants(now = Date.now()): void {
  for (const [code, grant] of grants.entries()) {
    if (now - grant.createdAt > GRANT_TTL_MS) {
      grants.delete(code);
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
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(url.hostname)) {
    throw new Error("invalid_redirect_uri");
  }
  if (url.pathname !== "/callback") throw new Error("invalid_redirect_uri");
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
