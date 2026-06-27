import { NextRequest, NextResponse } from "next/server";

import {
  deriveUserIdFromSessionKey,
  getOperationStateById,
  getOperationPayloadById,
  getWalletState,
  markOperationAwaitingWallet,
  markOperationFailure,
  markOperationSuccess,
  startOperation,
} from "@/lib/wallet-state/store";
import type { TxCall } from "@/lib/wallet-state/types";

function mapStatus(status: string): string {
  if (status === "processing") return "pending";
  if (status === "succeeded") return "signed";
  if (status === "timed_out") return "expired";
  if (status === "canceled") return "failed";
  return status;
}

function formatTxResponse(operationId: string) {
  const found = getOperationStateById(operationId);
  if (!found || found.operation.kind !== "sign_tx") {
    return null;
  }

  const payload = getOperationPayloadById(operationId);
  if (!payload || payload.kind !== "sign_tx") {
    return null;
  }

  const txMeta = found.operation.metadata as {
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
    errorCode?: string;
    errorMessage?: string;
    attemptCount?: number;
  };

  const mappedStatus = mapStatus(found.operation.status);

  return {
    pending: mappedStatus === "pending" || mappedStatus === "awaiting_wallet",
    txId: operationId,
    pendingTxIds: txMeta.pendingTxIds,
    pending_tx_ids: txMeta.pendingTxIds,
    operationId,
    userId: found.userId,
    state: found.state,
    label: found.state.label,
    calls: payload.calls,
    tx: payload.calls[0],
    status: mappedStatus,
    txHash: txMeta.txHash,
    txHashes: txMeta.txHashes,
    aaRequestedMode: txMeta.aaRequestedMode,
    aaResolvedMode: txMeta.aaResolvedMode,
    aaFallbackReason: txMeta.aaFallbackReason,
    aa_requested_mode: txMeta.aaRequestedMode,
    aa_resolved_mode: txMeta.aaResolvedMode,
    aa_fallback_reason: txMeta.aaFallbackReason,
    executionKind: txMeta.executionKind,
    batched: txMeta.batched,
    sponsored: txMeta.sponsored,
    SmartAccount4337: txMeta.SmartAccount4337,
    Delegation7702: txMeta.Delegation7702,
    errorCode: found.operation.errorCode,
    errorMessage: found.operation.errorMessage,
    createdAt: found.operation.startedAt,
    updatedAt: found.state.updatedAt,
    expiresAt: found.operation.expiresAt,
    attemptCount: txMeta.attemptCount ?? 0,
  };
}

// GET: fetch transaction operation state by tx_id or session_key
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionKey = searchParams.get("session_key");
  const txId = searchParams.get("tx_id");

  if (!sessionKey && !txId) {
    return NextResponse.json(
      { error: "Missing session_key or tx_id" },
      { status: 400 },
    );
  }

  if (txId) {
    const response = formatTxResponse(txId);
    if (!response) {
      return NextResponse.json({ pending: false });
    }
    return NextResponse.json(response);
  }

  const userId = deriveUserIdFromSessionKey(String(sessionKey));
  const state = getWalletState(userId);
  const op = state.activeOperation;

  if (!op || op.kind !== "sign_tx") {
    return NextResponse.json({ pending: false });
  }

  const response = formatTxResponse(op.operationId);
  if (!response) {
    return NextResponse.json({ pending: false });
  }
  return NextResponse.json(response);
}

