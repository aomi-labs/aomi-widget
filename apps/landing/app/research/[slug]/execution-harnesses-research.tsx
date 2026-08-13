import Link from "next/link";
import { AomiLogo } from "../../components/aomi-logo";
import type { ResearchPost } from "@/lib/research";
import styles from "./execution-harnesses-research.module.css";

type Props = {
  post: ResearchPost & { body: string };
};

const sections = [
  ["01", "The walking era"],
  ["02", "What a harness is"],
  ["03", "The market stack"],
  ["04", "The fragmented field"],
  ["05", "The economic argument"],
  ["06", "How to measure it"],
  ["07", "Where Aomi fits"],
] as const;

const harnessCapabilities = [
  [
    "01",
    "Interpret",
    "Bind a goal to assets, counterparties, timing, budget, and desired state.",
  ],
  [
    "02",
    "Select",
    "Choose tools, protocols, routes, and payment methods from a controlled catalog.",
  ],
  [
    "03",
    "Construct",
    "Produce exact orders, calldata, approvals, batches, and payment payloads.",
  ],
  [
    "04",
    "Simulate",
    "Test the concrete action against relevant state before authority is requested.",
  ],
  [
    "05",
    "Authorize",
    "Hand an immutable request to a wallet or policy boundary that can refuse.",
  ],
  [
    "06",
    "Execute",
    "Submit once, manage idempotency, and distinguish partial from complete work.",
  ],
  [
    "07",
    "Reconcile",
    "Compare receipts and final state with the original objective and preserve evidence.",
  ],
] as const;

const stackLayers = [
  [
    "1",
    "Agent surfaces",
    "Capture goals and context",
    "ChatGPT, Gemini, commerce agents, Aomi Apps",
  ],
  [
    "2",
    "Runtime and orchestration",
    "Own sessions, tools, state, retries, and multistep work",
    "Aomi, agent frameworks, Bankr, Virtuals",
  ],
  [
    "3",
    "Domain execution",
    "Construct exact financial and onchain operations",
    "Aomi, AgentKit, 1inch, deBridge, Crossmint",
  ],
  [
    "4",
    "Identity, mandates, wallets",
    "Bind authority, limits, credentials, and signing",
    "AP2, Coinbase, MetaMask, Privy, Turnkey, Safe",
  ],
  [
    "5",
    "Payment coordination",
    "Describe price, acceptance, proof, and delivery",
    "x402, MPP, ACP, UCP",
  ],
  [
    "6",
    "Money, funding, treasury",
    "Supply balances, cards, stablecoins, FX, and accounting",
    "Issuers, processors, banks, onramps",
  ],
  [
    "7",
    "Settlement rails",
    "Finalize value movement and record resulting state",
    "Chains, card networks, bank rails",
  ],
] as const;

const protocolFamilies = [
  {
    title: "Tool and agent communication",
    examples: "MCP · A2A",
    job: "Expose capabilities and coordinate software.",
    boundary: "Not payment rails or execution assurance.",
  },
  {
    title: "Machine payments",
    examples: "x402 · MPP",
    job: "Let software pay for an API, resource, session, or service.",
    boundary: "Does not determine whether the purchase is correct or safe.",
  },
  {
    title: "Commerce workflows",
    examples: "ACP · UCP",
    job: "Coordinate discovery, cart, checkout, fulfillment, and returns.",
    boundary: "Not wallets, money, or final settlement.",
  },
  {
    title: "Mandates and trust",
    examples: "AP2 · Visa TAP · Mastercard Agent Pay",
    job: "Prove identity, intent, scope, and delegated authority.",
    boundary: "Does not construct or verify the financial action itself.",
  },
] as const;

