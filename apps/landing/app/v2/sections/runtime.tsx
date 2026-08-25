import { runtime } from "../copy";
import styles from "../v2.module.css";
import { RuntimeIllustration } from "./illustrations";
import { Reveal } from "./reveal";

export function RuntimeSection() {
  return (
    <section className={`${styles.section} ${styles.sectionMuted}`}>
      <Reveal className={styles.shell}>
        <p className={styles.eyebrow}>{runtime.eyebrow}</p>
        <h2 className={`mt-4 max-w-[640px] ${styles.heading}`}>
          {runtime.headline}
        </h2>
        <p className={`mt-4 ${styles.lede}`}>{runtime.support}</p>

        <div className="mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <RuntimeIllustration />
          <div className="grid gap-3 sm:grid-cols-2">
            {runtime.props.map((prop) => (
              <div key={prop.title} className={`${styles.card} p-5`}>
                <h3 className={`${styles.cardTitleSm} text-[color:var(--v2-heading)]`}>
                  {prop.title}
                </h3>
                <p className={`mt-2 ${styles.bodySm}`}>{prop.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {runtime.stats.map((stat) => (
            <div key={stat.label} className={`${styles.card} px-5 py-5`}>
              <p className={`${styles.cardTitle} text-[color:var(--v2-heading)]`}>
                {stat.value}
              </p>
              <p className={`mt-2 ${styles.kicker} text-[color:var(--v2-fg-subtle)]`}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
