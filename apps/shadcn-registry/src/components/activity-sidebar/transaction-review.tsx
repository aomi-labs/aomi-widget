"use client";
import { useMemo, useEffect, useRef } from "react";
import type { Action } from "@aomi-labs/client";
import { Wallet, ShieldAlert, ChevronDown, Fuel } from "lucide-react";
import { Button } from "../ui/button";
import { ImpactPanel } from "./wallet-impact";
import {
  type SupportedChain,
  actionTransactions,
  reviewSummary,
  visibleSimulationWarnings,
  displayProtocol,
  compact,
  simulationCostSummary,
} from "./presentation";

export function TransactionReview({
  action,
  embedded = false,
  supportedChains,
  approving = false,
  onApprove,
  onReject,
}: {
  action: Action;
  embedded?: boolean;
  supportedChains?: readonly SupportedChain[];
  approving?: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const reviewRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const review = reviewRef.current;
    if (!review) return;
    if (embedded) {
      // Keep automatic reveal inside the rail: scrollIntoView can move the
      // chat's clipping ancestors horizontally while the rail is expanding.
      const rail = review.closest<HTMLElement>(".aui-activity-sidebar");
      if (rail) {
        const overflow =
          review.getBoundingClientRect().bottom -
          rail.getBoundingClientRect().bottom;
        if (overflow > 0) rail.scrollTop += overflow + 16;
      }
    } else review.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [action.id, action.revision, embedded]);
  const transactions = useMemo(
    () => actionTransactions(action.request, supportedChains),
    [action.request, supportedChains],
  );
  const simulation =
    action.request.type === "sign" ? undefined : action.request.simulation;
  const warnings = visibleSimulationWarnings(simulation);
  const failed =
    simulation?.status === "failed" ||
    simulation?.guards.some((guard) => guard.status === "failed");
  const request = action.request;
  const signers =
    request.type === "sign"
      ? [request.signer]
      : request.type === "execute_evm"
        ? request.transactions.map((tx) => tx.from)
        : request.transactions.map((tx) => tx.payer);
  // A failed durable request still needs an explicit rejection to unblock its queue.
  if (embedded && failed)
    return (
      <div className="mt-3">
        <Button
          variant="outline"
          onClick={onReject}
          disabled={approving}
          className="h-9 rounded-full text-[12px]"
        >
          Reject request
        </Button>
      </div>
    );
  return (
    <section
      ref={reviewRef}
      data-testid="transaction-review"
      data-action-id={action.id}
      aria-label="Wallet impact"
      className={
        embedded
          ? "text-aomi-fg animate-in fade-in-0 slide-in-from-top-2 mt-3 min-w-0 duration-300 motion-reduce:animate-none"
          : "border-aomi-border bg-aomi-raised text-aomi-fg animate-in fade-in-0 slide-in-from-top-2 w-full min-w-0 rounded-3xl border p-4 duration-200 motion-reduce:animate-none"
      }
    >
      {!embedded && (
        <header className="mb-4 flex items-center gap-2.5">
          <Wallet className="text-aomi-muted size-4 shrink-0" />
          <div className="min-w-0">
            <h2 className="text-[14px] font-semibold">Wallet impact</h2>
            <p className="text-aomi-muted mt-0.5 text-[12px]">
              {reviewSummary(request, transactions)}
            </p>
          </div>
        </header>
      )}
      {failed && (
        <p
          data-testid="action-simulation"
          data-status="failed"
          role="alert"
          className="text-aomi-danger mb-3 flex gap-2 text-[12px]"
        >
          <ShieldAlert className="size-4 shrink-0" />
          Simulation failed. This request cannot be sent.
        </p>
      )}
      {warnings.length > 0 && (
        <div className="border-aomi-warning/20 bg-aomi-warning/5 text-aomi-warning mb-3 rounded-xl border p-3 text-[12px]">
          {warnings.map((warning, index) => (
            <p key={index} className="break-words">
              {warning}
            </p>
          ))}
        </div>
      )}
      <div className="space-y-3">
        <ImpactPanel
          key={`${action.id}-${action.revision}`}
          request={request}
          balanceChanges={simulation?.balanceChanges ?? []}
          approvals={simulation?.approvals ?? []}
          hasApprovalTransaction={transactions.some(
            (tx) => tx.kind === "approval",
          )}
          supportedChains={supportedChains}
          showNetwork
          embedded={embedded}
          failed={failed ?? false}
        />
        {!embedded && (
          <section className="border-aomi-border min-w-0 rounded-[14px] border px-3">
            <h3 className="text-aomi-muted py-3 text-[12px]">
              Transactions{" "}
              <span className="ml-1 tabular-nums">{transactions.length}</span>
            </h3>
            <div className="divide-aomi-border divide-y">
              {transactions.map((tx, index) => (
                <details
                  key={`${action.id}-${action.revision}-${index}`}
                  data-testid="transaction-step"
                  data-kind={tx.kind}
                  className="group min-w-0 py-3 first:pt-0"
                >
                  <summary className="flex cursor-pointer list-none items-start gap-2.5 [&::-webkit-details-marker]:hidden">
                    <tx.Icon className="text-aomi-muted mt-0.5 size-4 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span
                        className="line-clamp-2 text-[13px] font-medium leading-5"
                        title={tx.label}
                      >
                        {tx.label}
                      </span>
                      <span className="text-aomi-muted mt-1 block truncate text-[11px]">
                        {index + 1} of {transactions.length} ·{" "}
                        {tx.destination
                          ? `To ${compact(tx.destination)}`
                          : tx.network}
                      </span>
                    </span>
                    <ChevronDown className="text-aomi-muted mt-1 size-3.5 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
                  </summary>
                  <dl className="text-aomi-muted mt-3 space-y-2 pl-[26px] text-[11px]">
                    <Detail label="Name" value={tx.label} />
                    <Detail label="Network" value={tx.network} />
                    {tx.destination && (
                      <Detail label="To" value={tx.destination} />
                    )}
                    {tx.protocol && (
                      <Detail
                        label="Protocol"
                        value={displayProtocol(tx.protocol)}
                      />
                    )}
                  </dl>
                  <details className="mt-3 pl-[26px] text-[11px]">
                    <summary className="text-aomi-muted cursor-pointer">
                      {request.type === "sign"
                        ? "Signing request"
                        : "Raw transaction"}
                    </summary>
                    <pre className="bg-aomi-surface mt-2 max-h-52 overflow-auto whitespace-pre-wrap break-all rounded-lg p-2">
                      {JSON.stringify(
                        request.type === "sign"
                          ? request
                          : request.transactions[index],
                        null,
                        2,
                      )}
                    </pre>
                  </details>
                </details>
              ))}
            </div>
          </section>
        )}
        <dl
          className={
            embedded
              ? "flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-[11px]"
              : "space-y-2.5 px-1 py-1 text-[12px]"
          }
        >
          {[...new Set(signers)].filter(Boolean).map((signer) => (
            <div key={signer} className="flex items-center gap-2">
              <Wallet className="text-aomi-muted size-3.5 shrink-0" />
              <dt className={embedded ? "sr-only" : "text-aomi-muted flex-1"}>
                Signing wallet
              </dt>
              <dd title={signer} className="truncate">
                {compact(signer)}
              </dd>
            </div>
          ))}
          <div className="text-aomi-muted flex items-center gap-2">
            <Fuel className="size-3.5 shrink-0" />
            <dt className="flex-1">{simulationCostSummary(simulation)}</dt>
          </div>
        </dl>
      </div>
      {embedded && request.type === "sign" && (
        <details className="text-aomi-muted mt-3 text-[11px]">
          <summary className="cursor-pointer">Signing request</summary>
          <pre className="bg-aomi-surface mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-lg p-2">
            {JSON.stringify(request, null, 2)}
          </pre>
        </details>
      )}
      {simulation && (
        <details className="text-aomi-muted mt-2 text-[11px]">
          <summary className="cursor-pointer">Simulation details</summary>
          <pre className="bg-aomi-surface mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-all rounded-lg p-2">
            {JSON.stringify(simulation, null, 2)}
          </pre>
        </details>
      )}
      <footer
        className={
          embedded
            ? "mt-3 grid grid-cols-[1fr_1.7fr] gap-2"
            : "border-aomi-border mt-4 grid grid-cols-[1fr_1.7fr] gap-2 border-t pt-4"
        }
      >
        <Button
          type="button"
          variant="outline"
          onClick={onReject}
          disabled={approving}
          className="border-aomi-border bg-aomi-raised text-aomi-muted hover:bg-aomi-hover h-10 rounded-full text-[12px]"
        >
          Reject
        </Button>
        <Button
          type="button"
          onClick={onApprove}
          disabled={approving || failed}
          className="bg-aomi-fg text-aomi-bg hover:bg-aomi-fg h-10 rounded-full text-[12px] hover:opacity-90"
        >
          <Wallet className="size-4" />
          {approving ? "Waiting for wallet…" : "Send to wallet"}
        </Button>
      </footer>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[60px_minmax(0,1fr)] gap-2">
      <dt>{label}</dt>
      <dd className="text-aomi-fg break-all">{value}</dd>
    </div>
  );
}
