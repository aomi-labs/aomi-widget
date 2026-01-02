"use client";

import { useEffect, useRef } from "react";

import { useRuntimeActions } from "../runtime/hooks";

// ==================== Wallet Button State ====================

export type WalletButtonState = {
  address?: string;
  chainId?: number;
  isConnected: boolean;
  ensName?: string;
};

export type WalletFooterProps = {
  wallet: WalletButtonState;
  setWallet: (data: Partial<WalletButtonState>) => void;
};

// ==================== Wallet Transaction Types ====================

export type WalletTxRequestPayload = {
  to: string;
  value: string; // wei as decimal string
  data: string; // 0x-prefixed hex
  gas?: string | null;
  gas_limit?: string | null;
  description?: string;
  topic?: string;
  timestamp?: string;
};

export type WalletTxRequestContext = {
  sessionId: string;
  threadId: string;
  publicKey?: string;
};

// Return the transaction hash (0x...) or throw on failure/rejection.
export type WalletTxRequestHandler = (
  request: WalletTxRequestPayload,
  context: WalletTxRequestContext
) => Promise<string>;

export type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

// ==================== Network Utilities ====================

export const getNetworkName = (chainId: number | string | undefined): string => {
  if (chainId === undefined) return "";
  const id = typeof chainId === "string" ? Number(chainId) : chainId;
  switch (id) {
    case 1:
      return "ethereum";
    case 137:
      return "polygon";
    case 42161:
      return "arbitrum";
    case 8453:
      return "base";
    case 10:
      return "optimism";
    case 11155111:
      return "sepolia";
    case 1337:
    case 31337:
      return "testnet";
    case 59140:
      return "linea-sepolia";
    case 59144:
      return "linea";
    default:
      return "testnet";
  }
};

export const formatAddress = (addr?: string): string =>
  addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "Connect Wallet";

// ==================== Wallet Error Handling ====================

export function normalizeWalletError(error: unknown): {
  rejected: boolean;
  message: string;
} {
  const e = error as {
    code?: unknown;
    name?: unknown;
    message?: unknown;
    shortMessage?: unknown;
    cause?: unknown;
  };
  const cause = (e?.cause ?? null) as
    | { code?: unknown; name?: unknown; message?: unknown; shortMessage?: unknown }
    | null;

  const code =
    (typeof e?.code === "number" ? e.code : undefined) ??
    (typeof cause?.code === "number" ? cause.code : undefined);
  const name =
    (typeof e?.name === "string" ? e.name : undefined) ??
    (typeof cause?.name === "string" ? cause.name : undefined);
  const msg =
    (typeof e?.shortMessage === "string" ? e.shortMessage : undefined) ??
    (typeof cause?.shortMessage === "string" ? cause.shortMessage : undefined) ??
    (typeof e?.message === "string" ? e.message : undefined) ??
    (typeof cause?.message === "string" ? cause.message : undefined) ??
    "Unknown wallet error";

  const rejected =
    code === 4001 ||
    name === "UserRejectedRequestError" ||
    name === "RejectedRequestError" ||
    /user rejected|rejected the request|denied|request rejected|canceled|cancelled/i.test(
      msg
    );

  return { rejected, message: msg };
}

// ==================== Hex Conversion ====================

export function toHexQuantity(value: string): string {
  const trimmed = value.trim();
  const asBigInt = BigInt(trimmed);
  return `0x${asBigInt.toString(16)}`;
}

// ==================== Provider Detection ====================

export async function pickInjectedProvider(
  publicKey?: string
): Promise<Eip1193Provider | undefined> {
  const ethereum = (globalThis as unknown as { ethereum?: unknown }).ethereum as
    | (Eip1193Provider & { providers?: unknown[] })
    | undefined;
  if (!ethereum?.request) return undefined;

  const candidates: Eip1193Provider[] = Array.isArray(ethereum.providers)
    ? (ethereum.providers.filter(
        (p): p is Eip1193Provider => !!(p as Eip1193Provider)?.request
      ) as Eip1193Provider[])
    : [ethereum];

  const target = publicKey?.toLowerCase();
  if (target) {
    for (const candidate of candidates) {
      try {
        const accounts = (await candidate.request({
          method: "eth_accounts",
        })) as unknown;
        const list = Array.isArray(accounts)
          ? (accounts as unknown[]).map((a) => String(a).toLowerCase())
          : [];
        if (list.includes(target)) return candidate;
      } catch {
        // Ignore providers that error on eth_accounts.
      }
    }
  }

  return candidates[0];
}

// ==================== Wallet System Message Emitter ====================

type WalletSystemMessageEmitterProps = {
  wallet: WalletButtonState;
};

export function WalletSystemMessageEmitter({
  wallet,
}: WalletSystemMessageEmitterProps) {
  const { sendSystemMessage } = useRuntimeActions();
  const lastWalletRef = useRef<{
    isConnected: boolean;
    address?: string;
    chainId?: number;
  }>({ isConnected: false });

  useEffect(() => {
    const prev = lastWalletRef.current;
    const { address, chainId, isConnected } = wallet;
    const normalizedAddress = address?.toLowerCase();

    if (
      isConnected &&
      normalizedAddress &&
      chainId &&
      (!prev.isConnected || prev.address !== normalizedAddress)
    ) {
      const networkName = getNetworkName(chainId);
      const message = `User connected wallet with address ${normalizedAddress} on ${networkName} network (Chain ID: ${chainId}). Ready to help with transactions.`;
      console.log(message);
      void sendSystemMessage(message);
      lastWalletRef.current = {
        isConnected: true,
        address: normalizedAddress,
        chainId,
      };
      return;
    }

    if (!isConnected && prev.isConnected) {
      void sendSystemMessage("Wallet disconnected by user.");
      console.log("Wallet disconnected by user.");
      lastWalletRef.current = { isConnected: false };
      return;
    }

    if (
      isConnected &&
      normalizedAddress &&
      chainId &&
      prev.isConnected &&
      prev.address === normalizedAddress &&
      prev.chainId !== chainId
    ) {
      const networkName = getNetworkName(chainId);
      const message = `User switched wallet to ${networkName} network (Chain ID: ${chainId}).`;
      console.log(message);
      void sendSystemMessage(message);
      lastWalletRef.current = {
        isConnected: true,
        address: normalizedAddress,
        chainId,
      };
    }
  }, [wallet, sendSystemMessage]);

  return null;
}
