"use client";
import { useEffect, useRef } from "react";
import type { Action } from "@aomi-labs/client";
import { Wallet, Fuel } from "lucide-react";
import { Button } from "../ui/button";
import { ImpactPanel } from "./wallet-impact";
import {
  type SupportedChain,
  visibleSimulationWarnings,
  compact,
  simulationCostSummary,
} from "./presentation";

export function TransactionReview({
  action,
  supportedChains,
  approving = false,
  onApprove,
  onReject,
}: {
  action: Action;
  supportedChains?: readonly SupportedChain[];
  approving?: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const reviewRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const review = reviewRef.current;
    if (!review) return;
    // Reveal within the sidebar without moving the chat's clipping ancestors.
    const rail = review.closest<HTMLElement>(".aui-activity-sidebar");
    if (rail) {
      const overflow =
        review.getBoundingClientRect().bottom -
        rail.getBoundingClientRect().bottom;
      if (overflow > 0) rail.scrollTop += overflow + 16;
    }
  }, [action.id, action.revision]);
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
  if (failed)
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
      className="text-aomi-fg animate-in fade-in-0 slide-in-from-top-2 mt-3 min-w-0 duration-300 motion-reduce:animate-none"
    >
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
          supportedChains={supportedChains}
          showNetwork
          failed={failed ?? false}
        />
        <dl className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-[11px]">
          {[...new Set(signers)].filter(Boolean).map((signer) => (
            <div key={signer} className="flex items-center gap-2">
              <Wallet className="text-aomi-muted size-3.5 shrink-0" />
              <dt className="sr-only">Signing wallet</dt>
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
      <details className="text-aomi-muted mt-3 text-[11px]">
        <summary className="cursor-pointer">
          {request.type === "sign" ? "Signing request" : "Transaction details"}
        </summary>
        <pre className="bg-aomi-surface mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-lg p-2">
          {JSON.stringify(request, null, 2)}
        </pre>
      </details>
      {simulation && (
        <details className="text-aomi-muted mt-2 text-[11px]">
          <summary className="cursor-pointer">Simulation details</summary>
          <pre className="bg-aomi-surface mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-all rounded-lg p-2">
            {JSON.stringify(simulation, null, 2)}
          </pre>
        </details>
      )}
      <footer className="mt-3 grid grid-cols-[1fr_1.7fr] gap-2">
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
          disabled={approving}
          className="bg-aomi-fg text-aomi-bg hover:bg-aomi-fg h-10 rounded-full text-[12px] hover:opacity-90"
        >
          <Wallet className="size-4" />
          {approving ? "Waiting for wallet…" : "Send to wallet"}
        </Button>
      </footer>
    </section>
  );
}
