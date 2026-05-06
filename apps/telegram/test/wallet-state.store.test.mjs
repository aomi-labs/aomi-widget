import test from 'node:test';
import assert from 'node:assert/strict';

import {
  __resetWalletStateStoreForTests,
  disconnectWallet,
  getOperationStateById,
  getWalletState,
  markConnected,
  markOperationFailure,
  markOperationSuccess,
  startConnect,
  startOperation,
  sweepTimedOutOperations,
} from '../.tmp-test-dist/lib/wallet-state/store.js';

function txMeta(sessionKey = 'telegram:dm:123') {
  return {
    sessionKey,
    calls: [{ to: '0xabc', value: '0', chainId: 1 }],
    attemptCount: 0,
  };
}

test.beforeEach(() => {
  __resetWalletStateStoreForTests();
});

test('startConnect sets connecting presence with active connect operation', () => {
  const state = startConnect('u1', 'server_wc');
  assert.equal(state.presence, 'connecting');
  assert.equal(state.source, 'server_wc');
  assert.ok(state.activeOperation);
  assert.equal(state.activeOperation?.kind, 'connect');
  assert.equal(state.activeOperation?.status, 'awaiting_wallet');
  assert.match(state.label, /Awaiting wallet connection approval/i);
});

test('markConnected finalizes user as connected and clears active operation', () => {
  startConnect('u1', 'server_wc');
  const state = markConnected('u1', { address: '0x123', chainId: 8453, source: 'mini_app' });

  assert.equal(state.presence, 'connected');
  assert.equal(state.address, '0x123');
  assert.equal(state.chainId, 8453);
  assert.equal(state.source, 'mini_app');
  assert.equal(state.activeOperation, undefined);
  assert.equal(getWalletState('u1').label, 'Wallet connected');
});

test('starting a new operation preempts the current one', () => {
  const first = startOperation('u1', 'sign_tx', txMeta());
  const second = startOperation('u1', 'sign_eip712', {
    sessionKey: 'telegram:dm:123',
    typedData: { domain: {}, message: {} },
    description: 'sig',
    attemptCount: 0,
  });

  assert.notEqual(first.operationId, second.operationId);
  const active = getWalletState('u1').activeOperation;
  assert.ok(active);
  assert.equal(active?.operationId, second.operationId);
  assert.equal(active?.kind, 'sign_eip712');

  // Preempted op should no longer be updatable.
  const oldUpdate = markOperationSuccess(first.operationId, { txHash: '0xdead' });
  assert.equal(oldUpdate, undefined);
});

test('operation success/failure updates terminal status and labels', () => {
  const { operationId } = startOperation('u1', 'sign_tx', txMeta());

  const success = markOperationSuccess(operationId, { txHash: '0xaaa' });
  assert.ok(success);
  assert.equal(success?.operation.status, 'succeeded');
  assert.match(success?.state.label ?? '', /Transaction signed/i);

  const { operationId: op2 } = startOperation('u1', 'switch_network', {
    sessionKey: 'telegram:dm:123',
    chainId: 42161,
  });

  const failed = markOperationFailure(op2, {
    errorCode: 'switch_failed',
    errorMessage: 'failed',
  });
  assert.ok(failed);
  assert.equal(failed?.operation.status, 'failed');
  assert.match(failed?.state.label ?? '', /failed/i);
});

test('timeout sweep marks pending connect as timed_out and disconnects presence', () => {
  const state = startConnect('u1', 'server_wc');
  const opId = state.activeOperation?.operationId;
  assert.ok(opId);

  // Force timeout by sweeping far in the future.
  const changed = sweepTimedOutOperations(Date.now() + 10 * 60 * 1000);
  assert.equal(changed, 1);

  const found = getOperationStateById(opId);
  assert.ok(found);
  assert.equal(found?.operation.status, 'timed_out');
  assert.equal(found?.state.presence, 'disconnected');
  assert.match(found?.state.label ?? '', /timed out/i);
});

test('disconnectWallet clears connected state and keeps deterministic label', () => {
  markConnected('u1', { address: '0x111', chainId: 1, source: 'server_wc' });
  const state = disconnectWallet('u1');

  assert.equal(state.presence, 'disconnected');
  assert.equal(state.address, undefined);
  assert.equal(state.chainId, null);
  assert.equal(state.source, undefined);
  assert.equal(state.label, 'Wallet disconnected');
});
