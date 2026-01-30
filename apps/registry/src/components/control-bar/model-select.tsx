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
};

export const ModelSelect: FC<ModelSelectProps> = ({
  className,
  placeholder = "Select model",
}) => {
  const { state, getAvailableModels, onModelSelect } = useControl();
  const [open, setOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  useEffect(() => {
    void getAvailableModels();
  }, [getAvailableModels]);

  const models = state.availableModels;

  if (models.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-[180px] justify-between", className)}
        >
          <span className="truncate">{selectedModel ?? placeholder}</span>
          <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-1">
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
                "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm outline-none",
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
