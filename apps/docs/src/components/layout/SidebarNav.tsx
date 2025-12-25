import Link from "next/link";
import { cn } from "@aomi-labs/react";

import type { DocSection } from "@/content/docs-map";

type SidebarNavProps = {
  sections: DocSection[];
  currentSlug?: string;
};

export function SidebarNav({ sections, currentSlug }: SidebarNavProps) {
  return (
    <nav className="space-y-6 text-sm">
      {sections.map((section) => (
        <div key={section.title} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{section.title}</p>
          <div className="space-y-1">
            {section.items.map((item) => {
              const isActive = item.slug === currentSlug;
              return (
                <Link
                  key={item.slug}
                  href={`/docs/${item.slug}`}
                  className={cn(
                    "block rounded-lg border border-transparent px-3 py-2 transition hover:border-border/80 hover:bg-card",
                    isActive ? "border-primary/60 bg-primary/5 text-foreground" : "text-muted-foreground"
                  )}
                >
                  <div className="text-sm font-semibold">{item.title}</div>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
