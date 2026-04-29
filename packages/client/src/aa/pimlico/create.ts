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

const AA_DEBUG_ENABLED = process.env.AOMI_AA_DEBUG === "1";

function pimDebug(message: string, fields?: Record<string, unknown>): void {
  if (!AA_DEBUG_ENABLED) return;
  if (fields) {
    console.debug(`[aomi][aa][pimlico] ${message}`, fields);
    return;
  }
  console.debug(`[aomi][aa][pimlico] ${message}`);
}

export interface CreatePimlicoAAStateOptions {
  chain: Chain;
  owner: AAOwner;
  rpcUrl: string;
  callList: AAWalletCall[];
  mode?: AAMode;
  apiKey?: string;
}

export async function createPimlicoAAState(
  options: CreatePimlicoAAStateOptions,
): Promise<AAState> {
  const { chain, owner, callList, mode } = options;

  const chainConfig = getAAChainConfig(DEFAULT_AA_CONFIG, callList, {
    [chain.id]: chain,
  });
  if (!chainConfig) {
    throw new Error(`AA is not configured for chain ${chain.id}.`);
  }

  // Pimlico only supports 4337. Ignore any 7702 default from chain config.
  const effectiveMode: AAMode = "4337";
  const plan = buildAAExecutionPlan(
    { ...DEFAULT_AA_CONFIG, provider: "pimlico" },
    { ...chainConfig, defaultMode: effectiveMode },
  );

  const apiKey = options.apiKey ?? process.env.PIMLICO_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Pimlico AA requires PIMLICO_API_KEY.");
  }

  const execution = {
    ...plan,
    mode: effectiveMode,
  } as AAState["resolved"];

  const ownerParams = getOwnerParams(owner);
  if (ownerParams.kind === "missing") {
    return getMissingOwnerState(execution, "pimlico");
  }
  if (ownerParams.kind === "unsupported_adapter") {
    return getUnsupportedAdapterState(execution, ownerParams.adapter);
  }

  // Direct owner path — build pimlico client from permissionless directly
  if (owner.kind === "direct") {
    try {
      return await createPimlicoDirectState({
        resolved: execution!,
        chain,
        privateKey: owner.privateKey,
        rpcUrl: options.rpcUrl,
        apiKey,
        mode: effectiveMode,
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

  // Session/adapter path — use @getpara/aa-pimlico SDK
  try {
    const { createPimlicoSmartAccount } = await import("@getpara/aa-pimlico");
    const smartAccount = await createPimlicoSmartAccount({
      ...ownerParams.ownerParams,
      apiKey,
      chain,
      rpcUrl: options.rpcUrl,
      mode: execution!.mode,
    });

    if (!smartAccount) {
      return {
        resolved: execution,
        account: null,
        pending: false,
        error: new Error("Pimlico AA account could not be initialized."),
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
// Pimlico direct-owner path (permissionless + viem, no Para SDK)
// ---------------------------------------------------------------------------

function buildPimlicoRpcUrl(chain: Chain, apiKey: string): string {
  const slug = chain.name.toLowerCase().replace(/\s+/g, "-");
  return `https://api.pimlico.io/v2/${slug}/rpc?apikey=${apiKey}`;
}

async function createPimlicoDirectState(params: {
  resolved: NonNullable<AAState["resolved"]>;
  chain: Chain;
  privateKey: `0x${string}`;
  rpcUrl: string;
  apiKey: string;
  mode: AAMode;
}): Promise<AAState> {
  const { createSmartAccountClient } = await import("permissionless");
  const { toSimpleSmartAccount } = await import("permissionless/accounts");
  const { createPimlicoClient } = await import("permissionless/clients/pimlico");
  const { createPublicClient, http } = await import("viem");
  const { entryPoint07Address } = await import("viem/account-abstraction");

  const signer = privateKeyToAccount(params.privateKey);
  const signerAddress = signer.address as Hex;
  const pimlicoRpcUrl = buildPimlicoRpcUrl(params.chain, params.apiKey);

  pimDebug("4337:start", {
    signerAddress,
    chainId: params.chain.id,
    pimlicoRpcUrl: pimlicoRpcUrl.replace(params.apiKey, "***"),
  });

  const publicClient = createPublicClient({
    chain: params.chain,
    transport: http(params.rpcUrl),
  });

  const paymasterClient = createPimlicoClient({
    entryPoint: { address: entryPoint07Address, version: "0.7" },
    transport: http(pimlicoRpcUrl),
  });

  const smartAccount = await toSimpleSmartAccount({
    client: publicClient,
    owner: signer,
    entryPoint: { address: entryPoint07Address, version: "0.7" },
  });

  const accountAddress = smartAccount.address;
  pimDebug("4337:account-created", {
    signerAddress,
    accountAddress,
  });

  const smartAccountClient = createSmartAccountClient({
    account: smartAccount,
    chain: params.chain,
    paymaster: paymasterClient,
    bundlerTransport: http(pimlicoRpcUrl),
    userOperation: {
      estimateFeesPerGas: async () => {
        const gasPrice = await paymasterClient.getUserOperationGasPrice();
        return (gasPrice as { fast: { maxFeePerGas: bigint; maxPriorityFeePerGas: bigint } }).fast;
      },
    },
  });

  const sendCalls = async (
    calls: Array<{ to: Hex; value: bigint; data?: Hex }>,
  ): Promise<{ transactionHash: string }> => {
    pimDebug("4337:send:start", {
      accountAddress,
      chainId: params.chain.id,
      callCount: calls.length,
    });

    const hash = await smartAccountClient.sendTransaction({
      account: smartAccount,
      calls: calls.map((c) => ({
        to: c.to,
        value: c.value,
        data: c.data ?? ("0x" as Hex),
      })),
    } as Parameters<typeof smartAccountClient.sendTransaction>[0]);

    pimDebug("4337:send:userOpHash", { hash });

    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
    });
    pimDebug("4337:send:confirmed", {
      transactionHash: receipt.transactionHash,
      status: receipt.status,
    });

    return { transactionHash: receipt.transactionHash };
  };

  const account: SmartAccount = {
    provider: "pimlico",
    mode: "4337",
    AAAddress: accountAddress,
    sendTransaction: async (call) => sendCalls([call]),
    sendBatchTransaction: async (calls) => sendCalls(calls),
  };

  return {
    resolved: params.resolved,
    account,
    pending: false,
    error: null,
  };
}
