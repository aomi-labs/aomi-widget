"use client";

import { useState, useEffect, type FC } from "react";
import { ChevronDownIcon, CheckIcon } from "lucide-react";
import { useControl, cn } from "@aomi-labs/react";
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
  const {
    state,
    getAuthorizedNamespaces,
    getCurrentThreadControl,
    onNamespaceSelect,
    isProcessing,
  } = useControl();
  const [open, setOpen] = useState(false);

  // Fetch authorized namespaces on mount
  useEffect(() => {
    void getAuthorizedNamespaces();
  }, [getAuthorizedNamespaces]);

  // Get current thread's selected namespace (or fall back to default)
  const threadControl = getCurrentThreadControl();
  const selectedNamespace =
    threadControl.namespace ?? state.defaultNamespace ?? "default";

  const namespaces = state.authorizedNamespaces;

  // Show loading state if no namespaces yet
  if (namespaces.length === 0) {
    return (
      <Button
        variant="ghost"
        disabled
        className={cn(
          "h-8 w-auto min-w-[100px] rounded-full px-2 text-xs",
          "text-muted-foreground",
          className,
        )}
      >
        <span className="truncate">{selectedNamespace}</span>
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          disabled={isProcessing}
          className={cn(
            "h-8 w-auto min-w-[100px] justify-between rounded-full px-3 text-xs",
            "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            isProcessing && "cursor-not-allowed opacity-50",
            className,
          )}
        >
          <span className="truncate">{selectedNamespace ?? placeholder}</span>
          <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="center"
        sideOffset={-40}
        className="w-[180px] rounded-3xl p-1 shadow-none"
      >
        <div className="flex flex-col gap-0.5">
          {namespaces.map((ns: string) => (
            <button
              key={ns}
              disabled={isProcessing}
              onClick={() => {
                console.log("[NamespaceSelect] clicked", { ns, isProcessing });
                if (isProcessing) return;
                console.log("[NamespaceSelect] calling onNamespaceSelect", {
                  ns,
                });
                onNamespaceSelect(ns);
                setOpen(false);
                console.log("[NamespaceSelect] onNamespaceSelect completed", {
                  ns,
                });
              }}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-full px-3 py-2 text-sm outline-none",
                "hover:bg-accent hover:text-accent-foreground",
                "focus:bg-accent focus:text-accent-foreground",
                selectedNamespace === ns && "bg-accent",
                isProcessing && "cursor-not-allowed opacity-50",
              )}
            >
              <span>{ns}</span>
              {selectedNamespace === ns && <CheckIcon className="h-4 w-4" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
