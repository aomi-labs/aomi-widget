"use client";

// TEMPORARY design mock: transactions table with etherscan-style row
// expansion, assuming receipt writeback has landed. Fixture data only.

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, Copy, ExternalLink, X } from "lucide-react";

type TxFixture = {
  id: string;
  family?: "evm" | "svm";
  time: string;
  app: string;
  status: "confirmed" | "submitted" | "failed" | "created";
  chain: string;
  chainId: number;
  from: string;
  fromLabel: string;
  to: string;
  toLabel: string;
  value: string;
  valueUsd?: string;
  description: string;
  hash?: string;
  // receipt (post-writeback)
  block?: string;
  confirmations?: number;
  gasUsed?: string;
  gasLimit?: string;
  gasPct?: string;
  effGasPrice?: string;
  txFee?: string;
  platformFee?: string;
  nonce?: number;
  // svm receipt
  slot?: string;
  computeUnits?: string;
  computeLimit?: string;
  priorityFee?: string;
  method?: string;
  calldata?: string;
  transfers?: string[];
  revertReason?: string;
  // aomi context
  thread: string;
  intent: string;
  externalTxId: string;
  explorer?: string;
};

const ROWS: TxFixture[] = [
  {
    id: "tx-1",
    time: "7/15/2026, 6:03:30 PM",
    app: "goal-digger",
    status: "confirmed",
    chain: "Base",
    chainId: 8453,
    from: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
    fromLabel: "session wallet",
    to: "0x2626664c2603336E57B271c5C0b26F421741e481",
    toLabel: "Uniswap V3: SwapRouter02",
    value: "0.25 ETH",
    valueUsd: "≈ $918.40",
    description: "Swap 0.25 ETH → USDC on Uniswap v3",
    hash: "0x6a3f9e2b8c1d4e5f6a3f9e2b8c1d4e5f6a3f9e2b8c1d4e5f6a3f9e2b8c1d4e5f",
    block: "18,442,031",
    confirmations: 214,
    gasUsed: "142,310",
    gasLimit: "180,000",
    gasPct: "79.1%",
    effGasPrice: "2.9 gwei",
    txFee: "0.00041 ETH",
    platformFee: "0.00000082 ETH · 20 bps on gas",
    nonce: 47,
    method: "exactInputSingle(ExactInputSingleParams params)",
    calldata:
      "0x414bf389000000000000000000000000420000000000000000000000000000000000000600000000000000000000000083358400000000000000000000000000000000000000000000000000000000000001f4…",
    transfers: [
      "0.25 WETH  session wallet → Uniswap V3 Pool (WETH/USDC 0.05%)",
      "918.02 USDC  Uniswap V3 Pool → session wallet",
    ],
    thread: "thread_af92c1",
    intent: "“swap a quarter of my eth into usdc”",
    externalTxId: "ext_9921bd04",
    explorer: "https://basescan.org/tx/0x6a3f…",
  },
  {
    id: "tx-2",
    time: "7/15/2026, 5:09:10 PM",
    app: "goal-digger",
    status: "submitted",
    chain: "Ethereum",
    chainId: 1,
    from: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
    fromLabel: "session wallet",
    to: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    toLabel: "USDC token contract",
    value: "—",
    description: "Approve USDC for Aave v3 pool",
    hash: "0x91c4d5e6f7a8b91c4d5e6f7a8b91c4d5e6f7a8b91c4d5e6f7a8b91c4d5e6f7a8",
    confirmations: 1,
    nonce: 48,
    method: "approve(address spender, uint256 amount)",
    calldata: "0x095ea7b3000000000000000000000000878700000000000000000000000000000000ffff…",
    thread: "thread_af92c1",
    intent: "“deposit my usdc into aave”",
    externalTxId: "ext_9921be11",
    explorer: "https://etherscan.io/tx/0x91c4…",
  },
  {
    id: "tx-3",
    time: "7/15/2026, 3:39:10 PM",
    app: "goal-digger",
    status: "failed",
    chain: "Base",
    chainId: 8453,
    from: "0x1b8aB79C2c1a530dE1cA4F7BdD4e8fBbF4e2Ea41",
    fromLabel: "session wallet",
    to: "0x827922686190790b37229fd06084350E74485b72",
    toLabel: "Across Bridge: SpokePool",
    value: "0.05 ETH",
    valueUsd: "≈ $183.70",
    description: "Bridge 0.05 ETH to Arbitrum",
    hash: "0x3c1a8b0d92f4e6a73c1a8b0d92f4e6a73c1a8b0d92f4e6a73c1a8b0d92f4e6a7",
    block: "18,441,220",
    confirmations: 402,
    gasUsed: "61,004",
    gasLimit: "220,000",
    gasPct: "27.7%",
    effGasPrice: "3.1 gwei",
    txFee: "0.00019 ETH",
    platformFee: "—",
    nonce: 12,
    method: "depositV3(address depositor, address recipient, …)",
    calldata: "0x7b939232000000000000000000000000000000000000000000000000000000000000ea41…",
    revertReason: "InvalidQuoteTimestamp() — relayer quote expired before inclusion",
    thread: "thread_cc1092",
    intent: "“move 0.05 eth to arbitrum”",
    externalTxId: "ext_9820aa71",
    explorer: "https://basescan.org/tx/0x3c1a…",
  },
  {
    id: "tx-4",
    time: "7/14/2026, 6:19:10 PM",
    app: "goal-digger",
    status: "created",
    chain: "Ethereum",
    chainId: 1,
    from: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
    fromLabel: "session wallet",
    to: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    toLabel: "Uniswap V2: Router",
    value: "1.2 ETH",
    valueUsd: "≈ $4,408.30",
    description: "Add 1.2 ETH liquidity to ETH/USDC",
    method: "addLiquidityETH(address token, …)",
    calldata: "0xf305d719000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48…",
    thread: "thread_af92c1",
    intent: "“put 1.2 eth into the eth/usdc pool”",
    externalTxId: "ext_9932cf20",
  },
];

