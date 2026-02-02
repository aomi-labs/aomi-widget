"use client";

import type { ReactNode, FC } from "react";
import { cn } from "@aomi-labs/react";
import { ModelSelect } from "./model-select";
import { NamespaceSelect } from "./namespace-select";
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
  /** Hide the namespace/agent selector */
  hideNamespace?: boolean;
  /** Hide the API key input */
  hideApiKey?: boolean;
  /** Hide the wallet connect button (default: true) */
  hideWallet?: boolean;
};

// =============================================================================
// Main Component
// =============================================================================

export const ControlBar: FC<ControlBarProps> = ({
  className,
  children,
  hideModel = false,
  hideNamespace = false,
  hideApiKey = false,
  hideWallet = true,
}) => {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {!hideModel && <ModelSelect />}
      {!hideNamespace && <NamespaceSelect />}
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
export { NamespaceSelect, type NamespaceSelectProps } from "./namespace-select";
export { ApiKeyInput, type ApiKeyInputProps } from "./api-key-input";
export { WalletConnect, type WalletConnectProps } from "./wallet-connect";
