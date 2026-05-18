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

export type ParaSolanaOptions = {
  enabled?: boolean;
  cluster?: "solana:mainnet" | "solana:devnet" | "solana:testnet";
  rpcHttpUrl?: string;
  rpcWsUrl?: string;
  wallets?: SolanaWalletList;
  mobileChain?: SolanaMobileChain;
  preferDirectSend?: boolean;
};

export type ResolvedSolanaConfig = {
  enabled: boolean;
  cluster: "solana:mainnet" | "solana:devnet" | "solana:testnet";
  rpcHttpUrl: string;
  rpcWsUrl?: string;
  wallets: SolanaWalletList;
  mobileChain: SolanaMobileChain;
  preferDirectSend: boolean;
};

export type SafeSolanaWalletState = {
  publicKey: string | undefined;
  connected: boolean;
  walletName: string | undefined;
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

export const DEFAULT_SOLANA_ENDPOINT = "https://api.devnet.solana.com";
export const DEFAULT_SOLANA_WALLETS: SolanaWalletList = [
  phantomWallet,
  solflareWallet,
  backpackWallet,
  glowWallet,
];
export const DEFAULT_SOLANA_CLUSTER = "solana:devnet" as const;

export function useSafeSolanaWallet(): SafeSolanaWalletState {
  try {
    const wallet = useSolanaWallet();
    return {
      publicKey: wallet.publicKey?.toBase58(),
      connected: wallet.connected,
      walletName: wallet.wallet?.adapter?.name,
      signTransaction: wallet.signTransaction,
      signAllTransactions: wallet.signAllTransactions,
      signMessage: wallet.signMessage,
      sendTransaction: wallet.sendTransaction,
    };
  } catch {
    return {
      publicKey: undefined,
      connected: false,
      walletName: undefined,
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
): ResolvedSolanaConfig {
  const cluster = solana?.cluster ?? DEFAULT_SOLANA_CLUSTER;
  return {
    enabled: solana?.enabled ?? true,
    cluster,
    rpcHttpUrl:
      solana?.rpcHttpUrl ??
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
      DEFAULT_SOLANA_ENDPOINT,
    rpcWsUrl:
      solana?.rpcWsUrl ??
      process.env.NEXT_PUBLIC_SOLANA_RPC_WS_URL ??
      undefined,
    wallets: solana?.wallets ?? DEFAULT_SOLANA_WALLETS,
    mobileChain: solana?.mobileChain ?? (cluster as SolanaMobileChain),
    preferDirectSend: solana?.preferDirectSend ?? true,
  };
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
          const tx = deserializeSolanaTransaction(decodeBase64(payload.unsignedTx));
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
          const connection = new SolanaConnection(config.rpcHttpUrl, "confirmed");
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
            const connection = new SolanaConnection(config.rpcHttpUrl, "confirmed");
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
  children: ReactNode;
}) {
  let para: unknown;
  try {
    para = useParaClient() ?? null;
  } catch {
    para = null;
  }
  if (!enabled || !para) {
    return <>{children}</>;
  }
  return (
    <ParaSolanaProvider
      config={config}
      internalConfig={{
        para: para as never,
        walletsWithFullAuth: "ALL",
      }}
    >
      {children}
    </ParaSolanaProvider>
  );
}
