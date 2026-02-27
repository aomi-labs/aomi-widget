"use client";

import { useEffect, useRef } from "react";
import {
  useAomiRuntime,
  type WalletRequest,
  type WalletTxPayload,
  type WalletEip712Payload,
} from "@aomi-labs/react";
import {
  useSendTransaction,
  useAccount,
  useSwitchChain,
  useSignTypedData,
} from "wagmi";

function parseChainId(value: number | string | undefined): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed.startsWith("0x")) {
    const parsedHex = Number.parseInt(trimmed.slice(2), 16);
    return Number.isFinite(parsedHex) ? parsedHex : undefined;
  }
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Invisible bridge component that processes wallet transaction and EIP-712
 * signing requests from the AI backend via wagmi.
 *
 * Auto-mounted inside AomiFrame.Root. Must be rendered inside a WagmiProvider.
 */
export function WalletTxHandler() {
  const {
    pendingWalletRequests,
    startWalletRequest,
    resolveWalletRequest,
    rejectWalletRequest,
  } = useAomiRuntime();
  const { sendTransactionAsync } = useSendTransaction();
  const { signTypedDataAsync } = useSignTypedData();
  const { chainId: currentChainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const processingRef = useRef(false);

  useEffect(() => {
    if (!pendingWalletRequests) return;
    const next = pendingWalletRequests.find((r) => r.status === "pending");
    if (!next || processingRef.current) return;

    processingRef.current = true;
    startWalletRequest(next.id);

    processRequest(next).finally(() => {
      processingRef.current = false;
    });

    async function processRequest(req: WalletRequest) {
      try {
        if (req.kind === "transaction") {
          const payload = req.payload as WalletTxPayload;

          if (payload.chainId && payload.chainId !== currentChainId) {
            await switchChainAsync({ chainId: payload.chainId });
          }

          const txHash = await sendTransactionAsync({
            to: payload.to as `0x${string}`,
            value: payload.value ? BigInt(payload.value) : undefined,
            data:
              payload.data && payload.data !== "0x"
                ? (payload.data as `0x${string}`)
                : undefined,
          });

          resolveWalletRequest(req.id, {
            txHash,
            amount: payload.value,
          });
        } else {
          const payload = req.payload as WalletEip712Payload;
          const typedData = payload.typed_data;

          if (!typedData) {
            rejectWalletRequest(req.id, "Missing typed_data payload");
            return;
          }

          const requestChainId = parseChainId(typedData.domain?.chainId);
          if (
            requestChainId &&
            currentChainId &&
            requestChainId !== currentChainId
          ) {
            await switchChainAsync({ chainId: requestChainId });
          }

          const signature = await signTypedDataAsync(typedData as never);

          resolveWalletRequest(req.id, { signature });
        }
      } catch (error) {
        console.error("[WalletTxHandler] Request failed:", error);
        rejectWalletRequest(
          req.id,
          error instanceof Error ? error.message : "Request failed",
        );
      }
    }
  }, [
    pendingWalletRequests,
    currentChainId,
    switchChainAsync,
    sendTransactionAsync,
    signTypedDataAsync,
    startWalletRequest,
    resolveWalletRequest,
    rejectWalletRequest,
  ]);

  return null;
}
