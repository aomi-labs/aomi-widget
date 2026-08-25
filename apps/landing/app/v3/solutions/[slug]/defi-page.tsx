import {
  ArrowRight,
  Blocks,
  Check,
  Layers3,
  ShieldCheck,
  Waypoints,
} from "lucide-react";
import Link from "next/link";
import { V3 } from "../../site";
import { ExecutionArchitecture } from "./execution-architecture";
import styles from "./defi.module.css";

const sequenceSteps = [
  {
    label: "Withdraw 25,000 USDC from Aave v3",
    detail: "aUSDC redeemed on Ethereum",
    amount: "+25,000 USDC",
    direction: "in",
  },
  {
    label: "Swap USDC to WETH through CoW Swap",
    detail: "Solver auction, settles off the public mempool",
    amount: "+9.62 WETH",
    direction: "in",
  },
  {
    label: "Supply 9.62 WETH to Morpho Blue",
    detail: "91.2% utilization market",
    amount: "−9.62 WETH",
    direction: "out",
  },
] as const;

const verbs = [
  "swap",
  "bridge",
  "supply",
  "borrow",
  "repay",
  "stake",
  "unstake",
  "claim",
  "provide liquidity",
  "hedge",
  "transfer",
  "schedule",
] as const;

const venues = [
  "Uniswap",
  "Aave",
  "Morpho",
  "Lido",
  "CoW Swap",
  "LiFi",
  "Curve",
  "Compound",
  "Pendle",
  "GMX",
  "Hyperliquid",
  "Polymarket",
  "Rocket Pool",
  "Ether.fi",
  "Stargate",
  "Jupiter",
  "Marinade",
  "Sky",
  "+ 20 more",
] as const;

const catalogCards = [
  {
    icon: Blocks,
    title: "Wrap what you already run",
    body: "The endpoints and contract calls your team operates today become typed tools with schemas and preambles through the Plugin SDK. No new infrastructure on your side.",
  },
  {
    icon: ShieldCheck,
    title: "Inherit the execution lifecycle",
    body: "Every call your protocol receives arrives fork-simulated, policy-checked, and signed by the user's own wallet. You never handle keys or half-built transactions.",
  },
  {
    icon: Waypoints,
    title: "Reach every agent and surface",
    body: "Once listed, your protocol is executable through the Agent API, the Pipeline API, the hosted chat surfaces, and every product built on top of them.",
  },
] as const;

export function V3DefiPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroGrid} aria-hidden />
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>AOMI FOR DEFI</p>
          <h1>The universal DeFi executor.</h1>
          <p className={styles.lede}>
            Aggregators quote the best price for one hop. Aomi executes the
            whole workflow. It covers 40+ protocols on EVM and Solana, every
            action they expose, compiled into one simulated, signable
            transaction. When a hop is a swap, it routes through the same
            aggregators you would call yourself.
          </p>
          <div className={styles.heroActions}>
            <Link href={`${V3}/products/rest-apis`}>
              Explore the execution APIs <ArrowRight aria-hidden />
            </Link>
            <a href="#architecture">See the architecture</a>
          </div>
        </div>

        <div className={styles.seqCard} aria-label="One sealed Action across three protocols">
          <header>
            <span>
              <Layers3 aria-hidden /> One Action · three protocols
            </span>
            <strong>SIMULATED · 1 SIGNATURE</strong>
          </header>
          <h3>Rotate idle USDC into WETH yield</h3>
          <ol>
            {sequenceSteps.map((step, index) => (
              <li key={step.label}>
                <span>0{index + 1}</span>
                <div>
                  <strong>{step.label}</strong>
                  <small>{step.detail}</small>
                </div>
                <em data-direction={step.direction}>{step.amount}</em>
              </li>
            ))}
          </ol>
          <footer>
            <Check aria-hidden /> Simulated as one batch on a fork. Guards
            passed. Your signer approves once.
          </footer>
        </div>
      </section>

      <section className={styles.proof} aria-label="DeFi coverage guarantees">
        <div className={styles.proofAudience}>
          <span>Built for</span>
          <p>DeFi frontends, yield products, trading bots, and protocol teams</p>
        </div>
        {[
          "One contract for every protocol action",
          "Whole sequences in one signature",
          "Simulated before signature",
        ].map((item, index) => (
          <div key={item}>
            <span>0{index + 1}</span>
            <strong>{item}</strong>
          </div>
        ))}
      </section>

      <section className={styles.coverage}>
        <header className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>THE ACTION SPACE</p>
            <h2>Aggregators cover the swap. DeFi is every other verb too.</h2>
          </div>
          <p>
            Routing APIs compete on price for one action type. Most of what a
            DeFi product needs is everything else, and each of those verbs
            normally means another bespoke integration. In Aomi they share one
            catalog and one execution contract.
          </p>
        </header>
        <div className={styles.coverageWall}>
          <div className={styles.coverageRow}>
            <span>Verbs</span>
            <div>
              {verbs.map((verb) => (
                <em key={verb}>{verb}</em>
              ))}
            </div>
          </div>
          <div className={styles.coverageRow}>
            <span>Venues</span>
            <div>
              {venues.map((venue) => (
                <em key={venue} data-more={venue.startsWith("+") || undefined}>
                  {venue}
                </em>
              ))}
            </div>
          </div>
          <p className={styles.coverageNote}>
            Chains: Ethereum, Base, Arbitrum, Optimism, and Solana. Swap and
            bridge hops route through venues such as CoW Swap and LiFi, so
            coverage never trades away execution quality.
          </p>
        </div>
      </section>

      <ExecutionArchitecture />

      <section className={styles.catalog}>
        <header className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>THE OPEN CATALOG</p>
            <h2>Make your protocol agent-reachable.</h2>
          </div>
          <p>
            The executor stays universal because the catalog is open. Protocol
            teams list themselves by wrapping the interfaces they already
            operate into tools, then every agent on the platform can execute
            against them.
          </p>
        </header>
        <div className={styles.needGrid}>
          {catalogCards.map(({ icon: Icon, title, body }, index) => (
            <article key={title}>
              <div>
                <Icon aria-hidden />
                <span>0{index + 1}</span>
              </div>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
        <div className={styles.catalogCtaRow}>
          <Link href={`${V3}/products/plugin-sdk`}>
            Read about the Plugin SDK <ArrowRight aria-hidden />
          </Link>
        </div>
      </section>

      <section className={styles.cta}>
        <p className={styles.eyebrow}>Build with Aomi</p>
        <h2>Bring us one real DeFi flow.</h2>
        <p>
          Describe the workflow your product needs. We will map it to the
          catalog, run it on a fork, and hand your signer the sealed Action.
        </p>
        <Link href={`${V3}/contact`}>
          Start with one workflow <ArrowRight aria-hidden />
        </Link>
      </section>
    </main>
  );
}
