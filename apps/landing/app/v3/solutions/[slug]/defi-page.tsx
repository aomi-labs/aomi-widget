import { ArrowRight, Layers3, ReceiptText, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { SolutionConfig } from "../../../v2/solutions/solution-data";
import { SolutionShowcase } from "../../components/solution-showcase";
import { V3 } from "../../site";
import { WorldMarketsExample } from "./world-markets-example";
import styles from "./defi.module.css";

const needIcons = [ShieldCheck, Layers3, ReceiptText] as const;

export function V3DefiPage({ solution }: { solution: SolutionConfig }) {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroGrid} aria-hidden />
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>{solution.eyebrow}</p>
          <h1>{solution.headline}</h1>
          <p className={styles.lede}>{solution.lede}</p>
          <div className={styles.heroActions}>
            <Link href={`${V3}/contact`}>
              Design your workflow <ArrowRight aria-hidden />
            </Link>
            <a href="#world-markets-example">See a working example</a>
          </div>
        </div>
        <SolutionShowcase solution={solution} />
      </section>

      <section className={styles.proof} aria-label="DeFi product guarantees">
        <div className={styles.proofAudience}>
          <span>Built for</span>
          <p>{solution.audience}</p>
        </div>
        {solution.proof.map((item, index) => (
          <div key={item}>
            <span>0{index + 1}</span>
            <strong>{item}</strong>
          </div>
        ))}
      </section>

      <WorldMarketsExample />

      <section className={styles.needs}>
        <header className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>{solution.valueEyebrow}</p>
            <h2>{solution.valueTitle}</h2>
          </div>
          <p>{solution.valueIntro}</p>
        </header>

        <div className={styles.needGrid}>
          {solution.needs.map((need, index) => {
            const Icon = needIcons[index] ?? Layers3;
            return (
              <article key={need.title}>
                <div>
                  <Icon aria-hidden />
                  <span>0{index + 1}</span>
                </div>
                <h3>{need.title}</h3>
                <p>{need.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.cta}>
        <p className={styles.eyebrow}>Build with Aomi</p>
        <h2>{solution.finalTitle}</h2>
        <p>{solution.finalBody}</p>
        <Link href={`${V3}/contact`}>
          Bring us one real DeFi flow <ArrowRight aria-hidden />
        </Link>
      </section>
    </main>
  );
}