const SVM_TX: TxFixture = {
  id: "tx-5",
  family: "svm",
  time: "7/15/2026, 2:11:05 PM",
  app: "goal-digger",
  status: "confirmed",
  chain: "Solana",
  chainId: 0,
  from: "7fUAJdStEuGbc3sM84cKRL6yYaaSstyLSU4ve5oovLS7",
  fromLabel: "session wallet",
  to: "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
  toLabel: "Jupiter Aggregator v6",
  value: "2.5 SOL",
  valueUsd: "≈ $412.75",
  description: "Swap 2.5 SOL → USDC via Jupiter",
  hash: "5UfDuX1sZq8mE2fVbhcTLbrXsFPqzKYdRxN7wA9jvQk3H1mCeGtWpB6yLoJi4aSnrD8xETuMhZ2NfPgVc9KwbA37",
  slot: "289,441,207",
  confirmations: 31,
  txFee: "0.000014 SOL",
  computeUnits: "145,203",
  computeLimit: "200,000",
  priorityFee: "0.000009 SOL",
  platformFee: "0.41 USDC · 10 bps on value",
  method: "route(RoutePlan plan, u64 in_amount, u64 quoted_out_amount, …)",
  calldata: "e517cb977ae3ad2a010000000000000000000000000000000000000000000000000000000000000094357700…",
  transfers: [
    "2.5 wSOL  session wallet → Orca Whirlpool (SOL/USDC)",
    "412.34 USDC  Orca Whirlpool → session wallet",
  ],
  thread: "thread_af92c1",
  intent: "hidden",
  externalTxId: "ext_9928dd10",
  explorer: "https://solscan.io/tx/5UfDuX…",
};
ROWS.splice(3, 0, SVM_TX);

const STATUS_CHIP: Record<TxFixture["status"], string> = {
  confirmed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
  submitted: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  failed: "bg-red-500/10 text-red-500 border-red-500/30",
  created: "bg-surface-subtle text-dim border-border",
};

function short(value: string, chars = 4) {
  return value.length <= chars * 2 + 2
    ? value
    : `${value.slice(0, chars + 2)}…${value.slice(-chars)}`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-1.5 sm:flex-row sm:gap-3">
      <dt className="text-dim w-44 shrink-0 text-xs sm:pt-0.5">{label}</dt>
      <dd className="min-w-0 text-sm">{children}</dd>
    </div>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-xs break-all">{children}</span>;
}

function CopyBtn() {
  return (
    <button type="button" className="text-dim hover:text-foreground ml-1.5 inline-flex align-middle">
      <Copy className="size-3" />
    </button>
  );
}

