import type { Chain, Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { adaptSmartAccount } from "../adapt";
import { readEnv } from "../env";
import type { AAState, SmartAccount, AAMode, WalletCall } from "../types";
import {
  getMissingOwnerState,
  getOwnerParams,
  getUnsupportedAdapterState,
  type AAOwner,
} from "../owner";
import { ALCHEMY_GAS_POLICY_ENVS } from "./env";
import { resolveAlchemyConfig } from "./resolve";

const ALCHEMY_7702_DELEGATION_ADDRESS =
  "0x69007702764179f14F51cdce752f4f775d74E139" as Hex;

export interface CreateAlchemyAAStateOptions {
  chain: Chain;
  owner: AAOwner;
  rpcUrl: string;
  callList: WalletCall[];
  mode?: AAMode;
  apiKey?: string;
  gasPolicyId?: string;
  sponsored?: boolean;
}

export async function createAlchemyAAState(
  options: CreateAlchemyAAStateOptions,
): Promise<AAState> {
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

  const execution = {
    ...resolved,
    sponsorship: gasPolicyId ? resolved.sponsorship : "disabled",
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

  try {
    const { createAlchemySmartAccount } = await import("@getpara/aa-alchemy");
    const smartAccount = await createAlchemySmartAccount({
      ...ownerParams.ownerParams,
      apiKey,
      gasPolicyId,
      chain,
      rpcUrl,
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

async function createAlchemyWalletApisState(params: {
  resolved: NonNullable<AAState["resolved"]>;
  chain: Chain;
  privateKey: `0x${string}`;
  apiKey: string;
  gasPolicyId?: string;
  mode: AAMode;
}): Promise<AAState> {
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

  const account: SmartAccount = {
    provider: "alchemy",
    mode: params.mode,
    AAAddress: accountAddress,
    delegationAddress: params.mode === "7702" ? ALCHEMY_7702_DELEGATION_ADDRESS : undefined,
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
