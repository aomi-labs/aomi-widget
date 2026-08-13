import type { ReactNode } from "react";
import Link from "next/link";
import { AomiLogo } from "../../components/aomi-logo";
import type { ResearchPost } from "@/lib/research";
import styles from "./execution-harnesses-research.module.css";

type Props = {
  post: ResearchPost & { body: string };
};

const layers = [
  [
    "01",
    "Agent surfaces",
    "Capture goals, context, preferences, and consent",
    "ChatGPT, Gemini, Bankr, Virtuals, partner apps",
  ],
  [
    "02",
    "Runtime and orchestration",
    "Own the model loop, tools, state, retries, and multistep work",
    "Aomi, AgentKit, GOAT, ElizaOS, cloud agent runtimes",
  ],
  [
    "03",
    "Domain execution",
    "Turn plans into exact orders, calls, transactions, and verified state changes",
    "Aomi, 1inch, deBridge, Uniswap, Crossmint, exchanges",
  ],
  [
    "04",
    "Identity, mandates, wallets",
    "Bind identity and delegated authority; hold credentials and refuse requests",
    "AP2, Coinbase, MetaMask, Privy, Turnkey, Safe",
  ],
  [
    "05",
    "Payment coordination",
    "Describe price, accepted methods, proof, and delivery",
    "x402, MPP, ACP, UCP",
  ],
  [
    "06",
    "Money, funding, treasury",
    "Supply balances, stablecoins, cards, FX, liquidity, and accounting",
    "Circle, Stripe, Bridge, Coinbase, Crossmint, banks",
  ],
  [
    "07",
    "Settlement rails",
    "Finalize value movement and record resulting state",
    "Base, Solana, Ethereum L2s, Tempo, card and bank networks",
  ],
] as const;

const useCases = [
  [
    "Pay-per-call APIs, data, inference, and compute",
    "x402, MPP, stablecoins",
    "Early production",
    "Strongest current product-market fit; the good being purchased is already digital and machine-readable.",
  ],
  [
    "Browser, storage, and infrastructure sessions",
    "MPP, x402, cards, stablecoins",
    "Early production",
    "Metered, ephemeral resources fit machine-speed authorization and reconciliation.",
  ],
  [
    "Agent-to-agent services",
    "x402, MPP, marketplaces",
    "Emerging",
    "Discovery, reputation, delivery proof, and dispute handling remain weak.",
  ],
  [
    "Consumer shopping, travel, and subscriptions",
    "ACP, UCP, AP2 plus existing rails",
    "Expanding launches",
    "Merchant operations, refunds, tax, and fulfillment matter more than rail novelty.",
  ],
  [
    "DeFi trading and portfolio execution",
    "Agent wallets, smart accounts, chains",
    "Live, high risk",
    "Execution is technically mature; semantic and authorization risk remain material.",
  ],
  [
    "Corporate procurement and expense",
    "Agent cards, mandates, ERP-connected processors",
    "Emerging enterprise",
    "The value lies in sourcing, budget enforcement, receipt capture, and exception handling.",
  ],
  [
    "Treasury, FX, and cross-border routing",
    "Stablecoins, banks, cards, local rails",
    "Pilot stage",
    "High regulatory, liquidity, accounting, and liability burden.",
  ],
] as const;

const actors = [
  [
    "Agent surfaces and commerce",
    "OpenAI, Google, Amazon, PayPal, Bankr, Virtuals",
    "Own demand, context, and distribution; increasingly initiate checkout or service procurement.",
  ],
  [
    "General runtimes and toolkits",
    "Aomi, Coinbase AgentKit, GOAT, ElizaOS, cloud frameworks",
    "Run agents and expose actions. Lifecycle ownership ranges from tool access to full stateful execution.",
  ],
  [
    "Domain execution specialists",
    "1inch, deBridge, Uniswap, Kraken, Crossmint",
    "Own venue, liquidity, checkout, or protocol depth; supply routes and guarantees to broader runtimes.",
  ],
  [
    "Wallets and authority",
    "Coinbase, MetaMask, OKX, Circle, Privy, Turnkey, Safe, Fireblocks",
    "Protect keys, enforce mandates and limits, screen risk, escalate, sign, and preserve audit evidence.",
  ],
  [
    "Payment and commerce protocols",
    "x402, MPP, ACP, UCP, AP2",
    "Standardize distinct handshakes: machine payment, commerce workflow, or delegated mandate.",
  ],
  [
    "Money and orchestration",
    "Circle, Stripe, Bridge, Coinbase, Crossmint, BVNK, Zero Hash",
    "Provide stablecoins, accounts, onramps, treasury, reporting, tax, refunds, and cross-rail routing.",
  ],
  [
    "Networks and assurance",
    "Base, Solana, Ethereum L2s, Visa, Mastercard; Chainalysis, Blockaid, Tenderly",
    "Provide settlement or independent risk, simulation, monitoring, and incident evidence.",
  ],
] as const;

