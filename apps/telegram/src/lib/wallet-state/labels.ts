import type { UserWalletState } from './types';

function opLabel(state: UserWalletState): string | null {
  const op = state.activeOperation;
  if (!op) return null;

  if (op.status === 'awaiting_wallet') {
    if (op.kind === 'connect') return 'Awaiting wallet connection approval';
    if (op.kind === 'switch_network') return 'Awaiting wallet approval for network switch';
    if (op.kind === 'sign_tx') return 'Awaiting wallet approval for transaction';
    if (op.kind === 'sign_eip712') return 'Awaiting wallet approval for signature';
  }

  if (op.status === 'processing') {
    if (op.kind === 'connect') return 'Connecting wallet';
    if (op.kind === 'switch_network') return 'Switching network';
    if (op.kind === 'sign_tx') return 'Processing transaction signing';
    if (op.kind === 'sign_eip712') return 'Processing signature request';
  }

  if (op.status === 'succeeded') {
    if (op.kind === 'connect') return 'Wallet connected';
    if (op.kind === 'switch_network') return 'Network switched';
    if (op.kind === 'sign_tx') return 'Transaction signed';
    if (op.kind === 'sign_eip712') return 'Message signed';
  }

  if (op.status === 'rejected') return 'Wallet action rejected';
  if (op.status === 'timed_out') return 'Wallet action timed out';
  if (op.status === 'canceled') return 'Wallet action canceled';
  if (op.status === 'failed') return `Wallet action failed${op.errorCode ? ` (${op.errorCode})` : ''}`;

  return null;
}

export function deriveWalletStateLabel(state: UserWalletState): string {
  const operationLabel = opLabel(state);
  if (operationLabel) return operationLabel;

  if (state.presence === 'connecting') return 'Awaiting wallet connection approval';
  if (state.presence === 'connected') return 'Wallet connected';
  return 'Wallet disconnected';
}
