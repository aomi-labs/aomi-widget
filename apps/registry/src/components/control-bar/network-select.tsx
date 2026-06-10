"use client";

import { Fragment, useMemo, useState, type FC, type SVGProps } from "react";
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
import { getChainIcon, SolanaIcon } from "@/components/icons";
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

type GlyphIcon = FC<SVGProps<SVGSVGElement>>;

/** A single switchable network row, family-agnostic so EVM + Solana share one list. */
type NetworkRow = {
  family: WalletFamily;
  key: string;
  title: string;
  Icon?: GlyphIcon;
  /** Two-letter fallback when no brand mark exists (EVM only). */
  fallback: string;
  isActive: boolean;
  target: AomiNetworkTarget;
};

type NetworkSection = {
  family: WalletFamily;
  rows: NetworkRow[];
};

function familyLabel(family: WalletFamily): string {
  return family === "solana" ? "SVM" : "EVM";
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

  const identity = adapter.identity;
  const evmChains =
    chains ?? adapter.supportedNetworks?.evm ?? adapter.supportedChains ?? [];
  const solanaNetworks = adapter.supportedNetworks?.solana ?? [];

  // Which families to surface follows what the user has actually connected,
  // not just what the host supports — an EVM-only wallet shouldn't see Solana
  // switching, and vice-versa. With nothing connected we fall back to showing
  // every supported network so the picker doubles as a pre-connect preference.
  const evmConnected = Boolean(identity.address);
  const solanaConnected = Boolean(identity.svmAddress);
  const anyConnected = evmConnected || solanaConnected;
  const showEvm =
    evmChains.length > 0 && (anyConnected ? evmConnected : true);
  const showSolana =
    solanaNetworks.length > 0 && (anyConnected ? solanaConnected : true);

  const activeEvmChainId = identity.chainId ?? selectedEvmChainId;
  const activeEvmChain = evmChains.find(
    (chain) => chain.id === activeEvmChainId,
  );
  const activeSolanaNetwork = selectedSolanaNetwork;

  const sections = useMemo<NetworkSection[]>(() => {
    const result: NetworkSection[] = [];
    if (showEvm) {
      result.push({
        family: "evm",
        rows: evmChains.map((chain) => {
          const ticker =
            getChainInfo(chain.id)?.ticker ??
            ("nativeCurrency" in chain ? chain.nativeCurrency.symbol : "");
          return {
            family: "evm",
            key: `evm:${chain.id}`,
            title: chain.name,
            Icon: getChainIcon(chain.id),
            fallback: ticker.slice(0, 2),
            isActive: activeEvmChainId === chain.id,
            target: { family: "evm", chainId: chain.id },
          };
        }),
      });
    }
    if (showSolana) {
      result.push({
        family: "solana",
        rows: solanaNetworks.map((network) => ({
          family: "solana",
          key: `solana:${network.id}`,
          title: network.label,
          Icon: SolanaIcon,
          fallback: formatSolanaBadge(network).slice(0, 2),
          isActive: activeSolanaNetwork?.id === network.id,
          target: { family: "solana", networkId: network.id },
        })),
      });
    }
    return result;
  }, [
    showEvm,
    showSolana,
    evmChains,
    solanaNetworks,
    activeEvmChainId,
    activeSolanaNetwork?.id,
  ]);

  // Trigger pairs each shown family's brand mark with its live network
  // (e.g. a dual session reads "Base / Mainnet"); the icon carries the family,
  // so the SVM label stays to its cluster.
  const triggerChips = useMemo(() => {
    const chips: { family: WalletFamily; Icon?: GlyphIcon; label: string }[] =
      [];
    if (showEvm) {
      chips.push({
        family: "evm",
        Icon: activeEvmChainId ? getChainIcon(activeEvmChainId) : undefined,
        label:
          activeEvmChain?.name ??
          getChainInfo(activeEvmChainId)?.ticker ??
          "EVM",
      });
    }
    if (showSolana) {
      chips.push({
        family: "solana",
        Icon: SolanaIcon,
        label: activeSolanaNetwork
          ? formatSolanaBadge(activeSolanaNetwork)
          : "SVM",
      });
    }
    return chips;
  }, [showEvm, showSolana, activeEvmChain, activeEvmChainId, activeSolanaNetwork]);

  const showGroupHeaders = sections.length > 1;
  const visibleTargetCount = sections.reduce(
    (total, section) => total + section.rows.length,
    0,
  );

  if (visibleTargetCount <= 1) {
    return null;
  }

  const applyTarget = async (target: AomiNetworkTarget) => {
    if (!canActivateWallet()) return;
    if (adapter.selectNetwork) {
      await adapter.selectNetwork(target);
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
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            role="combobox"
            aria-expanded={open}
            disabled={!adapter.selectNetwork}
            className={cn(
              "h-8 w-auto min-w-0 justify-between gap-px rounded-full px-0.5 text-xs md:min-w-[80px] md:gap-1.5 md:px-3",
              // Keep text + brand marks muted on hover (the marks inherit
              // currentColor, so hover:text-accent-foreground turned solid
              // logos like Base near-black); only the background highlights.
              "text-muted-foreground hover:bg-accent",
              !adapter.selectNetwork && "cursor-not-allowed opacity-50",
              className,
            )}
          >
            <span className="flex min-w-0 items-center gap-1.5">
              {triggerChips.length === 0 ? (
                <span className="truncate">Network</span>
              ) : (
                triggerChips.map((chip, index) => (
                  <Fragment key={chip.family}>
                    {index > 0 && (
                      <span
                        className="text-muted-foreground/40"
                        aria-hidden="true"
                      >
                        /
                      </span>
                    )}
                    {chip.Icon && (
                      <chip.Icon className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span className="truncate">{chip.label}</span>
                  </Fragment>
                ))
              )}
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
          {sections.map((section) => (
            <div key={section.family} className="flex flex-col gap-0.5">
              {showGroupHeaders && (
                <div className="text-muted-foreground px-2 pb-0.5 pt-1.5 text-[10px] font-medium uppercase tracking-wide first:pt-0.5">
                  {familyLabel(section.family)}
                </div>
              )}
              {section.rows.map((row) => (
                <button
                  key={row.key}
                  type="button"
                  onClick={() => void handleTargetSelect(row.target)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm outline-none transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus-visible:bg-accent focus-visible:text-accent-foreground",
                    row.isActive && "bg-accent",
                  )}
                >
                  <span
                    className={cn(
                      "bg-muted text-muted-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-medium uppercase",
                      row.isActive && "bg-primary/10 text-primary",
                    )}
                  >
                    {row.Icon ? (
                      <row.Icon className="h-4 w-4" />
                    ) : (
                      row.fallback
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{row.title}</span>
                  {row.isActive && (
                    <CheckIcon className="text-primary h-4 w-4 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          ))}
        </PopoverContent>
      </Popover>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Switch SVM network?</DialogTitle>
            <DialogDescription>
              This SVM wallet needs to reconnect to change clusters. Your
              current chat and EVM wallet stay connected.
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
