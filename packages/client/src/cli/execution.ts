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
import { resolveAlchemyApiKey } from "../aa/alchemy/defaults";

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
      provider: CliAAProvider;
      aaMode: CliAAMode;
      modeExplicit?: boolean;
      apiKey?: string;
      proxy?: boolean;
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
 * - `--eoa`  → EOA, always.
 * - PIMLICO_API_KEY + --aa-provider pimlico → Pimlico direct
 * - Alchemy key resolved (env or built-in default) → Alchemy direct
 * - (fallback) → Alchemy proxy via backend
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

  const pimlicoKey = process.env.PIMLICO_API_KEY?.trim();
  const alchemyKey = resolveAlchemyApiKey();

  // Pimlico BYOK (only when explicitly requested)
  if (pimlicoKey && config.aaProvider === "pimlico") {
    const aaMode = resolveMode(chain, callList, config.aaMode);
    return {
      execution: "aa",
      provider: "pimlico",
      aaMode,
      modeExplicit: Boolean(config.aaMode),
      apiKey: pimlicoKey,
    };
  }

  // Alchemy direct (user key or built-in default)
  if (alchemyKey) {
    const aaMode = resolveMode(chain, callList, config.aaMode);
    return {
      execution: "aa",
      provider: "alchemy",
      aaMode,
      modeExplicit: Boolean(config.aaMode),
      apiKey: alchemyKey,
    };
  }

  // Default: Alchemy proxy (zero-config)
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
