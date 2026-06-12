import type { FC, SVGProps } from "react";
import { canonicalWalletKey } from "../../lib/aomi-auth-adapter/runtime/evm/brands";
import {
  BaseWalletIcon,
  CoinbaseWalletIcon,
  MetaMaskIcon,
  PhantomIcon,
  RabbyIcon,
  RainbowIcon,
  WalletConnectIcon,
} from "./wallets";
// Reuse the brand mark already defined for the apps list so Para has a single
// source of truth rather than a duplicate hand-drawn glyph.
import { ParaIcon } from "./apps";

// Keyed by `canonicalWalletKey` output so brand matching lives in one place.
const WALLET_ICONS: Record<string, FC<SVGProps<SVGSVGElement>>> = {
  base: BaseWalletIcon,
  basewallet: BaseWalletIcon,
  coinbase: CoinbaseWalletIcon,
  metamask: MetaMaskIcon,
  para: ParaIcon,
  phantom: PhantomIcon,
  rabby: RabbyIcon,
  rainbow: RainbowIcon,
  walletconnect: WalletConnectIcon,
};

/**
 * Get the icon component for a wallet label or connector id.
 * Returns undefined for unknown wallets.
 */
export function getWalletIcon(
  walletIdOrLabel: string,
): FC<SVGProps<SVGSVGElement>> | undefined {
  return WALLET_ICONS[canonicalWalletKey(walletIdOrLabel)];
}
