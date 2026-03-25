import { createAlchemySmartAccount } from "@getpara/aa-alchemy";
import { createPimlicoSmartAccount } from "@getpara/aa-pimlico";
import type { Chain, Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import type {
  AAExecutionMode,
  AAProviderState,
  WalletExecutionCall,
} from "./types";
import { adaptSmartAccount } from "./adapt";
import { resolveAlchemyConfig, resolvePimlicoConfig } from "./resolve";
import { readEnv, ALCHEMY_GAS_POLICY_ENVS } from "./env";
import type { AAProvider } from "./env";

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// CreateAAOwner
// 
//   { privateKey }

//   - This is local key signing.
//   - The client converts the raw private key into a viem account internally.
//   - Best for CLI/server flows where you already have the key material.

//   { signer, address? }

//   - This is external signer signing.
//   - signer is a wallet/account object that can sign on behalf of the owner, such as a wagmi/viem wallet client or local account.
//   - address is optional because some signer objects already expose their address, but passing it can make ownership explicit.
//   - This is the right shape for an injected wallet / WalletConnect / non-Para wallet in the mini app.

//   { para, address? }

//   - This is Para-managed signing.
//   - para is the Para client/session object, and the AA SDK uses that session to sign.
//   - address identifies which EVM wallet/account inside that Para session should own the smart account.
//   - This is the right shape when the user is using the Para wallet path in the mini app.
// -------------------------------------------------------------------------
export type CreateAAOwner =
  | { privateKey: `0x${string}` }
  | { signer: unknown; para: unknown; address?: Hex }
  | { para: unknown; address?: Hex };

export interface CreateAAProviderStateOptions {
  provider: AAProvider;
  chain: Chain;
  owner: CreateAAOwner;
  rpcUrl: string;
  callList: WalletExecutionCall[];
  mode?: AAExecutionMode;
  apiKey?: string;
  gasPolicyId?: string;
  sponsored?: boolean;
}

interface CreateAlchemyAAStateOptions {
  chain: Chain;
  owner: CreateAAOwner;
  rpcUrl: string;
  callList: WalletExecutionCall[];
  mode?: AAExecutionMode;
  apiKey?: string;
  gasPolicyId?: string;
  sponsored?: boolean;
}

interface CreatePimlicoAAStateOptions {
  chain: Chain;
  owner: CreateAAOwner;
  rpcUrl: string;
  callList: WalletExecutionCall[];
  mode?: AAExecutionMode;
  apiKey?: string;
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
    return createAlchemyAAState({
      chain: options.chain,
      owner: options.owner,
      rpcUrl: options.rpcUrl,
      callList: options.callList,
      mode: options.mode,
      apiKey: options.apiKey,
      gasPolicyId: options.gasPolicyId,
      sponsored: options.sponsored,
    });
  }

  return createPimlicoAAState({
    chain: options.chain,
    owner: options.owner,
    rpcUrl: options.rpcUrl,
    callList: options.callList,
    mode: options.mode,
    apiKey: options.apiKey,
  });
}

function getOwnerParams(owner: CreateAAOwner | undefined) {
  if (!owner) {
    return null;
  }

  if ("privateKey" in owner) {
    return {
      para: undefined as never,
      signer: privateKeyToAccount(owner.privateKey),
    };
  }

  if ("signer" in owner) {
    return {
      para: owner.para as never,
      signer: owner.signer as never,
      ...(owner.address ? { address: owner.address } : {}),
    };
  }

  if ("para" in owner) {
    return {
      para: owner.para as never,
      ...(owner.address ? { address: owner.address } : {}),
    };
  }

  return null;
}

function getMissingOwnerState(
  plan: AAProviderState["plan"],
  provider: AAProvider,
): AAProviderState {
  return {
    plan,
    AA: null,
    isPending: false,
    error: new Error(
      `${provider} AA account creation requires a signer or Para session.`,
    ),
  };
}

// ---------------------------------------------------------------------------
// Alchemy
// ---------------------------------------------------------------------------

async function createAlchemyAAState(
  options: CreateAlchemyAAStateOptions,
): Promise<AAProviderState> {
  const {
    chain,
    owner,
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
    apiKey: options.apiKey,
    gasPolicyId: options.gasPolicyId,
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

  const ownerParams = getOwnerParams(owner);
  if (!ownerParams) {
    return getMissingOwnerState(plan, "alchemy");
  }

  try {
    const smartAccount = await createAlchemySmartAccount({
      ...ownerParams,
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
  options: CreatePimlicoAAStateOptions,
): Promise<AAProviderState> {
  const {
    chain,
    owner,
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
    apiKey: options.apiKey,
  });

  if (!resolved) {
    throw new Error("Pimlico AA config resolution failed.");
  }

  const apiKey = options.apiKey ?? resolved.apiKey;
  const plan = {
    ...resolved.plan,
    fallbackToEoa: false,
  } as AAProviderState["plan"];

  const ownerParams = getOwnerParams(owner);
  if (!ownerParams) {
    return getMissingOwnerState(plan, "pimlico");
  }

  try {
    const smartAccount = await createPimlicoSmartAccount({
      ...ownerParams,
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
