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

export type WalletPickerProvider = {
  id: string;
  label: string;
  description?: string;
  icon?: FC<SVGProps<SVGSVGElement>>;
  onSelect?: (adapter: AomiAuthAdapter) => void | Promise<void>;
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

const DEFAULT_WALLET_PROVIDERS: WalletPickerProvider[] = [
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
    disabled: true,
  },
];

export function WalletPickerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openPicker = useCallback(() => setOpen(true), []);
  const closePicker = useCallback(() => setOpen(false), []);

  const value = useMemo<WalletPickerContextValue>(
    () => ({
      open,
      isAvailable: true,
      openPicker,
      closePicker,
      providers: DEFAULT_WALLET_PROVIDERS,
    }),
    [open, openPicker, closePicker],
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

export function normalizeWalletProviderId(
  raw: string | undefined,
): string | undefined {
  if (!raw) return undefined;
  if (raw === "baseAccount") return "base-account";
  return raw;
}
