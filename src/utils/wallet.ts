import { create } from 'zustand/react';

// ============================================
// Wallet State Store (Zustand)
// ============================================

type WalletButtonState = {
  address?: string;
  chainId?: number;
  isConnected: boolean;
  ensName?: string;
};

type WalletActions = {
  setWallet: (data: Partial<WalletButtonState>) => void;
};

/**
 * Shared wallet state store for components to read/write wallet connection status.
 * This store is wallet-agnostic - consumer apps populate it via their own wallet hooks.
 */
export const useWalletButtonState = create<WalletButtonState & WalletActions>((set) => ({
  address: undefined,
  chainId: undefined,
  isConnected: false,
  ensName: undefined,
  setWallet: (data) => set((prev) => ({ ...prev, ...data })),
}));
