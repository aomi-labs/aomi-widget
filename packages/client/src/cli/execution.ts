import { createAlchemySmartAccount } from "@getpara/aa-alchemy";
import { createPimlicoSmartAccount } from "@getpara/aa-pimlico";
import type { Chain, Hex, TransactionReceipt } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  DEFAULT_AA_CONFIG,
  DISABLED_PROVIDER_STATE,
  buildAAExecutionPlan,
  getAAChainConfig,
  type AALike,
  type AAExecutionMode,
  type AAProviderState,
  type WalletExecutionCall,
  type WalletPrimitiveCall,
} from "../aa";
import type { CliAAProvider, CliAAMode, CliConfig, CliExecutionMode } from "./types";

type CliExecutionDecision =
  | {
      execution: "eoa";
    }
  | {
      execution: "aa";
      provider: CliAAProvider;
      aaMode: CliAAMode;
    };

const ALCHEMY_API_KEY_ENVS = [
  "ALCHEMY_API_KEY",
  "NEXT_PUBLIC_ALCHEMY_API_KEY",
] as const;
const ALCHEMY_GAS_POLICY_ENVS = [
  "ALCHEMY_GAS_POLICY_ID",
  "NEXT_PUBLIC_ALCHEMY_GAS_POLICY_ID",
] as const;
const PIMLICO_API_KEY_ENVS = [
  "PIMLICO_API_KEY",
  "NEXT_PUBLIC_PIMLICO_API_KEY",
] as const;

type ParaSmartAccountLike = {
  provider: string;
  mode: AAExecutionMode;
  smartAccountAddress: Hex;
  delegationAddress?: Hex;
  sendTransaction: (
    call: WalletPrimitiveCall,
    options?: unknown,
  ) => Promise<TransactionReceipt>;
  sendBatchTransaction: (
    calls: WalletPrimitiveCall[],
    options?: unknown,
  ) => Promise<TransactionReceipt>;
};

function readFirstEnv(names: readonly string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

function isProviderConfigured(provider: CliAAProvider): boolean {
  return provider === "alchemy"
    ? Boolean(readFirstEnv(ALCHEMY_API_KEY_ENVS))
    : Boolean(readFirstEnv(PIMLICO_API_KEY_ENVS));
}

function resolveDefaultProvider(): CliAAProvider {
  if (isProviderConfigured("alchemy")) return "alchemy";
  if (isProviderConfigured("pimlico")) return "pimlico";
  throw new Error(
    "AA requires provider credentials. Set ALCHEMY_API_KEY or PIMLICO_API_KEY, or use --eoa.",
  );
}

function resolveAAProvider(config: CliConfig): CliAAProvider {
  const provider = config.aaProvider ?? resolveDefaultProvider();
  if (!isProviderConfigured(provider)) {
    const envName =
      provider === "alchemy" ? "ALCHEMY_API_KEY" : "PIMLICO_API_KEY";
    throw new Error(
      `AA provider "${provider}" is selected but ${envName} is not configured.`,
    );
  }
  return provider;
}

function resolveAAPlan(params: {
  provider: CliAAProvider;
  chain: Chain;
  callList: WalletExecutionCall[];
  requestedMode?: CliAAMode;
}) {
  const { provider, chain, callList, requestedMode } = params;
  const chainIds = Array.from(new Set(callList.map((call) => call.chainId)));
  if (chainIds.length > 1) {
    throw new Error("AA batch execution requires all selected transactions to be on the same chain.");
  }

  const config = {
    ...DEFAULT_AA_CONFIG,
    provider,
    fallbackToEoa: false,
  };
  const chainConfig = getAAChainConfig(config, callList, { [chain.id]: chain });

  if (!chainConfig) {
    throw new Error(`AA is not configured for chain ${chain.id}, or batching is disabled for that chain.`);
  }

  if (requestedMode && !chainConfig.supportedModes.includes(requestedMode)) {
    throw new Error(
      `AA mode "${requestedMode}" is not supported on chain ${chain.id}.`,
    );
  }

  const resolvedChainConfig = requestedMode
    ? {
        ...chainConfig,
        defaultMode: requestedMode,
      }
    : chainConfig;

  return buildAAExecutionPlan(config, resolvedChainConfig);
}

function adaptSmartAccount(account: ParaSmartAccountLike): AALike {
  return {
    provider: account.provider,
    mode: account.mode,
    AAAddress: account.smartAccountAddress,
    delegationAddress: account.delegationAddress,
    sendTransaction: async (call) => {
      const receipt = await account.sendTransaction(call);
      return { transactionHash: receipt.transactionHash };
    },
    sendBatchTransaction: async (calls) => {
      const receipt = await account.sendBatchTransaction(calls);
      return { transactionHash: receipt.transactionHash };
    },
  };
}

export function resolveCliExecutionDecision(params: {
  config: CliConfig;
  chain: Chain;
  callList: WalletExecutionCall[];
}): CliExecutionDecision {
  const { config, chain, callList } = params;

  if (config.execution === "eoa") {
    return { execution: "eoa" };
  }

  const provider = resolveAAProvider(config);
  const plan = resolveAAPlan({
    provider,
    chain,
    callList,
    requestedMode: config.aaMode,
  });

  return {
    execution: "aa",
    provider,
    aaMode: plan.mode,
  };
}

export function isAlchemySponsorshipLimitError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLowerCase();
  return (
    normalized.includes("gas sponsorship limit") ||
    normalized.includes("put your team over your gas sponsorship limit") ||
    normalized.includes("buy gas credits in your gas manager dashboard")
  );
}

