"use client";

import { Check, Copy, ExternalLink, KeyRound, LogIn } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import styles from "./agentic-surfaces.module.css";

type Surface = "skills" | "mcp" | "cli";
type McpClient = "codex" | "claude" | "cursor";

const surfaceTabs: { id: Surface; label: string }[] = [
  { id: "skills", label: "Skills" },
  { id: "mcp", label: "MCP" },
  { id: "cli", label: "CLI" },
];

const setupContent = {
  skills: {
    eyebrow: "Install in your coding agent",
    title: "Give the agent the workflow before the tools.",
    body: "One skills repository installs the Transact and Build instruction sets. Transact then calls the local Aomi CLI for account and signing operations.",
    code: "npx skills add aomi-labs/skills",
    facts: [
      "Installs aomi-transact",
      "Installs aomi-build",
      "Works with supported skill-aware coding agents",
    ],
  },
  cli: {
    eyebrow: "Install on your machine",
    title: "Operate Aomi directly from the terminal.",
    body: "Use the client for conversations, session recovery, transaction inspection, simulation, and wallet-controlled signing.",
    code: "npm install -g @aomi-labs/client@latest\naomi --version",
    facts: [
      "Local session control",
      "Explicit transaction inspection",
      "Signing stays on your machine",
    ],
  },
} as const;

const mcpClients: Record<
  McpClient,
  { label: string; format: string; code: string }
> = {
  codex: {
    label: "Codex",
    format: "Terminal",
    code: "codex mcp add aomi --url https://chat.aomi.dev/api/mcp\ncodex mcp login aomi",
  },
  claude: {
    label: "Claude Code",
    format: "Terminal",
    code: "claude mcp add --transport http aomi https://chat.aomi.dev/api/mcp",
  },
  cursor: {
    label: "Cursor",
    format: "mcp.json",
    code: `{
  "mcpServers": {
    "aomi": {
      "url": "https://chat.aomi.dev/api/mcp"
    }
  }
}`,
  },
};

const taskPaths: Record<
  Surface,
  { label: string; owner: string; steps: string[]; result: string }
> = {
  skills: {
    label: "Skills",
    owner: "Coding agent + local CLI",
    steps: [
      "Read aomi-transact",
      "Resolve Base context",
      "Call local CLI",
      "Simulate",
      "Request local signing",
    ],
    result:
      "The coding agent follows a durable safety workflow while your local CLI owns account and wallet operations.",
  },
  mcp: {
    label: "MCP",
    owner: "MCP client + account thread",
    steps: [
      "Browser OAuth",
      "Open account thread",
      "Resolve Base context",
      "Stage request",
      "awaiting_user",
    ],
    result:
      "The transaction request stays in the hosted account thread until you approve it through Portal or a supported CLI flow.",
  },
  cli: {
    label: "CLI",
    owner: "Terminal + local wallet",
    steps: [
      "Start Aomi chat",
      "Read Base balance",
      "tx list",
      "tx simulate",
      "tx sign",
    ],
    result:
      "The operator inspects and advances every transaction checkpoint directly from the machine controlling the wallet.",
  },
};

