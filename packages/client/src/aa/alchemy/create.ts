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
import { ALCHEMY_CHAIN_SLUGS } from "../../chains";

const ALCHEMY_7702_DELEGATION_ADDRESS =
  "0x69007702764179f14F51cdce752f4f775d74E139" as Hex;
const AA_DEBUG_ENABLED = process.env.AOMI_AA_DEBUG === "1";

/** EIP-7702 intrinsic gas per authorization entry. */
const EIP_7702_AUTH_GAS_OVERHEAD = BigInt(25000);

function alchemyRpcUrl(chainId: number, apiKey: string): string {
  const slug = ALCHEMY_CHAIN_SLUGS[chainId] ?? "eth-mainnet";
  return `https://${slug}.g.alchemy.com/v2/${apiKey}`;
}

function aaDebug(message: string, fields?: Record<string, unknown>): void {
  if (!AA_DEBUG_ENABLED) return;
  if (fields) {
    console.debug(`[aomi][aa][alchemy] ${message}`, fields);
    return;
  }
  console.debug(`[aomi][aa][alchemy] ${message}`);
}

function extractExistingAccountAddress(error: unknown): Hex | null {
  const message = error instanceof Error ? error.message : String(error);
  const match = message.match(/Account with address (0x[a-fA-F0-9]{40}) already exists/);
  return (match?.[1] as Hex | undefined) ?? null;
}

