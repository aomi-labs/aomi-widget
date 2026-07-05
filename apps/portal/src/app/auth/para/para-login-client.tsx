"use client";

// =============================================================================
// Para login client — drives the Para React SDK and POSTs back to the callback.
// =============================================================================
//
// Lifecycle (the Para sibling of ../privy/privy-login-client.tsx):
//   1. Mount inside a page-scoped <ParaProvider> keyed by the api_key from the
//      auth URL. The provider holds children until the SDK is ready; we show a
//      small loader until the account query settles.
//   2. If no embedded session, show a "Continue with Para" button. Click ->
//      Para opens its modal and runs the login in Para-served UI — credentials
//      and key material never touch this page's JS.
//   3. Once a session exists (fresh login or one cached in this browser),
//      revalidate it live (`isFullyLoggedIn`), then guarantee the embedded
//      wallet exists: a fresh Para account has none, and a JWT issued for it
//      attests no wallets — the backend would reject with "no wallets". The
//      needed family comes from the auth URL (`wallet_family=solana` ->
//      SOLANA, default EVM); missing wallets are created via the SDK before
//      any JWT is issued.
//   4. Mint the attestation at submit time: `issueJwt()` -> { token, keyId },
//      the user id read off the live client, plus a one-shot verification
//      token. Nothing is derived from mounted snapshots, and every retry
//      re-mints the attestation.
//   5. POST { state, para_jwt, user_id, key_id, verification_token } to the
//      backend callback. It verifies the JWT against Para's JWKS, reads the
//      wallets from its claims, persists identity + keys + grant, and binds
//      the thread.
//   6. Exchange the SAME attestation with the portal's own
//      /api/bff/auth/exchange, which sets the `aomi_session` cookie — the
//      identity root every chat request derives its AccountBearer from.
//      Strictly after the callback: the backend is the authoritative writer
//      of the identity graph, so the exchange resolves to the user it just
//      wrote instead of minting a parallel one.
//   7. Show success (or error) — the user closes the tab.
//
// Unlike Privy there is NO signer-grant step: Para wallets sign client-side
// (human_sync only), so the backend never requests server-side access. The
// whole flow is login -> ensure wallet -> issueJwt -> POST -> done.

import {
  Environment,
  ParaProvider,
  useAccount,
  useClient,
  useCreateWallet,
  useIssueJwt,
  useLogout,
  useModal,
} from "@getpara/react-sdk";
import "@getpara/react-sdk/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  decodeParaJwtWallets,
  formatCallbackFailure,
  formatExchangeFailure,
  postSessionExchange,
  runParaConnect,
  type AttestedWallet,
} from "./callback";
import { ensureEmbeddedWallet, type EmbeddedWalletType } from "./ensure-wallet";

interface Props {
  state: string;
  apiKey: string;
  callbackUrl?: string;
  requestedWalletFamily?: "evm" | "solana";
}

const paraEnvironment =
  (process.env.NEXT_PUBLIC_PARA_ENVIRONMENT as Environment | undefined) ??
  Environment.BETA;

// Embedded login only, matching the portal's own Para modal (Google OAuth,
// email disabled) so users land in the same Para account they use in chat.
// External wallets are deliberately absent: they never appear in the Para
// JWT's wallet claims, which is all the backend trusts.
const paraModalConfig = {
  disableEmailLogin: true,
  oAuthMethods: ["GOOGLE" as const],
};

export function ParaAuthClient({
  state,
  apiKey,
  callbackUrl,
  requestedWalletFamily,
}: Props) {
  const [queryClient] = useState(() => new QueryClient());
  // Stable references: inline literals would re-create the Para client each
  // render (see wallet-providers.tsx for the failure mode).
  const paraClientConfig = useMemo(
    () => ({ apiKey, env: paraEnvironment }),
    [apiKey],
  );
  const appConfig = useMemo(() => ({ appName: "Aomi Labs" }), []);

  return (
    <QueryClientProvider client={queryClient}>
      <ParaProvider
        paraClientConfig={paraClientConfig}
        config={appConfig}
        paraModalConfig={paraModalConfig}
        // The provider holds children until the SDK is ready; keep the same
        // shell on screen instead of a blank page in the meantime.
        fallback={
          <Shell>
            <Pending text="Loading Para…" />
          </Shell>
        }
      >
        <ParaConnectFlow
          state={state}
          callbackUrl={callbackUrl}
          requestedWalletFamily={requestedWalletFamily}
        />
      </ParaProvider>
    </QueryClientProvider>
  );
}

