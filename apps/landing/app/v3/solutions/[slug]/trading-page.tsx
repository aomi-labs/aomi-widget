import { ArrowDown } from "lucide-react";
import Image from "next/image";
import styles from "./trading-world.module.css";
import { WorldMarketsExample } from "./world-markets-example";

export function V3TradingPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Aomi Build / Telegram</p>
          <h1>Build the agent once. Put it in every trader&apos;s hands.</h1>
          <p className={styles.heroIntro}>
            First, turn your product APIs into an Aomi app with governed tools.
            Then attach that same app to a Telegram bot. Every conversation
            still resolves to the trader&apos;s own identity, wallet, thread,
            and signing permission.
          </p>
          <a className={styles.heroCta} href="#world-markets-example">
            See the trading flow <ArrowDown aria-hidden />
          </a>
          <dl className={styles.heroProof}>
            <div>
              <dt>01</dt>
              <dd>Build the agent</dd>
            </div>
            <div>
              <dt>02</dt>
              <dd>Connect the channel</dd>
            </div>
            <div>
              <dt>03</dt>
              <dd>Keep signing explicit</dd>
            </div>
          </dl>
        </div>

        <figure className={styles.productStack}>
          <div className={styles.buildScreen}>
            <span>01 / Build</span>
            <Image
              src="/assets/v3/solutions/trading/aomi-build-create.png"
              alt="Aomi Build screen for creating an agent from a prompt or template"
              width={2406}
              height={1302}
              priority
            />
          </div>
          <div className={styles.integrationScreen}>
            <span>02 / Integrate</span>
            <Image
              src="/assets/v3/solutions/trading/aomi-build-integrations.png"
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
