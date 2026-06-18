"use client";

import type { WalletFamily } from "../types";

export type AccountRuntimeStatus = "disabled" | "loading" | "ready" | "error";

export type AomiUserRef = {
  id: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
};

export type LinkedAuthAccount = {
  id: string;
  provider: string;
  subject: string;
  email?: string;
  emailVerified?: boolean;
  displayLabel?: string;
  linkedAt?: number;
  lastSeenAt?: number;
};

export type AccountWallet = {
  id: string;
  family: WalletFamily;
  address: string;
  kind?: "external" | "embedded" | "smart_account";
  provider?: string;
  providerWalletId?: string;
  chainScope?: string;
  chainId?: number;
  linkedVia:
    | "siwe"
    | "siws"
    | "para"
    | "privy"
    | "challenge"
    | "import"
    | "observed"
    | "migration"
    | (string & {});
  label?: string;
  verifiedAt?: number;
  lastSeenAt?: number;
  capability?: "read" | "write";
};

export type LinkWalletInput = {
  accountId?: string;
  family: WalletFamily;
  address: string;
  chainId?: number;
};

export type UpdateWalletInput = {
  walletId: string;
  label?: string | null;
};

export type UpdateAccountInput = {
  displayName?: string | null;
  avatarUrl?: string | null;
};

export type AccountConfirmation = {
  severity: "yellow" | "red";
  title: string;
  message: string;
  confirmLabel: string;
  otherAccountWillClose?: boolean;
  confirm: () => Promise<void>;
  dismiss: () => void;
};

export type AccountRuntime = {
  status: AccountRuntimeStatus;
  user?: AomiUserRef;
  linkedAccounts: LinkedAuthAccount[];
  wallets: AccountWallet[];
  pendingConfirmation?: AccountConfirmation;
  refresh: () => Promise<void>;
  signOut?: () => Promise<void>;
  updateAccount?: (input: UpdateAccountInput) => Promise<void>;
  linkWallet?: (input: LinkWalletInput) => Promise<void>;
  updateWallet?: (input: UpdateWalletInput) => Promise<void>;
  unlinkWallet?: (walletId: string) => Promise<void>;
  unlinkAuthIdentity?: (identityId: string) => Promise<void>;
};
