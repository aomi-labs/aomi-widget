"use client";

import { useState, type FC } from "react";
import { ChevronDownIcon, CheckIcon } from "lucide-react";
import { useControl, cn, type ModelOption } from "@aomi-labs/react";
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
  const { state, setModelId } = useControl();
  const [open, setOpen] = useState(false);

  if (state.availableModels.length === 0) return null;

  const selectedModel = state.availableModels.find(
    (m: ModelOption) => m.id === state.modelId,
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
            {selectedModel?.label ?? placeholder}
          </span>
          <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-1">
        <div className="flex flex-col gap-0.5">
          {state.availableModels.map((model: ModelOption) => (
            <button
              key={model.id}
              onClick={() => {
                setModelId(model.id);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm outline-none",
                "hover:bg-accent hover:text-accent-foreground",
                "focus:bg-accent focus:text-accent-foreground",
                state.modelId === model.id && "bg-accent",
              )}
            >
              <span className="flex flex-col items-start">
                <span>{model.label}</span>
                {model.provider && (
                  <span className="text-muted-foreground text-xs">
                    {model.provider}
                  </span>
                )}
              </span>
              {state.modelId === model.id && <CheckIcon className="h-4 w-4" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
