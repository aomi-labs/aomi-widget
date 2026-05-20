"use client";

import type { ReactNode } from "react";
import { useClient as useParaClient } from "@getpara/react-sdk";
import {
  ParaSolanaProvider,
  phantomWallet,
  solflareWallet,
  backpackWallet,
  glowWallet,
  type ParaSolanaProviderConfig,
  type WalletList as SolanaWalletList,
} from "@getpara/solana-wallet-connectors";
import { Chain as SolanaMobileChain } from "@solana-mobile/mobile-wallet-adapter-protocol";
import { useWallet as useSolanaWallet } from "@solana/wallet-adapter-react";
import {
  Connection as SolanaConnection,
  Transaction as SolanaTransaction,
  VersionedTransaction,
} from "@solana/web3.js";
import type {
  WalletSolanaSignMessagePayload,
  WalletSolanaSignPayload,
} from "@aomi-labs/react";
import type { SolanaCluster, SolanaNetworkOption } from "../types";
import {
  DEFAULT_SOLANA_CLUSTER,
  DEFAULT_SOLANA_RPC_HTTP_URLS,
  normalizeSolanaNetworkOptions,
  resolveSelectedSolanaNetwork,
} from "../solana-networks";

export type ParaSolanaOptions = {
  enabled?: boolean;
  networks?: readonly SolanaNetworkOption[];
  cluster?: SolanaCluster;
  rpcHttpUrl?: string;
  rpcWsUrl?: string;
  wallets?: SolanaWalletList;
  mobileChain?: SolanaMobileChain;
  preferDirectSend?: boolean;
};

export type ResolvedSolanaConfig = {
  enabled: boolean;
  networks: readonly SolanaNetworkOption[];
  activeNetwork: SolanaNetworkOption;
  cluster: SolanaCluster;
  rpcHttpUrl: string;
  rpcWsUrl?: string;
  wallets: SolanaWalletList;
  mobileChain: SolanaMobileChain;
  preferDirectSend: boolean;
};

export type SafeSolanaWalletState = {
  publicKey: string | undefined;
  connected: boolean;
  connecting: boolean;
  disconnecting: boolean;
  walletName: string | undefined;
  wallets: Array<{
    adapter: {
      name: string;
      readyState: SolanaWalletReadyState;
    };
    readyState: SolanaWalletReadyState;
  }>;
  select: ((walletName: SolanaWalletName) => void) | undefined;
  connect: (() => Promise<void>) | undefined;
  disconnect: (() => Promise<void>) | undefined;
  signTransaction:
    | ((
        tx: VersionedTransaction | SolanaTransaction,
      ) => Promise<VersionedTransaction | SolanaTransaction>)
    | undefined;
  signAllTransactions:
    | ((
        txs: Array<VersionedTransaction | SolanaTransaction>,
      ) => Promise<Array<VersionedTransaction | SolanaTransaction>>)
    | undefined;
  signMessage: ((message: Uint8Array) => Promise<Uint8Array>) | undefined;
  sendTransaction:
    | ((
        tx: VersionedTransaction | SolanaTransaction,
        connection: SolanaConnection,
      ) => Promise<string>)
    | undefined;
};

export const DEFAULT_SOLANA_ENDPOINT =
  DEFAULT_SOLANA_RPC_HTTP_URLS[DEFAULT_SOLANA_CLUSTER];
export const DEFAULT_SOLANA_WALLETS: SolanaWalletList = [
  phantomWallet,
  solflareWallet,
  backpackWallet,
  glowWallet,
];

type SolanaWalletReadyState =
  | "Installed"
  | "NotDetected"
  | "Loadable"
  | "Unsupported";
type SolanaWalletName = Parameters<
  ReturnType<typeof useSolanaWallet>["select"]
>[0];

