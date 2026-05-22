"use client";

import { useEffect, type FC } from "react";
import { cn } from "@aomi-labs/react";
import { useAomiAuthAdapter } from "../../lib/aomi-auth-adapter";
import { WalletFamilySlot } from "./wallet-family-slot";
import { Badge } from "../ui/badge";

export type DualWalletBarProps = {
  families: Array<"evm" | "solana">;
  className?: string;
  onConnectionChange?: (connected: boolean) => void;
};

export const DualWalletBar: FC<DualWalletBarProps> = ({
  families,
  className,
  onConnectionChange,
}) => {
  const adapter = useAomiAuthAdapter();
  const identity = adapter.identity;

  const evmConnected = !!identity.address;
  const solanaConnected = !!identity.svmAddress;
  const connectedCount =
    (families.includes("evm") && evmConnected ? 1 : 0) +
    (families.includes("solana") && solanaConnected ? 1 : 0);
  const showBadge = connectedCount === 1;

  useEffect(() => {
    onConnectionChange?.(identity.isConnected);
  }, [identity.isConnected, onConnectionChange]);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {families.map((family) => (
        <WalletFamilySlot key={family} family={family} />
      ))}
      {showBadge && (
        <Badge
          variant="secondary"
          className="animate-in fade-in duration-300 text-xs mx-auto"
        >
          {connectedCount} of {families.length} wallets connected
        </Badge>
      )}
    </div>
  );
};
