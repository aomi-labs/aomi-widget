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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandInput,
  CommandSeparator,
} from "@/components/ui/command";
import { getAppInfo, groupAppsByCategory } from "./app-metadata";
import { AllAppsIcon, getAppIcon } from "@/components/icons";

export type AppSelectProps = {
  className?: string;
  placeholder?: string;
};

/** The "default" app id that means "all apps". */
const ALL_APPS_ID = "default";

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

  useEffect(() => {
    void getAuthorizedApps();
  }, [getAuthorizedApps]);

  const selectedApp = getCurrentThreadApp();
  const selectedInfo = getAppInfo(selectedApp);
  const SelectedAppIcon = getAppIcon(selectedApp);

  const apps = state.authorizedApps;

  // Separate "default" (All Apps) from the rest for pinned treatment
  const hasAllApps = apps.includes(ALL_APPS_ID);
  const otherApps = apps.filter((a) => a !== ALL_APPS_ID);
  const groups = groupAppsByCategory(otherApps);

  if (apps.length === 0) {
    return (
      <Button
        variant="ghost"
        disabled
        className={cn(
          "h-8 w-auto min-w-[80px] rounded-full px-2 text-xs",
          "text-muted-foreground",
          className,
        )}
      >
        <span className="truncate">{selectedInfo.displayName}</span>
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
            "h-8 w-auto min-w-0 justify-between gap-px rounded-full px-0.5 text-xs md:min-w-[80px] md:gap-1.5 md:px-3",
            "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            isProcessing && "cursor-not-allowed opacity-50",
            className,
          )}
        >
          {SelectedAppIcon && (
            <SelectedAppIcon className="h-3 w-3 shrink-0 opacity-60" />
          )}
          <span className="truncate">{selectedInfo.displayName}</span>
          <ChevronDownIcon className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="w-[260px] overflow-hidden rounded-xl p-0"
        onOpenAutoFocus={(e) => {
          if (window.matchMedia("(max-width: 767px)").matches) {
            e.preventDefault();
          }
        }}
      >
        <Command className="rounded-xl">
          <CommandInput placeholder="Search apps..." />
          <CommandList>
            <CommandEmpty>No apps found.</CommandEmpty>

            {/* All Apps — pinned at top */}
            {hasAllApps && (
              <>
                <CommandGroup>
                  <CommandItem
                    value="all apps default"
                    disabled={isProcessing}
                    onSelect={() => {
                      if (isProcessing) return;
                      onAppSelect(ALL_APPS_ID);
                      setOpen(false);
                    }}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-md",
                          "bg-primary/10 text-primary",
                        )}
                      >
                        <AllAppsIcon className="h-3.5 w-3.5" />
                      </span>
                      <div className="flex flex-col">
                        <span className="font-medium">All Apps</span>
                        <span className="text-muted-foreground text-xs">
                          Use all available apps
                        </span>
                      </div>
                    </div>
                    {selectedApp === ALL_APPS_ID && (
                      <CheckIcon className="h-4 w-4 shrink-0" />
                    )}
                  </CommandItem>
                </CommandGroup>
                {otherApps.length > 0 && <CommandSeparator />}
              </>
            )}

            {/* Category-grouped apps */}
            {groups.map((group) => (
              <CommandGroup
                key={group.category.id}
                heading={group.category.label}
              >
                {group.apps.map((app) => {
                  const AppIcon = getAppIcon(app.id);
                  return (
                    <CommandItem
                      key={app.id}
                      value={`${app.displayName} ${app.category.label} ${app.id}`}
                      disabled={isProcessing}
                      onSelect={() => {
                        if (isProcessing) return;
                        onAppSelect(app.id);
                        setOpen(false);
                      }}
                      className="flex items-center justify-between gap-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={cn(
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-medium",
                            "bg-muted text-muted-foreground",
                            selectedApp === app.id &&
                              "bg-primary/10 text-primary",
                          )}
                        >
                          {AppIcon ? <AppIcon className="h-4 w-4" /> : app.abbr}
                        </span>
                        <span className="truncate">{app.displayName}</span>
                      </div>
                      {selectedApp === app.id && (
                        <CheckIcon className="text-primary h-4 w-4 shrink-0" />
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
