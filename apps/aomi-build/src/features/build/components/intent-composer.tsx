"use client";

import { ArrowUp, Laptop, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

import { cn } from "@build/lib/utils";

type ActionPill = {
  label: string;
  hint?: string;
  action?: string;
};

type IntentComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  placeholder?: string;
  actionPills?: ActionPill[];
  onActionPillClick?: (action: string) => void;
  /** Visual-only model chip — no picker (DropdownMenu not in live app). */
  modelLabel?: string;
  compact?: boolean;
  showContextStrip?: boolean;
  footerHint?: string;
};

export function IntentComposer({
  value,
  onChange,
  onSubmit,
  disabled,
  isLoading,
  placeholder = "What do you want to build?",
  actionPills,
  onActionPillClick,
  modelLabel = "Local mock",
  compact = false,
  showContextStrip = true,
  footerHint = "Local mock for now — Smithers streaming is not wired yet.",
}: IntentComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, compact ? 140 : 180)}px`;
  }, [compact]);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab" && e.shiftKey) {
        e.preventDefault();
        onActionPillClick?.("plan");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onActionPillClick]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!disabled && !isLoading && value.trim()) onSubmit();
      }
    },
    [disabled, isLoading, value, onSubmit],
  );

  const canSend = Boolean(value.trim()) && !disabled && !isLoading;

  return (
    <div className="w-full">
      {showContextStrip ? (
        <div className="mb-2.5 flex items-center gap-1">
          <span className="context-chip cursor-default" title="Local mock workspace">
            aomi
          </span>
          <span
            className="context-chip cursor-default"
            title="Timers only until SSE"
          >
            <Laptop className="size-3.5 opacity-70" />
            Local mock
          </span>
        </div>
      ) : null}

      <div
        className={cn(
          "composer-surface",
          compact ? "px-3.5 py-3" : "px-4 py-3.5",
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isLoading}
          placeholder={placeholder}
          rows={compact ? 2 : 3}
          className={cn(
            "text-foreground placeholder:text-dim w-full resize-none bg-transparent text-[14px] leading-relaxed outline-none disabled:opacity-50",
            compact ? "min-h-[48px]" : "min-h-[80px]",
          )}
        />

        <div className="mt-3 flex items-center justify-between">
          <span
            className="context-chip cursor-default rounded-full border border-transparent px-2.5 py-1"
            title="Model selection arrives with Smithers SSE"
          >
            {modelLabel}
          </span>

          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSend}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full transition-all duration-150",
              canSend
                ? "bg-primary text-primary-foreground hover:bg-brand-hover shadow-sm hover:scale-[1.03]"
                : "bg-surface-3 text-dim",
            )}
            aria-label="Send message"
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowUp className="size-4" />
            )}
          </button>
        </div>
      </div>

      {actionPills && actionPills.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {actionPills.map((pill) => (
            <button
              key={pill.label}
              type="button"
              onClick={() => onActionPillClick?.(pill.action ?? pill.label)}
              className="action-pill"
            >
              {pill.label}
              {pill.hint ? (
                <span className="text-dim text-[11px]">{pill.hint}</span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      {footerHint ? (
        <p className="text-dim mt-4 text-center text-[12px] leading-relaxed">
          {footerHint}
        </p>
      ) : null}
    </div>
  );
}
