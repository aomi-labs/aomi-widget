"use client";

import { useEffect, useMemo, useState, type FC, type SVGProps } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Coins,
  FileSignature,
  Info,
  LoaderCircle,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import type { Action, ActionRequest } from "@aomi-labs/client";
import { normalizeSolanaCluster } from "@aomi-labs/client";
import { cn, getChainInfo, useAomiRuntime } from "@aomi-labs/react";

import { getChainIcon } from "./icons/chain-map";
import { SolanaIcon } from "./icons/chains";
import { useAomiWalletKit } from "../lib/wallet-kit";
import { Button } from "./ui/button";

type Simulation = Extract<
  ActionRequest,
  { type: "execute_evm" | "execute_svm" }
>["simulation"];
type BalanceChange = Simulation["balanceChanges"][number];
type ChainIcon = FC<SVGProps<SVGSVGElement>>;
type SupportedChain = {
  id: number;
  name: string;
  nativeCurrency?: { symbol?: string };
};

const STALE_FAILED_SIMULATION_WARNING = "simulation did not pass";

/** Presents the next durable Action and submits only an explicit user choice. */
export function RuntimeTxHandler() {
  const {
    pendingActions,
    actionAttempts,
    executeAction,
    rejectAction,
    showNotification,
  } = useAomiRuntime();
  const wallet = useAomiWalletKit();
  const previewAction = useTransactionReviewPreview();
  const liveAction = pendingActions[0];
  const action = liveAction ?? previewAction;
  const attempt = liveAction ? actionAttempts.get(liveAction.id) : undefined;
  const approving =
    attempt?.state === "executing" || attempt?.state === "responding";

  const decide = async (approved: boolean) => {
    if (!liveAction || approving) return;
    try {
      if (approved) await executeAction(liveAction.id);
      else await rejectAction(liveAction.id, "Request rejected");
    } catch (error) {
      showNotification({
        type: "error",
        title:
          error instanceof Error ? error.message : "Action response failed",
        duration: 6000,
      });
    }
  };

  if (!action) return null;

  return (
    <TransactionReview
      action={action}
      supportedChains={wallet.supportedChains}
      approving={approving}
      preview={!liveAction}
      onApprove={() => void decide(true)}
      onReject={() => void decide(false)}
    />
  );
}

