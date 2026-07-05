// =============================================================================
// /auth/para — the Para login landing page.
// =============================================================================
//
// Backend-owned auth URLs land here after Aomi mints signed state
// (crates/sign/src/para/mod.rs `Para::auth_url`). URL shape:
//
//   chat.aomi.dev/auth/para?state=<token>&api_key=<para-api-key>&callback_url=<backend-callback>&wallet_family=evm
//
// `wallet_family` picks the embedded wallet family the client must guarantee
// before issuing the JWT (solana -> SOLANA, default EVM) — a fresh Para
// account has no wallet, and the backend rejects a JWT that attests none.
//
// We don't render any of Para's login UI from this server file — that's the
// client component below. This page just guards on the required query params
// and hands them down.

import { ParaAuthClient } from "./para-login-client";

type SearchParams = Promise<{
  state?: string;
  api_key?: string;
  callback_url?: string;
  wallet_family?: string;
}>;

export const dynamic = "force-dynamic";

export default async function ParaAuthPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const {
    state,
    api_key: apiKeyFromQuery,
    callback_url: rawCallbackUrl,
    wallet_family: rawWalletFamily,
  } = await searchParams;
  const callbackUrl = normalizeCallbackUrl(rawCallbackUrl);
  const requestedWalletFamily = normalizeWalletFamily(rawWalletFamily);
  // The backend sends the key it is configured with; the env fallback keeps
  // hand-built links working in development.
  const apiKey =
    apiKeyFromQuery?.trim() || process.env.NEXT_PUBLIC_PARA_API_KEY?.trim();

  if (!state || (rawCallbackUrl && !callbackUrl)) {
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

  if (!apiKey) {
    return (
      <main className="bg-background text-foreground flex min-h-screen items-center justify-center px-6">
        <div className="border-input bg-background w-full max-w-md rounded-3xl border p-8">
          <h1 className="mb-2 text-lg font-semibold">Para unavailable</h1>
          <p className="text-muted-foreground text-sm">
            This auth link carries no Para API key and the portal has no
            `NEXT_PUBLIC_PARA_API_KEY`, so the Para login UI can&apos;t start.
          </p>
        </div>
      </main>
    );
  }

  return (
    <ParaAuthClient
      state={state}
      apiKey={apiKey}
      callbackUrl={callbackUrl}
      requestedWalletFamily={requestedWalletFamily}
    />
  );
}

// Mirrors the privy page's family normalization, mapped to Para's naming
// ("evm"/"solana"); unknown values fall back to the EVM default downstream.
function normalizeWalletFamily(value?: string): "evm" | "solana" | undefined {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === "solana" || normalized === "svm") {
    return "solana";
  }
  if (normalized === "ethereum" || normalized === "evm") {
    return "evm";
  }
  return undefined;
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
