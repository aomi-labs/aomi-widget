import {
  ArrowRight,
  BadgeCheck,
  Bot,
  Braces,
  Check,
  FlaskConical,
  ShieldCheck,
  Waypoints,
} from "lucide-react";
import Link from "next/link";
import { MARKETING_ROOT } from "../../site";
import { MetaMaskWalletFixture } from "./metamask-wallet-fixture";
import styles from "./sector-pages.module.css";

const stopBuilding = [
  {
    icon: Braces,
    label: "Coverage",
    title: "Skip the protocol integration desk.",
    body: "Uniswap, Aave, Morpho, Lido, and 40+ protocols across EVM and Solana sit behind one JSON contract. New venues arrive without a new integration.",
  },
  {
    icon: FlaskConical,
    label: "Rehearsal",
    title: "Every action is simulated before signature.",
    body: "The kernel builds exact calldata, runs the whole batch on a forked copy of the chain, then enforces slippage and policy guards. Failures surface at plan time, not inside your user's flow.",
  },
  {
    icon: BadgeCheck,
    label: "Proof",
    title: "A hash is not proof.",
    body: "A watcher checks signer, chain, calldata, and ordering against the sealed Action before your product reports success. Receipts reconcile without your own indexing stack.",
  },
] as const;

export function V3WalletsPage() {
  return (
    <main className={styles.walletsPage}>
      <section className={`${styles.sectorHero} ${styles.walletsHero}`}>
        <div className={styles.walletsHeroCopy}>
          <p className={styles.eyebrow}>AOMI FOR WALLETS</p>
          <h1>Your agent plans. Aomi executes.</h1>
          <p className={styles.sectorLede}>
            Wallet teams are already building their own assistants. Aomi is the
            execution layer underneath: send the action your agent selected, or
            the raw intent, and get back a fork-simulated, policy-checked Action
            for the signer you already run.
          </p>
          <div className={styles.heroActions}>
            <Link href={`${MARKETING_ROOT}/products/rest-apis`}>
              Compare the two APIs <ArrowRight aria-hidden />
            </Link>
            <Link href={`${MARKETING_ROOT}/contact`}>
              Design your integration
            </Link>
          </div>
          <div className={styles.walletHeroProof}>
            {[
              "Your model stays yours",
              "Your signer remains",
              "No Aomi custody",
            ].map((item) => (
              <span key={item}>
                <Check aria-hidden /> {item}
              </span>
            ))}
          </div>
        </div>

        <div className={styles.walletHeroArtifact}>
          <MetaMaskWalletFixture />
        </div>
      </section>

      <section className={styles.walletPromise}>
        <p className={styles.eyebrow}>The pitch</p>
        <h2>Keep the assistant. Stop building the execution stack.</h2>
        <p>
          The agent is your product surface and your differentiation. The
          protocol integrations, simulation infrastructure, guard policies, and
          receipt verification underneath it are not. Consume them as an API
          instead.
        </p>
      </section>

      <section className={styles.apiLanes}>
        <div className={styles.laneHeading}>
          <p className={styles.eyebrow}>TWO WAYS TO CONSUME</p>
          <h2>Bring your agent, or borrow ours.</h2>
        </div>
        <div className={styles.laneGrid}>
          <article className={styles.laneCard}>
            <div className={styles.laneBadge}>
              <Waypoints aria-hidden />
              <span>PIPELINE API · YOUR AGENT PLANS</span>
              <small>preview</small>
            </div>
            <h3>Your model picks the action.</h3>
            <p>
              Keep your planner, routing logic, and product voice. Submit one
              catalog action or an ordered batch. Receive the simulation
              verdict, typed guard checks, and an unsigned signable, with no
              Aomi inference in the loop.
            </p>
            <div className={styles.laneEndpoints}>
              <span>
                <b>POST</b> /v1/pipeline/evm/build
              </span>
              <span>
                <b>POST</b> /v1/pipeline/svm/build
              </span>
            </div>
            <p className={styles.laneBest}>
              <span>BEST FOR</span> wallets with an in-house agent or strategy
              engine
            </p>
          </article>

          <article className={styles.laneCard}>
            <div className={styles.laneBadge}>
              <Bot aria-hidden />
              <span>AGENT API · AOMI PLANS</span>
              <small>v1</small>
            </div>
            <h3>Ship an assistant without building the planner.</h3>
            <p>
              Send a customer&apos;s sentence and wallet capabilities. Aomi runs
              the agent loop, selects tools, and returns messages, activity, and
              a durable Action your product renders and your signer approves.
            </p>
            <div className={styles.laneEndpoints}>
              <span>
                <b>POST</b> /v1/agent/chat
              </span>
              <span>
                <b>GET</b> /v1/agent/chat/{"{session}"}
              </span>
            </div>
            <p className={styles.laneBest}>
              <span>BEST FOR</span> wallets adding conversational execution this
              quarter
            </p>
          </article>
        </div>
        <div className={styles.laneBand}>
          <ShieldCheck aria-hidden />
          <strong>Both lanes resolve to the same sealed Action.</strong>
          <span>
            One confirm sheet, one signer binding. Start on the Agent API, drop
            to the Pipeline API when your own agent is ready, and nothing
            re-integrates.
          </span>
        </div>
      </section>

      <section className={styles.walletControls}>
        {stopBuilding.map(({ icon: Icon, label, title, body }, index) => (
          <article key={label}>
            <div>
              <Icon aria-hidden />
              <span>0{index + 1}</span>
            </div>
            <p>{label}</p>
            <h3>{title}</h3>
            <span>{body}</span>
          </article>
        ))}
      </section>

      <section className={styles.walletReview}>
        <div className={styles.reviewCopy}>
          <p className={styles.eyebrow}>One review surface</p>
          <h2>The Action lands in the confirm sheet you already built.</h2>
          <p>
            Every Action carries a typed, kernel-sealed summary: title, ordered
            steps, cost, and warnings. Your existing review UI renders it
            directly, so what the user approves is exactly what the kernel
            verifies onchain.
          </p>
          <div>
            <span>
              <Check aria-hidden /> Typed summary
            </span>
            <span>
              <Check aria-hidden /> Sealed with the payload
            </span>
            <span>
              <Check aria-hidden /> Renders in your UI
            </span>
          </div>
        </div>

        <div
          className={styles.walletReceipt}
          role="group"
          aria-label="Swap confirmation preview"
        >
          <h3>Swap 0.5 ETH for ~1,240 USDC</h3>
          <div className={styles.walletReceiptSteps}>
            <div>
              <span>Wrap 0.5 ETH</span>
              <strong>−0.5 ETH</strong>
            </div>
            <div>
              <span>
                Swap via Uniswap v3
                <small>Simulated · guards passed</small>
              </span>
              <strong>+1,240.18 USDC</strong>
            </div>
          </div>
          <div className={styles.walletReceiptMeta}>
            <span>Gas: you pay ~$1.20</span>
            <strong>⚠ Price impact 2.3%</strong>
          </div>
          <div className={styles.walletReceiptActions}>
            <span>Reject</span>
            <span>Approve</span>
          </div>
        </div>
      </section>

      <section className={styles.walletFit}>
        <div>
          <span>Your wallet keeps</span>
          <strong>Brand · accounts · your agent · the signer</strong>
        </div>
        <div>
          <span>Aomi adds</span>
          <strong>
            Protocol tools · simulation · guards · verified receipts
          </strong>
        </div>
      </section>

      <section className={`${styles.sectorCta} ${styles.walletCta}`}>
        <p className={styles.eyebrow}>Keep the wallet yours</p>
        <h2>Plug execution rails under your agent.</h2>
        <p>
          Bring your model&apos;s output. We will map it onto the Pipeline API,
          bind your signer stack once, and leave custody exactly where it is.
        </p>
        <Link href={`${MARKETING_ROOT}/contact`}>
          Map the integration <ArrowRight aria-hidden />
        </Link>
      </section>
    </main>
  );
}
