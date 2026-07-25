import { NextRequest, NextResponse } from "next/server";
import type {
  WalletSolanaSignMessagePayload,
  WalletSolanaSignPayload,
} from "@aomi-labs/client";
import {
  E2E_WALLET_COOKIE,
  executeE2ESolanaTransaction,
  isE2ESolanaExecutorEnabled,
  signE2ESolanaMessage,
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

type RequestBody =
  | { action: "sign-message"; payload: WalletSolanaSignMessagePayload }
  | {
      action: "sign" | "sign-and-send";
      payload: WalletSolanaSignPayload;
    };

export async function POST(request: NextRequest) {
  if (!isE2ESolanaExecutorEnabled()) {
    return new NextResponse("E2E Solana execution is disabled", {
      status: 404,
    });
  }
  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { ok: false, error: "Cross-origin request denied" },
      { status: 403 },
    );
  }
  const seed = verifyE2EWalletCookie(
    request.cookies.get(E2E_WALLET_COOKIE)?.value,
  );
  if (!seed?.svmAddress) {
    return NextResponse.json(
      { ok: false, error: "Missing Solana wallet seed" },
      { status: 401 },
    );
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
    if (!body?.action || !body.payload) throw new Error("invalid");
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const result =
    body.action === "sign-message"
      ? await signE2ESolanaMessage({
          seed,
          message: body.payload.message ?? "",
        })
      : await executeE2ESolanaTransaction({
          seed,
          payload: body.payload,
          broadcast: body.action === "sign-and-send",
        });
  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
