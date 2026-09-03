"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AomiCreditActivity, AomiCreditPosition } from "@aomi-labs/client";
import { useAomiWalletKit } from "@aomi-labs/widget-lib";
import {
  createPortalPaymentFetch,
  createPortalX402Client,
} from "@portal/lib/payment-fetch";
import { CreditTopUpDialog } from "./top-up-dialog";
import {
  formatCreditAmount,
  formatCredits,
  formatUsdc,
  MAX_TOP_UP_MICROUSD,
  MIN_TOP_UP_MICROUSD,
  toCredits,
} from "./format";
import {
  CheckCircle2,
  ChevronDown,
  Coins,
  ExternalLink,
  LoaderCircle,
  Plus,
  ReceiptText,
} from "lucide-react";

const ACTIVITY_PAGE_SIZE = 25;
export function CreditBank() {
  const wallet = useAomiWalletKit();
  const [open, setOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [position, setPosition] = useState<AomiCreditPosition | null>(null);
  const [amount, setAmount] = useState("1000");
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/v1/account/credits?limit=${ACTIVITY_PAGE_SIZE}`,
        { credentials: "include", cache: "no-store" },
      );
      if (!response.ok) throw new Error(await response.text());
      setPosition((await response.json()) as AomiCreditPosition);
      setError(null);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not load Credit Bank",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const x402 = useMemo(
    () => createPortalX402Client(wallet),
    [wallet.identity, wallet.signTypedData, wallet.switchChain],
  );
  const paymentFetch = useMemo(
    () => createPortalPaymentFetch({ fetch, x402 }),
    [x402],
  );

  const parsedCredits = Number(amount);
  const amountMicrousd = Math.round(parsedCredits * 10_000);
  const validAmount =
    Number.isSafeInteger(amountMicrousd) &&
    amountMicrousd >= MIN_TOP_UP_MICROUSD &&
    amountMicrousd <= MAX_TOP_UP_MICROUSD;

  async function topUp() {
    if (!validAmount) {
      setError("Choose between 1 and 100,000 credits.");
      return;
    }
    if (!x402) {
      setError("Connect an EVM wallet before topping up.");
      return;
    }
    setPaying(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await paymentFetch("/v1/account/credits/top-up", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          "idempotency-key": crypto.randomUUID(),
          "x-aomi-csrf": "1",
        },
        body: JSON.stringify({ amount_microusd: amountMicrousd }),
      });
      if (!response.ok) {
        throw new Error(
          response.status === 402
            ? "Wallet payment is still required."
            : `Top-up failed (${response.status})`,
        );
      }
      const next = (await response.json()) as AomiCreditPosition;
      setPosition(next);
      setReviewOpen(false);
      setSuccess(
        `${formatCreditAmount(parsedCredits)} added. Your bank now has ${formatCreditAmount(
          toCredits(next.bank.balance_microusd),
        )}.`,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Top-up failed");
    } finally {
      setPaying(false);
    }
  }

  const balance = toCredits(position?.bank.balance_microusd ?? 0);

  return (
    <div className="border-aomi-border border-t">
      <button
        type="button"
        aria-expanded={open}
        className="hover:bg-aomi-surface-2/40 focus-visible:ring-aomi-accent/40 flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset sm:px-5"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="border-aomi-border bg-aomi-surface-2 text-aomi-muted flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border">
            <Coins size={14} aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="text-aomi-fg block text-[13px] font-medium">
              Credit bank
            </span>
            <span className="text-aomi-muted block truncate text-[11px]">
              Purchased balance · never expires
            </span>
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="text-right">
            <span className="text-aomi-fg block text-[13px] font-medium tabular-nums">
              {loading && !position ? "—" : formatCreditAmount(balance)}
            </span>
            <span className="text-aomi-muted block text-[11px] tabular-nums">
              {loading && !position
                ? "Loading…"
                : `${formatUsdc(balance / 100)} value`}
            </span>
          </span>
          <ChevronDown
            aria-hidden="true"
            size={15}
            className={`text-aomi-muted transition-transform ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {open ? (
        <div className="border-aomi-border bg-aomi-surface/25 flex flex-col gap-4 border-t px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-aomi-fg text-[13px] font-medium">
                Keep usage moving
              </p>
              <p className="text-aomi-muted mt-0.5 max-w-md text-[12px] leading-relaxed">
                Add permanent credits with USDC. Purchased credits are used
                after your monthly allowance.
              </p>
            </div>
            <button
              type="button"
              disabled={loading || paying}
              onClick={() => {
                setError(null);
                setSuccess(null);
                setReviewOpen(true);
              }}
              className="bg-aomi-fg text-aomi-bg focus-visible:ring-aomi-accent/50 inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3.5 text-[13px] font-medium transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50"
            >
              <Plus size={14} aria-hidden="true" />
              Add credits
            </button>
          </div>

          {success ? (
            <div
              role="status"
              className="border-aomi-success/25 bg-aomi-success/5 text-aomi-fg flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-xs"
            >
              <CheckCircle2
                size={15}
                className="text-aomi-success mt-px shrink-0"
                aria-hidden="true"
              />
              <span>{success}</span>
            </div>
          ) : null}
          {error && !reviewOpen ? (
            <div
              role="alert"
              className="border-aomi-danger/25 bg-aomi-danger/5 text-aomi-danger rounded-lg border px-3 py-2.5 text-xs"
            >
              {error}{" "}
              <button
                type="button"
                onClick={() => void load()}
                className="underline"
              >
                Retry
              </button>
            </div>
          ) : null}

          <div className="border-aomi-border border-t pt-3.5">
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <h3 className="text-aomi-fg text-[12px] font-medium">
                Recent activity
              </h3>
              {position?.entries.length ? (
                <span className="text-aomi-muted text-[11px]">
                  Latest {position.entries.length}
                </span>
              ) : null}
            </div>
            {loading && !position ? (
              <div
                className="text-aomi-muted flex items-center gap-2 py-3 text-xs"
                role="status"
              >
                <LoaderCircle size={14} className="animate-spin" />
                Loading recent activity…
              </div>
            ) : null}
            {position?.entries.length === 0 ? (
              <div className="border-aomi-border bg-aomi-bg/40 flex items-center gap-3 rounded-lg border border-dashed px-3 py-3">
                <ReceiptText
                  size={15}
                  className="text-aomi-muted shrink-0"
                  aria-hidden="true"
                />
                <p className="text-aomi-muted text-xs">
                  No purchased-credit activity yet.
                </p>
              </div>
            ) : null}
            {position?.entries.length ? (
              <div
                className="border-aomi-border divide-aomi-border divide-y overflow-hidden rounded-lg border"
                role="list"
                aria-label="Recent credit activity"
              >
                {position.entries.map((entry) => (
                  <CreditActivityRow entry={entry} key={entry.id} />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <CreditTopUpDialog
        open={reviewOpen}
        busy={paying}
        credits={amount}
        paymentReady={Boolean(x402)}
        walletAddress={wallet.identity.address}
        walletChainId={wallet.identity.chainId}
        error={error}
        onCreditsChange={(value) => {
          setAmount(value);
          setError(null);
        }}
        onClose={() => setReviewOpen(false)}
        onConfirm={() => void topUp()}
      />
    </div>
  );
}

function CreditActivityRow({ entry }: { entry: AomiCreditActivity }) {
  const receiptUrl = creditReceiptUrl(entry);
  const amountCredits = Math.abs(toCredits(entry.amount_microusd));
  const amountUsdc = Math.abs(entry.amount_microusd) / 1_000_000;
  const isCredit = entry.amount_microusd > 0;
  const details = [
    formatCreditDate(entry.created_at),
    entry.entry_kind === "purchase" &&
    (entry.payment_provider || entry.payment_method)
      ? creditPaymentLabel(entry)
      : null,
    entry.application_id ? `Application ${entry.application_id}` : null,
  ].filter(Boolean);

  return (
    <div
      role="listitem"
      className="bg-aomi-bg/30 flex items-center gap-3 px-3 py-3"
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          isCredit
            ? "bg-aomi-success/10 text-aomi-success"
            : "bg-aomi-surface-2 text-aomi-muted"
        }`}
      >
        {isCredit ? (
          <Plus size={14} aria-hidden="true" />
        ) : (
          <ReceiptText size={14} aria-hidden="true" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-aomi-fg truncate text-[12px] font-medium">
          {creditActivityLabel(entry.entry_kind)}
        </p>
        <p className="text-aomi-muted mt-0.5 truncate text-[10px]">
          {details.join(" · ")}
        </p>
        {receiptUrl ? (
          <a
            href={receiptUrl}
            target="_blank"
            rel="noreferrer"
            className="text-aomi-accent mt-1 inline-flex items-center gap-1 text-[10px] hover:underline"
          >
            View receipt
            <ExternalLink size={9} aria-hidden="true" />
          </a>
        ) : null}
      </div>
      <div className="shrink-0 text-right">
        <p
          className={`text-[12px] font-medium tabular-nums ${
            isCredit ? "text-aomi-success" : "text-aomi-fg"
          }`}
        >
          {isCredit ? "+" : "−"}
          {formatCreditAmount(amountCredits)}
        </p>
        <p className="text-aomi-muted mt-0.5 text-[10px] tabular-nums">
          {entry.entry_kind === "purchase"
            ? `${formatUsdc(amountUsdc)} paid`
            : formatUsdc(amountUsdc)}
        </p>
      </div>
    </div>
  );
}

function formatCreditDate(timestamp: number): string {
  const milliseconds =
    timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(milliseconds));
}

function creditReceiptUrl(entry: AomiCreditActivity): string | null {
  const provider = entry.payment_provider?.toLowerCase();
  const legacyMethod = entry.payment_method?.toLowerCase();
  if (provider !== "coinbase" && legacyMethod !== "coinbase") {
    return null;
  }
  if (
    !entry.external_payment_reference ||
    !/^0x[0-9a-f]{64}$/i.test(entry.external_payment_reference)
  ) {
    return null;
  }
  return `https://sepolia.basescan.org/tx/${entry.external_payment_reference}`;
}

function creditPaymentLabel(entry: AomiCreditActivity): string {
  if (
    entry.payment_provider?.toLowerCase() === "coinbase" ||
    entry.payment_method?.toLowerCase() === "coinbase"
  ) {
    return "Coinbase x402";
  }
  return entry.payment_provider ?? entry.payment_method ?? "Wallet payment";
}

function creditActivityLabel(kind: string): string {
  if (kind === "purchase") return "Wallet top-up";
  if (kind === "usage_debit") return "Personal usage";
  return "Credit adjustment";
}
