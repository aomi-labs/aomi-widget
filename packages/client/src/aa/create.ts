import { createAlchemySmartAccount } from "@getpara/aa-alchemy";
import { createPimlicoSmartAccount } from "@getpara/aa-pimlico";
import type { Chain } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import type { AAExecutionMode, AAProviderState, WalletExecutionCall } from "./types";
import { adaptSmartAccount } from "./adapt";
import { resolveAlchemyConfig, resolvePimlicoConfig } from "./resolve";
import { readEnv, ALCHEMY_GAS_POLICY_ENVS } from "./env";
import type { AAProvider } from "./env";

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface CreateAAProviderStateOptions {
  provider: AAProvider;
  chain: Chain;
  privateKey: `0x${string}`;
  rpcUrl: string;
  callList: WalletExecutionCall[];
  mode?: AAExecutionMode;
  apiKey?: string;
  gasPolicyId?: string;
  sponsored?: boolean;
}

// ---------------------------------------------------------------------------
// Unified Creator
// ---------------------------------------------------------------------------

/**
 * Creates an `AAProviderState` by instantiating the appropriate smart account
 * via `@getpara/aa-alchemy` or `@getpara/aa-pimlico`.
 *
 * This is the single entry-point for async (non-hook) AA provider state creation.
 */
export async function createAAProviderState(
  options: CreateAAProviderStateOptions,
): Promise<AAProviderState> {
  if (options.provider === "alchemy") {
    return createAlchemyAAState(options);
  }
  return createPimlicoAAState(options);
}

// ---------------------------------------------------------------------------
// Alchemy
// ---------------------------------------------------------------------------

async function createAlchemyAAState(
  options: CreateAAProviderStateOptions,
): Promise<AAProviderState> {
  const {
    chain,
    privateKey,
    rpcUrl,
    callList,
    mode,
    sponsored = true,
  } = options;

  const resolved = resolveAlchemyConfig({
    calls: callList,
    chainsById: { [chain.id]: chain },
    modeOverride: mode,
    throwOnMissingConfig: true,
    getPreferredRpcUrl: () => rpcUrl,
  });

  if (!resolved) {
    throw new Error("Alchemy AA config resolution failed.");
  }

  const apiKey = options.apiKey ?? resolved.apiKey;
  const gasPolicyId = sponsored
    ? (options.gasPolicyId ?? readEnv(ALCHEMY_GAS_POLICY_ENVS))
    : undefined;

  const plan = {
    ...resolved.plan,
    sponsorship: gasPolicyId ? resolved.plan.sponsorship : "disabled",
    fallbackToEoa: false,
  } as AAProviderState["plan"];

  const signer = privateKeyToAccount(privateKey);

  try {
    const smartAccount = await createAlchemySmartAccount({
      para: undefined as never,
      signer,
      apiKey,
      gasPolicyId,
      chain,
      rpcUrl,
      mode: plan!.mode,
    });

    if (!smartAccount) {
      return {
        plan,
        AA: null,
        isPending: false,
        error: new Error("Alchemy AA account could not be initialized."),
      };
    }

    return {
      plan,
      AA: adaptSmartAccount(smartAccount),
      isPending: false,
      error: null,
    };
  } catch (error) {
    return {
      plan,
      AA: null,
      isPending: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

// ---------------------------------------------------------------------------
// Pimlico
// ---------------------------------------------------------------------------

async function createPimlicoAAState(
  options: CreateAAProviderStateOptions,
): Promise<AAProviderState> {
  const {
    chain,
    privateKey,
    rpcUrl,
    callList,
    mode,
  } = options;

  const resolved = resolvePimlicoConfig({
    calls: callList,
    chainsById: { [chain.id]: chain },
    rpcUrl,
    modeOverride: mode,
    throwOnMissingConfig: true,
  });

  if (!resolved) {
    throw new Error("Pimlico AA config resolution failed.");
  }

  const apiKey = options.apiKey ?? resolved.apiKey;
  const plan = {
    ...resolved.plan,
    fallbackToEoa: false,
  } as AAProviderState["plan"];

  const signer = privateKeyToAccount(privateKey);

  try {
    const smartAccount = await createPimlicoSmartAccount({
      para: undefined as never,
      signer,
      apiKey,
      chain,
      rpcUrl,
      mode: plan!.mode,
    });

    if (!smartAccount) {
      return {
        plan,
        AA: null,
        isPending: false,
        error: new Error("Pimlico AA account could not be initialized."),
      };
    }

    return {
      plan,
      AA: adaptSmartAccount(smartAccount),
      isPending: false,
      error: null,
    };
  } catch (error) {
    return {
      plan,
      AA: null,
      isPending: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
