"use client";

import type { ReactNode } from "react";

type DedicatedWalletRecord = {
  address: string;
  source: "baseAccount";
  selectedAt: number;
};

type BasePaymentModalProps = {
  open: boolean;
  activeAccount?: string;
  dedicatedWallet: DedicatedWalletRecord | null;
  walletAppName: string;
  error: string | null;
  busyAction: "current" | "dedicated" | null;
  onUseCurrentAccount: () => void;
  onUseAnotherAddress: () => void;
  onClose: () => void;
};

function formatAddress(address?: string) {
  if (!address) return "No account connected";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="text-muted-foreground text-xs uppercase">{children}</div>;
}

export function BasePaymentModal({
  open,
  activeAccount,
  dedicatedWallet,
  walletAppName,
  error,
  busyAction,
  onUseCurrentAccount,
  onUseAnotherAddress,
  onClose,
}: BasePaymentModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center">
      <div className="bg-background text-foreground w-full max-w-md rounded-3xl border p-5 shadow-2xl">
        <div className="space-y-1">
          <div className="text-lg font-semibold">Payment required</div>
          <p className="text-muted-foreground text-sm">
            Your free chat quota is exhausted. Pay this x402 request once with the
            connected wallet, or switch to a dedicated wallet for future paid chats.
          </p>
        </div>

        <div className="mt-4 grid gap-3">
          <div className="rounded-2xl border p-3 text-sm">
            <SectionLabel>Connected wallet</SectionLabel>
            <div className="mt-1 font-mono">{formatAddress(activeAccount)}</div>
            <p className="text-muted-foreground mt-2 text-xs">
              This path keeps the current {walletAppName} Base Account and signs
              the x402 payment only for this blocked request.
            </p>
          </div>

          <div className="rounded-2xl border p-3 text-sm">
            <SectionLabel>Dedicated x402 wallet</SectionLabel>
            <div className="mt-1 font-mono">
              {dedicatedWallet
                ? formatAddress(dedicatedWallet.address)
                : "Not selected yet"}
            </div>
            <p className="text-muted-foreground mt-2 text-xs">
              This path reconnects Base Account so the user can pick or create a
              separate MPC wallet, fund it, and keep it as the x402 payer.
            </p>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="mt-5 grid gap-2">
          <button
            type="button"
            onClick={onUseCurrentAccount}
            disabled={busyAction !== null}
            className="bg-primary text-primary-foreground disabled:bg-muted disabled:text-muted-foreground rounded-2xl px-4 py-3 text-sm font-medium transition-colors"
          >
            {busyAction === "current"
              ? "Opening wallet..."
              : "Use this account for x402"}
          </button>
          <button
            type="button"
            onClick={onUseAnotherAddress}
            disabled={busyAction !== null}
            className="hover:bg-accent rounded-2xl border px-4 py-3 text-sm font-medium transition-colors"
          >
            {busyAction === "dedicated"
              ? "Switching wallet..."
              : "Use another address"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={busyAction !== null}
            className="text-muted-foreground hover:text-foreground rounded-2xl px-4 py-2 text-sm transition-colors"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
