import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import type { WalletTxPayload } from "@aomi-labs/react";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  getAddress,
  http,
  isAddress,
  isHex,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

export const E2E_WALLET_COOKIE = "aomi_e2e_wallet";

export type E2EWalletSeed = {
  address: `0x${string}`;
  chainId: number;
  expiresAt: number;
};

const MAX_TTL_SECONDS = 60 * 60;
const DEFAULT_MAX_NATIVE_WEI = BigInt("1000000000000");
const LOCALHOST_CHAIN_ID = 31337;

type E2EExecuteErrorCode =
  | "disabled"
  | "unauthorized"
  | "invalid_request"
  | "policy_rejected"
  | "rpc_unavailable"
  | "execution_failed";

export type E2EExecuteResult =
  | {
      ok: true;
      txHash: `0x${string}`;
      chainId: number;
      from: `0x${string}`;
      to: `0x${string}`;
      valueWei: string;
      gasLimit: string;
      executionKind: "e2e_real_self_transfer";
    }
  | {
      ok: false;
      error: string;
      code: E2EExecuteErrorCode;
    };

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signingSecret(): string | null {
  const secret = process.env.AOMI_E2E_WALLET_TOKEN?.trim();
  return secret || null;
}

export function isE2EWalletEnabled(): boolean {
  return (
    process.env.AOMI_ENABLE_E2E_WALLET === "true" &&
    signingSecret() !== null
  );
}

function executorPrivateKey(): Hex | null {
  const privateKey = process.env.AOMI_E2E_SIGNER_PRIVATE_KEY?.trim();
  if (!privateKey || !isHex(privateKey) || privateKey.length !== 66) {
    return null;
  }
  return privateKey;
}

export function isE2EExecutorEnabled(): boolean {
  return (
    isE2EWalletEnabled() &&
    process.env.AOMI_E2E_EXECUTION_MODE === "real" &&
    executorPrivateKey() !== null
  );
}

export function validateE2EWalletToken(token: string | null): boolean {
  const secret = signingSecret();
  if (!secret || !token) return false;
  const expected = Buffer.from(secret);
  const actual = Buffer.from(token);
  return (
    expected.length === actual.length && timingSafeEqual(expected, actual)
  );
}

export function parseE2EAddress(value: string | null): `0x${string}` | null {
  const address = value?.trim();
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) return null;
  return address as `0x${string}`;
}

export function parseE2EChainId(value: string | null): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function parseE2ETtlSeconds(value: string | null): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return 15 * 60;
  return Math.min(parsed, MAX_TTL_SECONDS);
}

