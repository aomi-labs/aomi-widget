"use client";

import type { Chain } from "viem";
import type { Connector } from "wagmi";
import type { WalletEip712Payload, WalletTxPayload } from "@aomi-labs/react";
import type {
  AomiAccount,
  AomiAccountCredential,
  AomiAuthIdentity,
  AomiAuthMethod,
  AomiWalletOption,
  SolanaNetworkOption,
} from "../types";
import type { WalletRegistryStore } from "../registry/store";
import type { WalletRegistryState } from "../registry/types";
import type { EvmWalletRuntime } from "../runtime/evm/wallet-runtime";
import type { SafeSolanaWalletState } from "../runtime/solana/wallet-runtime";
import type {
  ResolveAAProviderState,
  WalletExecutionAdapterState,
} from "../wallet-execution";

export type AuthRuntimeStatus = "booting" | "authenticated" | "unauthenticated";

export type AuthRuntime = {
  provider: NonNullable<AomiAuthIdentity["walletProvider"]>;
  status: AuthRuntimeStatus;
  subject?: string;
  primaryLabel?: string;
  authMethod?: AomiAuthMethod;
  authValue?: string;
  methods: readonly AomiWalletOption[];
  canOpenModal: boolean;
  login?: (reason: string, step?: string) => Promise<void>;
  openAccountUI?: (reason: string, step?: string) => Promise<void>;
  startFlow?: (reason: string) => void;
  getCredential?: () => Promise<AomiAccountCredential | null>;
};

export type SolanaWalletRuntime = {
  wallet: SafeSolanaWalletState;
  config: {
    cluster: AomiAuthIdentity["solanaCluster"];
    rpcHttpUrl: string;
    rpcWsUrl?: string;
    preferDirectSend: boolean;
  };
  supportedNetworks: readonly SolanaNetworkOption[];
  selectedNetwork?: SolanaNetworkOption;
  setSelectedNetworkId: (networkId: string) => void;
};

export type EvmExecutionRuntime = {
  activeConnector?: Connector;
  capabilities?: WalletExecutionAdapterState["capabilities"];
  chainsById: Record<number, Chain>;
  currentChainId?: number;
  getWalletClientFor: EvmWalletRuntime["getWalletClientFor"];
  resolveAAProviderState?: (
    params: Parameters<ResolveAAProviderState>[0],
    context: {
      address?: string;
      walletClient: EvmWalletRuntime["walletClient"];
    },
  ) => ReturnType<ResolveAAProviderState>;
  sendCallsSyncAsync: EvmWalletRuntime["sendCallsSyncAsync"];
  sendTransactionAsync: EvmWalletRuntime["sendTransactionAsync"];
  shouldUseExternalSigner: boolean;
  signMessageAsync: EvmWalletRuntime["signMessageAsync"];
  signTypedDataAsync: EvmWalletRuntime["signTypedDataAsync"];
  switchChainAsync: EvmWalletRuntime["switchChainAsync"];
  walletClient: EvmWalletRuntime["walletClient"];
};

export type ExecutionRuntime = {
  evm: EvmExecutionRuntime;
  sponsorship: Pick<
    AomiAuthIdentity,
    "sponsored" | "sponsorProvider" | "sponsorAccount"
  >;
};

export type ComposerRegistryRuntime = {
  store: WalletRegistryStore;
  state: WalletRegistryState;
};

export type AccountTransform = (accounts: AomiAccount[]) => AomiAccount[];

export type EvmIdentityTransform = (
  identity: ReturnType<EvmWalletRuntime["selectEvmIdentity"]>,
) => ReturnType<EvmWalletRuntime["selectEvmIdentity"]>;

export type AomiAdapterComposerProps = {
  children: React.ReactNode;
  auth: AuthRuntime;
  evm: EvmWalletRuntime;
  solana?: SolanaWalletRuntime;
  execution: ExecutionRuntime;
  transformEvmIdentity?: EvmIdentityTransform;
  transformAccounts?: AccountTransform;
  canManageAccount?: (account: AomiAccount) => boolean;
  registry?: ComposerRegistryRuntime;
  supportedChains: readonly Chain[];
};

export type AdapterTxPayload = WalletTxPayload;
export type AdapterSignPayload = WalletEip712Payload;
