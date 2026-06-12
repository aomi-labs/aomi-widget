"use client";

import { canonicalWalletKey } from "../../runtime/evm/brands";
import type { AomiAccount } from "../../types";

export function isParaEmbeddedAccount(account: AomiAccount): boolean {
  return canonicalWalletKey(account.walletName ?? "") === "para";
}