const harnessResponsibilities = [
  [
    "Interpret",
    "Bind an adaptive goal to assets, counterparties, timing, budget, and desired state.",
  ],
  [
    "Select",
    "Choose tools, protocols, routes, and payment methods from a controlled capability set.",
  ],
  [
    "Construct",
    "Produce exact orders, calldata, approvals, batches, and payment payloads.",
  ],
  [
    "Simulate",
    "Evaluate the concrete action against relevant state before authority is requested.",
  ],
  [
    "Authorize",
    "Bind an immutable request to a wallet or policy boundary that can refuse.",
  ],
  [
    "Execute",
    "Submit once, manage idempotency, and distinguish partial from complete work.",
  ],
  [
    "Reconcile",
    "Compare receipts and final state with the original objective and preserve evidence.",
  ],
] as const;

const references = [
  [
    "1",
    "International Monetary Fund",
    "How Agentic AI Will Reshape Payments",
    "https://www.imf.org/en/-/media/files/publications/imf-notes/2026/english/insea2026004.pdf",
  ],
  [
    "2",
    "x402",
    "Protocol introduction and payment flow",
    "https://docs.x402.org/introduction",
  ],
  [
    "3",
    "Stripe and Tempo",
    "Introducing the Machine Payments Protocol",
    "https://stripe.com/blog/machine-payments-protocol",
  ],
  [
    "4",
    "Google Cloud",
    "Announcing the Agent Payments Protocol (AP2)",
    "https://cloud.google.com/blog/products/ai-machine-learning/announcing-agents-to-payments-ap2-protocol",
  ],
  [
    "5",
    "Chainalysis",
    "Inside x402's Path to Meaningful Adoption",
    "https://www.chainalysis.com/blog/x402-agentic-payments-adoption/",
  ],
  [
    "6",
    "Coinbase Developer Platform",
    "AgentKit architecture",
    "https://docs.cdp.coinbase.com/agent-kit/core-concepts/architecture-explained",
  ],
  ["7", "Aomi", "Runtime reference", "https://aomi.dev/docs/reference/runtime"],
  ["8", "Aomi", "Build overview", "https://aomi.dev/docs/build/overview"],
  [
    "9",
    "Stripe and OpenAI",
    "Agentic Commerce Protocol and Instant Checkout",
    "https://stripe.com/newsroom/news/stripe-openai-instant-checkout",
  ],
  [
    "10",
    "Visa",
    "Trusted Agent Protocol specifications",
    "https://developer.visa.com/capabilities/trusted-agent-protocol/trusted-agent-protocol-specifications/",
  ],
  [
    "11",
    "Mastercard",
    "Mastercard Agent Pay",
    "https://www.mastercard.com/global/en/business/artificial-intelligence/mastercard-agent-pay.html",
  ],
  [
    "12",
    "Coinbase Developer Platform",
    "Agentic Wallets",
    "https://www.coinbase.com/developer-platform/products/agentic-wallets",
  ],
  [
    "13",
    "MetaMask",
    "Agent Wallet",
    "https://metamask.io/news/metamask-launches-agent-wallet-giving-ai-agents-full-defi-access-with-default-security-on-every-transaction",
  ],
  ["14", "Privy", "Wallet infrastructure for AI", "https://www.privy.io/ai"],
  [
    "15",
    "Turnkey",
    "Wallet infrastructure for AI agents",
    "https://www.turnkey.com/solutions/ai-agents",
  ],
  [
    "16",
    "Bankr",
    "Agent runtime overview",
    "https://docs.bankr.bot/agent/overview/",
  ],
  [
    "17",
    "Aomi Research",
    "Agentic Payments in Crypto — Ecosystem Deep Dive",
    "https://app.notion.com/p/3ba36be0954d816784a4e7b25ba2949b?pvs=204",
  ],
] as const;

function Cite({ n }: { n: string }) {
  return (
    <sup className={styles.cite}>
      <a href={`#ref-${n}`}>[{n}]</a>
    </sup>
  );
}