export function AgenticLab() {
  const [surface, setSurface] = useState<Surface>("skills");
  const [mcpClient, setMcpClient] = useState<McpClient>("codex");
  const [taskSurface, setTaskSurface] = useState<Surface>("skills");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const selected = new URLSearchParams(window.location.search).get("surface");
    if (selected === "skills" || selected === "mcp" || selected === "cli") {
      setSurface(selected);
    }
  }, []);

  const activeCode = useMemo(() => {
    if (surface === "mcp") return mcpClients[mcpClient].code;
    return setupContent[surface].code;
  }, [mcpClient, surface]);

  const copyCode = async () => {
    await navigator.clipboard.writeText(activeCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const task = taskPaths[taskSurface];

  return (
    <>
      <section id="setup" className={styles.setupSection}>
        <div className={styles.shell}>
          <div className={styles.labHeading}>
            <div>
              <p className={styles.eyebrow}>INTERACTIVE SETUP</p>
              <h2>Connect the surface you chose.</h2>
            </div>
            <div
              className={styles.mainTabs}
              role="tablist"
              aria-label="Setup surface"
            >
              {surfaceTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={surface === tab.id}
                  className={surface === tab.id ? styles.activeTab : ""}
                  onClick={() => {
                    setSurface(tab.id);
                    setCopied(false);
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.setupPanel}>
            <div className={styles.setupCopy}>
              {surface === "mcp" ? (
                <>
                  <p className={styles.panelEyebrow}>
                    Connect through browser OAuth
                  </p>
                  <h3>
                    Give the client access to your Aomi account—not your wallet
                    keys.
                  </h3>
                  <p>
                    Add the hosted endpoint, then complete authorization in the
                    browser. The MCP client works inside account-owned Aomi
                    sessions.
                  </p>
                  <ol className={styles.oauthSteps}>
                    <li>
                      <span>1</span>
                      <strong>Add the endpoint</strong>
                    </li>
                    <li>
                      <span>2</span>
                      <strong>
                        <LogIn aria-hidden />
                        Authorize in browser
                      </strong>
                    </li>
                    <li>
                      <span>3</span>
                      <strong>Resume the account thread</strong>
                    </li>
                  </ol>
                </>
              ) : (
                <>
                  <p className={styles.panelEyebrow}>
                    {setupContent[surface].eyebrow}
                  </p>
                  <h3>{setupContent[surface].title}</h3>
                  <p>{setupContent[surface].body}</p>
                  <ul className={styles.setupFacts}>
                    {setupContent[surface].facts.map((fact) => (
                      <li key={fact}>
                        <Check aria-hidden />
                        {fact}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <div className={styles.codePanel}>
              <div className={styles.codeTopbar}>
                {surface === "mcp" ? (
                  <div
                    className={styles.clientTabs}
                    role="tablist"
                    aria-label="MCP client"
                  >
                    {(Object.keys(mcpClients) as McpClient[]).map((client) => (
                      <button
                        key={client}
                        type="button"
                        role="tab"
                        aria-selected={mcpClient === client}
                        className={
                          mcpClient === client ? styles.activeClient : ""
                        }
                        onClick={() => {
                          setMcpClient(client);
                          setCopied(false);
                        }}
                      >
                        {mcpClients[client].label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span>
                    {surface === "skills" ? "Agent terminal" : "Terminal"}
                  </span>
                )}
                <button
                  type="button"
                  className={styles.copyButton}
                  onClick={copyCode}
                >
                  {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              {surface === "mcp" ? (
                <div className={styles.codeLabel}>
                  {mcpClients[mcpClient].format}
                </div>
              ) : null}
              <pre>
                <code>{activeCode}</code>
              </pre>
              {surface === "skills" ? (
                <div className={styles.installedSkills}>
                  <span>
                    <Check aria-hidden />
                    aomi-transact
                  </span>
                  <span>
                    <Check aria-hidden />
                    aomi-build
                  </span>
                </div>
              ) : null}
              {surface === "mcp" ? (
                <div className={styles.oauthNotice}>
                  <KeyRound aria-hidden />
                  <span>
                    <strong>Browser OAuth opens next.</strong> Approve account
                    access there; do not paste a private key into the client.
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.taskSection}>
        <div className={styles.shell}>
          <div className={styles.taskHeading}>
            <div>
              <p className={styles.eyebrow}>ONE TASK, THREE PATHS</p>
              <h2>See where execution and approval actually happen.</h2>
            </div>
            <div className={styles.taskPrompt}>
              <span>Prompt</span>
              <p>
                “Find my USDC balance on Base, then prepare a simulated
                deposit.”
              </p>
            </div>
          </div>

          <div className={styles.taskLab}>
            <div
              className={styles.taskTabs}
              role="tablist"
              aria-label="Task execution surface"
            >
              {surfaceTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={taskSurface === tab.id}
                  className={taskSurface === tab.id ? styles.activeTaskTab : ""}
                  onClick={() => setTaskSurface(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className={styles.taskOwner}>
              <span>Execution owner</span>
              <strong>{task.owner}</strong>
            </div>
            <div className={styles.taskPath}>
              {task.steps.map((step, index) => (
                <div key={step}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{step}</strong>
                  {index < task.steps.length - 1 ? <i aria-hidden /> : null}
                </div>
              ))}
            </div>
            <p className={styles.taskResult}>{task.result}</p>
          </div>
          <a
            className={styles.taskDocs}
            href="https://aomi.dev/docs/guides/mcp"
            target="_blank"
            rel="noreferrer"
          >
            Read the execution handoff guide <ExternalLink aria-hidden />
          </a>
        </div>
      </section>
    </>
  );
}
