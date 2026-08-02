import { NextRequest, NextResponse } from "next/server";
import type { WalletTxPayload } from "@aomi-labs/react";
import {
  E2E_WALLET_COOKIE,
  executeE2EWalletTransaction,
  isE2EExecutorEnabled,
  verifyE2EWalletCookie,
} from "@portal/server/e2e-wallet";

export const runtime = "nodejs";

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!isE2EExecutorEnabled()) {
    return new NextResponse("E2E execution is disabled", { status: 404 });
  }
  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { ok: false, code: "unauthorized", error: "Cross-origin request denied" },
      { status: 403 },
    );
  }

  const seed = verifyE2EWalletCookie(
    request.cookies.get(E2E_WALLET_COOKIE)?.value,
  );
  if (!seed) {
    return NextResponse.json(
      { ok: false, code: "unauthorized", error: "Missing E2E wallet seed" },
      { status: 401 },
    );
  }

  let payload: WalletTxPayload;
  try {
    const body = (await request.json()) as { payload?: WalletTxPayload };
    if (!body.payload || typeof body.payload !== "object") {
      throw new Error("Missing payload");
    }
    payload = body.payload;
  } catch {
    return NextResponse.json(
      { ok: false, code: "invalid_request", error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const result = await executeE2EWalletTransaction({ seed, payload });
  if (result.ok) {
    return NextResponse.json(result);
  }

  const status =
    result.code === "unauthorized"
      ? 401
      : result.code === "invalid_request"
        ? 400
        : result.code === "policy_rejected"
          ? 422
          : result.code === "rpc_unavailable"
            ? 503
            : 500;

  return NextResponse.json(result, { status });
}
