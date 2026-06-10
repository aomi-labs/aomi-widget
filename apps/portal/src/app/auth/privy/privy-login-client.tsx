"use client";

// =============================================================================
// Privy login client — drives the React SDK and POSTs back to the callback.
// =============================================================================
//
// Lifecycle:
//   1. Mount inside <PrivyProvider appId>. The SDK takes a moment to be
//      `ready`; we render a small loader until then.
//   2. If not authenticated, show a "Continue with Privy" button. Click ->
//      Privy opens its modal (email/SMS/wallet) and runs the login flow in
//      a privy.io iframe — Alice's email codes and key material never touch
//      this page's JS.
//   3. Once authenticated, collect the EVM embedded wallet info + access
//      token and POST to /api/auth/privy/callback with the state token.
//      That endpoint registers Aomi's signer and persists the approval.
//   4. Show success (or error) — Alice closes the tab.
//
// We do NOT support unlinking, account switching, or wallet management here;
// this is a one-shot connect flow. If Alice has an existing Privy session in
// this browser (from a prior visit), `authenticated` will be true on mount —
// in that case we just collect the cached credentials and POST. No re-prompt.

import {
  PrivyProvider,
  type User,
  useCreateWallet,
  usePrivy,
  useWallets,
} from "@privy-io/react-auth";
import { useCallback, useEffect, useMemo, useState } from "react";

interface Props {
  state: string;
  appId: string;
  callbackUrl?: string;
}

export function PrivyAuthClient({ state, appId, callbackUrl }: Props) {
  return (
    <PrivyProvider
      appId={appId}
      config={{
        // We only need an EVM embedded wallet for v1 (byreal perps + HL).
        // Solana wallet support gets added when we wire byreal spot/LP.
        embeddedWallets: {
          ethereum: { createOnLogin: "all-users" },
        },
        loginMethods: ["email", "sms", "wallet"],
        appearance: {
          theme: "light",
          accentColor: "#000000",
        },
      }}
    >
      <PrivyConnectFlow state={state} callbackUrl={callbackUrl} />
    </PrivyProvider>
  );
}

type Status =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "submitting" }
  | { kind: "success"; address: string }
  | { kind: "error"; message: string };

function PrivyConnectFlow({
  state,
  callbackUrl,
}: {
  state: string;
  callbackUrl?: string;
}) {
  const { ready, authenticated, user, login, getAccessToken, logout } =
    usePrivy();
  const { createWallet } = useCreateWallet();
  const { ready: walletsReady, wallets } = useWallets();

  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // The embedded wallet we just created (or that Privy already had cached).
  // `walletClientType === 'privy'` filters out injected/external wallets that
  // the user might have linked — we only stash the embedded one because
  // that's the one Aomi BE will sign through.
  const embeddedWallet = useMemo(
    () => wallets.find((w) => w.walletClientType === "privy"),
    [wallets],
  );

  // Transition to `ready` once the SDK reports ready. Don't auto-submit on
  // mount even if already authenticated — wait for the user to acknowledge
  // by clicking the button. (Avoids surprising silent grants.)
  useEffect(() => {
    if (status.kind === "loading" && ready) {
      setStatus({ kind: "ready" });
    }
  }, [ready, status.kind]);

  const submit = useCallback(async () => {
    if (hasSubmitted) return;
    if (!user) {
      setStatus({
        kind: "error",
        message: "No Privy user is authenticated.",
      });
      return;
    }

    setHasSubmitted(true);
    setStatus({ kind: "submitting" });

    let walletAddress = embeddedWallet?.address;
    let walletId = walletAddress
      ? embeddedWalletIdForUser(user, walletAddress)
      : null;

    if (!walletAddress) {
      try {
        const createdWallet = await createWallet();
        walletAddress = createdWallet.address;
        walletId =
          createdWallet.id ?? embeddedWalletIdForUser(user, walletAddress);
      } catch (err) {
        setStatus({
          kind: "error",
          message: `Could not create embedded Privy wallet: ${errMsg(err)}`,
        });
        setHasSubmitted(false);
        return;
      }
    }

    if (!walletId) {
      setStatus({
        kind: "error",
        message:
          "Privy did not return a stable wallet id for the embedded wallet.",
      });
      setHasSubmitted(false);
      return;
    }

    let accessToken: string | null;
    try {
      accessToken = await getAccessToken();
    } catch (err) {
      setStatus({
        kind: "error",
        message: `Could not read access token: ${errMsg(err)}`,
      });
      return;
    }
    if (!accessToken) {
      setStatus({ kind: "error", message: "No access token from Privy." });
      return;
    }

    try {
      const res = await fetch(callbackUrl ?? "/api/auth/privy/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state,
          access_token: accessToken,
          user_id: user.id,
          wallet_id: walletId,
          wallet_address: walletAddress,
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        setStatus({
          kind: "error",
          message: `Callback failed: ${res.status} ${text.slice(0, 200)}`,
        });
        return;
      }
      setStatus({ kind: "success", address: walletAddress });
    } catch (err) {
      setStatus({
        kind: "error",
        message: `Callback request failed: ${errMsg(err)}`,
      });
    }
  }, [
    callbackUrl,
    createWallet,
    embeddedWallet,
    getAccessToken,
    hasSubmitted,
    state,
    user,
  ]);

  // Auto-submit once we have a wallet AND the user has already authenticated
  // in this browser (cached Privy session). On a fresh login, the user
  // clicks the button which triggers `login()`; after that flow completes
  // `authenticated` flips true and we hit this same path.
  useEffect(() => {
    if (
      status.kind === "ready" &&
      authenticated &&
      walletsReady &&
      !hasSubmitted
    ) {
      void submit();
    }
  }, [authenticated, hasSubmitted, status.kind, submit, walletsReady]);

  return (
    <main className="bg-background text-foreground flex min-h-screen items-center justify-center px-6 py-12">
      <div className="border-input bg-background w-full max-w-md rounded-3xl border p-8">
        <Header />
        <Body
          status={status}
          authenticated={authenticated}
          onLogin={() => {
            void login();
          }}
          onLogoutAndRetry={() => {
            void logout();
            setHasSubmitted(false);
            setStatus({ kind: "ready" });
          }}
        />
      </div>
    </main>
  );
}

