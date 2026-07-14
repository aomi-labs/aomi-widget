"use client";

import { Bot, Check, Circle, Loader2 } from "lucide-react";

import type { SmithersNode } from "@build/features/build/contracts";
import { cn } from "@build/lib/utils";

type SmithersNodesProps = {
  nodes: SmithersNode[];
  caption?: string;
};

export function SmithersNodes({
  nodes,
  caption = "Smithers nodes (local mock) — smither writes smither",
}: SmithersNodesProps) {
  if (!nodes.length) return null;

  return (
    <div className="border-border bg-surface-1 mx-auto my-4 max-w-3xl rounded-lg border p-4">
      <p className="text-subtle mb-3 text-[12px] font-medium">{caption}</p>
      <ul className="space-y-2">
        {nodes.map((node) => (
          <li
            key={node.id}
            className="border-border/80 bg-background flex gap-3 rounded-md border px-3 py-2.5"
          >
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
              {node.status === "done" ? (
                <Check className="text-positive size-3.5" />
              ) : node.status === "active" ? (
                <Loader2 className="text-warning size-3.5 animate-spin" />
              ) : (
                <Circle className="text-dim size-3" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-foreground text-[13px] font-medium">
                  {node.label}
                </span>
                <span className="text-dim inline-flex items-center gap-1 text-[10px] uppercase tracking-wide">
                  <Bot className="size-3" />
                  {node.agent}
                </span>
              </div>
              <p className="text-dim mt-0.5 text-[12px] leading-4">
                {node.detail}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 self-start text-[10px]",
                node.status === "active"
                  ? "text-warning"
                  : node.status === "done"
                    ? "text-positive"
                    : "text-dim",
              )}
            >
              {node.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