function StatusChip({ tx }: { tx: TxFixture }) {
  const label =
    tx.status === "confirmed"
      ? tx.family === "svm"
        ? `Finalized · slot ${tx.slot}`
        : `Success · ${tx.confirmations} confirmations`
      : tx.status === "submitted"
        ? `Pending · ${tx.confirmations ?? 0} confirmation${(tx.confirmations ?? 0) === 1 ? "" : "s"}`
        : tx.status === "failed"
          ? "Reverted"
          : "Awaiting signature";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs ${STATUS_CHIP[tx.status]}`}>{label}</span>
  );
}

function TxDetail({ tx }: { tx: TxFixture }) {
  return (
    <div className="bg-surface-subtle/50 grid gap-x-8 px-4 py-4 lg:grid-cols-[1fr_360px]">
      {/* Onchain facts — etherscan side */}
      <dl className="divide-border divide-y">
        <Field label={tx.family === "svm" ? "Signature" : "Transaction hash"}>
          {tx.hash ? (
            <>
              <Mono>{tx.hash}</Mono>
              <CopyBtn />
            </>
          ) : (
            <span className="text-dim text-sm">not yet submitted — awaiting wallet signature</span>
          )}
        </Field>
        <Field label="Status">
          <StatusChip tx={tx} />
          {tx.revertReason ? (
            <div className="mt-1.5 rounded-md border border-red-500/30 bg-red-500/5 px-2.5 py-1.5 text-xs text-red-500">
              {tx.revertReason}
            </div>
          ) : null}
        </Field>
        {tx.block || tx.slot ? (
          <Field label={tx.family === "svm" ? "Slot" : "Block"}>
            <Mono>{tx.block ?? tx.slot}</Mono>
            <span className="text-dim ml-2 text-xs">{tx.time}</span>
          </Field>
        ) : null}
        <Field label="From">
          <Mono>{tx.from}</Mono>
          <CopyBtn />
          <span className="text-dim ml-2 text-xs">({tx.fromLabel})</span>
        </Field>
        <Field label={tx.family === "svm" ? "Program" : "Interacted with (To)"}>
          <Mono>{tx.to}</Mono>
          <CopyBtn />
          <span className="text-dim ml-2 text-xs">({tx.toLabel})</span>
        </Field>
        {tx.transfers?.length ? (
          <Field label={tx.family === "svm" ? "Token transfers" : "ERC-20 transfers"}>
            <div className="space-y-1">
              {tx.transfers.map((transfer) => (
                <div key={transfer} className="font-mono text-xs">{transfer}</div>
              ))}
            </div>
          </Field>
        ) : null}
        <Field label="Value">
          <span className="font-medium">{tx.value}</span>
          {tx.valueUsd ? <span className="text-dim ml-2 text-xs">{tx.valueUsd}</span> : null}
        </Field>
        {tx.txFee ? (
          <Field label="Transaction fee">
            <span className="font-medium">{tx.txFee}</span>
            <span className="text-dim ml-2 text-xs">
              {tx.family === "svm"
                ? `${tx.computeUnits} CU of ${tx.computeLimit} · priority ${tx.priorityFee}`
                : `${tx.gasUsed} gas used of ${tx.gasLimit} (${tx.gasPct}) · ${tx.effGasPrice}`}
            </span>
          </Field>
        ) : null}
        {tx.platformFee ? (
          <Field label="Aomi platform fee">
            <span className="font-medium">{tx.platformFee}</span>
          </Field>
        ) : null}
        {tx.nonce != null && tx.family !== "svm" ? (
          <Field label="Nonce">
            <Mono>{tx.nonce}</Mono>
          </Field>
        ) : null}
        {tx.method ? (
          <Field label={tx.family === "svm" ? "Instruction" : "Method"}>
            <Mono>{tx.method}</Mono>
          </Field>
        ) : null}
        {tx.calldata ? (
          <Field label={tx.family === "svm" ? "Instruction data" : "Calldata"}>
            <div className="border-border bg-surface max-h-20 overflow-y-auto rounded-md border px-2.5 py-2">
              <Mono>{tx.calldata}</Mono>
            </div>
          </Field>
        ) : null}
      </dl>

      {/* Aomi context — what etherscan can't show */}
      <div className="mt-4 lg:mt-0">
        <div className="border-border bg-surface rounded-md border">
          <div className="border-border text-dim border-b px-3 py-2 text-xs font-medium uppercase">
            Agent context
          </div>
          <dl className="px-3 py-2">
            <Field label="App">
              <span className="font-medium">{tx.app}</span>
            </Field>
            <Field label="User intent">
              {/* Privacy ruling: intent-level content is never shown to builders. */}
              <span className="text-dim text-xs">hidden · user privacy</span>
            </Field>
            <Field label="Thread">
              <a href="#" className="text-foreground font-mono text-xs underline underline-offset-2">
                {tx.thread}
              </a>
              <span className="text-dim ml-2 text-xs">open chat →</span>
            </Field>
            <Field label="External tx id">
              <Mono>{tx.externalTxId}</Mono>
            </Field>
          </dl>
        </div>
        {tx.explorer ? (
          <a
            href={tx.explorer}
            target="_blank"
            rel="noreferrer"
            className="border-border bg-surface hover:bg-accent-hover mt-2 flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm"
          >
            View on {tx.family === "svm" ? "Solscan" : tx.chain === "Base" ? "Basescan" : "Etherscan"} <ExternalLink className="size-3.5" />
          </a>
        ) : null}
      </div>
    </div>
  );
}

const TX_APPS = ["goal-digger", "geckoterminal"];

export function TxTableMock({
  appFilter = null,
  onAppFilterChange,
  initialOpen = "tx-1",
}: {
  appFilter?: string | null;
  onAppFilterChange?: (app: string | null) => void;
  initialOpen?: string | null;
}) {
  const [open, setOpen] = useState<string | null>(initialOpen);
  const rows = ROWS.filter((tx) => !appFilter || tx.app === appFilter);
  return (
    <div className="space-y-3">
      <div className="border-border bg-surface-subtle flex flex-wrap items-center gap-2 rounded-md border px-3 py-2">
        <select
          value={appFilter ?? ""}
          onChange={(e) => onAppFilterChange?.(e.target.value || null)}
          className="border-border bg-surface text-foreground h-8 rounded-md border px-2 text-xs"
        >
          <option value="">All apps</option>
          {TX_APPS.map((app) => (
            <option key={app} value={app}>{app}</option>
          ))}
        </select>
        {appFilter ? (
          <button
            type="button"
            onClick={() => onAppFilterChange?.(null)}
            className="text-dim hover:text-foreground flex items-center gap-1 text-xs"
          >
            <X className="size-3" /> clear filter
          </button>
        ) : null}
        <span className="text-dim ml-auto text-xs">{rows.length} transactions</span>
      </div>
      <div className="border-border overflow-x-auto rounded-md border">
      <table className="divide-border min-w-full divide-y text-sm">
        <thead className="bg-surface-subtle text-dim text-left text-xs uppercase">
          <tr>
            <th className="w-8 px-3 py-2" aria-label="expand" />
            <th className="px-3 py-2">Time</th>
            <th className="px-3 py-2">App</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Chain</th>
            <th className="px-3 py-2">From</th>
            <th className="px-3 py-2">To</th>
            <th className="px-3 py-2">Value</th>
            <th className="px-3 py-2">Description</th>
            <th className="px-3 py-2">Hash</th>
          </tr>
        </thead>
        <tbody className="divide-border bg-surface divide-y">
          {rows.map((tx) => (
            <Fragment key={tx.id}>
              <tr
                onClick={() => setOpen(open === tx.id ? null : tx.id)}
                className="hover:bg-surface-subtle cursor-pointer"
              >
                <td className="text-dim px-3 py-2">
                  {open === tx.id ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                </td>
                <td className="text-dim whitespace-nowrap px-3 py-2">{tx.time}</td>
                <td className="px-3 py-2">{tx.app}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full border px-2 py-0.5 text-xs ${STATUS_CHIP[tx.status]}`}>
                    {tx.status}
                  </span>
                </td>
                <td className="px-3 py-2">{tx.chain}</td>
                <td className="max-w-36 truncate px-3 py-2 font-mono text-xs" title={tx.from}>
                  {short(tx.from)}
                </td>
                <td className="max-w-36 truncate px-3 py-2 font-mono text-xs" title={tx.to}>
                  {short(tx.to)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{tx.value}</td>
                <td className="max-w-56 truncate px-3 py-2 text-xs" title={tx.description}>
                  {tx.description}
                </td>
                <td className="max-w-36 truncate px-3 py-2 font-mono text-xs" title={tx.hash ?? ""}>
                  {tx.hash ? short(tx.hash) : "—"}
                </td>
              </tr>
              {open === tx.id ? (
                <tr>
                  <td colSpan={10} className="p-0">
                    <TxDetail tx={tx} />
                  </td>
                </tr>
              ) : null}
            </Fragment>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
