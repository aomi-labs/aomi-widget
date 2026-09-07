"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  ArrowUpRight,
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock3,
  Copy,
  FileCheck2,
  FlaskConical,
  Layers3,
  Library,
  LoaderCircle,
  Moon,
  MoreHorizontal,
  PanelLeft,
  Play,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  Wallet,
  X,
} from "lucide-react";
import { getChainIcon, getSkillIcon } from "@/components/icons";
import { AomiMark } from "@/components/aomi-mark";
import { AomiLogo } from "@/components/aomi-logo";
import "./activity-lab.css";

const directions = [
  {
    name: "Quiet continuity",
    note: "An open timeline, one activity card, and a balance-first review. Closest to the current Library and Settings.",
    trace: 0,
    rail: 0,
    sim: 0,
  },
  {
    name: "Soft compartments",
    note: "Separate cards give agents, skills, and transactions their own space. The review reads like a receipt.",
    trace: 2,
    rail: 1,
    sim: 1,
  },
  {
    name: "Compact ledger",
    note: "Tighter rows and aligned metadata make longer runs easy to scan. Review each operation in order.",
    trace: 1,
    rail: 2,
    sim: 2,
  },
  {
    name: "Conversation first",
    note: "A minimal working summary keeps the answer prominent. Compact activity opens into a deliberate review.",
    trace: 3,
    rail: 3,
    sim: 3,
  },
  {
    name: "Guided execution",
    note: "Work grouped into chapters, with a transaction ledger and an ordered approval flow.",
    trace: 2,
    rail: 2,
    sim: 2,
  },
  {
    name: "Airy workspace",
    note: "An unboxed trace and separated activity cards. Large balance changes anchor the approval panel.",
    trace: 0,
    rail: 1,
    sim: 0,
  },
  {
    name: "Focused review",
    note: "A compact trace and grouped activity keep the emphasis on the transaction receipt below.",
    trace: 1,
    rail: 0,
    sim: 1,
  },
  {
    name: "Progressive detail",
    note: "A quiet summary with independently expandable activity. A review checklist reveals technical details on demand.",
    trace: 3,
    rail: 1,
    sim: 3,
  },
];
const traceNames = [
  "Open timeline",
  "Compact ledger",
  "Chapter cards",
  "Minimal summary",
];
const railNames = [
  "Grouped card",
  "Separate cards",
  "Transaction ledger",
  "Compact activity",
];
const simNames = [
  "Balance first",
  "Transaction receipt",
  "Ordered steps",
  "Review checklist",
];
const phases = [
  "Staged",
  "Simulating",
  "Simulated",
  "Awaiting wallet",
  "Committed",
  "Confirmed",
  "Simulation failed",
  "Partially confirmed",
  "Quote expired",
  "Rejected",
] as const;
type Phase = (typeof phases)[number];
export const scenarios = [
  {
    name: "Swap · ready for review",
    prompt: "Swap 1,250 USDT to USDC on Base",
    chain: 8453,
    network: "Base",
    agents: 2,
    skills: ["common_erc20", "lifi_swap"],
    txs: 2,
    phase: "Simulated" as Phase,
    long: false,
  },
  {
    name: "Swap · staging live",
    prompt: "Find a route and swap my USDT to USDC",
    chain: 8453,
    network: "Base",
    agents: 2,
    skills: ["common_erc20", "lifi_swap"],
    txs: 2,
    phase: "Staged" as Phase,
    long: false,
  },
  {
    name: "Research · no transactions",
    prompt: "Compare USDC lending options on Base",
    chain: 8453,
    network: "Base",
    agents: 2,
    skills: [],
    txs: 0,
    phase: "Confirmed" as Phase,
    long: false,
  },
  {
    name: "Direct transfer · no agents",
    prompt: "Send 25 USDC to my savings wallet on Ethereum",
    chain: 1,
    network: "Ethereum",
    agents: 0,
    skills: ["common_erc20"],
    txs: 1,
    phase: "Simulated" as Phase,
    long: false,
  },
  {
    name: "Simulation · reverted",
    prompt: "Swap 1,250 USDT to USDC on Base",
    chain: 8453,
    network: "Base",
    agents: 1,
    skills: ["lifi_swap"],
    txs: 2,
    phase: "Simulation failed" as Phase,
    long: false,
  },
  {
    name: "Batch · partially confirmed",
    prompt: "Swap 1,250 USDT to USDC on Arbitrum",
    chain: 42161,
    network: "Arbitrum",
    agents: 2,
    skills: ["common_erc20", "lifi_swap"],
    txs: 2,
    phase: "Partially confirmed" as Phase,
    long: false,
  },
  {
    name: "Long labels · stale quote",
    prompt: "Swap USDT using the route with the lowest estimated fees",
    chain: 42161,
    network: "Arbitrum",
    agents: 2,
    skills: ["common_erc20", "lifi_swap"],
    txs: 2,
    phase: "Quote expired" as Phase,
    long: true,
  },
  {
    name: "Simple answer · empty activity",
    prompt: "What is a token allowance?",
    chain: 8453,
    network: "Base",
    agents: 0,
    skills: [],
    txs: 0,
    phase: "Confirmed" as Phase,
    long: false,
  },
];
type Scenario = (typeof scenarios)[number];
const skillLabels: Record<string, string> = {
  common_erc20: "ERC-20",
  lifi_swap: "LI.FI",
};

