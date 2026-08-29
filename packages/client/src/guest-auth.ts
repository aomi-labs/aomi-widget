export type GuestSessionProvider = ((options?: {
  forceRefresh?: boolean;
}) => Promise<string>) & { clear(): void };

export function createGuestSessionProvider(input: {
  baseUrl: string;
  fetch?: typeof fetch;
}): GuestSessionProvider {
  const fetchImpl = input.fetch ?? globalThis.fetch.bind(globalThis);
  let credential: string | null = null;
  let pending: Promise<string> | null = null;
  const provider = async (options?: { forceRefresh?: boolean }) => {
    if (options?.forceRefresh) credential = null;
    if (credential) return credential;
    pending ??= signInAnonymous(fetchImpl, input.baseUrl).finally(() => {
      pending = null;
    });
    credential = await pending;
    return credential;
  };
  return Object.assign(provider, {
    clear() {
      credential = null;
    },
  });
}

async function signInAnonymous(fetchImpl: typeof fetch, baseUrl: string) {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const authEndpoint = `${normalizedBase}/api/auth/sign-in/anonymous`;
  const crossOriginBrowser =
    typeof location !== "undefined" &&
    new URL(authEndpoint, location.origin).origin !== location.origin;
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
  const token = crossOriginBrowser
    ? await response
        .json()
        .then((body: unknown) =>
          body &&
          typeof body === "object" &&
          "access_token" in body &&
          typeof body.access_token === "string"
            ? body.access_token
            : null,
        )
    : (response.headers.get("set-auth-token") ??
      response.headers.get("x-auth-token") ??
      response.headers.get("auth-token"));
  if (!token) throw new Error("Aomi guest sign-in returned no bearer session");
  return token;
}
