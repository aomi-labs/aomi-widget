import { NextRequest, NextResponse } from 'next/server';

interface SessionData {
  ls: Record<string, string>;
  idb: Record<string, unknown>;
  updatedAt: number;
}

const sessions = new Map<string, SessionData>();
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

function sweepExpiredSessions(now = Date.now()) {
  for (const [userId, session] of sessions.entries()) {
    if (now - session.updatedAt > SESSION_TTL_MS) {
      sessions.delete(userId);
    }
  }
}

export async function GET(req: NextRequest) {
  sweepExpiredSessions();
  const userId = req.nextUrl.searchParams.get('user_id');
  if (!userId) {
    return NextResponse.json({ error: 'missing user_id' }, { status: 400 });
  }

  const data = sessions.get(userId);
  if (!data) {
    return NextResponse.json({ found: false });
  }

  return NextResponse.json({ found: true, ls: data.ls, idb: data.idb });
}

export async function POST(req: NextRequest) {
  sweepExpiredSessions();
  const body = await req.json();
  const { user_id, ls, idb } = body;

  if (!user_id || !ls) {
    return NextResponse.json({ error: 'missing user_id or ls' }, { status: 400 });
  }

  sessions.set(user_id, { ls: ls ?? {}, idb: idb ?? {}, updatedAt: Date.now() });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  sweepExpiredSessions();
  const body = await req.json();
  const { user_id } = body;

  if (!user_id) {
    return NextResponse.json({ error: 'missing user_id' }, { status: 400 });
  }

  sessions.delete(user_id);
  return NextResponse.json({ success: true });
}
