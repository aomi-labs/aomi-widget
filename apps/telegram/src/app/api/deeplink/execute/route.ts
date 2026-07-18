import { NextRequest, NextResponse } from 'next/server';

import { getServerWcClient } from '@/lib/wc/server-client';

type OperationKind = 'tx' | 'eip712' | 'network';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const kind = body?.kind as OperationKind | undefined;
    const userId = typeof body?.user_id === 'string' ? body.user_id.trim() : '';
    const operationId = typeof body?.operation_id === 'string' ? body.operation_id.trim() : '';

    if (!kind || !userId || !operationId) {
      return NextResponse.json(
        { error: 'missing kind, user_id, or operation_id' },
        { status: 400 },
      );
    }

    const client = getServerWcClient();

    switch (kind) {
      case 'tx':
        void client.startTx(userId, operationId).catch((err) => {
          console.error('Server WC tx signing failed:', err);
        });
        break;
      case 'eip712':
        void client.startEip712(userId, operationId).catch((err) => {
          console.error('Server WC EIP-712 signing failed:', err);
        });
        break;
      case 'network':
        void client.startNetworkSwitch(userId, operationId).catch((err) => {
          console.error('Server WC network switch failed:', err);
        });
        break;
      default:
        return NextResponse.json({ error: `unknown kind: ${kind}` }, { status: 400 });
    }

    return NextResponse.json({ started: true });
  } catch (error) {
    console.error('Error starting server-side WC operation:', error);
    return NextResponse.json({ error: 'failed_to_start_server_wc_operation' }, { status: 500 });
  }
}
