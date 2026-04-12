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
        smartAccount: null,
        pending: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  // Session/adapter path — requires a real API key (no proxy support)
  if (!options.apiKey) {
    return {
      resolved: execution,
      smartAccount: null,
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
        smartAccount: null,
        pending: false,
        error: new Error("Alchemy AA account could not be initialized."),
      };
    }

    return {
      resolved: execution,
      smartAccount: adaptSmartAccount(smartAccount),
      pending: false,
      error: null,
    };
  } catch (error) {
    return {
      resolved: execution,
      smartAccount: null,
      pending: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

// ---------------------------------------------------------------------------
// Alchemy Wallet APIs (direct owner, supports proxy transport)
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
  const { createSmartWalletClient, alchemyWalletTransport } = await import(
    "@alchemy/wallet-apis"
  );

  // Proxy: point transport at backend. BYOK: use API key directly.
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
  if (params.mode === "4337") {
    const accountId = deriveAlchemy4337AccountId(signerAddress);
    aaDebug("requestAccount:start", {
      signerAddress,
      chainId: params.chain.id,
      accountId,
      proxyBaseUrl: params.proxyBaseUrl,
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

      aaDebug("requestAccount:existing-account", {
        signerAddress,
        accountId,
        existingAccountAddress,
      });
      account = await alchemyClient.requestAccount({
        accountAddress: existingAccountAddress,
      });
    }
    accountAddress = account.address as Hex;
    aaDebug("requestAccount:done", {
      signerAddress,
      accountAddress,
      accountId,
      sameAsSigner:
        accountAddress.toLowerCase() === signerAddress.toLowerCase(),
    });
  }

  const sendCalls = async (
    calls: Array<{ to: Hex; value: bigint; data?: Hex }>,
  ): Promise<{ transactionHash: string }> => {
    aaDebug("sendCalls:start", {
      mode: params.mode,
      signerAddress,
      accountAddress,
      chainId: params.chain.id,
      calls: calls.map((call) => ({
        to: call.to,
        value: call.value.toString(),
        data: call.data ?? "0x",
      })),
      proxyBaseUrl: params.proxyBaseUrl,
      hasGasPolicyId: Boolean(params.gasPolicyId),
    });
    try {
      const result = await alchemyClient.sendCalls({
        ...(params.mode === "4337" ? { account: accountAddress } : {}),
        calls,
      });
      aaDebug("sendCalls:submitted", { callId: result.id });

      const status = await alchemyClient.waitForCallsStatus({ id: result.id });
      const transactionHash = status.receipts?.[0]?.transactionHash;
      aaDebug("sendCalls:status", {
        callId: result.id,
        hasTransactionHash: Boolean(transactionHash),
        receipts: status.receipts?.length ?? 0,
        status,
      });
      if (!transactionHash) {
        throw new Error("Alchemy Wallets API did not return a transaction hash.");
      }
      return { transactionHash };
    } catch (error) {
      aaDebug("sendCalls:error", {
        mode: params.mode,
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
    mode: params.mode,
    AAAddress: accountAddress,
    delegationAddress: params.mode === "7702" ? ALCHEMY_7702_DELEGATION_ADDRESS : undefined,
    sendTransaction: async (call) => sendCalls([call]),
    sendBatchTransaction: async (calls) => sendCalls(calls),
  };

  return {
    resolved: params.resolved,
    smartAccount: smartAccount,
    pending: false,
    error: null,
  };
}