const marketRows = [
  [
    "General-purpose agents",
    "Reason across arbitrary tools and websites",
    "Broad reach; repeated discovery and recovery work",
    "Claude, Codex, general agent frameworks",
  ],
  [
    "Crypto action toolkits",
    "Expose wallet and protocol actions to agents",
    "Action availability; lifecycle ownership varies",
    "Coinbase AgentKit, GOAT, protocol MCP servers",
  ],
  [
    "Payment protocols",
    "Coordinate payment requests and acceptance",
    "The handshake, not the whole execution path",
    "x402, MPP",
  ],
  [
    "Wallet and mandate systems",
    "Hold credentials and enforce authority",
    "Can refuse; usually cannot judge semantic task success",
    "MetaMask, Coinbase, Privy, Turnkey, Safe, AP2",
  ],
  [
    "Vertical execution systems",
    "Own routes or workflows in one domain",
    "Strong domain depth; narrower action surface",
    "1inch, deBridge, Crossmint, Bankr",
  ],
  [
    "Execution runtimes",
    "Own state from intent through verified request and reconciliation",
    "The emerging harness category",
    "Aomi",
  ],
] as const;

const benchmarkMetrics = [
  ["Task success", "Did the requested financial state change occur?"],
  [
    "Tokens per verified outcome",
    "How much model reasoning was consumed by completed work?",
  ],
  ["Time to completion", "How long from intent to reconciled result?"],
  [
    "Tool calls and retries",
    "How much operational wandering and recovery occurred?",
  ],
  [
    "Human interventions",
    "How often did the system require rescue rather than intentional approval?",
  ],
  [
    "Unsafe proposals blocked",
    "Did the system reject structurally valid but harmful actions?",
  ],
  [
    "Simulation consistency",
    "Was the signed payload the reviewed payload, and did execution match simulation?",
  ],
  [
    "Duplicate-broadcast rate",
    "Did retries create repeated payments or transactions?",
  ],
] as const;

function SourceLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={styles.sourceLink}
    >
      {children}
    </a>
  );
}

function SectionHeading({
  number,
  label,
  children,
}: {
  number: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.sectionHeading}>
      <div className={styles.sectionLabel}>
        <b>{number}</b>
        <span>{label}</span>
      </div>
      <h2>{children}</h2>
    </div>
  );
}

