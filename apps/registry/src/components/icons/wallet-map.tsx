import type { FC, SVGProps } from "react";
import {
  BaseWalletIcon,
  CoinbaseWalletIcon,
  MetaMaskIcon,
  RabbyIcon,
  RainbowIcon,
  WalletConnectIcon,
} from "./wallets";

const WALLET_ICONS: Record<string, FC<SVGProps<SVGSVGElement>>> = {
  base: BaseWalletIcon,
  baseaccount: BaseWalletIcon,
  coinbase: CoinbaseWalletIcon,
  coinbasewallet: CoinbaseWalletIcon,
  metamask: MetaMaskIcon,
  rabby: RabbyIcon,
  rabbywallet: RabbyIcon,
  rainbow: RainbowIcon,
  rainbowwallet: RainbowIcon,
  walletconnect: WalletConnectIcon,
};

function normalizeWalletIconKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/**
 * Get the icon component for a wallet label or connector id.
 * Returns undefined for unknown wallets.
 */
export function getWalletIcon(
  walletIdOrLabel: string,
): FC<SVGProps<SVGSVGElement>> | undefined {
  const key = normalizeWalletIconKey(walletIdOrLabel);

  if (key.includes("metamask")) return WALLET_ICONS.metamask;
  if (key.includes("rabby")) return WALLET_ICONS.rabby;
  if (key.includes("coinbase")) return WALLET_ICONS.coinbase;
  if (key.includes("rainbow")) return WALLET_ICONS.rainbow;
  if (key.includes("walletconnect")) return WALLET_ICONS.walletconnect;
  if (
    key.includes("baseaccount") ||
    key === "base" ||
    key.includes("basewallet")
  ) {
    return WALLET_ICONS.base;
  }

  return WALLET_ICONS[key];
}
