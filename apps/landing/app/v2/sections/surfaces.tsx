import { surfaces } from "../copy";
import styles from "../v2.module.css";
import { SurfacesIllustration } from "./illustrations";
import { Reveal } from "./reveal";

const commands: Record<string, string> = {
  CLI: "$ aomi transact",
  MCP: "$ npx skills add aomi-labs/skills",
  EMBED: "$ npx shadcn add https://aomi.dev/r/aomi-frame.json",
};

export function SurfacesSection() {
  return (
    <section className={styles.section}>
      <Reveal className={styles.shell}>
        <p className={styles.eyebrow}>{surfaces.eyebrow}</p>
        <h2 className={`mt-4 max-w-[520px] ${styles.heading}`}>
          {surfaces.headline}
        </h2>
        <p className={`mt-4 ${styles.lede}`}>{surfaces.note}</p>

        <div className="mt-10">
          <SurfacesIllustration />
        </div>

        <div className="mt-8 divide-y divide-[color:var(--v2-border)] border-y border-[color:var(--v2-border)]">
          {surfaces.rows.map((row) => (
            <div
              key={row.label}
              className="grid gap-4 py-6 first:pt-0 last:pb-0 md:grid-cols-[80px_1fr_1.2fr] md:items-start"
            >
              <span className={`${styles.kicker} text-[color:var(--v2-fg-subtle)]`}>
                {row.label}
              </span>
              <div>
                <h3 className={`${styles.cardTitleSm} text-[color:var(--v2-heading)]`}>
                  {row.title}
                </h3>
                <p className={`mt-1.5 ${styles.bodySm}`}>{row.body}</p>
              </div>
              <code className={`block overflow-x-auto rounded-lg px-3 py-2 whitespace-nowrap ${styles.surfaceCode}`}>
                {commands[row.label]}
              </code>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
