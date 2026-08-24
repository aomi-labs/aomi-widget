import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Bot,
  Braces,
  Check,
  CheckCircle2,
  KeyRound,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  WalletCards,
  Waypoints,
} from "lucide-react";
import { ApiWorkbench } from "./api-workbench";
import styles from "./rest-api.module.css";

export const metadata: Metadata = {
  title: "REST APIs | Aomi",
  description:
    "Natural language in, signable transactions out. Use Aomi's Agent API or guarded Pipeline API without giving up custody.",
  robots: { index: false, follow: false },
};

const lifecycle = [
  {
    number: "01",
    title: "Plan",
    body: "Resolve an intent or accept the exact catalog action your strategy selected.",
  },
  {
    number: "02",
    title: "Simulate",
    body: "Run the complete batch against a fork before anything reaches a signer.",
  },
  {
    number: "03",
    title: "Guard",
    body: "Enforce chain, signer, ordering, slippage, and application policy.",
  },
  {
    number: "04",
    title: "Sign",
    body: "Return a sealed action to the wallet adapter your product already trusts.",
  },
  {
    number: "05",
    title: "Verify",
    body: "Observe the transaction and verify it against the action before resuming.",
  },
] as const;

const guarantees = [
  {
    icon: KeyRound,
    title: "We never hold keys",
    body: "Every guest signature comes from the integrator's signer. Custody is never inferred from a wallet address.",
  },
  {
    icon: ShieldCheck,
    title: "Simulated before sealed",
    body: "The action carries its simulation result and guard verdict into the approval boundary.",
  },
  {
    icon: CheckCircle2,
    title: "A hash is not proof",
    body: "Reported transactions are fetched and checked against signer, chain, calldata, ordering, and fee legs.",
  },
  {
    icon: RefreshCw,
    title: "Exactly-once resume",
    body: "Idempotent results and ordered state transitions prevent duplicate execution or double resume.",
  },
  {
    icon: Activity,
    title: "Actions survive the turn",
    body: "Pending actions remain recoverable after refresh, across clients, and through deferred signing.",
  },
  {
    icon: LockKeyhole,
    title: "Errors fail closed",
    body: "Public errors expose what the caller should do next without leaking private applications or wallet ownership.",
  },
] as const;

const sdkExample = `import { createAomiClient } from "@aomi-labs/client";
import { wagmi } from "@aomi-labs/client/wagmi";

const aomi = createAomiClient({
  app: "aomi",
  wallet: wagmi(config),
});

for await (const event of aomi.chat(
  "Move my USDC into the best yield on Base",
)) {
  if (event.type === "message") render(event.text);
  if (event.type === "action") await event.action.approve();
}`;

