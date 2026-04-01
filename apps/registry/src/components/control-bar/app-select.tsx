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

export type AppSelectProps = {
  className?: string;
  placeholder?: string;
};

export const AppSelect: FC<AppSelectProps> = ({
  className,
  placeholder = "Select App",
}) => {
  const {
    state,
    getAuthorizedApps,
    getCurrentThreadApp,
    onAppSelect,
    isProcessing,
  } = useControl();
  const [open, setOpen] = useState(false);

  // Fetch authorized apps on mount
  useEffect(() => {
    void getAuthorizedApps();
  }, [getAuthorizedApps]);

  const selectedApp = getCurrentThreadApp();

  const apps = state.authorizedApps;

  // Show loading state if no apps yet
  if (apps.length === 0) {
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
        <span className="truncate">
          {selectedApp === "khalani" ? "Khalani Swaps" : selectedApp}
        </span>
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
          <span className="truncate">
            {selectedApp
              ? selectedApp === "khalani"
                ? "Khalani Swaps"
                : selectedApp
              : placeholder}
          </span>
          <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="center"
        sideOffset={-40}
        className="w-[180px] rounded-3xl p-1 shadow-none"
      >
        <div className="flex flex-col gap-0.5">
          {apps.map((app: string) => (
            <button
              key={app}
              disabled={isProcessing}
              onClick={() => {
                if (isProcessing) return;
                onAppSelect(app);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-full px-3 py-2 text-sm outline-none",
                "hover:bg-accent hover:text-accent-foreground",
                "focus:bg-accent focus:text-accent-foreground",
                selectedApp === app && "bg-accent",
                isProcessing && "cursor-not-allowed opacity-50",
              )}
            >
              <span>{app === "khalani" ? "Khalani Swaps" : app}</span>
              {selectedApp === app && <CheckIcon className="h-4 w-4" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
