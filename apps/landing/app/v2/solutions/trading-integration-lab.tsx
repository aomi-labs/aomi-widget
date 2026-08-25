"use client";

import { useState } from "react";
import { Check, Copy, GitBranch, Layers3, Waypoints } from "lucide-react";
import styles from "./trading.module.css";

const modes = [
  {
    id: "one-shot",
    label: "One-shot build",
    badge: "DEFAULT",
    icon: Layers3,
    description:
      "Your harness has already chosen the venue action. One call returns the complete guarded Plan.",
    stages: ["ActionSpec", "build", "simulation + guards", "Plan"],
    code: `const plan = await aomi.pipeline.build(
  catalog.cowswap.order({
    sell: "USDC",
    buy: "WETH",
    amount: "250000",
    limitPrice: "3120",
  }),
)

if (plan.guards.passed) {
  await plan.execute()
}`,
    output: `{
  "simulation": { "ok": true },
  "guards": {
    "passed": true,
    "checks": [
      "exposure <= $500k",
      "slippage <= 15bps",
      "signer authorized"
    ]
  },
  "signable": "external_transaction"
}`,
  },
  {
    id: "state-echo",
    label: "State-echo flow",
    badge: "MULTI-LEG",
    icon: GitBranch,
    description:
      "For routes that pause between decisions, your client carries an opaque signed state token. Aomi stores no session.",
    stages: ["stage legs", "inspect verdict", "commit", "resume token"],
    code: `const draft = aomi.pipeline.draft({
  chainId: 8453,
  skills: ["cowswap"],
})

await draft.stage(withdrawAll)
await draft.stage(hedgeOrder)

const verdict = await draft.simulate()
if (verdict.guards.passed) {
  const plan = await draft.commit()
  await plan.execute()
}`,
    output: `{
  "state": "pst_signed_opaque…",
  "simulation": {
    "ok": true,
    "batchOrder": [1, 2]
  },
  "guards": { "passed": true },
  "followups": []
}`,
  },
  {
    id: "ai-tools",
    label: "Harness tools",
    badge: "AI SDK / MCP",
    icon: Waypoints,
    description:
      "Expose a constrained tool set to the agent you already run. Tools return the Plan; your harness keeps the decision.",
    stages: ["search", "describe", "build", "return Plan"],
    code: `const tools = aomiTools(aomi, {
  actions: [
    "cowswap.order",
    "aave.*",
    "morpho.*",
  ],
  apps: ["cowswap"],
  execute: "return-plan",
})

// Your model chooses whether to execute.
const result = await runYourHarness({ tools })`,
    output: `{
  "tool": "aomi_build",
  "verdict": "guards_passed",
  "summary": {
    "title": "Route bounded ETH order",
    "warnings": []
  },
  "execution": "awaiting_your_harness"
}`,
  },
] as const;

export function TradingIntegrationLab() {
  const [modeId, setModeId] =
    useState<(typeof modes)[number]["id"]>("one-shot");
  const mode = modes.find((item) => item.id === modeId) ?? modes[0];

  return (
    <div className={styles.integrationLab}>
      <div
        className={styles.labModes}
        role="tablist"
        aria-label="Integration pattern"
      >
        {modes.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={item.id === mode.id}
              onClick={() => setModeId(item.id)}
              className={item.id === mode.id ? styles.labModeActive : undefined}
            >
              <Icon aria-hidden />
              <span>{item.label}</span>
              <small>{item.badge}</small>
            </button>
          );
        })}
      </div>

      <div className={styles.labWorkspace}>
        <div className={styles.labNarrative}>
          <p>{mode.description}</p>
          <ol>
            {mode.stages.map((stage, index) => (
              <li key={stage}>
                <span>0{index + 1}</span>
                <strong>{stage}</strong>
                {index < mode.stages.length - 1 ? <i /> : null}
              </li>
            ))}
          </ol>
          <div className={styles.labGuarantee}>
            <Check aria-hidden />
            <span>
              <strong>No Aomi inference</strong>
              The selected action and constraints come from your harness.
            </span>
          </div>
        </div>

        <div className={styles.labCode}>
          <div className={styles.codePane}>
            <div>
              <span>harness.ts</span>
              <Copy aria-hidden />
            </div>
            <pre>
              <code>{mode.code}</code>
            </pre>
          </div>
          <div className={styles.codePane}>
            <div>
              <span>Plan</span>
              <small>200 · GUARDED</small>
            </div>
            <pre>
              <code>{mode.output}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
