import type { ReactNode } from "react";
import { agentPanel } from "../copy";
import styles from "../v2.module.css";

function CodeBlock({ children }: { children: ReactNode }) {
  return (
    <div className={`rounded-lg px-3.5 py-3 ${styles.surfaceCode}`}>
      <code className={`${styles.code} block overflow-x-auto whitespace-nowrap leading-[19px]`}>
        {children}
      </code>
    </div>
  );
}

function Line({ text }: { text: string }) {
  return (
    <span className={`block ${text.startsWith("#") ? "text-[color:var(--v2-fg-subtle)]" : ""}`}>
      {text}
    </span>
  );
}

export function AgentPanel() {
  const { build, transact, footer } = agentPanel;

  return (
    <div className={`mb-4 w-full max-w-[1100px] rounded-2xl p-4 text-left md:p-6 lg:p-8 ${styles.surfacePanel}`}>
      <div className="border-b border-[color:var(--v2-border)] pb-6">
        <div className="grid gap-5 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
          <h3 className={`${styles.displayMd} text-[color:var(--v2-heading)]`}>
            {agentPanel.title}
          </h3>
          <div className="rounded-lg border border-[color:var(--v2-border)] bg-[color:var(--v2-bg-muted)] px-4 py-3.5">
            <p className={`${styles.kicker} mb-1.5 text-[color:var(--v2-fg-subtle)]`}>
              Install once
            </p>
            <code className={`${styles.code} block overflow-x-auto whitespace-nowrap text-[13px] leading-5 text-[color:var(--v2-heading)]`}>
              {agentPanel.install}
            </code>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <article className="space-y-5">
          <div>
            <p className={`${styles.kicker} text-[color:var(--v2-fg-subtle)]`}>
              Build
            </p>
            <h4 className={`mt-2 ${styles.cardTitle} text-[color:var(--v2-heading)]`}>
              {build.title}
            </h4>
          </div>

          <p className="text-[15px] leading-[1.6] text-[color:var(--v2-fg)]">
            {build.body}
          </p>

          <div className="space-y-4">
            <div>
              <p className="text-[13px] font-medium text-[color:var(--v2-heading)]">
                {build.tellLabel}
              </p>
              <p className="mt-2 text-[13px] leading-6 text-[color:var(--v2-fg)]">
                {build.tell}
              </p>
              <a
                href={build.linkHref}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex text-[13px] text-[color:var(--v2-heading)] underline-offset-2 hover:underline"
              >
                {build.linkLabel}
              </a>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-[12px] font-medium text-[color:var(--v2-heading)]">
                  {build.rustLabel}
                </p>
                <CodeBlock>
                  {build.rustCommands.map((cmd) => (
                    <Line key={cmd} text={cmd} />
                  ))}
                </CodeBlock>
              </div>
              <div className="space-y-2">
                <p className="text-[12px] font-medium text-[color:var(--v2-heading)]">
                  {build.embedLabel}
                </p>
                <CodeBlock>{build.embedCommand}</CodeBlock>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[12px] font-medium text-[color:var(--v2-heading)]">
                {build.reactLabel}
              </p>
              <CodeBlock>{build.reactCommand}</CodeBlock>
              <p className="text-[13px] leading-6 text-[color:var(--v2-fg)]">
                {build.surfacesNote}
              </p>
            </div>
          </div>
        </article>

        <article className="space-y-5 lg:border-l lg:border-[color:var(--v2-border)] lg:pl-6">
          <div>
            <p className={`${styles.kicker} text-[color:var(--v2-fg-subtle)]`}>
              Transact
            </p>
            <h4 className={`mt-2 ${styles.cardTitle} text-[color:var(--v2-heading)]`}>
              {transact.title}
            </h4>
          </div>

          <p className="text-[15px] leading-[1.6] text-[color:var(--v2-fg)]">
            {transact.body}
          </p>

          <div className="space-y-4">
            <div>
              <p className="text-[13px] font-medium text-[color:var(--v2-heading)]">
                {transact.tellLabel}
              </p>
              <p className="mt-2 text-[13px] leading-6 text-[color:var(--v2-fg)]">
                {transact.tell}
              </p>
              <a
                href={transact.linkHref}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex text-[13px] text-[color:var(--v2-heading)] underline-offset-2 hover:underline"
              >
                {transact.linkLabel}
              </a>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-[12px] font-medium text-[color:var(--v2-heading)]">
                  {transact.installTitle}
                </p>
                <p className="text-[13px] leading-6 text-[color:var(--v2-fg)]">
                  {transact.installHint}
                </p>
                <CodeBlock>{transact.installCommand}</CodeBlock>
              </div>
              <div className="space-y-2">
                <p className="text-[12px] font-medium text-[color:var(--v2-heading)]">
                  {transact.intentLabel}
                </p>
                <CodeBlock>
                  {transact.intentLines.map((line) => (
                    <Line key={line} text={line} />
                  ))}
                </CodeBlock>
              </div>
            </div>

            <p className="rounded-lg border border-[color:var(--v2-border)] bg-[color:var(--v2-bg-muted)] px-4 py-3 text-[13px] leading-6 text-[color:var(--v2-fg)]">
              {transact.guarantee}
            </p>
          </div>
        </article>
      </div>

      <div className="mt-6 flex flex-col justify-between gap-3 border-t border-[color:var(--v2-border)] pt-5 sm:flex-row sm:items-center">
        <p className="text-[12px] text-[color:var(--v2-fg)]">
          Read by default. Simulate before sign. Credentials never round-trip.
        </p>
        <a
          href={footer.agentsHref}
          target="_blank"
          rel="noreferrer"
          className="text-[13px] text-[color:var(--v2-heading)] underline-offset-2 hover:underline"
        >
          {footer.label}
        </a>
      </div>
    </div>
  );
}
