"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  Bot,
  ArrowUp,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  Coins,
  Fuel,
  History,
  LoaderCircle,
  MessageSquare,
  Moon,
  PanelRight,
  Plus,
  RotateCcw,
  Sun,
  Wallet,
  X,
} from "lucide-react";
import { AomiLogo } from "@/components/aomi-logo";
import { AomiMark } from "@/components/aomi-mark";
import { BaseIcon, ArbitrumIcon } from "@/components/icons/chains";
import { getSkillIcon } from "@/components/icons/skills";
import { transactionSemantic } from "@/components/activity-sidebar/presentation";
import "./transaction-layouts.css";

type Effect = { token: string; amount: string; direction: "in" | "out" };
type Tx = { name: string; kind: string; effects: Effect[]; note?: string };
type Batch = {
  id: string;
  name: string;
  chain: "Base" | "Arbitrum";
  txs: Tx[];
  gas: string;
  unknown?: boolean;
};
type Past = {
  id: string;
  name: string;
  chain: Batch["chain"];
  count: number;
  status: "signed" | "rejected";
  time: string;
  effects: Effect[];
};
type Scenario = {
  name: string;
  prompt: string;
  batches: Batch[];
  history: Past[];
  skills: string[];
  failed?: boolean;
};
const out = (token: string, amount: string): Effect => ({
  token,
  amount,
  direction: "out",
});
const incoming = (token: string, amount: string): Effect => ({
  token,
  amount,
  direction: "in",
});
const deposit: Batch = {
  id: "deposit",
  name: "Deposit to Aave",
  chain: "Base",
  gas: "226,855 units",
  txs: [
    {
      name: "Approve USDC for Aave",
      kind: "approval",
      effects: [],
      note: "Permission change · no token movement",
    },
    {
      name: "Supply USDC to Aave",
      kind: "deposit",
      effects: [out("USDC", "0.05"), incoming("aBasUSDC", "0.050012")],
    },
  ],
};
const transfer: Batch = {
  id: "transfer",
  name: "Send USDC",
  chain: "Base",
  gas: "44,831 units",
  txs: [
    { name: "Send USDC", kind: "transfer", effects: [out("USDC", "0.01")] },
  ],
};
const past: Past[] = [
  {
    id: "h1",
    name: "Swap ETH to USDC",
    chain: "Base",
    count: 2,
    status: "signed",
    time: "Earlier in this chat",
    effects: [out("ETH", "0.0001"), incoming("USDC", "0.28")],
  },
  {
    id: "h2",
    name: "Send USDC",
    chain: "Base",
    count: 1,
    status: "signed",
    time: "Earlier in this chat",
    effects: [out("USDC", "0.01")],
  },
  {
    id: "h3",
    name: "Swap USDC to USDT",
    chain: "Base",
    count: 2,
    status: "rejected",
    time: "Earlier in this chat",
    effects: [],
  },
];
const scenarios: Scenario[] = [
  {
    name: "1 transaction · no history",
    prompt: "Send 0.01 USDC on Base",
    batches: [transfer],
    history: [],
    skills: ["common_erc20"],
  },
  {
    name: "2 transactions · no history",
    prompt: "Deposit 0.05 USDC to Aave",
    batches: [deposit],
    history: [],
    skills: ["aave", "common_erc20"],
  },
  {
    name: "2 transactions + history",
    prompt: "Now deposit 0.05 USDC to Aave",
    batches: [deposit],
    history: past,
    skills: ["aave", "common_erc20"],
  },
  {
    name: "4 transactions · long labels",
    prompt: "Withdraw, swap, and deposit my funds",
    batches: [
      {
        id: "rebalance",
        name: "Rebalance into Aave",
        chain: "Base",
        gas: "482,510 units",
        txs: [
          {
            name: "Withdraw USDC from the Aave Base market",
            kind: "withdraw",
            effects: [out("aBasUSDC", "25"), incoming("USDC", "25.01")],
          },
          {
            name: "Approve LI.FI to swap the withdrawn USDC",
            kind: "approval",
            effects: [],
            note: "Permission change · no token movement",
          },
          {
            name: "Swap USDC to WETH through the selected LI.FI concentrated liquidity route",
            kind: "swap",
            effects: [out("USDC", "25.01"), incoming("WETH", "0.0084")],
          },
          {
            name: "Supply WETH to the Aave Base market",
            kind: "deposit",
            effects: [out("WETH", "0.0084"), incoming("aBasWETH", "0.0084")],
          },
        ],
      },
    ],
    history: past,
    skills: ["aave", "lifi_swap", "common_erc20"],
  },
  {
    name: "Simulation failed",
    prompt: "Try depositing 0.05 USDC to Aave",
    batches: [deposit],
    history: past.slice(0, 1),
    skills: ["aave", "common_erc20"],
    failed: true,
  },
  {
    name: "Two batches · two networks",
    prompt: "Send USDC on Base, then deposit USDC on Arbitrum",
    batches: [
      transfer,
      {
        ...deposit,
        id: "arbitrum",
        chain: "Arbitrum",
        name: "Deposit on Arbitrum",
        txs: deposit.txs.map((tx) => ({
          ...tx,
          effects: tx.effects.map((e) => ({
            ...e,
            token: e.token === "aBasUSDC" ? "aArbUSDC" : e.token,
          })),
        })),
      },
    ],
    history: past.slice(0, 2),
    skills: ["aave", "common_erc20"],
  },
  {
    name: "Undecoded contract call",
    prompt: "Prepare this contract call on Base",
    batches: [
      {
        id: "unknown",
        name: "Contract interaction",
        chain: "Base",
        gas: "Estimate unavailable",
        unknown: true,
        txs: [
          { name: "Interact with 0x82c1…fA09", kind: "contract", effects: [] },
        ],
      },
    ],
    history: [],
    skills: [],
  },
];
const designs = [
  {
    name: "Batch focus",
    hint: "One grouped sidebar. Wallet changes and signing slide in below the scrollable transactions after commit.",
  },
  {
    name: "Soft cards",
    hint: "Spaced transaction cards with a shared review area after commit. History stays collapsed above.",
  },
  {
    name: "Compact review",
    hint: "Lean transaction rows with the same shared review area after commit.",
  },
];
const SkillIcons = new Map(
  ["aave", "common_erc20", "lifi_swap"].map((id) => [
    id,
    getSkillIcon(id) ?? Coins,
  ]),
);

