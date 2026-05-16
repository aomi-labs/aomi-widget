'use client';

import { useEffect, useRef, useState } from 'react';
import { useCapabilities, useSendCallsSync, useSendTransaction } from 'wagmi';
import { useChainId, useSwitchChain } from 'wagmi';
import { useModal } from '@getpara/react-sdk';
import { Providers, initWalletProviders } from './providers';
import { restore } from '@/lib/session-bridge';
import { getTelegramUserId, readyTelegramWebApp } from '@/lib/telegram-webapp';
import {
  useSigningFlow,
  terminalMessageFromTxStatus,
  type SigningFlowConfig,
} from '@/hooks/use-signing-flow';
import { useTxExecutor } from '@/hooks/use-tx-executor';
import type { TxCall } from '@/lib/wallet-state/types';

function describeRuntimeError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error ?? 'unknown error');
  }
}

const TX_CONFIG: SigningFlowConfig<TxCall[]> = {
  apiEndpoint: '/api/operation/tx',
  idParamName: 'tx_id',
  idResponseKey: 'txId',
  dataResponseKey: 'calls',
  resultKey: 'tx_hash',
  terminalMessageFromStatus: terminalMessageFromTxStatus,
  checkLocalPrivateKey: true,
  // Handle both 'calls' array and single 'tx' object from API
  transformData: (json) => {
    const calls = json.calls as TxCall[] | undefined;
    const tx = json.tx as TxCall | undefined;
    return calls ?? (tx ? [tx] : null);
  },
};

function pendingTxCallbackFields(calls: TxCall[]): Record<string, number | number[]> {
  const pendingTxIds = calls
    .map((call) => call.pending_tx_id)
    .filter((id): id is number => typeof id === 'number' && Number.isFinite(id));
  if (pendingTxIds.length === 0) {
    return {};
  }
  return {
    pending_tx_ids: pendingTxIds,
  };
}

function aaResolvedModeFromExecutionKind(kind: string | undefined): '4337' | '7702' | 'none' | undefined {
  if (!kind) return undefined;
  if (kind.endsWith('_4337')) return '4337';
  if (kind.endsWith('_7702')) return '7702';
  if (kind === 'eoa') return 'none';
  return undefined;
}

