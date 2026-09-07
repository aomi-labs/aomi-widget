"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeftRight,
  ArrowUp,
  Check,
  Coins,
  Fuel,
  FileSignature,
  Layers3,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  LoaderCircle,
  Moon,
  Play,
  Plus,
  ShieldCheck,
  Sun,
  Wallet,
  X,
} from "lucide-react";
import { AomiMark } from "@/components/aomi-mark";
import { AomiLogo } from "@/components/aomi-logo";
import { Activity, Mark, Trace, scenarios } from "../activity-lab/activity-lab";
import "./final-activity-mock.css";

const stages = [
  "Staging",
  "Staged",
  "Simulating",
  "Simulated",
  "Committing",
  "Ready for approval",
  "Awaiting wallet",
  "Submitted",
  "Confirmed",
  "Rejected",
  "Simulation failed",
] as const;
type Stage = (typeof stages)[number];
const fixture = scenarios[0];
const titles = ["Approve USDT", "Swap USDT to USDC"];

// Same native ETH glyph and generic token treatment as runtime-tx-handler.
function AssetMark({
  native = false,
  incoming = false,
}: {
  native?: boolean;
  incoming?: boolean;
}) {
  return (
    <span className={`af-asset-mark ${incoming ? "incoming" : "outgoing"}`}>
      {native ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
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
      ) : (
        <Coins />
      )}
      <span>{incoming ? <ArrowDownLeft /> : <ArrowUpRight />}</span>
    </span>
  );
}

function TransactionMark({
  kind,
}: {
  kind: "signature" | "contract" | "swap" | "approval";
}) {
  if (kind === "signature") return <FileSignature />;
  if (kind === "contract") return <Layers3 />;
  if (kind === "swap") return <ArrowLeftRight />;
  return <ShieldCheck />;
}

function Progress({ stage }: { stage: Stage }) {
  const completed =
    stage === "Rejected" ||
    (stages.indexOf(stage) >= 5 && stage !== "Simulation failed")
      ? 3
      : stage === "Simulation failed"
        ? 1
        : Math.floor((stages.indexOf(stage) + 1) / 2);
  const active = ["Staging", "Simulating", "Committing"].includes(stage)
    ? Math.floor(stages.indexOf(stage) / 2)
    : -1;
  return (
    <div
      className="af-progress"
      aria-label={`Transaction preparation: ${stage}`}
    >
      {["Stage", "Simulate", "Commit"].map((name, i) => (
        <span
          key={name}
          className={`${i < completed ? "complete" : ""} ${active === i ? "active" : ""} ${stage === "Simulation failed" && i === 1 ? "failed" : ""}`}
        >
          <i />
          <span>{name}</span>
        </span>
      ))}
    </div>
  );
}

