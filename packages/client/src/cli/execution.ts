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
import type { CliAAProvider, CliAAMode, CliConfig } from "./types";

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
 * When 4337 is used with ERC-20 token operations, the calls execute from a
 * separate smart-account contract that doesn't hold the user's tokens.
 * If 7702 is available on the chain, auto-switch and warn.
 */
function maybeOverride4337ForTokenOps(params: {
  mode: CliAAMode;
  callList: AAWalletCall[];
  chain: Chain;
  explicitMode: boolean;
}): { mode: CliAAMode; warned: boolean } {
  const { mode, callList, chain, explicitMode } = params;
  if (mode !== "4337" || !callsContainTokenOperations(callList)) {
    return { mode, warned: false };
  }

  const chainConfig = getAAChainConfig(DEFAULT_AA_CONFIG, callList, {
    [chain.id]: chain,
  });

  if (chainConfig?.supportedModes.includes("7702") && !explicitMode) {
    console.log(
      "⚠️  4337 batch contains ERC-20 calls but tokens are in your EOA, not the 4337 smart account.",
    );
    console.log("   Switching to 7702 (EOA keeps smart-account capabilities, no token transfer needed).");
    return { mode: "7702", warned: true };
  }

  console.log(
    "⚠️  4337 batch contains ERC-20 calls. Tokens must be in the smart account, not your EOA.",
  );
  console.log(
    "   This batch may revert. Consider transferring tokens to the smart account first.",
  );
  return { mode, warned: true };
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
      provider: CliAAProvider;
      aaMode: CliAAMode;
      apiKey?: string;
      proxy?: boolean;
    };

/**
 * Resolve the AA mode for a given chain from DEFAULT_AA_CONFIG.
 */
function resolveMode(chain: Chain, callList: AAWalletCall[], explicitMode?: CliAAMode): CliAAMode {
  const chainConfig = getAAChainConfig(DEFAULT_AA_CONFIG, callList, {
    [chain.id]: chain,
  });
  let baseMode = explicitMode ?? (chainConfig?.defaultMode as CliAAMode | undefined) ?? "7702";

  // For multi-call batches, prefer 7702 first when available.
  if (
    !explicitMode &&
    callList.length > 1 &&
    chainConfig?.supportedModes.includes("7702")
  ) {
    baseMode = "7702";
  }

  const { mode } = maybeOverride4337ForTokenOps({
    mode: baseMode,
    callList,
    chain,
    explicitMode: Boolean(explicitMode),
  });

  return mode;
}

/**
 * Decide how to execute a transaction: AA or EOA.
 *
 * - `--eoa`  → EOA, always.
 * - PIMLICO_API_KEY + --aa-provider pimlico → Pimlico direct
 * - ALCHEMY_API_KEY set → Alchemy BYOK
 * - (default) → Alchemy proxy via backend (zero-config)
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

  // Auto mode: use direct EOA signing for single-call executions.
  if (config.execution !== "aa" && callList.length === 1) {
    return { execution: "eoa" };
  }

  const pimlicoKey = process.env.PIMLICO_API_KEY?.trim();
  const alchemyKey = process.env.ALCHEMY_API_KEY?.trim();

  // Pimlico BYOK (only when explicitly requested)
  if (pimlicoKey && config.aaProvider === "pimlico") {
    const aaMode = resolveMode(chain, callList, config.aaMode);
    return { execution: "aa", provider: "pimlico", aaMode, apiKey: pimlicoKey };
  }

  // Alchemy BYOK
  if (alchemyKey) {
    const aaMode = resolveMode(chain, callList, config.aaMode);
    return { execution: "aa", provider: "alchemy", aaMode, apiKey: alchemyKey };
  }

  // Default: Alchemy proxy (zero-config)
  const aaMode = resolveMode(chain, callList, config.aaMode);
  return { execution: "aa", provider: "alchemy", aaMode, proxy: true };
}

/**
 * Return the alternative AA mode for fallback, or null if no alternative.
 */
export function getAlternativeAAMode(
  decision: CliExecutionDecision,
): CliExecutionDecision | null {
  if (decision.execution !== "aa") return null;
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
}): Promise<AAState> {
  const { decision, chain, privateKey, rpcUrl, callList, baseUrl } = params;

  if (decision.execution === "eoa") {
    return DISABLED_PROVIDER_STATE;
  }

  const chainSlug = ALCHEMY_CHAIN_SLUGS[chain.id];
  const proxyBaseUrl = decision.proxy && chainSlug
    ? `${baseUrl}/aa/v1/${chainSlug}`
    : undefined;
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
    apiKey: decision.apiKey,
    proxyBaseUrl,
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

  const suffix = decision.proxy ? ", proxy" : "";
  return `aa (${decision.provider}, ${decision.aaMode}${suffix})`;
}
