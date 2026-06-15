"use client";

import type { ReactNode } from "react";
import type { Chain, Transport } from "viem";
import type { CreateConnectorFn } from "wagmi";
import type {
  AuthProviderId,
  AomiAccountCredential,
  SvmNetworkOption,
} from "../types";
import type {
  EvmWalletId,
  EvmWalletPreset,
  SvmWalletId,
  SvmWalletPreset,
} from "../catalog/wallet-ids";

export type AuthMethodId =
  | "google"
  | "apple"
  | "x"
  | "discord"
  | "github"
  | "farcaster"
  | "telegram"
  | "email"
  | "phone"
  | "passkey"
  | "wallet";

export type ProvidersConfig = {
  para?:
    | {
        apiKey?: string;
        environment?: "PROD" | "BETA";
        appName?: string;
        appDescription?: string;
        appUrl?: string;
      }
    | false;
  privy?:
    | {
        appId?: string;
        appName?: string;
        appLogoUrl?: string;
      }
    | false;
};

export type AomiSession = {
  provider: AuthProviderId;
  subject?: string;
  credential?: AomiAccountCredential;
};

export type AuthConfig =
  | { provider: "para"; methods?: readonly AuthMethodId[] }
  | { provider: "privy"; methods?: readonly AuthMethodId[] }
  | {
      provider: "custom";
      getSession: () => Promise<AomiSession | null>;
      login: () => Promise<void>;
      logout: () => Promise<void>;
    }
  | false;

export type EvmWalletsConfig = {
  chains?: readonly [Chain, ...Chain[]];
  preset?: EvmWalletPreset;
  wallets?: readonly EvmWalletId[];
  connectors?: readonly CreateConnectorFn[];
  walletConnectProjectId?: string;
  coinbase?: boolean;
  appName?: string;
  appLogoUrl?: string | null;
  transports?: Record<number, Transport>;
};

export type SvmWalletsConfig = {
  preset?: SvmWalletPreset;
  wallets?: readonly SvmWalletId[];
  networks?: readonly SvmNetworkOption[];
  preferDirectSend?: boolean;
};

export type EmbeddedConfig = { provider: "para" | "privy" | "aomi" } | false;

export type WalletsConfig = {
  evm?: EvmWalletsConfig | false;
  solana?: SvmWalletsConfig | false;
  embedded?: EmbeddedConfig;
};

export type ExecutionConfig = {
  aa?: "off" | "optional" | "required";
  modes?: ReadonlyArray<"4337" | "7702">;
  owner?: "auto" | "external-wallet" | "provider-session";
};

export type AccountConfig =
  | { mode: "disabled" }
  | { mode: "aomi-backend"; baseUrl?: string };

export type AppWalletRequirements = {
  evm?: boolean;
  solana?: boolean;
};

export type AomiWalletKitProviderProps = {
  preset?: "para" | "privy" | "wallets-only";
  providers?: ProvidersConfig;
  auth?: AuthConfig;
  wallets?: WalletsConfig;
  execution?: ExecutionConfig;
  account?: AccountConfig;
  requirements?: AppWalletRequirements;
  children: ReactNode;
};

export type AomiWalletKitProviderInput =
  | AomiWalletKitProviderProps
  | {
      auth: {
        provider: "para";
        apiKey?: string;
        environment?: "PROD" | "BETA";
        methods?: readonly AuthMethodId[];
        appName?: string;
        appDescription?: string;
      };
      children: ReactNode;
    }
  | {
      auth: {
        provider: "privy";
        appId?: string;
        methods?: readonly AuthMethodId[];
        appName?: string;
      };
      children: ReactNode;
    };
