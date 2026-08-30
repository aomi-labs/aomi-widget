/**
 * Guest credential source for public API calls. Resolves to a bearer token
 * when one is needed, or `null` when the caller already has a cookie session
 * that the request will carry on its own — attaching a bearer in that case
 * would be worse than useless: minting an anonymous session for a signed-in
 * user REPLACES their session cookie, silently signing them out and rebinding
 * their work to a guest identity.
 */
export type GuestSessionProvider = ((options?: {
  forceRefresh?: boolean;
}) => Promise<string | null>) & { clear(): void };

const COOKIE_SESSION = Symbol("cookie-session");
type Credential = string | typeof COOKIE_SESSION;

export function createGuestSessionProvider(input: {
  baseUrl: string;
  fetch?: typeof fetch;
}): GuestSessionProvider {
  const fetchImpl = input.fetch ?? globalThis.fetch.bind(globalThis);
  let credential: Credential | null = null;
  let pending: Promise<Credential> | null = null;
  const provider = async (options?: { forceRefresh?: boolean }) => {
    if (options?.forceRefresh) credential = null;
    if (credential) return credential === COOKIE_SESSION ? null : credential;
    pending ??= resolveGuestCredential(fetchImpl, input.baseUrl).finally(() => {
      pending = null;
    });
    credential = await pending;
    return credential === COOKIE_SESSION ? null : credential;
  };
  return Object.assign(provider, {
    clear() {
      credential = null;
    },
  });
}

/**
 * An existing session (signed-in or anonymous) travels as a cookie on
 * same-origin requests, so no bearer is needed and none must be minted.
 * Only a session-less caller (first visit, or cross-origin embeds where
 * third-party cookies never arrive) signs in anonymously for a bearer.
 */
async function resolveGuestCredential(
  fetchImpl: typeof fetch,
  baseUrl: string,
): Promise<Credential> {
  const origin = baseUrl.replace(/\/+$/, "");
  try {
    const response = await fetchImpl(`${origin}/api/auth/get-session`, {
      headers: { accept: "application/json" },
      credentials: "include",
    });
    if (response.ok) {
      const session: unknown = await response.json();
      if (
        session &&
        typeof session === "object" &&
        "user" in session &&
        (session as { user?: { id?: string } }).user?.id
      ) {
        return COOKIE_SESSION;
      }
    }
  } catch {
    // No session signal — fall through to anonymous sign-in.
  }
  return signInAnonymous(fetchImpl, origin);
}

async function signInAnonymous(fetchImpl: typeof fetch, origin: string) {
  const response = await fetchImpl(`${origin}/api/auth/sign-in/anonymous`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: "{}",
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(`Aomi guest sign-in failed with HTTP ${response.status}`);
  }
  const token =
    response.headers.get("set-auth-token") ??
    response.headers.get("x-auth-token") ??
    response.headers.get("auth-token");
  if (!token) throw new Error("Aomi guest sign-in returned no bearer session");
  return token;
}
