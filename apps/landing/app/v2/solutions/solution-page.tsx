import type { CSSProperties } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Layers3,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";
import type { SolutionConfig } from "./solution-data";
import { SolutionDemo } from "./solution-demo";
import styles from "./solutions.module.css";

export function SolutionLanding({ solution }: { solution: SolutionConfig }) {
  const theme = {
    "--solution-accent": solution.accent,
    "--solution-tint": solution.tint,
  } as CSSProperties;

  return (
    <main className={styles.page} style={theme}>
      <section className={styles.hero}>
        <div className={styles.shell}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{solution.eyebrow}</p>
            <h1>{solution.headline}</h1>
            <p className={styles.lede}>{solution.lede}</p>
            <div className={styles.heroActions}>
              <Link href="/v2/contact" className={styles.primaryButton}>
                Design your workflow <ArrowRight aria-hidden />
              </Link>
              <Link href="/v2/products/api" className={styles.secondaryButton}>
                Explore the APIs <ArrowUpRight aria-hidden />
              </Link>
            </div>
            <p className={styles.audience}>{solution.audience}</p>
          </div>

          <SolutionDemo solution={solution} />
        </div>
      </section>

      <section className={styles.proofRail} aria-label="Product guarantees">
        <div className={styles.shell}>
          {solution.proof.map((item, index) => (
            <div key={item}>
              <span>0{index + 1}</span>
              <strong>{item}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.valueSection}>
        <div className={styles.shell}>
          <header className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>{solution.valueEyebrow}</p>
              <h2>{solution.valueTitle}</h2>
            </div>
            <p>{solution.valueIntro}</p>
          </header>

          <div className={styles.needGrid}>
            {solution.needs.map((need, index) => {
              const Icon = [ShieldCheck, Layers3, ReceiptText][index];
              return (
                <article key={need.title}>
                  <span className={styles.needIcon}>
                    <Icon aria-hidden />
                  </span>
                  <span className={styles.needIndex}>0{index + 1}</span>
                  <h3>{need.title}</h3>
                  <p>{need.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className={styles.flowSection}>
        <div className={styles.shell}>
          <div className={styles.flowHeading}>
            <p className={styles.eyebrow}>THE EXECUTION BOUNDARY</p>
            <h2>{solution.flowTitle}</h2>
            <p>{solution.flowIntro}</p>
          </div>

          <ol className={styles.flowGrid}>
            {solution.flow.map((step) => (
              <li key={step.label}>
                <span>{step.label}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={styles.pathsSection}>
        <div className={styles.shell}>
          <header className={styles.pathsHeading}>
            <p className={styles.eyebrow}>CHOOSE YOUR SURFACE</p>
            <h2>Meet the customer where they already work.</h2>
          </header>

          <div className={styles.pathGrid}>
            {solution.paths.map((path) => (
              <Link key={`${path.name}-${path.title}`} href={path.href}>
                <div className={styles.pathTopline}>
                  <strong>{path.name}</strong>
                  <span>{path.badge}</span>
                </div>
                <h3>{path.title}</h3>
                <p>{path.body}</p>
                <span className={styles.pathLink}>
                  Explore surface <ArrowUpRight aria-hidden />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.finalSection}>
        <div className={styles.shell}>
          <p className={styles.eyebrow}>BUILD WITH AOMI</p>
          <h2>{solution.finalTitle}</h2>
          <p>{solution.finalBody}</p>
          <div className={styles.finalActions}>
            <Link href="/v2/contact" className={styles.finalPrimary}>
              Talk to the team <ArrowRight aria-hidden />
            </Link>
            <Link href="/v2/products/api" className={styles.finalSecondary}>
              Read the API overview
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
