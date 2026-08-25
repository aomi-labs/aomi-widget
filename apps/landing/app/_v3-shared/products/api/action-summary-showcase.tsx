"use client";

import { ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import styles from "./rest-api.module.css";

type SourceKey = "agent" | "pipeline" | "safe";

type FieldKey = "title" | "steps" | "cost" | "warnings" | "expiresAt";

type SheetStep = {
  label: string;
  sub?: string;
  amount?: string;
  direction?: "out" | "in";
};

type SheetExample = {
  tabLabel: string;
  tabTag: string;
  sourceExpr: string;
  sourceNote: string;
  title: string;
  steps: SheetStep[];
  cost: string;
  warning?: string;
  deferredHint?: string;
  usedFields: FieldKey[];
  requestLabel: string;
  request: string[];
};

const sheetExamples: Record<SourceKey, SheetExample> = {
  agent: {
    tabLabel: "Agent API",
    tabTag: "v1",
    sourceExpr: "event.action.summary",
    sourceNote: "from a chat turn",
    title: "Swap 0.5 ETH for ~1,240 USDC",
    steps: [
      { label: "Wrap 0.5 ETH", amount: "−0.5 ETH", direction: "out" },
      {
        label: "Swap via Uniswap v3",
        sub: "Simulated · guards passed",
        amount: "+1,240.18 USDC",
        direction: "in",
      },
    ],
    cost: "Gas: you pay ~$1.20",
    warning: "Price impact 2.3%",
    usedFields: ["title", "steps", "cost", "warnings"],
    requestLabel: "one call · chat",
    request: [
      'POST /v1/agent/chat',
      'Authorization: Bearer $AOMI_TOKEN',
      'Idempotency-Key: 7c1e…',
      '',
      '{ "message": "Swap 0.5 ETH to USDC on Base",',
      '  "app": "aomi",',
      '  "wallets": { "evm": { "address": "0xAb5…", "chainId": 8453 } } }',
    ],
  },
  pipeline: {
    tabLabel: "Pipeline API",
    tabTag: "preview",
    sourceExpr: "plan.action.summary",
    sourceNote: "from /v1/pipeline/evm/build",
    title: "Rotate 2,000 USDC into Morpho",
    steps: [
      {
        label: "Withdraw from Aave v3",
        sub: "2,000 aUSDC redeemed",
        amount: "+2,000 USDC",
        direction: "in",
      },
      {
        label: "Supply to Morpho Blue",
        sub: "Simulated as one atomic batch",
        amount: "−2,000 USDC",
        direction: "out",
      },
    ],
    cost: "Gas: sponsored · 1 signature",
    usedFields: ["title", "steps", "cost"],
    requestLabel: "three calls · stage, stage, commit",
    request: [
      'POST /v1/pipeline/evm/stage',
      '{ "action": "aave.withdraw", "args": { "amount": "ALL" },',
      '  "wallet": "0xAb5…", "chainId": 8453 }',
      '→ { "state": "pst_…", "staged": [{ "id": 1 }] }',
      '',
      'POST /v1/pipeline/evm/stage',
      '{ "state": "pst_…", "action": "morpho.deposit", "args": { "amount": "ALL" } }',
      '',
      'POST /v1/pipeline/evm/commit',
      '{ "state": "pst_…", "ids": [1, 2] }        // one batch, one signature',
    ],
  },
  safe: {
    tabLabel: "Safe signer",
    tabTag: "deferred",
    sourceExpr: 'aomi.actions.get("act_…").summary',
    sourceNote: "same object, any device",
    title: "Transfer 50,000 USDC to treasury ops",
    steps: [
      {
        label: "Transfer to ops.aomi.eth",
        sub: "Safe 2-of-3 · Base",
        amount: "−50,000 USDC",
        direction: "out",
      },
    ],
    cost: "Gas: paid by the Safe",
    deferredHint: "Awaiting 2 of 3 signatures. The Action waits.",
    usedFields: ["title", "steps", "cost", "expiresAt"],
    requestLabel: "recover, then report deferred",
    request: [
      'GET /v1/agent/chat/{session}?cursor=cur_…',
      '// unresolved actions come back in every delta, from any device',
      '',
      'POST /v1/agent/chat/{session}/actions/{action}/result',
      '{ "status": "deferred", "reference": "safe:tx:0x…" }   // quorum still open',
    ],
  },
};

type CodeLine = { field?: FieldKey; content: ReactNode };

function interfaceLines(): CodeLine[] {
  const kw = styles.showcaseKw;
  const ty = styles.showcaseTy;
  const cm = styles.showcaseCm;
  const str = styles.showcaseStr;

  return [
    {
      content: (
        <>
          <span className={kw}>interface</span>{" "}
          <span className={ty}>ActionSummary</span> {"{"}
        </>
      ),
    },
    {
      field: "title",
      content: (
        <>
          {"  title: "}
          <span className={ty}>string</span>
        </>
      ),
    },
    {
      field: "steps",
      content: (
        <>
          {"  steps: "}
          <span className={ty}>Step</span>
          {"[]        "}
          <span className={cm}>{"// what happens, in order"}</span>
        </>
      ),
    },
    {
      field: "cost",
      content: (
        <>
          {"  cost: "}
          <span className={ty}>Cost</span>
          {"           "}
          <span className={cm}>{"// gas payer, fees, all-in"}</span>
        </>
      ),
    },
    {
      field: "warnings",
      content: (
        <>
          {"  warnings: "}
          <span className={ty}>Warning</span>
          {"[]  "}
          <span className={cm}>{"// empty = clean"}</span>
        </>
      ),
    },
    {
      field: "expiresAt",
      content: (
        <>
          {"  expiresAt: "}
          <span className={ty}>string</span> <span className={kw}>|</span>{" "}
          <span className={kw}>null</span>
        </>
      ),
    },
    { content: "}" },
    { content: " " },
    {
      content: (
        <>
          <span className={kw}>interface</span> <span className={ty}>Step</span>{" "}
          {"{"}
        </>
      ),
    },
    {
      content: (
        <>
          {"  label: "}
          <span className={ty}>string</span>
        </>
      ),
    },
    {
      content: (
        <>
          {"  detail?: "}
          <span className={ty}>string</span>
        </>
      ),
    },
    {
      content: (
        <>
          {"  asset?: {            "}
          <span className={cm}>{"// present when value moves"}</span>
        </>
      ),
    },
    {
      content: (
        <>
          {"    direction: "}
          <span className={str}>&apos;out&apos;</span>{" "}
          <span className={kw}>|</span>{" "}
          <span className={str}>&apos;in&apos;</span>
        </>
      ),
    },
    {
      content: (
        <>
          {"    amount: "}
          <span className={ty}>string</span>
          {"    "}
          <span className={cm}>{"// human units, always"}</span>
        </>
      ),
    },
    {
      content: (
        <>
          {"    symbol: "}
          <span className={ty}>string</span>
        </>
      ),
    },
    {
      content: (
        <>
          {"    usd?: "}
          <span className={ty}>string</span>
        </>
      ),
    },
    { content: "  }" },
    { content: "}" },
  ];
}

const HTTP_TOKEN =
  /("(?:\\.|[^"\\])*"|\/\/[^\n]*|\b(?:POST|GET|PATCH|DELETE)\b|\btrue\b|\bfalse\b|\bnull\b|\b\d[\d]*\b)/g;

