"use client";

import { useEffect, useMemo, useState, type FC } from "react";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { cn, getChainInfo } from "@aomi-labs/react";
import type { Chain } from "viem";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getChainIcon } from "@/components/icons";
import {
  useAomiAuthAdapter,
  useWalletActivationGuard,
} from "../../lib/aomi-auth-adapter";
import { useOptionalAomiWalletNetworkPreferences } from "../../lib/aomi-auth-adapter/network-preferences";
import type {
  AomiNetworkTarget,
  SolanaNetworkOption,
  WalletFamily,
} from "../../lib/aomi-auth-adapter/types";

export type NetworkSelectProps = {
  className?: string;
  chains?: readonly Chain[];
};

function familyLabel(family: WalletFamily): string {
  return family === "solana" ? "Solana" : "EVM";
}

function formatSolanaBadge(network: SolanaNetworkOption): string {
  if (network.cluster === "solana:mainnet") return "Mainnet";
  if (network.cluster === "solana:testnet") return "Testnet";
  return "Devnet";
}

export const NetworkSelect: FC<NetworkSelectProps> = ({
  className,
  chains,
}) => {
  const adapter = useAomiAuthAdapter();
  // Optional: a standalone <AomiFrame /> (e.g. docs demo / SSR) may render
  // without a wallet provider mounting the network preferences context.
  const networkPreferences = useOptionalAomiWalletNetworkPreferences();
  const selectedEvmChainId = networkPreferences?.selectedEvmChainId;
  const selectedSolanaNetwork = networkPreferences?.selectedSolanaNetwork;
  const [open, setOpen] = useState(false);
  const [pendingTarget, setPendingTarget] = useState<AomiNetworkTarget | null>(
    null,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const canActivateWallet = useWalletActivationGuard();

  const evmChains =
    chains ?? adapter.supportedNetworks?.evm ?? adapter.supportedChains ?? [];
  const solanaNetworks = adapter.supportedNetworks?.solana ?? [];
  const totalTargets = evmChains.length + solanaNetworks.length;

  const activeEvmChainId = adapter.identity.chainId ?? selectedEvmChainId;
  const activeEvmChain = evmChains.find(
    (chain) => chain.id === activeEvmChainId,
  );
  const activeSolanaNetwork = selectedSolanaNetwork;
  const canShowFamilyTabs = evmChains.length > 0 && solanaNetworks.length > 0;
  const defaultPanel: WalletFamily = evmChains.length > 0 ? "evm" : "solana";
  const [panel, setPanel] = useState<WalletFamily>(defaultPanel);

  // Both families are always active, so the trigger reflects both current
  // networks (e.g. "ETH · Mainnet") rather than one "active family".
  const evmLabel =
    getChainInfo(activeEvmChainId)?.ticker ?? activeEvmChain?.name;
  const solanaLabel = activeSolanaNetwork?.label;
  const displayLabel =
    [
      evmChains.length > 0 ? evmLabel : undefined,
      solanaNetworks.length > 0 ? solanaLabel : undefined,
    ]
      .filter(Boolean)
      .join(" · ") || "Network";

  useEffect(() => {
    if (!open) {
      setPanel(defaultPanel);
    }
  }, [defaultPanel, open]);

  const selectedTargetIds = useMemo(
    () => ({
      evm: activeEvmChainId,
      solana: activeSolanaNetwork?.id,
    }),
    [activeEvmChainId, activeSolanaNetwork?.id],
  );

  if (totalTargets <= 1) {
    return null;
  }

  const applyTarget = async (target: AomiNetworkTarget) => {
    if (!canActivateWallet()) return;
    if (adapter.selectNetwork) {
      await adapter.selectNetwork(target);
      setOpen(false);
      return;
    }
    setOpen(false);
  };

  const handleTargetSelect = async (target: AomiNetworkTarget) => {
    if (
      target.family === "solana" &&
      adapter.solanaNetworkSwitchRequiresReconnect &&
      activeSolanaNetwork &&
      activeSolanaNetwork.id !== target.networkId
    ) {
      setPendingTarget(target);
      setConfirmOpen(true);
      return;
    }

    await applyTarget(target);
  };

  return (
    <>
      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (nextOpen) {
            setPanel(defaultPanel);
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            role="combobox"
            aria-expanded={open}
            disabled={!adapter.selectNetwork}
            className={cn(
              "h-8 w-auto min-w-0 justify-between gap-px rounded-full px-0.5 text-xs md:min-w-[80px] md:gap-1.5 md:px-3",
              "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              !adapter.selectNetwork && "cursor-not-allowed opacity-50",
              className,
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="min-w-0 truncate">{displayLabel}</span>
            </span>
            <ChevronDownIcon className="ml-1 h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={4}
          className="w-[240px] rounded-xl p-1"
          onOpenAutoFocus={(event) => {
            if (
              typeof window.matchMedia === "function" &&
              window.matchMedia("(max-width: 767px)").matches
            ) {
              event.preventDefault();
            }
          }}
        >
          {canShowFamilyTabs && (
            <div className="bg-muted/70 mb-1 grid grid-cols-2 gap-1 rounded-lg p-1">
              {(["evm", "solana"] as const).map((family) => (
                <button
                  key={family}
                  type="button"
                  onClick={() => {
                    setPanel(family);
                  }}
                  className={cn(
                    "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                    panel === family
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {familyLabel(family)}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-0.5">
            {(panel === "evm" ? evmChains : solanaNetworks).map((item) => {
              const isEvm = panel === "evm";
              const key = isEvm
                ? String((item as Chain).id)
                : (item as SolanaNetworkOption).id;
              const isActive = isEvm
                ? selectedTargetIds.evm === (item as Chain).id
                : selectedTargetIds.solana === (item as SolanaNetworkOption).id;
              const ChainIcon = isEvm
                ? getChainIcon((item as Chain).id)
                : undefined;
              const title = isEvm
                ? (item as Chain).name
                : (item as SolanaNetworkOption).label;
              const description = isEvm
                ? (getChainInfo((item as Chain).id)?.ticker ??
                  ("nativeCurrency" in (item as Chain)
                    ? (item as Chain).nativeCurrency.symbol
                    : "Chain"))
                : formatSolanaBadge(item as SolanaNetworkOption);

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    void handleTargetSelect(
                      isEvm
                        ? {
                            family: "evm",
                            chainId: (item as Chain).id,
                          }
                        : {
                            family: "solana",
                            networkId: (item as SolanaNetworkOption).id,
                          },
                    )
                  }
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm outline-none transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus:bg-accent focus:text-accent-foreground",
                    isActive && "bg-accent",
                  )}
                >
                  <span
                    className={cn(
                      "bg-muted text-muted-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-medium uppercase",
                      isActive && "bg-primary/10 text-primary",
                    )}
                  >
                    {ChainIcon ? (
                      <ChainIcon className="h-4 w-4" />
                    ) : (
                      description.slice(0, 2)
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{title}</span>
                  {isActive && (
                    <CheckIcon className="text-primary h-4 w-4 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Switch Solana Network?</DialogTitle>
            <DialogDescription>
              This Solana adapter needs a wallet reconnect to change clusters.
              Your current chat and EVM wallet stay connected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmOpen(false);
                setPendingTarget(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                const target = pendingTarget;
                setConfirmOpen(false);
                setPendingTarget(null);
                if (target) {
                  void applyTarget(target);
                }
              }}
            >
              Switch Network
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
