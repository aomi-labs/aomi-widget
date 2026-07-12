import Link from "next/link";

import type { SettingsSection } from "./settings-data";

function statusLabel(status: SettingsSection["status"]) {
  if (status === "available") return "Available";
  if (status === "project-scoped") return "Project-scoped";
  return "Planned";
}

export function SettingsCard({ section }: { section: SettingsSection }) {
  const Icon = section.icon;
  const card = (
    <div
      className={`h-full rounded-lg border bg-surface-1 p-4 transition ${
        section.enabled
          ? "border-border hover:border-border-hover hover:bg-accent-hover"
          : "border-border/70 opacity-45"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="size-4 shrink-0 text-dim" />
          <div className="truncate text-sm font-medium text-foreground">
            {section.title}
          </div>
        </div>
        <span className="shrink-0 rounded-sm border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-dim">
          {statusLabel(section.status)}
        </span>
      </div>
      <p className="mt-3 text-[13px] text-dim">{section.description}</p>
    </div>
  );

  if (!section.enabled) return card;

  return (
    <Link href={`/settings/${section.slug}`} className="block h-full">
      {card}
    </Link>
  );
}
