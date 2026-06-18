// =============================================================================
// /auth/privy — the Privy login landing page.
// =============================================================================
//
// Where /api/mcp-auth/privy/start redirects to after Aomi BE (or MCP) calls
// /api/mcp-auth/begin with provider=privy. URL shape:
//
//   chat.aomi.dev/auth/privy?state=<token>&app_id=<aomi-privy-app-id>
//
// We don't render any of Privy's login UI from this server file — that's the
// client component below. This page just guards on the required query params
// and hands them down.

import { PrivyAuthClient } from "./privy-login-client";

type SearchParams = Promise<{
  state?: string;
  app_id?: string;
  signer_id?: string;
}>;

export const dynamic = "force-dynamic";

export default async function PrivyAuthPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { state, app_id: appId, signer_id: signerId } = await searchParams;

  if (!state || !appId) {
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

  return <PrivyAuthClient state={state} appId={appId} signerId={signerId} />;
}