export function TransactionLayouts() {
  const [design, setDesign] = useState(0),
    [scenarioIndex, setScenario] = useState(2),
    [screen, setScreen] = useState("Laptop"),
    [dark, setDark] = useState(false),
    [phase, setPhase] = useState(2),
    [reset, setReset] = useState(0);
  return (
    <main className={`tl-root aui-root ${dark ? "dark" : "light"}`}>
      <header className="tl-heading">
        <AomiLogo />
        <div>
          <p>TRANSACTION REVIEW STUDIES</p>
          <h1>One place to review and sign.</h1>
        </div>
        <a href="/dev/activity-final">Previous mock</a>
        <button
          className="tl-icon"
          aria-label="Toggle mock theme"
          onClick={() => setDark(!dark)}
        >
          {dark ? <Sun /> : <Moon />}
        </button>
      </header>
      <div className="tl-designs" role="tablist" aria-label="Design direction">
        {designs.map((item, i) => (
          <button
            key={item.name}
            role="tab"
            aria-selected={design === i}
            onClick={() => setDesign(i)}
          >
            <span>0{i + 1}</span>
            {item.name}
          </button>
        ))}
      </div>
      <div className="tl-controls">
        <label>
          Scenario
          <select
            aria-label="Scenario"
            value={scenarioIndex}
            onChange={(e) => {
              setScenario(Number(e.target.value));
              setPhase(2);
            }}
          >
            {scenarios.map((s, i) => (
              <option key={s.name} value={i}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Screen
          <select
            aria-label="Screen"
            value={screen}
            onChange={(e) => setScreen(e.target.value)}
          >
            {["Laptop", "Short window", "Phone"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Preparation
          <select
            aria-label="Preparation"
            value={phase}
            onChange={(e) => setPhase(Number(e.target.value))}
          >
            <option value={0}>Staged</option>
            <option value={1}>Simulated</option>
            <option value={2}>Ready to sign</option>
          </select>
        </label>
        <button className="tl-reset" onClick={() => setReset(reset + 1)}>
          <RotateCcw />
          Reset
        </button>
        <span>Interactive mock · no wallet connection</span>
      </div>
      <p className="tl-direction-note">{designs[design].hint}</p>
      <Preview
        key={`${scenarioIndex}:${reset}`}
        scenario={scenarios[scenarioIndex]}
        design={design}
        screen={screen}
        phase={phase}
      />
      <p className="tl-footnote">
        Try all three directions with the same scenario. Open history, expand
        wallet changes, or use the mock signing flow. “Signed” records the
        wallet result; chain confirmation is separate.
      </p>
    </main>
  );
}

function Preview({
  scenario,
  design,
  screen,
  phase,
}: {
  scenario: Scenario;
  design: number;
  screen: string;
  phase: number;
}) {
  const [history, setHistory] = useState(scenario.history),
    [index, setIndex] = useState(0),
    [wallet, setWallet] = useState(false),
    [open, setOpen] = useState(true),
    [mobilePane, setMobilePane] = useState("transactions"),
    [notice, setNotice] = useState("");
  const batch = scenario.batches[index];
  const signing = Boolean(batch && phase === 2 && !scenario.failed);
  const expanded = signing || open;
  const reducedMotion = useReducedMotion();
  function finish(status: Past["status"]) {
    if (!batch) return;
    setHistory([
      {
        id: `signed-${index}`,
        name: batch.name,
        chain: batch.chain,
        count: batch.txs.length,
        status,
        time: "Just now",
        effects: status === "signed" ? batchEffects(batch) : [],
      },
      ...history,
    ]);
    setIndex(index + 1);
    setWallet(false);
    setNotice(
      status === "signed"
        ? `${batch.txs.length} transaction${batch.txs.length === 1 ? "" : "s"} signed`
        : `${batch.name} rejected`,
    );
  }
  return (
    <div
      className={`tl-preview tl-screen-${screen.toLowerCase().replaceAll(" ", "-")}`}
    >
      <div className="tl-appbar">
        <AomiLogo />
        <span>CHAT</span>
        <span className="tl-appbar-end">
          <BaseIcon /> Base <span className="tl-dot">·</span> 0x2858…7a7d
        </span>
      </div>
      <div className="tl-mobile-tabs">
        <button
          aria-pressed={mobilePane === "chat"}
          onClick={() => setMobilePane("chat")}
        >
          <MessageSquare />
          Chat
        </button>
        <button
          aria-pressed={mobilePane === "transactions"}
          onClick={() => setMobilePane("transactions")}
        >
          <PanelRight />
          Transactions {batch?.txs.length ?? 0}
        </button>
      </div>
      <div className={`tl-workspace tl-mobile-${mobilePane}`}>
        <section className="tl-chat">
          <div className="tl-messages">
            <p className="tl-user">{scenario.prompt}</p>
            <div className="tl-response">
              <AomiMark />
              <div>
                <details className="tl-trace" open>
                  <summary>
                    <span className="tl-trace-orb" />
                    Working{" "}
                    <small>{batch?.txs.length === 1 ? 8 : 16} steps</small>
                    <ChevronDown />
                  </summary>
                  <div>
                    <p>
                      <Check />
                      Resolve contracts <span>Base · USDC</span>
                    </p>
                    <p>
                      <Check />
                      Stage transactions{" "}
                      <span>{batch?.txs.length ?? 2} prepared</span>
                    </p>
                    <p>
                      <Check />
                      Simulate batch{" "}
                      <span>
                        {scenario.failed
                          ? "Needs attention"
                          : "Balance changes available"}
                      </span>
                    </p>
                    <p>
                      <LoaderCircle />
                      Prepare wallet request
                    </p>
                  </div>
                </details>
                <p className="tl-response-text">
                  {scenario.failed
                    ? "The simulation reverted. I’ll need to revise this request before it can be signed."
                    : notice ||
                      "The transactions are prepared. You can review the wallet changes and sign in Transactions."}
                </p>
              </div>
            </div>
          </div>
          <div className="tl-composer">
            <span>Reply to Aomi…</span>
            <div>
              <Plus />
              <small>
                GPT-5.6 Luna <span>· Auto</span>
              </small>
              <button aria-label="Mock send message">
                <ArrowUp />
              </button>
            </div>
          </div>
        </section>
        <aside
          className={`tl-rail tl-design-${design}`}
          aria-label="Transaction layout preview"
        >
          <motion.div
            className="tl-group"
            layout
            transition={{ duration: reducedMotion ? 0 : 0.28, ease: "easeOut" }}
          >
            {scenario === scenarios[3] && (
              <details className="tl-skills tl-agents">
                <summary>
                  Subagents <small>2</small>
                  <ChevronDown />
                </summary>
                <div>
                  <span>
                    <Bot />
                    Find the best route
                  </span>
                  <span>
                    <Bot />
                    Check token permissions
                  </span>
                </div>
              </details>
            )}
            {scenario.skills.length > 0 && (
              <details className="tl-skills" open={screen !== "Short window"}>
                <summary>
                  Skills invoked <small>{scenario.skills.length}</small>
                  <ChevronDown />
                </summary>
                <div>
                  {scenario.skills.map((id) => {
                    const Icon = SkillIcons.get(id)!;
                    return (
                      <span key={id}>
                        <Icon />
                        {id === "aave"
                          ? "Aave"
                          : id === "common_erc20"
                            ? "ERC-20"
                            : "LI.FI"}
                      </span>
                    );
                  })}
                </div>
              </details>
            )}
            <section
              className={`tl-transactions ${!expanded ? "is-collapsed" : ""}`}
            >
              {signing ? (
                <div className="tl-section-title">
                  <span>
                    Transactions <small>{batch?.txs.length ?? 0}</small>
                  </span>
                </div>
              ) : (
                <button
                  className="tl-section-title"
                  aria-expanded={expanded}
                  onClick={() => setOpen(!open)}
                >
                  <span>
                    Transactions <small>{batch?.txs.length ?? 0}</small>
                  </span>
                  <ChevronDown className={expanded ? "rotated" : ""} />
                </button>
              )}
              {expanded && (
                <>
                  <div className="tl-scroll">
                    {history.length > 0 && (
                      <HistoryList history={history} compact={design === 2} />
                    )}
                    {notice && (
                      <p
                        className={`tl-notice ${history[0]?.status === "rejected" ? "is-rejected" : ""}`}
                        role="status"
                      >
                        {history[0]?.status === "rejected" ? <X /> : <Check />}
                        {notice}
                        {batch ? " · Next batch below" : ""}
                      </p>
                    )}
                    {batch ? (
                      <div className="tl-batch" key={batch.id}>
                        <div className="tl-current-txs">
                          {batch.txs.map((tx) => (
                            <div className="tl-tx" key={tx.name}>
                              <TxTitle tx={tx} chain={batch.chain} />
                              <Progress
                                phase={phase}
                                wallet={wallet}
                                failed={scenario.failed}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="tl-empty">
                        <Check />
                        <h2>No transactions waiting</h2>
                        <p>
                          Your signed and rejected batches are saved in this
                          chat’s history.
                        </p>
                      </div>
                    )}
                    {batch && scenario.batches.length > index + 1 && (
                      <div className="tl-queue">
                        <span>Next batch</span>
                        <strong>{scenario.batches[index + 1].name}</strong>
                        <Chain name={scenario.batches[index + 1].chain} />
                        <p>Reviewed and signed separately on its network.</p>
                      </div>
                    )}
                  </div>
                  {batch && signing && (
                    <footer className="tl-actions" key={batch.id}>
                      <div className="tl-review-effects">
                        <h3>Preview</h3>
                        {batch.unknown ? (
                          <p className="tl-permission">
                            Balance changes unavailable. Review the call in your
                            wallet.
                          </p>
                        ) : (
                          <Effects
                            effects={batchEffects(batch)}
                            chain={batch.chain}
                          />
                        )}
                      </div>
                      <div className="tl-metadata">
                        <span title={`Estimated gas · ${batch.gas}`}>
                          <Fuel />
                          {batch.gas}
                        </span>
                        <span title="Signing wallet · 0x28581d8065dA7e25710F25F9DD30F9d361757A7D">
                          <Wallet />
                          0x2858…7a7d
                        </span>
                      </div>
                      {wallet ? (
                        <div className="tl-wallet-mock">
                          <p>
                            <Wallet />
                            Wallet opened <span>Mock</span>
                          </p>
                          <div>
                            <button onClick={() => setWallet(false)}>
                              Back
                            </button>
                            <button
                              className="primary"
                              onClick={() => finish("signed")}
                            >
                              <Check />
                              Simulate signature
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="tl-action-buttons">
                            <button onClick={() => finish("rejected")}>
                              Reject
                            </button>
                            <button
                              className="primary"
                              disabled={Boolean(scenario.failed) || phase < 2}
                              onClick={() => setWallet(true)}
                            >
                              <Wallet />
                              Send to wallet
                            </button>
                          </div>
                        </>
                      )}
                    </footer>
                  )}
                </>
              )}
            </section>
          </motion.div>
        </aside>
      </div>
    </div>
  );
}
function Chain({ name }: { name: Batch["chain"] }) {
  return (
    <span className="tl-chain">
      {name === "Base" ? <BaseIcon /> : <ArbitrumIcon />}
      {name}
    </span>
  );
}
function TxTitle({ tx, chain }: { tx: Tx; chain: Batch["chain"] }) {
  const Icon = transactionSemantic(tx.name, tx.kind).Icon;
  return (
    <div className="tl-tx-title">
      <Icon />
      <span title={tx.name}>{tx.name}</span>
      <Chain name={chain} />
    </div>
  );
}
function Progress({
  phase,
  wallet = false,
  failed = false,
  finished = false,
  rejected = false,
}: {
  phase: number;
  wallet?: boolean;
  failed?: boolean;
  finished?: boolean;
  rejected?: boolean;
}) {
  return (
    <div className="tl-progress">
      {["Stage", "Simulate", "Commit", "Signed"].map((s, i) => (
        <div
          key={s}
          className={`${i <= phase || finished ? "done" : ""} ${!finished && !rejected && !failed && i === (wallet ? 3 : phase) ? "active" : ""} ${(failed && i === 1) || (rejected && i === 3) ? "failed" : ""}`}
        >
          <i />
          <span>{s}</span>
        </div>
      ))}
    </div>
  );
}
function Effects({
  effects,
  chain,
  small = false,
}: {
  effects: Effect[];
  chain: Batch["chain"];
  small?: boolean;
}) {
  return (
    <div className={`tl-effects ${small ? "small" : ""}`}>
      {effects.map((e, i) => (
        <div className="tl-effect" key={`${e.token}-${i}`}>
          <span className={`tl-token ${e.direction}`}>
            <Coins />
            {e.direction === "in" ? (
              <ArrowDownLeft className="direction" />
            ) : (
              <ArrowUpRight className="direction" />
            )}
          </span>
          <span className="tl-token-label">
            {e.token}
            {!small && <small>{chain}</small>}
          </span>
          <strong className={e.direction}>
            {e.direction === "in" ? "+" : "−"}
            {e.amount}
          </strong>
        </div>
      ))}
    </div>
  );
}
function HistoryList({
  history,
  compact = false,
}: {
  history: Past[];
  compact?: boolean;
}) {
  return (
    <details className={`tl-history ${compact ? "compact" : ""}`}>
      <summary>
        <History />
        <span>Past transactions</span>
        <small>{history.reduce((sum, h) => sum + h.count, 0)}</small>
        <ChevronDown />
      </summary>
      <div>
        {history.map((h) => (
          <details key={h.id} className="tl-history-item">
            <summary>
              <span
                className={
                  h.status === "signed" ? "tl-signed-dot" : "tl-rejected-dot"
                }
              />
              <span title={h.name}>
                {h.name}
                <small>
                  {h.count} transaction{h.count === 1 ? "" : "s"} · {h.chain}
                </small>
              </span>
              <span className="tl-history-status">
                {h.status === "signed" ? "Signed" : "Rejected"}
              </span>
            </summary>
            <p>{h.time}</p>
            <Progress
              phase={2}
              finished={h.status === "signed"}
              rejected={h.status === "rejected"}
            />
            {h.effects.length > 0 && (
              <Effects effects={h.effects} chain={h.chain} small />
            )}
          </details>
        ))}
      </div>
    </details>
  );
}

function batchEffects(batch: Batch): Effect[] {
  const totals = new Map<string, number>();
  for (const effect of batch.txs.flatMap((tx) => tx.effects))
    totals.set(
      effect.token,
      (totals.get(effect.token) ?? 0) +
        Number(effect.amount) * (effect.direction === "out" ? -1 : 1),
    );
  return [...totals]
    .filter(([, amount]) => Math.abs(amount) > 1e-12)
    .map(([token, amount]) => ({
      token,
      amount: String(Number(Math.abs(amount).toFixed(12))),
      direction: amount < 0 ? "out" : "in",
    }));
}
