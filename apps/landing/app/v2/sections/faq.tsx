import { faq } from "../copy";
import styles from "../v2.module.css";
import { FaqList } from "./faq-accordion";
import { Reveal } from "./reveal";

export function FaqSection() {
  return (
    <section className={`${styles.section} pt-20 pb-10 md:pt-28 md:pb-12`}>
      <Reveal className={styles.shell}>
        <div className="mx-auto max-w-[720px] text-center">
          <span className={`${styles.kicker} inline-flex items-center rounded-full bg-[color:var(--v2-card-muted)] px-3 py-1 text-[color:var(--v2-fg)]`}>
            {faq.badge}
          </span>
          <h2 className={`${styles.displayMd} mx-auto mt-6 max-w-[420px]`}>
            {faq.heading}
          </h2>
          <p className={`${styles.lede} mx-auto mt-4 max-w-[440px]`}>
            {faq.headline}
          </p>
        </div>

        <div className="mt-12 md:mt-14">
          <FaqList items={faq.items} />
        </div>
      </Reveal>
    </section>
  );
}
