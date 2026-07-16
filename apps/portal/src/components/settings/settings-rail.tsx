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

const ACCOUNT_ITEMS: Array<{
  id: SettingsCategory;
  label: string;
  icon: LucideIcon;
}> = [
  { id: "general", label: "General", icon: Settings },
  { id: "apps", label: "Usage", icon: Layers },
];

const ACCESS_ITEMS: Array<{
  id: SettingsCategory;
  label: string;
  icon: LucideIcon;
}> = [
  { id: "app-keys", label: "App Keys", icon: KeyRound },
  { id: "bots", label: "Bots", icon: Bot },
  { id: "secrets", label: "Secrets", icon: Lock },
  { id: "byok", label: "BYOK", icon: Unplug },
];

function RailGroup({
  label,
  items,
  activeCategory,
  onCategoryChange,
}: {
  label: string;
  items: Array<{ id: SettingsCategory; label: string; icon: LucideIcon }>;
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
}: {
  activeCategory: SettingsCategory;
  onCategoryChange: (category: SettingsCategory) => void;
}) {
  return (
    <nav className="flex h-full flex-col gap-5 overflow-y-auto px-2 py-3">
      <RailGroup
        label="Account"
        items={ACCOUNT_ITEMS}
        activeCategory={activeCategory}
        onCategoryChange={onCategoryChange}
      />
      <RailGroup
        label="Access"
        items={ACCESS_ITEMS}
        activeCategory={activeCategory}
        onCategoryChange={onCategoryChange}
      />
    </nav>
  );
}
