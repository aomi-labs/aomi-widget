import { NextRequest, NextResponse } from 'next/server';

import {
  disconnectWallet,
  getWalletState,
  listWalletStates,
  markConnected,
} from '@/lib/wallet-state/store';
import type { WalletConnectionSource } from '@/lib/wallet-state/types';
import { getServerWcClient } from '@/lib/wc/server-client';

function toResponseShape(state: ReturnType<typeof getWalletState>) {
  const active = state.activeOperation;
  return {
    state,
    connected: state.presence === 'connected',
    connecting: state.presence === 'connecting',
    address: state.address,
    chainId: state.chainId,
    source: state.source,
    label: state.label,
    operationId: active?.operationId,
    operationKind: active?.kind,
    operationStatus: active?.status,
    errorCode: active?.errorCode,
    errorMessage: active?.errorMessage,
  };
}

export async function GET(req: NextRequest) {
  const debugAllowed = process.env.NODE_ENV !== 'production' || process.env.AOMI_WALLET_DEBUG === '1';
  if (debugAllowed && req.nextUrl.searchParams.get('debug') === '1') {
    const states = listWalletStates();
    return NextResponse.json({
      count: states.length,
      entries: Object.fromEntries(states.map((state) => [state.userId, state])),
    });
  }

  const userId = req.nextUrl.searchParams.get('user_id');
  if (!userId) {
    return NextResponse.json({ error: 'missing user_id' }, { status: 400 });
  }

  return NextResponse.json(toResponseShape(getWalletState(userId)));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const userId = typeof body?.user_id === 'string' ? body.user_id.trim() : '';
  const address = typeof body?.address === 'string' ? body.address : '';
  const chainId = typeof body?.chainId === 'number' ? body.chainId : null;
  const source = (body?.source as WalletConnectionSource | undefined) ?? 'mini_app';

  if (!userId || !address) {
    return NextResponse.json({ error: 'missing user_id or address' }, { status: 400 });
  }

  if (source !== 'mini_app' && source !== 'server_wc') {
    return NextResponse.json({ error: 'invalid source' }, { status: 400 });
  }

  const state = markConnected(userId, {
    address,
    chainId,
    source,
  });

  return NextResponse.json({ success: true, ...toResponseShape(state) });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const userId = typeof body?.user_id === 'string' ? body.user_id.trim() : '';

  if (!userId) {
    return NextResponse.json({ error: 'missing user_id' }, { status: 400 });
  }

  disconnectWallet(userId);
  await getServerWcClient().clearSession(userId, { clearWallet: false });

  return NextResponse.json({ success: true, ...toResponseShape(getWalletState(userId)) });
}
