import { megaeth } from '@aomi-labs/client';
import { mainnet, arbitrum, optimism, polygon, base } from 'wagmi/chains';
import type { Chain } from 'viem';

export const SUPPORTED_CHAINS = [mainnet, arbitrum, optimism, polygon, base, megaeth] as const;

export const CHAIN_BY_ID: Record<number, Chain> = {
  [mainnet.id]: mainnet,
  [arbitrum.id]: arbitrum,
  [optimism.id]: optimism,
  [polygon.id]: polygon,
  [base.id]: base,
  [megaeth.id]: megaeth,
};

export const CHAIN_SLUG_BY_ID: Record<number, string> = {
  [mainnet.id]: 'ethereum',
  [arbitrum.id]: 'arbitrum',
  [optimism.id]: 'optimism',
  [polygon.id]: 'polygon',
  [base.id]: 'base',
  [megaeth.id]: 'megaeth',
};
