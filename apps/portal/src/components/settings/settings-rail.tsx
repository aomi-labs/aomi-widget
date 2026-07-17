"use client";

import type { IconSvgElement } from "@hugeicons/react";
import { Icons, PortalIcon } from "@portal/components/icons";
import { cn } from "@portal/lib/utils";
import type { SettingsCategory } from "./settings-types";

const ALL_ITEMS: Array<{
  id: SettingsCategory;
  label: string;
  icon: IconSvgElement;
  group: "Account" | "Access";
}> = [
  { id: "general", label: "General", icon: Icons.Settings, group: "Account" },
  { id: "apps", label: "Usage", icon: Icons.Layers, group: "Account" },
  { id: "app-keys", label: "App Keys", icon: Icons.KeyRound, group: "Access" },
  { id: "bots", label: "Bots", icon: Icons.Bot, group: "Access" },
  { id: "secrets", label: "Secrets", icon: Icons.Lock, group: "Access" },
  { id: "byok", label: "BYOK", icon: Icons.Unplug, group: "Access" },
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
    <div className="space-y-0.5">
      <p className="aomi-eyebrow px-2.5 pb-1">{label}</p>
      {items.map((item) => {
        const active = activeCategory === item.id;
        return (
          <button
            key={item.id}
            type="button"
            aria-current={active ? "page" : undefined}
            onClick={() => onCategoryChange(item.id)}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors outline-none",
              "focus-visible:ring-ring focus-visible:ring-1 focus-visible:ring-offset-0",
              active
                ? "bg-accent text-foreground font-medium"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )}
          >
            <PortalIcon
              icon={item.icon}
              size={14}
              className={cn(active ? "opacity-100" : "opacity-70")}
            />
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
      {orientation === "responsive" ? (
        <nav className="flex gap-1.5 overflow-x-auto px-2 pb-2 sm:hidden">
          {ALL_ITEMS.map((item) => {
            const active = activeCategory === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => onCategoryChange(item.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] transition-colors outline-none",
                  "focus-visible:ring-ring focus-visible:ring-1",
                  active
                    ? "bg-foreground text-background font-medium"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <PortalIcon icon={item.icon} size={12} className="opacity-80" />
                {item.label}
              </button>
            );
          })}
        </nav>
      ) : null}

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