function Figure({
  number,
  title,
  subtitle,
  children,
  caption,
}: {
  number: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  caption: React.ReactNode;
}) {
  return (
    <figure className={styles.figure}>
      <div className={styles.figureHeader}>
        <span>Figure {number}</span>
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
      <div className={styles.figureBody}>{children}</div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

export function ExecutionHarnessesResearch({ post }: Props) {
  return (
    <main className={styles.page}>
      <article>
        <header className={styles.hero}>
          <div className={styles.topline}>
            <Link href="/" aria-label="Aomi home">
              <AomiLogo
                className={styles.logo}
                markClassName={styles.logoMark}
              />
            </Link>
            <span>Research · {post.date}</span>
          </div>
          <div className={styles.eyebrow}>
            Agentic payments · market structure
          </div>
          <h1>The State of Execution Harnesses for Agentic Payments</h1>
          <p className={styles.dek}>
            Why better models alone will not make financial agents efficient,
            reliable, or operational—and why execution infrastructure becomes
            the next essential layer.
          </p>
          <div className={styles.heroGrid}>
            <div>
              <p>
                General-purpose agents can already reach financial destinations.
                They can browse documentation, call tools, construct requests,
                and recover from mistakes. But they often do so the way a person
                travels on foot: one uncertain step at a time, repeatedly paying
                in reasoning, tokens, latency, and operational risk.
              </p>
              <p>
                This report argues that agentic payments are entering an{" "}
                <b>execution-harness phase</b>. The model remains the
                intelligence. The harness turns repeated financial reasoning
                into tested machinery: typed actions, protocol-aware
                construction, simulation, authorization handoffs, state
                management, idempotency, and outcome verification.
              </p>
            </div>
            <aside className={styles.thesis}>
              <span>Research thesis</span>
              <p>
                As the market matures, execution harnesses become standard
                infrastructure. Their interfaces may commoditize; execution
                quality will not.
              </p>
            </aside>
          </div>
          <nav className={styles.index} aria-label="Report sections">
            {sections.map(([number, label]) => (
              <a key={number} href={`#s${number}`}>
                <span>{number}</span>
                {label}
              </a>
            ))}
          </nav>
        </header>

        <section className={styles.intro}>
          <h2>Executive conclusion</h2>
          <p>
            The market has named protocols, wallets, mandates, stablecoins, and
            settlement networks. It has not yet consistently named the system
            responsible for getting from an agent&apos;s adaptive plan to a
            concrete, verified financial outcome. We call that system the{" "}
            <b>execution harness</b>.
          </p>
          <p>
            The need follows from a structural mismatch. Models are
            probabilistic; financial authorization and settlement require
            reproducible controls, inspectable payloads, and clear
            accountability. The IMF&apos;s 2026 payment model formalizes this
            separation across intent and orchestration, control and
            authorization, and settlement. Our analysis expands the middle of
            that journey: between intent and authority lies a large body of
            execution work that cannot be delegated to a payment handshake or a
            signer alone.
          </p>
          <div className={styles.methodology}>
            <div>
              <b>Method</b>
              <span>
                Architecture analysis, product and protocol documentation,
                onchain market evidence, and Aomi&apos;s operating perspective.
              </span>
            </div>
            <div>
              <b>Scope</b>
              <span>
                Agent-initiated payments, crypto-native financial actions,
                wallets, mandates, runtimes, protocols, and settlement.
              </span>
            </div>
            <div>
              <b>Constraint</b>
              <span>
                The same-model harness advantage is a testable thesis. This
                report defines the benchmark; it does not invent an unrun
                result.
              </span>
            </div>
          </div>
        </section>

        <section className={styles.section} id="s01">
          <SectionHeading number="01" label="The walking era">
            The same model should travel farther with less work
          </SectionHeading>
          <p>
            The current agentic-payment stack is capable but fragmented. A
            sufficiently strong model can discover a service, infer its
            interface, choose a route, create a payment, recover from errors,
            and verify a result. That is real progress. It is also an expensive
            use of probabilistic intelligence for work that mature systems
            eventually encode in software.
          </p>
          <p>
            The useful comparison is not a weak model with infrastructure
            against a strong model without it. It is{" "}
            <b>the same athlete on the same course</b>. If the same model
            completes more tasks with fewer tokens, less time, fewer retries,
            and stronger end-state evidence when using a harness, the harness
            created measurable economic value.
          </p>
          <Figure
            number="01"
            title="The model is the athlete; the harness is the vehicle"
            subtitle="A research hypothesis that holds model and task constant."
            caption={
              <>
                A capable model may keep walking faster. A battle-tested vehicle
                should still reduce the amount of cognition spent on navigation,
                mechanics, and recovery. The claim is only credible when
                measured with the same model, task set, signer policy, and
                market state.
              </>
            }
          >
            <div className={styles.athleteHeader}>
              <span>Same model</span>
              <b>Claude · Codex · Gemini · frontier agent</b>
            </div>
            <div className={styles.travelGrid}>
              <div className={styles.travelLane}>
                <div className={styles.travelTitle}>
                  <span>Baseline</span>
                  <b>Walk through generic tools</b>
                </div>
                <div className={styles.route}>
                  {[
                    "discover docs",
                    "infer schema",
                    "choose tool",
                    "construct",
                    "retry",
                    "verify",
                  ].map((x) => (
                    <span key={x}>{x}</span>
                  ))}
                </div>
                <p>
                  Reasoning repeatedly absorbs integration details and failure
                  recovery.
                </p>
              </div>
              <div className={`${styles.travelLane} ${styles.vehicle}`}>
                <div className={styles.travelTitle}>
                  <span>Harnessed</span>
                  <b>Ride a tested execution path</b>
                </div>
                <div className={styles.route}>
                  {[
                    "intent",
                    "typed plan",
                    "simulate",
                    "authorize",
                    "execute",
                    "reconcile",
                  ].map((x) => (
                    <span key={x}>{x}</span>
                  ))}
                </div>
                <p>
                  Software carries known mechanics; model reasoning concentrates
                  on judgment.
                </p>
              </div>
            </div>
            <div className={styles.dominanceBar}>
              <b>A good harness must earn its abstraction</b>
              <span>
                higher completion · fewer tokens · lower latency · fewer retries
                · stronger evidence
              </span>
            </div>
          </Figure>
        </section>

        <section className={styles.section} id="s02">
          <SectionHeading number="02" label="What a harness is">
            A harness owns the execution lifecycle, not merely a tool call
          </SectionHeading>
          <p>
            An execution harness is the runtime machinery that converts intent
            into a bounded, inspectable, and reconcilable financial action. A
            toolkit can expose functions. A protocol can describe a payment
            request. A wallet can enforce authority. A rail can settle. The
            harness coordinates the work between those components and preserves
            state across the full task.
          </p>
          <Figure
            number="02"
            title="The seven responsibilities of a financial execution harness"
            subtitle="The lifecycle begins before a payment payload exists and ends after settlement."
            caption={
              <>
                The critical artifact is not merely a transaction hash. It is an
                evidence chain connecting original intent, selected tool,
                reviewed payload, authorization decision, signer, receipt, and
                final state.
              </>
            }
          >
            <div className={styles.capabilityRail}>
              {harnessCapabilities.map(([number, title, copy]) => (
                <div key={number} className={styles.capability}>
                  <span>{number}</span>
                  <b>{title}</b>
                  <p>{copy}</p>
                </div>
              ))}
            </div>
            <div className={styles.boundaryBand}>
              <span>Probabilistic selection and planning</span>
              <span>Deterministic authority, execution, and state</span>
            </div>
          </Figure>
          <div className={styles.definitionGrid}>
            <div>
              <b>A harness is more than a toolkit</b>
              <p>
                It owns lifecycle, state, recovery, evidence, and completion—not
                only a catalog of callable actions.
              </p>
            </div>
            <div>
              <b>A harness is broader than a policy layer</b>
              <p>
                Policies are essential controls inside execution, but they do
                not construct, simulate, complete, or reconcile the task.
              </p>
            </div>
            <div>
              <b>A harness is separate from the wallet</b>
              <p>
                The harness prepares and verifies a request. The wallet remains
                the authority boundary with the power to refuse.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.section} id="s03">
          <SectionHeading number="03" label="The market stack">
            Agentic payments are a stack, not one market
          </SectionHeading>
          <p>
            The category becomes easier to reason about once each layer is
            assigned one job. The IMF separates probabilistic intent from
            deterministic authorization and settlement. Commercially, the stack
            is expanding into seven layers. Execution harnesses sit primarily in
            runtime orchestration and domain execution while integrating—without
            replacing—wallets, protocols, money, and rails.
          </p>
          <Figure
            number="03"
            title="Seven layers from demand to settlement"
            subtitle="Aomi's primary band is runtime orchestration plus domain execution."
            caption={
              <>
                Initiating a task is not the same as constructing it.
                Constructing it is not the same as authorizing it. Authorizing
                it is not the same as settling it. Mature systems keep those
                responsibilities explicit.
              </>
            }
          >
            <div className={styles.stack}>
              {stackLayers.map(([n, name, job, actors]) => (
                <div
                  key={n}
                  className={`${styles.layer} ${n === "2" || n === "3" ? styles.aomiLayer : ""}`}
                >
                  <span>{n}</span>
                  <b>{name}</b>
                  <p>{job}</p>
                  <small>{actors}</small>
                </div>
              ))}
            </div>
            <div className={styles.horizontal}>
              <b>Horizontal assurance</b>
              <span>simulation</span>
              <span>compliance</span>
              <span>threat detection</span>
              <span>observability</span>
              <span>reconciliation</span>
              <span>disputes</span>
            </div>
          </Figure>
        </section>

        <section className={styles.section} id="s04">
          <SectionHeading number="04" label="The fragmented field">
            Most products solve one responsibility—and should say which one
          </SectionHeading>
          <p>
            Several protocol families are routinely grouped together despite
            solving different problems. MCP and A2A coordinate software. x402
            and MPP coordinate machine payment. ACP and UCP coordinate commerce.
            AP2 and card-network programs coordinate trust and delegated
            authority. None independently provides the complete execution
            lifecycle.
          </p>
          <Figure
            number="04"
            title="Four protocol families, four jobs"
            subtitle="Complementary standards are often mistaken for competing full-stack answers."
            caption={
              <>
                x402 and MPP can make a payment easier to request and accept.
                They do not determine whether the underlying purchase is
                sensible, whether an onchain operation produces the intended
                state, or whether offchain delivery occurred.
              </>
            }
          >
            <div className={styles.protocolGrid}>
              {protocolFamilies.map((x) => (
                <div key={x.title} className={styles.protocol}>
                  <b>{x.title}</b>
                  <p>{x.job}</p>
                  <span>{x.examples}</span>
                  <small>Not: {x.boundary}</small>
                </div>
              ))}
            </div>
          </Figure>
          <div className={styles.tableWrap}>
            <table className={styles.marketTable}>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Primary value</th>
                  <th>Execution-harness boundary</th>
                  <th>Representative actors</th>
                </tr>
              </thead>
              <tbody>
                {marketRows.map((row) => (
                  <tr key={row[0]}>
                    {row.map((cell, i) => (
                      <td key={cell}>{i === 0 ? <b>{cell}</b> : cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            This field is likely to remain modular. Wallets have distribution
            and authority. Protocols have acceptance semantics. Vertical
            providers have route and venue depth. General runtimes have breadth.
            The emerging harness layer competes on how reliably it composes
            those pieces into completed work.
          </p>
        </section>

        <section className={styles.section} id="s05">
          <SectionHeading number="05" label="The economic argument">
            Token efficiency turns execution architecture into product economics
          </SectionHeading>
          <p>
            Model tokens are not the only cost, but they expose the core
            inefficiency. When an agent repeatedly rereads documentation,
            reconstructs schemas, reasons through allowance mechanics, retries
            stale routes, or determines whether a task actually finished, the
            system is buying cognition to compensate for missing infrastructure.
          </p>
          <div className={styles.economicsGrid}>
            <div>
              <span>01</span>
              <b>Move repeated cognition into software</b>
              <p>
                Stable protocol knowledge, typed interfaces, and deterministic
                checks should not be rediscovered on every run.
              </p>
            </div>
            <div>
              <span>02</span>
              <b>Compress the failure surface</b>
              <p>
                Simulation, idempotency, payload binding, and state
                reconciliation remove entire classes of expensive recovery.
              </p>
            </div>
            <div>
              <span>03</span>
              <b>Make operations legible</b>
              <p>
                Teams need receipts, traces, exceptions, and end-state
                evidence—not only fluent agent transcripts.
              </p>
            </div>
            <div>
              <span>04</span>
              <b>Preserve model optionality</b>
              <p>
                A stable harness lets operators improve or replace the athlete
                without rebuilding the vehicle around one model.
              </p>
            </div>
          </div>
          <blockquote className={styles.pullquote}>
            Execution harnesses will become ubiquitous. Good execution harnesses
            will not become commodities.
          </blockquote>
          <p>
            Interfaces and baseline actions will standardize. Performance will
            continue to differ in protocol coverage, construction quality,
            simulation fidelity, recovery behavior, latency, and semantic
            outcome verification. Buyers will not pay merely for “agent access.”
            They will pay for more verified outcomes per unit of time, money,
            and human attention.
          </p>
        </section>

        <section className={styles.section}>
          <SectionHeading number="05A" label="Market evidence">
            Machine payments are live; the autonomous economy remains early
          </SectionHeading>
          <p>
            x402 demonstrates that machines can pay for HTTP resources at scale.
            Chainalysis measured more than 100 million cumulative x402
            transactions on Base through Q1 2026, while also finding that
            meme-coin pay-to-mint activity drove much of the earlier surge. Its
            conclusion is appropriately balanced: the protocol moved beyond
            proof of concept, but mass adoption remained distant.
          </p>
          <Figure
            number="05"
            title="Technical usage is not the same as durable autonomous demand"
            subtitle="The market has activity; the quality of that activity matters."
            caption={
              <>
                Transaction counts demonstrate technical use and early demand.
                Durable adoption should be judged by useful services, repeat
                purchasers, completed tasks, low intervention, merchant revenue,
                and verifiable delivery.
              </>
            }
          >
            <div className={styles.evidenceGrid}>
              <div>
                <strong>100M+</strong>
                <span>
                  cumulative x402 transactions on Base through Q1 2026
                </span>
                <small>Chainalysis</small>
              </div>
              <div className={styles.caveat}>
                <b>The caveat travels with the number</b>
                <p>
                  Speculative loops can prove throughput without proving a
                  durable agent economy.
                </p>
              </div>
            </div>
            <div className={styles.signalGrid}>
              {[
                "Recurring funded agents",
                "Repeat service purchases",
                "Completed tasks",
                "Low intervention rates",
                "Merchant revenue",
                "Verifiable delivery",
              ].map((x) => (
                <span key={x}>✓ {x}</span>
              ))}
            </div>
          </Figure>
          <p>
            The strongest current wedge remains software buying digital
            resources while completing a task: API access, inference, data,
            compute, storage, browser sessions, or specialist services. x402
            makes accountless HTTP payment possible; MPP extends machine payment
            into Stripe&apos;s existing merchant stack, including
            microtransactions, recurring payments, stablecoins, cards,
            reporting, tax, and refunds. These protocols make acceptance easier.
            They increase, rather than remove, the need for reliable execution
            around them.
          </p>
        </section>

        <section className={styles.section} id="s06">
          <SectionHeading number="06" label="How to measure it">
            The same-athlete test should become the category benchmark
          </SectionHeading>
          <p>
            The harness thesis is falsifiable. Hold the model, prompt, task set,
            wallet policy, starting state, and market conditions constant.
            Compare the baseline agent with the harnessed agent. Score the
            world&apos;s end state—not whether the transcript sounds competent.
          </p>
          <Figure
            number="06"
            title="A benchmark for execution leverage"
            subtitle="The unit of value is a verified outcome, not a tool call or a transaction count."
            caption={
              <>
                A harness that hides failures, increases retries, or constrains
                a capable model without improving outcomes has not earned its
                abstraction. The standard should be strict: same athlete,
                measurably better system performance.
              </>
            }
          >
            <div className={styles.benchmarkGrid}>
              {benchmarkMetrics.map(([metric, question]) => (
                <div key={metric}>
                  <b>{metric}</b>
                  <p>{question}</p>
                </div>
              ))}
            </div>
            <div className={styles.formula}>
              <span>Execution leverage</span>
              <b>verified outcomes</b>
              <i>÷</i>
              <b>tokens + time + failures + intervention</b>
            </div>
          </Figure>
          <p>
            This framing also changes procurement. Teams should compare
            harnesses on task suites drawn from their actual financial
            operations: pay for a resource, complete checkout, swap, bridge,
            approve, batch, recover from stale state, handle a rejected
            signature, and reconcile the final portfolio. Coverage lists are
            inputs; verified completion is the result.
          </p>
        </section>

        <section className={styles.section}>
          <SectionHeading number="06A" label="The missing proof">
            No existing component can verify the whole task alone
          </SectionHeading>
          <Figure
            number="07"
            title="Wallet, simulator, and rail each prove something different"
            subtitle="Verified execution is the connective evidence layer."
            caption={
              <>
                A payment function is insufficient. The system must connect
                semantic intent to an immutable payload, a valid authorization,
                a settlement record, and the resulting state.
              </>
            }
          >
            <div className={styles.proverGrid}>
              <div>
                <b>The wallet</b>
                <p>
                  <span>CAN</span> enforce limits, allowlists, session scope,
                  and refusal.
                </p>
                <p>
                  <em>CANNOT</em> determine whether a swap&apos;s parameters
                  satisfy the user&apos;s actual objective.
                </p>
              </div>
              <div>
                <b>The simulator</b>
                <p>
                  <span>CAN</span> show whether a concrete transaction succeeds
                  against current state.
                </p>
                <p>
                  <em>CANNOT</em> independently know whether success is the
                  result the task required.
                </p>
              </div>
              <div>
                <b>The settlement rail</b>
                <p>
                  <span>CAN</span> prove that value movement finalized under its
                  rules.
                </p>
                <p>
                  <em>CANNOT</em> prove that an offchain service delivered the
                  promised work.
                </p>
              </div>
            </div>
            <div className={styles.verifiedBox}>
              <b>Verified execution</b>
              <p>
                construction · simulation · authorization boundary · immutable
                payload · execution state · outcome assertions · reconciliation
              </p>
            </div>
          </Figure>
        </section>

        <section className={styles.section} id="s07">
          <SectionHeading number="07" label="Where Aomi fits">
            Aomi is an onchain agent execution runtime
          </SectionHeading>
          <p>
            Aomi&apos;s primary position spans runtime orchestration and domain
            execution. It hosts the agent loop, tools, sessions, state, and
            multistep workflow; translates intent into typed actions and
            transactions; simulates expected outcomes; and prepares a verified
            request for an external signer. The wallet remains the authorization
            boundary. The chain remains the settlement rail.
          </p>
          <Figure
            number="08"
            title="Intent → verified request → authority → settlement"
            subtitle="Each responsibility stays with the component that can actually discharge it."
            caption={
              <>
                Protocols such as x402 become tools available to an Aomi agent.
                Wallets provide signing and authority. Stablecoins provide
                value. Blockchains provide settlement. Aomi coordinates the work
                required to move safely from intent to outcome.
              </>
            }
          >
            <div className={styles.aomiFlow}>
              <div>
                <span>Demand</span>
                <b>Agent intent</b>
                <p>
                  Goal, budget, timing, route constraints, and desired result.
                </p>
              </div>
              <i>→</i>
              <div className={styles.aomiCore}>
                <AomiLogo
                  className={styles.flowLogo}
                  markClassName={styles.flowMark}
                />
                <b>Execution runtime</b>
                <p>plan · tools · construct · simulate · verify · reconcile</p>
              </div>
              <i>→</i>
              <div>
                <span>Authority</span>
                <b>Wallet and policy</b>
                <p>Identity, consent, limits, risk, and the power to refuse.</p>
              </div>
              <i>→</i>
              <div>
                <span>Finality</span>
                <b>Funding and rails</b>
                <p>Stablecoin, card, bank, or chain settlement.</p>
              </div>
            </div>
            <div className={styles.ownershipGrid}>
              <div>
                <b>Aomi owns</b>
                <p>
                  Runtime, tool orchestration, construction, simulation,
                  execution state, and evidence.
                </p>
              </div>
              <div>
                <b>Aomi integrates</b>
                <p>
                  Wallets, identity, compliance, payment protocols, stablecoins,
                  treasury, and rails.
                </p>
              </div>
              <div>
                <b>Aomi is not</b>
                <p>
                  A custodian, issuer, payment standard, card network, or
                  settlement chain.
                </p>
              </div>
            </div>
          </Figure>
          <div className={styles.disclosure}>
            <b>Researcher&apos;s disclosure</b>
            <p>
              Aomi is building in the category analyzed in this report. Our
              position is therefore not neutral. We have separated externally
              sourced market observations from our product thesis, avoided
              presenting an unrun benchmark as a result, and stated the
              conditions under which the thesis should be rejected.
            </p>
          </div>
        </section>

        <section className={`${styles.section} ${styles.outlook}`}>
          <h2>Outlook: from autonomous payment to accountable execution</h2>
          <p>
            The agentic economy will not emerge simply because models receive
            wallets. It will emerge when software can form an intent, construct
            a valid action, operate within delegated authority, settle through
            the appropriate rail, and produce evidence that the requested
            outcome occurred.
          </p>
          <div className={styles.roles}>
            <div>
              <b>The agent</b>
              <span>proposes</span>
            </div>
            <div className={styles.hot}>
              <b>The runtime</b>
              <span>executes</span>
            </div>
            <div>
              <b>The wallet</b>
              <span>authorizes</span>
            </div>
            <div>
              <b>The rail</b>
              <span>settles</span>
            </div>
          </div>
          <p>
            Agentic payments are the first visible use case. The larger
            opportunity is generalized financial execution. As models improve,
            they will become better athletes. The systems around them still need
            reliable vehicles.
          </p>
        </section>

        <section className={styles.sources}>
          <h2>Sources and methodology notes</h2>
          <p>
            Research date: August 13, 2026. Product and protocol descriptions
            were checked against first-party documentation; adoption evidence
            was separated from product claims. Market categories are analytical
            and companies may span multiple layers.
          </p>
          <div className={styles.sourceColumns}>
            <div>
              <b>Architecture and policy</b>
              <SourceLink href="https://www.imf.org/en/-/media/files/publications/imf-notes/2026/english/insea2026004.pdf">
                IMF — How Agentic AI Will Reshape Payments
              </SourceLink>
              <SourceLink href="https://cloud.google.com/blog/products/ai-machine-learning/announcing-agents-to-payments-ap2-protocol">
                Google — Agent Payments Protocol
              </SourceLink>
            </div>
            <div>
              <b>Protocols and market evidence</b>
              <SourceLink href="https://docs.x402.org/introduction">
                x402 documentation
              </SourceLink>
              <SourceLink href="https://stripe.com/blog/machine-payments-protocol">
                Stripe and Tempo — MPP
              </SourceLink>
              <SourceLink href="https://www.chainalysis.com/blog/x402-agentic-payments-adoption/">
                Chainalysis — x402 adoption on Base
              </SourceLink>
            </div>
            <div>
              <b>Execution systems</b>
              <SourceLink href="https://docs.cdp.coinbase.com/agent-kit/core-concepts/architecture-explained">
                Coinbase AgentKit architecture
              </SourceLink>
              <SourceLink href="https://aomi.dev/docs/reference/runtime">
                Aomi runtime documentation
              </SourceLink>
              <SourceLink href="https://aomi.dev/docs/build/overview">
                Aomi build overview
              </SourceLink>
            </div>
            <div>
              <b>Underlying research</b>
              <SourceLink href="https://app.notion.com/p/3ba36be0954d816784a4e7b25ba2949b?pvs=204">
                Agentic Payments in Crypto — Ecosystem Deep Dive
              </SourceLink>
              <SourceLink href="https://claude.ai/code/artifact/feae900e-4638-4ece-9a6b-72a546d9dd4e">
                Agentic Payments Are Not One Market — visual companion
              </SourceLink>
            </div>
          </div>
        </section>

        <footer className={styles.footer}>
          <AomiLogo
            className={styles.footerLogo}
            markClassName={styles.footerMark}
          />
          <h2>Agents do not merely need a new way to pay.</h2>
          <p>
            They need a trustworthy environment in which money can become
            action.
          </p>
          <Link href="/docs/build/overview">
            Explore the Aomi execution runtime <span>→</span>
          </Link>
          <small>Aomi Research · August 2026</small>
        </footer>
      </article>
    </main>
  );
}
