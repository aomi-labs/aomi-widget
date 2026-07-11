import { toHex, type Chain, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { ALCHEMY_CHAIN_SLUGS } from "../chains";
import type { AAWalletCall, ExecutionResult } from "../aa";
import { createCliGetAccountBearer } from "./client-factory";
import type { CliAAMode, CliConfig } from "./types";

// ---------------------------------------------------------------------------
// CLI account abstraction — thin client over the backend AA proxy.
//
// The Alchemy credential and sponsorship policy live server-side; the CLI
// talks wallet_prepareCalls / wallet_sendPreparedCalls through
// `{baseUrl}/api/aa/v1/{chainSlug}` (thread-authed: the account bearer rides
// the transport's jwt channel and the backend swaps it for the Alchemy key
// upstream). Only the local private key signs — nothing provider-shaped
// leaks into the browser packages.
// ---------------------------------------------------------------------------

const ALCHEMY_7702_DELEGATION_ADDRESS =
  "0x69007702764179f14F51cdce752f4f775d74E139" as Hex;

// Sponsorship policy id (not a secret — it only works with the server-side
// key). 4337 executes from a separate smart account with zero balance, so
// sponsorship is required to avoid prefund failures; 7702 executes from the
// EOA and pays its own gas.
const DEFAULT_ALCHEMY_GAS_POLICY_ID = "fb17d7d7-9a32-479d-937a-52d72b849c40";

function resolveGasPolicyId(): string {
  const env = process.env.ALCHEMY_GAS_POLICY_ID?.trim();
  return env || DEFAULT_ALCHEMY_GAS_POLICY_ID;
}

const ERC20_SELECTORS = new Set([
  "0x095ea7b3", // approve(address,uint256)
  "0xa9059cbb", // transfer(address,uint256)
  "0x23b872dd", // transferFrom(address,address,uint256)
]);

function callsContainTokenOperations(calls: AAWalletCall[]): boolean {
  return calls.some(
    (call) =>
      call.data && ERC20_SELECTORS.has(call.data.slice(0, 10).toLowerCase()),
  );
}

/**
 * Warn when 4337 is explicitly used with ERC-20 token operations.
 * 4337 executes from a separate smart-account contract that doesn't hold the
 * user's EOA tokens, so the batch is likely to revert.
 */
function warnIfTokenOpsIn4337(mode: CliAAMode, callList: AAWalletCall[]): void {
  if (mode !== "4337" || !callsContainTokenOperations(callList)) return;
  console.log(
    "⚠️  4337 batch contains ERC-20 calls. Tokens must be in the smart account, not your EOA.",
  );
  console.log(
    "   This batch may revert. Consider transferring tokens to the smart account first.",
  );
}

// ---------------------------------------------------------------------------
// Execution decision
// ---------------------------------------------------------------------------

export type CliExecutionDecision =
  | {
      execution: "eoa";
    }
  | {
      execution: "aa";
      provider: "alchemy";
      aaMode: CliAAMode;
      modeExplicit?: boolean;
      proxy: true;
    };

/**
 * Decide how to execute a transaction: AA via the backend proxy, or EOA.
 *
 * - `--eoa` → EOA, always.
 * - otherwise → Alchemy through `/api/aa/v1/:chain_slug`; 7702 by default,
 *   4337 when explicitly requested.
 */
export function resolveCliExecutionDecision(params: {
  config: CliConfig;
  chain: Chain;
  callList: AAWalletCall[];
}): CliExecutionDecision {
  const { config, chain, callList } = params;

  if (config.execution === "eoa") {
    return { execution: "eoa" };
  }

  const aaMode = config.aaMode ?? "7702";
  warnIfTokenOpsIn4337(aaMode, callList);
  void chain;
  return {
    execution: "aa",
    provider: "alchemy",
    aaMode,
    modeExplicit: Boolean(config.aaMode),
    proxy: true,
  };
}

/**
 * Return the alternative AA mode for fallback, or null if no alternative.
 */
export function getAlternativeAAMode(
  decision: CliExecutionDecision,
): CliExecutionDecision | null {
  if (decision.execution !== "aa") return null;
  if (decision.modeExplicit) return null;
  const alt: CliAAMode = decision.aaMode === "7702" ? "4337" : "7702";
  return { ...decision, aaMode: alt };
}

export function describeExecutionDecision(
  decision: CliExecutionDecision,
): string {
  if (decision.execution === "eoa") {
    return "eoa";
  }

  return `aa (${decision.provider}, ${decision.aaMode}, proxy)`;
}

// ---------------------------------------------------------------------------
// Executor
// ---------------------------------------------------------------------------

export type CliAAExecution = ExecutionResult & {
  SmartAccount4337?: Hex;
  Delegation7702?: Hex;
};

export interface CliAAExecutor {
  mode: CliAAMode;
  signerAddress: Hex;
  smartAccount4337: Hex | null;
  delegation7702: Hex | null;
  sponsored: boolean;
  execute: (callList: AAWalletCall[]) => Promise<CliAAExecution>;
}

function extractExistingAccountAddress(error: unknown): Hex | null {
  const message = error instanceof Error ? error.message : String(error);
  const match = message.match(
    /Account with address (0x[a-fA-F0-9]{40}) already exists/,
  );
  return (match?.[1] as Hex | undefined) ?? null;
}

function deriveAlchemy4337AccountId(address: Hex): string {
  const hex = address
    .toLowerCase()
    .slice(2)
    .padEnd(32, "0")
    .slice(0, 32)
    .split("");
  const namespace = ["4", "3", "3", "7", "5", "a", "a", "b"];
  for (let index = 0; index < namespace.length; index += 1) {
    hex[index] = namespace[index];
  }
  hex[12] = "4";
  const variant = Number.parseInt(hex[16] ?? "0", 16);
  hex[16] = ((variant & 0x3) | 0x8).toString(16);

  return [
    hex.slice(0, 8).join(""),
    hex.slice(8, 12).join(""),
    hex.slice(12, 16).join(""),
    hex.slice(16, 20).join(""),
    hex.slice(20, 32).join(""),
  ].join("-");
}

function normalizeCallData(data: Hex | undefined): Hex | undefined {
  return data === "0x" ? undefined : data;
}

/**
 * Build an AA executor for one decision: wallet-apis client over the backend
 * proxy, 4337 account resolution up front (so the smart-account address is
 * known before simulation/execution).
 */
export async function createCliAAExecutor(params: {
  decision: Extract<CliExecutionDecision, { execution: "aa" }>;
  chain: Chain;
  privateKey: `0x${string}`;
  baseUrl: string;
  config: CliConfig;
}): Promise<CliAAExecutor> {
  const { decision, chain, privateKey, baseUrl, config } = params;

  const chainSlug = ALCHEMY_CHAIN_SLUGS[chain.id];
  if (!chainSlug) {
    throw new Error(
      `AA is not supported on chain ${chain.id} (no backend AA proxy route). Use --eoa.`,
    );
  }
  const proxyBaseUrl = `${baseUrl}/api/aa/v1/${chainSlug}`;
  const proxyBearer =
    (await createCliGetAccountBearer(config)?.({ forceRefresh: false })) ??
    undefined;

  const { createSmartWalletClient, alchemyWalletTransport } = await import(
    "@alchemy/wallet-apis"
  );

  const transport = alchemyWalletTransport({
    url: proxyBaseUrl,
    ...(proxyBearer ? { jwt: proxyBearer } : {}),
  });

  const signer = privateKeyToAccount(privateKey);
  const gasPolicyId = decision.aaMode === "4337" ? resolveGasPolicyId() : undefined;
  const client = createSmartWalletClient({
    transport,
    chain,
    signer,
    ...(gasPolicyId ? { paymaster: { policyId: gasPolicyId } } : {}),
  });

  const signerAddress = signer.address as Hex;
  let accountAddress = signerAddress;

  if (decision.aaMode === "4337") {
    const accountId = deriveAlchemy4337AccountId(signerAddress);
    try {
      const account = await client.requestAccount({
        signerAddress,
        id: accountId,
        creationHint: {
          accountType: "sma-b",
          createAdditional: true,
        },
      });
      accountAddress = account.address as Hex;
    } catch (error) {
      const existingAccountAddress = extractExistingAccountAddress(error);
      if (!existingAccountAddress) {
        throw error;
      }
      const account = await client.requestAccount({
        accountAddress: existingAccountAddress,
      });
      accountAddress = account.address as Hex;
    }
  }

  const mode = decision.aaMode;
  const execute = async (
    callList: AAWalletCall[],
  ): Promise<CliAAExecution> => {
    const calls = callList.map(({ to, value, data }) => ({
      to,
      ...(value > BigInt(0) ? { value: toHex(value) } : {}),
      ...(normalizeCallData(data) ? { data: normalizeCallData(data) } : {}),
    }));

    const result = await client.sendCalls({
      ...(mode === "4337" ? { account: accountAddress } : {}),
      calls,
    });
    const status = await client.waitForCallsStatus({ id: result.id });
    const transactionHash = status.receipts?.[0]?.transactionHash;
    if (!transactionHash) {
      throw new Error("Alchemy Wallets API did not return a transaction hash.");
    }

    return {
      txHash: transactionHash,
      txHashes: [transactionHash],
      executionKind: `alchemy_${mode}`,
      batched: callList.length > 1,
      sponsored: Boolean(gasPolicyId),
      ...(mode === "4337"
        ? { SmartAccount4337: accountAddress }
        : { Delegation7702: ALCHEMY_7702_DELEGATION_ADDRESS }),
    };
  };

  return {
    mode,
    signerAddress,
    smartAccount4337: mode === "4337" ? accountAddress : null,
    delegation7702: mode === "7702" ? ALCHEMY_7702_DELEGATION_ADDRESS : null,
    sponsored: Boolean(gasPolicyId),
    execute,
  };
}