type Status =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "pending"; message: string }
  | { kind: "success"; wallets: AttestedWallet[] }
  | { kind: "error"; message: string };

function ParaConnectFlow({
  state,
  callbackUrl,
  requestedWalletFamily,
}: {
  state: string;
  callbackUrl?: string;
  requestedWalletFamily?: "evm" | "solana";
}) {
  const para = useClient();
  const account = useAccount();
  const { openModal } = useModal();
  const { createWalletAsync } = useCreateWallet();
  const { issueJwtAsync } = useIssueJwt();
  const { logoutAsync } = useLogout();

  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const embeddedConnected =
    account.embedded.isConnected && !account.embedded.isGuestMode;

  useEffect(() => {
    if (status.kind === "loading" && !account.isLoading) {
      setStatus({ kind: "ready" });
    }
  }, [account.isLoading, status.kind]);

  const submit = useCallback(async () => {
    if (hasSubmitted) return;
    if (!para) {
      setStatus({ kind: "error", message: "The Para client is not ready." });
      return;
    }

    setHasSubmitted(true);
    setStatus({ kind: "pending", message: "Confirming your Para session…" });

    // Revalidate against Para before attesting anything. The account object
    // above is a hydrated cache — a session that died (or switched accounts)
    // underneath us must never be submitted.
    try {
      if (!(await para.isFullyLoggedIn())) {
        setStatus({
          kind: "error",
          message:
            "Your Para session is no longer active. Start over and log in again.",
        });
        setHasSubmitted(false);
        return;
      }
    } catch (err) {
      setStatus({
        kind: "error",
        message: `Could not confirm the Para session: ${errMsg(err)}. Start over and log in again.`,
      });
      setHasSubmitted(false);
      return;
    }

    setStatus({
      kind: "pending",
      message: "Preparing your Para wallet and linking it to Aomi…",
    });
    const neededWallet: EmbeddedWalletType =
      requestedWalletFamily === "solana" ? "SOLANA" : "EVM";
    try {
      const outcome = await runParaConnect({
        state,
        callbackUrl,
        // A fresh Para account has no embedded wallet, and the JWT only
        // attests wallets that exist when it is issued — provision the
        // needed family first, live off the server, or fail here instead
        // of POSTing a callback doomed to "no wallets".
        ensureWallet: () =>
          ensureEmbeddedWallet({
            type: neededWallet,
            fetchWallets: async () =>
              (await para.fetchWallets()) as Array<{
                type?: string;
                address?: string;
              }>,
            createWallet: (params) => createWalletAsync(params),
          }),
        // Minted fresh per attempt: the JWT re-attests the live session and
        // the verification token is one-shot on the backend.
        attest: async () => {
          const { token, keyId } = await issueJwtAsync();
          const userId = para.getUserId();
          if (!userId) {
            throw new Error(
              "Para did not report a user id for the live session",
            );
          }
          const verificationToken = await para
            .getVerificationToken()
            .catch(() => undefined);
          return { paraJwt: token, userId, keyId, verificationToken };
        },
      });
      if (!outcome.ok) {
        setStatus({
          kind: "error",
          message:
            outcome.stage === "wallet"
              ? outcome.detail
              : formatCallbackFailure(outcome),
        });
        if (outcome.stage === "wallet") {
          // Pre-POST failure — re-arm like the session checks above; the
          // backend never saw this attempt.
          setHasSubmitted(false);
        }
        return;
      }

      // Backend connect done — now set the portal's own `aomi_session`
      // cookie from the same attestation, so the chat stops being anonymous
      // (see the lifecycle comment, step 6).
      setStatus({ kind: "pending", message: "Starting your Aomi session…" });
      const wallets = decodeParaJwtWallets(outcome.paraJwt);
      try {
        const exchange = await postSessionExchange({
          paraJwt: outcome.paraJwt,
          keyId: outcome.keyId,
          // TMP(account-graph): the attested EVM address lets the exchange
          // bridge returning wallet-first users to their existing account.
          address: wallets.find((wallet) => wallet.family === "evm")?.address,
        });
        if (!exchange.ok) {
          setStatus({
            kind: "error",
            message: formatExchangeFailure(exchange),
          });
          return;
        }
      } catch (err) {
        setStatus({
          kind: "error",
          message: `Aomi session request failed: ${errMsg(err)}`,
        });
        return;
      }

      setStatus({ kind: "success", wallets });
    } catch (err) {
      setStatus({
        kind: "error",
        message: `Callback request failed: ${errMsg(err)}`,
      });
    }
  }, [
    callbackUrl,
    createWalletAsync,
    hasSubmitted,
    issueJwtAsync,
    para,
    requestedWalletFamily,
    state,
  ]);

  // Auto-submit for both entry paths: a Para session cached in this browser
  // and the just-completed modal login. Either way `submit` revalidates the
  // session live before anything is attested or POSTed.
  useEffect(() => {
    if (status.kind === "ready" && embeddedConnected && !hasSubmitted) {
      void submit();
    }
  }, [embeddedConnected, hasSubmitted, status.kind, submit]);

  return (
    <Shell>
      <Body
        status={status}
        connected={embeddedConnected}
        onLogin={() => {
          openModal();
        }}
        onLogoutAndRetry={() => {
          // Finish the logout before re-arming auto-submit — resetting
          // while the embedded session still reads as connected would
          // immediately re-run `submit` against the session we are
          // trying to discard.
          void (async () => {
            try {
              await logoutAsync();
            } catch {
              // A failed logout still re-arms the button; submit
              // revalidates the session before trusting it.
            } finally {
              setHasSubmitted(false);
              setStatus({ kind: "ready" });
            }
          })();
        }}
      />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-background text-foreground flex min-h-screen items-center justify-center px-6 py-12">
      <div className="border-input bg-background w-full max-w-md rounded-3xl border p-8">
        <Header />
        {children}
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
      <h1 className="text-lg font-semibold">Connect your Para wallet</h1>
      <p className="text-muted-foreground text-sm">
        Aomi links the wallet Para holds on your behalf — Para keeps the key;
        Aomi never sees it. The login UI below is served by Para directly.
      </p>
    </div>
  );
}

function Body({
  status,
  connected,
  onLogin,
  onLogoutAndRetry,
}: {
  status: Status;
  connected: boolean;
  onLogin: () => void;
  onLogoutAndRetry: () => void;
}) {
  switch (status.kind) {
    case "loading":
      return <Pending text="Loading Para…" />;

    case "ready":
      if (connected) {
        return <Pending text="Reading your Para session…" />;
      }
      return (
        <button
          type="button"
          onClick={onLogin}
          className="bg-foreground text-background hover:bg-foreground/90 w-full rounded-full px-6 py-3 text-sm font-medium transition-colors"
        >
          Continue with Para
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

function SuccessBanner({ wallets }: { wallets: AttestedWallet[] }) {
  return (
    <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-700 dark:text-green-400">
      <p className="font-medium">Para connected.</p>
      <div className="mt-2 space-y-1">
        {wallets.map((wallet) => (
          <p
            key={`${wallet.family}:${wallet.id}`}
            className="font-mono text-xs"
          >
            {wallet.family}: {shortAddress(wallet.address)}
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

function shortAddress(address: string): string {
  if (address.length <= 12) {
    return address;
  }
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
