import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  KeyRound,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { TradingIntegrationLab } from "./trading-integration-lab";
import { TradingObservability } from "./trading-observability";
import styles from "./trading.module.css";

const executionRails = [
  {
    icon: ShieldCheck,
    title: "Typed guard report",
    body: "Exposure, slippage, signer, chain, and application policy—named and inspectable.",
  },
  {
    icon: CheckCircle2,
    title: "Fork simulation",
    body: "Full-batch verdict, balance changes, batch order, gas, and decodable failures.",
  },
  {
    icon: KeyRound,
    title: "Sealed Action",
    body: "One EVM/SVM action union and ActionSummary for the signer you already use.",
  },
  {
    icon: RefreshCw,
    title: "Verified settlement",
    body: "Idempotent result reporting and a watcher that checks the outcome against the sealed action.",
  },
] as const;

export function TradingLanding() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.shell}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>AOMI FOR TRADING PLATFORMS</p>
            <h1>
              Keep the brain.
              <span>Plug in the execution rails.</span>
            </h1>
            <p className={styles.lede}>
              Your harness already owns market data, models, venue selection,
              and route logic. Send the action it chose to Aomi. Get back a
              simulated, guard-checked Plan and a sealed signable for your
              existing signer.
            </p>
            <div className={styles.heroActions}>
              <a href="#integration" className={styles.primaryButton}>
                Inspect the integration <ArrowDown aria-hidden />
              </a>
              <Link href="/v2/products/api" className={styles.secondaryButton}>
                Pipeline API · Preview <ArrowUpRight aria-hidden />
              </Link>
            </div>
            <div className={styles.boundaryNote}>
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
          </div>

          <div
            className={styles.topology}
            aria-label="Trading integration topology"
          >
            <div className={styles.topologyHeader}>
              <span>LIVE INTEGRATION MAP</span>
              <span>
                <i /> PIPELINE READY
              </span>
            </div>

            <div className={styles.topologyBody}>
              <div className={styles.harnessCluster}>
                <p>YOUR PLATFORM</p>
                <div className={styles.harnessCore}>
                  <span>OWNED BY YOU</span>
                  <strong>AI trading harness</strong>
                  <small>signals · venues · route logic · risk</small>
                </div>
                <div className={`${styles.satellite} ${styles.satelliteOne}`}>
                  MARKET DATA
                </div>
                <div className={`${styles.satellite} ${styles.satelliteTwo}`}>
                  MODELS
                </div>
                <div className={`${styles.satellite} ${styles.satelliteThree}`}>
                  CONNECTORS
                </div>
              </div>

              <div className={styles.transferRail}>
                <span className={styles.packet}>ActionSpec[]</span>
                <span
                  className={`${styles.travelDot} ${styles.travelDotOne}`}
                />
                <span
                  className={`${styles.travelDot} ${styles.travelDotTwo}`}
                />
                <ArrowRight aria-hidden />
              </div>

              <div className={styles.aomiGate}>
                <span>AOMI PIPELINE API · PREVIEW</span>
                <strong>Build → simulate → guard</strong>
                <div>
                  <code>POST /v1/pipeline/evm/build</code>
                  <code>→ Plan</code>
                </div>
              </div>

              <div className={styles.outputRail}>
                <span>sealed signable</span>
                <ArrowRight aria-hidden />
              </div>

              <div className={styles.signerNode}>
                <span>YOUR SIGNER</span>
                <strong>Approve</strong>
                <small>submit · verify · settle</small>
              </div>
            </div>

            <div className={styles.ticker}>
              <div>
                <span>NO CHAT SESSION</span>
                <i />
                <span>STATE-ECHO AVAILABLE</span>
                <i />
                <span>IDEMPOTENT RETRIES</span>
                <i />
                <span>EVM + SVM</span>
                <i />
                <span>NO CHAT SESSION</span>
                <i />
                <span>STATE-ECHO AVAILABLE</span>
                <i />
                <span>IDEMPOTENT RETRIES</span>
                <i />
                <span>EVM + SVM</span>
                <i />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.boundarySection}>
        <div className={styles.shell}>
          <div className={styles.boundaryHeading}>
            <p className={styles.eyebrow}>THE PRODUCT BOUNDARY</p>
            <h2>Not another trading agent.</h2>
            <p>
              Mature trading platforms already own the hardest layer: the data,
              models, venue integrations, route selection, and risk judgment.
              Aomi starts after that decision and gives every chosen action the
              same guarded execution contract.
            </p>
          </div>

          <div className={styles.ownershipMap}>
            <div className={styles.platformPlane}>
              <div className={styles.planeTopline}>
                <span>PLATFORM-SIDE</span>
                <strong>YOUR HARNESS</strong>
              </div>
              <div className={styles.platformOrbit}>
                <span className={styles.orbitCore}>DECIDE</span>
                <span className={`${styles.orbitItem} ${styles.orbitMarket}`}>
                  market data
                </span>
                <span className={`${styles.orbitItem} ${styles.orbitModels}`}>
                  models
                </span>
                <span className={`${styles.orbitItem} ${styles.orbitVenue}`}>
                  venue logic
                </span>
                <span className={`${styles.orbitItem} ${styles.orbitRisk}`}>
                  risk
                </span>
              </div>
              <p>
                Own the intelligence, customer relationship, and routing edge.
              </p>
            </div>

            <div className={styles.contractSeam}>
              <span>INPUT</span>
              <code>ActionSpec[]</code>
              <i />
              <code>Plan</code>
              <span>OUTPUT</span>
            </div>

            <div className={styles.aomiPlane}>
              <div className={styles.planeTopline}>
                <span>AOMI-SIDE</span>
                <strong>AOMI EXECUTION</strong>
              </div>
              <div className={styles.aomiStack}>
                <span>BUILD</span>
                <span>SIMULATE</span>
                <span>GUARD</span>
                <span>SEAL</span>
                <span>VERIFY</span>
              </div>
              <p>
                Inherit the rails without moving the brain or reconnecting
                custody.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="integration" className={styles.integrationSection}>
        <div className={styles.shell}>
          <header className={styles.integrationHeading}>
            <div>
              <p className={styles.eyebrow}>PLUG-AND-PLAY INTEGRATION</p>
              <h2>Your harness calls one level down.</h2>
            </div>
            <p>
              Start with a one-shot build. Use state-echo only when a route
              spans a decision or signature. Or mount the same operations as
              constrained tools inside your existing AI runtime.
            </p>
          </header>
          <TradingIntegrationLab />
        </div>
      </section>

      <section className={styles.observabilitySection}>
        <div className={styles.shell}>
          <header className={styles.observabilityHeading}>
            <div>
              <p className={styles.eyebrow}>OPERATE THE BOUNDARY</p>
              <h2>See where execution succeeds—or stops.</h2>
            </div>
            <p>
              Your platform remains the control plane. Aomi Build exposes the
              narrower execution adapter: calls, proposed Actions, signer
              submissions, confirmations, failures, and loaded releases.
            </p>
          </header>
          <TradingObservability />
        </div>
      </section>

      <section className={styles.railsSection}>
        <div className={styles.shell}>
          <div className={styles.railsHeading}>
            <p className={styles.eyebrow}>WHAT THE PLAN CARRIES</p>
            <h2>The boring parts become uniform.</h2>
          </div>

          <div className={styles.executionRails}>
            {executionRails.map(({ icon: RailIcon, title, body }, index) => {
              return (
                <div key={title} className={styles.executionRail}>
                  <span className={styles.railNumber}>0{index + 1}</span>
                  <span className={styles.railIcon}>
                    <RailIcon aria-hidden />
                  </span>
                  <strong>{title}</strong>
                  <p>{body}</p>
                  <i
                    className={styles.railPulse}
                    style={{ animationDelay: `${-index * 0.8}s` }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className={styles.fitSection}>
        <div className={styles.shell}>
          <p className={styles.eyebrow}>THE INTEGRATION FIT</p>
          <h2>Keep every trading advantage. Delete the execution glue.</h2>

          <div className={styles.fitStatement}>
            <div>
              <span>YOU KEEP</span>
              <strong>Models</strong>
              <strong>Signals</strong>
              <strong>Venue access</strong>
              <strong>Routing</strong>
              <strong>Customer UX</strong>
            </div>
            <div className={styles.fitSymbol}>+</div>
            <div>
              <span>YOU ADD</span>
              <strong>One API</strong>
              <strong>One Plan</strong>
              <strong>One signer binding</strong>
              <strong>One verified outcome</strong>
            </div>
          </div>

          <div className={styles.finalCta}>
            <div>
              <p>BRING ONE ACTION</p>
              <h3>Map your harness to the Pipeline API.</h3>
            </div>
            <div>
              <Link href="/v2/contact" className={styles.primaryButton}>
                Design the integration <ArrowRight aria-hidden />
              </Link>
              <Link href="/v2/products/api" className={styles.secondaryButton}>
                Read API overview <ArrowUpRight aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