export function FinalActivityMock() {
  const [stage, setStage] = useState<Stage>("Ready for approval");
  const [dark, setDark] = useState(false);
  const [replay, setReplay] = useState(false);
  const [opened, setOpened] = useState(true);
  const [selected, setSelected] = useState(-1);
  const [reviewData, setReviewData] = useState("balances");
  const [longTitle, setLongTitle] = useState(false);
  const canReview = [
    "Ready for approval",
    "Awaiting wallet",
    "Submitted",
    "Confirmed",
  ].includes(stage);
  const ready = stage === "Ready for approval";
  const tracePhase =
    stage === "Simulation failed"
      ? "Simulation failed"
      : stage === "Staging" || stage === "Staged"
        ? "Staged"
        : stage === "Simulating"
          ? "Simulating"
          : stage === "Confirmed"
            ? "Confirmed"
            : "Simulated";
  useEffect(() => {
    if (!replay || stages.indexOf(stage) >= 5) return;
    const timer = setTimeout(() => {
      setStage(stages[stages.indexOf(stage) + 1]);
      setOpened(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, [replay, stage]);
  const reset = (next: Stage) => {
    setStage(next);
    setReplay(false);
    setOpened(true);
  };
  const reject = () => {
    setStage("Rejected");
    setOpened(false);
  };
  const signature = reviewData === "signature";
  const reviewTitles = signature
    ? ["Sign message"]
    : reviewData === "unavailable"
      ? ["Contract interaction", "Contract interaction"]
      : reviewData === "native"
        ? ["Swap ETH to USDC"]
        : titles;
  const transactionKind = (i: number) =>
    signature
      ? ("signature" as const)
      : reviewData === "unavailable"
        ? ("contract" as const)
        : i || reviewData === "native"
          ? ("swap" as const)
          : ("approval" as const);
  const label = (i: number) =>
    i && longTitle
      ? "Swap USDT to USDC via LI.FI · Uniswap V3 concentrated liquidity route"
      : reviewTitles[i];
  const copy =
    stage === "Confirmed"
      ? [
          "Your swap is confirmed.",
          "Both transactions have been confirmed on Base. Your receipt is available on the right.",
        ]
      : stage === "Submitted"
        ? [
            "Submitted to Base.",
            "Your wallet has signed and broadcast the transactions. I’m waiting for the network receipt.",
          ]
        : stage === "Awaiting wallet"
          ? [
              "Waiting for your wallet.",
              "Review and sign in your wallet to submit the transactions. Nothing has been broadcast yet.",
            ]
          : stage === "Rejected"
            ? [
                "I’ve stopped this transaction request.",
                "Nothing was submitted to the network. You can ask me for a different route or amount.",
              ]
            : stage === "Simulation failed"
              ? [
                  "The simulation didn’t pass.",
                  "The swap reverted because the minimum output was not met. I’ll need a fresh route before preparing a wallet request.",
                ]
              : ready
                ? [
                    "Your swap is ready for approval.",
                    "The batch has been simulated and committed for your review. Check the expected changes on the right, then send it to your wallet when you’re ready.",
                  ]
                : [
                    "I’m preparing your swap.",
                    "I’ll check the expected balance changes and prepare the wallet request. The review panel will open when the batch is ready for your approval.",
                  ];
  return (
    <main className={`al-root af-root ${dark ? "dark" : "light"}`}>
      <header className="af-header">
        <AomiLogo />
        <div>
          <span className="al-eyebrow">
            Final interaction study ·{" "}
            <a href="/dev/transaction-layouts">Unified transaction layouts →</a>
          </span>
          <h1>A clear path to approval.</h1>
        </div>
        <button
          className="al-icon-button"
          aria-label="Toggle mock theme"
          onClick={() => setDark(!dark)}
        >
          {dark ? <Sun /> : <Moon />}
        </button>
      </header>
      <div className="af-controls">
        <label>
          Preview state
          <select
            value={stage}
            onChange={(e) => reset(e.target.value as Stage)}
          >
            {stages.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <button
          className="al-secondary"
          onClick={() => {
            reset("Staging");
            setReplay(true);
          }}
        >
          <Play />
          Replay preparation
        </button>
        <label className="af-checkbox">
          <input
            type="checkbox"
            checked={longTitle}
            onChange={(e) => setLongTitle(e.target.checked)}
          />
          Long transaction name
        </label>
        <label>
          Review data
          <select
            value={reviewData}
            onChange={(e) => {
              setReviewData(e.target.value);
              setSelected(-1);
              reset("Ready for approval");
            }}
          >
            <option value="balances">Decoded balances</option>
            <option value="native">Native ETH + ERC-20</option>
            <option value="unavailable">No decoded data</option>
            <option value="signature">Signature request</option>
            <option value="warning">Partial decoding</option>
            <option value="failed">Failed simulation</option>
          </select>
        </label>
        <span>Mock only · no wallet connection or funds moved</span>
      </div>
      <div className="al-portal af-portal">
        <div className="al-workspace">
          <div className="al-portal-top">
            <span>
              Swap USDT to USDC <ChevronDown />
            </span>
            <span>
              <Mark chain={8453} />
              Base <ChevronDown />
            </span>
          </div>
          <div className="al-conversation-layout">
            <div className="al-chat">
              <div className="al-user-message">
                Swap 1,250 USDT to USDC on Base
              </div>
              <div className="al-assistant">
                <AomiMark className="al-aomi-mark" />
                <div className="al-answer-content">
                  <Trace variant={0} scenario={fixture} phase={tracePhase} />
                  <div className="al-answer" aria-live="polite">
                    <h3>
                      {signature
                        ? stage === "Confirmed"
                          ? "Your message is signed."
                          : stage === "Rejected"
                            ? "Signature request rejected."
                            : "Review the message in your wallet."
                        : copy[0]}
                    </h3>
                    <p>
                      {signature
                        ? "This signature request does not submit an onchain transaction."
                        : copy[1]}
                    </p>
                  </div>
                  {canReview && !opened && (
                    <button
                      className="al-answer-link"
                      onClick={() => setOpened(true)}
                    >
                      Open transaction{" "}
                      {stage === "Confirmed" ? "receipt" : "review"}
                      <ChevronRight />
                    </button>
                  )}
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
                Open timeline · compact activity · review after commit
              </span>
            </div>
            <aside className="al-right">
              <Activity
                variant={0}
                scenario={{ ...fixture, txs: reviewTitles.length }}
                phase={tracePhase}
                approvalConfirmed={false}
                selected={selected}
                select={setSelected}
                transactionRows={
                  <>
                    {reviewTitles.map((_, i) => (
                      <button
                        key={i}
                        className={`af-tx ${selected === i && canReview ? "selected" : ""}`}
                        aria-label={`${label(i)} on Base. ${stage}${canReview ? ". Open review" : ""}`}
                        aria-disabled={!canReview}
                        onClick={() => {
                          if (canReview) {
                            setSelected(i);
                            setOpened(true);
                          }
                        }}
                      >
                        <div className="af-tx-title">
                          <TransactionMark kind={transactionKind(i)} />
                          <span title={label(i)}>{label(i)}</span>
                          <span className="af-chain">
                            <Mark chain={8453} />
                            Base
                          </span>
                          {canReview && <ChevronRight />}
                        </div>
                        <Progress stage={stage} />
                      </button>
                    ))}
                    {stage === "Simulation failed" ? (
                      <div className="af-inline-status af-warning">
                        <X />
                        Simulation failed · nothing submitted
                      </div>
                    ) : stage === "Rejected" ? (
                      <div className="af-inline-status">
                        <X />
                        Request rejected · nothing submitted
                      </div>
                    ) : stage === "Awaiting wallet" || stage === "Submitted" ? (
                      <div className="af-inline-status">
                        <LoaderCircle className="al-spin" />
                        {stage === "Submitted"
                          ? "Submitted · awaiting confirmation"
                          : "Waiting for wallet signature"}
                      </div>
                    ) : stage === "Confirmed" ? (
                      <div className="af-inline-status good">
                        {signature ? "Message signed" : "Confirmed on Base"}
                      </div>
                    ) : null}
                  </>
                }
              />
              {canReview && opened && (
                <section
                  className="al-simulation af-review al-enter"
                  aria-label="Transaction review"
                >
                  <header>
                    <Wallet className="af-review-icon" />
                    <div>
                      <h2>
                        {stage === "Confirmed"
                          ? signature
                            ? "Signature complete"
                            : "Transaction receipt"
                          : "Wallet impact"}
                      </h2>
                      <p>
                        {signature
                          ? "Signature request"
                          : `${reviewTitles.length} transactions`}{" "}
                        · Base
                      </p>
                    </div>
                    <button
                      className="al-icon-button"
                      aria-label="Close transaction review"
                      onClick={() => setOpened(false)}
                    >
                      <X />
                    </button>
                  </header>
                  {(reviewData === "warning" || reviewData === "failed") && (
                    <div className="af-review-warning" role="status">
                      {reviewData === "failed"
                        ? "Simulation failed. Review the error before continuing."
                        : "Some effects could not be decoded. Review the transaction details."}
                    </div>
                  )}
                  <div className="af-review-body">
                    <section className="af-impact" aria-label="Wallet changes">
                      <h3>{signature ? "Message" : "Balance changes"}</h3>
                      {signature ? (
                        <p className="af-empty">
                          Sign in to the application. This request does not
                          submit a transaction or transfer assets.
                        </p>
                      ) : reviewData === "unavailable" ? (
                        <p className="af-empty">
                          No decoded balance changes available. Review the
                          destination, value, and call data below.
                        </p>
                      ) : reviewData === "failed" ? (
                        <p className="af-empty">
                          Balance changes are unavailable because the
                          transaction reverted.
                        </p>
                      ) : (
                        <div className="af-asset-list">
                          <div>
                            <AssetMark native={reviewData === "native"} />
                            <span>
                              {reviewData === "native" ? "ETH" : "USDT"}
                              <small className="af-balance-chain">
                                <Mark chain={8453} />
                                Base
                              </small>
                            </span>
                            <strong className="af-outgoing-amount">
                              {reviewData === "native" ? "−0.5" : "−1,250"}
                            </strong>
                          </div>
                          <div>
                            <AssetMark incoming />
                            <span>
                              USDC
                              <small className="af-balance-chain">
                                <Mark chain={8453} />
                                Base
                              </small>
                            </span>
                            <strong className="good">+1,248.62</strong>
                          </div>
                        </div>
                      )}
                    </section>
                    <section className="af-review-transactions">
                      <h3>
                        {signature ? "Request details" : "Transactions"}
                        <span>{reviewTitles.length}</span>
                      </h3>
                      {reviewTitles.map((_, i) => (
                        <details
                          key={`${reviewData}-${i}`}
                          className="af-review-transaction"
                          open={selected === i || signature}
                        >
                          <summary>
                            <span className="af-operation-icon">
                              <TransactionMark kind={transactionKind(i)} />
                            </span>
                            <span className="af-operation-copy">
                              <strong title={label(i)}>{label(i)}</strong>
                              <small>
                                {signature
                                  ? "Message signature"
                                  : `${i + 1} of ${reviewTitles.length} · To ${i || reviewData === "native" ? "0x1231…4EaE" : "0xfde4…9bb2"}`}
                              </small>
                            </span>
                            <ChevronDown />
                          </summary>
                          <dl>
                            <dt>Request</dt>
                            <dd className="af-full-name">{label(i)}</dd>
                            <dt>{signature ? "Domain" : "To"}</dt>
                            <dd>
                              {signature
                                ? "app.example.com · illustrative"
                                : i || reviewData === "native"
                                  ? "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE"
                                  : "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2"}
                            </dd>
                            <dt>Network</dt>
                            <dd>Base · 8453</dd>
                            <dt>{signature ? "Message" : "Native value"}</dt>
                            <dd>
                              {signature
                                ? "Sign in to the application. Nonce: mock-1234."
                                : reviewData === "native"
                                  ? "0.5 ETH"
                                  : "0 ETH"}
                            </dd>
                            {!signature && (
                              <>
                                <dt>Call data</dt>
                                <dd>
                                  {i || reviewData === "native"
                                    ? "0x4630a0d8…"
                                    : "0x095ea7b3…"}
                                </dd>
                                <dt>Estimated gas</dt>
                                <dd>
                                  {reviewData === "unavailable" ||
                                  reviewData === "failed"
                                    ? "Unavailable"
                                    : i || reviewData === "native"
                                      ? "184,920 units"
                                      : "46,210 units"}
                                </dd>
                              </>
                            )}
                            {reviewData === "failed" && i === 1 && (
                              <>
                                <dt>Error</dt>
                                <dd>
                                  Execution reverted · minimum output not met
                                </dd>
                              </>
                            )}
                          </dl>
                        </details>
                      ))}
                    </section>
                    <div className="af-review-metadata">
                      <span>
                        <Wallet />
                        Signing wallet
                      </span>
                      <span>0x71C7…976F</span>
                    </div>
                    <div className="af-review-metadata">
                      <span>
                        <Fuel />
                        {signature ? "Network fee" : "Estimated gas"}
                      </span>
                      <span>
                        {signature
                          ? "None"
                          : reviewData === "unavailable" ||
                              reviewData === "failed"
                            ? "Unavailable"
                            : reviewData === "native"
                              ? "184,920 units"
                              : "231,130 units"}
                      </span>
                    </div>
                  </div>
                  <footer>
                    {ready ? (
                      <>
                        <div className="af-approval-actions">
                          <button className="af-reject" onClick={reject}>
                            Reject
                          </button>
                          <button
                            className="al-primary"
                            disabled={reviewData === "failed"}
                            onClick={() => setStage("Awaiting wallet")}
                          >
                            <Wallet />
                            {signature ? "Sign in wallet" : "Send to wallet"}
                          </button>
                        </div>
                      </>
                    ) : stage === "Awaiting wallet" ? (
                      <div className="af-wallet-state">
                        <LoaderCircle className="al-spin" />
                        <strong>Continue in your wallet</strong>
                        <p>Nothing has been submitted yet.</p>
                        <button
                          className="al-primary"
                          onClick={() =>
                            setStage(signature ? "Confirmed" : "Submitted")
                          }
                        >
                          <Wallet />
                          {signature
                            ? "Mock wallet: sign message"
                            : "Mock wallet: sign & submit"}
                        </button>
                        <button className="af-wallet-decline" onClick={reject}>
                          Mock wallet: decline
                        </button>
                      </div>
                    ) : stage === "Submitted" ? (
                      <div className="af-wallet-state">
                        <LoaderCircle className="al-spin" />
                        <strong>Waiting for confirmation</strong>
                        <p>Signed and submitted to Base.</p>
                        <button
                          className="al-secondary"
                          onClick={() => setStage("Confirmed")}
                        >
                          Mock receipt: confirm
                        </button>
                      </div>
                    ) : (
                      <div className="al-complete">
                        <Check />
                        {signature ? "Message signed" : "Confirmed on Base"}
                        <small>Illustrative receipt · no funds moved</small>
                      </div>
                    )}
                  </footer>
                </section>
              )}
              {!canReview && stage !== "Rejected" && (
                <p className="af-review-hint">
                  {stage === "Simulation failed"
                    ? "A new successful simulation is needed before commit and review."
                    : "The review panel opens after commit, when the wallet request is ready."}
                </p>
              )}
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
