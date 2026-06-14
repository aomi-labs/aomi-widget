"use client";

import type { Chain } from "viem";
import type { Connector } from "wagmi";
import type { WalletEip712Payload, WalletTxPayload } from "@aomi-labs/react";
import type {
  AomiAccount,
  AomiAccountCredential,
  AomiSessionIdentity,
  AomiLoginMethod,
  AomiTxResult,
  AuthProviderId,
  AomiWalletOption,
  SvmNetworkOption,
} from "../types";
import type { EvmWalletRuntime } from "../runtime/evm/wallet-runtime";
import type { SafeSvmWalletState } from "../runtime/svm/wallet-runtime";
import type { buildSvmTransactionMethods } from "../runtime/svm/transactions";
import type { AccountRuntime } from "../account/types";
import type {
  ResolveAAProviderState,
  WalletExecutionKitState,
} from "../wallet-execution";

export type AuthRuntimeStatus = "booting" | "authenticated" | "unauthenticated";

export type AuthRuntime = {
  provider: AuthProviderId;
  status: AuthRuntimeStatus;
  subject?: string;
  primaryLabel?: string;
  authMethod?: AomiLoginMethod;
  authValue?: string;
  sessionProvider?: AomiSessionIdentity["sessionProvider"];
  embeddedProvider?: AomiSessionIdentity["embeddedProvider"];
  legacyWalletProvider?: AomiSessionIdentity["walletProvider"];
  providerLabel?: string;
  methods: readonly AomiWalletOption[];
  canOpenModal: boolean;
  login?: (reason: string, step?: string) => Promise<void>;
  openAccountUI?: (reason: string, step?: string) => Promise<void>;
  startFlow?: (reason: string) => void;
  getCredential?: () => Promise<AomiAccountCredential | null>;
};

export type SvmWalletRuntime = {
  wallet: SafeSvmWalletState;
  config: {
    cluster: AomiSessionIdentity["solanaCluster"];
    rpcHttpUrl: string;
    rpcWsUrl?: string;
    preferDirectSend: boolean;
  };
  supportedNetworks: readonly SvmNetworkOption[];
  selectedNetwork?: SvmNetworkOption;
  setSelectedNetworkId: (networkId: string) => void;
};

export type SolanaWalletRuntime = SvmWalletRuntime;

export type EvmExecutionRuntime = {
  sendTransaction?: (p: WalletTxPayload) => Promise<AomiTxResult>;
  signTypedData?: (p: WalletEip712Payload) => Promise<{ signature: string }>;
  signMessage?: (p: WalletEip712Payload) => Promise<{ signature: string }>;
  activeConnector?: Connector;
  capabilities?: WalletExecutionKitState["capabilities"];
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

export type SvmExecutionRuntime = ReturnType<typeof buildSvmTransactionMethods>;

export type ExecutionRuntime = {
  evm: EvmExecutionRuntime;
  svm?: SvmExecutionRuntime;
  sponsorship: Pick<
    AomiSessionIdentity,
    "sponsored" | "sponsorProvider" | "sponsorAccount"
  >;
};

export type AccountTransform = (accounts: AomiAccount[]) => AomiAccount[];

export type EvmIdentityTransform = (
  identity: ReturnType<EvmWalletRuntime["selectEvmIdentity"]>,
) => ReturnType<EvmWalletRuntime["selectEvmIdentity"]>;

export type AomiWalletKitComposerProps = {
  children: React.ReactNode;
  auth: AuthRuntime;
  evm: EvmWalletRuntime;
  svm?: SvmWalletRuntime;
  /** @deprecated use `svm` */
  solana?: SvmWalletRuntime;
  execution: ExecutionRuntime;
  account?: AccountRuntime;
  additionalEvmWalletOptions?: readonly AomiWalletOption[];
  transformEvmIdentity?: EvmIdentityTransform;
  transformAccounts?: AccountTransform;
  canManageAccount?: (account: AomiAccount) => boolean;
  supportedChains: readonly Chain[];
};

export type WalletKitTxPayload = WalletTxPayload;
export type WalletKitSignPayload = WalletEip712Payload;
