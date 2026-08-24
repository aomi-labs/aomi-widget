"use client";

import { Check, ChevronRight, ShieldCheck } from "lucide-react";
import { useState } from "react";
import styles from "./rest-api.module.css";

type Surface = "agent" | "pipeline";

const examples = {
  agent: {
    label: "Agent API",
    version: "v1",
    endpoint: "POST /v1/agent/chat",
    request: `{
  "message": "Swap 0.5 ETH to USDC on Base",
  "app": "aomi",
  "wallets": {
    "evm": { "address": "0xAb5…", "chainId": 8453 }
  }
}`,
    status: "awaiting_action",
    title: "Swap 0.5 ETH for ~1,240 USDC",
    detail: "Uniswap v3 · Base · simulated",
  },
  pipeline: {
    label: "Pipeline API",
    version: "preview",
    endpoint: "POST /v1/pipeline/evm/build",
    request: `{
  "action": "aave.supply",
  "args": { "token": "USDC", "amount": "1000" },
  "wallet": "0xAb5…",
  "chainId": 8453
}`,
    status: "guards_passed",
    title: "Supply 1,000 USDC to Aave v3",
    detail: "3 checks passed · signable ready",
  },
} as const;

export function ApiWorkbench() {
  const [surface, setSurface] = useState<Surface>("agent");
  const example = examples[surface];

  return (
    <div className={styles.workbench}>
      <div className={styles.workbenchTopline}>
        <div
          className={styles.surfaceTabs}
          role="tablist"
          aria-label="API path"
        >
          {(Object.keys(examples) as Surface[]).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={surface === key}
              className={surface === key ? styles.surfaceTabActive : ""}
              onClick={() => setSurface(key)}
            >
              {examples[key].label}
              <span>{examples[key].version}</span>
            </button>
          ))}
        </div>
        <span className={styles.liveContract}>
          <i aria-hidden /> JSON REST
        </span>
      </div>

      <div className={styles.workbenchBody}>
        <div className={styles.requestPanel}>
          <div className={styles.panelLabel}>
            <span>{example.endpoint}</span>
            <span>request</span>
          </div>
          <pre key={`${surface}-request`}>
            <code>{example.request}</code>
          </pre>
        </div>

        <div className={styles.responsePanel}>
          <div className={styles.responseStatus}>
            <span>
              <Check aria-hidden /> {example.status}
            </span>
            <span>200</span>
          </div>
          <div className={styles.actionCard} key={`${surface}-action`}>
            <div className={styles.actionCardTop}>
              <span>ACTION SUMMARY</span>
              <ShieldCheck aria-hidden />
            </div>
            <h3>{example.title}</h3>
            <p>{example.detail}</p>
            <div className={styles.actionStep}>
              <span>01</span>
              <div>
                <strong>Review signable payload</strong>
                <small>Your wallet remains the signer</small>
              </div>
              <ChevronRight aria-hidden />
            </div>
          </div>
          <div className={styles.responseFacts}>
            <span>fork simulated</span>
            <span>policy checked</span>
            <span>unsigned out</span>
          </div>
        </div>
      </div>
    </div>
  );
}
