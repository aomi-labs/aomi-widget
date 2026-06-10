// =============================================================================
// /auth/privy — the Privy login landing page.
// =============================================================================
//
// Backend-owned auth URLs land here after Aomi mints signed state. URL shape:
//
//   chat.aomi.dev/auth/privy?state=<token>&app_id=<aomi-privy-app-id>&callback_url=<backend-callback>
//
// We don't render any of Privy's login UI from this server file — that's the
// client component below. This page just guards on the required query params
// and hands them down.

import { PrivyAuthClient } from "./privy-login-client";

type SearchParams = Promise<{
  state?: string;
  app_id?: string;
  callback_url?: string;
  signer_id?: string;
}>;

export const dynamic = "force-dynamic";

export default async function PrivyAuthPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const {
    state,
    app_id: appId,
    callback_url: rawCallbackUrl,
    signer_id: signerId,
  } = await searchParams;
  const callbackUrl = normalizeCallbackUrl(rawCallbackUrl);

  if (!state || !appId || (rawCallbackUrl && !callbackUrl)) {
    return (
      <main className="bg-background text-foreground flex min-h-screen items-center justify-center px-6">
        <div className="border-input bg-background w-full max-w-md rounded-3xl border p-8">
          <h1 className="mb-2 text-lg font-semibold">Invalid auth link</h1>
          <p className="text-muted-foreground text-sm">
            This page is reached via a generated auth URL. Open the link your
            Aomi session produced — manual access isn&apos;t supported.
          </p>
        </div>
      </main>
    );
  }

  return (
    <PrivyAuthClient
      state={state}
      appId={appId}
      callbackUrl={callbackUrl}
      signerId={normalizeSignerId(signerId)}
    />
  );
}

function normalizeSignerId(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeCallbackUrl(value?: string): string | undefined {
  if (!value) return undefined;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return undefined;
  }
  if (!isAllowedCallbackHost(url.hostname)) return undefined;
  if (url.protocol === "https:") return url.toString();
  if (url.protocol === "http:" && isLocalhost(url.hostname))
    return url.toString();
  return undefined;
}

function isAllowedCallbackHost(hostname: string): boolean {
  return (
    isLocalhost(hostname) ||
    hostname === "aomi.dev" ||
    hostname.endsWith(".aomi.dev")
  );
}

function isLocalhost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]"
  );
}
