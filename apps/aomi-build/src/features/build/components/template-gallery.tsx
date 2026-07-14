"use client";

import { useMemo, useState } from "react";
import { ChevronDown, LayoutTemplate } from "lucide-react";

import type { BuildTemplate } from "@build/features/build/contracts";
import { FEATURED_TEMPLATE_IDS } from "@build/features/build/templates";
import { cn } from "@build/lib/utils";

type TemplateGalleryProps = {
  templates: BuildTemplate[];
  onSelect: (template: BuildTemplate) => void;
};

export function TemplateGallery({ templates, onSelect }: TemplateGalleryProps) {
  const [showAll, setShowAll] = useState(false);

  const { featured, rest } = useMemo(() => {
    const featuredList: BuildTemplate[] = [];
    for (const id of FEATURED_TEMPLATE_IDS) {
      const match = templates.find((t) => t.id === id);
      if (match) featuredList.push(match);
    }
    while (featuredList.length < 3 && featuredList.length < templates.length) {
      const next = templates.find((t) => !featuredList.includes(t));
      if (!next) break;
      featuredList.push(next);
    }
    const featuredIds = new Set(featuredList.map((t) => t.id));
    return {
      featured: featuredList,
      rest: templates.filter((t) => !featuredIds.has(t.id)),
    };
  }, [templates]);

  return (
    <div className="mt-5 w-full">
      <div className="text-subtle mb-2.5 flex items-center gap-2 text-[12px] font-medium">
        <LayoutTemplate className="text-dim size-3.5" />
        Start from a template
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {featured.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelect(template)}
            className="panel-row hover:border-border-hover hover:bg-accent-hover/40 text-left transition-colors"
          >
            <p className="text-foreground text-[13px] font-medium">
              {template.name}
            </p>
            <p className="text-subtle mt-0.5 line-clamp-2 text-[11px] leading-4">
              {template.description}
            </p>
          </button>
        ))}
      </div>

      {rest.length > 0 ? (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="text-dim hover:text-foreground inline-flex items-center gap-1 px-1 text-[11px] transition-colors"
          >
            <ChevronDown
              className={cn(
                "size-3 transition-transform",
                showAll && "rotate-180",
              )}
            />
            {showAll ? "Hide templates" : `Browse all (${rest.length})`}
          </button>
          {showAll ? (
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {rest.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => onSelect(template)}
                  className="panel-row hover:border-border-hover hover:bg-accent-hover/40 text-left transition-colors"
                >
                  <p className="text-foreground text-[12px] font-medium">
                    {template.name}
                  </p>
                  <p className="text-subtle mt-0.5 line-clamp-2 text-[10px] leading-4">
                    {template.description}
                  </p>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
