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
import { ParaIcon } from "@/components/icons";
import type { AomiAuthAdapter } from "../../lib/auth-adapter";

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
];

export function normalizeWalletProviderId(value?: string): string | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (normalized.includes("para")) return "para";
  return normalized;
}

export function WalletPickerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openPicker = useCallback(() => setOpen(true), []);
  const closePicker = useCallback(() => setOpen(false), []);

  const value = useMemo<WalletPickerContextValue>(
    () => ({
      open,
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
  const context = useContext(WalletPickerContext);
  if (!context) {
    throw new Error("useWalletPicker must be used within WalletPickerProvider");
  }
  return context;
}
