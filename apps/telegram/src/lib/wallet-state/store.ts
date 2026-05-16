import { randomUUID } from 'node:crypto';

import {
  DEFAULT_CHAIN_ID,
  WALLET_OP_TTL_CONNECT_MS,
  WALLET_OP_TTL_SIGN_EIP712_MS,
  WALLET_OP_TTL_SIGN_TX_MS,
  WALLET_OP_TTL_SWITCH_NETWORK_MS,
} from '../constants';

import { deriveWalletStateLabel } from './labels';
import type {
  OperationKind,
  OperationLookupResult,
  OperationMetadata,
  OperationStatus,
  TxCall,
  UserWalletState,
  WalletConnectionSource,
  WalletOperation,
} from './types';

const g = globalThis as typeof globalThis & {
  __walletStateByUser?: Map<string, UserWalletState>;
  __walletOperationToUser?: Map<string, string>;
};

const stateByUser = (g.__walletStateByUser ??= new Map<string, UserWalletState>());
const operationToUser = (g.__walletOperationToUser ??= new Map<string, string>());

function now(): number {
  return Date.now();
}

function ttlForKind(kind: OperationKind): number {
  if (kind === 'connect') return WALLET_OP_TTL_CONNECT_MS;
  if (kind === 'switch_network') return WALLET_OP_TTL_SWITCH_NETWORK_MS;
  if (kind === 'sign_tx') return WALLET_OP_TTL_SIGN_TX_MS;
  return WALLET_OP_TTL_SIGN_EIP712_MS;
}

function touch(state: UserWalletState): UserWalletState {
  const next = {
    ...state,
    updatedAt: now(),
  };
  next.label = deriveWalletStateLabel(next);
  return next;
}

function emptyState(userId: string): UserWalletState {
  const base: UserWalletState = {
    userId,
    presence: 'disconnected',
    chainId: null,
    label: 'Wallet disconnected',
    updatedAt: now(),
  };
  base.label = deriveWalletStateLabel(base);
  return base;
}

function getOrInitState(userId: string): UserWalletState {
  const existing = stateByUser.get(userId);
  if (existing) return existing;
  const created = emptyState(userId);
  stateByUser.set(userId, created);
  return created;
}

function terminalizeActiveOperation(
  state: UserWalletState,
  status: Exclude<OperationStatus, 'awaiting_wallet' | 'processing'>,
  errorCode?: string,
  errorMessage?: string,
): UserWalletState {
  const op = state.activeOperation;
  if (!op) return state;

  const terminal: WalletOperation = {
    ...op,
    status,
    errorCode,
    errorMessage,
  };

  const next = touch({
    ...state,
    activeOperation: terminal,
  });

  return next;
}

function preemptIfNeeded(state: UserWalletState): UserWalletState {
  if (!state.activeOperation) return state;
  operationToUser.delete(state.activeOperation.operationId);
  return terminalizeActiveOperation(
    state,
    'canceled',
    'superseded_by_new_operation',
    'A newer operation replaced this request.',
  );
}

function setState(next: UserWalletState): UserWalletState {
  stateByUser.set(next.userId, next);
  return next;
}

function asSignTxMetadata(metadata: OperationMetadata): {
  sessionKey: string;
  calls: TxCall[];
  pendingTxIds?: number[];
  txHash?: string;
  txHashes?: string[];
  aaRequestedMode?: string;
  aaResolvedMode?: string;
  aaFallbackReason?: string;
  executionKind?: string;
  batched?: boolean;
  sponsored?: boolean;
  SmartAccount4337?: string;
  Delegation7702?: string;
  attemptCount: number;
} | null {
  if (!('calls' in metadata)) return null;
  return metadata as {
    sessionKey: string;
    calls: TxCall[];
    pendingTxIds?: number[];
    txHash?: string;
    txHashes?: string[];
    aaRequestedMode?: string;
    aaResolvedMode?: string;
    aaFallbackReason?: string;
    executionKind?: string;
    batched?: boolean;
    sponsored?: boolean;
    SmartAccount4337?: string;
    Delegation7702?: string;
    attemptCount: number;
  };
}

function asSignEip712Metadata(metadata: OperationMetadata): { sessionKey: string; typedData: Record<string, unknown>; description: string; pendingEip712Id?: number; signature?: string; attemptCount: number } | null {
  if (!('typedData' in metadata)) return null;
  return metadata as { sessionKey: string; typedData: Record<string, unknown>; description: string; pendingEip712Id?: number; signature?: string; attemptCount: number };
}

function asSwitchMetadata(metadata: OperationMetadata): { sessionKey: string; chainId: number; address?: string } | null {
  if (!('chainId' in metadata) || !('sessionKey' in metadata) || 'calls' in metadata || 'typedData' in metadata) return null;
  return metadata as { sessionKey: string; chainId: number; address?: string };
}

export function deriveUserIdFromSessionKey(sessionKey: string): string {
  const parts = sessionKey.split(':');
  if (parts.length >= 3 && parts[0] === 'telegram' && parts[1] === 'dm' && parts[2]) {
    return parts[2];
  }
  return `session:${sessionKey}`;
}

