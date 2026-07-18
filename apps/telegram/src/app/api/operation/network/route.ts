import { NextRequest, NextResponse } from 'next/server';

import {
  deriveUserIdFromSessionKey,
  getOperationPayloadById,
  getOperationStateById,
  getWalletState,
  markOperationAwaitingWallet,
  markOperationFailure,
  markOperationSuccess,
  startOperation,
} from '@/lib/wallet-state/store';

function mapStatus(status: string): string {
  if (status === 'processing') return 'pending';
  if (status === 'succeeded') return 'switched';
  if (status === 'timed_out') return 'failed';
  if (status === 'canceled') return 'failed';
  return status;
}

function formatSwitchResponse(operationId: string) {
  const found = getOperationStateById(operationId);
  if (!found || found.operation.kind !== 'switch_network') {
    return null;
  }

  const payload = getOperationPayloadById(operationId);
  if (!payload || payload.kind !== 'switch_network') {
    return null;
  }

  const status = mapStatus(found.operation.status);

  return {
    pending: status === 'pending' || status === 'awaiting_wallet',
    switchId: operationId,
    operationId,
    state: found.state,
    label: found.state.label,
    status,
    chainId: payload.chainId,
    address: found.state.address,
    error: found.operation.errorMessage,
    errorCode: found.operation.errorCode,
    createdAt: found.operation.startedAt,
    updatedAt: found.state.updatedAt,
    expiresAt: found.operation.expiresAt,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const switchId = searchParams.get('switch_id');
  const sessionKey = searchParams.get('session_key');

  if (!switchId && !sessionKey) {
    return NextResponse.json({ error: 'Missing switch_id or session_key' }, { status: 400 });
  }

  if (switchId) {
    const response = formatSwitchResponse(switchId);
    if (!response) return NextResponse.json({ pending: false });
    return NextResponse.json(response);
  }

  const userId = deriveUserIdFromSessionKey(String(sessionKey));
  const state = getWalletState(userId);
  const op = state.activeOperation;

  if (!op || op.kind !== 'switch_network') {
    return NextResponse.json({ pending: false });
  }

  const response = formatSwitchResponse(op.operationId);
  if (!response) return NextResponse.json({ pending: false });
  return NextResponse.json(response);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sessionKey = typeof body?.session_key === 'string' ? body.session_key : '';
    const chainId = Number(body?.chain_id);
    const switchId = typeof body?.switch_id === 'string' ? body.switch_id : undefined;

    if (!sessionKey || !Number.isFinite(chainId) || chainId <= 0) {
      return NextResponse.json({ error: 'Missing session_key or chain_id' }, { status: 400 });
    }

    const userId = deriveUserIdFromSessionKey(sessionKey);
    const { operationId, state } = startOperation(
      userId,
      'switch_network',
      {
        sessionKey,
        chainId,
      },
      switchId,
    );

    return NextResponse.json({ success: true, switchId: operationId, operationId, state, label: state.label });
  } catch (error) {
    console.error('Error creating network switch operation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const switchId = typeof body?.switch_id === 'string' ? body.switch_id : '';
    const status = typeof body?.status === 'string' ? body.status : '';
    const chainId = typeof body?.chain_id === 'number' ? body.chain_id : undefined;
    const address = typeof body?.address === 'string' ? body.address : undefined;

    if (!switchId || !status) {
      return NextResponse.json({ error: 'Missing switch_id or status' }, { status: 400 });
    }

    if (status === 'awaiting_wallet' || status === 'pending') {
      const found = markOperationAwaitingWallet(switchId);
      if (!found) return NextResponse.json({ error: 'Switch request not found' }, { status: 404 });
      return NextResponse.json({ success: true, switchId, status, state: found.state, label: found.state.label });
    }

    if (status === 'switched' || status === 'signed') {
      const found = markOperationSuccess(switchId, { chainId, address });
      if (!found) return NextResponse.json({ error: 'Switch request not found' }, { status: 404 });
      return NextResponse.json({ success: true, switchId, status: 'switched', state: found.state, label: found.state.label });
    }

    const found = markOperationFailure(switchId, {
      errorCode: typeof body?.error_code === 'string' ? body.error_code : 'switch_failed',
      errorMessage: typeof body?.error === 'string'
        ? body.error
        : (typeof body?.error_message === 'string' ? body.error_message : 'Network switch failed'),
      rejected: false,
    });

    if (!found) return NextResponse.json({ error: 'Switch request not found' }, { status: 404 });

    return NextResponse.json({
      success: true,
      switchId,
      status: 'failed',
      chainId,
      address,
      error: found.operation.errorMessage,
      state: found.state,
      label: found.state.label,
    });
  } catch (err) {
    console.error('Error updating network switch operation:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
