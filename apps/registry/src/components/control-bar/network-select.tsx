"use client";

import { useState, type FC } from "react";
import { ChevronDownIcon, CheckIcon } from "lucide-react";
import { cn, SUPPORTED_CHAINS, getChainInfo } from "@aomi-labs/react";
import type { Chain } from "viem";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getChainIcon } from "@/components/icons";
import { useAomiAuthAdapter } from "../../lib/aomi-auth-adapter";

export type NetworkSelectProps = {
  className?: string;
  /** Override the default chain list from the lib */
  chains?: readonly Chain[];
};

export const NetworkSelect: FC<NetworkSelectProps> = ({
  className,
  chains,
}) => {
  const adapter = useAomiAuthAdapter();
  const { chainId, isConnected } = adapter.identity;
  const switchChain = adapter.switchChain;
  const isPending = adapter.isSwitchingChain;
  const selectableChains =
    chains ?? adapter.supportedChains ?? SUPPORTED_CHAINS;
  const [open, setOpen] = useState(false);

  if (!isConnected) return null;

  const currentChain = getChainInfo(chainId);
  const displayName = currentChain?.ticker ?? "Network";
  const CurrentChainIcon = chainId ? getChainIcon(chainId) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          disabled={isPending || !switchChain}
          className={cn(
            "h-8 w-auto min-w-0 justify-between gap-px rounded-full px-0.5 text-xs md:min-w-[80px] md:gap-1.5 md:px-3",
            "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            (isPending || !switchChain) && "cursor-not-allowed opacity-50",
            className,
          )}
        >
          {CurrentChainIcon && (
            <CurrentChainIcon className="h-3 w-3 shrink-0 opacity-60" />
          )}
          <span className="truncate">{displayName}</span>
          <ChevronDownIcon className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="w-[200px] rounded-xl p-1"
        onOpenAutoFocus={(e) => {
          if (window.matchMedia("(max-width: 767px)").matches) {
            e.preventDefault();
          }
        }}
      >
        <div className="flex flex-col gap-0.5">
          {selectableChains.map((chain) => {
            const ChainIcon = getChainIcon(chain.id);
            const fallbackTicker =
              "nativeCurrency" in chain ? chain.nativeCurrency.symbol : chain.name;
            const chainInfo = getChainInfo(chain.id);
            const chainTicker = chainInfo?.ticker ?? fallbackTicker;
            return (
              <button
                key={chain.id}
                disabled={isPending || !switchChain}
                onClick={() => {
                  if (isPending || chain.id === chainId || !switchChain) return;
                  void switchChain(chain.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm outline-none transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  "focus:bg-accent focus:text-accent-foreground",
                  chainId === chain.id && "bg-accent",
                  (isPending || !switchChain) && "cursor-not-allowed opacity-50",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                    "bg-muted text-muted-foreground",
                    chainId === chain.id && "bg-primary/10 text-primary",
                  )}
                >
                  {ChainIcon ? (
                    <ChainIcon className="h-4 w-4" />
                  ) : (
                    <span className="text-[10px] font-medium">
                      {chainTicker.slice(0, 2)}
                    </span>
                  )}
                </span>
                <span className="flex-1 truncate text-left">{chain.name}</span>
                {chainId === chain.id && (
                  <CheckIcon className="h-4 w-4 shrink-0 text-primary" />
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};
