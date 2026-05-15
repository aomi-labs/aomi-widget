"use client";

import { SignInModal } from "@coinbase/cdp-react/components/SignInModal";
import type { ReactNode } from "react";

type DedicatedWalletRecord = {
  address: string;
  source: "coinbase_cdp";
  selectedAt: number;
};

type BasePaymentModalProps = {
  open: boolean;
  mode: "choice" | "dedicated";
  activeAccount?: string;
  dedicatedWallet: DedicatedWalletRecord | null;
  dedicatedWalletConfigured: boolean;
  dedicatedWalletConfigurationChecking: boolean;
  dedicatedWalletConfigurationError: string | null;
  dedicatedWalletSignedIn: boolean;
  dedicatedWalletAddress?: string;
  walletAppName: string;
  error: string | null;
  busyAction: "current" | "dedicated_pay" | "dedicated_connect" | null;
  onUseCurrentAccount: () => void;
  onUseAnotherAddress: () => void;
  onSelectDedicatedWallet: () => void;
  onPayWithDedicatedWallet: () => void;
  onBackToChoices: () => void;
  onClose: () => void;
};

function formatAddress(address?: string) {
  if (!address) return "No account connected";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-muted-foreground text-xs uppercase">{children}</div>
  );
}

export function BasePaymentModal({
  open,
  mode,
  activeAccount,
  dedicatedWallet,
  dedicatedWalletConfigured,
  dedicatedWalletConfigurationChecking,
  dedicatedWalletConfigurationError,
  dedicatedWalletSignedIn,
  dedicatedWalletAddress,
  walletAppName,
  error,
  busyAction,
  onUseCurrentAccount,
  onUseAnotherAddress,
  onSelectDedicatedWallet,
  onPayWithDedicatedWallet,
  onBackToChoices,
  onClose,
}: BasePaymentModalProps) {
  if (!open) return null;

  const currentDedicatedAddress =
    dedicatedWalletAddress ?? dedicatedWallet?.address;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center">
      <div className="bg-background text-foreground w-full max-w-md rounded-3xl border p-5 shadow-2xl">
        <div className="space-y-1">
          <div className="text-lg font-semibold">Payment required</div>
          <p className="text-muted-foreground text-sm">
            Your free chat quota is exhausted. Pay this x402 request once with
            the connected wallet, or switch to a dedicated Coinbase wallet for
            later paid chats.
          </p>
        </div>

        {mode === "choice" ? (
          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl border p-3 text-sm">
              <SectionLabel>Connected wallet</SectionLabel>
              <div className="mt-1 font-mono">
                {formatAddress(activeAccount)}
              </div>
              <p className="text-muted-foreground mt-2 text-xs">
                This path keeps the current {walletAppName} Base Account and
                signs the x402 payment only for this blocked request.
              </p>
            </div>

            <div className="rounded-2xl border p-3 text-sm">
              <SectionLabel>Dedicated x402 wallet</SectionLabel>
              <div className="mt-1 font-mono">
                {currentDedicatedAddress
                  ? formatAddress(currentDedicatedAddress)
                  : "Not selected yet"}
              </div>
              <p className="text-muted-foreground mt-2 text-xs">
                This path uses a Coinbase embedded wallet as the dedicated x402
                payer. Fund it once, then reuse it for later paid requests.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl border p-3 text-sm">
              <SectionLabel>Dedicated Coinbase wallet</SectionLabel>
              <div className="mt-1 font-mono">
                {currentDedicatedAddress
                  ? formatAddress(currentDedicatedAddress)
                  : "Not signed in yet"}
              </div>
              <p className="text-muted-foreground mt-2 text-xs">
                Sign in to create or restore the dedicated wallet, fund it with
                Base USDC, then use it as the x402 payer.
              </p>
            </div>

            {dedicatedWalletConfigurationChecking ? (
              <div className="rounded-2xl border p-3 text-sm">
                <p className="text-muted-foreground text-xs">
                  Checking Coinbase embedded-wallet configuration...
                </p>
              </div>
            ) : dedicatedWalletConfigured ? (
              dedicatedWalletSignedIn && dedicatedWalletAddress ? (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
                  <div className="font-medium text-emerald-700 dark:text-emerald-300">
                    Dedicated wallet ready
                  </div>
                  <div className="mt-1 break-all font-mono text-xs">
                    {dedicatedWalletAddress}
                  </div>
                  <p className="text-muted-foreground mt-2 text-xs">
                    Fund this address with Base USDC, then select it and pay the
                    blocked request.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border p-3 text-sm">
                  <p className="text-muted-foreground text-xs">
                    Sign in with Coinbase to create or restore the dedicated
                    x402 wallet for this app.
                  </p>
                  <div className="mt-3">
                    <SignInModal>
                      <button
                        type="button"
                        className="bg-primary text-primary-foreground rounded-2xl px-4 py-3 text-sm font-medium"
                      >
                        Create or sign in to dedicated wallet
                      </button>
                    </SignInModal>
                  </div>
                </div>
              )
            ) : (
              <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-2xl border p-3 text-sm">
                {dedicatedWalletConfigurationError ?? (
                  <>
                    Set <code>NEXT_PUBLIC_CDP_PROJECT_ID</code> to enable the
                    dedicated Coinbase wallet path.
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {error ? (
          <div className="border-destructive/30 bg-destructive/10 text-destructive mt-4 rounded-2xl border p-3 text-sm">
            {error}
          </div>
        ) : null}

        <div className="mt-5 grid gap-2">
          {mode === "choice" ? (
            <>
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
                Use another address
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onSelectDedicatedWallet}
                disabled={
                  dedicatedWalletConfigurationChecking ||
                  !dedicatedWalletConfigured ||
                  !dedicatedWalletSignedIn ||
                  !dedicatedWalletAddress
                }
                className="hover:bg-accent rounded-2xl border px-4 py-3 text-sm font-medium transition-colors disabled:opacity-50"
              >
                Use this dedicated wallet
              </button>
              <button
                type="button"
                onClick={onPayWithDedicatedWallet}
                disabled={
                  busyAction !== null ||
                  dedicatedWalletConfigurationChecking ||
                  !dedicatedWalletConfigured ||
                  !dedicatedWalletSignedIn ||
                  !dedicatedWalletAddress
                }
                className="bg-primary text-primary-foreground disabled:bg-muted disabled:text-muted-foreground rounded-2xl px-4 py-3 text-sm font-medium transition-colors"
              >
                {busyAction === "dedicated_pay"
                  ? "Paying with dedicated wallet..."
                  : "Pay with dedicated wallet now"}
              </button>
              <button
                type="button"
                onClick={onBackToChoices}
                disabled={busyAction !== null}
                className="hover:bg-accent rounded-2xl border px-4 py-3 text-sm font-medium transition-colors"
              >
                Back
              </button>
            </>
          )}

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
