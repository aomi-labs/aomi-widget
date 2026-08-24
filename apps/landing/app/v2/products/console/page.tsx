import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Braces,
  Check,
  CloudCog,
  CodeXml,
  Component,
  FileCode2,
  Gauge,
  KeyRound,
  MessageSquareText,
  PackageCheck,
  PanelsTopLeft,
  ShieldCheck,
  TerminalSquare,
  Workflow,
} from "lucide-react";
import { PluginSdkWorkbench } from "./plugin-sdk-workbench";
import { PluginOperations } from "./plugin-operations";
import styles from "./plugin-sdk.module.css";

export const metadata: Metadata = {
  title: "Plugin SDK | Aomi",
  description:
    "Turn an API into an agent-ready Aomi App with the Rust Plugin SDK and Aomi Build toolchain.",
  robots: { index: false, follow: false },
};

const layers = [
  {
    index: "01",
    icon: MessageSquareText,
    label: "Behavior",
    file: "src/lib.rs",
    title: "Write the operating contract.",
    body: "Define the role, boundaries, tool-selection rules, and repeatable workflows that make your application specific—not a generic assistant with your logo.",
  },
  {
    index: "02",
    icon: Braces,
    label: "Capabilities",
    file: "src/tool.rs",
    title: "Expose deliberate tools.",
    body: "Wrap your product API as a small inventory of typed, intent-shaped tools. Keep read, stage, and submit responsibilities explicit and return stable JSON.",
  },
  {
    index: "03",
    icon: PackageCheck,
    label: "Delivery",
    file: "Cargo.toml",
    title: "Ship a runtime unit.",
    body: "Compile the plugin as a compatible artifact, deploy it with Aomi Build, activate the release, and verify that the hosted runtime has loaded it.",
  },
] as const;

const architecture = [
  { icon: CodeXml, label: "Your API", detail: "Semantics + auth" },
  { icon: Braces, label: "Rust client", detail: "Typed requests" },
  { icon: Boxes, label: "3–8 tools", detail: "Curated intents" },
  { icon: FileCode2, label: "Preamble", detail: "Role + workflow" },
  { icon: CloudCog, label: "Aomi App", detail: "Hosted runtime" },
] as const;

const safetyRules = [
  [
    "One clear purpose",
    "A tool should map to an operator intent, not mirror every endpoint.",
  ],
  [
    "Reads before writes",
    "Quote and inspect first; stage or submit through an explicit boundary.",
  ],
  [
    "Stable structured output",
    "Return the facts an agent needs without forcing it to parse prose.",
  ],
  [
    "Actionable failure",
    "Say what failed and what the caller can safely change before retrying.",
  ],
] as const;

const surfaces = [
  [
    PanelsTopLeft,
    "Widget",
    "A complete execution surface inside your product.",
  ],
  [Workflow, "REST APIs", "Render the same hosted App in your own interface."],
  [
    TerminalSquare,
    "Agentic Toolings",
    "Use the App from Skills, hosted MCP, or CLI.",
  ],
  [Component, "Aomi Portal", "Make the App selectable in Aomi's hosted chat."],
] as const;

