"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEventContext } from "../contexts/event-context";
import type { InboundEvent } from "../state/event-buffer";
import {
  createWalletBuffer,
  enqueue,
  dequeue,
  markProcessing,
  getAll,
  type WalletBuffer,
  type WalletRequest,
  type WalletTxPayload,
  type WalletEip712Payload,
} from "../state/wallet-buffer";

// Re-export types consumers need
export type { WalletRequest, WalletTxPayload, WalletEip712Payload };
export type {
  WalletRequestKind,
  WalletRequestStatus,
} from "../state/wallet-buffer";

export type WalletRequestResult = {
  txHash?: string;
  signature?: string;
  amount?: string;
};

export type WalletHandlerConfig = {
  sessionId: string;
  /** Called after a wallet request is resolved/rejected and the outbound event is sent.
   *  Used by core.tsx to start polling for the AI's response. */
  onRequestComplete?: () => void;
};

export type WalletHandlerApi = {
  /** All queued wallet requests (tx + eip712) */
  pendingRequests: WalletRequest[];
  /** Mark a request as being processed */
  startProcessing: (id: string) => void;
  /** Complete a request successfully — dequeues + sends response to backend */
  resolveRequest: (
    id: string,
    result: WalletRequestResult,
  ) => void;
  /** Fail a request — dequeues + sends error to backend */
  rejectRequest: (id: string, error?: string) => void;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as UnknownRecord;
}

function getToolArgs(payload: unknown): UnknownRecord {
  const root = asRecord(payload);
  const nestedArgs = asRecord(root?.args);
  return nestedArgs ?? (root ?? {});
}

function parseChainId(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (trimmed.startsWith("0x")) {
    const parsedHex = Number.parseInt(trimmed.slice(2), 16);
    return Number.isFinite(parsedHex) ? parsedHex : undefined;
  }

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeTxPayload(payload: unknown): WalletTxPayload | null {
  const root = asRecord(payload);
  const args = getToolArgs(payload);
  const ctx = asRecord(root?.ctx);

  const to = typeof args.to === "string" ? args.to : undefined;
  if (!to) return null;

  const valueRaw = args.value;
  const value =
    typeof valueRaw === "string"
      ? valueRaw
      : typeof valueRaw === "number" && Number.isFinite(valueRaw)
        ? String(Math.trunc(valueRaw))
        : undefined;

  const data = typeof args.data === "string" ? args.data : undefined;
  const chainId =
    parseChainId(args.chainId) ??
    parseChainId(args.chain_id) ??
    parseChainId(ctx?.user_chain_id) ??
    parseChainId(ctx?.userChainId);

  return {
    to,
    value,
    data,
    chainId,
  };
}

function normalizeEip712Payload(payload: unknown): WalletEip712Payload {
  const args = getToolArgs(payload);
  const typedDataRaw = args.typed_data ?? args.typedData;
  let typedData: WalletEip712Payload["typed_data"] | undefined;

  if (typeof typedDataRaw === "string") {
    try {
      const parsed = JSON.parse(typedDataRaw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        typedData = parsed as WalletEip712Payload["typed_data"];
      }
    } catch {
      typedData = undefined;
    }
  } else if (
    typedDataRaw &&
    typeof typedDataRaw === "object" &&
    !Array.isArray(typedDataRaw)
  ) {
    typedData = typedDataRaw as WalletEip712Payload["typed_data"];
  }

  const description =
    typeof args.description === "string" ? args.description : undefined;

  return {
    typed_data: typedData,
    description,
  };
}

export function useWalletHandler({
  sessionId,
  onRequestComplete,
}: WalletHandlerConfig): WalletHandlerApi {
  const { subscribe, sendOutboundSystem: sendOutbound } = useEventContext();
  const bufferRef = useRef<WalletBuffer>(createWalletBuffer());
  const [pendingRequests, setPendingRequests] = useState<WalletRequest[]>([]);

  // Sync React state from buffer
  const syncState = useCallback(() => {
    setPendingRequests(getAll(bufferRef.current));
  }, []);

  // ---------------------------------------------------------------------------
  // Subscribe to wallet_tx_request events
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = subscribe(
      "wallet_tx_request",
      (event: InboundEvent) => {
        const payload = normalizeTxPayload(event.payload);
        if (!payload) {
          console.warn("[aomi][wallet] Ignoring tx request with invalid payload", event.payload);
          return;
        }
        enqueue(bufferRef.current, "transaction", payload);
        syncState();
      },
    );
    return unsubscribe;
  }, [subscribe, syncState]);

  // ---------------------------------------------------------------------------
  // Subscribe to EIP-712 signing requests
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = subscribe(
      "wallet_eip712_request",
      (event: InboundEvent) => {
        const payload = normalizeEip712Payload(event.payload ?? {});
        enqueue(bufferRef.current, "eip712_sign", payload);
        syncState();
      },
    );
    return unsubscribe;
  }, [subscribe, syncState]);

  // ---------------------------------------------------------------------------
  // Mark a request as processing
  // ---------------------------------------------------------------------------
  const startProcessingCb = useCallback(
    (id: string) => {
      markProcessing(bufferRef.current, id);
      syncState();
    },
    [syncState],
  );

  // ---------------------------------------------------------------------------
  // Resolve a request — dequeues + sends appropriate backend response
  // ---------------------------------------------------------------------------
  const resolveRequest = useCallback(
    (id: string, result: WalletRequestResult) => {
      const removed = dequeue(bufferRef.current, id);
      if (!removed) return;

      let outbound: Promise<void>;
      if (removed.kind === "transaction") {
        outbound = sendOutbound({
          type: "wallet:tx_complete",
          sessionId,
          payload: {
            txHash: result.txHash ?? "",
            status: "success",
            amount: result.amount,
          },
        });
      } else {
        const eip712Payload = removed.payload as WalletEip712Payload;
        outbound = sendOutbound({
          type: "wallet_eip712_response",
          sessionId,
          payload: {
            status: "success",
            signature: result.signature,
            description: eip712Payload.description,
          },
        });
      }

      outbound.then(() => onRequestComplete?.());
      syncState();
    },
    [sendOutbound, sessionId, syncState, onRequestComplete],
  );

  // ---------------------------------------------------------------------------
  // Reject a request — dequeues + sends error to backend
  // ---------------------------------------------------------------------------
  const rejectRequest = useCallback(
    (id: string, error?: string) => {
      const removed = dequeue(bufferRef.current, id);
      if (!removed) return;

      let outbound: Promise<void>;
      if (removed.kind === "transaction") {
        outbound = sendOutbound({
          type: "wallet:tx_complete",
          sessionId,
          payload: {
            txHash: "",
            status: "failed",
          },
        });
      } else {
        const eip712Payload = removed.payload as WalletEip712Payload;
        outbound = sendOutbound({
          type: "wallet_eip712_response",
          sessionId,
          payload: {
            status: "failed",
            error: error ?? "EIP-712 signing failed",
            description: eip712Payload.description,
          },
        });
      }

      outbound.then(() => onRequestComplete?.());
      syncState();
    },
    [sendOutbound, sessionId, syncState, onRequestComplete],
  );

  return {
    pendingRequests,
    startProcessing: startProcessingCb,
    resolveRequest,
    rejectRequest,
  };
}