function signPayload(payload: string): string | null {
  const secret = signingSecret();
  if (!secret) return null;
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function mintE2EWalletCookie(seed: {
  address: `0x${string}`;
  chainId: number;
  ttlSeconds: number;
}): string | null {
  const payload = base64UrlEncode(
    JSON.stringify({
      address: seed.address,
      chainId: seed.chainId,
      expiresAt: Math.floor(Date.now() / 1000) + seed.ttlSeconds,
    } satisfies E2EWalletSeed),
  );
  const signature = signPayload(payload);
  return signature ? `${payload}.${signature}` : null;
}

export function verifyE2EWalletCookie(
  cookieValue: string | undefined,
): E2EWalletSeed | null {
  if (!isE2EWalletEnabled() || !cookieValue) return null;
  const [payload, signature] = cookieValue.split(".");
  if (!payload || !signature) return null;

  const expectedSignature = signPayload(payload);
  if (!expectedSignature) return null;
  const expected = Buffer.from(expectedSignature);
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null;
  }

  try {
    const parsed = JSON.parse(base64UrlDecode(payload)) as E2EWalletSeed;
    if (!parseE2EAddress(parsed.address)) return null;
    if (!Number.isInteger(parsed.chainId) || parsed.chainId <= 0) return null;
    if (
      !Number.isInteger(parsed.expiresAt) ||
      parsed.expiresAt <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function parseWei(value: unknown): bigint | null {
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) return null;
    return BigInt(value);
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return BigInt(0);
  try {
    const parsed = BigInt(trimmed);
    return parsed >= BigInt(0) ? parsed : null;
  } catch {
    return null;
  }
}

function maxNativeWei(): bigint {
  return parseWei(process.env.AOMI_E2E_MAX_NATIVE_WEI) ?? DEFAULT_MAX_NATIVE_WEI;
}

function rpcUrlForChain(chainId: number): string | null {
  const envName = `AOMI_E2E_RPC_URL_${chainId}`;
  const envRpc = process.env[envName]?.trim();
  if (envRpc) return envRpc;
  return chainId === LOCALHOST_CHAIN_ID ? "http://127.0.0.1:8545" : null;
}

function normalizeData(data: unknown): Hex {
  if (typeof data !== "string" || !data.trim()) return "0x";
  return data as Hex;
}

function callFromPayload(payload: WalletTxPayload): {
  to: Address;
  value: bigint;
  data: Hex;
  chainId: number;
  callCount: number;
} | null {
  const calls = Array.isArray(payload.calls) ? payload.calls : [];
  const rawCall =
    calls.length === 1
      ? calls[0]
      : calls.length === 0
        ? payload
        : null;
  if (!rawCall) return null;

  const to = typeof rawCall.to === "string" ? rawCall.to.trim() : "";
  if (!isAddress(to)) return null;
  const value = parseWei(rawCall.value ?? "0");
  if (value === null) return null;
  const data = normalizeData(rawCall.data);
  if (!isHex(data)) return null;
  const chainId =
    typeof rawCall.chainId === "number" && Number.isInteger(rawCall.chainId)
      ? rawCall.chainId
      : typeof payload.chainId === "number" && Number.isInteger(payload.chainId)
        ? payload.chainId
        : 0;
  if (chainId <= 0) return null;

  return {
    to: getAddress(to),
    value,
    data,
    chainId,
    callCount: calls.length || 1,
  };
}

function e2eChain(chainId: number, rpcUrl: string) {
  return defineChain({
    id: chainId,
    name: `Aomi E2E ${chainId}`,
    nativeCurrency: {
      decimals: 18,
      name: "Ether",
      symbol: "ETH",
    },
    rpcUrls: {
      default: {
        http: [rpcUrl],
      },
    },
  });
}

function reject(code: E2EExecuteErrorCode, error: string): E2EExecuteResult {
  return { ok: false, code, error };
}

export async function executeE2EWalletTransaction({
  seed,
  payload,
}: {
  seed: E2EWalletSeed;
  payload: WalletTxPayload;
}): Promise<E2EExecuteResult> {
  if (!isE2EExecutorEnabled()) {
    return reject("disabled", "E2E real execution is disabled");
  }

  const privateKey = executorPrivateKey();
  if (!privateKey) {
    return reject("disabled", "E2E signer private key is unavailable");
  }

  const account = privateKeyToAccount(privateKey);
  const signerAddress = getAddress(account.address);
  if (signerAddress !== getAddress(seed.address)) {
    return reject("unauthorized", "Seeded E2E wallet does not match signer");
  }

  const call = callFromPayload(payload);
  if (!call) {
    return reject("invalid_request", "Unsupported E2E transaction payload");
  }
  if (call.chainId !== seed.chainId) {
    return reject("policy_rejected", "Transaction chain does not match seed");
  }
  if (call.to !== signerAddress) {
    return reject("policy_rejected", "Only self-transfers are allowed");
  }
  if (call.data !== "0x") {
    return reject("policy_rejected", "Calldata is not allowed for self-transfer");
  }
  if (call.value <= BigInt(0)) {
    return reject("policy_rejected", "Self-transfer value must be positive");
  }
  if (call.value > maxNativeWei()) {
    return reject("policy_rejected", "Self-transfer exceeds E2E value cap");
  }

  const rpcUrl = rpcUrlForChain(call.chainId);
  if (!rpcUrl) {
    return reject("rpc_unavailable", "No E2E RPC URL configured for chain");
  }

  try {
    const chain = e2eChain(call.chainId, rpcUrl);
    const publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });
    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(rpcUrl),
    });
    const gas = await publicClient.estimateGas({
      account: signerAddress,
      to: call.to,
      value: call.value,
      data: call.data,
    });
    const txHash = await walletClient.sendTransaction({
      account,
      chain,
      to: call.to,
      value: call.value,
      data: call.data,
      gas,
    });

    return {
      ok: true,
      txHash,
      chainId: call.chainId,
      from: signerAddress,
      to: call.to,
      valueWei: call.value.toString(),
      gasLimit: gas.toString(),
      executionKind: "e2e_real_self_transfer",
    };
  } catch (error) {
    return reject(
      "execution_failed",
      error instanceof Error ? error.message : "E2E transaction failed",
    );
  }
}
