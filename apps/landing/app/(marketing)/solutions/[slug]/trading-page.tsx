import { ArrowDown } from "lucide-react";
import Image from "next/image";
import styles from "./trading-world.module.css";
import { WorldMarketsExample } from "./world-markets-example";

export function TradingPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Aomi for trading UX</p>
          <h1>
            Automate trading UX with ready‑to‑go integrations plus expanded
            action space
          </h1>
          <p className={styles.heroIntro}>
            Connect the trading surfaces your users already rely on to
            Aomi&apos;s execution infrastructure. Ready-to-go integrations bring
            account context and a broader set of protocol actions into the
            experience, while every transaction remains simulated,
            policy-checked, and explicitly signed.
          </p>
          <a className={styles.heroCta} href="#world-markets-example">
            See an integration example <ArrowDown aria-hidden />
          </a>
          <dl className={styles.heroProof}>
            <div>
              <dt>01</dt>
              <dd>Connect the experience</dd>
            </div>
            <div>
              <dt>02</dt>
              <dd>Expand the action space</dd>
            </div>
            <div>
              <dt>03</dt>
              <dd>Keep approval explicit</dd>
            </div>
          </dl>
        </div>

        <figure className={styles.productStack}>
          <div className={styles.buildScreen}>
            <Image
              src="/assets/landing/solutions/trading/aomi-build-create.png"
              alt="Aomi Build screen for creating an agent from a prompt or template"
              width={2406}
              height={1302}
              priority
            />
          </div>
          <div className={styles.integrationScreen}>
            <Image
              src="/assets/landing/solutions/trading/aomi-build-integrations.png"
              alt="Aomi Build Integrations screen showing Telegram setup, BotFather commands, and an attached app"
              width={2328}
              height={1964}
              priority
            />
          </div>
        </figure>
      </section>

      <WorldMarketsExample presentation="storyboard" />
    </main>
  );
}
