"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AomiLogo } from "../../components/aomi-logo";
import { nav } from "../copy";
import styles from "../v2.module.css";

export function V2Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className={styles.navDock}>
      <div className={styles.navStack}>
        <nav
          aria-label="Primary"
          className={`${styles.navPill} ${scrolled ? styles.navPillScrolled : ""}`}
        >
          <a href="/v2" className="shrink-0 text-white">
            <AomiLogo
              className="text-[14px] font-semibold tracking-[-0.02em] text-white"
              markClassName="h-5 w-5 invert"
            />
          </a>
          <div className={styles.navLinks}>
            {nav.links.map((link) => (
              <a key={link.label} href={link.href} className={styles.navLink}>
                {link.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className={styles.navMenuBtn}
              aria-expanded={open}
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((value) => !value)}
            >
              {open ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
            <a href={nav.cta.href} className={styles.navCta}>
              {nav.cta.label}
            </a>
          </div>
        </nav>
        {open ? (
          <div className={styles.navMenu}>
            {nav.links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className={styles.ui}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
