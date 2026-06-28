import type { FC, SVGProps } from "react";
import {
  ArbitrumIcon,
  BaseIcon,
  EthereumIcon,
  LineaIcon,
  MonadIcon,
  OptimismIcon,
  PolygonIcon,
  SepoliaIcon,
} from "./chains";

const CHAIN_ICONS: Record<number, FC<SVGProps<SVGSVGElement>>> = {
  1: EthereumIcon,
  137: PolygonIcon,
  42161: ArbitrumIcon,
  8453: BaseIcon,
  10: OptimismIcon,
  11155111: SepoliaIcon,
  59144: LineaIcon,
  59141: LineaIcon,
  143: MonadIcon,
  10143: MonadIcon,
};

/**
 * Get the icon component for a chain ID.
 * Returns undefined for unknown chains.
 */
export function getChainIcon(
  chainId: number,
): FC<SVGProps<SVGSVGElement>> | undefined {
  return CHAIN_ICONS[chainId];
}
