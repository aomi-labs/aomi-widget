"use client";

import { useState, type FC } from "react";
import { CheckIcon, ChevronDownIcon, CreditCardIcon } from "lucide-react";
import { cn, useControl, type AomiPaymentMethod } from "@aomi-labs/react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export type PaymentSelectProps = {
  className?: string;
};

type PaymentOption = {
  label: string;
  description: string;
  value: AomiPaymentMethod | null;
};

const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    label: "Auto",
    description: "Backend default",
    value: null,
  },
  {
    label: "Aomi",
    description: "Included credits",
    value: "null",
  },
  {
    label: "BYOK",
    description: "Use provider key",
    value: "byok",
  },
  {
    label: "MPP",
    description: "Tempo",
    value: "tempo",
  },
  {
    label: "x402",
    description: "Coinbase",
    value: "coinbase",
  },
];

export const PaymentSelect: FC<PaymentSelectProps> = ({ className }) => {
  const { getCurrentThreadPaymentMethod, onPaymentMethodSelect, isProcessing } =
    useControl();
  const [open, setOpen] = useState(false);
  const selectedValue = getCurrentThreadPaymentMethod();
  const selectedOption =
    PAYMENT_OPTIONS.find((option) => option.value === selectedValue) ??
    PAYMENT_OPTIONS[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          disabled={isProcessing}
          className={cn(
            "h-8 w-auto min-w-[82px] justify-between gap-1.5 rounded-full px-3 text-xs",
            "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            isProcessing && "cursor-not-allowed opacity-50",
            className,
          )}
        >
          <CreditCardIcon className="h-3 w-3 shrink-0 opacity-60" />
          <span className="truncate">{selectedOption.label}</span>
          <ChevronDownIcon className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="w-[220px] overflow-hidden rounded-xl p-0"
      >
        <Command className="rounded-xl">
          <CommandList>
            <CommandGroup>
              {PAYMENT_OPTIONS.map((option) => (
                <CommandItem
                  key={option.value ?? "auto"}
                  value={`${option.label} ${option.description}`}
                  disabled={isProcessing}
                  onSelect={() => {
                    if (isProcessing) return;
                    onPaymentMethodSelect(option.value);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{option.label}</span>
                    <span className="text-muted-foreground text-[11px]">
                      {option.description}
                    </span>
                  </div>
                  {selectedValue === option.value && (
                    <CheckIcon className="h-4 w-4 shrink-0" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
