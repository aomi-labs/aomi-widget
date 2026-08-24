"use client";

import { useState } from "react";
import {
  Activity,
  Check,
  CircleDot,
  GitBranch,
  Radio,
  Rocket,
} from "lucide-react";
import { geckoterminal } from "../../../../../build/src/features/operate/fixtures/geckoterminal";
import { goalDigger } from "../../../../../build/src/features/operate/fixtures/goal-digger";
import styles from "./plugin-sdk.module.css";

const projectStages = [
  ["SOURCE", "Repository", "you"],
  ["CHECK", "SDK compatible", "Aomi"],
  ["BUILD", "Release published", "GitHub"],
  ["LOAD", "Runtime active", "Aomi"],
  ["PROVE", "Outcome observed", "you"],
] as const;

const apps = {
  transactional: {
    label: "Transactional operator",
    fixture: goalDigger,
  },
  readOnly: {
    label: "Read-only market data",
    fixture: geckoterminal,
  },
} as const;

type AppMode = keyof typeof apps;

export function PluginOperations() {
  const [mode, setMode] = useState<AppMode>("transactional");
  const selected = apps[mode];
  const { meta, detail } = selected.fixture;

  return (
    <div className={styles.operationsSurface}>
      <div className={styles.projectLifecycle}>
        <div className={styles.projectIdentity}>
          <GitBranch aria-hidden />
          <div>
            <span>REPOSITORY-BACKED PROJECT</span>
            <strong>{meta.repo}</strong>
          </div>
          <small>SDK {meta.sdkVersion}</small>
        </div>
        <ol>
          {projectStages.map(([kicker, label, owner], index) => (
            <li key={label}>
              <span>
                <Check aria-hidden />
              </span>
              <small>{kicker}</small>
              <strong>{label}</strong>
              <em>{owner}</em>
              {index < projectStages.length - 1 ? <i /> : null}
            </li>
          ))}
        </ol>
      </div>

      <div className={styles.operateSurface}>
        <header className={styles.operateHeader}>
          <div>
            <span>
              <Radio aria-hidden /> OPERATE AFTER SHIP
            </span>
            <strong>{meta.name}</strong>
            <small>
              <i /> {meta.status} · {meta.families.join(" + ").toUpperCase()}
            </small>
          </div>
          <div
            className={styles.operateModes}
            role="tablist"
            aria-label="App fixture"
          >
            {(Object.keys(apps) as AppMode[]).map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={mode === key}
                className={mode === key ? styles.operateModeActive : undefined}
                onClick={() => setMode(key)}
              >
                {apps[key].label}
              </button>
            ))}
          </div>
        </header>

        <div className={styles.operateFunnel}>
          {detail.funnel.map((step, index) => (
            <div key={step.label}>
              <span>{step.value}</span>
              <small>{step.label}</small>
              {index < detail.funnel.length - 1 ? <i>→</i> : null}
            </div>
          ))}
        </div>

        <div className={styles.operateBody}>
          <div className={styles.activityChart}>
            <div className={styles.operatePanelHeader}>
              <span>
                <Activity aria-hidden /> ACTIVITY BY HOUR
              </span>
              <small>tool calls · transactions</small>
            </div>
            <div
              className={styles.activityBars}
              aria-label="Hourly activity fixture"
            >
              {detail.toolCallsHourly.map((value, index) => {
                const txValue =
                  selected.fixture.card.transactionsHourly?.[index] ?? 0;
                const max = Math.max(...detail.toolCallsHourly, 1);
                return (
                  <span key={index}>
                    <i
                      style={{ height: `${Math.max(3, (value / max) * 100)}%` }}
                    />
                    <b
                      style={{
                        height: `${Math.max(0, (txValue / max) * 100)}%`,
                      }}
                    />
                  </span>
                );
              })}
            </div>
            <div className={styles.chartAxis}>
              <span>00:00</span>
              <span>12:00</span>
              <span>23:00</span>
            </div>
          </div>

          <div className={styles.operateTools}>
            <div className={styles.operatePanelHeader}>
              <span>
                <CircleDot aria-hidden /> TOOL HEALTH
              </span>
              <small>{detail.toolsSummary}</small>
            </div>
            {detail.tools.slice(0, 3).map((tool) => (
              <div key={tool.tool}>
                <strong>{tool.tool}</strong>
                <span>{tool.calls} calls</span>
                <span className={tool.bad ? styles.toolWarning : undefined}>
                  {tool.errorRate}
                </span>
                <small>{tool.p95}</small>
              </div>
            ))}
          </div>
        </div>

        <footer className={styles.operateFooter}>
          <span>
            <Rocket aria-hidden /> CURRENT RELEASE
          </span>
          <strong>{detail.releases[0]?.tag}</strong>
          <small>{detail.releases[0]?.note} · loaded</small>
          <i />
          <span>LIFECYCLE</span>
          <strong>{detail.lifecycle[0]?.[1]} cold start</strong>
        </footer>
      </div>

      <p className={styles.fixtureDisclosure}>
        Deterministic product fixtures from Aomi Build. No repository, runtime,
        model provider, or transaction endpoint is contacted.
      </p>
    </div>
  );
}
