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
  const { state, setState, getAuthorizedNamespaces } = useControl();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    void getAuthorizedNamespaces();
  }, [getAuthorizedNamespaces]);

  const namespaces = state.authorizedNamespaces;

  if (namespaces.length === 0) {
    return (
      <Button variant="outline" disabled className={cn("w-[180px]", className)}>
        <span className="truncate">{state.namespace ?? "default"}</span>
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-[180px] justify-between", className)}
        >
          <span className="truncate">{state.namespace ?? placeholder}</span>
          <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-1">
        <div className="flex flex-col gap-0.5">
          {namespaces.map((ns) => (
            <button
              key={ns}
              onClick={() => {
                setState({ namespace: ns });
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm outline-none",
                "hover:bg-accent hover:text-accent-foreground",
                "focus:bg-accent focus:text-accent-foreground",
                state.namespace === ns && "bg-accent",
              )}
            >
              <span>{ns}</span>
              {state.namespace === ns && <CheckIcon className="h-4 w-4" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
