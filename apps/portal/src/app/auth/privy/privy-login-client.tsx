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
//   3. Once authenticated, re-fetch the user over the live Privy session
//      (`refreshUser`) and derive the wallet payload strictly from that
//      fresh user object, then POST it + the access token to the backend
//      callback URL with the state token. That endpoint registers Aomi's
//      signer and persists the approval.
//   4. Show success (or error) — Alice closes the tab.
//
// We do NOT support unlinking, account switching, or wallet management here;
// this is a one-shot connect flow. If Alice has an existing Privy session in
// this browser (from a prior visit), `authenticated` will be true on mount —
// we still re-fetch the user before POSTing, so a stale cached identity (or
// a wallet belonging to a different account) can never enter the payload.
// No re-prompt.

import {
  PrivyProvider,
  type User,
  useCreateWallet,
  usePrivy,
  useSigners,
  useUser,
  useWallets,
} from "@privy-io/react-auth";
import {
  useCreateWallet as useCreateSolanaWallet,
  useWallets as useSolanaWallets,
} from "@privy-io/react-auth/solana";
import { useCallback, useEffect, useState } from "react";
import {
  ensureServerSignerAccess,
  isWalletOwnershipMismatchError,
} from "./signer-grants";

interface Props {
  state: string;
  appId: string;
  signerId: string;
  callbackUrl?: string;
  requestedWalletFamily?: WalletChainType;
}

export function PrivyAuthClient({
  state,
  appId,
  signerId,
  callbackUrl,
  requestedWalletFamily,
}: Props) {
  return (
    <PrivyProvider
      appId={appId}
      config={{
        embeddedWallets: buildEmbeddedWalletConfig(requestedWalletFamily),
        loginMethods: ["email", "sms", "wallet"],
        appearance: {
          theme: "light",
          accentColor: "#000000",
        },
      }}
    >
      <PrivyConnectFlow
        state={state}
        signerId={signerId}
        callbackUrl={callbackUrl}
        requestedWalletFamily={requestedWalletFamily}
      />
    </PrivyProvider>
  );
}

type Status =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "pending"; message: string }
  | { kind: "success"; wallets: CallbackWallet[] }
  | { kind: "error"; message: string };

type WalletChainType = "ethereum" | "solana";

type CallbackWallet = {
  id: string;
  address: string;
  chainType: WalletChainType;
};

