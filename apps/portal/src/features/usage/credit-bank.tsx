"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAomiWalletKit } from "@aomi-labs/widget-lib";
import {
  createPortalPaymentFetch,
  createPortalX402Client,
} from "@portal/lib/payment-fetch";

type CreditEntry = {
  id: number;
  amount_microusd: number;
  entry_kind: string;
  created_at: number;
};

type Position = {
  period_utc_month: string;
  included: {
    limit_microusd: number;
    used_microusd: number;
    remaining_microusd: number;
  };
  bank: {
    balance_microusd: number;
    outstanding_debt_microusd: number;
  };
  entries: CreditEntry[];
  next_before_id: number | null;
};

type Status = "loading" | "ready" | "paying" | "paging" | "error";

const ACTIVITY_PAGE_SIZE = 5;
const MIN_TOP_UP_MICROUSD = 1_000_000;
const MAX_TOP_UP_MICROUSD = 1_000_000_000;

function credits(value: number): string {
  return (value / 10_000).toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });
}

export function CreditBank() {
  const wallet = useAomiWalletKit();
  const [position, setPosition] = useState<Position | null>(null);
  const [amount, setAmount] = useState("500");
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string>();

  const load = useCallback(async (beforeId?: number) => {
    setStatus(beforeId ? "paging" : "loading");
    try {
      const query = new URLSearchParams({
        limit: String(ACTIVITY_PAGE_SIZE),
      });
      if (beforeId) query.set("before_id", String(beforeId));
      const response = await fetch(`/v1/account/credits?${query}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) throw new Error(await response.text());
      const next = (await response.json()) as Position;
      setPosition((current) =>
        beforeId && current
          ? { ...next, entries: [...current.entries, ...next.entries] }
          : next,
      );
      setStatus("ready");
      setError(undefined);
    } catch (cause) {
      setStatus("error");
      setError(
        cause instanceof Error ? cause.message : "Could not load Credit Bank",
      );
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

  const topUp = async () => {
    const amountMicrousd = Math.round(Number(amount) * 10_000);
    if (
      !Number.isSafeInteger(amountMicrousd) ||
      amountMicrousd < MIN_TOP_UP_MICROUSD ||
      amountMicrousd > MAX_TOP_UP_MICROUSD
    ) {
      setError("Choose between 100 and 100,000 credits.");
      return;
    }
    setStatus("paying");
    setError(undefined);
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
      if (!response.ok) throw new Error(await response.text());
      setPosition((await response.json()) as Position);
      setStatus("ready");
    } catch (cause) {
      setStatus("error");
      setError(cause instanceof Error ? cause.message : "Top-up failed");
    }
  };

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium">Credit Bank</h3>
          <p className="text-aomi-muted text-xs">
            Durable prepaid value after the monthly allowance.
          </p>
        </div>
        {position ? (
          <span className="text-lg font-semibold tabular-nums">
            {credits(position.bank.balance_microusd)} cr
          </span>
        ) : null}
      </div>

      <div className="border-aomi-border bg-aomi-bg/40 rounded-xl border p-4 sm:p-5">
        {status === "loading" && !position ? (
          <p className="text-aomi-muted text-sm">Loading balance…</p>
        ) : null}
        {position ? (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-aomi-muted block text-xs">
                  Included remaining
                </span>
                {credits(position.included.remaining_microusd)} cr
              </div>
              <div>
                <span className="text-aomi-muted block text-xs">
                  Outstanding debt
                </span>
                {credits(position.bank.outstanding_debt_microusd)} cr
              </div>
            </div>
            <div className="flex gap-2">
              <input
                aria-label="Credits to top up"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="border-aomi-border bg-aomi-surface min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm"
                inputMode="decimal"
              />
              <button
                type="button"
                disabled={status === "paying" || !wallet.identity.isConnected}
                onClick={() => void topUp()}
                className="bg-aomi-fg text-aomi-bg rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {status === "paying" ? "Paying…" : "Top up"}
              </button>
            </div>
            {!wallet.identity.isConnected ? (
              <p className="text-aomi-muted text-xs">
                Connect an EVM wallet to top up with x402.
              </p>
            ) : null}
            {position.entries.length ? (
              <div className="border-aomi-border border-t pt-3">
                <p className="text-aomi-muted mb-2 text-xs">Recent activity</p>
                {position.entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex justify-between py-1 text-xs"
                  >
                    <span>{entry.entry_kind.replaceAll("_", " ")}</span>
                    <span className="tabular-nums">
                      {entry.amount_microusd > 0 ? "+" : ""}
                      {credits(entry.amount_microusd)} cr
                    </span>
                  </div>
                ))}
                {position.next_before_id ? (
                  <button
                    type="button"
                    disabled={status === "paging"}
                    onClick={() => void load(position.next_before_id!)}
                    className="text-aomi-muted mt-2 text-xs underline disabled:opacity-50"
                  >
                    {status === "paging" ? "Loading…" : "Load more"}
                  </button>
                ) : null}
              </div>
            ) : (
              <p className="text-aomi-muted text-xs">
                No Credit Bank activity yet.
              </p>
            )}
          </div>
        ) : null}
        {error ? (
          <p className="text-aomi-danger mt-2 text-xs">
            {error}{" "}
            <button
              type="button"
              onClick={() => void load()}
              className="underline"
            >
              Retry
            </button>
          </p>
        ) : null}
      </div>
    </section>
  );
}
