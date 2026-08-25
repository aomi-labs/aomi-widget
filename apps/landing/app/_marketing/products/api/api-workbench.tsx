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
    request: `curl https://api.aomi.dev/v1/agent/chat \\
  -H "Authorization: Bearer $AOMI_TOKEN" \\
  -H "Idempotency-Key: 7c1e…" \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "Swap 0.5 ETH to USDC on Base",
    "app": "aomi",
    "wallets": {
      "evm": {
        "address": "0xAb5…",
        "chainId": 8453
      }
    }
  }'`,
    response: `{
  "session": "sess_…",
  "status": "awaiting_action",
  "actions": [{
    "id": "act_…",
    "type": "external_transaction",
    "summary": {
      "title": "Swap 0.5 ETH for ~1,240 USDC"
    },
    "chainId": 8453,
    "transactions": [{
      "to": "0x…",
      "data": "0x…",
      "value": "0x0",
      "simulation": { "success": true }
    }]
  }],
  "cursor": "cur_…"
}`,
    status: "awaiting_action",
    title: "Swap 0.5 ETH for ~1,240 USDC",
    detail: "Uniswap v3 · Base · simulated",
  },
  pipeline: {
    label: "Pipeline API",
    version: "preview",
    endpoint: "POST /v1/pipeline/evm/build",
    request: `curl https://api.aomi.dev/v1/pipeline/evm/build \\
  -H "Authorization: Bearer $AOMI_TOKEN" \\
  -H "Idempotency-Key: 9a40…" \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "aave.supply",
    "args": {
      "token": "USDC",
      "amount": "1000"
    },
    "wallet": "0xAb5…",
    "chainId": 8453
  }'`,
    response: `{
  "status": "guards_passed",
  "plan": {
    "action": "aave.supply",
    "chainId": 8453,
    "guardChecks": [
      "wallet_bound",
      "policy_allowed",
      "simulation_passed"
    ],
    "transactions": [{
      "to": "0x…",
      "data": "0x…",
      "value": "0x0"
    }]
  },
  "signable": { "ready": true }
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
            <span>curl request</span>
          </div>
          <pre key={`${surface}-request`}>
            <code>{example.request}</code>
          </pre>
        </div>

        <div className={styles.responseCodePanel}>
          <div className={styles.panelLabel}>
            <span>200 / application&#47;json</span>
            <span>response</span>
          </div>
          <pre key={`${surface}-response`}>
            <code>{example.response}</code>
          </pre>
        </div>
      </div>

      <div className={styles.actionComposition}>
        <div className={styles.responsePanel}>
          <div className={styles.actionCard} key={`${surface}-action`}>
            <div className={styles.responseStatus}>
              <span>
                <Check aria-hidden /> {example.status}
              </span>
              <span>One durable Action · HTTP 200</span>
            </div>
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
                <small>
                  The sealed transaction goes to the wallet already in your
                  product. Aomi receives the verified result, never the key.
                </small>
              </div>
              <ChevronRight aria-hidden />
            </div>
            <div className={styles.responseFacts}>
              <span>fork simulated</span>
              <span>policy checked</span>
              <span>unsigned out</span>
            </div>
          </div>
        </div>

        <ol className={styles.actionFlow} aria-label="Action lifecycle">
          <li>
            <span>01</span>
            <strong>Request</strong>
            <small>Intent or exact action enters the kernel</small>
          </li>
          <li>
            <span>02</span>
            <strong>Seal</strong>
            <small>Simulation and policy attach to the Action</small>
          </li>
          <li>
            <span>03</span>
            <strong>Sign</strong>
            <small>Your wallet approves the exact payload</small>
          </li>
          <li>
            <span>04</span>
            <strong>Resume</strong>
            <small>The verified result continues the workflow</small>
          </li>
        </ol>
      </div>
    </div>
  );
}
