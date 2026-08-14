import { pattern } from "../copy";
import styles from "../v2.module.css";
import { PatternProgress } from "./illustrations";
import { Reveal } from "./reveal";

export function PatternSection() {
  return (
    <section id="integration-pattern" className={`${styles.section} ${styles.sectionMuted}`}>
      <Reveal className={styles.shell}>
        <p className={styles.eyebrow}>{pattern.eyebrow}</p>
        <h2 className={`mt-4 max-w-[640px] ${styles.heading}`}>
          {pattern.headline}
        </h2>
        <p className={`mt-4 ${styles.lede}`}>{pattern.side}</p>

        <div className="mt-10">
          <PatternProgress />
        </div>

        <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {pattern.steps.map((step) => (
            <li
              key={step.n}
              className={`${styles.card} p-4 ${step.accent ? "bg-[color:var(--v2-heading)] text-[color:var(--v2-bg)]" : ""}`}
            >
              <p
                className={`${styles.step} ${
                  step.accent ? "opacity-50" : "text-[color:var(--v2-fg-subtle)]"
                }`}
              >
                {step.n}
              </p>
              <h3 className={`mt-3 ${styles.cardTitleSm} ${step.accent ? "" : "text-[color:var(--v2-heading)]"}`}>{step.title}</h3>
              <p
                className={`mt-1.5 text-[12px] leading-5 ${
                  step.accent ? "opacity-70" : "text-[color:var(--v2-fg)]"
                }`}
              >
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </Reveal>
    </section>
  );
}
