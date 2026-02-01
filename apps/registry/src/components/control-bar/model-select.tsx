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

export type ModelSelectProps = {
  className?: string;
  placeholder?: string;
  defaultModel?: string;
};

const DEFAULT_MODEL = "Claude Opus 4";

export const ModelSelect: FC<ModelSelectProps> = ({
  className,
  placeholder = "Select model",
  defaultModel = DEFAULT_MODEL,
}) => {
  const { state, getAvailableModels, onModelSelect } = useControl();
  const [open, setOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(defaultModel);

  useEffect(() => {
    void getAvailableModels();
  }, [getAvailableModels]);

  const models =
    state.availableModels.length > 0 ? state.availableModels : [defaultModel];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-8 w-auto min-w-[100px] justify-between rounded-full px-2 text-xs",
            "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
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
        className="w-[180px] rounded-full p-1 shadow-none"
      >
        <div className="flex flex-col gap-0.5">
          {models.map((model) => (
            <button
              key={model}
              onClick={() => {
                setSelectedModel(model);
                setOpen(false);
                void onModelSelect(model);
              }}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-full px-3 py-2 text-sm outline-none",
                "hover:bg-accent hover:text-accent-foreground",
                "focus:bg-accent focus:text-accent-foreground",
                selectedModel === model && "bg-accent",
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
