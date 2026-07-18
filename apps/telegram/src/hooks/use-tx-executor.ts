// @ts-nocheck
'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAccount, useWalletClient } from 'wagmi';
import { useClient } from '@getpara/react-sdk';
import type { Chain, Hex } from 'viem';

import {
  buildAAExecutionPlan,
  createAAProviderState,
  DEFAULT_AA_CONFIG,
  executeWalletCalls,
  getAAChainConfig,
  getWalletExecutorReady,
  resolvePimlicoConfig,
  type AAOwner,
  type AAResolvedConfig,
  type AAState,
  type AAWalletCall,
  type AAProvider,
  type ExecutionResult,
  type SmartAccount,
  type PimlicoResolvedConfig,
} from '@aomi-labs/client';

import { CHAIN_BY_ID } from '@/lib/chains';
import { getPreferredRpcUrl } from '@/lib/rpc';
import type { TxCall } from '@/lib/wallet-state/types';

// Re-export for consumers
export type TransactionExecutionResult = ExecutionResult;

type TopicProviderState = AAState & {
  plan: AAResolvedConfig | null;
  AA: SmartAccount | null | undefined;
};

function toWalletExecutionCall(call: TxCall): AAWalletCall {
  return {
    to: call.to as Hex,
    value: BigInt(call.value),
    data: call.data as Hex | undefined,
    chainId: call.chainId,
  };
}

// ---------------------------------------------------------------------------
// Env vars (static access for Next.js client-side)
// ---------------------------------------------------------------------------

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY?.trim() || '';
const PIMLICO_API_KEY = process.env.NEXT_PUBLIC_PIMLICO_API_KEY?.trim() || '';
const ALCHEMY_GAS_POLICY_ID = process.env.NEXT_PUBLIC_ALCHEMY_GAS_POLICY_ID?.trim();
const AA_PROVIDER = normalizeAAProvider(process.env.NEXT_PUBLIC_AA_PROVIDER);

type AAProviderPreference = AAProvider | 'auto';
type AlchemyProviderConfig = AAResolvedConfig & {
  provider: 'alchemy';
  chain: Chain;
  rpcUrl: string;
  apiKey?: string;
  gasPolicyId?: string;
};

type ResolvedProviderConfig =
  | AlchemyProviderConfig
  | (PimlicoResolvedConfig & { provider: 'pimlico' });

function normalizeAAProvider(value: string | undefined): AAProviderPreference {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'alchemy' || normalized === 'pimlico') {
    return normalized;
  }
  return 'auto';
}

