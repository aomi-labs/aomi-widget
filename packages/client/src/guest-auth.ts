export type GuestSessionProvider = ((options?: {
  forceRefresh?: boolean;
}) => Promise<string | null>) & { clear(): void };

export function createGuestSessionProvider(input: {
  baseUrl: string;
  fetch?: typeof fetch;
}): GuestSessionProvider {
  const fetchImpl = input.fetch ?? globalThis.fetch.bind(globalThis);
  const crossOriginBrowser = isCrossOriginBrowser(input.baseUrl);
  let credential: string | null | undefined;
  let pending: Promise<string | null> | null = null;
  const provider = async (options?: { forceRefresh?: boolean }) => {
    if (options?.forceRefresh) credential = undefined;
    if (credential !== undefined) return credential;
    // Same-origin requests already carry the Better Auth cookie. Try it before
    // creating an anonymous account so a signed-in user is never replaced by a
    // guest merely because the Agent client initialized.
    if (!crossOriginBrowser && !options?.forceRefresh) return null;
    pending ??= signInAnonymous(
      fetchImpl,
      input.baseUrl,
      crossOriginBrowser,
    ).finally(() => {
      pending = null;
    });
    credential = await pending;
    return credential;
  };
  return Object.assign(provider, {
    clear() {
      credential = undefined;
    },
  });
}

function isCrossOriginBrowser(baseUrl: string): boolean {
  if (typeof location === "undefined") return false;
  return new URL(baseUrl, location.origin).origin !== location.origin;
}

async function signInAnonymous(
  fetchImpl: typeof fetch,
  baseUrl: string,
  crossOriginBrowser: boolean,
) {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const authEndpoint = `${normalizedBase}/api/auth/sign-in/anonymous`;
  const response = await fetchImpl(
    crossOriginBrowser
      ? `${normalizedBase}/api/auth/widget/guest`
      : authEndpoint,
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: "{}",
      credentials: crossOriginBrowser ? "omit" : "include",
    },
  );
  if (!response.ok) {
    throw new Error(`Aomi guest sign-in failed with HTTP ${response.status}`);
  }
  if (!crossOriginBrowser) return null;
  const token = await response
    .json()
    .then((body: unknown) =>
      body &&
      typeof body === "object" &&
      "access_token" in body &&
      typeof body.access_token === "string"
        ? body.access_token
        : null,
    );
  if (!token) throw new Error("Aomi guest sign-in returned no bearer session");
  return token;
}