function PrivyConnectFlow({
  state,
  signerId,
  callbackUrl,
  requestedWalletFamily,
}: {
  state: string;
  signerId: string;
  callbackUrl?: string;
  requestedWalletFamily?: WalletChainType;
}) {
  const { ready, authenticated, user, login, getAccessToken, logout } =
    usePrivy();
  const { refreshUser } = useUser();
  const { createWallet } = useCreateWallet();
  const { createWallet: createSolanaWallet } = useCreateSolanaWallet();
  const { addSigners } = useSigners();
  // The wallet lists themselves are deliberately unused: they are hydrated
  // caches that can lag (or outlive) the live session. We only gate on
  // readiness so the embedded-wallet iframe is up before create/grant calls.
  const { ready: walletsReady } = useWallets();
  const { ready: solanaWalletsReady } = useSolanaWallets();

  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [hasSubmitted, setHasSubmitted] = useState(false);

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
    setStatus({ kind: "pending", message: "Preparing your Privy wallets…" });
    const shouldRequireSolana = requestedWalletFamily === "solana";

    // Re-fetch the user over the live Privy session. Everything we POST is
    // derived strictly from this fresh object — never from the mounted
    // `user` snapshot or the `useWallets()` caches, which can go stale when
    // the browser's Privy session changed underneath us (another tab logged
    // into a different account, a logout/login race) and would smuggle a
    // wallet from a different account into the payload.
    let freshUser: User;
    try {
      freshUser = await refreshUser();
      if (!freshUser) {
        throw new Error("Privy returned no authenticated user");
      }
    } catch (err) {
      setStatus({
        kind: "error",
        message: `Could not confirm the just-authenticated Privy user: ${errMsg(err)}. Start over and log in again.`,
      });
      setHasSubmitted(false);
      return;
    }

    let evmWallet = walletRefForUser(freshUser, "ethereum");
    if (!evmWallet) {
      try {
        const createdWallet = await createWallet();
        evmWallet = {
          id: createdWallet.id ?? "",
          address: createdWallet.address,
          chainType: "ethereum",
        };
      } catch (err) {
        setStatus({
          kind: "error",
          message: `Could not create embedded EVM wallet: ${errMsg(err)}`,
        });
        setHasSubmitted(false);
        return;
      }
    }

    let solanaWallet = walletRefForUser(freshUser, "solana");
    if (!solanaWallet && shouldRequireSolana) {
      try {
        const { wallet: createdWallet } = await createSolanaWallet();
        solanaWallet = {
          id: createdWallet.id ?? "",
          address: createdWallet.address,
          chainType: "solana",
        };
      } catch (err) {
        setStatus({
          kind: "error",
          message: `Could not create embedded Solana wallet: ${errMsg(err)}`,
        });
        setHasSubmitted(false);
        return;
      }
    }

    const callbackWallets = [evmWallet, solanaWallet]
      .filter((wallet): wallet is CallbackWallet => Boolean(wallet))
      .map((wallet) => ({
        id: wallet.id,
        address: wallet.address,
        chainType: wallet.chainType,
      }));
    const missingWallet = callbackWallets.find((wallet) => !wallet.id);
    if (missingWallet) {
      setStatus({
        kind: "error",
        message: `Privy did not return a stable wallet id for the ${missingWallet.chainType} embedded wallet.`,
      });
      setHasSubmitted(false);
      return;
    }

    try {
      setStatus({
        kind: "pending",
        message: "Granting Aomi server-side access to your wallets…",
      });
      const signerGrantError = await ensureServerSignerAccess({
        wallets: callbackWallets,
        signerId,
        addSigners,
      });
      if (signerGrantError && isWalletOwnershipMismatchError(signerGrantError)) {
        // Privy refused the grant because the wallet belongs to another
        // account — the backend callback could only ever fail. Stop here.
        setStatus({
          kind: "error",
          message: WALLET_OWNERSHIP_MISMATCH_MESSAGE,
        });
        return;
      }

      setStatus({
        kind: "pending",
        message: "Finalizing the wallet link with Aomi…",
      });
      const callback = await postPrivyCallbackWithRefresh({
        state,
        userId: freshUser.id,
        wallets: callbackWallets,
        callbackUrl,
        getAccessToken,
      });
      if (!callback.ok) {
        setStatus({
          kind: "error",
          message: isOwnershipMismatchCallback(callback)
            ? WALLET_OWNERSHIP_MISMATCH_MESSAGE
            : formatCallbackFailure(callback, signerGrantError),
        });
        return;
      }
      setStatus({ kind: "success", wallets: callbackWallets });
    } catch (err) {
      setStatus({
        kind: "error",
        message: `Callback request failed: ${errMsg(err)}`,
      });
    }
  }, [
    callbackUrl,
    createWallet,
    createSolanaWallet,
    getAccessToken,
    hasSubmitted,
    addSigners,
    refreshUser,
    requestedWalletFamily,
    signerId,
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
      (requestedWalletFamily !== "solana" || solanaWalletsReady) &&
      !hasSubmitted
    ) {
      void submit();
    }
  }, [
    authenticated,
    hasSubmitted,
    requestedWalletFamily,
    solanaWalletsReady,
    status.kind,
    submit,
    walletsReady,
  ]);

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
            // Finish the logout before re-arming auto-submit — resetting
            // while `authenticated` is still true would immediately re-run
            // `submit` against the session we are trying to discard.
            void (async () => {
              try {
                await logout();
              } finally {
                setHasSubmitted(false);
                setStatus({ kind: "ready" });
              }
            })();
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

    case "pending":
      return <Pending text={status.message} />;

    case "success":
      return (
        <div className="space-y-4">
          <SuccessBanner wallets={status.wallets} />
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

function SuccessBanner({ wallets }: { wallets: CallbackWallet[] }) {
  return (
    <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-700 dark:text-green-400">
      <p className="font-medium">Connected.</p>
      <div className="mt-2 space-y-1">
        {wallets.map((wallet) => (
          <p
            key={`${wallet.chainType}:${wallet.id}`}
            className="font-mono text-xs"
          >
            {wallet.chainType}: {shortAddress(wallet.address)}
          </p>
        ))}
      </div>
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

async function postPrivyCallbackWithRefresh({
  state,
  userId,
  wallets,
  callbackUrl,
  getAccessToken,
}: {
  state: string;
  userId: string;
  wallets: CallbackWallet[];
  callbackUrl?: string;
  getAccessToken: () => Promise<string | null>;
}): Promise<{ ok: true } | { ok: false; status: number; detail: string }> {
  // Privy documents that an "invalid auth token" response may require calling
  // getAccessToken() again with backoff until the session refreshes.
  const retryDelaysMs = [0, 400, 1200];

  for (let attempt = 0; attempt < retryDelaysMs.length; attempt++) {
    const delayMs = retryDelaysMs[attempt];
    if (delayMs > 0) {
      await sleep(delayMs);
    }

    const accessToken = await getAccessToken();
    if (!accessToken) {
      return { ok: false, status: 0, detail: "No access token from Privy." };
    }
    const evmWallet = wallets.find((wallet) => wallet.chainType === "ethereum");
    if (!evmWallet) {
      return {
        ok: false,
        status: 0,
        detail: "Missing Ethereum embedded wallet for callback.",
      };
    }

    if (!callbackUrl) {
      return {
        ok: false,
        status: 0,
        detail: "Missing backend callback URL.",
      };
    }

    const res = await fetch(callbackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        state,
        access_token: accessToken,
        user_id: userId,
        wallet_id: evmWallet.id,
        wallet_address: evmWallet.address,
        wallets: wallets.map((wallet) => ({
          id: wallet.id,
          address: wallet.address,
          chain_type: wallet.chainType,
        })),
      }),
    });
    if (res.ok) {
      return { ok: true };
    }

    const detail = await res.text().catch(() => "");
    const shouldRetry =
      attempt < retryDelaysMs.length - 1 &&
      (res.status >= 500 || res.status === 412);
    if (!shouldRetry) {
      return { ok: false, status: res.status, detail };
    }
  }

  return { ok: false, status: 0, detail: "Callback retry budget exhausted." };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

// Shown for the cross-account failure mode: the wallet in the payload (or
// the one the browser tried to grant) belongs to a different Privy account
// than the live session. Retrying cannot fix it — only re-authenticating as
// the owning account can.
const WALLET_OWNERSHIP_MISMATCH_MESSAGE =
  "This wallet belongs to a different Privy account than the one you just " +
  "logged in with — log out of Privy and sign in with the original account.";

// The backend maps the wallet-ownership conflict to 409 with a
// `wallet_not_owned_by_authenticated_user` marker (bin/backend
// endpoint/privy_oauth.rs). 412 (signer consent pending) stays retryable.
function isOwnershipMismatchCallback(callback: {
  status: number;
  detail: string;
}): boolean {
  return (
    callback.status === 409 ||
    callback.detail.includes("wallet_not_owned_by_authenticated_user")
  );
}

function formatCallbackFailure(
  callback: { ok: false; status: number; detail: string },
  signerGrantError: string | null,
): string {
  const detail = callback.detail.trim().slice(0, 240);
  const callbackMessage = detail
    ? `Callback failed: ${callback.status} ${detail}`
    : `Callback failed: ${callback.status}`;
  if (!signerGrantError) {
    return callbackMessage;
  }
  return `${callbackMessage}. Privy signer grant also reported: ${signerGrantError}`;
}

function buildEmbeddedWalletConfig(requestedWalletFamily?: WalletChainType): {
  ethereum: { createOnLogin: "all-users" };
  solana?: { createOnLogin: "all-users" };
} {
  return requestedWalletFamily === "solana"
    ? {
        ethereum: { createOnLogin: "all-users" },
        solana: { createOnLogin: "all-users" },
      }
    : {
        ethereum: { createOnLogin: "all-users" },
      };
}

// The user's embedded wallet, read off the (freshly fetched) user object
// itself. `walletClientType 'privy'|'privy-v2'` filters out injected or
// external wallets the user may have linked — Aomi BE only signs through
// the embedded one. A missing account id maps to `""` so the caller's
// stable-id guard can reject it with a precise error.
function walletRefForUser(
  user: User,
  chainType: WalletChainType,
): CallbackWallet | null {
  for (const account of user.linkedAccounts) {
    if (
      account.type === "wallet" &&
      (account.walletClientType === "privy" ||
        account.walletClientType === "privy-v2") &&
      account.chainType === chainType
    ) {
      return {
        id: account.id ?? "",
        address: account.address,
        chainType,
      };
    }
  }

  return null;
}

function shortAddress(address: string): string {
  if (address.length <= 12) {
    return address;
  }
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
