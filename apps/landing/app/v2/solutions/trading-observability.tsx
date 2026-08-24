"use client";

import { useState } from "react";
import { Activity, AlertTriangle, Check, Radio, RotateCw } from "lucide-react";
import { goalDigger } from "../../../../build/src/features/operate/fixtures/goal-digger";
import styles from "./trading.module.css";

type View = "flow" | "exceptions" | "runtime";

const views = [
  ["flow", "Execution flow"],
  ["exceptions", "Exceptions"],
  ["runtime", "Runtime + releases"],
] as const;

export function TradingObservability() {
  const [view, setView] = useState<View>("flow");
  const { detail, meta, card } = goalDigger;
  const txFlow = detail.funnel.slice(2);
  const maxActivity = Math.max(...detail.toolCallsHourly, 1);

  return (
    <div className={styles.tradingObserve}>
      <header className={styles.tradingObserveHeader}>
        <div>
          <span>
            <Radio aria-hidden /> EXECUTION ADAPTER · FIXTURE
          </span>
          <strong>platform-trading-rails</strong>
          <small>
            <i /> healthy · SDK {meta.sdkVersion}
          </small>
        </div>
        <div role="tablist" aria-label="Observability view">
          {views.map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              className={
                view === id ? styles.tradingObserveTabActive : undefined
              }
              onClick={() => setView(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {view === "flow" ? (
        <div className={styles.observeFlow}>
          <div className={styles.observeFlowRail}>
            <div>
              <span>{card.toolCalls24h}</span>
              <small>Adapter calls</small>
              <i>→</i>
            </div>
            {txFlow.map((item, index) => (
              <div key={item.label}>
                <span>{item.value}</span>
                <small>{item.label.replace("Tx ", "")}</small>
                {index < txFlow.length - 1 ? <i>→</i> : null}
              </div>
            ))}
          </div>
          <div className={styles.observeActivity}>
            <div>
              <span>
                <Activity aria-hidden /> ADAPTER ACTIVITY
              </span>
              <small>calls · submitted actions</small>
            </div>
            <div className={styles.observeBars}>
              {detail.toolCallsHourly.map((value, index) => (
                <span key={index}>
                  <i
                    style={{
                      height: `${Math.max(2, (value / maxActivity) * 100)}%`,
                    }}
                  />
                  <b
                    style={{
                      height: `${Math.max(0, ((card.transactionsHourly?.[index] ?? 0) / maxActivity) * 100)}%`,
                    }}
                  />
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {view === "exceptions" ? (
        <div className={styles.observeExceptions}>
          <div className={styles.observeExceptionLead}>
            <AlertTriangle aria-hidden />
            <span>
              <small>HOT PATH</small>
              <strong>
                {detail.tools.find((tool) => tool.bad)?.tool ?? "none"}
              </strong>
              <p>
                Failures remain attributable to one adapter operation instead of
                disappearing inside the platform harness.
              </p>
            </span>
          </div>
          <div className={styles.observeToolRows}>
            {detail.tools.slice(0, 4).map((tool) => (
              <div key={tool.tool}>
                <strong>{tool.tool}</strong>
                <span>{tool.calls} calls</span>
                <span className={tool.bad ? styles.observeBad : undefined}>
                  {tool.errorRate}
                </span>
                <small>{tool.last}</small>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {view === "runtime" ? (
        <div className={styles.observeRuntime}>
          <div className={styles.observeLifecycle}>
            <span>
              <RotateCw aria-hidden /> RUNTIME LIFECYCLE
            </span>
            {detail.lifecycle.map(([label, value]) => (
              <div key={label}>
                <small>{label}</small>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <div className={styles.observeReleases}>
            <span>RELEASE HISTORY</span>
            {detail.releases.map((release) => (
              <div key={release.tag}>
                <i>{release.current ? <Check aria-hidden /> : null}</i>
                <strong>{release.tag}</strong>
                <small>{release.note}</small>
                <em>{release.current ? "current" : release.when}</em>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <footer>
        BUILD OBSERVABILITY CONTRACT · LABELS ADAPTED FOR A PLATFORM-OWNED
        PIPELINE INTEGRATION · NO LIVE TRAFFIC
      </footer>
    </div>
  );
}