function Figure({
  number,
  title,
  children,
  caption,
}: {
  number: string;
  title: string;
  children: ReactNode;
  caption: ReactNode;
}) {
  return (
    <figure className={styles.figure}>
      <div className={styles.figureTopline}>
        <span>Figure {number}</span>
        <b>{title}</b>
      </div>
      <div className={styles.figureBody}>{children}</div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

function Section({
  number,
  title,
  children,
  id,
}: {
  number: string;
  title: string;
  children: ReactNode;
  id: string;
}) {
  return (
    <section className={styles.section} id={id}>
      <div className={styles.sectionRule}>
        <span>{number}</span>
      </div>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function ExecutionHarnessesResearch({ post }: Props) {
  return (
    <main className={styles.page}>
      <article className={styles.paper}>
        <header className={styles.header}>
          <div className={styles.masthead}>
            <Link href="/" aria-label="Aomi home">
              <AomiLogo
                className={styles.logo}
                markClassName={styles.logoMark}
              />
            </Link>
            <span>Aomi Research · {post.date}</span>
          </div>
          <p className={styles.series}>
            Research paper · Agentic financial infrastructure
          </p>
          <h1>The State of Execution Harnesses for Agentic Payments</h1>
          <p className={styles.subtitle}>
            Why model progress alone will not make financial agents efficient,
            reliable, or operational—and why execution infrastructure becomes
            the next essential layer.
          </p>
          <div className={styles.byline}>
            <span>Aomi Research</span>
            <span>13 August 2026</span>
            <span>Market structure and systems analysis</span>
          </div>
        </header>

        <aside className={styles.abstract}>
          <h2>Abstract</h2>
          <p>
            Agentic payments are often described as a new payment method. This
            framing is too narrow. They are a systems problem spanning adaptive
            intent, tool selection, transaction construction, delegated
            authority, funding, settlement, and reconciliation. The central
            architectural tension is that agents reason probabilistically while
            financial authority and settlement must remain deterministic. This
            paper maps the emerging market into seven layers and argues that a
            distinct execution-harness category is forming between the model and
            the wallet. An execution harness turns repeated financial reasoning
            into tested machinery: typed actions, protocol-aware construction,
            simulation, immutable authorization handoffs, idempotent execution,
            state management, and outcome verification. The category thesis is
            testable. Holding the model and task constant, a useful harness must
            increase verified completion while reducing tokens, latency,
            retries, unsafe proposals, and human intervention. The paper
            concludes that harness interfaces may standardize, but execution
            quality will remain differentiated—and positions Aomi as an onchain
            agent execution runtime within that emerging layer.
          </p>
          <p className={styles.keywords}>
            <b>Keywords:</b> agentic payments, agentic finance, execution
            harnesses, stablecoins, wallets, x402, MPP, AP2, onchain agents
          </p>
        </aside>

        <nav className={styles.contents} aria-label="Contents">
          <b>Contents</b>
          {[
            ["1", "Introduction", "introduction"],
            ["2", "Definitions and method", "method"],
            ["3", "Evidence and use cases", "evidence"],
            ["4", "The seven-layer ecosystem", "ecosystem"],
            ["5", "The execution-harness gap", "harness"],
            ["6", "Actors and competitive structure", "actors"],
            ["7", "Economics and measurement", "measurement"],
            ["8", "Implications for Aomi", "aomi"],
            ["9", "Risks, outlook, and conclusion", "conclusion"],
          ].map(([n, label, id]) => (
            <a key={id} href={`#${id}`}>
              <span>{n}</span>
              {label}
            </a>
          ))}
        </nav>

        <Section
          number="1"
          title="Introduction: the market has named every layer except execution"
          id="introduction"
        >
          <p className={styles.lead}>
            General-purpose agents can already reach financial destinations.
            They can browse documentation, discover a tool, infer its schema,
            create a payment or transaction, recover from an error, and inspect
            a receipt. Yet they often do so the way a person travels on foot:
            one uncertain step at a time, repeatedly paying in reasoning,
            tokens, latency, and operational risk.
          </p>
          <p>
            Faster models improve that walk. They do not remove the economic
            reason to build vehicles. In mature technical systems, repeated
            integration knowledge, safety checks, and recovery logic move out of
            general reasoning and into software. The same transition is now
            beginning in agentic payments. The model remains the intelligence;
            an execution harness carries the known mechanics.
          </p>
          <p>
            The market has already named many adjacent components. Machine
            payment protocols coordinate an acceptance handshake. Wallets hold
            credentials and enforce delegated authority. Stablecoins and cards
            supply value. Blockchains and payment networks settle. Mandate
            systems establish who an agent represents and what it may do. What
            remains inconsistently named is the system responsible for moving
            from an agent&apos;s adaptive plan to a concrete, inspectable, and
            reconciled financial outcome.
          </p>
          <p>
            This paper calls that system the <b>execution harness</b>. The term
            is deliberately narrower than “agent platform” and broader than
            “transaction toolkit.” A harness owns enough of the execution
            lifecycle to make performance and failure measurable. It binds
            intent to typed actions, chooses among supported capabilities,
            constructs a request, tests it against state, preserves the payload
            presented for authorization, executes without duplication, and
            verifies the resulting state.
          </p>
          <div className={styles.thesisBox}>
            <b>Central thesis</b>
            <p>
              As agentic finance matures, execution harnesses become standard
              infrastructure because they increase verified outcomes per unit of
              model reasoning, time, money, and human attention. Their
              interfaces may commoditize; their execution quality will not.
            </p>
          </div>
        </Section>

        <Section
          number="2"
          title="Definitions, scope, and methodology"
          id="method"
        >
          <h3>2.1 What counts as an agentic payment?</h3>
          <p>
            A conventional automated payment follows predetermined code: send a
            fixed amount on a fixed date. An agentic payment contains an
            adaptive decision step: find a compliant supplier under a budget,
            choose a route, determine the amount or timing, and pay. The agent
            may decide <i>what</i>, <i>when</i>, <i>where</i>, or{" "}
            <i>how much</i>
            within a delegated mandate.
          </p>
          <p>
            Agentic payments overlap with two larger categories but are not
            synonymous with either. <b>Agentic commerce</b> includes discovery,
            comparison, ordering, fulfillment, returns, and support; payment is
            one stage. <b>Agentic finance</b> includes trading, treasury,
            hedging, lending, compliance, and portfolio operations; not every
            financial action is a payment. A crypto agent that only analyzes or
            communicates becomes a payment actor only when it can request or
            authorize value transfer.
          </p>
          <h3>2.2 The probabilistic–deterministic boundary</h3>
          <p>
            The IMF&apos;s 2026 model separates agentic payments into intent and
            orchestration, control and authorization, and settlement.
            <Cite n="1" />
            That separation captures the core safety property: an agent may
            reason, search, negotiate, and propose, but a deterministic boundary
            must decide whether a concrete request may use financial authority,
            and a deterministic rail must settle without reinterpreting the
            instruction. This paper expands the commercial and technical space
            between those three institutional layers.
          </p>
          <h3>2.3 Research method</h3>
          <p>
            The analysis combines official protocol specifications, first-party
            product documentation, independent onchain evidence, and Aomi&apos;s
            operating perspective. Product capabilities are treated as vendor
            claims unless independently demonstrated. Transaction activity is
            evidence of technical use, not automatically evidence of durable or
            autonomous demand. The market taxonomy is analytical: firms often
            span multiple layers, and placement reflects the function being
            evaluated rather than the company as a whole.
          </p>
          <div className={styles.methodGrid}>
            <div>
              <b>Included</b>
              <p>
                Machine payments, commerce mandates, crypto wallets,
                stablecoins, agent runtimes, DeFi execution, treasury, security,
                and reconciliation.
              </p>
            </div>
            <div>
              <b>Excluded</b>
              <p>
                Generic AI fraud models, infrastructure with no agent-facing
                role, and speculative tokens whose only connection is an “AI
                agent” label.
              </p>
            </div>
            <div>
              <b>Evidence hierarchy</b>
              <p>
                Specifications first; then official technical documentation;
                then independent market evidence; finally internal hypotheses
                and positioning.
              </p>
            </div>
            <div>
              <b>Research limitation</b>
              <p>
                The same-model execution advantage is proposed as a benchmark.
                No unrun comparison is presented as a measured result.
              </p>
            </div>
          </div>
        </Section>

        <Section
          number="3"
          title="Market evidence and the use cases that matter first"
          id="evidence"
        >
          <p className={styles.lead}>
            The market is real but early. The strongest live wedge is not a
            general autonomous economy; it is software paying for digital
            resources while completing a task.
          </p>
          <p>
            x402 revives the HTTP 402 pattern. A server returns payment
            requirements, the client signs a payload, and the request is retried
            with payment proof; a facilitator may verify and settle without
            custodying the user&apos;s funds.
            <Cite n="2" /> MPP similarly coordinates payment for APIs, MCP
            tools, and HTTP resources, while connecting machine payments to
            Stripe&apos;s existing support for stablecoins, cards, recurring
            charges, tax, reporting, refunds, and merchant payouts.
            <Cite n="3" /> These systems lower the cost of acceptance. They do
            not decide whether the purchase is sensible, whether the action
            produced the intended state, or whether a paid service delivered
            correctly.
          </p>
          <p>
            Chainalysis measured more than 100 million cumulative x402
            transactions on Base through the first quarter of 2026. The same
            analysis found that speculative pay-to-mint activity drove much of
            an earlier surge and concluded that mass adoption remained distant.
            <Cite n="5" /> The caveat is not a footnote to be separated from the
            number; it determines what the number means. Protocol activity
            proves that accountless machine payment works at scale. It does not
            yet prove that recurring, economically useful autonomous demand is
            widespread.
          </p>
          <div className={styles.dataNote}>
            <strong>100M+</strong>
            <div>
              <b>cumulative x402 transactions on Base through Q1 2026</b>
              <p>
                Evidence of technical use and early demand—not a clean measure
                of autonomous-agent adoption.
              </p>
            </div>
          </div>
          <h3>3.1 Use-case maturity</h3>
          <p>
            Use cases mature fastest when the purchased object is digital, the
            price is machine-readable, fulfillment is immediate, and failure is
            reversible or low value. They mature more slowly as physical
            fulfillment, regulated advice, custody, credit, cross-border
            compliance, or ambiguous liability enters the workflow.
          </p>
          <div className={styles.tableWrap}>
            <table>
              <caption>
                Table 1. Representative use cases and 2026 maturity
              </caption>
              <thead>
                <tr>
                  <th>Use case</th>
                  <th>Best-fit rails</th>
                  <th>Maturity</th>
                  <th>Assessment</th>
                </tr>
              </thead>
              <tbody>
                {useCases.map((row) => (
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
            This sequence explains crypto&apos;s early advantage. Wallets are
            programmatic accounts; stablecoins provide internet-native value;
            and blockchains settle globally at machine speed. Those properties
            are especially valuable for low-value digital services and
            crypto-native financial actions. They are less decisive in consumer
            commerce, where merchant reach, refunds, fraud allocation, tax, and
            fulfillment usually matter more than the novelty of the rail.
          </p>
        </Section>

        <Section
          number="4"
          title="Agentic payments are a seven-layer ecosystem"
          id="ecosystem"
        >
          <p>
            “Agentic payments” is frequently used as if it were one product
            category. In practice, it is a stack. Assigning one primary job to
            each layer prevents a protocol, wallet, runtime, or rail from being
            mistaken for the whole system.
          </p>
          <Figure
            number="1"
            title="Seven layers from adaptive demand to deterministic settlement"
            caption={
              <>
                A company may operate across several layers. The taxonomy
                assigns functions, not permanent identities.
                Assurance—simulation, compliance, threat detection,
                observability, disputes, and reconciliation—cuts horizontally
                across the stack.
              </>
            }
          >
            <div className={styles.stack}>
              {layers.map(([n, name, job, examples]) => (
                <div
                  className={`${styles.layer} ${n === "02" || n === "03" ? styles.focusLayer : ""}`}
                  key={n}
                >
                  <span>{n}</span>
                  <div>
                    <b>{name}</b>
                    <p>{job}</p>
                  </div>
                  <small>{examples}</small>
                </div>
              ))}
              <div className={styles.assurance}>
                <b>Horizontal assurance</b>
                <span>
                  simulation · compliance · threat detection · observability ·
                  reconciliation · disputes
                </span>
              </div>
            </div>
          </Figure>
          <h3>4.1 Surfaces, runtimes, and domain execution</h3>
          <p>
            Agent surfaces own the user or business workflow and originate
            demand. OpenAI and Stripe&apos;s Agentic Commerce Protocol, for
            example, allows a conversational surface to pass a structured order
            and a scoped payment token to a merchant while the merchant retains
            responsibility for acceptance and fulfillment.
            <Cite n="9" /> Crypto surfaces such as Bankr combine conversation,
            wallet access, scheduled work, trading, and paid service access in
            one experience.
            <Cite n="16" />
          </p>
          <p>
            Beneath the surface, runtimes own sessions, memory, tools, retries,
            background work, and multistep state. Toolkits and runtimes should
            be distinguished: Coinbase describes AgentKit as a modular,
            framework- and wallet-agnostic system of action providers and wallet
            providers.
            <Cite n="6" /> A stateful execution runtime goes further by owning
            the path to completion and the evidence left behind.
            Domain-execution providers then supply the exact mechanics of a
            swap, bridge, order, checkout, staking operation, or protocol call.
          </p>
          <h3>4.2 Authority, coordination, money, and rails</h3>
          <p>
            Wallet and mandate systems form the authority boundary.
            Google&apos;s AP2 binds an agent&apos;s action to cryptographically
            verifiable mandates describing identity, scope, limits, and
            conditions.
            <Cite n="4" />
            Visa and Mastercard are extending tokenized credentials and network
            trust to recognized agents.
            <Cite n="10" />
            <Cite n="11" /> Crypto wallets are evolving from key stores into
            programmable authorization systems with isolated credentials, spend
            limits, allowlists, simulation, escalation, audit, and revocation.
            <Cite n="12" />
            <Cite n="13" />
          </p>
          <p>
            Payment coordination describes what is for sale and how it may be
            paid. Money and treasury infrastructure supplies balances, funding,
            conversion, accounting, and liquidity. Settlement rails finalize
            movement. These responsibilities can be vertically integrated for
            convenience, but they carry different competencies and liabilities.
            Mature buyers will require the boundaries to remain inspectable even
            when one provider bundles several layers.
          </p>
        </Section>

        <Section number="5" title="The execution-harness gap" id="harness">
          <p className={styles.lead}>
            A payment protocol can coordinate a handshake, and a wallet can
            decide whether to sign. Neither can independently establish that an
            adaptive financial task was correctly completed.
          </p>
          <p>
            Consider an instruction to bridge an asset, pay for a service on the
            destination chain, and return a receipt. The agent must interpret
            constraints, select a bridge and service, obtain quotes, construct
            approvals and calls, reason about destination gas, handle changing
            state, preserve the request reviewed by the signer, recover from a
            partial bridge, prevent duplicate payment, verify delivery, and
            reconcile the final balances. A wallet can enforce a spend cap. A
            simulator can test a concrete transaction. A chain can prove
            finality. None alone can connect the semantic objective to the whole
            sequence of evidence.
          </p>
          <h3>5.1 Definition</h3>
          <p>
            An <b>execution harness</b> is the runtime machinery that converts
            adaptive intent into bounded, inspectable, and reconcilable
            financial action. It is more than a toolkit because it owns state,
            recovery, and completion. It is broader than a policy layer because
            policy does not construct or reconcile the task. It remains separate
            from the wallet because the wallet must retain the independent power
            to refuse.
          </p>
          <Figure
            number="2"
            title="The execution lifecycle and its authority boundary"
            caption={
              <>
                The critical output is an evidence chain linking original
                intent, selected capability, constructed payload, simulation,
                authorization decision, signer, receipt, and final state.
              </>
            }
          >
            <div className={styles.lifecycle}>
              {harnessResponsibilities.map(([name, description], i) => (
                <div key={name}>
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <b>{name}</b>
                  <p>{description}</p>
                </div>
              ))}
            </div>
            <div className={styles.boundary}>
              <span>Probabilistic interpretation and selection</span>
              <span>Deterministic authority, execution, and state</span>
            </div>
          </Figure>
          <h3>5.2 Why better models do not eliminate the category</h3>
          <p>
            General models will continue to improve at documentation discovery,
            schema inference, tool use, and error recovery. That lowers the cost
            of walking; it does not change the value of a tested route. Mature
            systems do not ask a model to rediscover stable protocol knowledge,
            allowance rules, idempotency semantics, receipt formats, or balance
            assertions on every run. They encode those mechanics and reserve
            model reasoning for decisions that are genuinely adaptive.
          </p>
          <p>
            The analogy must be applied strictly. A poor vehicle can be slower
            than walking. A harness that hides failures, constrains a capable
            model, increases retries, or cannot demonstrate the final state has
            not earned its abstraction. The relevant comparison is the same
            athlete on the same course: one model and task set, with and without
            the harness.
          </p>
        </Section>

        <Section
          number="6"
          title="Actors, emerging services, and competitive structure"
          id="actors"
        >
          <p>
            Early markets reward full-stack products because developers prefer
            one API and users prefer one trusted surface. Coinbase, Circle,
            Crossmint, Stripe, Bankr, and OKX therefore span layers. Yet
            specialization is likely to deepen because each layer has a distinct
            technical competency, distribution advantage, and liability model.
          </p>
          <div className={styles.tableWrap}>
            <table>
              <caption>
                Table 2. Actor groups and their primary control points
              </caption>
              <thead>
                <tr>
                  <th>Group</th>
                  <th>Representative actors</th>
                  <th>Primary control point</th>
                </tr>
              </thead>
              <tbody>
                {actors.map((row) => (
                  <tr key={row[0]}>
                    {row.map((cell, i) => (
                      <td key={cell}>{i === 0 ? <b>{cell}</b> : cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3>6.1 Where new service sectors are forming</h3>
          <p>
            The first emerging sector is <b>programmable authority</b>.
            Coinbase, MetaMask, OKX, Circle, Privy, Turnkey, Safe, Fireblocks,
            and others are turning wallets into policy-aware accounts for
            agents. Their differentiation will come from custody model, key
            isolation, mandate expressiveness, escalation, simulation, chain
            coverage, compliance, and distribution.
            <Cite n="12" />
            <Cite n="14" />
            <Cite n="15" />
          </p>
          <p>
            The second is <b>payment facilitation and protocol gateways</b>.
            x402 facilitators verify payloads and submit settlement; MPP and
            processors translate machine requests into merchant accounts,
            reporting, tax, refunds, and normal payouts. Durable gateways will
            support multiple protocols and rails rather than forcing every
            merchant to operate protocol-specific infrastructure.
          </p>
          <p>
            The third is{" "}
            <b>agent-native discovery, reputation, and delivery assurance</b>.
            Machine-readable catalogs can expose capabilities and prices, but
            discovery without reputation becomes spam and payment without
            delivery proof becomes fraud. Registries, attestations,
            service-level histories, escrow, signed receipts, and insurance are
            therefore likely to converge.
          </p>
          <p>
            The fourth is <b>semantic simulation and execution assurance</b>.
            Spend limits can block an oversized transfer but may not detect a
            swap that strands funds, a bridge route that leaves an unsafe claim,
            or a technically successful batch that misses the requested balance
            outcome. Protocol-aware construction, fork simulation, outcome
            assertions, threat scanning, and independent evidence address
            different pieces of this problem.
          </p>
          <p>
            Finally, <b>cross-rail orchestration and agent back offices</b>{" "}
            remain underbuilt. Stablecoins dominate machine-native micropayments
            while cards dominate merchant acceptance and consumer protection.
            Agents will route across stablecoins, cards, banks, and local
            networks by cost, availability, reversibility, and compliance. Every
            autonomous spend must then be attributed to an agent, mandate, task,
            user, delivered result, refund, and tax event.
          </p>
          <h3>6.2 Likely competitive boundaries</h3>
          <p>
            Wallets possess the strongest distribution moat because they already
            control assets, trust, signing, and the gateway to settlement. They
            can move upward into tools and execution. Payment platforms can move
            inward from money movement into orchestration. Vertical providers
            can dominate high-frequency domains through route, venue, or
            inventory depth. General agent frameworks can move downward through
            wallet and payment plugins. Execution runtimes must therefore prove
            that they are materially better at generalized completion and
            evidence, not merely better at exposing transactions to an LLM.
          </p>
        </Section>

        <Section
          number="7"
          title="The economics of a harness and how to measure it"
          id="measurement"
        >
          <p>
            Model tokens are not the only operational cost, but they reveal the
            underlying inefficiency. When an agent rereads documentation,
            reconstructs schemas, reasons through stable allowance mechanics,
            retries stale routes, or investigates whether a task finished, the
            system is buying cognition to compensate for missing infrastructure.
            Harness value comes from moving repeated cognition into software,
            compressing the failure surface, and making operations legible.
          </p>
          <p>
            This produces a stricter economic claim than “agents work better
            with tools.” A useful harness should increase the number of verified
            outcomes obtained from a fixed model budget. It should also preserve
            model optionality: operators can improve or replace the model
            without rebuilding every financial integration and control around
            it.
          </p>
          <Figure
            number="3"
            title="A same-model benchmark for execution leverage"
            caption={
              <>
                Hold the model, prompt, task suite, signer policy, starting
                state, and market conditions constant. Score the resulting world
                state—not the fluency of the transcript.
              </>
            }
          >
            <div className={styles.benchmark}>
              <div>
                <span>Baseline</span>
                <b>General tools</b>
                <p>
                  Model discovers interfaces, reconstructs mechanics, recovers
                  from failures, and verifies completion during each run.
                </p>
              </div>
              <div className={styles.versus}>
                same model
                <br />
                same tasks
              </div>
              <div className={styles.benchmarkFocus}>
                <span>Harnessed</span>
                <b>Tested execution path</b>
                <p>
                  Software supplies typed actions, simulation, state, recovery,
                  payload binding, and outcome assertions.
                </p>
              </div>
            </div>
            <div className={styles.formula}>
              <b>Execution leverage</b>
              <span>verified outcomes</span>
              <i>÷</i>
              <span>tokens + time + failures + intervention</span>
            </div>
          </Figure>
          <h3>7.1 Proposed scorecard</h3>
          <div className={styles.metrics}>
            <div>
              <b>Task success</b>
              <p>Did the requested financial state change occur?</p>
            </div>
            <div>
              <b>Tokens per verified outcome</b>
              <p>How much model reasoning was consumed by completed work?</p>
            </div>
            <div>
              <b>Time, calls, and retries</b>
              <p>How much latency, wandering, and recovery occurred?</p>
            </div>
            <div>
              <b>Human intervention</b>
              <p>
                How often did the system need rescue rather than intentional
                approval?
              </p>
            </div>
            <div>
              <b>Unsafe proposals blocked</b>
              <p>Did it reject structurally valid but harmful actions?</p>
            </div>
            <div>
              <b>Simulation consistency</b>
              <p>
                Was the signed payload the reviewed payload, and did execution
                match simulation?
              </p>
            </div>
            <div>
              <b>Duplicate-broadcast rate</b>
              <p>Did retries create repeated payments or transactions?</p>
            </div>
            <div>
              <b>End-state evidence</b>
              <p>
                Can the result be tied back to intent, authority, receipts, and
                final state?
              </p>
            </div>
          </div>
          <p>
            The benchmark should include ordinary success and adversarial state:
            stale quotes, changed allowances, rejected signatures, insufficient
            destination gas, partial bridge completion, delayed confirmation,
            unavailable tools, malicious content, and repeated network requests.
            A harness is valuable only if its advantage survives these
            conditions.
          </p>
        </Section>

        <Section number="8" title="Implications for Aomi" id="aomi">
          <p className={styles.lead}>
            Aomi&apos;s defensible category is not “agentic payments company.”
            It is the onchain execution runtime that turns agent intent into
            verified financial execution. Payments are one action class inside
            that runtime.
          </p>
          <p>
            Aomi primarily occupies layers two and three: runtime orchestration
            and domain execution. It hosts the agent loop, tools, sessions,
            persistence, and multistep state; translates intent into typed
            actions and transactions; simulates expected outcomes; and prepares
            a concrete request for an external signer.
            <Cite n="7" />
            <Cite n="8" />
            Wallets, identity providers, compliance systems, payment protocols,
            stablecoins, and settlement rails are integrated components rather
            than identities Aomi should claim.
          </p>
          <Figure
            number="4"
            title="Aomi's responsibility boundary"
            caption={
              <>
                Aomi coordinates execution and evidence. The wallet retains
                authority and the power to refuse; funding systems supply value;
                rails provide finality.
              </>
            }
          >
            <div className={styles.aomiBoundary}>
              <div>
                <span>Demand</span>
                <b>Intent</b>
                <p>Goal, budget, timing, constraints, desired result</p>
              </div>
              <i>→</i>
              <div className={styles.aomiCore}>
                <AomiLogo
                  className={styles.figureLogo}
                  markClassName={styles.figureMark}
                />
                <b>Execution runtime</b>
                <p>plan · tools · construct · simulate · execute · reconcile</p>
              </div>
              <i>→</i>
              <div>
                <span>Authority</span>
                <b>Wallet and mandate</b>
                <p>identity, consent, limits, risk, refusal</p>
              </div>
              <i>→</i>
              <div>
                <span>Finality</span>
                <b>Money and rails</b>
                <p>stablecoins, cards, banks, chains</p>
              </div>
            </div>
          </Figure>
          <h3>8.1 Strategic priorities implied by the research</h3>
          <ol className={styles.priorities}>
            <li>
              <b>Prove execution quality.</b> Build benchmarks around task
              completion, dangerous-proposal blocking, simulation-to-execution
              consistency, duplicate broadcasts, intervention, and end-state
              correctness.
            </li>
            <li>
              <b>Make evidence a product surface.</b> Preserve intent, selected
              capability, immutable payload, simulation, policy decisions,
              signer, receipt, and final state as one inspectable chain.
            </li>
            <li>
              <b>Remain wallet- and protocol-neutral.</b> Support
              self-custodial, embedded, and institutional authority while
              treating x402, MPP, cards, and direct stablecoin transfer as
              selectable capabilities.
            </li>
            <li>
              <b>Compete on domain-aware execution.</b> Typed calls, protocol
              constraints, fork simulation, balance assertions, and recovery
              behavior should create measurable leverage over generic tool use.
            </li>
            <li>
              <b>Let partners own distribution.</b> Wallets, protocols,
              exchanges, fintechs, and vertical applications should be able to
              retain the user relationship while Aomi provides the execution
              environment.
            </li>
          </ol>
          <div className={styles.disclosure}>
            <b>Researcher disclosure</b>
            <p>
              Aomi is building in the category analyzed here. The positioning in
              this section is therefore a company thesis, not an independent
              market conclusion. External observations and vendor claims are
              cited; the proposed benchmark is presented as a falsifiable test,
              not as an already measured result.
            </p>
          </div>
        </Section>

        <Section
          number="9"
          title="Risks, outlook, and conclusion"
          id="conclusion"
        >
          <h3>9.1 Unresolved risks</h3>
          <p>
            The largest technical risks are prompt injection and tool poisoning,
            overbroad delegation, semantic mismatch, replay and duplicate
            execution, stale market state, and the gap between payment finality
            and offchain delivery. Identity and reputation systems must resist
            cheap agent creation without turning an open market into a closed
            allowlist. Privacy is also structural: payment metadata can reveal
            tasks, counterparties, services, and commercial intent.
          </p>
          <p>
            Liability remains fragmented across user, model provider, runtime,
            tool, wallet, facilitator, merchant, issuer, and settlement rail.
            Regulatory classification can also change with custody, payment
            initiation, brokerage, advice, sanctions exposure, or jurisdiction.
            A technically successful design may still fail if no participant
            clearly owns refunds, disputes, exceptions, and loss.
          </p>
          <h3>9.2 Outlook</h3>
          <p>
            Over the next year, wallets are likely to make agent-specific
            mandates, escalation, and transaction security default features.
            x402 and MPP will compete and coexist in paid digital services.
            Commerce and mandate protocols will spread through merchant systems,
            while stablecoin issuers and processors bundle wallets, discovery,
            compliance, and low-value payment support. Independent security and
            observability will become requirements for enterprise deployment.
          </p>
          <p>
            Over a two-to-three-year horizon, agents should carry portable
            mandates and credentials across surfaces; service catalogs should
            expose capability, price, reputation, and delivery guarantees;
            routers should choose among stablecoin, card, bank, and local rails;
            and agent treasury and accounting should become standard enterprise
            infrastructure. The durable architecture will separate proposer,
            executor, authorizer, and settler while linking them through
            evidence.
          </p>
          <h3>9.3 Conclusion</h3>
          <p className={styles.conclusion}>
            Agentic payments will not mature simply because models receive
            wallets. They will mature when software can form an adaptive intent,
            turn it into a valid and inspectable action, operate within
            delegated authority, settle through the appropriate rail, and prove
            that the requested outcome occurred. Better models will become
            better athletes. Execution harnesses are the vehicles that let the
            same athlete travel farther, faster, and with evidence.
          </p>
        </Section>

        <section className={styles.references}>
          <div className={styles.sectionRule}>
            <span>References</span>
          </div>
          <h2>References</h2>
          <ol>
            {references.map(([n, author, title, href]) => (
              <li id={`ref-${n}`} key={n}>
                <span>{n}.</span>
                <p>
                  <b>{author}.</b>{" "}
                  <a href={href} target="_blank" rel="noreferrer">
                    {title}
                  </a>
                  . Accessed August 2026.
                </p>
              </li>
            ))}
          </ol>
        </section>

        <footer className={styles.footer}>
          <AomiLogo
            className={styles.footerLogo}
            markClassName={styles.footerMark}
          />
          <p>Aomi Research · August 2026</p>
          <Link href="/research">All research</Link>
        </footer>
      </article>
    </main>
  );
}
