"use client";

import {
  ArrowRight,
  Blocks,
  Check,
  Layers3,
  ShieldCheck,
  Waypoints,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { MARKETING_ROOT } from "../../site";
import { ExecutionArchitecture } from "./execution-architecture";
import styles from "./defi.module.css";

const reconciliationEvidence = [
  {
    label: "Reported NAV",
    value: "100.00",
    detail: "Operator book at the latest published checkpoint",
    outcome: "reported",
    status: "REPORTED",
  },
  {
    label: "Shadow NAV",
    value: "99.03",
    detail: "Reconstructed from assets, debt, rewards, and receivables",
    outcome: "reconstructed",
    status: "REBUILT",
  },
  {
    label: "Unexplained drift",
    value: "−0.97%",
    detail: "One offchain receivable lacks fresh supporting evidence",
    outcome: "drift",
    status: "INVESTIGATE",
  },
] as const;

const preparedSteps = [
  ["01", "Reprice", "Exclude the stale receivable from the shadow book"],
  ["02", "Contain", "Disable new allocation to the affected strategy"],
  ["03", "Deallocate", "Return exposure to the approved idle venue"],
  ["04", "Reconcile", "Verify receipts and measure residual exposure"],
] as const;

const proofFacts = [
  ["Shadow NAV", "independently reconstructed"],
  ["Role-aware", "permissions and timelocks checked"],
  ["Exact batch", "decoded and simulated before signing"],
  ["Reconciled", "receipts through residual exposure"],
] as const;

const evidenceInputs = [
  "assets",
  "debts",
  "rewards",
  "receivables",
  "exchange rates",
  "oracle snapshots",
] as const;

const controlInputs = [
  "roles",
  "caps",
  "queues",
  "timelocks",
  "call ordering",
  "postconditions",
] as const;

const catalogStages = [
  {
    icon: Blocks,
    title: "NAV Sentinel",
    body: "Reconstruct assets, debt, rewards, and receivables independently; surface unexplained drift before it becomes a disclosure problem.",
  },
  {
    icon: ShieldCheck,
    title: "Vault ChangeSet",
    body: "Turn an approved current-to-target diff into decoded calls, role checks, simulations, and one reviewable signer packet.",
  },
  {
    icon: Layers3,
    title: "Incident Commander",
    body: "Map an alert to affected exposure, apply the approved risk-off runbook, and preserve the required action order.",
  },
  {
    icon: Waypoints,
    title: "Settlement Copilot",
    body: "Correlate signatures, receipts, final balances, and residual exposure into evidence an operator can explain and export.",
  },
] as const;

export function V3DefiPage() {
  const [showPreparedAction, setShowPreparedAction] = useState(false);

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroGrid} aria-hidden />
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>AOMI FOR VAULT OPERATIONS</p>
          <h1>Independent books. Policy-bounded exits.</h1>
          <p className={styles.lede}>
            Aomi reconstructs what a vault owns and owes, detects drift between
            reported and live state, and turns an approved response runbook into
            decoded, simulated, signer-ready actions—with post-execution
            evidence.
          </p>
          <div className={styles.heroActions}>
            <a href="#operator-paths">
              Review the control plane <ArrowRight aria-hidden />
            </a>
            <a href="#operator-systems">See the operator systems</a>
          </div>
        </div>

        <div className={styles.seqCard} aria-label="Vault incident replay demo">
          <header className={styles.demoMeta}>
            <span>ILLUSTRATIVE INCIDENT REPLAY</span>
            <strong>EXTERNALLY MANAGED VAULT</strong>
          </header>
          <div className={styles.demoPrompt}>
            Reported exchange rate no longer reconciles with the independently
            reconstructed vault state.
          </div>
          <div className={styles.demoAnswer}>
            <span>NAV DRIFT DETECTED</span>
            <h3>Prove the gap. Then compile the approved response.</h3>
          </div>
          <ol className={styles.marketList}>
            {reconciliationEvidence.map((item) => (
              <li key={item.label} data-outcome={item.outcome}>
                <div>
                  <strong>{item.label}</strong>
                </div>
                <em>{item.value}</em>
                <span>{item.status}</span>
                <p>{item.detail}</p>
              </li>
            ))}
          </ol>
          <p className={styles.demoConclusion}>
            <strong>
              The operator&apos;s runbook—not the model—defines the response.
            </strong>{" "}
            This fixture reprices the book, stops new exposure, deallocates, and
            verifies the resulting state.
          </p>
          <button
            className={styles.demoToggle}
            type="button"
            aria-expanded={showPreparedAction}
            onClick={() => setShowPreparedAction((current) => !current)}
          >
            {showPreparedAction
              ? "Hide Vault ChangeSet"
              : "Inspect Vault ChangeSet"}
            <span aria-hidden>{showPreparedAction ? "−" : "+"}</span>
          </button>
          {showPreparedAction ? (
            <ol className={styles.preparedAction}>
              {preparedSteps.map(([step, title, body]) => (
                <li key={step}>
                  <span>{step}</span>
                  <strong>{title}</strong>
                  <p>{body}</p>
                </li>
              ))}
            </ol>
          ) : null}
          <footer>
            <Check aria-hidden /> No strategy selected · no keys held · signer
            approval required
          </footer>
        </div>
      </section>

      <section className={styles.proof} aria-label="DeFi execution facts">
        {proofFacts.map(([value, label]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </section>

      <section id="operator-paths" className={styles.paths}>
        <header className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>START WITH THE CONTROL GAP</p>
            <h2>Run in shadow mode before anything can move.</h2>
          </div>
          <p>
            Keep the mandate, valuation models, protocol tooling, and signer.
            Aomi begins as an independent evidence and rehearsal layer, then
            earns the right to prepare execution packets.
          </p>
        </header>
        <div className={styles.pathGrid}>
          <article>
            <span>NEED INDEPENDENT FINANCIAL TRUTH?</span>
            <h3>Run a shadow-NAV engagement.</h3>
            <p>
              Reconstruct current assets, liabilities, rewards, and receivables
              beside the operator&apos;s existing books. Trace every variance to
              evidence, ownership, and a review state.
            </p>
            <a href="#operator-systems">
              See the NAV control loop <ArrowRight aria-hidden />
            </a>
          </article>
          <article>
            <span>NEED FASTER RISK-OFF RESPONSE?</span>
            <h3>Compile one approved runbook.</h3>
            <p>
              Start with a real alert. Resolve affected exposure, permissions,
              caps, queues, and timelocks; then produce the exact ordered calls
              for the operator&apos;s Safe, MPC, or wallet.
            </p>
            <a href="#architecture">
              Follow alert to evidence <ArrowRight aria-hidden />
            </a>
          </article>
        </div>
      </section>

      <section className={styles.coverage}>
        <header className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>THE VAULT CHANGESET</p>
            <h2>One review object from desired state to evidence.</h2>
          </div>
          <p>
            Operators review a financial diff—not blind calldata. The packet
            carries its inputs, required authority, exact calls, simulation,
            signer handoff, and postconditions together.
          </p>
        </header>
        <div className={styles.coverageWall}>
          <div className={styles.coverageRow}>
            <span>Evidence</span>
            <div>
              {evidenceInputs.map((input) => (
                <em key={input}>{input}</em>
              ))}
            </div>
          </div>
          <div className={styles.coverageRow}>
            <span>Controls</span>
            <div>
              {controlInputs.map((input) => (
                <em key={input}>{input}</em>
              ))}
            </div>
          </div>
          <p className={styles.coverageNote}>
            Output: current-to-target diff · decoded ordered calls · full-batch
            simulation · approval packet · receipts · final-state reconciliation
          </p>
        </div>
      </section>

      <ExecutionArchitecture />

      <section id="operator-systems" className={styles.catalog}>
        <header className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>OPERATOR SYSTEMS</p>
            <h2>Four control loops. One evidence model.</h2>
          </div>
          <p>
            These systems complement the operator&apos;s models, protocol UIs,
            monitors, and signer. They do not replace the strategy or assume
            investment authority.
          </p>
        </header>
        <ol className={styles.catalogFlow}>
          {catalogStages.map(({ icon: Icon, title, body }, index) => (
            <li key={title}>
              <div>
                <Icon aria-hidden />
                <span>0{index + 1}</span>
              </div>
              <h3>{title}</h3>
              <p>{body}</p>
            </li>
          ))}
        </ol>
        <div className={styles.catalogCtaRow}>
          <Link href={`${MARKETING_ROOT}/products/rest-apis`}>
            See the deterministic execution APIs <ArrowRight aria-hidden />
          </Link>
        </div>
      </section>

      <section className={styles.cta}>
        <p className={styles.eyebrow}>START WITH EVIDENCE</p>
        <h2>Bring one vault and one approved risk-off runbook.</h2>
        <p>
          Run in shadow mode first. Keep the mandate, models, and keys. Aomi
          proves current state, rehearses the response, and packages the exact
          actions for the signer you already trust.
        </p>
        <div className={styles.ctaActions}>
          <a href="mailto:hello@aomi.dev?subject=Shadow%20NAV%20review">
            Start a shadow-NAV review <ArrowRight aria-hidden />
          </a>
          <a href="mailto:hello@aomi.dev?subject=Risk-off%20runbook%20review">
            Test a risk-off runbook
          </a>
        </div>
      </section>
    </main>
  );
}