function highlightHttp(line: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let cursor = 0;

  for (const match of line.matchAll(HTTP_TOKEN)) {
    const index = match.index ?? 0;
    if (index > cursor) parts.push(line.slice(cursor, index));

    const token = match[0];
    let className = styles.showcaseKw;
    if (token.startsWith("//")) className = styles.showcaseCm;
    else if (token.startsWith('"')) className = styles.showcaseStr;
    else if (/^(?:POST|GET|PATCH|DELETE)$/.test(token)) {
      className = styles.showcaseMethod;
    }

    parts.push(
      <span key={`${index}-${token}`} className={className}>
        {token}
      </span>,
    );
    cursor = index + token.length;
  }

  if (cursor < line.length) parts.push(line.slice(cursor));
  return parts;
}

function RequestCode({ lines }: { lines: string[] }) {
  return (
    <pre>
      <code>
        {lines.map((line, index) => (
          <span key={index} className={styles.showcaseLine}>
            {line.length > 0 ? highlightHttp(line) : "\u00a0"}
          </span>
        ))}
      </code>
    </pre>
  );
}

function InterfaceCode({ used }: { used: FieldKey[] }) {
  const lines = interfaceLines();
  return (
    <pre>
      <code>
        {lines.map((line, index) => {
          const dim = line.field !== undefined && !used.includes(line.field);
          return (
            <span
              key={index}
              className={`${styles.showcaseLine} ${dim ? styles.showcaseLineDim : ""}`}
            >
              {line.content}
            </span>
          );
        })}
      </code>
    </pre>
  );
}