export default function RestApiProductPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.shell}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>AOMI REST APIs</p>
            <h1>Natural language in. Signable transactions out.</h1>
            <p className={styles.heroSupport}>
              Use our agent or bring your own. Aomi plans, fork-simulates, and
              applies execution policy. Your users&apos; wallets sign the exact
              sealed action.
            </p>
            <div className={styles.heroActions}>
              <Link href="#apis" className={styles.primaryButton}>
                Explore the APIs
                <ArrowRight aria-hidden />
              </Link>
              <a
                href="https://aomi.dev/docs/"
                target="_blank"
                rel="noreferrer"
                className={styles.secondaryButton}
              >
                Read the docs
                <ArrowUpRight aria-hidden />
              </a>
            </div>
            <p className={styles.heroNote}>
              EVM + Solana · guest or OAuth · keys stay with your signer
            </p>
          </div>

          <ApiWorkbench />
        </div>
      </section>

      <section className={styles.proofRail} aria-label="REST API facts">
        <div className={styles.shell}>
          <div>
            <span>Agent API</span>
            <strong>Our agent plans</strong>
          </div>
          <div>
            <span>Pipeline API</span>
            <strong>Your agent plans</strong>
          </div>
          <div>
            <span>Shared contract</span>
            <strong>One Action</strong>
          </div>
          <div>
            <span>Keys held by Aomi</span>
            <strong>Zero</strong>
          </div>
        </div>
      </section>

      <section id="apis" className={styles.apiSection}>
        <div className={styles.shell}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>TWO PORTS, ONE KERNEL</p>
              <h2>Choose who plans.</h2>
            </div>
            <p>
              Both APIs end at the same execution boundary. The difference is
              whether Aomi resolves the intent or your own agent selects the
              action.
            </p>
          </div>

          <div className={styles.apiCards}>
            <article className={styles.apiCard}>
              <div className={styles.apiCardTopline}>
                <span className={styles.apiIcon}>
                  <Bot aria-hidden />
                </span>
                <span className={styles.contractBadge}>V1 CONTRACT</span>
              </div>
              <p className={styles.apiIndex}>01 · OUR AGENT PLANS</p>
              <h3>Agent API</h3>
              <p className={styles.apiCardBody}>
                Send a user&apos;s intent and wallet capabilities. Receive
                messages, activity, and a durable action that can be approved by
                the signer already inside your product.
              </p>
              <div className={styles.endpointList}>
                <span>
                  <b>POST</b> /v1/agent/chat
                </span>
                <span>
                  <b>GET</b> /v1/agent/chat/{`{session}`}
                </span>
                <span>
                  <b>POST</b> .../actions/{`{action}`}/result
                </span>
              </div>
              <div className={styles.bestFor}>
                <span>BEST FOR</span>
                <strong>
                  Wallets, fintech apps, and conversational products
                </strong>
              </div>
            </article>

            <article className={`${styles.apiCard} ${styles.pipelineCard}`}>
              <div className={styles.apiCardTopline}>
                <span className={`${styles.apiIcon} ${styles.pipelineIcon}`}>
                  <Waypoints aria-hidden />
                </span>
                <span className={styles.previewBadge}>PREVIEW</span>
              </div>
              <p className={styles.apiIndex}>02 · YOUR AGENT PLANS</p>
              <h3>Pipeline API</h3>
              <p className={styles.apiCardBody}>
                Select a catalog action or assemble a batch directly. Receive a
                Plan containing the simulation verdict, typed guard checks, and
                unsigned signable—with no Aomi inference or chat session.
              </p>
              <div className={styles.endpointList}>
                <span>
                  <b>POST</b> /v1/pipeline/evm/build
                </span>
                <span>
                  <b>POST</b> /v1/pipeline/svm/build
                </span>
                <span>
                  <b>POST</b> .../{`{stage,simulate,commit}`}
                </span>
              </div>
              <div className={styles.bestFor}>
                <span>BEST FOR</span>
                <strong>
                  Trading harnesses, strategies, and third-party agents
                </strong>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className={styles.contractSection}>
        <div className={styles.shell}>
          <div className={styles.contractCopy}>
            <p className={styles.eyebrow}>THE SHARED CONTRACT</p>
            <h2>One Action crosses both APIs.</h2>
            <p>
              Agent chat and pipeline builds resolve into the same durable,
              sealed approval object. Integrate your wallet and confirmation UI
              once; move between the two APIs without rebuilding either.
            </p>
            <ul>
              <li>
                <Check aria-hidden /> Kernel-authored summary
              </li>
              <li>
                <Check aria-hidden /> EVM and SVM execution envelopes
              </li>
              <li>
                <Check aria-hidden /> Deferred and multisig-aware lifecycle
              </li>
            </ul>
          </div>

          <div className={styles.contractVisual}>
            <div className={styles.contractPorts}>
              <span>
                <Bot aria-hidden /> Agent event
              </span>
              <span>
                <Braces aria-hidden /> Pipeline Plan
              </span>
            </div>
            <div className={styles.contractLines} aria-hidden>
              <i />
              <i />
            </div>
            <article className={styles.summaryCard}>
              <div className={styles.summaryTopline}>
                <span>ACTION SUMMARY</span>
                <span>act_8f2…</span>
              </div>
              <h3>Swap 0.5 ETH for ~1,240 USDC</h3>
              <div className={styles.summarySteps}>
                <div>
                  <span>01</span>
                  <p>
                    <strong>Swap through Uniswap v3</strong>
                    <small>0.5 ETH out · ~1,240 USDC in</small>
                  </p>
                </div>
                <div>
                  <span>02</span>
                  <p>
                    <strong>Settle to your wallet</strong>
                    <small>Base · minimum received enforced</small>
                  </p>
                </div>
              </div>
              <div className={styles.summaryMeta}>
                <span>
                  GAS <b>Sponsored</b>
                </span>
                <span>
                  WARNINGS <b>None</b>
                </span>
              </div>
            </article>
            <p className={styles.sealedNote}>
              <ShieldCheck aria-hidden /> Summary and payload sealed together
            </p>
          </div>
        </div>
      </section>

      <section className={styles.lifecycleSection}>
        <div className={styles.shell}>
          <div className={styles.lifecycleHeading}>
            <p className={styles.eyebrow}>THE GUARDED LIFECYCLE</p>
            <h2>More than encode and simulate.</h2>
            <p>
              Every surface runs through the same enforcement path used by
              Aomi&apos;s own product.
            </p>
          </div>
          <ol className={styles.lifecycleGrid}>
            {lifecycle.map((step) => (
              <li key={step.number}>
                <span>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={styles.sdkSection}>
        <div className={styles.shell}>
          <div className={styles.sdkCode}>
            <div className={styles.codeTopline}>
              <span>agent.ts</span>
              <span>@aomi-labs/client</span>
            </div>
            <pre>
              <code>{sdkExample}</code>
            </pre>
          </div>
          <div className={styles.sdkCopy}>
            <p className={styles.eyebrow}>THE TYPESCRIPT CLIENT</p>
            <h2>Bind a wallet once. Actions resolve themselves.</h2>
            <p>
              The client hides sessions, cursors, retries, idempotency keys, and
              signature routing. Your team renders messages and one confirmation
              surface; Aomi carries the execution state.
            </p>
            <div className={styles.adapterRow}>
              <span>
                <WalletCards aria-hidden /> wagmi
              </span>
              <span>Para</span>
              <span>Privy</span>
              <span>Safe</span>
              <span>Turnkey</span>
            </div>
            <a
              href="https://aomi.dev/docs/"
              target="_blank"
              rel="noreferrer"
              className={styles.textLink}
            >
              Explore the client surface
              <ArrowUpRight aria-hidden />
            </a>
          </div>
        </div>
      </section>

      <section className={styles.guaranteeSection}>
        <div className={styles.shell}>
          <div className={styles.guaranteeHeading}>
            <p className={styles.eyebrow}>CONTRACT GUARANTEES</p>
            <h2>Safe to retry. Hard to misrepresent.</h2>
          </div>
          <div className={styles.guaranteeGrid}>
            {guarantees.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title}>
                  <Icon aria-hidden />
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className={styles.finalCta}>
        <div className={styles.shell}>
          <div>
            <p className={styles.eyebrow}>BUILD ON THE KERNEL</p>
            <h2>Start with intent. Drop down to precision when you need it.</h2>
          </div>
          <div className={styles.finalActions}>
            <a
              href="https://aomi.dev/docs/"
              target="_blank"
              rel="noreferrer"
              className={styles.finalPrimary}
            >
              Read API documentation
              <ArrowUpRight aria-hidden />
            </a>
            <Link href="../contact" className={styles.finalSecondary}>
              Talk to us
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
