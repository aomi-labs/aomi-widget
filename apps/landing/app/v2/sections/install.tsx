"use client";

import { Check, ChevronDown, Copy } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { install, LINKS } from "../copy";
import styles from "../v2.module.css";
import { Reveal } from "./reveal";

function ToolMark({ src, name }: { src: string; name: string }) {
  return (
    <span className={styles.toolMark}>
      <img src={src} alt={name} title={name} width={16} height={16} decoding="async" />
    </span>
  );
}

type InstallToolId = (typeof install.tools)[number]["id"];

export function InstallSection() {
  const [active, setActive] = useState<InstallToolId>(install.tools[0].id);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const selected = install.tools.find((tool) => tool.id === active) ?? install.tools[0];

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(selected.command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className={styles.section}>
      <Reveal className={`${styles.shell} text-center`}>
        <h2 className={`mx-auto max-w-[640px] ${styles.heading}`}>
          {install.headline}
        </h2>
        <p className={`mx-auto mt-4 max-w-[520px] ${styles.lede}`}>
          {install.support}
        </p>

        <div ref={wrapRef} className={`${styles.cmdWrap} relative mx-auto mt-10 max-w-[720px]`}>
          <div className={styles.cmdRow}>
            <div className={styles.cmdBar}>
              <span className={styles.cmdPrompt} aria-hidden>
                &gt;
              </span>
              <code className={styles.cmdText}>{selected.command}</code>
              <button
                type="button"
                className={styles.cmdCopy}
                onClick={copy}
                aria-label={copied ? "Copied" : "Copy command"}
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </button>
            </div>
            <button
              type="button"
              className={styles.toolBtn}
              aria-haspopup="listbox"
              aria-expanded={open}
              aria-controls={menuId}
              onClick={() => setOpen((value) => !value)}
            >
              <ToolMark src={selected.logo} name={selected.label} />
              <span className="flex-1 text-left">{selected.label}</span>
              <ChevronDown className={`size-4 ${open ? "rotate-180" : ""}`} />
            </button>
          </div>
          {open ? (
            <div id={menuId} role="listbox" className={styles.toolMenu}>
              {install.tools.map((tool) => {
                const isOn = tool.id === selected.id;
                return (
                  <button
                    key={tool.id}
                    type="button"
                    role="option"
                    aria-selected={isOn}
                    className={`${styles.toolItem} ${isOn ? styles.toolItemOn : ""}`}
                    onClick={() => {
                      setActive(tool.id);
                      setOpen(false);
                      setCopied(false);
                    }}
                  >
                    <ToolMark src={tool.logo} name={tool.label} />
                    <span className="flex-1 text-left">{tool.label}</span>
                    {isOn ? <Check className="size-3.5 text-[#22c55e]" /> : null}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <p className="mt-6 text-[13px] leading-[1.55] text-[color:var(--v2-fg-subtle)]">
          {install.note}
        </p>

        <div className={`${styles.worksRow} mt-8`}>
          {install.tools.map((tool) => (
            <span key={tool.id} className={styles.worksTile} title={tool.label}>
              <ToolMark src={tool.logo} name={tool.label} />
            </span>
          ))}
        </div>

        <a
          href={LINKS.docs}
          className={`${styles.ui} mt-8 inline-flex items-center rounded-full border border-[color:var(--v2-border)] bg-[color:var(--v2-card)] px-4 py-2 text-[13px] text-[color:var(--v2-heading)]`}
        >
          {install.cta}
        </a>
      </Reveal>
    </section>
  );
}
