"use client";

import { useMemo, useState, type FC } from "react";
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
import { useAomiAuthAdapter } from "../../lib/aomi-auth-adapter";
import { useAomiWalletNetworkPreferences } from "../../lib/aomi-auth-adapter/network-preferences";
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
  const {
    selectedFamily,
    selectedEvmChainId,
    selectedSolanaNetwork,
    setSelectedFamily,
  } = useAomiWalletNetworkPreferences();
  const [open, setOpen] = useState(false);
  const [pendingTarget, setPendingTarget] = useState<AomiNetworkTarget | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const evmChains = chains ?? adapter.supportedNetworks?.evm ?? adapter.supportedChains ?? [];
  const solanaNetworks = adapter.supportedNetworks?.solana ?? [];
  const totalTargets = evmChains.length + solanaNetworks.length;

  const activeFamily = adapter.activeFamily ?? selectedFamily;
  const activeEvmChainId =
    activeFamily === "evm"
      ? adapter.identity.chainId ?? selectedEvmChainId
      : selectedEvmChainId;
  const activeEvmChain = evmChains.find((chain) => chain.id === activeEvmChainId);
  const activeSolanaNetwork = selectedSolanaNetwork;
  const activeNetwork = adapter.activeNetwork;
  const displayLabel =
    activeFamily === "solana"
      ? activeSolanaNetwork?.label ?? "Solana"
      : getChainInfo(activeEvmChainId)?.ticker ??
        activeEvmChain?.name ??
        "Network";
  const CurrentChainIcon =
    activeFamily === "evm" && activeEvmChainId
      ? getChainIcon(activeEvmChainId)
      : undefined;
  const canShowFamilyTabs = evmChains.length > 0 && solanaNetworks.length > 0;
  const currentPanel =
    activeFamily === "solana" && solanaNetworks.length > 0 ? "solana" : "evm";
  const [panel, setPanel] = useState<WalletFamily>(currentPanel);

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
      activeNetwork?.family === "solana" &&
      activeNetwork.networkId !== target.networkId
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
            setPanel(currentPanel);
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "h-9 min-w-[122px] justify-between gap-2 rounded-full border border-border/60 px-3 text-left",
              "bg-background/70 text-foreground backdrop-blur-sm transition-colors",
              "hover:border-primary/30 hover:bg-accent/70",
              className,
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold uppercase text-muted-foreground">
                {CurrentChainIcon ? (
                  <CurrentChainIcon className="h-3.5 w-3.5" />
                ) : (
                  familyLabel(activeFamily).slice(0, 1)
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {displayLabel}
                </span>
              </span>
            </span>
            <ChevronDownIcon className="h-4 w-4 shrink-0 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={6}
          className="w-[290px] rounded-2xl border border-border/70 p-2 shadow-xl"
          onOpenAutoFocus={(event) => {
            if (
              typeof window.matchMedia === "function" &&
              window.matchMedia("(max-width: 767px)").matches
            ) {
              event.preventDefault();
            }
          }}
        >
          <div className="mb-2 flex items-center justify-between px-1">
            <div>
              <div className="text-sm font-medium">Network</div>
              <div className="text-xs text-muted-foreground">
                Choose a wallet family and target network
              </div>
            </div>
          </div>

          {canShowFamilyTabs && (
            <div className="mb-2 grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
              {(["evm", "solana"] as const).map((family) => (
                <button
                  key={family}
                  type="button"
                  onClick={() => {
                    setPanel(family);
                    setSelectedFamily(family);
                  }}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
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

          <div className="flex flex-col gap-1">
            {(panel === "evm" ? evmChains : solanaNetworks).map((item) => {
              const isEvm = panel === "evm";
              const key = isEvm ? String((item as Chain).id) : (item as SolanaNetworkOption).id;
              const isActive = isEvm
                ? selectedFamily === "evm" &&
                  selectedTargetIds.evm === (item as Chain).id
                : selectedFamily === "solana" &&
                  selectedTargetIds.solana === (item as SolanaNetworkOption).id;
              const ChainIcon = isEvm
                ? getChainIcon((item as Chain).id)
                : undefined;
              const title = isEvm
                ? (item as Chain).name
                : (item as SolanaNetworkOption).label;
              const description = isEvm
                ? getChainInfo((item as Chain).id)?.ticker ??
                  ("nativeCurrency" in (item as Chain)
                    ? (item as Chain).nativeCurrency.symbol
                    : "Chain")
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
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    isActive && "bg-accent/80",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase text-muted-foreground",
                      isActive && "bg-primary/10 text-primary",
                    )}
                  >
                    {ChainIcon ? (
                      <ChainIcon className="h-4 w-4" />
                    ) : (
                      description.slice(0, 1)
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {title}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {description}
                    </span>
                  </span>
                  {isActive && <CheckIcon className="h-4 w-4 shrink-0 text-primary" />}
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
              Switching Solana network will disconnect your current Solana wallet
              and require reconnect.
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
