import type { Chain, Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { adaptSmartAccount } from "../adapt";
import type { AAState, SmartAccount, AAMode, WalletCall } from "../types";
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

const ALCHEMY_7702_DELEGATION_ADDRESS =
  "0x69007702764179f14F51cdce752f4f775d74E139" as Hex;
const AA_DEBUG_ENABLED = process.env.AOMI_AA_DEBUG === "1";

const ALCHEMY_CHAIN_SLUGS: Record<number, string> = {
  1: "eth-mainnet",
  137: "polygon-mainnet",
  42161: "arb-mainnet",
  10: "opt-mainnet",
  8453: "base-mainnet",
};

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

export interface CreateAlchemyAAStateOptions {
  chain: Chain;
  owner: AAOwner;
  rpcUrl: string;
  callList: WalletCall[];
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

  const gasPolicyId = sponsored
    ? (options.gasPolicyId ?? process.env.ALCHEMY_GAS_POLICY_ID?.trim())
    : undefined;

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
    try {
      return await createAlchemyWalletApisState({
        resolved: execution!,
        chain,
        privateKey: owner.privateKey,
        apiKey: options.apiKey,
        proxyBaseUrl: options.proxyBaseUrl,
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
    const { createAlchemySmartAccount } = await import("@getpara/aa-alchemy");
    const smartAccount = await createAlchemySmartAccount({
      ...ownerParams.ownerParams,
      apiKey: options.apiKey,
      gasPolicyId,
      chain,
      rpcUrl: options.rpcUrl,
      mode: execution!.mode,
    });

    if (!smartAccount) {
      return {
        resolved: execution,
        account: null,
        pending: false,
        error: new Error("Alchemy AA account could not be initialized."),
      };
    }

    return {
      resolved: execution,
      account: adaptSmartAccount(smartAccount),
      pending: false,
      error: null,
    };
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

async function createAlchemy4337State(params: {
  resolved: NonNullable<AAState["resolved"]>;
  chain: Chain;
  privateKey: `0x${string}`;
  apiKey?: string;
  proxyBaseUrl?: string;
  gasPolicyId?: string;
}): Promise<AAState> {
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

async function createAlchemy7702State(params: {
  resolved: NonNullable<AAState["resolved"]>;
  chain: Chain;
  privateKey: `0x${string}`;
  apiKey?: string;
  proxyBaseUrl?: string;
  gasPolicyId?: string;
}): Promise<AAState> {
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

    // 1. Sign EIP-7702 authorization delegating to SMA7702
    const authorization = await walletClient.signAuthorization({
      contractAddress: ALCHEMY_7702_DELEGATION_ADDRESS,
    });
    aaDebug("7702:authorization-signed", {
      contractAddress: ALCHEMY_7702_DELEGATION_ADDRESS,
    });

    // 2. Encode calls via ERC-7821 execute(bytes32 mode, bytes calldata)
    const data = encodeExecuteData({
      calls: calls.map((call) => ({
        to: call.to,
        value: call.value,
        data: call.data ?? ("0x" as Hex),
      })),
    });
    aaDebug("7702:calldata-encoded", { dataLength: data.length });

    // 3. Estimate gas with EIP-7702 authorization intrinsic overhead.
    //    PER_EMPTY_ACCOUNT_COST = 25000 per authorization entry.
    //    viem's estimateGas may not account for this.
    const gasEstimate = await publicClient.estimateGas({
      account: signer,
      to: signerAddress,
      data,
      authorizationList: [authorization],
    });
    const authOverhead = BigInt(25000) * BigInt(authorization ? 1 : 0);
    const gas = gasEstimate + authOverhead;
    aaDebug("7702:gas-estimated", {
      estimate: gasEstimate.toString(),
      authOverhead: authOverhead.toString(),
      total: gas.toString(),
    });

    // 4. Send native type-4 transaction to self (delegation target)
    const hash = await walletClient.sendTransaction({
      to: signerAddress,
      data,
      gas,
      authorizationList: [authorization],
    });
    aaDebug("7702:tx-sent", { hash });

    // 4. Wait for confirmation
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

// ---------------------------------------------------------------------------
// Alchemy Wallet APIs (direct owner — dispatcher)
// ---------------------------------------------------------------------------

async function createAlchemyWalletApisState(params: {
  resolved: NonNullable<AAState["resolved"]>;
  chain: Chain;
  privateKey: `0x${string}`;
  apiKey?: string;
  proxyBaseUrl?: string;
  gasPolicyId?: string;
  mode: AAMode;
}): Promise<AAState> {
  if (params.mode === "7702") {
    return createAlchemy7702State(params);
  }
  return createAlchemy4337State(params);
}
