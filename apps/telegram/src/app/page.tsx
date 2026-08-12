"use client";

import { useEffect, useRef } from "react";
import { useAccount, useModal } from "@getpara/react-sdk-lite";

import { useAomiWalletRequest } from "@/hooks/use-aomi-wallet-request";
import { useCanonicalAccount } from "@/hooks/use-canonical-account";
import { useTelegramLaunch } from "@/hooks/use-telegram-launch";
import { useWalletExecutor } from "@/hooks/use-wallet-executor";
import { describeRequest, requestChain } from "@/lib/wallet-request";

function statusText(input: {
  account: ReturnType<typeof useCanonicalAccount>;
  execution: ReturnType<typeof useWalletExecutor>;
  launch: ReturnType<typeof useTelegramLaunch>;
  walletRequest: ReturnType<typeof useAomiWalletRequest>;
}): string {
  if (input.launch.status === "loading") return "Opening Telegram wallet…";
  if (input.launch.status === "error") return "Open this wallet from Telegram.";
  if (input.account.status === "disconnected") return "Sign in with Para";
  if (input.account.status === "loading")
    return "Connecting your Aomi account…";
  if (input.account.status === "error")
    return "Could not connect your Aomi account.";
  if (!input.launch.context?.sessionId) return "Wallet connected";
  if (input.walletRequest.status === "error")
    return "Could not load the wallet request.";
  if (
    input.walletRequest.status === "loading" ||
    input.walletRequest.status === "waiting"
  ) {
    return "Waiting for the wallet request…";
  }
  if (input.execution.status === "awaiting_wallet") return "Signing…";
  if (input.execution.status === "done") return "Approved";
  if (input.execution.status === "error")
    return "The wallet request was not approved.";
  return "Wallet connected";
}

export default function Home() {
  const { openModal } = useModal();
  const account = useAccount();
  const opened = useRef(false);
  const launch = useTelegramLaunch();
  const canonicalAccount = useCanonicalAccount(launch.context);
  const walletRequest = useAomiWalletRequest({
    enabled: launch.status === "ready" && canonicalAccount.status === "ready",
    provider: canonicalAccount.provider,
    requestId: launch.context?.requestId ?? null,
    sessionId: launch.context?.sessionId ?? null,
  });
  const execution = useWalletExecutor({
    request: walletRequest.request,
    session: walletRequest.session,
  });

  useEffect(() => {
    if (launch.status !== "ready" || opened.current) return;
    opened.current = true;
    openModal();
  }, [launch.status, openModal]);

  const summary = walletRequest.request
    ? describeRequest(walletRequest.request, requestChain(walletRequest.request))
    : null;

  // Nothing is signed until the user reads this and taps Approve — the Telegram
  // button only opens the app.
  if (
    summary &&
    (execution.status === "review" || execution.status === "preparing")
  ) {
    return (
      <main className="wallet-page">
        <section className="wallet-review" aria-live="polite">
          <h1>{summary.title}</h1>
          <dl>
            {summary.fields.map((field) => (
              <div key={field.label}>
                <dt>{field.label}</dt>
                <dd className={field.mono ? "mono" : undefined}>
                  {field.value}
                </dd>
              </div>
            ))}
          </dl>
          <div className="wallet-actions">
            <button
              className="para-button"
              type="button"
              disabled={execution.status !== "review"}
              onClick={execution.approve}
            >
              {execution.status === "review" ? "Approve" : "Preparing Para…"}
            </button>
            <button
              className="para-button para-button--ghost"
              type="button"
              onClick={execution.reject}
            >
              Decline
            </button>
          </div>
        </section>
      </main>
    );
  }

  const message = statusText({
    account: canonicalAccount,
    execution,
    launch,
    walletRequest,
  });

  return (
    <main className="wallet-page">
      <section className="wallet-control" aria-live="polite">
        <p>{message}</p>
        {launch.status !== "error" && (
          <button
            className="para-button"
            type="button"
            onClick={() => openModal()}
          >
            {account.embedded.isConnected ? "Open Para" : "Continue with Para"}
          </button>
        )}
      </section>
    </main>
  );
}
