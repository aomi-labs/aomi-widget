"use client";

import { useEffect, useMemo, useState, type FC, type SVGProps } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Ban,
  Check,
  ChevronLeft,
  ChevronRight,
  Coins,
  FileSignature,
  Fuel,
  Gem,
  Info,
  KeyRound,
  Layers3,
  Repeat2,
  Send,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import type { Action, ActionRequest } from "@aomi-labs/client";
import { normalizeSolanaCluster } from "@aomi-labs/client";
import { cn, getChainInfo, useAomiRuntime } from "@aomi-labs/react";

import { useAomiWalletKit } from "../lib/wallet-kit";
import { Button } from "./ui/button";

type Simulation = Extract<
  ActionRequest,
  { type: "execute_evm" | "execute_svm" }
>["simulation"];
type BalanceChange = Simulation["balanceChanges"][number];
type ApprovalChange = Simulation["approvals"][number];
type TransactionIcon = FC<SVGProps<SVGSVGElement>>;
type SupportedChain = {
  id: number;
  name: string;
  nativeCurrency?: { symbol?: string };
};

const STALE_FAILED_SIMULATION_WARNING = "simulation did not pass";
const REVIEW_PAGE_SIZE = 2;

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
  const [transactionPage, setTransactionPage] = useState(0);
  const [pageDirection, setPageDirection] = useState<-1 | 1>(1);
  const transactions = useMemo(
    () => actionTransactions(action.request, supportedChains),
    [action.request, supportedChains],
  );
  const transactionPages = useMemo(
    () => paginateTransactions(transactions),
    [transactions],
  );
  const visibleTransactions =
    transactionPages[transactionPage] ?? transactionPages[0] ?? [];
  const simulation =
    action.request.type === "sign" ? undefined : action.request.simulation;
  const balanceChanges = simulation?.balanceChanges ?? [];
  const approvals = simulation?.approvals ?? [];
  const warnings = visibleSimulationWarnings(simulation);
  const simulationFailed = simulation?.status === "failed";
  const balanceNetworks = new Set(
    balanceChanges
      .map((change) =>
        balanceChangeNetwork(change, action.request, supportedChains),
      )
      .filter((network): network is string => Boolean(network)),
  );

  useEffect(() => setTransactionPage(0), [action.id, action.revision]);

  const move = (direction: -1 | 1) => {
    setPageDirection(direction);
    setTransactionPage(
      (current) =>
        (current + direction + transactionPages.length) %
        transactionPages.length,
    );
  };

  return (
    <aside
      data-testid="transaction-review"
      data-action-id={action.id}
      data-preview={preview || undefined}
      className="aui-transaction-review border-aomi-border bg-aomi-raised text-aomi-fg animate-in fade-in-0 slide-in-from-bottom-2 zoom-in-95 w-full origin-bottom overflow-hidden rounded-2xl border shadow-[0_14px_40px_rgba(17,24,39,0.09)] duration-300 ease-out motion-reduce:animate-none"
    >
      <header className="flex min-h-14 items-center gap-3 px-4 py-2.5">
        <span className="bg-aomi-accent-subtle text-aomi-accent-strong ring-current/5 flex size-8 shrink-0 items-center justify-center rounded-full ring-1 ring-inset">
          {action.request.type === "sign" ? (
            <FileSignature className="size-4" />
          ) : (
            <ShieldCheck className="size-4" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[13px] font-semibold leading-5">
            Wallet impact
          </h2>
          <p className="text-aomi-muted truncate text-[11px] leading-4">
            {reviewSummary(action.request, transactions)}
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

      {warnings[0] ? (
        <div className="border-aomi-warning/15 bg-aomi-warning/5 text-aomi-warning flex items-center gap-2 border-t px-4 py-2 text-[10px]">
          <ShieldAlert className="size-3.5 shrink-0" />
          <span className="truncate" title={warnings[0]}>
            {warnings[0]}
          </span>
        </div>
      ) : null}

      <section className="border-aomi-border/70 grid gap-3 border-t p-3 sm:grid-cols-2">
        <ImpactPanel
          key={`${action.id}-${action.revision}`}
          request={action.request}
          balanceChanges={balanceChanges}
          approvals={approvals}
          hasApprovalTransaction={transactions.some(
            (transaction) => transaction.kind === "approval",
          )}
          supportedChains={supportedChains}
          showNetwork={balanceNetworks.size > 1}
          failed={simulationFailed}
        />
        <section className="border-aomi-border bg-aomi-raised flex min-h-[152px] min-w-0 flex-col rounded-xl border p-2">
          <div className="flex min-h-8 items-center gap-2 px-2 pb-1">
            <p className="text-aomi-muted flex-1 text-[9px] font-semibold uppercase tracking-[0.12em]">
              Transactions
            </p>
            {transactionPages.length > 1 ? (
              <ReviewPager
                current={transactionPage}
                total={transactionPages.length}
                label={pageRangeLabel(
                  transactionPages
                    .slice(0, transactionPage)
                    .reduce((count, page) => count + page.length, 0),
                  visibleTransactions.length,
                  transactions.length,
                )}
                onMove={move}
                subject="transaction page"
              />
            ) : null}
          </div>
          <div
            key={transactionPage}
            className={cn(
              "animate-in fade-in-0 min-h-[104px] duration-200 motion-reduce:animate-none",
              pageDirection > 0
                ? "slide-in-from-right-1"
                : "slide-in-from-left-1",
            )}
          >
            {visibleTransactions.map((transaction, index) => (
              <TransactionRow
                key={`${transaction.label}-${index}`}
                transaction={transaction}
                connected={
                  index === 1 &&
                  visibleTransactions[0]?.kind === "approval" &&
                  transaction.kind !== "approval"
                }
              />
            ))}
          </div>
        </section>
      </section>

      <footer className="border-aomi-border/70 bg-aomi-surface/35 flex min-h-12 items-center gap-2 border-t px-3 py-2">
        <div className="text-aomi-muted mr-auto flex min-w-0 items-center gap-1.5 pl-1 text-[11px]">
          <Fuel className="size-3.5 shrink-0" />
          <span className="truncate">{simulationCostSummary(simulation)}</span>
          {preview ? (
            <span className="hidden shrink-0 sm:inline">· Preview</span>
          ) : null}
        </div>
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
          disabled={approving || simulationFailed}
          className="bg-aomi-fg text-aomi-bg hover:bg-aomi-fg h-8 min-w-24 rounded-lg px-3 text-[12px] hover:opacity-90"
        >
          <Send className="size-3.5" strokeWidth={2} />
          Send
        </Button>
      </footer>
    </aside>
  );
}

function ReviewPager({
  current,
  total,
  label,
  onMove,
  subject,
}: {
  current: number;
  total: number;
  label: string;
  onMove: (direction: -1 | 1) => void;
  subject: string;
}) {
  return (
    <div className="border-aomi-border bg-aomi-raised flex h-7 shrink-0 items-center rounded-full border p-0.5">
      <button
        type="button"
        onClick={() => onMove(-1)}
        aria-label={`Previous ${subject}`}
        className="text-aomi-muted hover:bg-aomi-hover hover:text-aomi-fg flex size-6 items-center justify-center rounded-full transition-colors"
      >
        <ChevronLeft className="size-3" />
      </button>
      <span className="text-aomi-muted min-w-[66px] text-center text-[9px] tabular-nums">
        {label || `${current + 1} of ${total}`}
      </span>
      <button
        type="button"
        onClick={() => onMove(1)}
        aria-label={`Next ${subject}`}
        className="text-aomi-muted hover:bg-aomi-hover hover:text-aomi-fg flex size-6 items-center justify-center rounded-full transition-colors"
      >
        <ChevronRight className="size-3" />
      </button>
    </div>
  );
}

function ImpactPanel({
  request,
  balanceChanges,
  approvals,
  hasApprovalTransaction,
  supportedChains,
  showNetwork,
  failed,
}: {
  request: ActionRequest;
  balanceChanges: Simulation["balanceChanges"];
  approvals: Simulation["approvals"];
  hasApprovalTransaction: boolean;
  supportedChains?: readonly SupportedChain[];
  showNetwork: boolean;
  failed: boolean;
}) {
  const [page, setPage] = useState(0);
  const visibleApprovals =
    balanceChanges.length && hasApprovalTransaction
      ? approvals.filter(
          (approval) => approval.unlimited || isRevokedApproval(approval),
        )
      : approvals;
  const entries: Array<
    | { type: "balance"; value: BalanceChange }
    | { type: "approval"; value: ApprovalChange }
  > = [
    ...balanceChanges.map((value) => ({ type: "balance" as const, value })),
    ...visibleApprovals.map((value) => ({ type: "approval" as const, value })),
  ];
  const pages = Math.max(1, Math.ceil(entries.length / REVIEW_PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const shown = entries.slice(
    safePage * REVIEW_PAGE_SIZE,
    safePage * REVIEW_PAGE_SIZE + REVIEW_PAGE_SIZE,
  );
  const heading =
    balanceChanges.length && visibleApprovals.length
      ? "Wallet changes"
      : balanceChanges.length
        ? "Balance changes"
        : approvals.length
          ? "Permission changes"
          : "Wallet changes";
  const move = (direction: -1 | 1) =>
    setPage((current) => (current + direction + pages) % pages);

  return (
    <section
      aria-label="Simulated wallet impact"
      data-change-count={balanceChanges.length}
      data-approval-count={approvals.length}
      className="bg-aomi-surface/70 flex min-h-[152px] min-w-0 flex-col rounded-xl p-2"
    >
      <div className="flex min-h-8 items-center gap-2 px-2 pb-1">
        <p className="text-aomi-muted flex-1 text-[9px] font-semibold uppercase tracking-[0.12em]">
          {heading}
        </p>
        {pages > 1 ? (
          <ReviewPager
            current={safePage}
            total={pages}
            label={pageRangeLabel(
              safePage * REVIEW_PAGE_SIZE,
              shown.length,
              entries.length,
            )}
            onMove={move}
            subject="wallet impact page"
          />
        ) : null}
      </div>
      <div className={cn("min-h-[104px]", failed && "opacity-50")}>
        {shown.map((entry, index) =>
          entry.type === "balance" ? (
            <AssetChange
              key={`${entry.value.asset}-${entry.value.tokenId ?? "fungible"}-${entry.value.direction}-${index}`}
              change={entry.value}
              request={request}
              supportedChains={supportedChains}
              showNetwork={showNetwork}
            />
          ) : (
            <ApprovalEffect
              key={`${entry.value.asset}-${entry.value.kind}-${entry.value.tokenId ?? "all"}-${index}`}
              approval={entry.value}
              request={request}
              supportedChains={supportedChains}
            />
          ),
        )}
        {shown.length === 0 ? (
          <div className="flex min-h-[104px] items-center gap-3 px-2">
            <span className="border-aomi-border bg-aomi-raised text-aomi-muted flex size-8 shrink-0 items-center justify-center rounded-full border">
              <Info className="size-3.5" />
            </span>
            <div className="min-w-0">
              <p className="text-[12px] font-medium">
                {request.type === "sign"
                  ? "Signature only"
                  : failed
                    ? "No wallet changes simulated"
                    : "No wallet changes"}
              </p>
              <p className="text-aomi-muted truncate text-[10px]">
                {request.type === "sign"
                  ? "No transaction is sent until after you sign."
                  : failed
                    ? "The request reverted before effects were produced."
                    : "Assets and permissions stay the same."}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function TransactionRow({
  transaction,
  connected,
}: {
  transaction: TransactionView;
  connected: boolean;
}) {
  const detail = [
    transaction.network,
    transaction.protocol ? displayProtocol(transaction.protocol) : undefined,
    transaction.destination
      ? `To ${compact(transaction.destination)}`
      : undefined,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" · ");

  return (
    <div
      data-testid="transaction-step"
      data-kind={transaction.kind}
      className="relative flex min-h-[52px] min-w-0 items-center gap-3 px-2.5 py-2"
    >
      {connected ? (
        <span
          data-testid="transaction-connector"
          aria-hidden="true"
          className="bg-aomi-accent/30 absolute -top-3 left-6 h-6 w-px"
        />
      ) : null}
      <span className="bg-aomi-accent-subtle text-aomi-accent-strong ring-aomi-accent/10 relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full ring-1 ring-inset">
        <transaction.Icon className="size-3.5" strokeWidth={1.9} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-medium leading-5">
          {transaction.label}
        </p>
        <p className="text-aomi-muted truncate text-[10px] leading-4">
          {detail}
        </p>
      </div>
    </div>
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
      Simulation {passed ? "passed" : "failed"}
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
  const presentation = assetChangePresentation(change, symbol, decimals);
  const assetName =
    change.asset !== "native" &&
    !change.tokenId &&
    change.name?.trim() &&
    change.name.trim().toLocaleLowerCase() !== symbol.toLocaleLowerCase()
      ? change.name.trim()
      : undefined;
  const context = [assetName, showNetwork ? network : undefined]
    .filter((value): value is string => Boolean(value))
    .join(" · ");

  return (
    <div
      data-testid="asset-effect"
      className="flex min-w-0 items-center gap-3 px-2.5 py-2"
    >
      <AssetMark
        standard={change.standard}
        symbol={symbol}
        incoming={incoming}
      />
      <div className="min-w-0 flex-1">
        <p className="text-aomi-muted truncate text-[10px] font-medium uppercase tracking-[0.08em]">
          {presentation.verb}
          {context ? (
            <span className="ml-1 normal-case tracking-normal">
              · {context}
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
          {presentation.value}
        </p>
        {presentation.detail ? (
          <p className="text-aomi-muted leading-3.5 truncate text-[10px]">
            {presentation.detail}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function AssetMark({
  standard,
  symbol,
  incoming,
}: {
  standard?: BalanceChange["standard"];
  symbol: string;
  incoming: boolean;
}) {
  const Direction = incoming ? ArrowDownLeft : ArrowUpRight;
  return (
    <span
      aria-hidden="true"
      data-asset-icon={
        standard === "native" && symbol.toUpperCase() === "ETH"
          ? "eth"
          : standard === "erc721" || standard === "erc1155"
            ? "nft"
            : "coin"
      }
      className={cn(
        "border-aomi-border/60 bg-aomi-raised relative flex size-8 shrink-0 items-center justify-center rounded-full border",
        incoming ? "text-aomi-success" : "text-aomi-danger",
      )}
    >
      {standard === "native" && symbol.toUpperCase() === "ETH" ? (
        <EthereumAssetIcon className="size-[17px]" />
      ) : standard === "erc721" || standard === "erc1155" ? (
        <Gem className="size-[16px]" strokeWidth={1.7} />
      ) : (
        <Coins className="size-[16px]" strokeWidth={1.7} />
      )}
      <span className="bg-aomi-raised ring-aomi-raised absolute -bottom-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full ring-1">
        <Direction className="size-2.5" strokeWidth={2.5} />
      </span>
    </span>
  );
}

const EthereumAssetIcon: TransactionIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
    <path
      d="m12 2.25-6.1 10.1L12 15.9l6.1-3.55L12 2.25Z"
      fill="currentColor"
      opacity=".9"
    />
    <path
      d="m5.9 13.55 6.1 8.2 6.1-8.2L12 17.1l-6.1-3.55Z"
      fill="currentColor"
      opacity=".58"
    />
  </svg>
);

function ApprovalEffect({
  approval,
  request,
  supportedChains,
}: {
  approval: ApprovalChange;
  request: ActionRequest;
  supportedChains?: readonly SupportedChain[];
}) {
  const revoked = isRevokedApproval(approval);
  const symbol =
    approval.symbol ?? approval.name ?? assetFallback(approval.asset);
  const network = approval.chainId
    ? (supportedChains?.find((chain) => chain.id === approval.chainId)?.name ??
      `Chain ${approval.chainId}`)
    : balanceChangeNetwork(
        { asset: approval.asset, amount: "0" },
        request,
        supportedChains,
      );
  const title = approvalTitle(approval, symbol);
  const scope = approvalScope(approval);

  return (
    <div
      data-testid="approval-effect"
      className="flex min-w-0 items-center gap-3 px-2.5 py-2"
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full border",
          revoked
            ? "border-aomi-success/15 bg-aomi-success/8 text-aomi-success"
            : approval.unlimited
              ? "border-aomi-warning/20 bg-aomi-warning/10 text-aomi-warning"
              : "border-aomi-accent/15 bg-aomi-accent-subtle text-aomi-accent-strong",
        )}
      >
        {revoked ? (
          <Ban className="size-3.5" strokeWidth={2} />
        ) : (
          <KeyRound className="size-3.5" strokeWidth={1.9} />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-aomi-muted text-[10px] font-medium uppercase tracking-[0.08em]">
          {revoked ? "Permission removed" : "Permission requested"}
          {network ? (
            <span className="ml-1 normal-case tracking-normal">
              · {network}
            </span>
          ) : null}
        </p>
        <p
          className={cn(
            "truncate text-[13px] font-medium leading-5",
            approval.unlimited && !revoked
              ? "text-aomi-warning"
              : "text-aomi-fg",
          )}
          title={title}
        >
          {title}
        </p>
        <p className="text-aomi-muted leading-3.5 truncate text-[10px]">
          {scope} · To {compact(approval.spender)}
        </p>
      </div>
    </div>
  );
}

type TransactionView = {
  label: string;
  network: string;
  destination?: string;
  protocol?: string;
  kind: "approval" | "action";
  Icon: TransactionIcon;
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
      const label = friendlyTransactionLabel(
        transaction.label || `Transaction ${index + 1}`,
        transaction.kind,
      );
      const semantic = transactionSemantic(label, transaction.kind);
      return {
        label,
        network: chain?.name ?? `Chain ${transaction.chain_id}`,
        destination: transaction.to,
        protocol: transaction.protocol,
        ...semantic,
      };
    });
  }
  if (request.type === "execute_svm") {
    return request.transactions.map((transaction, index) => {
      const label = transaction.description || `Transaction ${index + 1}`;
      return {
        label,
        network:
          normalizeSolanaCluster(transaction.cluster) ??
          transaction.cluster ??
          "Solana",
        ...transactionSemantic(label),
      };
    });
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
      kind: "action",
      Icon: FileSignature,
    },
  ];
}

function reviewSummary(
  request: ActionRequest,
  transactions: TransactionView[],
): string {
  if (request.type === "sign") return "Confirm what your wallet will sign";
  const intent =
    transactions.find((transaction) => transaction.kind !== "approval")
      ?.label ?? transactions[0]?.label;
  const networks = [...new Set(transactions.map((item) => item.network))];
  const count = `${transactions.length} ${transactions.length === 1 ? "transaction" : "transactions"}`;
  return [intent, count, networks.join(" + ")]
    .filter((value): value is string => Boolean(value))
    .join(" · ");
}

function transactionSemantic(
  label: string,
  kind?: string,
): Pick<TransactionView, "kind" | "Icon"> {
  const text = `${kind ?? ""} ${label}`.toLowerCase();
  if (/approv|allowance|permit/.test(text)) {
    return { kind: "approval", Icon: KeyRound };
  }
  if (/erc-?721|erc-?1155|\bnft\b|collectible|mint/.test(text)) {
    return { kind: "action", Icon: Gem };
  }
  if (/swap|exchange/.test(text)) {
    return { kind: "action", Icon: Repeat2 };
  }
  if (/bridge|cross.?chain/.test(text)) {
    return { kind: "action", Icon: Layers3 };
  }
  if (/send|transfer/.test(text)) {
    if (!/erc-?20/.test(text) && /(^|\s)eth(\s|$)/.test(text)) {
      return { kind: "action", Icon: EthereumAssetIcon };
    }
    if (/erc-?20|usdc|usdt|dai|weth/.test(text)) {
      return { kind: "action", Icon: Coins };
    }
    return { kind: "action", Icon: Send };
  }
  return { kind: "action", Icon: FileSignature };
}

function paginateTransactions(
  transactions: TransactionView[],
): TransactionView[][] {
  const pages: TransactionView[][] = [];
  for (let index = 0; index < transactions.length; ) {
    const first = transactions[index];
    const second = transactions[index + 1];
    const third = transactions[index + 2];
    if (second?.kind === "approval" && third) {
      pages.push(first ? [first] : []);
      index += 1;
      continue;
    }
    pages.push(transactions.slice(index, index + REVIEW_PAGE_SIZE));
    index += REVIEW_PAGE_SIZE;
  }
  return pages;
}

function pageRangeLabel(
  startIndex: number,
  visible: number,
  total: number,
): string {
  const start = startIndex + 1;
  const end = start + visible - 1;
  return `${start}${end > start ? `–${end}` : ""} of ${total}`;
}

function simulationCostSummary(simulation: Simulation | undefined): string {
  if (!simulation) return "No network fee";
  if (simulation.fees.length) {
    return `~${formatFeeSummary(simulation.fees)} fee`;
  }
  if (simulation.gas?.units) {
    return `Estimated gas · ${formatInteger(simulation.gas.units)} units`;
  }
  return simulation.status === "failed"
    ? "No gas will be spent"
    : "Gas estimate unavailable";
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

function assetChangePresentation(
  change: BalanceChange,
  symbol: string,
  decimals?: number,
): { verb: string; value: string; detail?: string } {
  const incoming = change.direction === "in";
  const outgoing = change.direction === "out";
  const zeroCounterparty = isZeroAddress(change.counterparty);
  const collection = change.name ?? symbol;

  if (change.standard === "erc721") {
    return {
      verb: zeroCounterparty
        ? incoming
          ? "NFT minted"
          : outgoing
            ? "NFT burned"
            : "NFT change"
        : incoming
          ? "NFT received"
          : outgoing
            ? "NFT sent"
            : "NFT change",
      value: `${collection}${change.tokenId ? ` #${change.tokenId}` : ""}`,
      detail: zeroCounterparty
        ? incoming
          ? "New to your wallet"
          : "Removed from circulation"
        : change.counterparty
          ? `${incoming ? "From" : "To"} ${compact(change.counterparty)}`
          : "ERC-721",
    };
  }

  if (change.standard === "erc1155") {
    return {
      verb: zeroCounterparty
        ? incoming
          ? "Collectible minted"
          : outgoing
            ? "Collectible burned"
            : "Collectible change"
        : incoming
          ? "Collectible received"
          : outgoing
            ? "Collectible sent"
            : "Collectible change",
      value: `${incoming ? "+" : outgoing ? "−" : ""}${formatAssetAmount(change.amount, 0)} × ${collection}${change.tokenId ? ` #${change.tokenId}` : ""}`,
      detail: zeroCounterparty
        ? incoming
          ? "New to your wallet"
          : "Removed from circulation"
        : change.counterparty
          ? `${incoming ? "From" : "To"} ${compact(change.counterparty)}`
          : "ERC-1155",
    };
  }

  return {
    verb: incoming ? "You receive" : outgoing ? "You send" : "Wallet change",
    value: `${incoming ? "+" : outgoing ? "−" : ""}${formatAssetAmount(change.amount, decimals)} ${symbol}`,
  };
}

function approvalTitle(approval: ApprovalChange, symbol: string): string {
  const revoked = isRevokedApproval(approval);
  if (approval.kind === "allowance") {
    if (revoked) return `Revoke ${symbol} spending`;
    if (approval.unlimited) return `Unlimited ${symbol} spending`;
    return `Allow ${formatAssetAmount(approval.amount ?? "0", approval.decimals ?? undefined)} ${symbol}`;
  }

  const token = approval.tokenId ? `${symbol} #${approval.tokenId}` : symbol;
  if (approval.kind === "token") {
    return revoked ? `Revoke ${token} approval` : `Approve ${token}`;
  }
  return revoked
    ? `Revoke access to all ${symbol}`
    : `Allow access to all ${symbol}`;
}

function approvalScope(approval: ApprovalChange): string {
  if (isRevokedApproval(approval)) {
    if (approval.kind === "operator") return "Collection access removed";
    if (approval.kind === "token") return "NFT access removed";
    return "Spending access removed";
  }
  if (approval.kind === "operator") return "Entire collection";
  if (approval.kind === "token") return "One NFT";
  if (approval.unlimited) return "No spending limit";
  return "Spending limit";
}

function isRevokedApproval(approval: ApprovalChange): boolean {
  return (
    approval.approved === false ||
    approval.amount === "0" ||
    (approval.kind === "token" && isZeroAddress(approval.spender))
  );
}

function isZeroAddress(value: string | null | undefined): boolean {
  return Boolean(value && /^0x0{40}$/i.test(value));
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
 * `?aomi_preview=tx-review`, `tx-review-single`, `tx-review-swap`,
 * `tx-review-permissions`, `tx-review-nft`, or `tx-review-failed`;
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
              ? swapTransactionReviewFixture()
              : requested === "tx-review-permissions"
                ? permissionReviewFixture()
                : requested === "tx-review-nft"
                  ? nftReviewFixture()
                  : requested === "tx-review-failed"
                    ? failedReviewFixture()
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
            standard: "native",
            counterparty: "0x28581dd420b6c6135595265dd9b809e3757a7a7d",
            step: 1,
          },
        ],
        approvals: [],
        fees: [],
        gas: { units: "21062", priceWei: null, nativeCost: null },
        guards: [{ name: "batch_execution", status: "passed", message: null }],
        logs: [],
        warnings: [],
      },
    },
  };
}

function swapTransactionReviewFixture(): Action {
  return {
    ...transactionReviewFixture(),
    event_id: "preview-swap-review",
    id: "preview-swap-review",
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
        balanceChanges: [
          {
            account: "0x28581dd420b6c6135595265dd9b809e3757a7a7d",
            asset: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
            amount: "7580",
            direction: "out",
            symbol: "USDC",
            name: "USD Coin",
            decimals: 6,
            chainId: 8453,
            standard: "erc20",
            counterparty: "0x1231deb6f5749ef6ce6943a275a1d3e7486f4eae",
            step: 2,
          },
          {
            account: "0x28581dd420b6c6135595265dd9b809e3757a7a7d",
            asset: "native",
            amount: "2450000000000",
            direction: "in",
            symbol: "ETH",
            decimals: 18,
            chainId: 8453,
            standard: "native",
            counterparty: "0x1231deb6f5749ef6ce6943a275a1d3e7486f4eae",
            step: 2,
          },
        ],
        approvals: [
          {
            account: "0x28581dd420b6c6135595265dd9b809e3757a7a7d",
            spender: "0x1231deb6f5749ef6ce6943a275a1d3e7486f4eae",
            asset: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
            kind: "allowance",
            amount: "7580",
            approved: true,
            unlimited: false,
            standard: "erc20",
            symbol: "USDC",
            name: "USD Coin",
            decimals: 6,
            chainId: 8453,
            step: 1,
          },
        ],
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
            standard: "erc20",
            name: "USD Coin",
            counterparty: "0x1231deb6f5749ef6ce6943a275a1d3e7486f4eae",
            step: 2,
          },
          {
            account: "0x28581dd420b6c6135595265dd9b809e3757a7a7d",
            asset: "native",
            amount: "1000000000000",
            direction: "in",
            symbol: "ETH",
            decimals: 18,
            chainId: 8453,
            standard: "native",
            counterparty: "0x1231deb6f5749ef6ce6943a275a1d3e7486f4eae",
            step: 2,
          },
        ],
        approvals: [
          {
            account: "0x28581dd420b6c6135595265dd9b809e3757a7a7d",
            spender: "0x1231deb6f5749ef6ce6943a275a1d3e7486f4eae",
            asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            kind: "allowance",
            amount: "2500",
            approved: true,
            unlimited: false,
            standard: "erc20",
            symbol: "USDC",
            name: "USD Coin",
            decimals: 6,
            chainId: 8453,
            step: 1,
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

function permissionReviewFixture(): Action {
  const base = transactionReviewFixture();
  if (base.request.type !== "execute_evm") return base;
  return {
    ...base,
    event_id: "preview-permission-review",
    id: "preview-permission-review",
    request: {
      ...base.request,
      simulation: {
        ...base.request.simulation,
        balanceChanges: [],
        approvals: [
          {
            account: "0x28581dd420b6c6135595265dd9b809e3757a7a7d",
            spender: "0x1231deb6f5749ef6ce6943a275a1d3e7486f4eae",
            asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            kind: "allowance",
            amount:
              "115792089237316195423570985008687907853269984665640564039457584007913129639935",
            approved: true,
            unlimited: true,
            standard: "erc20",
            symbol: "USDC",
            name: "USD Coin",
            decimals: 6,
            chainId: 8453,
            step: 1,
          },
          {
            account: "0x28581dd420b6c6135595265dd9b809e3757a7a7d",
            spender: "0x1231deb6f5749ef6ce6943a275a1d3e7486f4eae",
            asset: "0x4200000000000000000000000000000000000006",
            kind: "allowance",
            amount: "0",
            approved: false,
            unlimited: false,
            standard: "erc20",
            symbol: "WETH",
            name: "Wrapped Ether",
            decimals: 18,
            chainId: 8453,
            step: 2,
          },
        ],
      },
    },
  };
}

function nftReviewFixture(): Action {
  const base = singleTransactionReviewFixture();
  if (base.request.type !== "execute_evm") return base;
  const zero = "0x0000000000000000000000000000000000000000";
  return {
    ...base,
    event_id: "preview-nft-review",
    id: "preview-nft-review",
    request: {
      ...base.request,
      transactions: [
        {
          ...base.request.transactions[0]!,
          label: "Mint two collectibles",
          kind: "erc1155_mint",
        },
      ],
      simulation: {
        ...base.request.simulation,
        balanceChanges: [
          {
            account: "0x28581dd420b6c6135595265dd9b809e3757a7a7d",
            asset: "0x1111111111111111111111111111111111111111",
            amount: "1",
            direction: "in",
            symbol: "AOMI",
            name: "Aomi Founders",
            chainId: 8453,
            standard: "erc721",
            tokenId: "42",
            counterparty: zero,
            step: 1,
          },
          {
            account: "0x28581dd420b6c6135595265dd9b809e3757a7a7d",
            asset: "0x2222222222222222222222222222222222222222",
            amount: "3",
            direction: "in",
            symbol: "PASS",
            name: "Aomi Pass",
            chainId: 8453,
            standard: "erc1155",
            tokenId: "7",
            counterparty: zero,
            step: 1,
          },
        ],
        approvals: [
          {
            account: "0x28581dd420b6c6135595265dd9b809e3757a7a7d",
            spender: "0x3333333333333333333333333333333333333333",
            asset: "0x1111111111111111111111111111111111111111",
            kind: "token",
            approved: true,
            tokenId: "42",
            standard: "erc721",
            symbol: "AOMI",
            name: "Aomi Founders",
            chainId: 8453,
            step: 1,
          },
          {
            account: "0x28581dd420b6c6135595265dd9b809e3757a7a7d",
            spender: "0x3333333333333333333333333333333333333333",
            asset: "0x2222222222222222222222222222222222222222",
            kind: "operator",
            approved: true,
            standard: "erc1155",
            symbol: "PASS",
            name: "Aomi Pass",
            chainId: 8453,
            step: 1,
          },
        ],
      },
    },
  };
}

function failedReviewFixture(): Action {
  const base = singleTransactionReviewFixture();
  if (base.request.type !== "execute_evm") return base;
  return {
    ...base,
    event_id: "preview-failed-review",
    id: "preview-failed-review",
    request: {
      ...base.request,
      simulation: {
        ...base.request.simulation,
        status: "failed",
        balanceChanges: [],
        approvals: [],
        guards: [
          {
            name: "batch_execution",
            status: "failed",
            message: "Execution reverted before wallet confirmation.",
          },
        ],
        warnings: ["Execution reverted before wallet confirmation."],
      },
    },
  };
}
