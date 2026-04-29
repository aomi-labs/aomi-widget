import type { Chain, Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { adaptSmartAccount } from "../adapt";
import type { AAState, SmartAccount, AAMode, AAWalletCall } from "../types";
import {
  DEFAULT_AA_CONFIG,
  getAAChainConfig,
  buildAAExecutionPlan,
} from "../types";
import {
  getMissingOwnerState,
  getOwnerParams,
  getUnsupportedAdapterState,
  type AAOwner,
} from "../owner";
import { resolveAlchemyApiKey, resolveAlchemyGasPolicyId } from "./defaults";

const ALCHEMY_7702_DELEGATION_ADDRESS =
  "0x69007702764179f14F51cdce752f4f775d74E139" as Hex;
const AA_DEBUG_ENABLED = process.env.AOMI_AA_DEBUG === "1";

function aaDebug(message: string, fields?: Record<string, unknown>): void {
  if (!AA_DEBUG_ENABLED) return;
  if (fields) {
    console.debug(`[aomi][aa][alchemy] ${message}`, fields);
    return;
  }
  console.debug(`[aomi][aa][alchemy] ${message}`);
}

/** Shared params for the direct-owner 4337/7702 paths. */
interface AlchemyDirectOwnerParams {
  resolved: NonNullable<AAState["resolved"]>;
  chain: Chain;
  privateKey: `0x${string}`;
  apiKey?: string;
  proxyBaseUrl?: string;
  gasPolicyId?: string;
}

type ReadyOwnerParams = Extract<
  ReturnType<typeof getOwnerParams>,
  { kind: "ready" }
>["ownerParams"];

async function createAlchemySdkState(params: {
  resolved: NonNullable<AAState["resolved"]>;
  ownerParams: ReadyOwnerParams;
  chain: Chain;
  rpcUrl: string;
  apiKey: string;
  mode: AAMode;
  gasPolicyId?: string;
}): Promise<AAState> {
  const { createAlchemySmartAccount } = await import("@getpara/aa-alchemy");
  const smartAccount = await createAlchemySmartAccount({
    ...params.ownerParams,
    apiKey: params.apiKey,
    gasPolicyId: params.gasPolicyId,
    chain: params.chain,
    rpcUrl: params.rpcUrl,
    mode: params.mode,
  });

  if (!smartAccount) {
    return {
      resolved: params.resolved,
      account: null,
      pending: false,
      error: new Error("Alchemy AA account could not be initialized."),
    };
  }

  return {
    resolved: params.resolved,
    account: adaptSmartAccount(smartAccount),
    pending: false,
    error: null,
  };
}

export interface CreateAlchemyAAStateOptions {
  chain: Chain;
  owner: AAOwner;
  rpcUrl: string;
  callList: AAWalletCall[];
  mode?: AAMode;
  /** Alchemy API key for BYOK. Omit to use proxy. */
  apiKey?: string;
  gasPolicyId?: string;
  sponsored?: boolean;
  /** Backend proxy base URL. Used when apiKey is omitted. */
  proxyBaseUrl?: string;
}

export async function createAlchemyAAState(
  options: CreateAlchemyAAStateOptions,
): Promise<AAState> {
  const {
    chain,
    owner,
    callList,
    mode,
    sponsored = true,
  } = options;
  const apiKey = resolveAlchemyApiKey({ apiKey: options.apiKey });
  const resolvedGasPolicyId = resolveAlchemyGasPolicyId({
    gasPolicyId: options.gasPolicyId,
  });

  const chainConfig = getAAChainConfig(DEFAULT_AA_CONFIG, callList, {
    [chain.id]: chain,
  });
  if (!chainConfig) {
    throw new Error(`AA is not configured for chain ${chain.id}.`);
  }

  const effectiveMode = mode ?? chainConfig.defaultMode;
  const plan = buildAAExecutionPlan(
    { ...DEFAULT_AA_CONFIG, provider: "alchemy" },
    { ...chainConfig, defaultMode: effectiveMode },
  );

  const requestedGasPolicyId = sponsored ? resolvedGasPolicyId : undefined;
  const gasPolicyId = requestedGasPolicyId;

  const execution = {
    ...plan,
    mode: effectiveMode,
    sponsorship: gasPolicyId ? plan.sponsorship : "disabled",
    fallbackToEoa: false,
  } as AAState["resolved"];

  const ownerParams = getOwnerParams(owner);
  if (ownerParams.kind === "missing") {
    return getMissingOwnerState(execution, "alchemy");
  }
  if (ownerParams.kind === "unsupported_adapter") {
    return getUnsupportedAdapterState(execution, ownerParams.adapter);
  }

  if (owner.kind === "direct") {
    const directParams: AlchemyDirectOwnerParams = {
      resolved: execution!,
      chain,
      privateKey: owner.privateKey,
      apiKey,
      proxyBaseUrl: options.proxyBaseUrl,
      gasPolicyId,
    };
    try {
      return await createAlchemyWalletApisState(directParams);
    } catch (error) {
      return {
        resolved: execution,
        account: null,
        pending: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  // Session/adapter path — requires a real API key (no proxy support)
  if (!apiKey) {
    return {
      resolved: execution,
      account: null,
      pending: false,
      error: new Error(
        "Alchemy AA with session/adapter owner requires ALCHEMY_API_KEY.",
      ),
    };
  }

  try {
    return await createAlchemySdkState({
      resolved: execution!,
      ownerParams: ownerParams.ownerParams,
      chain,
      rpcUrl: options.rpcUrl,
      apiKey,
      gasPolicyId,
      mode: execution!.mode,
    });
  } catch (error) {
    return {
      resolved: execution,
      account: null,
      pending: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

// ---------------------------------------------------------------------------
// Alchemy Wallet APIs — 4337 (bundled UserOperation via @alchemy/wallet-apis)
// ---------------------------------------------------------------------------
// Alchemy's bundler enforces full signature validation during
// eth_estimateUserOperationGas, making client-side userOp construction
// impossible (chicken-and-egg: can't sign without gas values, can't
// estimate without valid signature). The wallet_prepareCalls RPC
// handles estimation + paymaster + signing server-side.

async function createAlchemyWalletApisState(
  params: AlchemyDirectOwnerParams,
): Promise<AAState> {
  const { createSmartWalletClient, alchemyWalletTransport } = await import(
    "@alchemy/wallet-apis"
  );

  const transport = params.proxyBaseUrl
    ? alchemyWalletTransport({ url: params.proxyBaseUrl })
    : alchemyWalletTransport({ apiKey: params.apiKey! });

  const signer = privateKeyToAccount(params.privateKey);
  const alchemyClient = createSmartWalletClient({
    transport,
    chain: params.chain,
    signer,
    ...(params.gasPolicyId ? { paymaster: { policyId: params.gasPolicyId } } : {}),
  });

  const signerAddress = signer.address as Hex;
  let accountAddress = signerAddress;

  if (params.resolved.mode === "4337") {
    aaDebug("4337:requestAccount:start", {
      signerAddress,
      chainId: params.chain.id,
      hasGasPolicyId: Boolean(params.gasPolicyId),
    });

    const account = await alchemyClient.requestAccount();
    accountAddress = account.address as Hex;
    aaDebug("4337:requestAccount:done", { signerAddress, accountAddress });
  }

  const sendCalls = async (
    calls: Array<{ to: Hex; value: bigint; data?: Hex }>,
  ): Promise<{ transactionHash: string }> => {
    aaDebug(`${params.resolved.mode}:sendCalls:start`, {
      signerAddress,
      accountAddress,
      chainId: params.chain.id,
      callCount: calls.length,
      hasGasPolicyId: Boolean(params.gasPolicyId),
    });
    try {
      const result = await alchemyClient.sendCalls({
        ...(params.resolved.mode === "4337" ? { account: accountAddress } : {}),
        calls,
      });
      aaDebug(`${params.resolved.mode}:sendCalls:submitted`, { callId: result.id });

      const status = await alchemyClient.waitForCallsStatus({ id: result.id });
      const transactionHash = status.receipts?.[0]?.transactionHash;
      aaDebug(`${params.resolved.mode}:sendCalls:receipt`, {
        callId: result.id,
        hasTransactionHash: Boolean(transactionHash),
        receipts: status.receipts?.length ?? 0,
      });
      if (!transactionHash) {
        throw new Error("Alchemy Wallets API did not return a transaction hash.");
      }
      return { transactionHash };
    } catch (error) {
      aaDebug(`${params.resolved.mode}:sendCalls:error`, {
        signerAddress,
        accountAddress,
        chainId: params.chain.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };

  const smartAccount: SmartAccount = {
    provider: "alchemy",
    mode: params.resolved.mode,
    AAAddress: accountAddress,
    delegationAddress:
      params.resolved.mode === "7702"
        ? ALCHEMY_7702_DELEGATION_ADDRESS
        : undefined,
    sendTransaction: async (call) => sendCalls([call]),
    sendBatchTransaction: async (calls) => sendCalls(calls),
  };

  return {
    resolved: params.resolved,
    account: smartAccount,
    pending: false,
    error: null,
  };
}