const chainMarks = Object.fromEntries(
  [1, 8453, 42161].map((id) => [id, getChainIcon(id) ?? Circle]),
);
const skillMarks = Object.fromEntries(
  ["common_erc20", "lifi_swap"].map((id) => [id, getSkillIcon(id) ?? Sparkles]),
);
export function Mark({ chain }: { chain: number }) {
  const Icon = chainMarks[chain] ?? Circle;
  return <Icon className="al-icon" aria-hidden="true" />;
}
function SkillMark({ id }: { id: string }) {
  const Icon = skillMarks[id] ?? Sparkles;
  return <Icon className="al-icon" aria-hidden="true" />;
}
function Chip({ children, tone = "" }: { children: ReactNode; tone?: string }) {
  return <span className={`al-chip ${tone}`}>{children}</span>;
}
function Status({ phase }: { phase: string }) {
  const bad = /failed|expired|Rejected|Partially/.test(phase);
  const busy = /Simulating|Awaiting|Committed|Running/.test(phase);
  const Icon = bad
    ? Circle
    : busy
      ? LoaderCircle
      : phase === "Staged"
        ? Clock3
        : Check;
  return (
    <span
      className={`al-status ${bad ? "warn" : busy ? "blue" : phase === "Staged" ? "" : "good"}`}
    >
      <Icon className={busy ? "al-spin" : ""} />
      {phase}
    </span>
  );
}
function Section({
  title,
  count,
  children,
  compact = false,
}: {
  title: string;
  count: number;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <details className="al-section" open={!compact}>
      <summary>
        <span>{title}</span>
        <span className="al-count">{count}</span>
        <ChevronDown />
      </summary>
      <div className="al-section-body">{children}</div>
    </details>
  );
}

