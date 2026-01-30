"use client";

import type { FC } from "react";
import { WalletButton, cn } from "@aomi-labs/react";

export type WalletConnectProps = {
  className?: string;
};

export const WalletConnect: FC<WalletConnectProps> = ({ className }) => {
  return (
    <WalletButton
      className={cn(
        // Match Button component styles
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium",
        "ring-offset-background transition-colors",
        "focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        // Ghost variant
        "hover:bg-accent hover:text-accent-foreground",
        // Size
        "h-9 px-3",
        className,
      )}
    />
  );
};
