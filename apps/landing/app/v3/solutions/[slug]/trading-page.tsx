import {
  ArrowRight,
  Check,
  CheckCircle2,
  KeyRound,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import type { SolutionConfig } from "../../../v2/solutions/solution-data";
import { TradingIntegrationLab } from "../../../v2/solutions/trading-integration-lab";
import { V3 } from "../../site";
import styles from "./sector-pages.module.css";

const planOutputs = [
  {
    icon: ShieldCheck,
    title: "Typed guard report",
    body: "Exposure, impact, signer, chain, and application policy—named and inspectable.",
  },
  {
    icon: CheckCircle2,
    title: "Fork simulation",
    body: "Full-batch verdict, balance changes, batch order, gas, and decodable failures.",
  },
  {
    icon: KeyRound,
    title: "Sealed Action",
    body: "One EVM or SVM action union for the signer your platform already uses.",
  },
  {
    icon: RefreshCw,
    title: "Verified settlement",
    body: "Idempotent reporting checks the outcome against the exact sealed action.",
  },
] as const;

export function V3TradingPage({ solution }: { solution: SolutionConfig }) {
  return (
    <main className={styles.tradingPage}>
      <section className={`${styles.sectorHero} ${styles.tradingHero}`}>
        <div className={styles.sectorHeroCopy}>
          <p className={styles.eyebrow}>Aomi for trading platforms</p>
          <h1>
            Keep the brain.
            <span>Plug in the execution rails.</span>
          </h1>
          <p className={styles.sectorLede}>
            Your harness already owns market data, models, venue selection, and
            route logic. Send the action it chose to Aomi. Get back a simulated,
            guard-checked Plan and a sealed signable for your existing signer.
          </p>
          <div className={styles.heroActions}>
            <a href="#trading-integration">
              Inspect the integration <ArrowRight aria-hidden />
            </a>
            <Link href={`${V3}/products/rest-apis`}>
              Pipeline API · Preview
            </Link>
          </div>
          <div className={styles.tradingGuarantees}>
            <span>
              <Check aria-hidden /> Your strategy stays yours
            </span>
            <span>
              <Check aria-hidden /> No Aomi inference
            </span>
            <span>
              <Check aria-hidden /> Your signer remains
            </span>
          </div>
          <p className={styles.heroAudience}>{solution.audience}</p>
        </div>

        <div
          className={styles.tradingTopology}
          aria-label="Trading integration topology"
        >
          <header>
            <span>Live integration map</span>
            <strong>
              <i /> Pipeline ready
            </strong>
          </header>
          <div className={styles.topologyCanvas}>
            <div className={styles.strategyCluster}>
              <span>Your platform</span>
              <strong>AI trading harness</strong>
              <small>signals · venues · route logic · risk</small>
              <i className={styles.orbitOne}>Market data</i>
              <i className={styles.orbitTwo}>Models</i>
              <i className={styles.orbitThree}>Connectors</i>
            </div>
            <div className={styles.topologyRail}>
              <span>ActionSpec[]</span>
              <i />
              <ArrowRight aria-hidden />
            </div>
            <div className={styles.pipelineGate}>
              <span>Aomi Pipeline API · Preview</span>
              <strong>Build → simulate → guard</strong>
              <code>POST /v1/pipeline/evm/build</code>
            </div>
            <div className={styles.signerGate}>
              <span>Your signer</span>
              <strong>Approve</strong>
              <small>submit · verify · settle</small>
            </div>
          </div>
          <footer>
            <span>No chat session</span>
            <i />
            <span>Idempotent retries</span>
            <i />
            <span>EVM + SVM</span>
          </footer>
        </div>
      </section>

      <section className={styles.tradingBoundary}>
        <header>
          <p className={styles.eyebrow}>The product boundary</p>
          <h2>Not another trading agent.</h2>
          <p>
            Mature trading platforms already own the intelligence and routing
            edge. Aomi starts after the decision and gives each selected action
            the same guarded execution contract.
          </p>
        </header>
        <div className={styles.ownershipSeam}>
          <div>
            <span>You decide</span>
            <strong>Market data</strong>
            <strong>Models and signals</strong>
            <strong>Venue and route logic</strong>
            <strong>Risk judgment</strong>
          </div>
          <div className={styles.seamContract}>
            <span>Input</span>
            <code>ActionSpec[]</code>
            <i />
            <code>Plan</code>
            <span>Output</span>
          </div>
          <div>
            <span>Aomi executes</span>
            <strong>Build</strong>
            <strong>Simulate</strong>
            <strong>Guard</strong>
            <strong>Seal and verify</strong>
          </div>
        </div>
      </section>

      <section id="trading-integration" className={styles.tradingLabSection}>
        <header className={styles.splitHeading}>
          <div>
            <p className={styles.eyebrow}>Plug-and-play integration</p>
            <h2>Your harness calls one level down.</h2>
          </div>
          <p>
            Start with a one-shot build, carry state only when a route pauses,
            or mount the same constrained operations inside the AI runtime you
            already operate.
          </p>
        </header>
        <TradingIntegrationLab />
      </section>

      <section className={styles.planSection}>
        <div className={styles.planHeading}>
          <p className={styles.eyebrow}>What the Plan carries</p>
          <h2>The boring parts become uniform.</h2>
        </div>
        <div className={styles.planGrid}>
          {planOutputs.map(({ icon: Icon, title, body }, index) => (
            <article key={title}>
              <span>0{index + 1}</span>
              <Icon aria-hidden />
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.tradingFit}>
        <p className={styles.eyebrow}>The integration fit</p>
        <h2>Keep every trading advantage. Delete the execution glue.</h2>
        <div>
          <p>
            <span>You keep</span> Models · signals · venues · routing · customer
            UX
          </p>
          <b>+</b>
          <p>
            <span>You add</span> One API · one Plan · one signer binding · one
            verified outcome
          </p>
        </div>
        <Link href={`${V3}/contact`}>
          Map your harness <ArrowRight aria-hidden />
        </Link>
      </section>
    </main>
  );
}