export function useSafeSolanaWallet(): SafeSolanaWalletState {
  try {
    const wallet = useSolanaWallet();
    return {
      publicKey: wallet.publicKey?.toBase58(),
      connected: wallet.connected,
      connecting: wallet.connecting,
      disconnecting: wallet.disconnecting,
      walletName: wallet.wallet?.adapter?.name,
      wallets: wallet.wallets,
      select: wallet.select,
      connect: wallet.connect,
      disconnect: wallet.disconnect,
      signTransaction: wallet.signTransaction,
      signAllTransactions: wallet.signAllTransactions,
      signMessage: wallet.signMessage,
      sendTransaction: wallet.sendTransaction,
    };
  } catch {
    return {
      publicKey: undefined,
      connected: false,
      connecting: false,
      disconnecting: false,
      walletName: undefined,
      wallets: [],
      select: undefined,
      connect: undefined,
      disconnect: undefined,
      signTransaction: undefined,
      signAllTransactions: undefined,
      signMessage: undefined,
      sendTransaction: undefined,
    };
  }
}

function decodeBase64(value: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(value, "base64"));
  }
  const bin = atob(value);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function encodeBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function deserializeSolanaTransaction(
  bytes: Uint8Array,
): VersionedTransaction | SolanaTransaction {
  try {
    return VersionedTransaction.deserialize(bytes);
  } catch {
    return SolanaTransaction.from(bytes);
  }
}

export function detectSolanaTransport(
  walletName: string | undefined,
): "extension" | "embedded" | "mwa" {
  const normalized = walletName?.toLowerCase() ?? "";
  if (
    normalized.includes("mobile wallet adapter") ||
    normalized.includes("solana mobile") ||
    normalized.includes("mwa")
  ) {
    return "mwa";
  }
  return "extension";
}

export function resolveParaSolanaConfig(
  solana?: ParaSolanaOptions,
  selectedNetworkId?: string,
): ResolvedSolanaConfig {
  const networks = normalizeSolanaNetworkOptions(solana);
  const activeNetwork = resolveSelectedSolanaNetwork(
    networks,
    selectedNetworkId,
  );
  const cluster = activeNetwork.cluster;
  return {
    enabled: solana?.enabled ?? true,
    networks,
    activeNetwork,
    cluster,
    rpcHttpUrl: activeNetwork.rpcHttpUrl,
    rpcWsUrl: activeNetwork.rpcWsUrl,
    wallets: solana?.wallets ?? DEFAULT_SOLANA_WALLETS,
    mobileChain: solana?.mobileChain ?? (cluster as SolanaMobileChain),
    preferDirectSend: solana?.preferDirectSend ?? true,
  };
}

function isUsableWalletReadyState(readyState: SolanaWalletReadyState): boolean {
  return readyState === "Installed" || readyState === "Loadable";
}

function walletPriority(name: string): number {
  const normalized = name.toLowerCase();
  if (normalized.includes("phantom")) return 0;
  if (normalized.includes("solflare")) return 1;
  if (normalized.includes("backpack")) return 2;
  if (normalized.includes("glow")) return 3;
  return 10;
}

function pickPreferredSolanaWallet(wallet: SafeSolanaWalletState) {
  return [...wallet.wallets]
    .filter((candidate) => isUsableWalletReadyState(candidate.readyState))
    .sort((left, right) => {
      const installedDelta =
        Number(left.readyState === "Installed") -
        Number(right.readyState === "Installed");
      if (installedDelta !== 0) {
        return -installedDelta;
      }
      return (
        walletPriority(left.adapter.name) - walletPriority(right.adapter.name)
      );
    })[0];
}

export async function connectPreferredSolanaWallet(
  wallet: SafeSolanaWalletState,
): Promise<"connected" | "selecting" | "unavailable"> {
  if (wallet.publicKey || wallet.connected) {
    return "connected";
  }

  if (!wallet.select || !wallet.connect) {
    return "unavailable";
  }

  if (wallet.walletName) {
    await wallet.connect();
    return "connected";
  }

  const selectedWallet = pickPreferredSolanaWallet(wallet);
  if (!selectedWallet) {
    return "unavailable";
  }

  wallet.select(selectedWallet.adapter.name as SolanaWalletName);
  return "selecting";
}