export function TransactionReview({
  action,
  supportedChains,
  approving = false,
  preview = false,
  onApprove,
  onReject,
}: {
  action: Action;
  supportedChains?: readonly SupportedChain[];
  approving?: boolean;
  preview?: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const [transactionIndex, setTransactionIndex] = useState(0);
  const [pageDirection, setPageDirection] = useState<-1 | 1>(1);
  const transactions = useMemo(
    () => actionTransactions(action.request, supportedChains),
    [action.request, supportedChains],
  );
  const transaction = transactions[transactionIndex] ?? transactions[0];
  const simulation =
    action.request.type === "sign" ? undefined : action.request.simulation;
  const balanceChanges = simulation?.balanceChanges ?? [];
  const warnings = visibleSimulationWarnings(simulation);
  const canPage = transactions.length > 1;
  const transactionNetworks = new Set(transactions.map((item) => item.network));
  const balanceNetworks = new Set(
    balanceChanges
      .map((change) =>
        balanceChangeNetwork(change, action.request, supportedChains),
      )
      .filter((network): network is string => Boolean(network)),
  );

  useEffect(() => setTransactionIndex(0), [action.id, action.revision]);

  if (!transaction) return null;

  const move = (direction: -1 | 1) => {
    setPageDirection(direction);
    setTransactionIndex(
      (current) =>
        (current + direction + transactions.length) % transactions.length,
    );
  };

  return (
    <aside
      data-testid="transaction-review"
      data-action-id={action.id}
      data-preview={preview || undefined}
      className="aui-transaction-review border-aomi-border bg-aomi-raised text-aomi-fg animate-in fade-in-0 slide-in-from-bottom-2 zoom-in-95 w-full origin-bottom overflow-hidden rounded-2xl border shadow-[0_14px_40px_rgba(17,24,39,0.09)] duration-300 ease-out motion-reduce:animate-none"
    >
      <header className="flex min-h-12 items-center gap-3 px-4 py-2">
        <span className="bg-aomi-accent-subtle text-aomi-accent-strong ring-current/5 flex size-8 shrink-0 items-center justify-center rounded-full ring-1 ring-inset">
          {action.request.type === "sign" ? (
            <FileSignature className="size-4" />
          ) : (
            <ShieldCheck className="size-4" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[13px] font-semibold leading-5">
            {reviewTitle(action.request, transactions.length)}
          </h2>
          <p className="text-aomi-muted truncate text-[11px] leading-4">
            {reviewSubtitle(action.request, transactions)}
          </p>
        </div>
        {simulation ? (
          <SimulationVerdict status={simulation.status} />
        ) : (
          <span className="bg-aomi-surface-2 text-aomi-muted inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-[11px] font-medium">
            Signature
          </span>
        )}
      </header>

      {balanceChanges.length > 0 ? (
        <section
          aria-label="Estimated wallet changes"
          data-change-count={balanceChanges.length}
          className={cn(
            "border-aomi-border/70 grid gap-px border-y bg-[var(--aomi-border)]",
            balanceChanges.length > 1 && "sm:grid-cols-2",
          )}
        >
          {balanceChanges.map((change, index) => (
            <AssetChange
              key={`${change.asset}-${change.direction}-${index}`}
              change={change}
              request={action.request}
              supportedChains={supportedChains}
              showNetwork={balanceNetworks.size > 1}
            />
          ))}
        </section>
      ) : (
        <section className="border-aomi-border/70 bg-aomi-surface/45 flex items-center gap-2.5 border-y px-4 py-2">
          <span className="bg-aomi-surface-2 text-aomi-muted flex size-7 shrink-0 items-center justify-center rounded-full">
            <Info className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-aomi-fg text-[11px] font-medium leading-4">
              {action.request.type === "sign"
                ? "Signature only"
                : "Token changes unavailable"}
            </p>
            <p className="text-aomi-muted truncate text-[10px] leading-4">
              {action.request.type === "sign"
                ? "No transaction is sent until after you sign."
                : "Execution passed, but the simulation returned no balance deltas."}
            </p>
          </div>
        </section>
      )}

      <section className="px-4 py-2.5">
        <div className="flex min-h-10 items-center gap-3">
          <div
            key={transactionIndex}
            className={cn(
              "animate-in fade-in-0 flex min-w-0 flex-1 items-center gap-3 duration-200 motion-reduce:animate-none",
              pageDirection > 0
                ? "slide-in-from-right-1"
                : "slide-in-from-left-1",
            )}
          >
            <span className="bg-aomi-surface-2 flex size-8 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ring-black/[0.03]">
              <transaction.Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-[13px] font-medium leading-5">
                  {transaction.label}
                </p>
                {transaction.protocol ? (
                  <span className="bg-aomi-surface-2 text-aomi-muted hidden shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.04em] sm:inline">
                    {displayProtocol(transaction.protocol)}
                  </span>
                ) : null}
              </div>
              <p className="text-aomi-muted truncate text-[11px] leading-4">
                {transactionNetworks.size > 1 || !transaction.destination
                  ? transaction.network
                  : ""}
                {transaction.destination
                  ? `${transactionNetworks.size > 1 ? " · " : ""}To ${compact(transaction.destination)}`
                  : ""}
              </p>
            </div>
          </div>

          {canPage ? (
            <div className="border-aomi-border bg-aomi-surface flex h-8 shrink-0 items-center rounded-full border p-0.5">
              <button
                type="button"
                onClick={() => move(-1)}
                aria-label="Previous transaction"
                className="text-aomi-muted hover:bg-aomi-hover hover:text-aomi-fg flex size-7 items-center justify-center rounded-full transition-colors"
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <span className="text-aomi-muted min-w-10 text-center font-mono text-[10px] tabular-nums">
                {transactionIndex + 1} / {transactions.length}
              </span>
              <button
                type="button"
                onClick={() => move(1)}
                aria-label="Next transaction"
                className="text-aomi-muted hover:bg-aomi-hover hover:text-aomi-fg flex size-7 items-center justify-center rounded-full transition-colors"
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          ) : null}
        </div>
      </section>

      {simulation?.fees.length || simulation?.gas?.units || warnings.length ? (
        <div className="border-aomi-border/70 flex min-h-8 flex-wrap items-center gap-x-3 gap-y-1 border-t px-4 py-1.5 text-[11px]">
          {simulation?.fees.length ? (
            <span className="text-aomi-muted">
              Estimated fees · {formatFeeSummary(simulation.fees)}
            </span>
          ) : simulation?.gas?.units ? (
            <span className="text-aomi-muted">
              Estimated gas · {formatInteger(simulation.gas.units)} units
            </span>
          ) : null}
          {warnings[0] ? (
            <span className="text-aomi-warning truncate" title={warnings[0]}>
              {warnings[0]}
            </span>
          ) : null}
        </div>
      ) : null}

      <footer className="border-aomi-border/70 bg-aomi-surface/35 flex items-center justify-end gap-2 border-t px-3 py-2">
        {preview ? (
          <p className="text-aomi-muted mr-auto hidden pl-1 text-[11px] sm:block">
            Preview only
          </p>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onReject}
          disabled={approving}
          className="border-aomi-border bg-aomi-raised text-aomi-muted hover:bg-aomi-hover hover:text-aomi-fg h-8 rounded-lg px-3 text-[12px]"
        >
          Reject
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onApprove}
          disabled={approving}
          className="bg-aomi-fg text-aomi-bg hover:bg-aomi-fg h-8 min-w-24 rounded-lg px-3 text-[12px] hover:opacity-90"
        >
          {approving ? (
            <>
              <LoaderCircle className="size-3.5 animate-spin" />
              In wallet…
            </>
          ) : (
            <>
              <Check className="size-3.5" strokeWidth={2.25} />
              Approve
            </>
          )}
        </Button>
      </footer>
    </aside>
  );
}

function SimulationVerdict({ status }: { status: Simulation["status"] }) {
  const passed = status === "passed";
  return (
    <span
      data-testid="action-simulation"
      data-status={status}
      aria-label={passed ? "Simulation passed" : "Simulation failed"}
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-medium",
        passed
          ? "bg-aomi-success/10 text-aomi-success"
          : "bg-aomi-danger/10 text-aomi-danger",
      )}
    >
      {passed ? (
        <Check className="size-3" strokeWidth={2.5} />
      ) : (
        <ShieldAlert className="size-3" />
      )}
      <span>
        <span className="hidden sm:inline">Simulation </span>
        {passed ? "passed" : "failed"}
      </span>
    </span>
  );
}

function AssetChange({
  change,
  request,
  supportedChains,
  showNetwork,
}: {
  change: BalanceChange;
  request: ActionRequest;
  supportedChains?: readonly SupportedChain[];
  showNetwork: boolean;
}) {
  const incoming = change.direction === "in";
  const outgoing = change.direction === "out";
  const chainId = change.chainId ?? firstEvmChainId(request);
  const nativeSymbol = chainId
    ? (supportedChains?.find((chain) => chain.id === chainId)?.nativeCurrency
        ?.symbol ?? getChainInfo(chainId)?.ticker)
    : undefined;
  const symbol =
    change.symbol ??
    (change.asset === "native" ? nativeSymbol : undefined) ??
    assetFallback(change.asset);
  const decimals =
    change.decimals ?? (change.asset === "native" ? 18 : undefined);
  const network = balanceChangeNetwork(change, request, supportedChains);

  return (
    <div className="bg-aomi-surface/70 flex min-w-0 items-center gap-3 px-4 py-2">
      <AssetMark />
      <div className="min-w-0 flex-1">
        <p className="text-aomi-muted text-[10px] font-medium uppercase tracking-[0.08em]">
          {incoming ? "You receive" : outgoing ? "You send" : "Wallet change"}
          {showNetwork && network ? (
            <span className="ml-1 normal-case tracking-normal">
              · {network}
            </span>
          ) : null}
        </p>
        <p
          className={cn(
            "truncate text-[13px] font-medium tabular-nums leading-5",
            incoming
              ? "text-aomi-success"
              : outgoing
                ? "text-aomi-danger"
                : "text-aomi-fg",
          )}
        >
          {incoming ? "+" : outgoing ? "−" : ""}
          {formatAssetAmount(change.amount, decimals)} {symbol}
        </p>
      </div>
    </div>
  );
}

function AssetMark() {
  return (
    <span
      aria-hidden="true"
      className="border-aomi-border/60 bg-aomi-raised text-aomi-muted flex size-8 shrink-0 items-center justify-center rounded-full border"
    >
      <Coins className="size-[17px]" strokeWidth={1.7} />
    </span>
  );
}

type TransactionView = {
  label: string;
  network: string;
  destination?: string;
  protocol?: string;
  Icon: ChainIcon;
};

function actionTransactions(
  request: ActionRequest,
  supportedChains?: readonly SupportedChain[],
): TransactionView[] {
  if (request.type === "execute_evm") {
    return request.transactions.map((transaction, index) => {
      const chain = supportedChains?.find(
        (candidate) => candidate.id === transaction.chain_id,
      );
      return {
        label: friendlyTransactionLabel(
          transaction.label || `Transaction ${index + 1}`,
          transaction.kind,
        ),
        network: chain?.name ?? `Chain ${transaction.chain_id}`,
        destination: transaction.to,
        protocol: transaction.protocol,
        Icon: getChainIcon(transaction.chain_id) ?? ShieldCheck,
      };
    });
  }
  if (request.type === "execute_svm") {
    return request.transactions.map((transaction, index) => ({
      label: transaction.description || `Transaction ${index + 1}`,
      network:
        normalizeSolanaCluster(transaction.cluster) ??
        transaction.cluster ??
        "Solana",
      Icon: SolanaIcon,
    }));
  }
  const chainId = request.chainId;
  const chain = chainId
    ? supportedChains?.find((candidate) => candidate.id === chainId)
    : undefined;
  return [
    {
      label: request.description || "Sign wallet request",
      network:
        request.chainFamily === "svm"
          ? (normalizeSolanaCluster(request.cluster) ??
            request.cluster ??
            "Solana")
          : (chain?.name ?? (chainId ? `Chain ${chainId}` : "Ethereum")),
      destination: request.signer,
      Icon:
        request.chainFamily === "svm"
          ? SolanaIcon
          : chainId
            ? (getChainIcon(chainId) ?? FileSignature)
            : FileSignature,
    },
  ];
}

function reviewTitle(request: ActionRequest, count: number): string {
  if (request.type === "sign") return "Review signature";
  return count === 1 ? "Review transaction" : `Review ${count} transactions`;
}

function reviewSubtitle(
  request: ActionRequest,
  transactions: TransactionView[],
): string {
  if (request.type === "sign") return "Confirm what your wallet will sign";
  const networks = [...new Set(transactions.map((item) => item.network))];
  return networks.join(" + ");
}

function friendlyTransactionLabel(label: string, kind?: string): string {
  let clean = label.trim();
  const normalizedKind = kind?.toLowerCase() ?? "";

  clean = clean
    .replace(/\s+using\s+quote\s+\S+\s*$/i, "")
    .replace(/\s+on\s+chain\s+\d+\s*$/i, "")
    .replace(/^approve\s+li\.fi\s+swap\s+spender\s+for\s+exact\s+/i, "Approve ")
    .replace(/^li\.fi\s+same-chain\s+swap\s+quote\s+\S+\s*:\s*/i, "Swap ")
    .replace(/^li\.fi\s+same-chain\s+swap\s+/i, "Swap ")
    .replace(/\s+/g, " ")
    .trim();

  if (normalizedKind.includes("approve") && !/^approve\b/i.test(clean)) {
    return `Approve ${clean}`;
  }
  if (normalizedKind.includes("swap") && !/^swap\b/i.test(clean)) {
    return `Swap ${clean}`;
  }
  return clean;
}

function displayProtocol(protocol: string): string {
  return protocol.toLowerCase() === "lifi" ? "LI.FI" : protocol;
}

function balanceChangeNetwork(
  change: BalanceChange,
  request: ActionRequest,
  supportedChains?: readonly SupportedChain[],
): string | undefined {
  if (change.cluster) {
    return normalizeSolanaCluster(change.cluster) ?? change.cluster;
  }
  const chainId = change.chainId ?? firstEvmChainId(request);
  if (!chainId) return undefined;
  return (
    supportedChains?.find((chain) => chain.id === chainId)?.name ??
    `Chain ${chainId}`
  );
}

function visibleSimulationWarnings(
  simulation: Simulation | undefined,
): string[] {
  if (!simulation) return [];
  if (simulation.status !== "passed") return simulation.warnings;
  return simulation.warnings.filter(
    (warning) =>
      warning.trim().toLowerCase() !== STALE_FAILED_SIMULATION_WARNING,
  );
}

function formatFeeSummary(fees: Simulation["fees"]): string {
  const first = fees[0];
  if (!first) return "Unavailable";
  const decimals =
    first.decimals ?? (first.asset === "native" ? 18 : undefined);
  const symbol =
    first.symbol ??
    (first.asset === "native" ? "native" : assetFallback(first.asset));
  const suffix = fees.length > 1 ? ` + ${fees.length - 1} more` : "";
  return `${formatAssetAmount(first.amount, decimals)} ${symbol}${suffix}`;
}

function formatAssetAmount(amount: string, decimals?: number): string {
  const normalized = amount.trim();
  if (!normalized) return "0";
  if (normalized.includes(".") || decimals === undefined) return normalized;
  try {
    const negative = normalized.startsWith("-");
    const digits = (negative ? normalized.slice(1) : normalized).replace(
      /^0+(?=\d)/,
      "",
    );
    if (!/^\d+$/.test(digits)) return normalized;
    if (decimals === 0) return `${negative ? "-" : ""}${digits}`;
    const padded = digits.padStart(decimals + 1, "0");
    const whole = padded.slice(0, -decimals);
    const fraction = padded.slice(-decimals).replace(/0+$/, "");
    const value = fraction ? `${whole}.${fraction}` : whole;
    return `${negative ? "-" : ""}${value}`;
  } catch {
    return normalized;
  }
}

function formatInteger(value: string): string {
  try {
    return new Intl.NumberFormat("en-US").format(BigInt(value));
  } catch {
    return value;
  }
}

function assetFallback(asset: string): string {
  if (!asset || asset === "native") return "Asset";
  return asset.startsWith("0x") ? compact(asset) : asset;
}

function firstEvmChainId(request: ActionRequest): number | undefined {
  if (request.type === "execute_evm") return request.transactions[0]?.chain_id;
  return request.type === "sign" ? request.chainId : undefined;
}

function compact(value: string): string {
  return value.length > 16 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;
}

/**
 * Development-only in-place fixture. Open the Portal with
 * `?aomi_preview=tx-review`, `tx-review-single`, or `tx-review-swap`;
 * production bundles cannot activate it.
 */
function useTransactionReviewPreview(): Action | undefined {
  const [preview, setPreview] = useState<Action>();
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const update = () => {
      const requested = new URLSearchParams(window.location.search).get(
        "aomi_preview",
      );
      setPreview(
        requested === "tx-review"
          ? transactionReviewFixture()
          : requested === "tx-review-single"
            ? singleTransactionReviewFixture()
            : requested === "tx-review-swap"
              ? emptyDeltaSwapReviewFixture()
              : undefined,
      );
    };
    update();
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  return preview;
}

function singleTransactionReviewFixture(): Action {
  return {
    ...transactionReviewFixture(),
    event_id: "preview-single-transaction-review",
    id: "preview-single-transaction-review",
    request: {
      type: "execute_evm",
      transactions: [
        {
          chain_id: 8453,
          from: "0x28581dd420b6c6135595265dd9b809e3757a7a7d",
          to: "0x28581dd420b6c6135595265dd9b809e3757a7a7d",
          data: "0x",
          value: "1",
          label: "Send 1 wei of ETH to self",
          kind: "transfer",
        },
      ],
      simulation: {
        status: "passed",
        balanceChanges: [
          {
            account: "0x28581dd420b6c6135595265dd9b809e3757a7a7d",
            asset: "native",
            amount: "1",
            direction: "out",
            symbol: "ETH",
            decimals: 18,
            chainId: 8453,
          },
        ],
        fees: [],
        gas: { units: "21062", priceWei: null, nativeCost: null },
        guards: [{ name: "batch_execution", status: "passed", message: null }],
        logs: [],
        warnings: [],
      },
    },
  };
}

function emptyDeltaSwapReviewFixture(): Action {
  return {
    ...transactionReviewFixture(),
    event_id: "preview-empty-delta-swap-review",
    id: "preview-empty-delta-swap-review",
    request: {
      type: "execute_evm",
      transactions: [
        {
          chain_id: 8453,
          from: "0x28581dd420b6c6135595265dd9b809e3757a7a7d",
          to: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
          data: "0x095ea7b3",
          label:
            "Approve LI.FI swap spender for exact 0.00758 USDC using quote lifi_q_f0e19e6d37f420b9553e13415e62f27",
          kind: "erc20_approve",
          protocol: "lifi",
        },
        {
          chain_id: 8453,
          from: "0x28581dd420b6c6135595265dd9b809e3757a7a7d",
          to: "0x1231deb6f5749ef6ce6943a275a1d3e7486f4eae",
          data: "0x4630a0d8",
          label:
            "LI.FI same-chain swap quote lifi_q_f0e19e6d37f420b9553e13415e62f27: 0.00758 USDC to ETH on chain 8453",
          kind: "lifi_swap",
          protocol: "lifi",
        },
      ],
      simulation: {
        status: "passed",
        balanceChanges: [],
        fees: [],
        gas: { units: "359417", priceWei: null, nativeCost: null },
        guards: [{ name: "batch_execution", status: "passed", message: null }],
        logs: [],
        warnings: [],
      },
    },
  };
}

function transactionReviewFixture(): Action {
  return {
    type: "action",
    event_id: "preview-transaction-review",
    sequence: Number.MAX_SAFE_INTEGER,
    turn_id: "preview-turn",
    occurred_at: Date.now(),
    id: "preview-transaction-review",
    revision: 1,
    state: "pending",
    request: {
      type: "execute_evm",
      transactions: [
        {
          chain_id: 8453,
          from: "0x28581dd420b6c6135595265dd9b809e3757a7a7d",
          to: "0x1231deb6f5749ef6ce6943a275a1d3e7486f4eae",
          data: "0x095ea7b3",
          label: "Approve USDC",
          kind: "approval",
          protocol: "LI.FI",
        },
        {
          chain_id: 8453,
          from: "0x28581dd420b6c6135595265dd9b809e3757a7a7d",
          to: "0x1231deb6f5749ef6ce6943a275a1d3e7486f4eae",
          data: "0x4630a0d8",
          label: "Swap USDC to ETH",
          kind: "swap",
          protocol: "LI.FI",
        },
      ],
      simulation: {
        status: "passed",
        balanceChanges: [
          {
            account: "0x28581dd420b6c6135595265dd9b809e3757a7a7d",
            asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            amount: "2500",
            direction: "out",
            symbol: "USDC",
            decimals: 6,
            chainId: 8453,
          },
          {
            account: "0x28581dd420b6c6135595265dd9b809e3757a7a7d",
            asset: "native",
            amount: "1000000000000",
            direction: "in",
            symbol: "ETH",
            decimals: 18,
            chainId: 8453,
          },
        ],
        fees: [],
        gas: { units: "273213", priceWei: null, nativeCost: null },
        guards: [{ name: "batch_execution", status: "passed", message: null }],
        logs: [],
        warnings: [],
      },
    },
    result: null,
    created_at: Date.now(),
    expires_at: null,
  };
}
