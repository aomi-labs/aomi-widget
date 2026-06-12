"use client";

import type { AomiAccount } from "../types";

export type WalletRowAction =
  | { kind: "select"; label: string }
  | { kind: "connect"; label: string }
  | { kind: "authenticate"; label: string }
  | { kind: "disconnect"; label: string }
  | { kind: "manage"; label: string }
  | { kind: "link"; label: string }
  | { kind: "unlink"; label: string };

export type WalletModalRow = {
  id: string;
  family: AomiAccount["family"];
  address?: string;
  label: string;
  walletName?: string;
  source: "live" | "embedded" | "stored" | "option";
  status: "active" | "connected" | "stored" | "available" | "unavailable";
  provider?: string;
  linked?: boolean;
  capability?: "read" | "write";
  actions: WalletRowAction[];
};

export function mergeWalletRows(
  accounts: readonly AomiAccount[],
): WalletModalRow[] {
  return accounts.map((account) => ({
    id: account.id,
    family: account.family,
    address: account.address,
    label: account.label ?? account.walletName ?? account.address,
    walletName: account.walletName,
    source: "live",
    status: account.active ? "active" : "connected",
    linked: account.linked,
    actions: [
      account.active
        ? { kind: "disconnect", label: "Disconnect" }
        : { kind: "select", label: "Select" },
    ],
  }));
}
