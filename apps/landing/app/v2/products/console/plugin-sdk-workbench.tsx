"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  File,
  Folder,
  GitBranch,
  Pause,
  Play,
  Rocket,
  Terminal,
} from "lucide-react";
import {
  JOURNEY_STAGES,
  seedBuildSessions,
  type BuildFileNode,
  type JourneyStageId,
} from "../../../../../build/src/features/build/contracts";
import styles from "./plugin-sdk.module.css";

const session = seedBuildSessions[0];

const fileSource: Record<string, string[]> = {
  "lib.rs": [
    "dyn_aomi_app! {",
    '  name: "arb_bot",',
    "  preamble: TRADING_POLICY,",
    "  tools: [quotes, spreads, stage_order],",
    "}",
  ],
  "tool.rs": [
    "#[aomi_tool]",
    "async fn stage_order(args: OrderArgs) -> Result<Action> {",
    "  let spread = venues.compare(&args).await?;",
    "  risk.ensure_bounded(&spread)?;",
    "  Ok(spread.into_action())",
    "}",
  ],
  "hyperliquid.rs": [
    "pub async fn quote(symbol: &str) -> Result<Quote> {",
    "  client.market_snapshot(symbol).await",
    "}",
  ],
  "binance.rs": [
    "pub async fn quote(symbol: &str) -> Result<Quote> {",
    "  client.book_ticker(symbol).await",
    "}",
  ],
  "Cargo.toml": [
    "[package]",
    'name = "arb-bot"',
    'version = "0.1.0"',
    "",
    "[dependencies]",
    'aomi-sdk = "=4.0.0"',
  ],
  "test.json": [
    "{",
    '  "scenario": "paper-trade spread",',
    '  "max_notional": "5000 USDC",',
    '  "expect": "bounded_action"',
    "}",
  ],
};

const stageCopy: Record<
  JourneyStageId,
  { kicker: string; title: string; body: string }
> = {
  describe: {
    kicker: "INTENT",
    title: "Describe the operator.",
    body: "Start from a product requirement, an OpenAPI description, or an existing repository.",
  },
  plan: {
    kicker: "PLAN",
    title: "Review the build before code lands.",
    body: "The plan separates API clients, deliberate tools, operating policy, and the smoke-test fixture.",
  },
  generate: {
    kicker: "GENERATE",
    title: "Inspect every generated file.",
    body: "The output is a normal Rust project. Open the fixture tree to inspect the adapter, policy, or test scenario.",
  },
  compile_test: {
    kicker: "VERIFY",
    title: "Compile and exercise the App.",
    body: "A build is not shippable until SDK compatibility, compilation, and a product-specific smoke test pass.",
  },
  ship: {
    kicker: "SHIP",
    title: "Hand off to a repository-backed Project.",
    body: "The release remains connected to source, SDK compatibility, deployment history, and the runtime that loads it.",
  },
};

function fileName(path: string) {
  return path.split("/").pop() ?? path;
}