export function buildOperationId(kind: OperationKind): string {
  const prefix = kind === 'connect'
    ? 'conn'
    : kind === 'switch_network'
      ? 'sw'
      : kind === 'sign_tx'
        ? 'tx'
        : 'eip712';
  return `${prefix}_${randomUUID()}`;
}

export function getWalletState(userId: string): UserWalletState {
  sweepTimedOutOperations();
  const state = stateByUser.get(userId);
  return state ?? emptyState(userId);
}

export function getOperationStateById(operationId: string): OperationLookupResult | undefined {
  sweepTimedOutOperations();
  const userId = operationToUser.get(operationId);
  if (!userId) return undefined;
  const state = stateByUser.get(userId);
  const operation = state?.activeOperation;
  if (!state || !operation || operation.operationId !== operationId) {
    operationToUser.delete(operationId);
    return undefined;
  }
  return { userId, state, operation };
}

export function startConnect(userId: string, source: WalletConnectionSource): UserWalletState {
  const prev = getOrInitState(userId);
  const preempted = preemptIfNeeded(prev);
  const operationId = buildOperationId('connect');
  const startedAt = now();
  const activeOperation: WalletOperation = {
    operationId,
    kind: 'connect',
    status: 'awaiting_wallet',
    startedAt,
    expiresAt: startedAt + ttlForKind('connect'),
    metadata: { source },
  };
  operationToUser.set(operationId, userId);

  const next = touch({
    ...preempted,
    presence: 'connecting',
    source,
    activeOperation,
  });
  return setState(next);
}

export function markConnected(
  userId: string,
  params: {
    address: string;
    chainId?: number | null;
    source: WalletConnectionSource;
  },
): UserWalletState {
  const prev = getOrInitState(userId);

  if (prev.activeOperation?.operationId) {
    operationToUser.delete(prev.activeOperation.operationId);
  }

  const next = touch({
    ...prev,
    presence: 'connected',
    address: params.address,
    chainId: params.chainId ?? DEFAULT_CHAIN_ID,
    source: params.source,
    activeOperation: undefined,
  });

  return setState(next);
}

export function disconnectWallet(userId: string, reason = 'user_disconnected'): UserWalletState {
  const prev = getOrInitState(userId);
  const next = prev.activeOperation
    ? terminalizeActiveOperation(prev, 'canceled', reason, 'Wallet disconnected.')
    : prev;

  const finalState = touch({
    ...next,
    presence: 'disconnected',
    address: undefined,
    chainId: null,
    source: undefined,
  });

  return setState(finalState);
}

export function startOperation(
  userId: string,
  kind: Exclude<OperationKind, 'connect'>,
  metadata: OperationMetadata,
  operationId?: string,
): { state: UserWalletState; operationId: string } {
  const prev = getOrInitState(userId);
  const preempted = preemptIfNeeded(prev);

  const opId = operationId ?? buildOperationId(kind);
  const startedAt = now();
  const activeOperation: WalletOperation = {
    operationId: opId,
    kind,
    status: 'processing',
    startedAt,
    expiresAt: startedAt + ttlForKind(kind),
    metadata,
  };

  operationToUser.set(opId, userId);

  const next = touch({
    ...preempted,
    activeOperation,
  });

  return { state: setState(next), operationId: opId };
}

export function markOperationAwaitingWallet(operationId: string): OperationLookupResult | undefined {
  const found = getOperationStateById(operationId);
  if (!found) return undefined;

  const next = touch({
    ...found.state,
    activeOperation: {
      ...found.operation,
      status: 'awaiting_wallet',
    },
  });

  setState(next);
  return { userId: found.userId, state: next, operation: next.activeOperation! };
}

export function markOperationSuccess(
  operationId: string,
  patch?: {
    chainId?: number;
    address?: string;
    txHash?: string;
    txHashes?: string[];
    aaRequestedMode?: string;
    aaResolvedMode?: string;
    aaFallbackReason?: string;
    executionKind?: string;
    batched?: boolean;
    sponsored?: boolean;
    SmartAccount4337?: string;
    Delegation7702?: string;
    signature?: string;
  },
): OperationLookupResult | undefined {
  const found = getOperationStateById(operationId);
  if (!found) return undefined;

  let metadata = found.operation.metadata;
  const txMeta = asSignTxMetadata(metadata);
  if (txMeta) {
    metadata = {
      ...txMeta,
      txHash: patch?.txHash ?? txMeta.txHash,
      txHashes: patch?.txHashes ?? txMeta.txHashes,
      aaRequestedMode: patch?.aaRequestedMode ?? txMeta.aaRequestedMode,
      aaResolvedMode: patch?.aaResolvedMode ?? txMeta.aaResolvedMode,
      aaFallbackReason: patch?.aaFallbackReason ?? txMeta.aaFallbackReason,
      executionKind: patch?.executionKind ?? txMeta.executionKind,
      batched: patch?.batched ?? txMeta.batched,
      sponsored: patch?.sponsored ?? txMeta.sponsored,
      SmartAccount4337: patch?.SmartAccount4337 ?? txMeta.SmartAccount4337,
      Delegation7702: patch?.Delegation7702 ?? txMeta.Delegation7702,
    };
  }

  const eipMeta = asSignEip712Metadata(metadata);
  if (eipMeta) {
    metadata = {
      ...eipMeta,
      signature: patch?.signature ?? eipMeta.signature,
    };
  }

  const swMeta = asSwitchMetadata(metadata);
  if (swMeta) {
    metadata = {
      ...swMeta,
      chainId: patch?.chainId ?? swMeta.chainId,
      address: patch?.address ?? swMeta.address,
    };
  }

  const succeeded: WalletOperation = {
    ...found.operation,
    status: 'succeeded',
    metadata,
  };

  const next = touch({
    ...found.state,
    activeOperation: succeeded,
    chainId: patch?.chainId ?? found.state.chainId,
    address: patch?.address ?? found.state.address,
  });

  setState(next);
  return { userId: found.userId, state: next, operation: succeeded };
}

