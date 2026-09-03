"use client";

import { useState, type FC } from "react";
import {
  BotIcon,
  CheckIcon,
  ChevronDownIcon,
  GaugeIcon,
  SparklesIcon,
} from "lucide-react";
import { cn } from "@aomi-labs/react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  useCapabilityComposer,
  type ExecutionPolicy,
} from "@/components/assistant-ui/capability-composer";

const MODES: Array<{
  id: ExecutionPolicy;
  label: string;
  description: string;
  Icon: typeof SparklesIcon;
}> = [
  {
    id: "auto",
    label: "Auto",
    description: "Stay Direct unless coordination is needed",
    Icon: SparklesIcon,
  },
  {
    id: "direct",
    label: "Direct",
    description: "Fastest · one app and one chain",
    Icon: GaugeIcon,
  },
  {
    id: "coordinate",
    label: "Coordinate",
    description: "Multiple apps or chains · slower",
    Icon: BotIcon,
  },
];

export type ModeSelectProps = { className?: string };

export const ModeSelect: FC<ModeSelectProps> = ({ className }) => {
  const [open, setOpen] = useState(false);
  const { policy, resolvedMode, setPolicy } = useCapabilityComposer();
  const selected = MODES.find((mode) => mode.id === policy) ?? MODES[0]!;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          aria-label="Execution mode"
          className={cn(
            "text-aomi-muted hover:bg-aomi-hover hover:text-aomi-fg h-8 min-w-0 gap-1.5 rounded-full px-2.5 text-xs",
            className,
          )}
        >
          <selected.Icon className="size-3.5 opacity-70" />
          <span>{selected.label}</span>
          {policy === "auto" ? (
            <span className="text-aomi-muted/70 hidden text-[10px] md:inline">
              · {resolvedMode === "coordinate" ? "Coordinate" : "Direct"}
            </span>
          ) : null}
          <ChevronDownIcon className="size-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="border-aomi-border bg-aomi-raised w-[290px] rounded-2xl p-1.5"
      >
        <div className="text-aomi-muted px-2.5 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-[0.08em]">
          Execution mode
        </div>
        {MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => {
              setPolicy(mode.id);
              setOpen(false);
            }}
            className="hover:bg-aomi-hover flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors"
          >
            <span className="bg-aomi-surface-2 text-aomi-muted flex size-8 items-center justify-center rounded-xl">
              <mode.Icon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium">
                {mode.label}
              </span>
              <span className="text-aomi-muted block text-[11px] leading-4">
                {mode.description}
              </span>
            </span>
            {policy === mode.id ? (
              <CheckIcon className="text-aomi-accent size-4" />
            ) : null}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
};