export function Trace({
  variant,
  scenario,
  phase,
}: {
  variant: number;
  scenario: Scenario;
  phase: Phase;
}) {
  const [expanded, setExpanded] = useState(true);
  const [all, setAll] = useState(false);
  const busy = phase === "Staged" || phase === "Simulating";
  const steps = scenario.txs
    ? [
        {
          icon: Wallet,
          title: "Checked wallet balance",
          detail:
            scenario.txs === 1 ? "125 USDC available" : "1,250 USDT available",
          chip: scenario.network,
        },
        {
          icon: ArrowLeftRight,
          title:
            scenario.txs === 1
              ? "Prepared USDC transfer"
              : "Compared swap routes",
          detail:
            scenario.txs === 1
              ? "Savings wallet · 25 USDC"
              : "LI.FI · best estimated return",
          chip: scenario.txs === 1 ? "25 USDC" : "3 routes",
        },
        {
          icon: Layers3,
          title: `Staged ${scenario.txs} ${scenario.txs === 1 ? "transaction" : "transactions"}`,
          detail:
            scenario.txs === 1
              ? "Transfer USDC"
              : "Approve USDT → Swap USDT to USDC",
          chip: scenario.network,
        },
        {
          icon: FlaskConical,
          title:
            phase === "Simulation failed"
              ? "Simulation reverted"
              : phase === "Staged"
                ? "Ready to simulate"
                : busy
                  ? "Simulating balance changes"
                  : "Simulated balance changes",
          detail:
            phase === "Simulation failed"
              ? "Swap reverted · minimum output not met"
              : "Review the result in the transaction panel",
          chip:
            phase === "Staged"
              ? "Queued"
              : busy
                ? "In progress"
                : phase === "Simulation failed"
                  ? "Needs attention"
                  : "Complete",
        },
      ]
    : [
        {
          icon: Search,
          title: scenario.agents
            ? "Compared lending markets"
            : "Explained token allowances",
          detail: scenario.agents
            ? "Aave and Morpho · Base"
            : "No wallet actions needed",
          chip: scenario.agents ? "2 sources" : "Complete",
        },
      ];
  return (
    <div className={`al-trace trace-${variant}`}>
      <button
        className="al-trace-heading"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        {busy ? (
          <LoaderCircle className="al-spin blue" />
        ) : (
          <Check className="good" />
        )}
        <strong>{busy ? "Working on it" : "Worked it out"}</strong>
        <span className="al-muted">
          {steps.length + 2 + (scenario.skills.length ? 1 : 0)} steps ·{" "}
          {busy ? "now" : "18s"}
        </span>
        <ChevronDown className={expanded ? "" : "al-rotate"} />
      </button>
      {expanded && (
        <div className="al-trace-content al-enter">
          {variant === 3 && (
            <p className="al-muted al-trace-summary">
              {scenario.txs
                ? "Checked balances, found a route, and prepared your transactions."
                : "Finished the research and gathered the results."}
            </p>
          )}
          {(variant === 3 && !all ? steps.slice(-1) : steps).map((step, i) => (
            <div className="al-step" key={step.title}>
              {variant === 2 && (
                <div className="al-chapter">
                  {
                    [
                      "01 · Understand",
                      "02 · Find the route",
                      "03 · Prepare",
                      "04 · Verify",
                    ][i]
                  }
                </div>
              )}
              <step.icon
                className={`al-step-icon ${i === 3 && busy ? "blue" : ""}`}
              />
              <div className="al-step-text">
                <span>{step.title}</span>
                <small>{step.detail}</small>
              </div>
              <Chip>{step.chip}</Chip>
            </div>
          ))}
          {scenario.agents > 0 && (
            <details className="al-agent-trace">
              <summary>
                <Bot className="pink" />
                <span>
                  {scenario.agents} subagents {busy ? "working" : "finished"}
                </span>
                <ChevronRight />
              </summary>
              <div className="al-agent-children">
                {Array.from({ length: scenario.agents }, (_, i) => (
                  <div key={i}>
                    <span className={i ? "pink" : "blue"}>●</span>
                    <span>
                      {scenario.txs
                        ? i
                          ? "Check token permissions"
                          : "Find the best route"
                        : i
                          ? "Research Morpho vaults"
                          : "Research Aave markets"}
                      <small>
                        {!scenario.txs
                          ? "Compared liquidity and protocol risk factors"
                          : i
                            ? "Exact allowance required · no unlimited approval"
                            : "Compared available routes and estimated fees"}
                      </small>
                    </span>
                    <Status phase={busy && !i ? "Running" : "Done"} />
                  </div>
                ))}
              </div>
            </details>
          )}
          {all && (
            <div className="al-extra al-enter">
              <p>
                <Check />{" "}
                {scenario.txs
                  ? "Read chain state"
                  : "Read protocol documentation"}{" "}
                <Chip>
                  <Mark chain={scenario.chain} />
                  {scenario.network}
                </Chip>
              </p>
              <p>
                <Check />{" "}
                {scenario.txs ? (
                  <>
                    Checked connected wallet <code>0x71C7…976F</code>
                  </>
                ) : (
                  "Compared public liquidity data"
                )}
              </p>
              {scenario.skills.length > 0 && (
                <p>
                  <Sparkles /> Invoked skills{" "}
                  {scenario.skills.map((id) => (
                    <Chip key={id}>
                      <SkillMark id={id} />
                      {skillLabels[id]}
                    </Chip>
                  ))}
                </p>
              )}
              <p className="al-muted">
                All steps shown for this illustrative run.
              </p>
            </div>
          )}
          <button className="al-text-button" onClick={() => setAll(!all)}>
            <MoreHorizontal />
            {all ? "Show less" : "Show all steps"}
          </button>
        </div>
      )}
    </div>
  );
}

