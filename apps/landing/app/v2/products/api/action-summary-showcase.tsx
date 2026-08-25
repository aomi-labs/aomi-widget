"use client";

import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import styles from "./rest-api.module.css";

type SourceKey = "agent" | "pipeline" | "safe";

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
  },
};

function InterfaceCode() {
  const kw = styles.showcaseKw;
  const ty = styles.showcaseTy;
  const cm = styles.showcaseCm;
  const str = styles.showcaseStr;
  return (
    <pre>
      <code>
        <span className={kw}>interface</span>{" "}
        <span className={ty}>ActionSummary</span> {"{"}
        {"\n  title: "}
        <span className={ty}>string</span>
        {"\n  steps: "}
        <span className={ty}>Step</span>
        {"[]        "}
        <span className={cm}>{"// what happens, in order"}</span>
        {"\n  cost: "}
        <span className={ty}>Cost</span>
        {"           "}
        <span className={cm}>{"// gas payer, fees, all-in"}</span>
        {"\n  warnings: "}
        <span className={ty}>Warning</span>
        {"[]  "}
        <span className={cm}>{"// empty = clean"}</span>
        {"\n  expiresAt: "}
        <span className={ty}>string</span> <span className={kw}>|</span>{" "}
        <span className={kw}>null</span>
        {"\n}"}
        {"\n\n"}
        <span className={kw}>interface</span> <span className={ty}>Step</span>{" "}
        {"{"}
        {"\n  label: "}
        <span className={ty}>string</span>
        {"\n  detail?: "}
        <span className={ty}>string</span>
        {"\n  asset?: {            "}
        <span className={cm}>{"// present when value moves"}</span>
        {"\n    direction: "}
        <span className={str}>&apos;out&apos;</span>{" "}
        <span className={kw}>|</span>{" "}
        <span className={str}>&apos;in&apos;</span>
        {"\n    amount: "}
        <span className={ty}>string</span>
        {"    "}
        <span className={cm}>{"// human units, always"}</span>
        {"\n    symbol: "}
        <span className={ty}>string</span>
        {"\n    usd?: "}
        <span className={ty}>string</span>
        {"\n  }"}
        {"\n}"}
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

      <div className={styles.showcaseBody}>
        <div className={styles.showcaseType}>
          <div className={styles.showcaseTypeLabel}>
            <span>action.summary</span>
            <span>typed · sealed by the kernel</span>
          </div>
          <InterfaceCode />
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
