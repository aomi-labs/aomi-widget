import type { Chain } from "viem";

import {
  DISABLED_PROVIDER_STATE,
  type AAState,
  type AAWalletCall,
  DEFAULT_AA_CONFIG,
  getAAChainConfig,
  createAAProviderState,
} from "../aa";
import { ALCHEMY_CHAIN_SLUGS } from "../chains";
import { createCliGetAccountBearer } from "./client-factory";
import type { CliAAMode, CliConfig } from "./types";

// ---------------------------------------------------------------------------
// ERC-20 Call Detection
// ---------------------------------------------------------------------------

const ERC20_SELECTORS = new Set([
  "0x095ea7b3", // approve(address,uint256)
  "0xa9059cbb", // transfer(address,uint256)
  "0x23b872dd", // transferFrom(address,address,uint256)
]);

function callsContainTokenOperations(calls: AAWalletCall[]): boolean {
  return calls.some(
    (call) => call.data && ERC20_SELECTORS.has(call.data.slice(0, 10).toLowerCase()),
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
// CLI Execution Decision
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
 * Resolve the AA mode for a given chain from DEFAULT_AA_CONFIG.
 * All chains default to 7702; falls back to 4337 only when explicitly requested.
 */
function resolveMode(chain: Chain, callList: AAWalletCall[], explicitMode?: CliAAMode): CliAAMode {
  const chainConfig = getAAChainConfig(DEFAULT_AA_CONFIG, callList, {
    [chain.id]: chain,
  });
  const mode = explicitMode ?? (chainConfig?.defaultMode as CliAAMode | undefined) ?? "7702";
  warnIfTokenOpsIn4337(mode, callList);
  return mode;
}

/**
 * Decide how to execute a transaction: AA or EOA.
 *
 * - `--eoa` → EOA, always.
 * - otherwise → Alchemy via the backend AA proxy (`/api/aa/v1/:chain_slug`).
 *
 * Client-side provider keys are gone: the backend proxy owns the Alchemy
 * credential (and sponsorship policy), the CLI only signs.
 */
export function resolveCliExecutionDecision(params: {
  config: CliConfig;
  chain: Chain;
  callList: AAWalletCall[];
}): CliExecutionDecision {
  const { config, chain, callList } = params;

  // Explicit EOA
  if (config.execution === "eoa") {
    return { execution: "eoa" };
  }

  const aaMode = resolveMode(chain, callList, config.aaMode);
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

// ---------------------------------------------------------------------------
// CLI Provider State Creation
// ---------------------------------------------------------------------------

export async function createCliProviderState(params: {
  decision: CliExecutionDecision;
  chain: Chain;
  privateKey: `0x${string}`;
  rpcUrl: string;
  callList: AAWalletCall[];
  baseUrl: string;
  config: CliConfig;
}): Promise<AAState> {
  const { decision, chain, privateKey, rpcUrl, callList, baseUrl, config } =
    params;

  if (decision.execution === "eoa") {
    return DISABLED_PROVIDER_STATE;
  }

  // The proxy is a `[thread]`-authed backend route: the CLI's account
  // credential rides the transport's bearer channel and the backend swaps
  // it for the server-side Alchemy key upstream.
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
  const resolvedRpcUrl =
    rpcUrl ||
    chain.rpcUrls.default.http[0] ||
    chain.rpcUrls.public?.http[0] ||
    "";

  return createAAProviderState({
    provider: decision.provider,
    chain,
    owner: { kind: "direct", privateKey },
    rpcUrl: resolvedRpcUrl,
    callList,
    mode: decision.aaMode,
    proxyBaseUrl,
    proxyBearer,
  });
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function describeExecutionDecision(
  decision: CliExecutionDecision,
): string {
  if (decision.execution === "eoa") {
    return "eoa";
  }

  return `aa (${decision.provider}, ${decision.aaMode}, proxy)`;
}