function SignContent({ restoreDone }: { restoreDone: boolean }) {
  const { openModal } = useModal();
  const capabilitiesQuery = useCapabilities();
  const { sendCallsSyncAsync } = useSendCallsSync();
  const { sendTransactionAsync } = useSendTransaction();
  const currentChainId = useChainId();
  const { switchChainAsync } = useSwitchChain();

  const [state, handlers] = useSigningFlow<TxCall[]>(TX_CONFIG, restoreDone);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const signingStarted = useRef(false);

  const {
    status,
    terminalMessage,
    data: calls,
    requestId: txId,
    localPrivateKey,
    connectionSettled,
    isConnected,
  } = state;
  const { executorReady, providerState, execute } = useTxExecutor({
    calls,
    currentChainId,
    capabilities: capabilitiesQuery.data as Record<string, { atomic?: { status?: string } }> | undefined,
    localPrivateKey,
    sendCallsSyncAsync,
    sendTransactionAsync,
    switchChainAsync,
  });

  // Auto-trigger signing when calls + wallet ready
  useEffect(() => {
    if (!calls || calls.length === 0 || !txId) return;
    if (!restoreDone) return;
    if (!connectionSettled) return;
    if (signingStarted.current) return;
    if (!isConnected && !localPrivateKey) return;
    if (!executorReady) return;

    signingStarted.current = true;
    state.startSigning();
    sign(calls, txId);
  }, [
    calls,
    txId,
    isConnected,
    localPrivateKey,
    restoreDone,
    connectionSettled,
    executorReady,
  ]);

  useEffect(() => {
    function onUnhandledRejection(event: PromiseRejectionEvent) {
      const message = describeRuntimeError(event.reason);
      setRuntimeError(message);
    }

    function onError(event: ErrorEvent) {
      const message = event.error
        ? describeRuntimeError(event.error)
        : event.message || 'Unknown runtime error';
      setRuntimeError(message);
    }

    window.addEventListener('unhandledrejection', onUnhandledRejection);
    window.addEventListener('error', onError);
    return () => {
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
      window.removeEventListener('error', onError);
    };
  }, []);

  async function sign(callList: TxCall[], bundleId: string) {
    try {
      await handlers.reportAwaitingWallet(bundleId);
      const result = await execute(callList);
      const aaRequestedMode =
        providerState.AA?.mode === '4337' || providerState.AA?.mode === '7702'
          ? providerState.AA.mode
          : 'none';
      const aaResolvedMode = aaResolvedModeFromExecutionKind(result.executionKind) ?? aaRequestedMode;
      const aaFallbackReason =
        aaRequestedMode !== 'none' && aaResolvedMode !== aaRequestedMode
          ? `requested_${aaRequestedMode}_fallback_${aaResolvedMode}`
          : undefined;
      await handlers.reportSuccess(bundleId, result.txHash, {
        ...pendingTxCallbackFields(callList),
        aa_requested_mode: aaRequestedMode,
        aa_resolved_mode: aaResolvedMode,
        aa_fallback_reason: aaFallbackReason,
        tx_hashes: result.txHashes,
        execution_kind: result.executionKind,
        call_count: callList.length,
        batched: result.batched,
        sponsored: result.sponsored,
        smart_account_4337: result.AAAddress,
        delegation_7702: result.Delegation7702,
      });
    } catch (err) {
      const executionKind = providerState.AA
        ? `${providerState.AA.provider.toLowerCase()}_${providerState.AA.mode}`
        : undefined;
      const aaRequestedMode =
        providerState.AA?.mode === '4337' || providerState.AA?.mode === '7702'
          ? providerState.AA.mode
          : 'none';
      const aaResolvedMode = aaResolvedModeFromExecutionKind(executionKind) ?? aaRequestedMode;
      await handlers.reportFailure(bundleId, err, {
        ...pendingTxCallbackFields(callList),
        aa_requested_mode: aaRequestedMode,
        aa_resolved_mode: aaResolvedMode,
        aa_fallback_reason: undefined,
        execution_kind: executionKind,
        call_count: callList.length,
        batched: callList.length > 1,
        sponsored: providerState.plan
          ? providerState.plan.sponsorship !== 'disabled'
          : undefined,
        smart_account_4337: providerState.AA?.AAAddress,
        delegation_7702:
          providerState.AA?.mode === '7702' ? providerState.AA.Delegation7702 : undefined,
      });
    }
  }

  return (
    <main className="min-h-screen bg-black flex items-center justify-center text-white text-sm">
      {status === 'loading' && (
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white" />
      )}
      {runtimeError && (
        <div className="max-w-md px-6 text-center">
          <p className="text-base font-medium text-red-300">Runtime error</p>
          <p className="mt-3 break-all text-sm text-white/70">{runtimeError}</p>
        </div>
      )}
      {!runtimeError && status === 'needs_connect' && (
        <div className="max-w-sm px-6 text-center">
          <p className="text-base font-medium">Wallet connection required</p>
          <p className="mt-3 text-sm text-white/65">
            The signing page did not restore an active wallet connection. Reconnect
            your wallet to continue this transaction.
          </p>
          <button
            type="button"
            onClick={() => openModal()}
            className="mt-6 rounded-2xl border border-white/15 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/5"
          >
            Reconnect Wallet
          </button>
        </div>
      )}
      {!runtimeError && status !== 'loading' && status !== 'needs_connect' && (
        <p className="max-w-[92vw] break-all px-4 text-center">
          {terminalMessage ?? 'Approve in your wallet...'}
        </p>
      )}
    </main>
  );
}

export default function SignTransaction() {
  const [ready, setReady] = useState(false);
  const [restoreDone, setRestoreDone] = useState(false);
  const initStarted = useRef(false);

  useEffect(() => {
    if (initStarted.current) return;
    initStarted.current = true;

    readyTelegramWebApp();
    // Don't expand — keep compact so wallet modal fills the viewport
    const queryUserId = new URLSearchParams(window.location.search).get('user_id');
    const userId = getTelegramUserId() ?? queryUserId;
    const init = userId ? restore(userId) : Promise.resolve(false);
    init.then(() => {
      initWalletProviders();
      setReady(true);
      setRestoreDone(true);
    });
  }, []);

  if (!ready) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white" />
      </main>
    );
  }

  return (
    <Providers>
      <SignContent restoreDone={restoreDone} />
    </Providers>
  );
}
