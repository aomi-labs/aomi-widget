import {
  ArrowRight,
  Building2,
  Check,
  FileCheck2,
  Landmark,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import type { SolutionConfig } from "../../../v2/solutions/solution-data";
import { V3 } from "../../site";
import { FintechMandate } from "./sector-visuals";
import styles from "./sector-pages.module.css";

const operatingLayers = [
  {
    icon: Landmark,
    label: "Mandate",
    title: "Define what the capital is allowed to do.",
    body: "Encode liquidity floors, issuer allowlists, concentration limits, and approval roles before execution begins.",
  },
  {
    icon: ShieldCheck,
    label: "Operation",
    title: "Evaluate the complete allocation before signing.",
    body: "Compare net yield and redemption windows, then simulate every action as one policy-bound proposal.",
  },
  {
    icon: FileCheck2,
    label: "Record",
    title: "Return evidence to the system of record.",
    body: "Link the original mandate, policy verdict, exact payload, signer response, and reconciled position.",
  },
] as const;

const lifecycle = [
  ["01", "Mandate received", "Treasury instruction and account scope"],
  ["02", "Policy evaluated", "Six controls passed before approval"],
  ["03", "Existing signer", "Custody and approval remain in place"],
  ["04", "Position reconciled", "Receipt returned to operations"],
] as const;

export function V3FintechPage({ solution }: { solution: SolutionConfig }) {
  return (
    <main className={styles.fintechPage}>
      <section className={`${styles.sectorHero} ${styles.fintechHero}`}>
        <div className={styles.sectorHeroGrid} aria-hidden />
        <div className={styles.sectorHeroCopy}>
          <p className={styles.eyebrow}>{solution.eyebrow}</p>
          <h1>{solution.headline}</h1>
          <p className={styles.sectorLede}>{solution.lede}</p>
          <div className={styles.heroActions}>
            <Link href={`${V3}/contact`}>
              Bring a mandate <ArrowRight aria-hidden />
            </Link>
            <a href="#mandate-workspace">Inspect the workflow</a>
          </div>
          <p className={styles.heroAudience}>{solution.audience}</p>
        </div>

        <div id="mandate-workspace" className={styles.heroArtifact}>
          <FintechMandate />
          <p className={styles.artifactCaption}>
            Deterministic mandate preview · no live capital is moved
          </p>
        </div>
      </section>

      <section className={styles.proofRail} aria-label="Fintech guarantees">
        <div>
          <span>Operating model</span>
          <strong>Governed asset operations</strong>
        </div>
        {solution.proof.map((item, index) => (
          <div key={item}>
            <span>0{index + 1}</span>
            <strong>{item}</strong>
          </div>
        ))}
      </section>

      <section className={styles.fintechOperating}>
        <header className={styles.splitHeading}>
          <div>
            <p className={styles.eyebrow}>The operating model</p>
            <h2>Automation that behaves like financial software.</h2>
          </div>
          <p>{solution.valueIntro}</p>
        </header>

        <div className={styles.operatingGrid}>
          {operatingLayers.map(({ icon: Icon, label, title, body }, index) => (
            <article key={label}>
              <div>
                <Icon aria-hidden />
                <span>0{index + 1}</span>
              </div>
              <p>{label}</p>
              <h3>{title}</h3>
              <span>{body}</span>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.mandateLifecycle}>
        <div className={styles.lifecycleIntro}>
          <p className={styles.eyebrow}>One mandate, one durable record</p>
          <h2>Every decision survives the transaction.</h2>
          <p>
            The allocation is only half the product. Operations needs the
            instruction, controls, approval, and resulting position to remain
            connected after settlement.
          </p>
        </div>

        <ol className={styles.lifecycleList}>
          {lifecycle.map(([number, title, body]) => (
            <li key={number}>
              <span>{number}</span>
              <div>
                <strong>{title}</strong>
                <p>{body}</p>
              </div>
              <Check aria-hidden />
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.fintechFit}>
        <div>
          <Building2 aria-hidden />
          <span>Your institution keeps</span>
          <strong>Customer record</strong>
          <strong>Custody model</strong>
          <strong>Reporting system</strong>
          <strong>Approval roles</strong>
        </div>
        <div>
          <ShieldCheck aria-hidden />
          <span>Aomi adds</span>
          <strong>Mandate-aware construction</strong>
          <strong>Complete simulation</strong>
          <strong>Policy verdicts</strong>
          <strong>Reconciled Actions</strong>
        </div>
      </section>

      <section className={styles.sectorCta}>
        <p className={styles.eyebrow}>Start with one operation</p>
        <h2>{solution.finalTitle}</h2>
        <p>{solution.finalBody}</p>
        <Link href={`${V3}/contact`}>
          Map your first mandate <ArrowRight aria-hidden />
        </Link>
      </section>
    </main>
  );
}
