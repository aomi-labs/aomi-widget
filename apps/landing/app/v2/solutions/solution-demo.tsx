"use client";

import { useState } from "react";
import { Check, ChevronRight, ShieldCheck } from "lucide-react";
import type { SolutionConfig } from "./solution-data";
import styles from "./solutions.module.css";

export function SolutionDemo({ solution }: { solution: SolutionConfig }) {
  const [selectedId, setSelectedId] = useState(solution.demoOptions[0].id);
  const selected =
    solution.demoOptions.find((option) => option.id === selectedId) ??
    solution.demoOptions[0];

  return (
    <div className={styles.demoShell}>
      <div className={styles.demoTopbar}>
        <div>
          <span className={styles.demoPulse} />
          {solution.demoName}
        </div>
        <span>{solution.demoContext}</span>
      </div>

      <div className={styles.demoBody}>
        <div className={styles.demoOptions} role="tablist" aria-label="Mandate">
          {solution.demoOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={option.id === selected.id}
              className={
                option.id === selected.id ? styles.demoOptionActive : undefined
              }
              onClick={() => setSelectedId(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <p className={styles.demoPrompt}>{selected.prompt}</p>

        <article className={styles.actionCard}>
          <div className={styles.actionCardHeader}>
            <span>PROPOSED ACTION</span>
            <span>
              <ShieldCheck aria-hidden /> GUARDED
            </span>
          </div>
          <h3>{selected.title}</h3>
          <p>{selected.detail}</p>

          <div className={styles.demoMetrics}>
            {selected.metrics.map((metric) => (
              <div key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </div>
            ))}
          </div>

          <div className={styles.demoChecks}>
            {selected.checks.map((check) => (
              <span key={check}>
                <Check aria-hidden />
                {check}
              </span>
            ))}
          </div>

          <button type="button" className={styles.reviewButton}>
            Review signable Action <ChevronRight aria-hidden />
          </button>
        </article>
      </div>
    </div>
  );
}
