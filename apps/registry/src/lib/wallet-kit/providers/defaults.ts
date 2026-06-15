"use client";

import { registerAomiParaWalletProvider } from "./para";
import { registerAomiPrivyWalletProvider } from "./privy";

let registered = false;

export function registerDefaultWalletProviders(): void {
  if (registered) return;
  registered = true;
  registerAomiParaWalletProvider();
  registerAomiPrivyWalletProvider();
}