function deriveAlchemy4337AccountId(address: Hex): string {
  const hex = address.toLowerCase().slice(2).padEnd(32, "0").slice(0, 32).split("");
  const namespace = ["4", "3", "3", "7", "5", "a", "a", "b"];
  for (let i = 0; i < namespace.length; i += 1) {
    hex[i] = namespace[i];
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

  const requestedGasPolicyId = sponsored ? options.gasPolicyId : undefined;
  const gasPolicyId = effectiveMode === "7702" ? undefined : requestedGasPolicyId;

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
      apiKey: options.apiKey,
      proxyBaseUrl: options.proxyBaseUrl,
      gasPolicyId,
    };
    try {
      if (execution!.mode === "7702" && options.apiKey) {
        return await createAlchemySdkState({
          resolved: execution!,
          ownerParams: ownerParams.ownerParams,
          chain,
          rpcUrl: options.rpcUrl,
          apiKey: options.apiKey,
          mode: "7702",
          gasPolicyId: undefined,
        });
      }

      return await (execution!.mode === "7702"
        ? createAlchemy7702State(directParams)
        : createAlchemy4337State(directParams));
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
  if (!options.apiKey) {
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
      apiKey: options.apiKey,
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

async function createAlchemy4337State(
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
  const accountId = deriveAlchemy4337AccountId(signerAddress);
  aaDebug("4337:requestAccount:start", {
    signerAddress,
    chainId: params.chain.id,
    accountId,
    hasGasPolicyId: Boolean(params.gasPolicyId),
  });

  let account;
  try {
    account = await alchemyClient.requestAccount({
      signerAddress,
      id: accountId,
      creationHint: {
        accountType: "sma-b",
        createAdditional: true,
      },
    });
  } catch (error) {
    const existingAccountAddress = extractExistingAccountAddress(error);
    if (!existingAccountAddress) {
      throw error;
    }
    aaDebug("4337:requestAccount:existing-account", {
      existingAccountAddress,
    });
    account = await alchemyClient.requestAccount({
      accountAddress: existingAccountAddress,
    });
  }
  const accountAddress = account.address as Hex;
  aaDebug("4337:requestAccount:done", { signerAddress, accountAddress });

  const sendCalls = async (
    calls: Array<{ to: Hex; value: bigint; data?: Hex }>,
  ): Promise<{ transactionHash: string }> => {
    aaDebug("4337:sendCalls:start", {
      signerAddress,
      accountAddress,
      chainId: params.chain.id,
      callCount: calls.length,
      hasGasPolicyId: Boolean(params.gasPolicyId),
    });
    try {
      const result = await alchemyClient.sendCalls({
        account: accountAddress,
        calls,
      });
      aaDebug("4337:sendCalls:submitted", { callId: result.id });

      const status = await alchemyClient.waitForCallsStatus({ id: result.id });
      const transactionHash = status.receipts?.[0]?.transactionHash;
      aaDebug("4337:sendCalls:receipt", {
        callId: result.id,
        hasTransactionHash: Boolean(transactionHash),
        receipts: status.receipts?.length ?? 0,
      });
      if (!transactionHash) {
        throw new Error("Alchemy Wallets API did not return a transaction hash.");
      }
      return { transactionHash };
    } catch (error) {
      aaDebug("4337:sendCalls:error", {
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
    mode: "4337",
    AAAddress: accountAddress,
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
// ---------------------------------------------------------------------------
// Raw EIP-7702 (native type-4 transaction via viem)
// ---------------------------------------------------------------------------

async function createAlchemy7702State(
  params: AlchemyDirectOwnerParams,
): Promise<AAState> {
  const { createWalletClient, createPublicClient, http } = await import("viem");
  const { encodeExecuteData } = await import(
    "viem/experimental/erc7821"
  );

  if (params.gasPolicyId) {
    aaDebug(
      "7702:gas-policy-ignored",
      { gasPolicyId: params.gasPolicyId },
    );
    console.warn(
      "⚠️  Gas policy is not supported for raw EIP-7702 transactions. " +
        "The signer's EOA pays gas directly.",
    );
  }

  const signer = privateKeyToAccount(params.privateKey);
  const signerAddress = signer.address as Hex;

  // Build RPC URL: prefer proxyBaseUrl, then Alchemy BYOK, then fallback.
  let rpcUrl: string | undefined;
  if (params.proxyBaseUrl) {
    rpcUrl = params.proxyBaseUrl;
  } else if (params.apiKey) {
    rpcUrl = alchemyRpcUrl(params.chain.id, params.apiKey);
  }

  const walletClient = createWalletClient({
    account: signer,
    chain: params.chain,
    transport: http(rpcUrl),
  });

  const publicClient = createPublicClient({
    chain: params.chain,
    transport: http(rpcUrl),
  });

  const send7702 = async (
    calls: Array<{ to: Hex; value: bigint; data?: Hex }>,
  ): Promise<{ transactionHash: string }> => {
    aaDebug("7702:send:start", {
      signerAddress,
      chainId: params.chain.id,
      callCount: calls.length,
      calls: calls.map((call) => ({
        to: call.to,
        value: call.value.toString(),
        data: call.data ?? "0x",
      })),
    });

    const authorization = await walletClient.signAuthorization({
      contractAddress: ALCHEMY_7702_DELEGATION_ADDRESS,
    });
    aaDebug("7702:authorization-signed", {
      contractAddress: ALCHEMY_7702_DELEGATION_ADDRESS,
    });

    const data = encodeExecuteData({
      calls: calls.map((call) => ({
        to: call.to,
        value: call.value,
        data: call.data ?? ("0x" as Hex),
      })),
    });
    aaDebug("7702:calldata-encoded", { dataLength: data.length });

    // viem's estimateGas doesn't include EIP-7702 authorization intrinsic cost
    const gasEstimate = await publicClient.estimateGas({
      account: signer,
      to: signerAddress,
      data,
      authorizationList: [authorization],
    });
    const gas = gasEstimate + EIP_7702_AUTH_GAS_OVERHEAD;
    aaDebug("7702:gas-estimated", {
      estimate: gasEstimate.toString(),
      total: gas.toString(),
    });

    const hash = await walletClient.sendTransaction({
      to: signerAddress,
      data,
      gas,
      authorizationList: [authorization],
    });
    aaDebug("7702:tx-sent", { hash });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    aaDebug("7702:tx-confirmed", {
      hash,
      status: receipt.status,
      gasUsed: receipt.gasUsed.toString(),
    });

    if (receipt.status === "reverted") {
      throw new Error(`EIP-7702 transaction reverted: ${hash}`);
    }

    return { transactionHash: hash };
  };

  const smartAccount: SmartAccount = {
    provider: "alchemy",
    mode: "7702",
    AAAddress: signerAddress,
    delegationAddress: ALCHEMY_7702_DELEGATION_ADDRESS,
    sendTransaction: async (call) => send7702([call]),
    sendBatchTransaction: async (calls) => send7702(calls),
  };

  return {
    resolved: params.resolved,
    account: smartAccount,
    pending: false,
    error: null,
  };
}
