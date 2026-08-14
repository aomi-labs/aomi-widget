import { pipeline } from "../copy";
import styles from "../v2.module.css";
import { PipelineIllustration } from "./illustrations";
import { Reveal } from "./reveal";

export function PipelineSection() {
  return (
    <section className={styles.section}>
      <Reveal className={styles.shell}>
        <p className={styles.eyebrow}>{pipeline.eyebrow}</p>
        <h2 className={`mt-4 max-w-[640px] ${styles.heading}`}>
          {pipeline.headline}
        </h2>
        <p className={`mt-4 ${styles.lede}`}>{pipeline.support}</p>

        <div className="mt-10">
          <PipelineIllustration />
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {pipeline.stages.map((stage) => (
            <div key={stage.n} className={`${styles.card} p-5`}>
              <p className={`${styles.step} text-[color:var(--v2-fg-subtle)]`}>
                {stage.n}
              </p>
              <h3 className={`mt-3 ${styles.cardTitleSm} text-[color:var(--v2-heading)]`}>
                {stage.title}
              </h3>
              <p className="mt-2 text-[13px] leading-[1.55]">
                {stage.body}
              </p>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