// POST: create a transaction signing operation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sessionKey =
      typeof body?.session_key === "string" ? body.session_key : "";
    const callList = (body?.calls ?? (body?.tx ? [body.tx] : [])) as TxCall[];
    const txId = typeof body?.tx_id === "string" ? body.tx_id : undefined;

    if (!sessionKey || callList.length === 0) {
      return NextResponse.json(
        { error: "Missing session_key or tx/calls" },
        { status: 400 },
      );
    }

    const userId = deriveUserIdFromSessionKey(sessionKey);
    const pendingTxIds = callList
      .map((call) => {
        const value =
          call.pending_tx_id ?? (call as { pendingTxId?: number }).pendingTxId;
        return typeof value === "number" && Number.isFinite(value)
          ? value
          : null;
      })
      .filter((value): value is number => value !== null);
    const { operationId, state } = startOperation(
      userId,
      "sign_tx",
      {
        sessionKey,
        calls: callList,
        pendingTxIds,
        attemptCount: 0,
      },
      txId,
    );

    return NextResponse.json({
      success: true,
      txId: operationId,
      operationId,
      state,
      label: state.label,
    });
  } catch (error) {
    console.error("Error creating tx operation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT: update transaction signing operation status
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const txId = typeof body?.tx_id === "string" ? body.tx_id : "";
    const status = typeof body?.status === "string" ? body.status : "";
    const txHash = typeof body?.tx_hash === "string" ? body.tx_hash : undefined;
    const txHashes = Array.isArray(body?.tx_hashes)
      ? body.tx_hashes.filter(
          (v: unknown): v is string => typeof v === "string",
        )
      : undefined;
    const aaRequestedMode =
      typeof body?.aa_requested_mode === "string"
        ? body.aa_requested_mode
        : undefined;
    const aaResolvedMode =
      typeof body?.aa_resolved_mode === "string"
        ? body.aa_resolved_mode
        : undefined;
    const aaFallbackReason =
      typeof body?.aa_fallback_reason === "string"
        ? body.aa_fallback_reason
        : undefined;
    const executionKind =
      typeof body?.execution_kind === "string"
        ? body.execution_kind
        : undefined;
    const batched =
      typeof body?.batched === "boolean" ? body.batched : undefined;
    const sponsored =
      typeof body?.sponsored === "boolean" ? body.sponsored : undefined;
    const SmartAccount4337 =
      typeof body?.smart_account_4337 === "string"
        ? body.smart_account_4337
        : undefined;
    const Delegation7702 =
      typeof body?.delegation_7702 === "string"
        ? body.delegation_7702
        : undefined;

    if (!txId || !status) {
      return NextResponse.json(
        { error: "Missing tx_id or status" },
        { status: 400 },
      );
    }

    if (status === "awaiting_wallet") {
      const found = markOperationAwaitingWallet(txId);
      if (!found) {
        return NextResponse.json(
          { error: "Transaction not found" },
          { status: 404 },
        );
      }
      return NextResponse.json({
        success: true,
        txId,
        status,
        state: found.state,
        label: found.state.label,
      });
    }

    if (status === "signed") {
      const found = markOperationSuccess(txId, {
        txHash,
        txHashes,
        aaRequestedMode,
        aaResolvedMode,
        aaFallbackReason,
        executionKind,
        batched,
        sponsored,
        SmartAccount4337,
        Delegation7702,
      });
      if (!found) {
        return NextResponse.json(
          { error: "Transaction not found" },
          { status: 404 },
        );
      }
      console.info("tx_operation_signed", {
        txId,
        status,
        txHash,
        txHashes,
        aaRequestedMode,
        aaResolvedMode,
        aaFallbackReason,
        executionKind,
        batched,
        sponsored,
        SmartAccount4337,
        Delegation7702,
      });
      return NextResponse.json({
        success: true,
        txId,
        status,
        txHash,
        txHashes,
        aa_requested_mode: aaRequestedMode,
        aa_resolved_mode: aaResolvedMode,
        aa_fallback_reason: aaFallbackReason,
        executionKind,
        batched,
        sponsored,
        SmartAccount4337,
        Delegation7702,
        state: found.state,
        label: found.state.label,
      });
    }

    if (status === "rejected") {
      const found = markOperationFailure(txId, {
        errorCode: "user_rejected",
        errorMessage:
          typeof body?.error_message === "string"
            ? body.error_message
            : typeof body?.error === "string"
              ? body.error
              : "User rejected in wallet",
        rejected: true,
        aaRequestedMode,
        aaResolvedMode,
        aaFallbackReason,
        executionKind,
        batched,
        sponsored,
        SmartAccount4337,
        Delegation7702,
      });
      if (!found) {
        return NextResponse.json(
          { error: "Transaction not found" },
          { status: 404 },
        );
      }
      return NextResponse.json({
        success: true,
        txId,
        status,
        aa_requested_mode: aaRequestedMode,
        aa_resolved_mode: aaResolvedMode,
        aa_fallback_reason: aaFallbackReason,
        state: found.state,
        label: found.state.label,
        executionKind,
        batched,
        sponsored,
        SmartAccount4337,
        Delegation7702,
      });
    }

    const found = markOperationFailure(txId, {
      errorCode:
        typeof body?.error_code === "string"
          ? body.error_code
          : status === "expired"
            ? "expired"
            : "signing_failed",
      errorMessage:
        typeof body?.error_message === "string"
          ? body.error_message
          : typeof body?.error === "string"
            ? body.error
            : "Signing failed",
      rejected: false,
      aaRequestedMode,
      aaResolvedMode,
      aaFallbackReason,
      executionKind,
      batched,
      sponsored,
      SmartAccount4337,
      Delegation7702,
    });

    if (!found) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      txId,
      status,
      aa_requested_mode: aaRequestedMode,
      aa_resolved_mode: aaResolvedMode,
      aa_fallback_reason: aaFallbackReason,
      state: found.state,
      label: found.state.label,
      errorCode: found.operation.errorCode,
      errorMessage: found.operation.errorMessage,
      executionKind,
      batched,
      sponsored,
      SmartAccount4337,
      Delegation7702,
    });
  } catch (error) {
    console.error("Error updating tx operation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
