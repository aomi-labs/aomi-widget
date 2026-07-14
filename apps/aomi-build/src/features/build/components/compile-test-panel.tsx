"use client";

import { Check, Play, Terminal } from "lucide-react";

import { cn } from "@build/lib/utils";

type CompileTestPanelProps = {
  compileDone: boolean;
  testDone: boolean;
  busy: "compile" | "test" | null;
  onCompile: () => void;
  onTest: () => void;
};

/**
 * Explicit Compile + aomi-run steps (Cecilia wireframe). Local mock only.
 */
export function CompileTestPanel({
  compileDone,
  testDone,
  busy,
  onCompile,
  onTest,
}: CompileTestPanelProps) {
  return (
    <div className="border-border bg-surface-1 mx-auto my-4 max-w-3xl space-y-3 rounded-lg border p-4">
      <div>
        <p className="text-foreground text-[13px] font-medium">
          How do you want to verify?
        </p>
        <p className="text-dim mt-0.5 text-[12px] leading-5">
          Tool layer is done — compile, then test with aomi-run (local mock).
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onCompile}
          disabled={compileDone || busy !== null}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[12px] font-medium transition-colors",
            compileDone
              ? "border-positive/40 text-positive border bg-transparent"
              : "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50",
          )}
        >
          {compileDone ? (
            <Check className="size-3.5" />
          ) : (
            <Terminal className="size-3.5" />
          )}
          {busy === "compile"
            ? "Compiling…"
            : compileDone
              ? "Compile · done"
              : "Compile"}
        </button>
        <button
          type="button"
          onClick={onTest}
          disabled={!compileDone || testDone || busy !== null}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-[12px] font-medium transition-colors",
            testDone
              ? "border-positive/40 text-positive"
              : "border-border text-foreground hover:bg-accent/40 disabled:opacity-40",
          )}
        >
          {testDone ? (
            <Check className="size-3.5" />
          ) : (
            <Play className="size-3.5" />
          )}
          {busy === "test"
            ? "aomi-run…"
            : testDone
              ? "aomi-run · done"
              : "Test with aomi-run"}
        </button>
      </div>
      {compileDone && testDone ? (
        <p className="text-positive text-[12px]">
          Compile + aomi-run passed (mock). Ship when you’re ready.
        </p>
      ) : null}
    </div>
  );
}
