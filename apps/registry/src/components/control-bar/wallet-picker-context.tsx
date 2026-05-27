"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type FC,
  type ReactNode,
  type SVGProps,
} from "react";
import { BaseIcon, ParaIcon } from "@/components/icons";
import type { AomiAuthAdapter } from "../../lib/aomi-auth-adapter";

/**
 * A wallet option the user can pick from in the in-widget picker.
 * Consumers of the widget describe their supported providers here.
 */
export type WalletPickerProvider = {
  /** Stable id. Built-ins: "para" | "base-account". */
  id: string;
  /** Display label shown on the row. */
  label: string;
  /** Short, plain-text description rendered under the label when disconnected. */
  description?: string;
  /** Icon component (rendered colorless via `currentColor`). */
  icon?: FC<SVGProps<SVGSVGElement>>;
  /**
   * Custom action invoked when the user picks this provider. When omitted
   * the picker falls back to `adapter.connect()`. Returning a Promise keeps
   * the row in a loading state until it resolves.
   */
  onSelect?: (adapter: AomiAuthAdapter) => void | Promise<void>;
  /** Render the row as disabled. */
  disabled?: boolean;
};

export type WalletPickerContextValue = {
  open: boolean;
  isAvailable: boolean;
  openPicker: () => void;
  closePicker: () => void;
  providers: WalletPickerProvider[];
};

const WalletPickerContext = createContext<WalletPickerContextValue | null>(
  null,
);

export const DEFAULT_WALLET_PROVIDERS: WalletPickerProvider[] = [
  {
    id: "para",
    label: "Para",
    description: "Email, social, wallet",
    icon: ParaIcon,
  },
  {
    id: "base-account",
    label: "Base Account",
    description: "Smart wallet",
    icon: BaseIcon,
  },
];

export type WalletPickerProviderProps = {
  children: ReactNode;
  providers?: WalletPickerProvider[];
};

export function WalletPickerProvider({
  children,
  providers,
}: WalletPickerProviderProps) {
  const [open, setOpen] = useState(false);
  const openPicker = useCallback(() => setOpen(true), []);
  const closePicker = useCallback(() => setOpen(false), []);

  const resolvedProviders = useMemo(
    () =>
      providers && providers.length > 0 ? providers : DEFAULT_WALLET_PROVIDERS,
    [providers],
  );

  const value = useMemo<WalletPickerContextValue>(
    () => ({
      open,
      isAvailable: true,
      openPicker,
      closePicker,
      providers: resolvedProviders,
    }),
    [open, openPicker, closePicker, resolvedProviders],
  );

  return (
    <WalletPickerContext.Provider value={value}>
      {children}
    </WalletPickerContext.Provider>
  );
}

export function useWalletPicker(): WalletPickerContextValue {
  const ctx = useContext(WalletPickerContext);
  if (!ctx) {
    return {
      open: false,
      isAvailable: false,
      openPicker: () => undefined,
      closePicker: () => undefined,
      providers: DEFAULT_WALLET_PROVIDERS,
    };
  }
  return ctx;
}

/**
 * Normalises the auth-adapter's `walletProvider` field (camelCase / variant
 * spellings) to a picker-provider id.
 */
export function normalizeWalletProviderId(
  raw: string | undefined,
): string | undefined {
  if (!raw) return undefined;
  if (raw === "baseAccount") return "base-account";
  return raw;
}
