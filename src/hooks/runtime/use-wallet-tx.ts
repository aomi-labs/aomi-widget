"use client";

import { useCallback, useRef, type RefObject } from "react";

import type { BackendApi, SessionMessage } from "@/lib/backend-api";
import type { Notification } from "@/lib/notification-context";
import type { WalletTxRequestHandler, WalletTxRequestPayload } from "@/lib/wallet-tx";
import {
  normalizeWalletError,
  pickInjectedProvider,
  toHexQuantity,
} from "@/lib/runtime-utils";

type WalletTxRequest = WalletTxRequestPayload;

type UseWalletTxParams = {
  backendApiRef: RefObject<BackendApi>;
  onWalletTxRequest?: WalletTxRequestHandler;
  publicKey?: string;
  showNotification: (notification: Omit<Notification, "id">) => void;
  applySessionMessagesToThread: (threadId: string, msgs?: SessionMessage[] | null) => void;
  currentThreadIdRef: RefObject<string>;
};

export function useWalletTx({
  backendApiRef,
  onWalletTxRequest,
  publicKey,
  showNotification,
  applySessionMessagesToThread,
  currentThreadIdRef,
}: UseWalletTxParams) {
  const handledWalletTxRequestsRef = useRef<Set<string>>(new Set());
  const walletTxQueueRef = useRef<Array<{ sessionId: string; threadId: string; request: WalletTxRequest }>>([]);
  const walletTxInFlightRef = useRef(false);

  const enqueueWalletTxRequest = useCallback(
    (sessionId: string, threadId: string, request: WalletTxRequest) => {
      const key = `${sessionId}:${request.timestamp ?? JSON.stringify(request)}`;
      if (handledWalletTxRequestsRef.current.has(key)) return;
      handledWalletTxRequestsRef.current.add(key);
      walletTxQueueRef.current.push({ sessionId, threadId, request });
    },
    []
  );

  const drainWalletTxQueue = useCallback(async () => {
    if (walletTxInFlightRef.current) return;
    const next = walletTxQueueRef.current.shift();
    if (!next) return;
    walletTxInFlightRef.current = true;

    try {
      if (onWalletTxRequest) {
        const txHash = await onWalletTxRequest(next.request, {
          sessionId: next.sessionId,
          threadId: next.threadId,
          publicKey,
        });
        showNotification({
          type: "success",
          iconType: "transaction",
          title: "Transaction Sent",
          message: `Hash: ${txHash}`,
        });
        await backendApiRef.current.postSystemMessage(next.sessionId, `Transaction sent: ${txHash}`);
        if (currentThreadIdRef.current === next.threadId) {
          try {
            const state = await backendApiRef.current.fetchState(next.sessionId);
            applySessionMessagesToThread(next.threadId, state.messages);
          } catch (refreshError) {
            console.error("Failed to refresh state after wallet tx:", refreshError);
          }
        }
        return;
      }

      const activeProvider = await pickInjectedProvider(publicKey);
      if (!activeProvider?.request) {
        showNotification({
          type: "error",
          iconType: "wallet",
          title: "Wallet Not Found",
          message: "No wallet provider found (window.ethereum missing).",
        });
        await backendApiRef.current.postSystemMessage(
          next.sessionId,
          "No wallet provider found (window.ethereum missing)."
        );
        return;
      }

      const accounts = (await activeProvider.request({ method: "eth_accounts" })) as unknown;
      const addresses = Array.isArray(accounts) ? (accounts as unknown[]).map(String) : [];
      const from = publicKey || addresses[0];

      if (!from) {
        await activeProvider.request({ method: "eth_requestAccounts" });
      }

      const fromAddress =
        publicKey || ((await activeProvider.request({ method: "eth_accounts" })) as unknown);
      const resolvedFrom = publicKey || (Array.isArray(fromAddress) ? String((fromAddress as unknown[])[0] ?? "") : "");

      if (!resolvedFrom) {
        showNotification({
          type: "error",
          iconType: "wallet",
          title: "Wallet Not Connected",
          message: "Please connect a wallet to sign the requested transaction.",
        });
        await backendApiRef.current.postSystemMessage(
          next.sessionId,
          "Wallet is not connected; please connect a wallet to sign the requested transaction."
        );
        return;
      }

      const gas = next.request.gas ?? next.request.gas_limit ?? undefined;
      let valueHex: string | undefined;
      let gasHex: string | undefined;
      try {
        valueHex = toHexQuantity(next.request.value);
        if (gas) gasHex = toHexQuantity(gas);
      } catch (error) {
        showNotification({
          type: "error",
          iconType: "transaction",
          title: "Invalid Transaction",
          message: (error as Error).message,
        });
        await backendApiRef.current.postSystemMessage(
          next.sessionId,
          `Invalid wallet transaction request payload: ${(error as Error).message}`
        );
        return;
      }

      const txParams: Record<string, string> = {
        from: resolvedFrom,
        to: next.request.to,
        value: valueHex,
        data: next.request.data,
        ...(gasHex ? { gas: gasHex } : {}),
      };

      const txHash = (await activeProvider.request({
        method: "eth_sendTransaction",
        params: [txParams],
      })) as string;

      showNotification({
        type: "success",
        title: "Transaction sent",
        message: `Transaction hash: ${txHash}`,
      });
      await backendApiRef.current.postSystemMessage(next.sessionId, `Transaction sent: ${txHash}`);
      if (currentThreadIdRef.current === next.threadId) {
        try {
          const state = await backendApiRef.current.fetchState(next.sessionId);
          applySessionMessagesToThread(next.threadId, state.messages);
        } catch (refreshError) {
          console.error("Failed to refresh state after wallet tx:", refreshError);
        }
      }
    } catch (error) {
      const normalized = normalizeWalletError(error);
      const final = normalized.rejected
        ? "Transaction rejected by user."
        : `Transaction failed: ${normalized.message}`;

      showNotification({
        type: normalized.rejected ? "notice" : "error",
        iconType: normalized.rejected ? "transaction" : "error",
        title: normalized.rejected ? "Transaction Rejected" : "Transaction Failed",
        message: normalized.rejected ? "Transaction was rejected by user." : normalized.message,
      });

      try {
        await backendApiRef.current.postSystemMessage(next.sessionId, final);
        if (currentThreadIdRef.current === next.threadId) {
          try {
            const state = await backendApiRef.current.fetchState(next.sessionId);
            applySessionMessagesToThread(next.threadId, state.messages);
          } catch (refreshError) {
            console.error("Failed to refresh state after wallet tx:", refreshError);
          }
        }
      } catch (postError) {
        console.error("Failed to report wallet tx result to backend:", postError);
      }
    } finally {
      walletTxInFlightRef.current = false;
      void drainWalletTxQueue();
    }
  }, [
    applySessionMessagesToThread,
    backendApiRef,
    currentThreadIdRef,
    onWalletTxRequest,
    publicKey,
    showNotification,
  ]);

  const handleWalletTxRequest = useCallback(
    (sessionId: string, threadId: string, request: WalletTxRequest) => {
      // Only pop the wallet if the user is currently viewing this thread.
      if (currentThreadIdRef.current !== threadId) return;

      const description = request.description || request.topic || "Wallet transaction requested";
      showNotification({
        type: "notice",
        iconType: "wallet",
        title: "Transaction Request",
        message: description,
      });

      enqueueWalletTxRequest(sessionId, threadId, request);
      void drainWalletTxQueue();
    },
    [currentThreadIdRef, drainWalletTxQueue, enqueueWalletTxRequest, showNotification]
  );

  return {
    handleWalletTxRequest,
  };
}
