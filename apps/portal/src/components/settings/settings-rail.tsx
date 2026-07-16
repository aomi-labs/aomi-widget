"use client";

import {
  Bot,
  KeyRound,
  Layers,
  Lock,
  Settings,
  Unplug,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@portal/lib/utils";
import type { SettingsCategory } from "./settings-types";

const ALL_ITEMS: Array<{
  id: SettingsCategory;
  label: string;
  icon: LucideIcon;
  group: "Account" | "Access";
}> = [
  { id: "general", label: "General", icon: Settings, group: "Account" },
  { id: "apps", label: "Usage", icon: Layers, group: "Account" },
  { id: "app-keys", label: "App Keys", icon: KeyRound, group: "Access" },
  { id: "bots", label: "Bots", icon: Bot, group: "Access" },
  { id: "secrets", label: "Secrets", icon: Lock, group: "Access" },
  { id: "byok", label: "BYOK", icon: Unplug, group: "Access" },
];

function RailGroup({
  label,
  items,
  activeCategory,
  onCategoryChange,
}: {
  label: string;
  items: typeof ALL_ITEMS;
  activeCategory: SettingsCategory;
  onCategoryChange: (category: SettingsCategory) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground px-2.5 pb-1 text-[10px] font-medium tracking-wide uppercase">
        {label}
      </p>
      {items.map((item) => {
        const Icon = item.icon;
        const active = activeCategory === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onCategoryChange(item.id)}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors",
              active
                ? "bg-accent text-foreground font-medium"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            )}
          >
            <Icon className="size-3.5 shrink-0 opacity-80" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function SettingsRail({
  activeCategory,
  onCategoryChange,
  orientation = "vertical",
}: {
  activeCategory: SettingsCategory;
  onCategoryChange: (category: SettingsCategory) => void;
  orientation?: "vertical" | "responsive";
}) {
  const accountItems = ALL_ITEMS.filter((item) => item.group === "Account");
  const accessItems = ALL_ITEMS.filter((item) => item.group === "Access");

  return (
    <>
      {/* Mobile: horizontal chips */}
      {orientation === "responsive" ? (
        <nav className="flex gap-1.5 overflow-x-auto px-2 pb-2 sm:hidden">
          {ALL_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeCategory === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onCategoryChange(item.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] transition-colors",
                  active
                    ? "bg-accent text-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent/50",
                )}
              >
                <Icon className="size-3 opacity-80" />
                {item.label}
              </button>
            );
          })}
        </nav>
      ) : null}

      {/* Desktop (and vertical-only): stacked groups */}
      <nav
        className={cn(
          "flex h-full flex-col gap-5 overflow-y-auto px-2 py-3",
          orientation === "responsive" && "hidden sm:flex",
        )}
      >
        <RailGroup
          label="Account"
          items={accountItems}
          activeCategory={activeCategory}
          onCategoryChange={onCategoryChange}
        />
        <RailGroup
          label="Access"
          items={accessItems}
          activeCategory={activeCategory}
          onCategoryChange={onCategoryChange}
        />
      </nav>
    </>
  );
}
