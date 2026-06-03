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

function mapStatus(status: string): string {
  if (status === "processing") return "pending";
  if (status === "succeeded") return "signed";
  if (status === "timed_out") return "expired";
  if (status === "canceled") return "failed";
  return status;
}

function formatEip712Response(operationId: string) {
  const found = getOperationStateById(operationId);
  if (!found || found.operation.kind !== "sign_eip712") {
    return null;
  }

  const payload = getOperationPayloadById(operationId);
  if (!payload || payload.kind !== "sign_eip712") {
    return null;
  }

  const opMeta = found.operation.metadata as {
    pendingEip712Id?: number;
    signature?: string;
    attemptCount?: number;
  };

  const status = mapStatus(found.operation.status);

  return {
    pending: status === "pending" || status === "awaiting_wallet",
    eip712Id: operationId,
    pendingEip712Id: opMeta.pendingEip712Id,
    operationId,
    state: found.state,
    label: found.state.label,
    status,
    typedData: payload.typedData,
    nonTypedData: payload.nonTypedData,
    description: payload.description,
    signature: opMeta.signature,
    errorCode: found.operation.errorCode,
    errorMessage: found.operation.errorMessage,
    createdAt: found.operation.startedAt,
    updatedAt: found.state.updatedAt,
    expiresAt: found.operation.expiresAt,
    attemptCount: opMeta.attemptCount ?? 0,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const eip712Id = searchParams.get("eip712_id");
  const sessionKey = searchParams.get("session_key");

  if (!eip712Id && !sessionKey) {
    return NextResponse.json(
      { error: "Missing eip712_id or session_key" },
      { status: 400 },
    );
  }

  if (eip712Id) {
    const response = formatEip712Response(eip712Id);
    if (!response) {
      return NextResponse.json({ pending: false });
    }
    return NextResponse.json(response);
  }

  const userId = deriveUserIdFromSessionKey(String(sessionKey));
  const state = getWalletState(userId);
  const op = state.activeOperation;

  if (!op || op.kind !== "sign_eip712") {
    return NextResponse.json({ pending: false });
  }

  const response = formatEip712Response(op.operationId);
  if (!response) {
    return NextResponse.json({ pending: false });
  }
  return NextResponse.json(response);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sessionKey =
      typeof body?.session_key === "string" ? body.session_key : "";
    const typedData = body?.typed_data as Record<string, unknown> | undefined;
    const nonTypedData =
      typeof body?.non_typed_data === "string"
        ? body.non_typed_data
        : typeof body?.nonTypedData === "string"
          ? body.nonTypedData
          : undefined;
    const description =
      typeof body?.description === "string"
        ? body.description
        : "Signature request";
    const eip712Id =
      typeof body?.eip712_id === "string" ? body.eip712_id : undefined;
    const pendingEip712Id =
      typeof body?.pending_eip712_id === "number"
        ? body.pending_eip712_id
        : typeof body?.pendingEip712Id === "number"
          ? body.pendingEip712Id
          : undefined;

    if (!sessionKey || (!typedData && !nonTypedData)) {
      return NextResponse.json(
        { error: "Missing session_key and signature payload" },
        { status: 400 },
      );
    }
    if (typedData && nonTypedData) {
      return NextResponse.json(
        { error: "Provide either typed_data or non_typed_data, not both" },
        { status: 400 },
      );
    }

    const userId = deriveUserIdFromSessionKey(sessionKey);
    const { operationId, state } = startOperation(
      userId,
      "sign_eip712",
      {
        sessionKey,
        typedData,
        nonTypedData,
        description,
        pendingEip712Id,
        attemptCount: 0,
      },
      eip712Id,
    );

    return NextResponse.json({
      success: true,
      eip712Id: operationId,
      operationId,
      state,
      label: state.label,
    });
  } catch (error) {
    console.error("Error creating EIP-712 operation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const eip712Id = typeof body?.eip712_id === "string" ? body.eip712_id : "";
    const status = typeof body?.status === "string" ? body.status : "";
    const signature =
      typeof body?.signature === "string" ? body.signature : undefined;

    if (!eip712Id || !status) {
      return NextResponse.json(
        { error: "Missing eip712_id or status" },
        { status: 400 },
      );
    }

    if (status === "awaiting_wallet") {
      const found = markOperationAwaitingWallet(eip712Id);
      if (!found)
        return NextResponse.json(
          { error: "Request not found" },
          { status: 404 },
        );
      return NextResponse.json({
        success: true,
        eip712Id,
        status,
        state: found.state,
        label: found.state.label,
      });
    }

    if (status === "signed") {
      const found = markOperationSuccess(eip712Id, { signature });
      if (!found)
        return NextResponse.json(
          { error: "Request not found" },
          { status: 404 },
        );
      return NextResponse.json({
        success: true,
        eip712Id,
        status,
        signature,
        state: found.state,
        label: found.state.label,
      });
    }

    if (status === "rejected") {
      const found = markOperationFailure(eip712Id, {
        errorCode: "user_rejected",
        errorMessage:
          typeof body?.error_message === "string"
            ? body.error_message
            : typeof body?.error === "string"
              ? body.error
              : "User rejected in wallet",
        rejected: true,
      });
      if (!found)
        return NextResponse.json(
          { error: "Request not found" },
          { status: 404 },
        );
      return NextResponse.json({
        success: true,
        eip712Id,
        status,
        state: found.state,
        label: found.state.label,
      });
    }

    const found = markOperationFailure(eip712Id, {
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
    });

    if (!found)
      return NextResponse.json({ error: "Request not found" }, { status: 404 });

    return NextResponse.json({
      success: true,
      eip712Id,
      status,
      state: found.state,
      label: found.state.label,
      errorCode: found.operation.errorCode,
      errorMessage: found.operation.errorMessage,
    });
  } catch (error) {
    console.error("Error updating EIP-712 operation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
