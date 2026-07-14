"use client";

import { ChevronRight, File, Folder } from "lucide-react";

import type { BuildFileNode } from "@build/features/build/contracts";
import { cn } from "@build/lib/utils";

function FileTreeNode({
  node,
  depth = 0,
}: {
  node: BuildFileNode;
  depth?: number;
}) {
  const isFolder = node.type === "folder";
  const name = node.path.split("/").pop() ?? node.path;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1.5 rounded px-1.5 py-1 text-[12px]",
          depth > 0 && "ml-3",
        )}
        style={{ paddingLeft: depth * 12 + 6 }}
      >
        {isFolder ? (
          <Folder className="text-warning size-3.5 shrink-0" />
        ) : (
          <File className="text-link size-3.5 shrink-0" />
        )}
        <span className={cn(isFolder ? "text-foreground" : "text-subtle")}>
          {name}
        </span>
        {isFolder ? (
          <ChevronRight className="text-dim ml-auto size-3" />
        ) : null}
      </div>
      {node.children?.map((child) => (
        <FileTreeNode key={child.path} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

type FileTreePreviewProps = {
  tree: BuildFileNode[];
  className?: string;
};

export function FileTreePreview({ tree, className }: FileTreePreviewProps) {
  if (!tree.length) {
    return (
      <div className={cn("panel-inset p-4 text-center", className)}>
        <p className="text-dim text-[12px]">
          Files appear as the local mock generates.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("panel-inset overflow-hidden p-2", className)}>
      <p className="text-dim mb-2 px-1.5 text-[11px] font-medium tracking-wide uppercase">
        Generated files
      </p>
      {tree.map((node) => (
        <FileTreeNode key={node.path} node={node} />
      ))}
    </div>
  );
}
