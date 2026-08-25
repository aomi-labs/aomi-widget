import { why } from "../copy";
import styles from "../v2.module.css";
import { WhyIllustration } from "./illustrations";
import { Reveal } from "./reveal";

export function WhySection() {
  return (
    <section className={styles.section}>
      <Reveal className={styles.shell}>
        <p className={styles.eyebrow}>{why.eyebrow}</p>
        <h2 className={`mt-4 max-w-[720px] ${styles.heading}`}>
          {why.headline}
        </h2>
        <p className={`mt-4 ${styles.lede}`}>{why.support}</p>

        <div className="mt-10">
          <WhyIllustration />
        </div>

        <div className="mt-10 grid gap-3 md:grid-cols-3">
          {why.columns.map((col) => (
            <div
              key={col.label}
              className={`${styles.card} p-5 ${col.accent ? "bg-[color:var(--v2-heading)] text-[color:var(--v2-bg)]" : ""}`}
            >
              <p
                className={`${styles.kicker} ${
                  col.accent ? "opacity-50" : "text-[color:var(--v2-fg-subtle)]"
                }`}
              >
                {col.label}
              </p>
              <h3 className={`mt-3 ${styles.cardTitle} ${col.accent ? "" : "text-[color:var(--v2-heading)]"}`}>
                {col.title}
              </h3>
              <p
                className={`mt-2 ${styles.bodySm} ${
                  col.accent ? "opacity-70" : "text-[color:var(--v2-fg)]"
                }`}
              >
                {col.body}
              </p>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
