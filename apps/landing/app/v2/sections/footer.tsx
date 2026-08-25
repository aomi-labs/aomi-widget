import { Github } from "lucide-react";
import { AomiLogo } from "../../components/aomi-logo";
import { footerCta, LINKS } from "../copy";
import { ThemeToggle } from "../theme-toggle";
import styles from "../v2.module.css";

export function FooterSection() {
  return (
    <section className="relative overflow-hidden bg-[color:var(--v2-bg)] text-white">
      <div
        className="absolute inset-0 bg-cover bg-top"
        style={{ backgroundImage: 'url("/assets/footer-landscape.jpg")' }}
        aria-hidden
      />
      <div className={styles.footerWhiteFade} aria-hidden />
      <div className={styles.footerLowerScrim} aria-hidden />

      <div className={`relative z-10 ${styles.shell} pt-36 pb-10 md:pt-44 md:pb-12`}>
        <div className="mx-auto max-w-[640px] text-center">
          <h2 className={`${styles.displayMd} ${styles.onPhoto}`}>
            {footerCta.headline}
          </h2>
          <p className={`${styles.lede} ${styles.ledeOnPhoto} mx-auto mt-4 max-w-[480px]`}>
            {footerCta.support}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {footerCta.ctas.map((cta) => (
              <a
                key={cta.label}
                href={cta.href}
                className={
                  cta.variant === "primary"
                    ? `${styles.ui} rounded-full bg-[#6D28D9] px-5 py-2.5 text-sm text-white transition hover:bg-[#5B21B6]`
                    : `${styles.ui} rounded-full border border-white/40 bg-transparent px-5 py-2.5 text-sm text-white transition hover:bg-white/10`
                }
              >
                {cta.label}
              </a>
            ))}
          </div>
        </div>

        <footer className="mt-20 grid gap-10 border-t border-white/15 pt-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <AomiLogo
              className="text-[15px] text-white"
              markClassName="h-[15px] w-[15px] invert"
            />
            <p className="mt-4 max-w-[280px] text-sm leading-6 text-white/60">
              Execution infrastructure between an agent&apos;s decision and its
              settlement.
            </p>
          </div>
          <div>
            <p className={`${styles.kicker} text-white/50`}>
              PRODUCT
            </p>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              <li>
                <a href={LINKS.docs} className="hover:text-white">
                  Docs
                </a>
              </li>
              <li>
                <a href={LINKS.agents} className="hover:text-white">
                  Agents
                </a>
              </li>
              <li>
                <a href={LINKS.openApp} className="hover:text-white">
                  Open app
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className={`${styles.kicker} text-white/50`}>
              COMPANY
            </p>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              <li>
                <a href={LINKS.bookCall} className="hover:text-white">
                  Contact
                </a>
              </li>
              <li>
                <a href={LINKS.github} className="hover:text-white">
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </footer>

        <div className={styles.footerBar}>
          <ThemeToggle />
          <div className={styles.footerSocials}>
            <a href={LINKS.github} aria-label="GitHub" target="_blank" rel="noreferrer">
              <Github className="size-4" strokeWidth={1.6} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
