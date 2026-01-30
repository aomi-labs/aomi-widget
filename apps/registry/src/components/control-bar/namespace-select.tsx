"use client";

import { useState, type FC } from "react";
import { ChevronDownIcon, CheckIcon } from "lucide-react";
import { useControl, cn, type NamespaceOption } from "@aomi-labs/react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type NamespaceSelectProps = {
  className?: string;
  placeholder?: string;
};

export const NamespaceSelect: FC<NamespaceSelectProps> = ({
  className,
  placeholder = "Select agent",
}) => {
  const { state, setNamespace } = useControl();
  const [open, setOpen] = useState(false);

  if (state.availableNamespaces.length === 0) return null;

  const selectedNamespace = state.availableNamespaces.find(
    (ns: NamespaceOption) => ns.id === state.namespace,
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-[180px] justify-between", className)}
        >
          <span className="truncate">
            {selectedNamespace?.label ?? placeholder}
          </span>
          <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-1">
        <div className="flex flex-col gap-0.5">
          {state.availableNamespaces.map((ns: NamespaceOption) => (
            <button
              key={ns.id}
              onClick={() => {
                setNamespace(ns.id);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm outline-none",
                "hover:bg-accent hover:text-accent-foreground",
                "focus:bg-accent focus:text-accent-foreground",
                state.namespace === ns.id && "bg-accent",
              )}
            >
              <span className="flex flex-col items-start">
                <span>{ns.label}</span>
                {ns.description && (
                  <span className="text-muted-foreground text-xs">
                    {ns.description}
                  </span>
                )}
              </span>
              {state.namespace === ns.id && <CheckIcon className="h-4 w-4" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
