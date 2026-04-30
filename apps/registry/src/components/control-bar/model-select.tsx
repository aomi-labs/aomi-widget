"use client";

import { useEffect, useState, type FC } from "react";
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
import {
  groupModelsByVendor,
  getVendorForModel,
  AUTO_MODE_LABEL,
  resolveAutoModel,
} from "./model-metadata";
import { AutoModeIcon, getVendorIcon } from "@/components/icons";

export type ModelSelectProps = {
  className?: string;
  placeholder?: string;
};

export const ModelSelect: FC<ModelSelectProps> = ({
  className,
  placeholder = "Select model",
}) => {
  const { state, getAvailableModels, getCurrentThreadControl, onModelSelect } =
    useControl();
  const [open, setOpen] = useState(false);
  // Track auto mode locally — backend only sees the resolved model string.
  // Starts true (default state), set to false when user picks a specific model.
  const [isAutoMode, setIsAutoMode] = useState(true);

  useEffect(() => {
    void getAvailableModels();
  }, [getAvailableModels]);

  const threadControl = getCurrentThreadControl();
  const rawSelected = threadControl.model;
  const models = state.availableModels;

  const autoBackendModel = resolveAutoModel(models);
  // Auto when: local flag says so, OR no model selected yet (fresh thread)
  const isAuto = isAutoMode || rawSelected === null;
  const selectedModel = isAuto
    ? autoBackendModel
    : (rawSelected ?? state.defaultModel ?? models[0]);

  if (models.length === 0) {
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
        <span className="truncate">Loading...</span>
      </Button>
    );
  }

  const groups = groupModelsByVendor(models);

  // Display label for the trigger button
  const triggerLabel = isAuto ? AUTO_MODE_LABEL : selectedModel || placeholder;

  const handleSelect = (model: string) => {
    setIsAutoMode(false);
    setOpen(false);
    void onModelSelect(model).catch((err) => {
      console.error("[ModelSelect] onModelSelect failed:", err);
    });
  };

  const handleAutoSelect = () => {
    if (!autoBackendModel) return;
    setIsAutoMode(true);
    setOpen(false);
    void onModelSelect(autoBackendModel).catch((err) => {
      console.error("[ModelSelect] auto onModelSelect failed:", err);
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-8 w-auto min-w-[100px] justify-between rounded-full px-3 text-xs",
            "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            className,
          )}
        >
          <div className="flex items-center gap-1.5">
            {(() => {
              if (isAuto) {
                return <AutoModeIcon className="h-3 w-3 shrink-0 opacity-60" />;
              }
              if (selectedModel) {
                const vendor = getVendorForModel(selectedModel);
                const VIcon = getVendorIcon(vendor.id);
                if (VIcon) return <VIcon className="h-3 w-3 shrink-0 opacity-60" />;
              }
              return null;
            })()}
            <span className="truncate">{triggerLabel}</span>
          </div>
          <ChevronDownIcon className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="w-[280px] overflow-hidden rounded-xl p-0"
      >
        <Command className="rounded-xl">
          <CommandInput placeholder="Search models..." />
          <CommandList>
            <CommandEmpty>No models found.</CommandEmpty>

            {/* Auto mode — pinned at top */}
            <CommandGroup>
              <CommandItem
                value="auto"
                onSelect={handleAutoSelect}
                className="flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-md",
                      "bg-primary/10 text-primary",
                    )}
                  >
                    <AutoModeIcon className="h-3.5 w-3.5" />
                  </span>
                  <div className="flex flex-col">
                    <span className="font-medium">{AUTO_MODE_LABEL}</span>
                    <span className="text-muted-foreground text-[11px]">
                      Best balance of speed & cost
                    </span>
                  </div>
                </div>
                {isAuto && <CheckIcon className="h-4 w-4 shrink-0" />}
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            {/* Vendor-grouped models */}
            {groups.map((group) => {
              const VendorIcon = getVendorIcon(group.vendor.id);
              return (
                <CommandGroup
                  key={group.vendor.id}
                  heading={group.vendor.label}
                >
                  {group.models.map((model) => (
                    <CommandItem
                      key={model}
                      value={model}
                      onSelect={() => handleSelect(model)}
                      className="flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-md",
                            "bg-muted text-muted-foreground",
                          )}
                        >
                          {VendorIcon ? (
                            <VendorIcon className="h-3.5 w-3.5" />
                          ) : (
                            <span className="text-[10px] font-medium">
                              {group.vendor.abbr}
                            </span>
                          )}
                        </span>
                        <span className="truncate">{model}</span>
                      </div>
                      {!isAuto && selectedModel === model && (
                        <CheckIcon className="h-4 w-4 shrink-0" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