export function Activity({
  transactionRows,
  approvalConfirmed,
  variant,
  scenario,
  phase,
  selected,
  select,
}: {
  variant: number;
  scenario: Scenario;
  phase: Phase;
  approvalConfirmed: boolean;
  selected: number;
  select: (n: number) => void;
  transactionRows?: ReactNode;
}) {
  if (!scenario.agents && !scenario.skills.length && !scenario.txs) return null;
  const txPhase = (i: number) =>
    approvalConfirmed && i === 0
      ? "Confirmed"
      : phase === "Partially confirmed"
        ? i === 0
          ? "Confirmed"
          : "Rejected"
        : phase === "Simulation failed" && i === 0
          ? "Simulated"
          : phase;
  return (
    <div className={`al-activity rail-${variant}`}>
      {variant === 2 && (
        <div className="al-activity-title">
          Session activity <span className="al-muted">This turn</span>
        </div>
      )}
      {scenario.agents > 0 && (
        <Section
          title="Subagents"
          count={scenario.agents}
          compact={variant === 3}
        >
          {Array.from({ length: scenario.agents }, (_, i) => (
            <details className="al-agent" key={i}>
              <summary>
                <Bot className={i ? "pink" : "blue"} />
                <span className="al-truncate">
                  {i
                    ? scenario.txs
                      ? "Check token permissions"
                      : "Research Morpho vaults"
                    : scenario.txs
                      ? "Find the best route"
                      : "Research lending markets"}
                </span>
                <Status phase={phase === "Staged" && !i ? "Running" : "Done"} />
              </summary>
              <div className="al-agent-detail">
                {!scenario.txs
                  ? "Compared public protocol liquidity and risk information on Base."
                  : i
                    ? "Checked allowance against the requested amount. Exact approval required."
                    : "Compared protocol routes, fees, and expected output."}
                <small>4 steps · {i ? "8" : "12"} seconds</small>
              </div>
            </details>
          ))}
        </Section>
      )}
      {scenario.skills.length > 0 && (
        <Section
          title="Skills invoked"
          count={scenario.skills.length}
          compact={variant === 3}
        >
          <div className="al-skills">
            {scenario.skills.map((id) => (
              <details key={id}>
                <summary>
                  <SkillMark id={id} />
                  {skillLabels[id]}
                  <ChevronRight />
                </summary>
                <p>
                  {id === "common_erc20"
                    ? "Balances, allowances, and token transfers."
                    : "Route discovery and swap preparation."}
                </p>
              </details>
            ))}
          </div>
        </Section>
      )}
      {scenario.txs > 0 && (
        <Section title="Transactions" count={scenario.txs}>
          {transactionRows ??
            Array.from({ length: scenario.txs }, (_, i) => (
              <button
                className={`al-tx ${selected === i ? "selected" : ""}`}
                onClick={() => select(i)}
                key={i}
              >
                <div className="al-tx-top">
                  {scenario.txs === 1 ? (
                    <ArrowUpRight />
                  ) : i ? (
                    <ArrowLeftRight />
                  ) : (
                    <ShieldCheck />
                  )}
                  <span
                    className="al-truncate"
                    title={
                      scenario.long && i
                        ? "Swap USDT to USDC via LI.FI · Uniswap V3 concentrated liquidity route on Arbitrum One"
                        : undefined
                    }
                  >
                    {scenario.txs === 1
                      ? "Send USDC"
                      : i
                        ? scenario.long
                          ? "Swap USDT to USDC via LI.FI · Uniswap V3 concentrated liquidity route on Arbitrum One"
                          : "Swap USDT to USDC"
                        : "Approve USDT"}
                  </span>
                  <ChevronRight />
                </div>
                <div className="al-tx-meta">
                  <Chip>
                    <Mark chain={scenario.chain} />
                    {scenario.network}
                  </Chip>
                  <span>
                    {scenario.txs === 1
                      ? "25 USDC"
                      : i
                        ? "1,250 USDT"
                        : "Exact amount"}
                  </span>
                </div>
                <Status phase={txPhase(i)} />
                {variant === 2 && (
                  <div className="al-mini-progress">
                    {["Stage", "Simulate", "Commit"].map((s, index) => (
                      <span
                        key={s}
                        className={
                          phases.indexOf(phase) >= index * 2 &&
                          phases.indexOf(phase) < 6
                            ? "filled"
                            : ""
                        }
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}
        </Section>
      )}
    </div>
  );
}

function Simulation({
  approvalConfirmed,
  variant,
  scenario,
  phase,
  setPhase,
  selected,
  close,
}: {
  variant: number;
  scenario: Scenario;
  phase: Phase;
  approvalConfirmed: boolean;
  setPhase: (phase: Phase) => void;
  selected: number;
  close: () => void;
}) {
  const failed = phase === "Simulation failed";
  const stale = phase === "Quote expired";
  const partial = phase === "Partially confirmed";
  const transfer = scenario.txs === 1;
  const ready = phase === "Simulated";
  const success = phase === "Confirmed";
  const pending = phase === "Staged" || phase === "Simulating";
  const rejected = phase === "Rejected";
  const reached = [
    true,
    !pending && !failed,
    phase === "Committed" || success || partial || approvalConfirmed,
  ];
  const action = pending
    ? phase === "Staged"
      ? "Simulate transactions"
      : "Simulating…"
    : failed || stale || partial || rejected
      ? "Refresh & simulate"
      : ready
        ? `Approve ${approvalConfirmed ? 1 : scenario.txs} ${transfer || approvalConfirmed ? "transaction" : "transactions"}`
        : phase === "Awaiting wallet"
          ? "Mock wallet: sign"
          : phase === "Committed"
            ? "Mock receipt: confirm"
            : "View simulated receipt";
  const advance = () =>
    setPhase(
      failed || stale || partial || rejected || phase === "Staged"
        ? "Simulating"
        : ready
          ? "Awaiting wallet"
          : phase === "Awaiting wallet"
            ? "Committed"
            : phase === "Committed"
              ? "Confirmed"
              : phase,
    );
  return (
    <section
      className={`al-simulation sim-${variant} al-enter`}
      aria-label="Transaction review"
    >
      <header>
        <div>
          <span className="al-eyebrow">
            {success ? "Transaction receipt" : "Transaction review"}
          </span>
          <h2>{transfer ? "Send USDC" : "USDT → USDC"}</h2>
        </div>
        <button
          className="al-icon-button"
          aria-label="Close transaction review"
          onClick={close}
        >
          <X />
        </button>
      </header>
      <div className="al-review-meta">
        <Chip>
          <Mark chain={scenario.chain} />
          {scenario.network}
        </Chip>
        <span>{transfer ? "Transfer" : "LI.FI"}</span>
        <span>·</span>
        <span>
          {scenario.txs} {transfer ? "transaction" : "transactions"}
        </span>
      </div>
      <div className="al-lifecycle" aria-label="Transaction lifecycle">
        {["Staged", "Simulated", "Committed"].map((s, i) => (
          <span key={s} className={reached[i] ? "reached" : ""}>
            <i>{reached[i] ? <Check /> : i + 1}</i>
            {s}
          </span>
        ))}
      </div>
      <div
        className={`al-sim-status ${failed || stale || partial || rejected ? "al-notice" : ""}`}
        aria-live="polite"
      >
        <Status phase={phase} />
        <p>
          {pending
            ? "Amounts and fees will appear after simulation."
            : failed
              ? "Swap reverted: minimum output not met. Nothing was submitted."
              : stale
                ? "The route expired. Refresh and simulate again before approval."
                : partial
                  ? "Approval confirmed. Swap was rejected. The allowance is still active; review the remaining swap."
                  : rejected
                    ? approvalConfirmed
                      ? "Swap request declined. The earlier approval remains confirmed."
                      : "Wallet request declined. No transactions were submitted."
                    : ready
                      ? "Expected changes below. Final amounts may vary."
                      : phase === "Awaiting wallet"
                        ? "Review and sign in your connected wallet."
                        : phase === "Committed"
                          ? "Submitted to the network. Waiting for a receipt."
                          : "Wallet execution and network confirmation are complete."}
        </p>
      </div>
      {!pending && !failed && (
        <>
          {variant === 3 && (
            <div className="al-checklist">
              <p>
                <ShieldCheck />
                {stale ? "Quote needs refreshing" : "Exact token allowance"}
              </p>
              <p>
                <Wallet />
                Connected wallet <code>0x71C7…976F</code>
              </p>
            </div>
          )}
          <div className="al-balances">
            <div>
              <span>{transfer ? "You send" : "You pay"}</span>
              <strong>
                −{transfer ? "25" : "1,250"}{" "}
                <em>{transfer ? "USDC" : "USDT"}</em>
              </strong>
              <small>{transfer ? "$25.00" : "$1,250.00"}</small>
            </div>
            <ArrowDown />
            <div>
              <span>
                {transfer
                  ? "Savings receives"
                  : success
                    ? "You received"
                    : "Expected to receive"}
              </span>
              <strong className="good">
                +{transfer ? "25" : "1,248.62"} <em>USDC</em>
              </strong>
              <small>
                {transfer ? "0x29F2…81bD" : "Minimum received 1,242.38 USDC"}
              </small>
            </div>
          </div>
          <div className="al-review-lines">
            <p>
              <span>Estimated network fee</span>
              <span>{scenario.chain === 1 ? "$0.84" : "$0.03"}</span>
            </p>
            <p>
              <span>Slippage limit</span>
              <span>{transfer ? "Not applicable" : "0.5%"}</span>
            </p>
            {!transfer && (
              <p>
                <span>Allowance</span>
                <span>1,250 USDT · exact</span>
              </p>
            )}
          </div>
        </>
      )}
      <details
        className="al-review-details"
        open={variant === 2 || failed || partial}
      >
        <summary>
          <span>
            {variant === 1 ? "Receipt details" : "Transaction details"}
          </span>
          <span className="al-muted">
            Viewing {selected + 1} of {scenario.txs}
          </span>
          <ChevronDown />
        </summary>
        <div>
          {Array.from({ length: scenario.txs }, (_, i) => (
            <div
              className={`al-operation ${selected === i ? "highlight" : ""}`}
              key={i}
            >
              <span className="al-operation-number">{i + 1}</span>
              <div>
                <strong>
                  {transfer
                    ? "Send USDC"
                    : i
                      ? "Swap USDT → USDC"
                      : "Approve USDT"}
                </strong>
                <small>
                  {transfer
                    ? "To savings · 0x29F2…81bD"
                    : i
                      ? "LI.FI router · 0x1231…4EaE"
                      : "Allow LI.FI to spend exactly 1,250 USDT"}
                </small>
                <Status
                  phase={
                    approvalConfirmed && i === 0
                      ? "Confirmed"
                      : partial
                        ? i
                          ? "Rejected"
                          : "Confirmed"
                        : failed
                          ? i
                            ? "Simulation failed"
                            : "Simulated"
                          : phase
                  }
                />
              </div>
            </div>
          ))}
          <dl>
            <dt>Wallet</dt>
            <dd>0x71C7656EC7ab88b098defB751B7401B5f6d8976F</dd>
            <dt>Chain</dt>
            <dd>
              {scenario.network} · {scenario.chain}
            </dd>
            <dt>Simulation block</dt>
            <dd>
              {pending
                ? "Not available yet"
                : "50,862,783 · illustrative snapshot"}
            </dd>
            {scenario.long && (
              <>
                <dt>Full transaction name</dt>
                <dd>
                  Swap USDT to USDC via LI.FI · Uniswap V3 concentrated
                  liquidity route on Arbitrum One
                </dd>
              </>
            )}
            <dt>Execution</dt>
            <dd>
              {transfer
                ? "Single transaction"
                : "Sequential · approval before swap"}
            </dd>
            {(success || partial || phase === "Committed") && (
              <>
                <dt>Transaction hash (mock)</dt>
                <dd>
                  0xa35b035869b5e39693625ab36d6cf20b42ecfc9e7f05f3260a8b037828e01c1
                </dd>
              </>
            )}
          </dl>
        </div>
      </details>
      <footer>
        {!success && (
          <>
            <button
              className="al-primary"
              disabled={phase === "Simulating"}
              onClick={advance}
            >
              {phase === "Simulating" ? (
                <LoaderCircle className="al-spin" />
              ) : ready ? (
                <Wallet />
              ) : (
                <ArrowUpRight />
              )}
              {action}
            </button>
            {phase === "Awaiting wallet" && (
              <button
                className="al-text-button"
                onClick={() => setPhase("Rejected")}
              >
                Mock wallet: reject
              </button>
            )}
            <small>
              {ready
                ? "Review here, then authorize in your wallet."
                : "Interactive mock · no real wallet request"}
            </small>
          </>
        )}
        {success && (
          <div className="al-complete">
            <Check />
            Confirmed on {scenario.network}
            <small>Illustrative receipt · no funds moved</small>
          </div>
        )}
      </footer>
    </section>
  );
}

export function ActivityLab() {
  const [direction, setDirection] = useState(0);
  const [focused, setFocused] = useState(false);
  const [trace, setTrace] = useState(0);
  const [rail, setRail] = useState(0);
  const [sim, setSim] = useState(0);
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("Simulated");
  const [selected, setSelected] = useState(1);
  const [review, setReview] = useState(true);
  const [dark, setDark] = useState(false);
  const [replay, setReplay] = useState(false);
  const [copied, setCopied] = useState(false);
  const [approvalConfirmed, setApprovalConfirmed] = useState(false);
  const changePhase = (next: Phase) => {
    if (next === "Partially confirmed") setApprovalConfirmed(true);
    setPhase(next);
  };
  const scenario = scenarios[scenarioIndex];
  useEffect(() => {
    if (phase !== "Simulating" && !(replay && phase === "Staged")) return;
    const timer = setTimeout(
      () => setPhase(phase === "Staged" ? "Simulating" : "Simulated"),
      1800,
    );
    return () => clearTimeout(timer);
  }, [phase, replay]);
  const choose = (index: number) => {
    const d = directions[index];
    setDirection(index);
    setTrace(d.trace);
    setRail(d.rail);
    setSim(d.sim);
  };
  const changeScenario = (index: number) => {
    setApprovalConfirmed(scenarios[index].phase === "Partially confirmed");
    setScenarioIndex(index);
    setPhase(scenarios[index].phase);
    setSelected(Math.max(0, scenarios[index].txs - 1));
    setReview(true);
    setReplay(false);
  };
  const hasActivity = scenario.agents || scenario.skills.length || scenario.txs;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        `Aomi activity mock picks: trace ${trace + 1} (${traceNames[trace]}), activity ${rail + 1} (${railNames[rail]}), simulation ${sim + 1} (${simNames[sim]}).`,
      );
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <main
      className={`al-root ${dark ? "dark" : "light"} ${focused ? "al-focused" : ""}`}
    >
      {focused && (
        <div className="al-focus-bar">
          <button className="al-secondary" onClick={() => setFocused(false)}>
            Back to gallery
          </button>
          <label>
            Direction
            <select
              value={direction}
              onChange={(e) => choose(Number(e.target.value))}
            >
              {directions.map((d, i) => (
                <option key={d.name} value={i}>
                  {String(i + 1).padStart(2, "0")} · {d.name}
                </option>
              ))}
            </select>
          </label>
          <span className="al-muted">Interactive mock · no funds moved</span>
        </div>
      )}
      <div className="al-lab-head">
        <div>
          <span className="al-eyebrow">Aomi · interaction studies / 01</span>
          <h1>A little more clarity.</h1>
          <p>
            Eight directions for the working trace, activity, and transaction
            review.
          </p>
        </div>
        <div className="al-lab-actions">
          <button className="al-secondary" onClick={() => setFocused(true)}>
            Focus preview
          </button>
          <span className="al-mock-label">Mock data only</span>
          <button
            className="al-icon-button"
            aria-label="Toggle mock theme"
            onClick={() => setDark(!dark)}
          >
            {dark ? <Sun /> : <Moon />}
          </button>
        </div>
      </div>
      <nav className="al-directions" aria-label="Design directions">
        {directions.map((d, i) => (
          <button
            key={d.name}
            aria-pressed={direction === i}
            onClick={() => choose(i)}
          >
            <span>{String(i + 1).padStart(2, "0")}</span>
            <strong>{d.name}</strong>
            <div className={`al-preview preview-${i}`}>
              <i />
              <div>
                <b />
                <b />
                <b />
              </div>
              <aside>
                <b />
                <b />
              </aside>
            </div>
          </button>
        ))}
      </nav>
      <div className="al-controls">
        <p>
          <strong>
            {String(direction + 1).padStart(2, "0")} /{" "}
            {directions[direction].name}
          </strong>
          <span>{directions[direction].note}</span>
        </p>
        <div className="al-mix">
          {[
            { label: "Trace", value: trace, names: traceNames, set: setTrace },
            { label: "Activity", value: rail, names: railNames, set: setRail },
            { label: "Simulation", value: sim, names: simNames, set: setSim },
          ].map((control) => (
            <label key={control.label}>
              {control.label}
              <select
                value={control.value}
                onChange={(e) => control.set(Number(e.target.value))}
              >
                {control.names.map((name, i) => (
                  <option key={name} value={i}>
                    {i + 1}. {name}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <button className="al-secondary" onClick={copy}>
            <Copy />
            {copied ? "Picks copied" : "Copy picks"}
          </button>
        </div>
      </div>
      <div className="al-scenario-controls">
        <label>
          Scenario
          <select
            value={scenarioIndex}
            onChange={(e) => changeScenario(Number(e.target.value))}
          >
            {scenarios.map((s, i) => (
              <option value={i} key={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        {scenario.txs > 0 && (
          <>
            <label>
              Lifecycle
              <select
                value={phase}
                onChange={(e) => {
                  changePhase(e.target.value as Phase);
                  setReplay(false);
                }}
              >
                {phases.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <button
              className="al-secondary"
              onClick={() => {
                setPhase("Staged");
                setReplay(true);
                setReview(true);
              }}
            >
              <Play />
              Replay staging
            </button>
          </>
        )}
        <span className="al-muted">
          Click rows to inspect · mix the parts above
        </span>
      </div>
      <div className="al-portal">
        <aside className="al-shell-nav">
          <div className="al-wordmark">
            <AomiLogo /> <PanelLeft />
          </div>
          <div className="al-nav-row">
            <Plus />
            New chat
          </div>
          <div className="al-nav-row">
            <Search />
            Search
          </div>
          <div className="al-nav-row">
            <Library />
            Library
          </div>
          <small>Recent</small>
          <div className="al-nav-current">
            {scenario.txs
              ? "A better route for my USDT"
              : "Understanding my wallet"}
          </div>
          <div className="al-nav-row al-muted">Portfolio overview</div>
          <div className="al-nav-row al-muted">Explore Base</div>
          <div className="al-nav-bottom">
            <Settings2 />
            Settings <span className="al-avatar">A</span>
          </div>
        </aside>
        <div className="al-workspace">
          <div className="al-portal-top">
            <span>
              Personal workspace <ChevronDown />
            </span>
            <span>
              <Mark chain={scenario.chain} />
              {scenario.network}
              <ChevronDown />
            </span>
          </div>
          <div
            className={`al-conversation-layout ${!hasActivity ? "no-activity" : ""}`}
          >
            <div className="al-chat">
              <div className="al-user-message">{scenario.prompt}</div>
              <div className="al-assistant">
                <AomiMark className="al-aomi-mark" />
                <div className="al-answer-content">
                  {!!hasActivity && (
                    <Trace
                      key={`${trace}-${scenarioIndex}`}
                      variant={trace}
                      scenario={scenario}
                      phase={phase}
                    />
                  )}
                  <div className="al-answer">
                    <h3>
                      {!scenario.txs
                        ? scenario.agents
                          ? "Two options worth a closer look."
                          : "An allowance is a spending permission."
                        : phase === "Confirmed"
                          ? "Your transaction is confirmed."
                          : phase === "Simulation failed"
                            ? "This route needs another look."
                            : phase === "Partially confirmed"
                              ? "The approval went through. The swap didn’t."
                              : phase === "Staged" || phase === "Simulating"
                                ? "I’m checking the expected outcome."
                                : phase === "Quote expired"
                                  ? "This quote needs refreshing."
                                  : phase === "Awaiting wallet"
                                    ? "Waiting for your wallet signature."
                                    : phase === "Committed"
                                      ? "Submitted. Waiting for confirmation."
                                      : phase === "Rejected"
                                        ? "The wallet request was declined."
                                        : "Your transactions are ready to review."}
                    </h3>
                    <p>
                      {!scenario.txs
                        ? scenario.agents
                          ? "Aave offers a shared lending pool; Morpho offers vaults with distinct risk profiles. I’ve compared how each works on Base."
                          : "It lets a contract move up to a specified amount of a token from your wallet. An exact allowance limits that permission to the amount you choose."
                        : phase === "Confirmed"
                          ? `The network confirmed execution on ${scenario.network}. You can inspect the receipt in the activity panel.`
                          : phase === "Simulation failed"
                            ? "The swap did not meet the minimum output in simulation. Refresh the route before continuing."
                            : phase === "Partially confirmed"
                              ? "Your token allowance remains active. Refresh the remaining swap to review it again."
                              : phase === "Quote expired"
                                ? "The previous estimate is out of date. Refresh the route and simulate again before approving."
                                : phase === "Committed"
                                  ? "The transactions have been submitted. The receipt will update after the network confirms them."
                                  : phase === "Rejected"
                                    ? "Nothing further will be submitted. You can refresh and review again when you’re ready."
                                    : "You can inspect the expected balance changes and each operation in the review panel. I’ll wait for your wallet approval before execution."}
                    </p>
                    {scenario.txs > 0 && (
                      <button
                        className="al-answer-link"
                        onClick={() => setReview(true)}
                      >
                        <FileCheck2 />
                        {phase === "Confirmed"
                          ? "View receipt"
                          : "Review transactions"}
                        <ArrowUpRight />
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="al-composer">
                <div>Ask Aomi anything…</div>
                <footer>
                  <span>
                    <Plus />
                    Auto <ChevronDown />
                    <span className="al-muted">GPT-5</span>
                  </span>
                  <span className="al-send">
                    <ArrowUp />
                  </span>
                </footer>
              </div>
              <span className="al-composer-note">
                Preview only · all amounts and outcomes are illustrative
              </span>
            </div>
            {!!hasActivity && (
              <aside className="al-right">
                <Activity
                  approvalConfirmed={approvalConfirmed}
                  variant={rail}
                  scenario={scenario}
                  phase={phase}
                  selected={selected}
                  select={(i) => {
                    setSelected(i);
                    setReview(true);
                  }}
                />
                {scenario.txs > 0 && review && (
                  <Simulation
                    approvalConfirmed={approvalConfirmed}
                    key={`${sim}-${scenarioIndex}`}
                    variant={sim}
                    scenario={scenario}
                    phase={phase}
                    setPhase={changePhase}
                    selected={selected}
                    close={() => setReview(false)}
                  />
                )}
              </aside>
            )}
          </div>
        </div>
      </div>
      <div className="al-lab-foot">
        <span>
          Pick each part independently. Example: Trace 1 + Activity 2 +
          Simulation 3.
        </span>
        <span>Motion: 220ms entry · subtle hover · reduced-motion support</span>
      </div>
    </main>
  );
}
