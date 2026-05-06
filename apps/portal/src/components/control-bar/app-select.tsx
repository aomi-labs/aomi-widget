"use client";

import { useState, useEffect, type FC } from "react";
import { ChevronDownIcon, CheckIcon } from "lucide-react";
import { useControl, cn, initThreadControl, useThreadContext } from "@aomi-labs/react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatAppLabel, getSelectedApp } from "./app-select-state";

export type AppSelectProps = {
  className?: string;
  placeholder?: string;
};

export const AppSelect: FC<AppSelectProps> = ({
  className,
  placeholder = "Select app",
}) => {
  const {
    state,
    getAuthorizedApps,
    getCurrentThreadControl,
    getCurrentThreadApp,
    isProcessing,
  } = useControl();
  const threadContext = useThreadContext();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    void getAuthorizedApps();
  }, [getAuthorizedApps]);

  const threadControl = getCurrentThreadControl();
  const selectedApp = getSelectedApp({
    currentApp: threadControl.app,
    effectiveApp: getCurrentThreadApp(),
  });
  const apps = state.authorizedApps;

  const buttonLabel = formatAppLabel(selectedApp, placeholder);

  const setSelectedApp = (app: string) => {
    const threadId = threadContext.currentThreadId;
    const metadata = threadContext.getThreadMetadata(threadId);
    const currentControl = metadata?.control ?? initThreadControl();

    threadContext.updateThreadMetadata(threadId, {
      control: {
        ...currentControl,
        app,
        controlDirty: true,
      },
    });
  };

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
        <span className="truncate">{buttonLabel}</span>
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
          <span className="truncate">{buttonLabel}</span>
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
                setSelectedApp(app);
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
              <span>{formatAppLabel(app, placeholder)}</span>
              {selectedApp === app && <CheckIcon className="h-4 w-4" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
