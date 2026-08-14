"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import styles from "../v2.module.css";

type FaqItem = {
  q: string;
  a: string;
};

/** Visitors-style accordion: light gray rounded bars, chevron, one open at a time. */
export function FaqList({ items }: { items: readonly FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const baseId = useId();

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-2.5">
      {items.map((item, index) => {
        const isOpen = open === index;
        const buttonId = `${baseId}-q-${index}`;
        const panelId = `${baseId}-a-${index}`;

        return (
          <div key={item.q} className={styles.faqRow}>
            <button
              type="button"
              id={buttonId}
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpen(isOpen ? null : index)}
              className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
            >
              <span className={styles.faqQ}>
                {item.q}
              </span>
              <ChevronDown
                aria-hidden
                strokeWidth={1.75}
                className={`size-4 shrink-0 text-indigo-400 transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              inert={!isOpen}
              className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <p className={`mt-3 pr-8 pb-1 ${styles.faqA}`}>
                  {item.a}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
