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
import type { AALike } from "./types";

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// CreateAAOwner
// 
//   { kind: "direct", privateKey }

//   - This is local key signing.
//   - The client converts the raw private key into a viem account internally.
//   - Best for CLI/server flows where you already have the key material.

//   { kind: "session", adapter, session, signer?, address? }

//   - This is provider-managed signing.
//   - session is the provider client/session object used to resolve an owner.
//   - signer is optional and can represent an already-resolved signer inside that
//     provider context, such as an external wallet.
//   - address identifies which wallet inside the provider session should own the
//     smart account.
// -------------------------------------------------------------------------
export type CreateAAOwner =
  | {
      kind: "direct";
      privateKey: `0x${string}`;
    }
  | {
      kind: "session";
      // Future adapters such as Privy can be added later. Only "para" is
      // implemented today.
      adapter: string;
      session: unknown;
      signer?: unknown;
      address?: Hex;
    };

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

type DirectOwner = Extract<CreateAAOwner, { kind: "direct" }>;
type SessionOwner = Extract<CreateAAOwner, { kind: "session" }>;

type SDKOwnerParams =
  | {
      para: never;
      signer: ReturnType<typeof privateKeyToAccount>;
    }
  | {
      para: never;
      signer: never;
      address?: Hex;
    }
  | {
      para: never;
      address?: Hex;
    };

type ResolvedOwnerParams =
  | { kind: "ready"; ownerParams: SDKOwnerParams }
  | { kind: "missing" }
  | { kind: "unsupported_adapter"; adapter: string };

function getDirectOwnerParams(owner: DirectOwner): ResolvedOwnerParams {
  return {
    kind: "ready",
    ownerParams: {
      para: undefined as never,
      signer: privateKeyToAccount(owner.privateKey),
    },
  };
}

function getParaSessionOwnerParams(owner: SessionOwner): ResolvedOwnerParams {
  if (owner.signer) {
    return {
      kind: "ready",
      ownerParams: {
        para: owner.session as never,
        signer: owner.signer as never,
        ...(owner.address ? { address: owner.address } : {}),
      },
    };
  }

  return {
    kind: "ready",
    ownerParams: {
      para: owner.session as never,
      ...(owner.address ? { address: owner.address } : {}),
    },
  };
}

function getSessionOwnerParams(owner: SessionOwner): ResolvedOwnerParams {
  switch (owner.adapter) {
    case "para":
      return getParaSessionOwnerParams(owner);
    default:
      return { kind: "unsupported_adapter", adapter: owner.adapter };
  }
}

function getOwnerParams(owner: CreateAAOwner | undefined): ResolvedOwnerParams {
  if (!owner) {
    return { kind: "missing" };
  }

  switch (owner.kind) {
    case "direct":
      return getDirectOwnerParams(owner);
    case "session":
      return getSessionOwnerParams(owner);
  }
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
      `${provider} AA account creation requires a direct owner or a supported session owner.`,
    ),
  };
}

function getUnsupportedAdapterState(
  plan: AAProviderState["plan"],
  adapter: string,
): AAProviderState {
  return {
    plan,
    AA: null,
    isPending: false,
    error: new Error(`Session adapter "${adapter}" is not implemented.`),
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
  if (ownerParams.kind === "missing") {
    return getMissingOwnerState(plan, "alchemy");
  }
  if (ownerParams.kind === "unsupported_adapter") {
    return getUnsupportedAdapterState(plan, ownerParams.adapter);
  }

  if (owner.kind === "direct") {
    try {
      return await createAlchemyWalletApisState({
        plan: plan!,
        chain,
        privateKey: owner.privateKey,
        apiKey,
        gasPolicyId,
        mode: plan!.mode,
      });
    } catch (error) {
      return {
        plan,
        AA: null,
        isPending: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  try {
    const smartAccount = await createAlchemySmartAccount({
      ...ownerParams.ownerParams,
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

async function createAlchemyWalletApisState(params: {
  plan: NonNullable<AAProviderState["plan"]>;
  chain: Chain;
  privateKey: `0x${string}`;
  apiKey: string;
  gasPolicyId?: string;
  mode: AAExecutionMode;
}): Promise<AAProviderState> {
  const { createSmartWalletClient, alchemyWalletTransport } = await import(
    "@alchemy/wallet-apis"
  );

  const signer = privateKeyToAccount(params.privateKey);
  const walletClient = createSmartWalletClient({
    transport: alchemyWalletTransport({ apiKey: params.apiKey }),
    chain: params.chain,
    signer,
    ...(params.gasPolicyId ? { paymaster: { policyId: params.gasPolicyId } } : {}),
  });

  let accountAddress = signer.address as Hex;
  if (params.mode === "4337") {
    const account = await walletClient.requestAccount();
    accountAddress = account.address as Hex;
  }

  const sendCalls = async (
    calls: Array<{ to: Hex; value: bigint; data?: Hex }>,
  ): Promise<{ transactionHash: string }> => {
    const result = await walletClient.sendCalls({
      ...(params.mode === "4337" ? { account: accountAddress } : {}),
      calls,
    });
    const status = await walletClient.waitForCallsStatus({ id: result.id });
    const transactionHash = status.receipts?.[0]?.transactionHash;
    if (!transactionHash) {
      throw new Error("Alchemy Wallets API did not return a transaction hash.");
    }
    return { transactionHash };
  };

  const AA: AALike = {
    provider: "alchemy",
    mode: params.mode,
    AAAddress: accountAddress,
    delegationAddress: params.mode === "7702" ? (signer.address as Hex) : undefined,
    sendTransaction: async (call) => sendCalls([call]),
    sendBatchTransaction: async (calls) => sendCalls(calls),
  };

  return {
    plan: params.plan,
    AA,
    isPending: false,
    error: null,
  };
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
  if (ownerParams.kind === "missing") {
    return getMissingOwnerState(plan, "pimlico");
  }
  if (ownerParams.kind === "unsupported_adapter") {
    return getUnsupportedAdapterState(plan, ownerParams.adapter);
  }

  try {
    const smartAccount = await createPimlicoSmartAccount({
      ...ownerParams.ownerParams,
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
