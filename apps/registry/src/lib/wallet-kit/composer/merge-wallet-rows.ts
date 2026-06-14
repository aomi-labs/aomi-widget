"use client";

import type { AomiAccount } from "../types";
import type { AccountWallet } from "../account/types";
import type { AuthRuntime } from "./types";

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

export function mergeWalletRows({
  accounts,
  storedWallets = [],
  auth,
}: {
  accounts: readonly AomiAccount[];
  storedWallets?: readonly AccountWallet[];
  auth?: Pick<AuthRuntime, "provider" | "status">;
}): WalletModalRow[] {
  const rows: WalletModalRow[] = accounts.map((account) => {
    const stored = storedWallets.find(
      (wallet) =>
        wallet.family === account.family &&
        wallet.address.toLowerCase() === account.address.toLowerCase(),
    );
    return {
      id: account.id,
      family: account.family,
      address: account.address,
      label: account.label ?? account.walletName ?? account.address,
      walletName: account.walletName,
      source: "live" as const,
      status: account.active ? ("active" as const) : ("connected" as const),
      provider: stored?.provider,
      linked: account.linked ?? Boolean(stored),
      capability: account.capability ?? stored?.capability,
      actions: [
        account.active
          ? { kind: "disconnect", label: "Disconnect" }
          : { kind: "select", label: "Select" },
      ],
    };
  });

  const liveKeys = new Set(
    accounts.map((account) => walletKey(account.family, account.address)),
  );
  for (const wallet of storedWallets) {
    if (liveKeys.has(walletKey(wallet.family, wallet.address))) continue;
    const embeddedSignedOut =
      wallet.kind === "embedded" &&
      wallet.provider === auth?.provider &&
      auth?.status !== "authenticated";
    rows.push({
      id: wallet.id,
      family: wallet.family,
      address: wallet.address,
      label: wallet.label ?? wallet.address,
      source: "stored",
      status: "stored",
      provider: wallet.provider,
      linked: true,
      capability: wallet.capability,
      actions: [
        embeddedSignedOut
          ? { kind: "authenticate", label: "Sign in" }
          : { kind: "connect", label: "Connect" },
      ],
    });
  }

  return rows;
}

function walletKey(family: AomiAccount["family"], address: string): string {
  return `${family}:${address.toLowerCase()}`;
}
