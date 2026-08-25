"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import styles from "./v2.module.css";
import { useV2Theme, type V2Theme } from "./theme-provider";

const OPTIONS: { id: V2Theme; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
];

export function ThemeToggle() {
  const { theme, setTheme } = useV2Theme();

  return (
    <div
      className={styles.themeToggle}
      role="radiogroup"
      aria-label="Color theme"
    >
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const selected = theme === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.label}
            className={`${styles.themeBtn} ${selected ? styles.themeBtnOn : ""}`}
            onClick={() => setTheme(option.id)}
          >
            <Icon strokeWidth={1.6} className="size-[15px]" />
          </button>
        );
      })}
    </div>
  );
}
