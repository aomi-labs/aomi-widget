"use client";

import { useState, type FC } from "react";
import { ChevronDownIcon, CheckIcon } from "lucide-react";
import { useAccount, useSwitchChain } from "wagmi";
import { cn, SUPPORTED_CHAINS, getChainInfo } from "@aomi-labs/react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type NetworkSelectProps = {
  className?: string;
  /** Override the default chain list from the lib */
  chains?: typeof SUPPORTED_CHAINS;
};

export const NetworkSelect: FC<NetworkSelectProps> = ({
  className,
  chains = SUPPORTED_CHAINS,
}) => {
  const { chainId, isConnected } = useAccount();
  const { switchChain, isPending } = useSwitchChain();
  const [open, setOpen] = useState(false);

  // Show only when wallet is connected.
  if (!isConnected) return null;

  const currentChain = getChainInfo(chainId);
  const displayName = currentChain?.ticker ?? "Network";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          disabled={isPending}
          className={cn(
            "h-8 w-auto min-w-[80px] justify-between rounded-full px-3 text-xs",
            "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            isPending && "cursor-not-allowed opacity-50",
            className,
          )}
        >
          <span className="truncate">{displayName}</span>
          <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="center"
        sideOffset={-40}
        className="w-[180px] rounded-3xl p-1 shadow-none"
      >
        <div className="flex flex-col gap-0.5">
          {chains.map((chain) => (
            <button
              key={chain.id}
              disabled={isPending}
              onClick={() => {
                if (isPending || chain.id === chainId) return;
                switchChain({ chainId: chain.id });
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-full px-3 py-2 text-sm outline-none",
                "hover:bg-accent hover:text-accent-foreground",
                "focus:bg-accent focus:text-accent-foreground",
                chainId === chain.id && "bg-accent",
                isPending && "cursor-not-allowed opacity-50",
              )}
            >
              <span>{chain.name}</span>
              {chainId === chain.id && <CheckIcon className="h-4 w-4" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
