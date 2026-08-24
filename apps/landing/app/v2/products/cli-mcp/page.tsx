import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  Check,
  Command,
  KeyRound,
  MonitorCheck,
  Network,
  ShieldCheck,
  Terminal,
  Waypoints,
} from "lucide-react";
import { AgenticLab } from "./agentic-lab";
import styles from "./agentic-surfaces.module.css";

const DOCS = {
  skills: "https://aomi.dev/docs/guides/skills",
  mcp: "https://aomi.dev/docs/guides/mcp",
  cli: "https://aomi.dev/docs/reference/client-cli",
} as const;

export const metadata: Metadata = {
  title: "Agentic Toolings | Aomi",
  description:
    "Choose Agent Skills, hosted MCP, or the Aomi CLI and connect your existing agent to Aomi's account-owned execution harness.",
  robots: { index: false, follow: false },
};

const surfaces = [
  {
    id: "skills",
    icon: Bot,
    index: "01",
    title: "Agent Skills",
    body: "Teach Codex, Claude Code, or Cursor the correct Aomi workflow before the agent touches a transaction.",
    bestFor: "Guided trading and App-building workflows",
    action: "Install Skills",
    href: "#setup",
  },
  {
    id: "mcp",
    icon: Network,
    index: "02",
    title: "Hosted MCP",
    body: "Connect any supported MCP client to account-owned Aomi sessions through browser OAuth.",
    bestFor: "Hosted conversations with almost no local setup",
    action: "Connect MCP",
    href: "#setup",
  },
  {
    id: "cli",
    icon: Terminal,
    index: "03",
    title: "Client CLI",
    body: "Work directly with chat, sessions, simulation, and signing from the terminal you already operate.",
    bestFor: "Operators, scripting, and local wallet control",
    action: "Install CLI",
    href: "#setup",
  },
] as const;

const sharedHarness = [
  "One Aomi account",
  "Account-owned conversations",
  "Explicit chain context",
  "Build → simulate → sign → broadcast",
  "Wallet-controlled approval",
  "No private keys sent through MCP or the runtime",
  "Sessions resumable across supported surfaces",
] as const;

const together = [
  {
    icon: Bot,
    title: "Skills teach the workflow",
    body: "Give the outer agent durable instructions for choosing chain context, simulating first, and stopping at approval.",
  },
  {
    icon: Network,
    title: "MCP creates the hosted thread",
    body: "The client works inside an OAuth-authorized, account-owned Aomi conversation without receiving wallet secrets.",
  },
  {
    icon: MonitorCheck,
    title: "Portal makes review visible",
    body: "Open an awaiting request in a visual wallet surface to inspect the exact staged action before approval.",
  },
  {
    icon: Command,
    title: "CLI resumes and signs",
    body: "Pick up the same supported session locally, simulate again, and sign from the machine that controls the wallet.",
  },
] as const;

function HarnessDiagram() {
  return (
    <div
      className={styles.harnessDiagram}
      aria-label="Three agentic tools converge on the Aomi execution harness"
    >
      <div className={styles.entryColumn}>
        <span>
          <Bot aria-hidden />
          Agent Skills
        </span>
        <span>
          <Network aria-hidden />
          Hosted MCP
        </span>
        <span>
          <Terminal aria-hidden />
          Client CLI
        </span>
      </div>
      <div className={styles.converge} aria-hidden>
        <i />
        <i />
        <i />
      </div>
      <div className={styles.harnessNode}>
        <Waypoints aria-hidden />
        <span>Aomi execution harness</span>
      </div>
      <ArrowRight className={styles.diagramArrow} aria-hidden />
      <div className={styles.stageNode}>Simulate</div>
      <ArrowRight className={styles.diagramArrow} aria-hidden />
      <div className={styles.signNode}>
        <KeyRound aria-hidden />
        Sign
      </div>
    </div>
  );
}

export function AgentToolingsPageContent({
  productName = "Agentic Toolings",
}: {
  productName?: string;
}) {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.shell}>
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>{productName}</p>
              <h1>Aomi, wherever your agents work.</h1>
              <p className={styles.heroSupport}>
                Connect coding agents through Skills, hosted MCP, or the CLI.
                Three surfaces, one account-owned execution harness.
              </p>
              <div className={styles.heroActions}>
                <Link href="#surfaces" className={styles.primaryButton}>
                  Choose a surface
                  <ArrowRight aria-hidden />
                </Link>
                <a
                  href={DOCS.mcp}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.secondaryButton}
                >
                  Read the docs
                  <ArrowUpRight aria-hidden />
                </a>
              </div>
            </div>
            <HarnessDiagram />
          </div>
        </div>
      </section>

      <section id="surfaces" className={styles.surfaceSection}>
        <div className={styles.shell}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>CHOOSE YOUR SURFACE</p>
              <h2>Start with the interface your agent already understands.</h2>
            </div>
            <p>
              These entry points share execution infrastructure, but they solve
              different setup, session, and signing problems.
            </p>
          </div>
          <div className={styles.surfaceGrid}>
            {surfaces.map((surface) => {
              const Icon = surface.icon;
              return (
                <article key={surface.id} className={styles.surfaceCard}>
                  <div className={styles.cardTopline}>
                    <span className={styles.surfaceIcon}>
                      <Icon aria-hidden />
                    </span>
                    <span>{surface.index}</span>
                  </div>
                  <h3>{surface.title}</h3>
                  <p>{surface.body}</p>
                  <div className={styles.bestFor}>
                    <span>Best for</span>
                    <strong>{surface.bestFor}</strong>
                  </div>
                  <Link href={`?surface=${surface.id}${surface.href}`}>
                    {surface.action}
                    <ArrowRight aria-hidden />
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <AgenticLab />

      <section className={styles.harnessSection}>
        <div className={styles.shell}>
          <div className={styles.harnessGrid}>
            <div className={styles.harnessCopy}>
              <p className={styles.eyebrow}>THE SHARED HARNESS</p>
              <h2>Different entry point. Same execution boundary.</h2>
              <p>
                The outer interface changes. Aomi still preserves explicit
                context, simulation, and wallet-controlled approval.
              </p>
            </div>
            <ul className={styles.harnessList}>
              {sharedHarness.map((item) => (
                <li key={item}>
                  <Check aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className={styles.togetherSection}>
        <div className={styles.shell}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>USE THEM TOGETHER</p>
              <h2>One workflow can move between every surface.</h2>
            </div>
            <p>
              Skills, MCP, Portal, and CLI are complementary parts of a safe
              operating path—not a single bundle.
            </p>
          </div>
          <div className={styles.togetherGrid}>
            {together.map((item, index) => {
              const Icon = item.icon;
              return (
                <article key={item.title}>
                  <div>
                    <span>0{index + 1}</span>
                    <Icon aria-hidden />
                  </div>
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
          <ShieldCheck aria-hidden className={styles.finalMark} />
          <p className={styles.eyebrow}>READY WHEN YOU ARE</p>
          <h2>Start where your agent already works.</h2>
          <div className={styles.finalActions}>
            <a href={DOCS.skills} target="_blank" rel="noreferrer">
              Install Agent Skills <ArrowUpRight aria-hidden />
            </a>
            <a href={DOCS.mcp} target="_blank" rel="noreferrer">
              Connect MCP <ArrowUpRight aria-hidden />
            </a>
            <a href={DOCS.cli} target="_blank" rel="noreferrer">
              Install the CLI <ArrowUpRight aria-hidden />
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function AgenticSurfacesPage() {
  return <AgentToolingsPageContent />;
}
