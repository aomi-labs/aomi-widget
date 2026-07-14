"use client";

import { Bot, Square } from "lucide-react";

import { MarkdownContent } from "@build/features/build/components/markdown-content";

export type ChatMessageProps = {
  role: "user" | "assistant" | "system";
  content: string;
  isStreaming?: boolean;
  onStop?: () => void;
  timestamp?: string;
  model?: string;
};

export function ChatMessage({
  role,
  content,
  isStreaming,
  onStop,
  timestamp,
  model,
}: ChatMessageProps) {
  const isUser = role === "user";

  if (isUser) {
    return (
      <div className="group w-full py-4">
        <div className="mx-auto max-w-3xl">
          <div className="text-dim mb-1.5 flex items-center gap-2 text-[11px]">
            <span>You</span>
            {timestamp ? <span>{timestamp}</span> : null}
          </div>
          <div className="text-foreground text-[13px] leading-relaxed">
            {content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-border/60 group w-full border-b py-5">
      <div className="mx-auto max-w-3xl">
        <div className="text-muted-foreground mb-2 flex items-center gap-1.5 text-[11px]">
          <Bot className="size-3" />
          <span className="text-subtle font-medium">
            {role === "system" ? "Aomi" : "Agent"}
          </span>
          {model ? <span>{model}</span> : null}
          {timestamp ? <span>{timestamp}</span> : null}
        </div>

        <MarkdownContent content={content} />
        {isStreaming ? (
          <span className="bg-foreground/60 mt-1 inline-block h-4 w-[2px] animate-pulse" />
        ) : null}

        {isStreaming && onStop ? (
          <button
            type="button"
            onClick={onStop}
            className="border-border bg-surface-1 text-muted-foreground hover:text-foreground mt-3 flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] transition-colors"
          >
            <Square className="size-2.5 fill-current" />
            Skip
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="border-border/60 w-full border-b py-5">
      <div className="mx-auto max-w-3xl">
        <div className="text-muted-foreground mb-2 flex items-center gap-1.5 text-[11px]">
          <Bot className="size-3" />
          <span>Agent</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="bg-muted-foreground h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:0ms]" />
          <span className="bg-muted-foreground h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:150ms]" />
          <span className="bg-muted-foreground h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
