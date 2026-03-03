import type { ReactNode } from "react";
import Markdown from "react-markdown";

export function PreambleDisplay({
  content,
  title = "System Prompt",
  description = "The system prompt used to configure the AI assistant for this integration.",
  children,
}: {
  content: string;
  title?: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mt-6">
      <h3 className="text-base font-semibold text-fd-foreground">{title}</h3>
      <p className="mt-1 text-xs text-fd-muted-foreground">{description}</p>

      <div className="mt-3 rounded-lg border border-fd-border bg-fd-card px-6 py-5">
        <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-fd-foreground prose-headings:font-semibold prose-h2:text-base prose-h2:mt-6 prose-h2:mb-2 prose-h3:text-sm prose-h3:mt-4 prose-h3:mb-1 prose-p:text-fd-muted-foreground prose-p:text-xs prose-p:leading-relaxed prose-li:text-fd-muted-foreground prose-li:text-xs prose-strong:text-fd-foreground prose-code:text-[11px] prose-code:bg-fd-secondary/50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-fd-foreground prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 first:prose-h2:mt-0">
          <Markdown>{content}</Markdown>
        </div>
        {children}
      </div>
    </div>
  );
}
