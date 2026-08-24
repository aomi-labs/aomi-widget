import type { Metadata } from "next";
import {
  ArrowRight,
  Eye,
  KeyRound,
  Layers3,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { V3 } from "../site";
import styles from "../v3.module.css";

export const metadata: Metadata = {
  title: "About | Aomi V3",
  description:
    "Aomi builds execution infrastructure for agentic onchain finance.",
  robots: { index: false, follow: false },
};

export default function AboutPage() {
  return (
    <main className={styles.editorialPage}>
      <header className={`${styles.editorialHero} ${styles.aboutHero}`}>
        <p className={styles.eyebrow}>About Aomi</p>
        <h1>
          Financial agents need an execution system, not permission to
          improvise.
        </h1>
        <p>
          Aomi builds the infrastructure between an agent&apos;s decision and
          its settlement: typed tools, policy, construction, simulation,
          authorization, broadcast, recovery, and evidence.
        </p>
      </header>

      <section className={styles.aboutStatement}>
        <p className={styles.eyebrow}>Our position</p>
        <blockquote>
          Models can propose. Wallets can authorize. Aomi makes the path between
          them explicit, programmable, and verifiable.
        </blockquote>
        <div>
          <span>Backed by</span>
          <strong>Anagram</strong>
          <strong>Nascent</strong>
        </div>
      </section>

      <section className={styles.aboutPrinciples}>
        <div className={styles.detailSectionLead}>
          <p className={styles.eyebrow}>Design principles</p>
          <h2>Authority should remain legible at every layer.</h2>
        </div>
        <div>
          <article>
            <KeyRound aria-hidden />
            <h3>Custody stays with users</h3>
            <p>
              The execution runtime never needs private keys or control of
              customer assets.
            </p>
          </article>
          <article>
            <ShieldCheck aria-hidden />
            <h3>Policy stays outside the model</h3>
            <p>
              Hard limits, allowlists, and authorization requirements remain
              deterministic.
            </p>
          </article>
          <article>
            <Layers3 aria-hidden />
            <h3>Surfaces stay replaceable</h3>
            <p>
              Human Interface, API, MCP, CLI, and partner products converge on
              one execution lifecycle.
            </p>
          </article>
          <article>
            <Eye aria-hidden />
            <h3>State stays observable</h3>
            <p>
              Plans, simulations, approvals, retries, receipts, and outcomes
              remain inspectable.
            </p>
          </article>
          <article>
            <ReceiptText aria-hidden />
            <h3>Completion requires evidence</h3>
            <p>
              A queue, HTTP response, or wallet prompt is not settlement. Final
              state is.
            </p>
          </article>
        </div>
      </section>

      <section className={styles.editorialCta}>
        <p className={styles.eyebrow}>Build with us</p>
        <h2>Bring a product, protocol, or execution problem.</h2>
        <Link href={`${V3}/contact`}>
          Start a conversation <ArrowRight aria-hidden />
        </Link>
      </section>
    </main>
  );
}
