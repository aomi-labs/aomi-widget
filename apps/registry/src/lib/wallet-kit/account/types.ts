"use client";

import type { WalletFamily } from "../types";

export type AccountRuntimeStatus = "disabled" | "loading" | "ready" | "error";

export type AomiUserRef = {
  id: string;
  displayName?: string;
  email?: string;
};

export type LinkedAuthAccount = {
  id: string;
  provider: string;
  subject: string;
  email?: string;
  linkedAt?: number;
};

export type AccountWallet = {
  id: string;
  family: WalletFamily;
  address: string;
  kind?: "external" | "embedded";
  provider?: string;
  linkedVia: "para" | "privy" | "challenge" | "import" | "observed" | (string & {});
  label?: string;
  verifiedAt?: number;
  capability?: "read" | "write";
};

export type AccountRuntime = {
  status: AccountRuntimeStatus;
  user?: AomiUserRef;
  linkedAccounts: LinkedAuthAccount[];
  wallets: AccountWallet[];
  refresh: () => Promise<void>;
  linkWallet?: (accountId: string) => Promise<void>;
  unlinkWallet?: (walletId: string) => Promise<void>;
};
