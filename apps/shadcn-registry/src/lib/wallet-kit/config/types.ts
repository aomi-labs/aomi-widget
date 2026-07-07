"use client";

import type { ReactNode } from "react";
import type { Chain, Transport } from "viem";
import type { CreateConnectorFn } from "wagmi";
import type { SponsorshipPaymasterServiceContext } from "@aomi-labs/react";
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
  [providerId: string]: unknown;
};

export type AomiSession = {
  provider: AuthProviderId;
  subject?: string;
  credential?: AomiAccountCredential;
};

export type AuthConfig =
  | {
      provider: AuthProviderId;
      methods?: readonly AuthMethodId[];
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

export type WalletsConfig = {
  evm?: EvmWalletsConfig | false;
  solana?: SvmWalletsConfig | false;
};

export type ExecutionConfig = {
  aa?: "off" | "optional" | "required";
  provider?: "auto" | "alchemy" | "pimlico";
  modes?: ReadonlyArray<"4337" | "7702">;
  owner?: "auto" | "external-wallet" | "provider-session";
  sponsorship?:
    | { mode?: "disabled" }
    | {
        mode: "optional";
        paymasterServiceContext?:
          | SponsorshipPaymasterServiceContext
          | ((
              chainId: number,
            ) => SponsorshipPaymasterServiceContext | undefined);
        paymasterServiceUrl?:
          | string
          | ((chainId: number) => string | undefined);
        sendCallsTimeoutMs?: number;
        sendCallsVersion?: string;
      }
    | {
        mode: "required";
        paymasterServiceContext?:
          | SponsorshipPaymasterServiceContext
          | ((
              chainId: number,
            ) => SponsorshipPaymasterServiceContext | undefined);
        paymasterServiceUrl?:
          | string
          | ((chainId: number) => string | undefined);
        sendCallsTimeoutMs?: number;
        sendCallsVersion?: string;
      };
};

export type AccountConfig =
  | false
  | { mode: "disabled" }
  | {
      mode: "aomi-backend";
      baseUrl?: string;
      authDomain?: string;
      authUri?: string;
    };

export type AomiWalletKitProviderProps = {
  preset?: "para" | "privy" | "wallets-only" | (string & {});
  providers?: ProvidersConfig;
  auth?: AuthConfig;
  wallets?: WalletsConfig;
  execution?: ExecutionConfig;
  account?: AccountConfig;
  children?: ReactNode;
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
