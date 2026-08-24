import {
  ArrowRight,
  Check,
  KeyRound,
  ScanEye,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import type { SolutionConfig } from "../../../v2/solutions/solution-data";
import { V3 } from "../../site";
import { WalletJourney } from "./sector-visuals";
import styles from "./sector-pages.module.css";

const walletControls = [
  {
    icon: WalletCards,
    label: "Account",
    title: "Use the account the user already recognizes.",
    body: "The wallet keeps authentication, account selection, chain state, navigation, and customer relationship.",
  },
  {
    icon: ScanEye,
    label: "Preview",
    title: "Explain exactly what changes.",
    body: "Assets out, assets in, destination, approvals, fees, slippage, warnings, and application are shown together.",
  },
  {
    icon: KeyRound,
    label: "Authority",
    title: "Ask the existing signer—once.",
    body: "Aomi prepares the action, but the wallet’s current signer remains the final approval boundary.",
  },
] as const;

const receiptRows = [
  ["Asset out", "0.5 ETH"],
  ["Minimum received", "1,220 USDC"],
  ["Route", "Uniswap v3 · Base"],
  ["Price impact", "5 bps"],
  ["Network fee", "$0.06"],
] as const;

export function V3WalletsPage({ solution }: { solution: SolutionConfig }) {
  return (
    <main className={styles.walletsPage}>
      <section className={`${styles.sectorHero} ${styles.walletsHero}`}>
        <div className={styles.walletsHeroCopy}>
          <p className={styles.eyebrow}>{solution.eyebrow}</p>
          <h1>{solution.headline}</h1>
          <p className={styles.sectorLede}>{solution.lede}</p>
          <div className={styles.heroActions}>
            <a href="#wallet-journey">
              Walk through the handoff <ArrowRight aria-hidden />
            </a>
            <Link href={`${V3}/contact`}>Design your wallet flow</Link>
          </div>
          <div className={styles.walletHeroProof}>
            {solution.proof.map((item) => (
              <span key={item}>
                <Check aria-hidden /> {item}
              </span>
            ))}
          </div>
        </div>

        <div id="wallet-journey" className={styles.walletHeroArtifact}>
          <WalletJourney />
        </div>
      </section>

      <section className={styles.walletPromise}>
        <p className={styles.eyebrow}>The trust promise</p>
        <h2>More capability without inventing another wallet.</h2>
        <p>{solution.valueIntro}</p>
      </section>

      <section className={styles.walletControls}>
        {walletControls.map(({ icon: Icon, label, title, body }, index) => (
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
      </section>

      <section className={styles.walletReview}>
        <div className={styles.reviewCopy}>
          <p className={styles.eyebrow}>One review surface</p>
          <h2>The user sees consequences, not transaction choreography.</h2>
          <p>
            Routes, approvals, and protocol calls can stay underneath the
            interaction. The wallet presents the exact bounded outcome its
            customer is about to authorize.
          </p>
          <div>
            <span>
              <Check aria-hidden /> Minimum enforced
            </span>
            <span>
              <Check aria-hidden /> Token verified
            </span>
            <span>
              <Check aria-hidden /> One-time approval
            </span>
          </div>
        </div>

        <div className={styles.walletReceipt}>
          <header>
            <div>
              <ShieldCheck aria-hidden />
              <span>Action preview</span>
            </div>
            <strong>Simulation passed</strong>
          </header>
          <h3>Swap through Uniswap v3</h3>
          <dl>
            {receiptRows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <footer>
            <KeyRound aria-hidden />
            <span>
              <strong>Ready for your wallet</strong>
              No key or approval authority moved to Aomi.
            </span>
          </footer>
        </div>
      </section>

      <section className={styles.walletFit}>
        <div>
          <span>Your wallet retains</span>
          <strong>Brand · accounts · authentication · signing</strong>
        </div>
        <div>
          <span>Aomi contributes</span>
          <strong>Intent · routes · simulation · verified outcome</strong>
        </div>
      </section>

      <section className={`${styles.sectorCta} ${styles.walletCta}`}>
        <p className={styles.eyebrow}>Keep the wallet yours</p>
        <h2>{solution.finalTitle}</h2>
        <p>{solution.finalBody}</p>
        <Link href={`${V3}/contact`}>
          Map the signer handoff <ArrowRight aria-hidden />
        </Link>
      </section>
    </main>
  );
}
