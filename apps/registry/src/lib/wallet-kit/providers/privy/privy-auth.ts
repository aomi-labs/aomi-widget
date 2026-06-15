"use client";

import {
  usePrivy,
  type PrivyClientConfig,
} from "@privy-io/react-auth";
import { useSolanaWallets } from "@privy-io/react-auth/solana";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import type { AomiLoginMethod } from "../../types";
import { toSocialLoginOption } from "../../runtime/evm/brands";

export type PrivyHook = ReturnType<typeof usePrivy>;
export type PrivyAccessTokenHook = PrivyHook & {
  getAccessToken?: () => Promise<string | null>;
};
export type SmartWalletsHook = ReturnType<typeof useSmartWallets>;
export type SolanaWalletsHook = ReturnType<typeof useSolanaWallets>;
export type PrivyUser = PrivyHook["user"];
export type PrivySolanaWallet = SolanaWalletsHook["wallets"][number];

const DISCONNECTED_PRIVY: PrivyAccessTokenHook = {
  ready: false,
  authenticated: false,
  user: null,
  login: async () => undefined,
  logout: async () => undefined,
  getAccessToken: async () => null,
} as unknown as PrivyAccessTokenHook;

const DISCONNECTED_SMART_WALLETS: SmartWalletsHook = {
  client: undefined,
  getClientForChain: async () => undefined,
} as unknown as SmartWalletsHook;

const DISCONNECTED_SOLANA_WALLETS: SolanaWalletsHook = {
  wallets: [],
  ready: false,
} as unknown as SolanaWalletsHook;

const AOMI_LOGIN_METHODS = new Set<AomiLoginMethod>([
  "google",
  "apple",
  "facebook",
  "x",
  "discord",
  "github",
  "farcaster",
  "telegram",
  "email",
  "phone",
  "wagmi",
  "passkey",
  "wallet",
]);

export function useSafePrivy(): PrivyAccessTokenHook {
  try {
    return usePrivy() as PrivyAccessTokenHook;
  } catch {
    return DISCONNECTED_PRIVY;
  }
}

export function useSafeSmartWallets(): SmartWalletsHook {
  try {
    return useSmartWallets();
  } catch {
    return DISCONNECTED_SMART_WALLETS;
  }
}

export function useSafeSvmWallets(): SolanaWalletsHook {
  try {
    return useSolanaWallets();
  } catch {
    return DISCONNECTED_SOLANA_WALLETS;
  }
}

function asAomiLoginMethod(
  value: string | undefined,
): AomiLoginMethod | undefined {
  return value && AOMI_LOGIN_METHODS.has(value as AomiLoginMethod)
    ? (value as AomiLoginMethod)
    : undefined;
}

export function inferPrivyAuthMethod(
  user: PrivyUser,
): AomiLoginMethod | undefined {
  if (!user) return undefined;
  const accountTypePriority: Array<[string, AomiLoginMethod]> = [
    ["google_oauth", "google"],
    ["github_oauth", "github"],
    ["apple_oauth", "apple"],
    ["discord_oauth", "discord"],
    ["twitter_oauth", "x"],
    ["telegram", "telegram"],
    ["farcaster", "farcaster"],
    ["email", "email"],
    ["phone", "phone"],
    ["wallet", "wagmi"],
  ];
  const linked = (user.linkedAccounts ?? []) as Array<{ type?: string }>;
  for (const [privyType, label] of accountTypePriority) {
    if (linked.some((acc) => acc?.type === privyType)) return label;
  }
  const first = linked[0]?.type;
  return asAomiLoginMethod(
    typeof first === "string" ? first.toLowerCase() : undefined,
  );
}

export function inferPrivyPrimaryLabel(user: PrivyUser): string | undefined {
  if (!user) return undefined;
  const u = user as unknown as {
    email?: { address?: string };
    google?: { email?: string };
    apple?: { email?: string };
    discord?: { username?: string };
    twitter?: { username?: string };
    github?: { username?: string };
    telegram?: { username?: string; firstName?: string };
    farcaster?: { username?: string; displayName?: string };
    phone?: { number?: string };
  };
  return (
    u.email?.address ??
    u.google?.email ??
    u.apple?.email ??
    u.discord?.username ??
    u.twitter?.username ??
    u.github?.username ??
    u.telegram?.username ??
    u.telegram?.firstName ??
    u.farcaster?.username ??
    u.farcaster?.displayName ??
    u.phone?.number ??
    undefined
  );
}

export function privyLoginMethodsToOptions(
  methods: PrivyClientConfig["loginMethods"] | undefined,
) {
  return (methods ?? [])
    .map((method) =>
      asAomiLoginMethod(method === "twitter" ? "x" : String(method)),
    )
    .filter((method): method is AomiLoginMethod => Boolean(method))
    .map(toSocialLoginOption);
}
