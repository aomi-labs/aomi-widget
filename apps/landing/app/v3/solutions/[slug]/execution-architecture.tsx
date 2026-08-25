import { Bot, User } from "lucide-react";
import styles from "./defi.module.css";

const pipeline = [
  {
    step: "01",
    name: "Build",
    body: "The tool composes the exact transaction.",
    tag: "intent → exact tx",
    tone: "plain",
  },
  {
    step: "02",
    name: "Simulate",
    body: "Prove the real outcome is safe.",
    tag: "forked state · ~200ms",
    tone: "hot",
  },
  {
    step: "03",
    name: "Sign",
    body: "The holder approves exact changes.",
    tag: "AA bundler · your wallet",
    tone: "sign",
  },
  {
    step: "04",
    name: "Broadcast",
    body: "Confirmed onchain.",
    tag: "AA + Solana Jito",
    tone: "plain",
  },
] as const;

const tools = ["evm-gateway", "db-driver", "web-search"] as const;
const models = ["gpt5", "Opus4.5", "kimi-k2"] as const;
const chains = ["Arb", "Base", "OP", "Mainnet", "Solana"] as const;

export function ExecutionArchitecture() {
  return (
    <section id="architecture" className={styles.archSection}>
      <header className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>SYSTEM ARCHITECTURE</p>
          <h2>Architecture for protocol-agnostic execution across chains.</h2>
        </div>
        <p>
          The runtime is built directly on a full node and forks every chain
          in about 200ms. Applications define their own forks. Every agent
          action passes through the same four-step pipeline regardless of
          protocol or chain, which is why coverage generalizes instead of
          growing integration by integration.
        </p>
      </header>

      <div className={styles.archGrid}>
        <ol className={styles.archRail} aria-label="Execution pipeline">
          {pipeline.map((item) => (
            <li key={item.name} data-tone={item.tone}>
              <span>{item.step}</span>
              <h3>{item.name}</h3>
              <p>{item.body}</p>
              <em>{item.tag}</em>
            </li>
          ))}
        </ol>

        <div className={styles.archStack}>
          <div className={styles.archUsers}>
            <div aria-hidden>
              <i>
                <User />
              </i>
              <i>
                <User />
              </i>
              <i>
                <User />
              </i>
              <i>
                <User />
              </i>
            </div>
            <span>User-specific context</span>
          </div>

          <div className={styles.archDispatch}>Stateless dispatch</div>

          <div className={styles.archLayer}>
            <strong>Application</strong>
            <code>[app1, app2, …].start()</code>
          </div>

          <div className={`${styles.archLayer} ${styles.archRuntime}`}>
            <strong>Runtime</strong>
            <code>Scheduler.run()</code>
            <div className={styles.archAgents} aria-hidden>
              <i>
                <Bot />
              </i>
              <i>
                <Bot />
              </i>
              <i>
                <Bot />
              </i>
            </div>
            <div className={styles.archMemory}>Memory &amp; IPC</div>
          </div>

          <div className={styles.archDuo}>
            <div>
              <strong>Tool scheduler</strong>
              <div className={styles.archChips}>
                {tools.map((tool) => (
                  <span key={tool} data-kind="tool">
                    {tool}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <strong>LLM interface</strong>
              <div className={styles.archChips}>
                {models.map((model) => (
                  <span key={model} data-kind="model">
                    {model}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.archChains}>
          <span className={styles.archChainsLabel}>Forks · ~200ms</span>
          <div className={styles.archChainList}>
            {chains.map((chain) => (
              <span key={chain} data-chain={chain.toLowerCase()}>
                {chain}
              </span>
            ))}
          </div>
          <div className={styles.archNode}>
            <span>Full node</span>
            <small>application-defined forks</small>
          </div>
        </div>
      </div>

      <div className={styles.archFeatures}>
        <article>
          <h3>Multi-threaded async execution</h3>
          <p>
            Agent threads run server-side, so a workflow keeps executing after
            the tab closes. Background strategies, limit and stop orders,
            copy-trading, scheduled DCA and rebalances, and liquidation guards
            fire on their own.
          </p>
        </article>
        <article>
          <h3>Access control</h3>
          <p>
            Signing uses provider-native key delegation compatible with Privy
            and Para. An agent signs only under a scoped, revocable policy
            with value caps, in human-sync or autonomous mode. Keys never
            leave the user&apos;s own wallet.
          </p>
        </article>
      </div>
    </section>
  );
}