async function createAlchemyProviderState(params: {
  chain: Chain;
  privateKey: `0x${string}`;
  rpcUrl: string;
  aaMode: CliAAMode;
  callList: WalletExecutionCall[];
  sponsored?: boolean;
}): Promise<AAProviderState> {
  const { chain, privateKey, rpcUrl, aaMode, callList, sponsored = true } = params;
  const apiKey = readFirstEnv(ALCHEMY_API_KEY_ENVS);

  if (!apiKey) {
    throw new Error("Alchemy AA requires ALCHEMY_API_KEY.");
  }

  const gasPolicyId = sponsored ? readFirstEnv(ALCHEMY_GAS_POLICY_ENVS) : undefined;
  const resolvedPlan = resolveAAPlan({
    provider: "alchemy",
    chain,
    callList,
    requestedMode: aaMode,
  });
  const plan = {
    ...resolvedPlan,
    sponsorship: gasPolicyId ? resolvedPlan.sponsorship : "disabled",
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
      mode: plan.mode,
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

async function createPimlicoProviderState(params: {
  chain: Chain;
  privateKey: `0x${string}`;
  rpcUrl: string;
  aaMode: CliAAMode;
  callList: WalletExecutionCall[];
}): Promise<AAProviderState> {
  const { chain, privateKey, rpcUrl, aaMode, callList } = params;
  const apiKey = readFirstEnv(PIMLICO_API_KEY_ENVS);

  if (!apiKey) {
    throw new Error("Pimlico AA requires PIMLICO_API_KEY.");
  }

  const plan = resolveAAPlan({
    provider: "pimlico",
    chain,
    callList,
    requestedMode: aaMode,
  });
  const signer = privateKeyToAccount(privateKey);

  try {
    const smartAccount = await createPimlicoSmartAccount({
      para: undefined as never,
      signer,
      apiKey,
      chain,
      rpcUrl,
      mode: plan.mode,
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

export async function createCliProviderState(params: {
  decision: CliExecutionDecision;
  chain: Chain;
  privateKey: `0x${string}`;
  rpcUrl: string;
  callList: WalletExecutionCall[];
  sponsored?: boolean;
}): Promise<AAProviderState> {
  const { decision, chain, privateKey, rpcUrl, callList, sponsored } = params;

  if (decision.execution === "eoa") {
    return DISABLED_PROVIDER_STATE;
  }

  if (decision.provider === "alchemy") {
    return createAlchemyProviderState({
      chain,
      privateKey,
      rpcUrl,
      aaMode: decision.aaMode,
      callList,
      sponsored,
    });
  }

  return createPimlicoProviderState({
    chain,
    privateKey,
    rpcUrl,
    aaMode: decision.aaMode,
    callList,
  });
}

export function describeExecutionDecision(
  decision: CliExecutionDecision,
): string {
  if (decision.execution === "eoa") {
    return "eoa";
  }

  return `aa (${decision.provider}, ${decision.aaMode})`;
}
