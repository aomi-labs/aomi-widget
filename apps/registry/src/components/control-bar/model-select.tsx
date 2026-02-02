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

export type ModelSelectProps = {
  className?: string;
  placeholder?: string;
};

export const ModelSelect: FC<ModelSelectProps> = ({
  className,
  placeholder = "Select model",
}) => {
  const {
    state,
    getAvailableModels,
    getCurrentThreadControl,
    onModelSelect,
    isProcessing,
  } = useControl();
  const [open, setOpen] = useState(false);

  // Fetch available models on mount
  useEffect(() => {
    void getAvailableModels();
  }, [getAvailableModels]);

  // Get current thread's selected model (or fall back to default)
  const threadControl = getCurrentThreadControl();
  const selectedModel =
    threadControl.model ?? state.defaultModel ?? state.availableModels[0];

  const models = state.availableModels.length > 0 ? state.availableModels : [];

  // Don't render if no models available
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          disabled={isProcessing}
          className={cn(
            "h-8 w-auto min-w-[100px] justify-between rounded-full px-2 text-xs",
            "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            isProcessing && "cursor-not-allowed opacity-50",
            className,
          )}
        >
          <span className="truncate">{selectedModel || placeholder}</span>
          <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="center"
        sideOffset={-40}
        className="w-[220px] rounded-3xl p-1 shadow-none"
      >
        <div className="flex flex-col gap-0.5">
          {models.map((model) => (
            <button
              key={model}
              disabled={isProcessing}
              onClick={() => {
                console.log("[ModelSelect] clicked", { model, isProcessing });
                if (isProcessing) return;
                setOpen(false);
                console.log("[ModelSelect] calling onModelSelect", { model });
                void onModelSelect(model)
                  .then(() => {
                    console.log("[ModelSelect] onModelSelect completed", {
                      model,
                    });
                  })
                  .catch((err) => {
                    console.error("[ModelSelect] onModelSelect failed:", err);
                  });
              }}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-full px-3 py-2 text-sm outline-none",
                "hover:bg-accent hover:text-accent-foreground",
                "focus:bg-accent focus:text-accent-foreground",
                selectedModel === model && "bg-accent",
                isProcessing && "cursor-not-allowed opacity-50",
              )}
            >
              <span>{model}</span>
              {selectedModel === model && <CheckIcon className="h-4 w-4" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