export function ActionSummaryShowcase() {
  const [source, setSource] = useState<SourceKey>("agent");
  const example = sheetExamples[source];

  return (
    <div className={styles.showcase}>
      <div className={styles.showcaseTopline}>
        <div
          className={styles.showcaseTabs}
          role="tablist"
          aria-label="Where the Action came from"
        >
          {(Object.keys(sheetExamples) as SourceKey[]).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={source === key}
              className={source === key ? styles.showcaseTabActive : ""}
              onClick={() => setSource(key)}
            >
              {sheetExamples[key].tabLabel}
              <span>{sheetExamples[key].tabTag}</span>
            </button>
          ))}
        </div>
        <span className={styles.showcaseChip}>
          <ShieldCheck aria-hidden /> one ConfirmSheet · every source
        </span>
      </div>

      <div className={styles.showcaseRequest} key={`${source}-req`}>
        <div className={styles.showcaseTypeLabel}>
          <span>{example.requestLabel}</span>
          <span>raw http · the call that produced the Action</span>
        </div>
        <RequestCode lines={example.request} />
      </div>

      <div className={styles.showcaseBody}>
        <div className={styles.showcaseType}>
          <div className={styles.showcaseTypeLabel}>
            <span>action.summary</span>
            <span>typed · sealed by the kernel</span>
          </div>
          <InterfaceCode used={example.usedFields} />
          <p className={styles.showcaseTypeFoot}>
            <span>filled by this example</span>
            {(["title", "steps", "cost", "warnings", "expiresAt"] as const).map(
              (field) => (
                <em
                  key={field}
                  data-dim={
                    example.usedFields.includes(field) ? undefined : true
                  }
                >
                  {field}
                </em>
              ),
            )}
          </p>
        </div>

        <div className={styles.showcaseSheetCol}>
          <p className={styles.showcaseSource} key={`${source}-src`}>
            <code>{example.sourceExpr}</code>
            <span>{"// " + example.sourceNote}</span>
          </p>

          <article
            className={styles.confirmSheet}
            key={source}
            aria-label={`Confirm sheet rendered from the ${example.tabLabel} action`}
          >
            <h3>{example.title}</h3>
            <div className={styles.confirmSteps}>
              {example.steps.map((step) => (
                <div key={step.label} className={styles.confirmStep}>
                  <span className={styles.confirmStepLabel}>
                    {step.label}
                    {step.sub ? <small>{step.sub}</small> : null}
                  </span>
                  {step.amount ? (
                    <span
                      className={
                        step.direction === "in"
                          ? styles.confirmAmtIn
                          : styles.confirmAmtOut
                      }
                    >
                      {step.amount}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
            <div className={styles.confirmMeta}>
              <span>{example.cost}</span>
              {example.warning ? (
                <span className={styles.confirmWarning}>
                  &#9888; {example.warning}
                </span>
              ) : null}
            </div>
            {example.deferredHint ? (
              <div className={styles.confirmDeferred}>
                <i aria-hidden /> {example.deferredHint}
              </div>
            ) : (
              <div className={styles.confirmButtons}>
                <span className={styles.confirmReject}>Reject</span>
                <span className={styles.confirmApprove}>Approve</span>
              </div>
            )}
          </article>

          <p className={styles.showcaseFoot}>
            rendered entirely from the type · the renderer maps over steps
          </p>
        </div>
      </div>

      <p className={styles.showcaseCaption}>
        A single swap, an ordered batch, a transfer waiting on a Safe quorum:
        the renderer never branches. Ship one confirm sheet and it covers
        everything either API will ever produce.
      </p>
    </div>
  );
}
