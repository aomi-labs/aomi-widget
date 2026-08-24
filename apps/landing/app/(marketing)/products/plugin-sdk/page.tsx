import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import { PluginFileExplorer } from "./plugin-file-explorer";
import { OperateWorkbench } from "./operate-workbench";
import { PolymarketPluginDemo } from "./polymarket-plugin-demo";
import styles from "./plugin-sdk-marketing.module.css";

export const metadata: Metadata = {
  title: "Plugin SDK | Aomi",
  description:
    "An Aomi App is a Rust plugin: a role, a small set of typed tools, and a workflow. Author it with aomi-sdk, ship it with Aomi Build, and operate it on build.aomi.dev.",
  robots: { index: false, follow: false },
};

export default function PluginSdkPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.shell}>
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>AOMI PLUGIN SDK</p>
              <h1>Bring your API. Ship an agent that can transact.</h1>
              <p className={styles.heroLede}>
                Package the product context and API operations only you own as
                typed tools. Aomi hosts the agent and connects its selected
                action to the same transaction pipeline used across every Aomi
                surface.
              </p>
            </div>
            <div className={styles.heroAside}>
              <p>
                Developers build the <strong>polymarket-trader</strong> plugin,
                which reads their market API and hands the selected order to
                Aomi for construction, simulation, policy checks, and
                signer-controlled submission.
              </p>
              <div className={styles.heroActions}>
                <a
                  className={styles.btnPrimary}
                  href="https://aomi.dev/docs/build/plugins/aomi-app"
                  target="_blank"
                  rel="noreferrer"
                >
                  Build your first App <ArrowUpRight aria-hidden />
                </a>
                <a
                  className={styles.btnSecondary}
                  href="https://aomi.dev/docs/build/plugins/rust-sdk"
                  target="_blank"
                  rel="noreferrer"
                >
                  Rust SDK reference <ArrowRight aria-hidden />
                </a>
              </div>
            </div>
          </div>
          <PolymarketPluginDemo />
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.shell}>
          <header className={styles.sectionHead}>
            <p className={styles.eyebrow}>
              ONE RUNTIME · TWO CAPABILITY LAYERS
            </p>
            <h2>
              Your API supplies the product. Aomi supplies the transaction path.
            </h2>
            <p>
              The agent rides Aomi&apos;s hosted runtime from intent to trade.
              Plugin SDK tools add the integrator&apos;s market context and
              order logic; the selected action then enters Aomi&apos;s
              transaction pipeline for construction, simulation, policy
              enforcement, signer handoff, and a verified result.
            </p>
          </header>

          <PluginFileExplorer />
        </div>
      </section>

      <section className={styles.operate}>
        <div className={styles.shell}>
          <header className={styles.sectionHead}>
            <p className={styles.eyebrow}>OPERATE · BUILD.AOMI.DEV</p>
            <h2>Shipping is not the end of the workflow.</h2>
            <p>
              Aomi Build keeps every release tied to its repository,
              compatibility status, runtime lifecycle, tool health, transaction
              outcomes, and operating cost.
            </p>
          </header>

          <OperateWorkbench />

          <div className={styles.operateActions}>
            <a
              className={styles.btnPrimary}
              href="https://build.aomi.dev/"
              target="_blank"
              rel="noreferrer"
            >
              Open Aomi Build <ArrowUpRight aria-hidden />
            </a>
            <a
              className={styles.btnSecondary}
              href="https://aomi.dev/docs/build/plugins/aomi-app"
              target="_blank"
              rel="noreferrer"
            >
              Read the docs <ArrowRight aria-hidden />
            </a>
            <p className={styles.operateNote}>
              deterministic fixtures · no live account is contacted
            </p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.shell}>
          <header className={styles.sectionHead}>
            <p className={styles.eyebrow}>BUILD → TEST → DEPLOY → OPERATE</p>
            <h2>One path from source to a live App.</h2>
            <p>
              The same toolchain carries a plugin from a platform-compatible
              build through local model testing, hosted activation, and the
              operational evidence that follows.
            </p>
          </header>

          <div
            className={styles.toolchainPipeline}
            aria-label="Aomi App delivery pipeline"
          >
            <a
              className={styles.pipelineStage}
              href="https://aomi.dev/docs/build/toolchain/aomi-build"
              target="_blank"
              rel="noreferrer"
            >
              <div className={styles.pipelineStageMeta}>
                <span>01</span>
                <code>aomi-build</code>
              </div>
              <h3>Build</h3>
              <p>
                Check the platform SDK, then scaffold or compile the plugin as a
                loadable <code>cdylib</code>.
              </p>
              <strong>aomi-build compile</strong>
            </a>

            <span className={styles.pipelineConnector} aria-hidden>
              <i />
              <ArrowRight />
            </span>

            <a
              className={styles.pipelineStage}
              href="https://aomi.dev/docs/build/toolchain/aomi-run"
              target="_blank"
              rel="noreferrer"
            >
              <div className={styles.pipelineStageMeta}>
                <span>02</span>
                <code>aomi-run</code>
              </div>
              <h3>Test</h3>
              <p>
                Load the compiled plugin locally, talk to it through a real
                model, and inspect which typed tools it selects before shipping.
              </p>
              <strong>aomi-run plugins/libapp.dylib</strong>
            </a>

            <span className={styles.pipelineConnector} aria-hidden>
              <i />
              <ArrowRight />
            </span>

            <a
              className={styles.pipelineStage}
              href="https://aomi.dev/docs/build/toolchain/aomi-build"
              target="_blank"
              rel="noreferrer"
            >
              <div className={styles.pipelineStageMeta}>
                <span>03</span>
                <code>release</code>
              </div>
              <h3>Deploy</h3>
              <p>
                Publish the connected source, let CI cut the release, and
                activate the verified artifact in Aomi&apos;s hosted runtime.
              </p>
              <strong>aomi-build deploy</strong>
            </a>

            <span className={styles.pipelineConnector} aria-hidden>
              <i />
              <ArrowRight />
            </span>

            <a
              className={styles.pipelineStage}
              href="https://aomi.dev/docs/build/developer-platform"
              target="_blank"
              rel="noreferrer"
            >
              <div className={styles.pipelineStageMeta}>
                <span>04</span>
                <code>build.aomi.dev</code>
              </div>
              <h3>Operate</h3>
              <p>
                Track deployment and compatibility status, activation, tool
                health, usage, logs, metrics, and channel integrations.
              </p>
              <strong>status · logs · metrics</strong>
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