function FixtureTree({
  nodes,
  selected,
  onSelect,
  depth = 0,
}: {
  nodes: BuildFileNode[];
  selected: string;
  onSelect: (path: string) => void;
  depth?: number;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  return (
    <>
      {nodes.map((node) => {
        const folder = node.type === "folder";
        const isClosed = collapsed[node.path] ?? depth > 1;
        return (
          <div key={node.path}>
            <button
              type="button"
              className={`${styles.fixtureTreeRow} ${selected === node.path ? styles.fixtureTreeRowActive : ""}`}
              style={{ paddingLeft: `${11 + depth * 12}px` }}
              onClick={() => {
                if (folder) {
                  setCollapsed((value) => ({
                    ...value,
                    [node.path]: !isClosed,
                  }));
                } else {
                  onSelect(node.path);
                }
              }}
            >
              {folder ? (
                isClosed ? (
                  <ChevronRight aria-hidden />
                ) : (
                  <ChevronDown aria-hidden />
                )
              ) : (
                <span />
              )}
              {folder ? <Folder aria-hidden /> : <File aria-hidden />}
              <span>{fileName(node.path)}</span>
            </button>
            {folder && !isClosed && node.children ? (
              <FixtureTree
                nodes={node.children}
                selected={selected}
                onSelect={onSelect}
                depth={depth + 1}
              />
            ) : null}
          </div>
        );
      })}
    </>
  );
}

export function PluginSdkWorkbench() {
  const [stageIndex, setStageIndex] = useState(2);
  const [running, setRunning] = useState(false);
  const [selectedFile, setSelectedFile] = useState("arb-bot/src/tool.rs");
  const activeStage = JOURNEY_STAGES[stageIndex] ?? JOURNEY_STAGES[0];
  const activeCopy = stageCopy[activeStage.id];

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => {
      if (stageIndex >= JOURNEY_STAGES.length - 1) {
        setRunning(false);
      } else {
        setStageIndex(stageIndex + 1);
      }
    }, 1250);
    return () => window.clearTimeout(timer);
  }, [running, stageIndex]);

  const source = useMemo(
    () => fileSource[fileName(selectedFile)] ?? ["// Generated source preview"],
    [selectedFile],
  );

  const beginRun = () => {
    setStageIndex(0);
    setRunning(true);
  };

  const eventIndex = Math.max(
    0,
    Math.min(stageIndex - 1, session.streamEvents.length - 1),
  );

  return (
    <div className={styles.buildShowcase}>
      <div className={styles.buildShowcaseTopbar}>
        <span className={styles.windowDots} aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <span>AOMI BUILD · PRODUCT FIXTURE</span>
        <button
          type="button"
          onClick={running ? () => setRunning(false) : beginRun}
        >
          {running ? <Pause aria-hidden /> : <Play aria-hidden />}
          {running ? "Pause" : "Run build"}
        </button>
      </div>

      <div className={styles.buildShowcaseBody}>
        <nav className={styles.buildJourney} aria-label="Build journey">
          {JOURNEY_STAGES.map((stage, index) => {
            const complete = index < stageIndex;
            const current = index === stageIndex;
            return (
              <button
                key={stage.id}
                type="button"
                className={current ? styles.buildJourneyActive : undefined}
                aria-current={current ? "step" : undefined}
                onClick={() => {
                  setRunning(false);
                  setStageIndex(index);
                }}
              >
                <span>
                  {complete ? (
                    <Check aria-hidden />
                  ) : current ? (
                    <Circle aria-hidden />
                  ) : (
                    index + 1
                  )}
                </span>
                <strong>{stage.title}</strong>
                <small>
                  {complete ? "complete" : current ? "active" : "waiting"}
                </small>
              </button>
            );
          })}
          <i
            className={styles.buildJourneyPulse}
            style={{ top: `${32 + stageIndex * 67}px` }}
          />
        </nav>

        <section className={styles.buildStage} aria-live="polite">
          <header>
            <span>{activeCopy.kicker}</span>
            <small>0{stageIndex + 1} / 05</small>
          </header>
          <h2>{activeCopy.title}</h2>
          <p>{activeCopy.body}</p>

          {activeStage.id === "describe" ? (
            <div className={styles.intentFixture}>
              <span>YOU</span>
              <p>{session.messages[0]?.content}</p>
              <div>
                <button type="button">OpenAPI agent</button>
                <button type="button">Trading adapter</button>
                <button type="button">Wallet operator</button>
              </div>
            </div>
          ) : null}

          {activeStage.id === "plan" ? (
            <ol className={styles.planFixture}>
              {[
                ["Planner", "Map venue clients and typed quote responses"],
                [
                  "Tool designer",
                  "Curate spread, risk, and staged-order tools",
                ],
                ["Policy author", "Encode paper-trade and notional boundaries"],
                ["Tester", "Exercise the exact operator contract"],
              ].map(([role, detail], index) => (
                <li key={role}>
                  <span>0{index + 1}</span>
                  <div>
                    <strong>{role}</strong>
                    <p>{detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          ) : null}

          {activeStage.id === "generate" ? (
            <div className={styles.sourceFixture}>
              <div>
                <span>{selectedFile}</span>
                <small>RUST</small>
              </div>
              <pre>
                <code>
                  {source.map((line, index) => (
                    <span key={`${line}-${index}`}>
                      <i>{index + 1}</i>
                      {line || " "}
                    </span>
                  ))}
                </code>
              </pre>
            </div>
          ) : null}

          {activeStage.id === "compile_test" ? (
            <div className={styles.verifyFixture}>
              {[
                [Terminal, "SDK compatibility", "4.0.0 · compatible"],
                [Check, "Rust compilation", "cdylib · passed"],
                [Play, "Smoke scenario", "bounded_action · passed"],
              ].map(([Icon, title, result]) => {
                const VerifyIcon = Icon as typeof Terminal;
                return (
                  <div key={title as string}>
                    <VerifyIcon aria-hidden />
                    <span>
                      <strong>{title as string}</strong>
                      <small>{result as string}</small>
                    </span>
                    <Check aria-hidden />
                  </div>
                );
              })}
            </div>
          ) : null}

          {activeStage.id === "ship" ? (
            <div className={styles.shipFixture}>
              <Rocket aria-hidden />
              <div>
                <span>READY TO SHIP</span>
                <strong>arb-bot</strong>
                <small>repository linked · release candidate verified</small>
              </div>
              <GitBranch aria-hidden />
            </div>
          ) : null}
        </section>

        <aside className={styles.buildContext}>
          <div className={styles.buildContextHeader}>
            <span>PROJECT OUTPUT</span>
            <small>{session.fileTree.length} ROOT</small>
          </div>
          <div className={styles.buildFixtureTree}>
            <FixtureTree
              nodes={session.fileTree}
              selected={selectedFile}
              onSelect={(path) => {
                setSelectedFile(path);
                setStageIndex(2);
                setRunning(false);
              }}
            />
          </div>
          <div className={styles.buildProgress}>
            <span>BUILD EVENT</span>
            <strong>
              {stageIndex === 0
                ? "Intent captured. Ready to plan."
                : session.streamEvents[eventIndex]?.message}
            </strong>
          </div>
        </aside>
      </div>

      <div className={styles.buildShowcaseStatusbar}>
        <span>
          <i /> FIXTURE · NO REMOTE BUILD
        </span>
        <span>{session.title}</span>
      </div>
    </div>
  );
}