export function markOperationFailure(
  operationId: string,
  params: {
    errorCode: string;
    errorMessage: string;
    rejected?: boolean;
    aaRequestedMode?: string;
    aaResolvedMode?: string;
    aaFallbackReason?: string;
    executionKind?: string;
    batched?: boolean;
    sponsored?: boolean;
    SmartAccount4337?: string;
    Delegation7702?: string;
  },
): OperationLookupResult | undefined {
  const found = getOperationStateById(operationId);
  if (!found) return undefined;

  let metadata = found.operation.metadata;
  const txMeta = asSignTxMetadata(metadata);
  if (txMeta) {
    metadata = {
      ...txMeta,
      aaRequestedMode: params.aaRequestedMode ?? txMeta.aaRequestedMode,
      aaResolvedMode: params.aaResolvedMode ?? txMeta.aaResolvedMode,
      aaFallbackReason: params.aaFallbackReason ?? txMeta.aaFallbackReason,
      executionKind: params.executionKind ?? txMeta.executionKind,
      batched: params.batched ?? txMeta.batched,
      sponsored: params.sponsored ?? txMeta.sponsored,
      SmartAccount4337: params.SmartAccount4337 ?? txMeta.SmartAccount4337,
      Delegation7702: params.Delegation7702 ?? txMeta.Delegation7702,
    };
  }

  const failed: WalletOperation = {
    ...found.operation,
    status: params.rejected ? 'rejected' : 'failed',
    errorCode: params.errorCode,
    errorMessage: params.errorMessage,
    metadata,
  };

  const next = touch({
    ...found.state,
    activeOperation: failed,
    presence: found.operation.kind === 'connect' ? 'disconnected' : found.state.presence,
  });

  setState(next);
  return { userId: found.userId, state: next, operation: failed };
}

export function sweepTimedOutOperations(referenceTime = now()): number {
  let changed = 0;

  for (const [userId, current] of stateByUser.entries()) {
    const op = current.activeOperation;
    if (!op) continue;
    if (op.status !== 'awaiting_wallet' && op.status !== 'processing') continue;
    if (referenceTime <= op.expiresAt) continue;

    const timedOut: WalletOperation = {
      ...op,
      status: 'timed_out',
      errorCode: 'operation_timed_out',
      errorMessage: 'Wallet action timed out.',
    };

    const next = touch({
      ...current,
      activeOperation: timedOut,
      presence: op.kind === 'connect' ? 'disconnected' : current.presence,
    });

    stateByUser.set(userId, next);
    changed += 1;
  }

  return changed;
}

export function getOperationPayloadById(operationId: string):
  | { kind: 'sign_tx'; calls: TxCall[] }
  | { kind: 'sign_eip712'; typedData: Record<string, unknown>; description: string; pendingEip712Id?: number }
  | { kind: 'switch_network'; chainId: number }
  | undefined {
  const found = getOperationStateById(operationId);
  if (!found) return undefined;

  if (found.operation.kind === 'sign_tx') {
    const txMeta = asSignTxMetadata(found.operation.metadata);
    if (!txMeta) return undefined;
    return { kind: 'sign_tx', calls: txMeta.calls };
  }

  if (found.operation.kind === 'sign_eip712') {
    const eipMeta = asSignEip712Metadata(found.operation.metadata);
    if (!eipMeta) return undefined;
    return {
      kind: 'sign_eip712',
      typedData: eipMeta.typedData,
      description: eipMeta.description,
      pendingEip712Id: eipMeta.pendingEip712Id,
    };
  }

  if (found.operation.kind === 'switch_network') {
    const switchMeta = asSwitchMetadata(found.operation.metadata);
    if (!switchMeta) return undefined;
    return { kind: 'switch_network', chainId: switchMeta.chainId };
  }

  return undefined;
}

export function listWalletStates(): UserWalletState[] {
  sweepTimedOutOperations();
  return Array.from(stateByUser.values());
}

// Test helper: clear in-memory state between unit tests.
export function __resetWalletStateStoreForTests(): void {
  stateByUser.clear();
  operationToUser.clear();
}
