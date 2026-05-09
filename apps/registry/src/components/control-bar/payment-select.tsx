"use client";

import { useState, type FC, type ReactNode } from "react";
import { CheckIcon, ChevronDownIcon, CreditCardIcon, Loader2Icon } from "lucide-react";
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

export type PaymentMethodStatusTone =
  | "ready"
  | "connecting"
  | "warning"
  | "error";

export type PaymentMethodStatus = {
  tone: PaymentMethodStatusTone;
  /** Tooltip / aria label text. */
  label?: string;
  /**
   * Optional remediation action shown beneath the option list.
   * Hosts attach `connect` only for methods/states they can actually remediate
   * from this surface (e.g. MPP "not connected"); absence means no CTA.
   */
  connect?: {
    label: string;
    run: () => Promise<void> | void;
  };
};

export type PaymentSelectProps = {
  className?: string;
  /**
   * Optional per-method status. Returning `undefined` renders no dot and no CTA
   * for that option. Backward-compatible: when omitted, the picker is selection-only.
   */
  getStatus?: (
    method: AomiPaymentMethod | null,
  ) => PaymentMethodStatus | undefined;
};

type PaymentOption = {
  label: string;
  description: string;
  value: AomiPaymentMethod | null;
};

const PAYMENT_OPTIONS: PaymentOption[] = [
  { label: "Auto", description: "Backend default", value: null },
  { label: "Aomi", description: "Included credits", value: "null" },
  { label: "BYOK", description: "Use provider key", value: "byok" },
  { label: "MPP", description: "Tempo", value: "tempo" },
  { label: "x402", description: "Coinbase", value: "coinbase" },
];

const TONE_DOT_CLASS: Record<PaymentMethodStatusTone, string> = {
  ready: "bg-emerald-500",
  connecting: "bg-amber-500",
  warning: "bg-amber-500",
  error: "bg-destructive",
};

function StatusDot({
  tone,
  className,
}: {
  tone: PaymentMethodStatusTone;
  className?: string;
}): ReactNode {
  if (tone === "connecting") {
    return (
      <Loader2Icon
        className={cn("h-3 w-3 shrink-0 animate-spin text-amber-500", className)}
        aria-hidden
      />
    );
  }
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 shrink-0 rounded-full",
        TONE_DOT_CLASS[tone],
        className,
      )}
      aria-hidden
    />
  );
}

export const PaymentSelect: FC<PaymentSelectProps> = ({
  className,
  getStatus,
}) => {
  const { getCurrentThreadPaymentMethod, onPaymentMethodSelect, isProcessing } =
    useControl();
  const [open, setOpen] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const selectedValue = getCurrentThreadPaymentMethod();
  const selectedOption =
    PAYMENT_OPTIONS.find((option) => option.value === selectedValue) ??
    PAYMENT_OPTIONS[0];
  const selectedStatus = getStatus?.(selectedValue);

  const handleConnect = async () => {
    if (!selectedStatus?.connect) return;
    setConnectError(null);
    setIsConnecting(true);
    try {
      await selectedStatus.connect.run();
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : "Connect failed");
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          aria-label={selectedStatus?.label}
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
          {selectedStatus && <StatusDot tone={selectedStatus.tone} />}
          <ChevronDownIcon className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="w-[240px] overflow-hidden rounded-xl p-0"
      >
        <Command className="rounded-xl">
          <CommandList>
            <CommandGroup>
              {PAYMENT_OPTIONS.map((option) => {
                const optionStatus = getStatus?.(option.value);
                return (
                  <CommandItem
                    key={option.value ?? "auto"}
                    value={`${option.label} ${option.description}`}
                    disabled={isProcessing}
                    onSelect={() => {
                      if (isProcessing) return;
                      onPaymentMethodSelect(option.value);
                      setConnectError(null);
                      setOpen(false);
                    }}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-muted-foreground text-[11px]">
                        {optionStatus?.label ?? option.description}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {optionStatus && <StatusDot tone={optionStatus.tone} />}
                      {selectedValue === option.value && (
                        <CheckIcon className="h-4 w-4 shrink-0" />
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
          {selectedStatus?.connect && (
            <div className="border-t p-2">
              <Button
                type="button"
                size="sm"
                variant="default"
                className="w-full rounded-full"
                disabled={isConnecting}
                onClick={handleConnect}
              >
                {isConnecting ? (
                  <Loader2Icon className="mr-1 h-3 w-3 animate-spin" />
                ) : null}
                {selectedStatus.connect.label}
              </Button>
              {connectError && (
                <p className="text-destructive mt-1 px-1 text-[11px]">
                  {connectError}
                </p>
              )}
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
};
