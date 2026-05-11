import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { SUPPORTED_CHAINS, type ChainInfo } from "@aomi-labs/react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Type definitions

export interface TextSectionProps {
  type: 'ascii' | 'intro-title' | 'intro-description' | 'h2-title' | 'paragraph' | 'ascii-sub' | 'headline';
  content: string;
  options?: Record<string, unknown>;
}

export interface BlogEntry {
  slug: string;
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  eyebrow?: string;
  publishedAt?: string;
  cta?: {
    label: string;
    href: string;
  };
  body?: string;
}

// Supported chains filtered by providers.toml (via NEXT_PUBLIC_SUPPORTED_CHAIN_IDS).
// If the env var is empty, all chains are available.

const envChainIds = process.env.NEXT_PUBLIC_SUPPORTED_CHAIN_IDS;

export const supportedChains: ChainInfo[] = envChainIds
  ? SUPPORTED_CHAINS.filter((c) =>
      new Set(envChainIds.split(",").map(Number)).has(c.id),
    )
  : SUPPORTED_CHAINS;
