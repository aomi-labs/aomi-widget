import type { Chain, Hex, LocalAccount, WalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import type { AAState, SmartAccount, AAMode, AAWalletCall } from "../types";
import {
  DEFAULT_AA_CONFIG,
  getAAChainConfig,
  buildAAExecutionPlan,
} from "../types";
import { resolveAASponsorship } from "../policy";
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

  const effectiveMode = mode ?? chainConfig.defaultMode;
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
    sponsorship: resolveAASponsorship(effectiveMode, plan.sponsorship),
  } as AAState["resolved"];

  const ownerParams = getOwnerParams(owner);
  if (ownerParams.kind === "missing") {
    return getMissingOwnerState(execution, "pimlico");
  }
  if (ownerParams.kind === "unsupported_adapter") {
    return getUnsupportedAdapterState(execution, ownerParams.adapter);
  }

  const localSessionSigner =
    owner.kind === "session"
      ? resolvePimlicoSessionSigner(ownerParams.ownerParams)
      : null;

  try {
    const signer =
      owner.kind === "direct"
        ? privateKeyToAccount(owner.privateKey)
        : localSessionSigner;

    if (signer) {
      return await createPimlicoPermissionlessState({
        resolved: execution!,
        chain,
        signer,
        externalSigner:
          owner.kind === "session" && "signer" in ownerParams.ownerParams
            ? ownerParams.ownerParams.signer
            : undefined,
        rpcUrl: options.rpcUrl,
        apiKey,
        mode: effectiveMode,
      });
    }

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

    const account = adaptPimlicoSdkAccount(smartAccount);
    return {
      resolved: execution,
      account,
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

function isExternalWalletSigner(signer: unknown): signer is WalletClient {
  return !!signer && typeof signer === "object" && "transport" in signer && "account" in signer;
}

function resolvePimlicoSessionSigner(
  ownerParams: Extract<
    ReturnType<typeof getOwnerParams>,
    { kind: "ready" }
  >["ownerParams"],
) {
  if (!("signer" in ownerParams) || !ownerParams.signer) {
    return null;
  }

  if (!isExternalWalletSigner(ownerParams.signer)) {
    return ownerParams.signer as LocalAccount;
  }

  const account = ownerParams.signer.account;
  if (!account?.address) {
    throw new Error(
      "[resolvePimlicoSessionSigner] WalletClient must have an account set.",
    );
  }

  const externalSigner = ownerParams.signer as WalletClient;
  return {
    address: account.address,
    publicKey: "0x",
    source: "custom",
    type: "local",
    sign: async ({ hash }) =>
      externalSigner.signMessage({
        account: account.address,
        message: { raw: hash },
      } as never),
    signMessage: async ({ message }) =>
      externalSigner.signMessage({
        account: account.address,
        message,
      } as never),
    signTransaction: async (tx) =>
      externalSigner.signTransaction({
        ...tx,
        account,
      } as never),
    signTypedData: async (typedData) =>
      externalSigner.signTypedData({
        ...typedData,
        account: account.address,
      } as never),
    signAuthorization: async () => {
      throw new Error(
        "EIP-7702 account delegation (signAuthorization) is not supported with external wallets.",
      );
    },
  } satisfies LocalAccount;
}

async function ensureExternalWalletChain(
  signer: unknown,
  chain: Chain,
): Promise<void> {
  if (!isExternalWalletSigner(signer)) return;
  const currentChainId = await signer.getChainId();
  if (currentChainId !== chain.id) {
    throw new Error(
      `External wallet is on chain ${currentChainId} but smart account targets chain ${chain.id} (${chain.name}).`,
    );
  }
}

function rejectExternalWallet7702(signer: unknown): void {
  if (!isExternalWalletSigner(signer)) return;
  throw new Error(
    "EIP-7702 mode is not supported with external wallets. Use an embedded wallet or 4337 mode.",
  );
}

function adaptPimlicoSdkAccount(account: {
  provider: string;
  mode: AAMode;
  smartAccountAddress: Hex;
  delegationAddress?: Hex;
  sendTransaction: (
    call: { to: Hex; value: bigint; data?: Hex },
    options?: unknown,
  ) => Promise<{ transactionHash: string }>;
  sendBatchTransaction: (
    calls: Array<{ to: Hex; value: bigint; data?: Hex }>,
    options?: unknown,
  ) => Promise<{ transactionHash: string }>;
}): SmartAccount {
  return {
    provider: account.provider,
    mode: account.mode,
    AAAddress: account.smartAccountAddress,
    delegationAddress: account.delegationAddress,
    sendTransaction: async (call) => account.sendTransaction(call),
    sendBatchTransaction: async (calls) => account.sendBatchTransaction(calls),
  };
}

async function createPimlicoPermissionlessState(params: {
  resolved: NonNullable<AAState["resolved"]>;
  chain: Chain;
  signer: LocalAccount;
  externalSigner?: unknown;
  rpcUrl: string;
  apiKey: string;
  mode: AAMode;
}): Promise<AAState> {
  const { createSmartAccountClient } = await import("permissionless");
  const { toSimpleSmartAccount, to7702SimpleSmartAccount } = await import(
    "permissionless/accounts"
  );
  const { createPimlicoClient } = await import("permissionless/clients/pimlico");
  const { createPublicClient, http } = await import("viem");
  const { entryPoint07Address, entryPoint08Address, prepareUserOperation } =
    await import("viem/account-abstraction");

  const signerAddress = params.signer.address as Hex;
  const pimlicoRpcUrl = buildPimlicoRpcUrl(params.chain, params.apiKey);
  const sponsored = params.resolved.sponsorship !== "disabled";
  const entryPoint =
    params.mode === "7702"
      ? { address: entryPoint08Address, version: "0.8" as const }
      : { address: entryPoint07Address, version: "0.7" as const };

  pimDebug(`${params.mode}:start`, {
    signerAddress,
    chainId: params.chain.id,
    sponsored,
    pimlicoRpcUrl: pimlicoRpcUrl.replace(params.apiKey, "***"),
  });

  const publicClient = createPublicClient({
    chain: params.chain,
    transport: http(params.rpcUrl),
  });

  if (params.mode === "7702") {
    rejectExternalWallet7702(params.externalSigner);
  }

  const paymasterClient = sponsored
    ? createPimlicoClient({
        entryPoint,
        transport: http(pimlicoRpcUrl),
      })
    : undefined;

  const smartAccount =
    params.mode === "7702"
      ? await to7702SimpleSmartAccount({
          client: publicClient,
          owner: params.signer,
          entryPoint: entryPoint as { address: Hex; version: "0.8" },
        })
      : await toSimpleSmartAccount({
          client: publicClient,
          owner: params.signer,
          entryPoint: entryPoint as { address: Hex; version: "0.7" },
        });

  if (params.mode === "7702") {
    (smartAccount as { isDeployed?: () => Promise<boolean> }).isDeployed = async () => false;
  }
  const accountAddress = smartAccount.address;
  pimDebug(`${params.mode}:account-created`, {
    signerAddress,
    accountAddress,
  });

  const userOperation = {
    ...(paymasterClient
      ? {
          estimateFeesPerGas: async () => {
            const gasPrice = await paymasterClient.getUserOperationGasPrice();
            return (gasPrice as {
              fast: { maxFeePerGas: bigint; maxPriorityFeePerGas: bigint };
            }).fast;
          },
        }
      : {}),
    ...(params.mode === "7702"
      ? {
          prepareUserOperation: async (
            client: Parameters<typeof prepareUserOperation>[0],
            args: Parameters<typeof prepareUserOperation>[1],
          ) => {
            const prepared = await prepareUserOperation(client, args);
            if (prepared.authorization && params.signer.signAuthorization) {
              prepared.authorization = await params.signer.signAuthorization({
                contractAddress: prepared.authorization.address,
                chainId: prepared.authorization.chainId,
                nonce: prepared.authorization.nonce,
              });
            }
            return prepared;
          },
        }
      : {}),
  };

  const smartAccountClient = createSmartAccountClient({
    account: smartAccount,
    chain: params.chain,
    bundlerTransport: http(pimlicoRpcUrl),
    ...(paymasterClient ? { paymaster: paymasterClient } : {}),
    userOperation,
  });

  const sendCalls = async (
    calls: Array<{ to: Hex; value: bigint; data?: Hex }>,
  ): Promise<{ transactionHash: string }> => {
    pimDebug(`${params.mode}:send:start`, {
      accountAddress,
      chainId: params.chain.id,
      callCount: calls.length,
    });

    await ensureExternalWalletChain(params.externalSigner, params.chain);

    try {
      const hash = await smartAccountClient.sendTransaction({
        account: smartAccount,
        calls: calls.map((c) => ({
          to: c.to,
          value: c.value,
          data: c.data ?? ("0x" as Hex),
        })),
      } as Parameters<typeof smartAccountClient.sendTransaction>[0]);

      pimDebug(`${params.mode}:send:userOpHash`, { hash });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
      });
      pimDebug(`${params.mode}:send:confirmed`, {
        transactionHash: receipt.transactionHash,
        status: receipt.status,
      });

      return { transactionHash: receipt.transactionHash };
    } catch (error) {
      throw error instanceof Error ? error : new Error(String(error));
    }
  };

  const account: SmartAccount = {
    provider: "pimlico",
    mode: params.mode,
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
