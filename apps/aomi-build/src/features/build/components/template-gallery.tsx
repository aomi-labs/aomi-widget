"use client";

import { LayoutTemplate } from "lucide-react";

import type { BuildTemplate } from "@build/features/build/contracts";

type TemplateGalleryProps = {
  templates: BuildTemplate[];
  onSelect: (template: BuildTemplate) => void;
};

export function TemplateGallery({ templates, onSelect }: TemplateGalleryProps) {
  return (
    <div className="mt-8 w-full">
      <div className="text-subtle mb-3 flex items-center gap-2 text-[12px] font-medium">
        <LayoutTemplate className="text-dim size-3.5" />
        Start from a template
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {templates.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelect(template)}
            className="panel-row hover:border-border-hover hover:bg-accent-hover/40 text-left transition-colors"
          >
            <p className="text-foreground text-[13px] font-medium">
              {template.name}
            </p>
            <p className="text-subtle mt-0.5 line-clamp-2 text-[11px]">
              {template.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