export function getSolanaCapabilitySnapshot(wallet: SafeSolanaWalletState) {
  if (!wallet.publicKey) {
    return undefined;
  }
  return {
    canSignMessage: Boolean(wallet.signMessage),
    canSignTransaction: Boolean(wallet.signTransaction),
    canSignAllTransactions: Boolean(wallet.signAllTransactions),
    canSendTransaction: Boolean(wallet.sendTransaction),
    canSignAndSendTransaction: Boolean(wallet.sendTransaction),
  };
}

export function buildParaSolanaMethods(
  wallet: SafeSolanaWalletState,
  config: Pick<
    ResolvedSolanaConfig,
    "rpcHttpUrl" | "rpcWsUrl" | "preferDirectSend"
  >,
): {
  signSolanaTransaction?: (
    payload: WalletSolanaSignPayload,
  ) => Promise<{ signedTx: string }>;
  signSolanaMessage?: (
    payload: WalletSolanaSignMessagePayload,
  ) => Promise<{ signature: string }>;
  sendSolanaTransaction?: (
    payload: WalletSolanaSignPayload,
  ) => Promise<{ signature: string; signedTx?: string }>;
  signAndSendSolanaTransaction?: (
    payload: WalletSolanaSignPayload,
  ) => Promise<{ signature: string; signedTx?: string }>;
  solanaRpcHttpUrl: string;
  solanaRpcWsUrl?: string;
} {
  const signTransaction = wallet.signTransaction;
  const signMessage = wallet.signMessage;
  const sendTransaction = wallet.sendTransaction;

  return {
    signSolanaTransaction: signTransaction
      ? async (payload: WalletSolanaSignPayload) => {
          if (!payload.unsignedTx) {
            throw new Error("Missing unsigned_tx payload");
          }
          const tx = deserializeSolanaTransaction(
            decodeBase64(payload.unsignedTx),
          );
          const signed = await signTransaction(tx);
          return { signedTx: encodeBase64(signed.serialize()) };
        }
      : undefined,
    signSolanaMessage: signMessage
      ? async (payload: WalletSolanaSignMessagePayload) => {
          if (!payload.message) {
            throw new Error("Missing message payload");
          }
          const signature = await signMessage(decodeBase64(payload.message));
          return { signature: encodeBase64(signature) };
        }
      : undefined,
    sendSolanaTransaction: sendTransaction
      ? async (payload: WalletSolanaSignPayload) => {
          if (!payload.unsignedTx) {
            throw new Error("Missing unsigned_tx payload");
          }
          const connection = new SolanaConnection(
            config.rpcHttpUrl,
            "confirmed",
          );
          const signature = await sendTransaction(
            deserializeSolanaTransaction(decodeBase64(payload.unsignedTx)),
            connection,
          );
          return { signature };
        }
      : undefined,
    signAndSendSolanaTransaction:
      sendTransaction && config.preferDirectSend
        ? async (payload: WalletSolanaSignPayload) => {
            if (!payload.unsignedTx) {
              throw new Error("Missing unsigned_tx payload");
            }
            const connection = new SolanaConnection(
              config.rpcHttpUrl,
              "confirmed",
            );
            const signature = await sendTransaction(
              deserializeSolanaTransaction(decodeBase64(payload.unsignedTx)),
              connection,
            );
            return { signature };
          }
        : undefined,
    solanaRpcHttpUrl: config.rpcHttpUrl,
    solanaRpcWsUrl: config.rpcWsUrl,
  };
}

export function ParaSolanaWrapper({
  enabled,
  config,
  children,
}: {
  enabled: boolean;
  config: ParaSolanaProviderConfig;
  children: (solanaReady: boolean) => ReactNode;
}) {
  let para: unknown;
  try {
    para = useParaClient() ?? null;
  } catch {
    para = null;
  }
  if (!enabled || !para) {
    return <>{children(false)}</>;
  }
  return (
    <ParaSolanaProvider
      config={config}
      internalConfig={{
        para: para as never,
        walletsWithFullAuth: "ALL",
      }}
    >
      {children(true)}
    </ParaSolanaProvider>
  );
}
