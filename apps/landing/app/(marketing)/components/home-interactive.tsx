"use client";

import {
  ArrowLeft,
  Check,
  ChevronDown,
  Clipboard,
  Code2,
  Copy,
  MessageSquare,
  Terminal,
  Waypoints,
} from "lucide-react";
import { useState } from "react";
import styles from "../marketing.module.css";

const installers = [
  {
    id: "skills",
    label: "Skills",
    command: "npx skills add aomi-labs/skills",
    icon: Clipboard,
  },
  {
    id: "cli",
    label: "CLI",
    command: "npm install -g @aomi-labs/cli",
    icon: Terminal,
  },
  {
    id: "mcp",
    label: "MCP",
    command: "codex mcp add aomi --url https://chat.aomi.dev/api/mcp",
    icon: Waypoints,
  },
  {
    id: "api",
    label: "API",
    command: "curl https://api.aomi.dev/v1/agents",
    icon: Code2,
  },
] as const;

function CopyButton({
  value,
  dark = false,
}: {
  value: string;
  dark?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label="Copy command"
      className={dark ? styles.copyButtonDark : styles.copyButton}
    >
      {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
    </button>
  );
}

export function V3HeroContent() {
  const [installing, setInstalling] = useState(false);
  const [selected, setSelected] = useState<(typeof installers)[number]>(
    installers[0],
  );
  const [menuOpen, setMenuOpen] = useState(false);

  if (installing) {
    return (
      <div className={styles.heroInstaller}>
        <p className={styles.heroEyebrow}>Aomi Labs</p>
        <h2>Empower your agents onchain</h2>
        <p>
          Install Aomi to Codex, Claude Code, Cursor, OpenCode, or Hermes. Use
          Skills, CLI, hosted MCP, or direct API calls.
        </p>
        <div className={styles.heroCommandRow}>
          <span aria-hidden>&gt;</span>
          <code>{selected.command}</code>
          <CopyButton value={selected.command} dark />
          <div className={styles.heroInstallSelect}>
            <button
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
            >
              <selected.icon aria-hidden />
              {selected.label}
              <ChevronDown aria-hidden />
            </button>
            {menuOpen ? (
              <div>
                {installers.map((tool) => (
                  <button
                    type="button"
                    key={tool.id}
                    onClick={() => {
                      setSelected(tool);
                      setMenuOpen(false);
                    }}
                  >
                    <tool.icon aria-hidden />
                    {tool.label}
                    {selected.id === tool.id ? <Check aria-hidden /> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <span className={styles.heroInstallNote}>
          Embed is one surface among others, not the product.
        </span>
        <div className={styles.heroToolIcons}>
          {installers.map((tool) => (
            <span key={tool.id} title={tool.label}>
              <tool.icon aria-hidden />
            </span>
          ))}
        </div>
        <button
          type="button"
          className={styles.heroBack}
          onClick={() => setInstalling(false)}
        >
          <ArrowLeft aria-hidden /> Back
        </button>
      </div>
    );
  }

  return (
    <div className={styles.heroCopy}>
      <p className={styles.heroEyebrow}>Aomi Labs</p>
      <h1>Execution harness for onchain finance</h1>
      <p>
        Hosted infrastructure for blockchain AI. Bring any model and your APIs;
        Aomi builds, simulates, signs, and broadcasts while people retain
        control. Non-custodial and wallet agnostic.
      </p>
      <div className={styles.heroActions}>
        <button type="button" onClick={() => setInstalling(true)}>
          Start with agents
        </button>
        <a href="/contact">Contact us</a>
      </div>
    </div>
  );
}

const surfaces = {
  "Somm frontend": {
    label: "Somm Assistant · powered by Aomi",
    prompt: "Rebalance my liquidity from EtherFi to Morpho",
    context: ["2,400 weETH · EtherFi", "Morpho band A · +1.9%"],
  },
  Telegram: {
    label: "Aomi execution bot",
    prompt: "Move 20% of idle USDC into the approved vault",
    context: ["mandate loaded · treasury", "vault cap · within policy"],
  },
  Discord: {
    label: "Community strategy agent",
    prompt: "Prepare the weekly rewards distribution",
    context: ["recipient set · 184", "budget · 12,500 USDC"],
  },
  Slack: {
    label: "Operations assistant",
    prompt: "Stage the approved cross-chain rebalance",
    context: ["2 chains · 4 actions", "operator approval required"],
  },
} as const;

export function RuntimeSurfaceDemo() {
  const [surface, setSurface] =
    useState<keyof typeof surfaces>("Somm frontend");
  const current = surfaces[surface];

  return (
    <div className={styles.runtimeDemo}>
      <div className={styles.runtimeTabs}>
        {(Object.keys(surfaces) as (keyof typeof surfaces)[]).map((item) => (
          <button
            type="button"
            key={item}
            className={surface === item ? styles.runtimeTabActive : ""}
            onClick={() => setSurface(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className={styles.runtimeWindow}>
        <div className={styles.runtimeWindowTop}>
          <span>{surface === "Somm frontend" ? "somm.finance" : surface}</span>
          <span>•••</span>
        </div>
        <div className={styles.runtimeAssistant}>
          <div className={styles.runtimeAssistantTitle}>
            <MessageSquare aria-hidden />
            {current.label}
          </div>
          <p className={styles.runtimePrompt}>{current.prompt}</p>
          <div className={styles.runtimeChecks}>
            {current.context.map((item) => (
              <span key={item}>✓ {item}</span>
            ))}
          </div>
          <div className={styles.runtimeBuild}>
            <strong>Building transaction</strong>
            <span>→ resolve positions and approved venues</span>
            <span>→ construct exact transaction sequence</span>
            <span>→ simulate against fresh chain state</span>
            <em>batched → 1 signature · simulated ✓</em>
          </div>
          <button type="button">⌘ Approve &amp; sign</button>
          <small>runs on Aomi</small>
        </div>
      </div>
    </div>
  );
}

const walletSnippets = {
  "Browser wallet": {
    description:
      "Authenticate an existing EOA. No embedded-provider import required.",
    auth: 'auth={{ kind: "browser_wallet" }}',
  },
  Para: {
    description:
      "Resolve a Para wallet while the integrator retains provider credentials.",
    auth: 'auth={{ kind: "para", provider: para }}',
  },
  Privy: {
    description:
      "Use the signed-in Privy wallet as the owner and signing boundary.",
    auth: 'auth={{ kind: "privy", provider: privy }}',
  },
} as const;

export function WalletCodeDemo() {
  const [wallet, setWallet] =
    useState<keyof typeof walletSnippets>("Browser wallet");
  const [surface, setSurface] = useState<"UI" | "Terminal">("UI");
  const snippet =
    surface === "UI"
      ? `import { AomiWidget } from "@aomi-labs/widget-lib";\nimport "@aomi-labs/widget-lib/styles.css";\n\nexport default function Assistant() {\n  return (\n    <AomiWidget\n      applicationId={process.env.AOMI_APPLICATION_ID!}\n      apiUrl={process.env.AOMI_API_URL!}\n      ${walletSnippets[wallet].auth}\n    />\n  );\n}`
      : `aomi auth login --wallet ${wallet.toLowerCase().replace(" ", "-")}\naomi chat "rebalance approved liquidity"\naomi tx list\naomi tx sign <request-id>`;

  return (
    <div className={styles.walletDemo}>
      <div className={styles.walletTabs}>
        <div>
          {(Object.keys(walletSnippets) as (keyof typeof walletSnippets)[]).map(
            (item) => (
              <button
                type="button"
                key={item}
                className={wallet === item ? styles.walletTabActive : ""}
                onClick={() => setWallet(item)}
              >
                {item}
              </button>
            ),
          )}
        </div>
        <div>
          {(["UI", "Terminal"] as const).map((item) => (
            <button
              type="button"
              key={item}
              className={surface === item ? styles.walletTabActive : ""}
              onClick={() => setSurface(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <p className={styles.walletDescription}>
        {walletSnippets[wallet].description}
      </p>
      <div className={styles.codeWindow}>
        <div>
          <span />
          <span />
          <span />
          <CopyButton value={snippet} />
        </div>
        <pre>
          <code>{snippet}</code>
        </pre>
      </div>
    </div>
  );
}

export function InstallPanel() {
  const [selected, setSelected] = useState<(typeof installers)[number]>(
    installers[0],
  );

  return (
    <div className={styles.installPanel}>
      <div className={styles.installCommand}>
        <span aria-hidden>&gt;</span>
        <code>{selected.command}</code>
        <CopyButton value={selected.command} />
      </div>
      <div className={styles.installTools}>
        {installers.map((tool) => (
          <button
            type="button"
            key={tool.id}
            className={selected.id === tool.id ? styles.installToolActive : ""}
            onClick={() => setSelected(tool)}
          >
            <tool.icon aria-hidden />
            {tool.label}
          </button>
        ))}
      </div>
      <p>Embed is one surface among others, not the product.</p>
    </div>
  );
}