function Header() {
  return (
    <div className="mb-6 space-y-2">
      <div className="bg-foreground text-background mb-4 flex h-10 w-10 items-center justify-center rounded-full font-semibold">
        C
      </div>
      <h1 className="text-lg font-semibold">Connect a self-custody wallet</h1>
      <p className="text-muted-foreground text-sm">
        Aomi is setting up a new wallet that you fully control. Privy holds the
        key on your behalf — Aomi never sees it. The login UI below is served by
        Privy directly.
      </p>
    </div>
  );
}

function Body({
  status,
  authenticated,
  onLogin,
  onLogoutAndRetry,
}: {
  status: Status;
  authenticated: boolean;
  onLogin: () => void;
  onLogoutAndRetry: () => void;
}) {
  switch (status.kind) {
    case "loading":
      return <Pending text="Loading Privy…" />;

    case "ready":
      if (authenticated) {
        return <Pending text="Reading your wallet…" />;
      }
      return (
        <button
          type="button"
          onClick={onLogin}
          className="bg-foreground text-background hover:bg-foreground/90 w-full rounded-full px-6 py-3 text-sm font-medium transition-colors"
        >
          Continue with Privy
        </button>
      );

    case "submitting":
      return <Pending text="Connecting your wallet to Aomi…" />;

    case "success":
      return (
        <div className="space-y-4">
          <SuccessBanner address={status.address} />
          <p className="text-muted-foreground text-sm">
            You can close this tab and return to your Aomi session.
          </p>
        </div>
      );

    case "error":
      return (
        <div className="space-y-4">
          <ErrorBanner message={status.message} />
          <button
            type="button"
            onClick={onLogoutAndRetry}
            className="border-input hover:bg-accent w-full rounded-full border px-6 py-3 text-sm font-medium transition-colors"
          >
            Start over
          </button>
        </div>
      );
  }
}

function Pending({ text }: { text: string }) {
  return (
    <div className="text-muted-foreground flex items-center gap-3 text-sm">
      <span
        aria-hidden
        className="border-foreground/20 border-t-foreground inline-block h-4 w-4 animate-spin rounded-full border-2"
      />
      {text}
    </div>
  );
}

function SuccessBanner({ address }: { address: string }) {
  const short = `${address.slice(0, 6)}…${address.slice(-4)}`;
  return (
    <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-700 dark:text-green-400">
      <p className="font-medium">Connected.</p>
      <p className="mt-1 font-mono text-xs">{short}</p>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="bg-destructive/10 border-destructive/20 text-destructive rounded-2xl border p-4 text-sm">
      <p className="font-medium">Something went wrong.</p>
      <p className="mt-1 break-words">{message}</p>
    </div>
  );
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function embeddedWalletIdForUser(user: User, address: string): string | null {
  const target = address.toLowerCase();

  for (const account of user.linkedAccounts) {
    if (
      account.type === "wallet" &&
      account.walletClientType === "privy" &&
      account.address.toLowerCase() === target
    ) {
      return account.id ?? null;
    }
  }

  return null;
}
