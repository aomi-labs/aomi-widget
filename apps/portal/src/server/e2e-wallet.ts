import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { readFileSync } from "fs";
import bs58 from "bs58";
import nacl from "tweetnacl";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import type { WalletSolanaSignPayload } from "@aomi-labs/client";
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
  address?: `0x${string}`;
  chainId?: number;
  svmAddress?: string;
  svmCluster?: E2ESvmCluster;
  expiresAt: number;
};

export type E2ESvmCluster = "solana:devnet" | "solana:testnet";

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

export type E2ESolanaResult =
  | { ok: true; signature: string; signedTx?: string }
  | { ok: false; error: string; code: E2EExecuteErrorCode };

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
    process.env.AOMI_ENABLE_E2E_WALLET === "true" && signingSecret() !== null
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
  return expected.length === actual.length && timingSafeEqual(expected, actual);
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

export function parseE2ESvmAddress(value: string | null): string | null {
  const address = value?.trim();
  if (!address) return null;
  try {
    return new PublicKey(address).toBase58() === address ? address : null;
  } catch {
    return null;
  }
}

export function parseE2ESvmCluster(value: string | null): E2ESvmCluster {
  return value === "solana:testnet" ? "solana:testnet" : "solana:devnet";
}

function normalizeE2ESvmCluster(
  value: string | undefined,
): E2ESvmCluster | null {
  if (value === "devnet" || value === "solana:devnet") return "solana:devnet";
  if (value === "testnet" || value === "solana:testnet")
    return "solana:testnet";
  return null;
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
  address?: `0x${string}`;
  chainId?: number;
  svmAddress?: string;
  svmCluster?: E2ESvmCluster;
  ttlSeconds: number;
}): string | null {
  if (!seed.address && !seed.svmAddress) return null;
  const payload = base64UrlEncode(
    JSON.stringify({
      address: seed.address,
      chainId: seed.chainId,
      svmAddress: seed.svmAddress,
      svmCluster: seed.svmAddress ? seed.svmCluster : undefined,
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
    const hasEvm = Boolean(
      parsed.address &&
      parseE2EAddress(parsed.address) &&
      Number.isInteger(parsed.chainId) &&
      (parsed.chainId ?? 0) > 0,
    );
    const hasSvm = Boolean(
      parsed.svmAddress &&
      parseE2ESvmAddress(parsed.svmAddress) &&
      (parsed.svmCluster === "solana:devnet" ||
        parsed.svmCluster === "solana:testnet"),
    );
    if (!hasEvm && !hasSvm) return null;
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

export function resolveE2ECanonicalUserId(request: Request): string | null {
  const userId = process.env.AOMI_E2E_CANONICAL_USER_ID?.trim();
  if (!userId || !isE2EWalletEnabled()) return null;
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${E2E_WALLET_COOKIE}=`));
  const value = cookie?.slice(E2E_WALLET_COOKIE.length + 1);
  return verifyE2EWalletCookie(value) ? userId : null;
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
  return (
    parseWei(process.env.AOMI_E2E_MAX_NATIVE_WEI) ?? DEFAULT_MAX_NATIVE_WEI
  );
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
    calls.length === 1 ? calls[0] : calls.length === 0 ? payload : null;
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

function reject(
  code: E2EExecuteErrorCode,
  error: string,
): { ok: false; code: E2EExecuteErrorCode; error: string } {
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

  if (!seed.address || !seed.chainId) {
    return reject("unauthorized", "Seeded E2E wallet has no EVM identity");
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
    return reject(
      "policy_rejected",
      "Calldata is not allowed for self-transfer",
    );
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
      from: signerAddress as `0x${string}`,
      to: call.to as `0x${string}`,
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

function solanaSigner(): Keypair | null {
  try {
    const path = process.env.AOMI_E2E_SOLANA_KEYPAIR_PATH?.trim();
    const value = path
      ? readFileSync(path, "utf8")
      : process.env.AOMI_E2E_SOLANA_SIGNER_PRIVATE_KEY?.trim();
    if (!value) return null;
    const bytes = value.trim().startsWith("[")
      ? Uint8Array.from(JSON.parse(value) as number[])
      : bs58.decode(value.trim());
    return bytes.length === 64 ? Keypair.fromSecretKey(bytes) : null;
  } catch {
    return null;
  }
}

function loopbackSolanaRpcUrl(): string | null {
  const value =
    process.env.AOMI_E2E_SOLANA_RPC_URL?.trim() ?? "http://127.0.0.1:8899";
  try {
    const url = new URL(value);
    return url.hostname === "127.0.0.1" || url.hostname === "localhost"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function isE2ESolanaExecutorEnabled(): boolean {
  return (
    isE2EWalletEnabled() &&
    process.env.AOMI_E2E_EXECUTION_MODE === "real" &&
    solanaSigner() !== null &&
    loopbackSolanaRpcUrl() !== null
  );
}

function authorizedSolanaSigner(seed: E2EWalletSeed): Keypair | null {
  const signer = solanaSigner();
  if (
    !signer ||
    !seed.svmAddress ||
    seed.svmCluster === undefined ||
    signer.publicKey.toBase58() !== seed.svmAddress
  ) {
    return null;
  }
  return signer;
}

export async function signE2ESolanaMessage({
  seed,
  message,
}: {
  seed: E2EWalletSeed;
  message: string;
}): Promise<E2ESolanaResult> {
  if (!isE2ESolanaExecutorEnabled()) {
    return reject("disabled", "E2E Solana execution is disabled");
  }
  const signer = authorizedSolanaSigner(seed);
  if (!signer) {
    return reject("unauthorized", "Seeded Solana wallet does not match signer");
  }
  try {
    const bytes = Buffer.from(message, "base64");
    return {
      ok: true,
      signature: Buffer.from(
        nacl.sign.detached(bytes, signer.secretKey),
      ).toString("base64"),
    };
  } catch {
    return reject("invalid_request", "Invalid Solana message payload");
  }
}

export async function executeE2ESolanaTransaction({
  seed,
  payload,
  broadcast,
}: {
  seed: E2EWalletSeed;
  payload: WalletSolanaSignPayload;
  broadcast: boolean;
}): Promise<E2ESolanaResult> {
  if (!isE2ESolanaExecutorEnabled()) {
    return reject("disabled", "E2E Solana execution is disabled");
  }
  const signer = authorizedSolanaSigner(seed);
  if (!signer) {
    return reject("unauthorized", "Seeded Solana wallet does not match signer");
  }
  if (
    !payload.unsignedTx ||
    normalizeE2ESvmCluster(payload.cluster) !== seed.svmCluster
  ) {
    return reject("policy_rejected", "Solana request does not match seed");
  }
  const rpcUrl = loopbackSolanaRpcUrl();
  if (!rpcUrl) {
    return reject("rpc_unavailable", "Solana E2E RPC must be loopback");
  }

  try {
    const raw = Buffer.from(payload.unsignedTx, "base64");
    let serialized: Uint8Array;
    try {
      const transaction = VersionedTransaction.deserialize(raw);
      if (
        transaction.message.staticAccountKeys[0]?.toBase58() !== seed.svmAddress
      ) {
        return reject(
          "policy_rejected",
          "Solana fee payer does not match seed",
        );
      }
      transaction.sign([signer]);
      serialized = transaction.serialize();
    } catch {
      const transaction = Transaction.from(raw);
      if (transaction.feePayer?.toBase58() !== seed.svmAddress) {
        return reject(
          "policy_rejected",
          "Solana fee payer does not match seed",
        );
      }
      transaction.partialSign(signer);
      serialized = transaction.serialize();
    }

    const signedTx = Buffer.from(serialized).toString("base64");
    if (!broadcast) return { ok: true, signature: "", signedTx };

    const connection = new Connection(rpcUrl, "confirmed");
    const signature = await connection.sendRawTransaction(serialized);
    const confirmation = await connection.confirmTransaction(
      signature,
      "confirmed",
    );
    if (confirmation.value.err) {
      return reject("execution_failed", "Solana transaction was not confirmed");
    }
    return { ok: true, signature, signedTx };
  } catch (error) {
    return reject(
      "execution_failed",
      error instanceof Error ? error.message : "Solana transaction failed",
    );
  }
}
