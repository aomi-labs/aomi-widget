"use client";

import type { ReactNode, FC } from "react";
import { cn } from "@aomi-labs/react";
import { NetworkSelect } from "./network-select";
import { ModelSelect } from "./model-select";
import { AppSelect } from "./app-select";
import { ApiKeyInput } from "./api-key-input";
import { WalletConnect } from "./wallet-connect";

// =============================================================================
// Types
// =============================================================================

export type ControlBarProps = {
  className?: string;
  /** Custom controls to render alongside built-in ones */
  children?: ReactNode;
  /** Hide the model selector */
  hideModel?: boolean;
  /** Hide the App selector */
  hideApp?: boolean;
  /** Hide the API key input */
  hideApiKey?: boolean;
  /** Hide the wallet connect button (default: true) */
  hideWallet?: boolean;
  /** Hide the network selector (default: false) */
  hideNetwork?: boolean;
};

// =============================================================================
// Main Component
// =============================================================================

export const ControlBar: FC<ControlBarProps> = ({
  className,
  children,
  hideModel = false,
  hideApp = false,
  hideApiKey = false,
  hideWallet = true,
  hideNetwork = false,
}) => {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {!hideNetwork && <NetworkSelect />}
      {!hideModel && <ModelSelect />}
      {!hideApp && <AppSelect />}
      {!hideWallet && <WalletConnect />}
      {children}
      {!hideApiKey && <ApiKeyInput />}
    </div>
  );
};

// =============================================================================
// Re-exports for granular usage
// =============================================================================

export { ModelSelect, type ModelSelectProps } from "./model-select";
export { AppSelect, type AppSelectProps } from "./app-select";
export { ApiKeyInput, type ApiKeyInputProps } from "./api-key-input";
export { WalletConnect, type WalletConnectProps } from "./wallet-connect";
export { NetworkSelect, type NetworkSelectProps } from "./network-select";