export default function PluginSdkProductPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>AOMI PLUGIN SDK</p>
            <h1>
              Your API,
              <br />
              <em>agent-ready.</em>
            </h1>
            <p className={styles.heroSupport}>
              Define behavior and typed tools in Rust. Aomi turns the plugin
              into a hosted App with sessions, orchestration, deployment, and
              wallet-aware execution already in place.
            </p>
            <div className={styles.heroActions}>
              <a
                href="https://aomi.dev/docs/build/plugins/aomi-app"
                target="_blank"
                rel="noreferrer"
                className={styles.primaryButton}
              >
                Build your first App
                <ArrowUpRight aria-hidden />
              </a>
              <Link href="#architecture" className={styles.secondaryButton}>
                See the architecture
                <ArrowRight aria-hidden />
              </Link>
            </div>
            <div className={styles.heroAside}>
              <span>YOU OWN</span>
              <p>Product logic · API semantics · auth · tools</p>
              <span>AOMI RUNS</span>
              <p>Model loop · sessions · deployment · execution</p>
            </div>
          </div>

          <PluginSdkWorkbench />
        </div>
      </section>

      <section className={styles.layersSection}>
        <header className={styles.sectionIntro}>
          <p className={styles.eyebrow}>THE PLUGIN IS THE PRODUCT SPEC</p>
          <h2>One App. Three deliberate layers.</h2>
          <p>
            Keep reasoning, capabilities, and delivery separate enough to
            review—but close enough to ship as one runtime unit.
          </p>
        </header>
        <div className={styles.layerLedger}>
          {layers.map((layer) => (
            <article key={layer.label}>
              <span className={styles.layerIndex}>{layer.index}</span>
              <span className={styles.layerIcon}>
                <layer.icon aria-hidden />
              </span>
              <div className={styles.layerTitle}>
                <span>{layer.label}</span>
                <code>{layer.file}</code>
              </div>
              <h3>{layer.title}</h3>
              <p>{layer.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="architecture" className={styles.architectureSection}>
        <div className={styles.architectureLead}>
          <p className={styles.eyebrow}>FROM ENDPOINTS TO INTENT</p>
          <h2>Don&apos;t expose your API. Design an operator.</h2>
          <p>
            Generated endpoint wrappers are a starting point. The product work
            is deciding which capabilities belong in the agent&apos;s inventory,
            how they compose, and where human authority remains required.
          </p>
          <a
            href="https://aomi.dev/docs/build/toolchain/aomi-build"
            target="_blank"
            rel="noreferrer"
          >
            Explore Aomi Build <ArrowUpRight aria-hidden />
          </a>
        </div>

        <div className={styles.architectureFlow}>
          {architecture.map((item, index) => (
            <div className={styles.architectureNode} key={item.label}>
              <span className={styles.nodeNumber}>0{index + 1}</span>
              <item.icon aria-hidden />
              <strong>{item.label}</strong>
              <small>{item.detail}</small>
              {index < architecture.length - 1 ? (
                <ArrowRight className={styles.nodeArrow} aria-hidden />
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className={styles.toolchainSection}>
        <div className={styles.toolchainHeading}>
          <div>
            <p className={styles.eyebrow}>AOMI BUILD</p>
            <h2>Source becomes a Project. The Project keeps its history.</h2>
          </div>
          <p>
            Shipping is not the end of the SDK workflow. Aomi keeps the release
            tied to its repository, compatibility status, runtime lifecycle,
            tool health, transaction outcomes, and operating cost.
          </p>
        </div>
        <PluginOperations />
      </section>

      <section className={styles.ownershipSection}>
        <div className={styles.ownershipTitle}>
          <p className={styles.eyebrow}>A CLEAN OPERATING BOUNDARY</p>
          <h2>You build the expertise. Aomi operates the agent runtime.</h2>
        </div>
        <div className={styles.ownershipMatrix}>
          <div className={styles.ownerColumn}>
            <span className={styles.ownerLabel}>YOUR TEAM</span>
            {[
              "API behavior and authentication",
              "Tool semantics and response models",
              "Agent role, boundaries, and workflows",
              "Business policy and release decisions",
            ].map((item) => (
              <p key={item}>
                <Check aria-hidden /> {item}
              </p>
            ))}
          </div>
          <div className={styles.ownerDivider} aria-hidden>
            <span>PLUGIN</span>
          </div>
          <div className={styles.ownerColumn}>
            <span className={styles.ownerLabel}>AOMI</span>
            {[
              "Hosted model and tool orchestration",
              "Session and application runtime",
              "Build, deployment, and activation",
              "Wallet-aware execution and receipts",
            ].map((item) => (
              <p key={item}>
                <Check aria-hidden /> {item}
              </p>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.safetySection}>
        <div className={styles.safetyHeader}>
          <div className={styles.safetyMark}>
            <ShieldCheck aria-hidden />
          </div>
          <div>
            <p className={styles.eyebrow}>TOOL DESIGN RULES</p>
            <h2>Give the model less ambiguity.</h2>
          </div>
        </div>
        <div className={styles.ruleList}>
          {safetyRules.map(([title, body], index) => (
            <article key={title}>
              <span>0{index + 1}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.surfacesSection}>
        <div className={styles.surfaceCopy}>
          <p className={styles.eyebrow}>BUILD ONCE, DISTRIBUTE BY CONTEXT</p>
          <h2>The App travels. The interface can change.</h2>
          <p>
            The same hosted capability can meet a user in Aomi Portal, your
            embedded Widget, a custom API experience, or the agentic tools your
            team already uses.
          </p>
        </div>
        <div className={styles.surfaceList}>
          {surfaces.map(([Icon, title, body], index) => (
            <article key={title}>
              <span>0{index + 1}</span>
              <Icon aria-hidden />
              <div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.ctaSection}>
        <div className={styles.ctaStamp} aria-hidden>
          <Gauge />
        </div>
        <p className={styles.eyebrow}>SHIP AN AOMI APP</p>
        <h2>
          Bring the API.
          <br />
          Leave with an operator.
        </h2>
        <p>
          Start from an OpenAPI description or a bare Rust skeleton, curate the
          tools that matter, and deploy into Aomi&apos;s hosted runtime.
        </p>
        <div className={styles.ctaActions}>
          <a
            href="https://aomi.dev/docs/build/plugins/aomi-app"
            target="_blank"
            rel="noreferrer"
            className={styles.primaryButton}
          >
            Read the Plugin SDK guide <ArrowUpRight aria-hidden />
          </a>
          <a
            href="https://build.aomi.dev"
            target="_blank"
            rel="noreferrer"
            className={styles.darkSecondaryButton}
          >
            Open Aomi Build <ArrowUpRight aria-hidden />
          </a>
        </div>
        <p className={styles.custodyNote}>
          <KeyRound aria-hidden /> Aomi hosts the runtime. Configured wallets
          retain signing authority.
        </p>
      </section>
    </main>
  );
}