function getSelectedAAProvider(): AAProvider | null {
  if (AA_PROVIDER === 'alchemy' || AA_PROVIDER === 'pimlico') {
    return AA_PROVIDER;
  }
  if (ALCHEMY_API_KEY) {
    return 'alchemy';
  }
  if (PIMLICO_API_KEY) {
    return 'pimlico';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Config Resolution (using client package with pre-resolved env vars)
// ---------------------------------------------------------------------------

function resolveConfig(
  calls: AAWalletCall[] | null,
  localPrivateKey: `0x${string}` | null,
  modeOverride?: '4337' | '7702',
): ResolvedProviderConfig | null {
  const provider = getSelectedAAProvider();

  if (provider === 'pimlico') {
    const resolved = resolvePimlicoConfig({
      calls,
      localPrivateKey,
      chainsById: CHAIN_BY_ID as never,
      publicOnly: true,
      apiKey: PIMLICO_API_KEY || undefined,
      modeOverride,
    });

    return resolved ? { ...resolved, provider } : null;
  }

  if (provider !== 'alchemy') {
    return null;
  }

  if (!calls || localPrivateKey) {
    return null;
  }

  const config = { ...DEFAULT_AA_CONFIG, provider };
  const chainConfig = getAAChainConfig(config, calls, CHAIN_BY_ID as never);
  if (!chainConfig) {
    return null;
  }

  if (modeOverride && !chainConfig.supportedModes.includes(modeOverride)) {
    return null;
  }

  const effectiveChainConfig = modeOverride
    ? { ...chainConfig, defaultMode: modeOverride }
    : chainConfig;
  const plan = buildAAExecutionPlan(config, effectiveChainConfig);
  const chain = CHAIN_BY_ID[effectiveChainConfig.chainId];
  if (!chain) {
    return null;
  }

  return {
    ...plan,
    provider,
    chain,
    rpcUrl: getPreferredRpcUrl(chain),
    apiKey: ALCHEMY_API_KEY || undefined,
    gasPolicyId: ALCHEMY_GAS_POLICY_ID || undefined,
    sponsorship: ALCHEMY_GAS_POLICY_ID ? plan.sponsorship : 'disabled',
  };
}

// ---------------------------------------------------------------------------
// Account Abstraction Hook
// ---------------------------------------------------------------------------

function useAAProvider(
  calls: AAWalletCall[] | null,
  localPrivateKey: `0x${string}` | null,
): TopicProviderState {
  const para = useClient();
  const { address, connector, isConnected } = useAccount();
  const { data: walletClient, isLoading: isWalletClientLoading } = useWalletClient();
  const connectorName = connector?.name?.toLowerCase() ?? '';
  const isParaWallet = connectorName.includes('para');
  const shouldUseExternalSigner = Boolean(walletClient && !isParaWallet);
  const modeOverride = shouldUseExternalSigner ? '4337' : undefined;

  const resolved = resolveConfig(calls, localPrivateKey, modeOverride);
  const resolvedGasPolicyId =
    resolved?.provider === 'alchemy' ? resolved.gasPolicyId ?? null : null;

  // Para client exists = we have an active Para session
  const hasParaSession = Boolean(para);

  const query = useQuery({
    queryKey: [
      'SMART_ACCOUNT',
      resolved?.provider ?? null,
      hasParaSession,
      shouldUseExternalSigner,
      isConnected,
      address ?? null,
      connector?.id ?? null,
      resolved?.apiKey ?? null,
      resolved?.chain?.id ?? null,
      resolved?.rpcUrl ?? null,
      resolvedGasPolicyId,
      resolved?.mode ?? null,
    ],
    enabled: Boolean(
      resolved
      && !isWalletClientLoading
      && (
        hasParaSession
        || shouldUseExternalSigner
      ),
    ),
    queryFn: async (): Promise<AAState> => {
      if (!resolved) {
        return {
          resolved: null,
          account: null,
          pending: false,
          error: null,
        };
      }

      const ownerParams: AAOwner | null = para
        ? shouldUseExternalSigner
          ? {
              kind: 'session',
              adapter: 'para',
              session: para,
              signer: walletClient,
              address: address as Hex | undefined,
            }
          : {
              kind: 'session',
              adapter: 'para',
              session: para,
              address: address as Hex | undefined,
            }
        : null;

      if (!ownerParams) {
        return {
          resolved,
          account: null,
          pending: false,
          error: new Error('AA owner is not ready.'),
        };
      }

      return createAAProviderState({
        provider: resolved.provider,
        owner: ownerParams,
        chain: resolved.chain,
        rpcUrl: resolved.rpcUrl ?? getPreferredRpcUrl(resolved.chain),
        callList: calls ?? [],
        mode: resolved.mode,
        apiKey: resolved.apiKey,
        gasPolicyId:
          resolved.provider === 'alchemy' ? resolved.gasPolicyId : undefined,
      });
    },
  });

  const queryState = query.data;
  const effectivePlan = queryState?.resolved ?? resolved ?? null;

  return {
    resolved: effectivePlan,
    account: queryState?.account,
    pending: Boolean(resolved && query.isPending),
    error: query.error ?? queryState?.error ?? null,
    plan: effectivePlan,
    AA: queryState?.account,
  };
}

// ---------------------------------------------------------------------------
// Transaction Executor Hook
// ---------------------------------------------------------------------------

interface UseTxExecutorParams {
  calls: TxCall[] | null;
  currentChainId: number;
  capabilities: Record<string, { atomic?: { status?: string } }> | undefined;
  localPrivateKey: `0x${string}` | null;
  sendCallsSyncAsync: (args: {
    calls: Array<{ to: Hex; value: bigint; data?: Hex }>;
    capabilities?: {
      atomic?: {
        required?: boolean;
      };
    };
  }) => Promise<unknown>;
  sendTransactionAsync: (args: {
    chainId: number;
    to: Hex;
    value: bigint;
    data?: Hex;
  }) => Promise<string>;
  switchChainAsync: (params: { chainId: number }) => Promise<unknown>;
}

export function useTxExecutor({
  calls,
  currentChainId,
  capabilities,
  localPrivateKey,
  sendCallsSyncAsync,
  sendTransactionAsync,
  switchChainAsync,
}: UseTxExecutorParams) {
  const { isConnected } = useAccount();
  const walletCalls = calls?.map(toWalletExecutionCall) ?? null;
  const effectiveLocalPrivateKey = isConnected ? null : localPrivateKey;

  const providerState = useAAProvider(walletCalls, effectiveLocalPrivateKey);
  const executorReady = getWalletExecutorReady(providerState);

  const execute = useMemo(() => {
    return async (callList: TxCall[]): Promise<TransactionExecutionResult> => {
      return executeWalletCalls({
        callList: callList.map(toWalletExecutionCall),
        currentChainId,
        capabilities,
        localPrivateKey: effectiveLocalPrivateKey,
        providerState,
        sendCallsSyncAsync,
        sendTransactionAsync,
        switchChainAsync,
        chainsById: CHAIN_BY_ID as never,
        getPreferredRpcUrl,
      });
    };
  }, [
    currentChainId,
    capabilities,
    effectiveLocalPrivateKey,
    providerState,
    sendCallsSyncAsync,
    sendTransactionAsync,
    switchChainAsync,
  ]);

  return {
    executorReady,
    providerState,
    execute,
  };
}
