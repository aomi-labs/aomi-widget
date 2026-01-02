import type { MutableRefObject } from "react";

import type { BackendApi } from "../api/client";
import type { SessionMessage } from "../api/types";
import type { Notification } from "../lib/notification-context";
import {
  normalizeWalletError,
  pickInjectedProvider,
  toHexQuantity,
  type WalletTxRequestHandler,
  type WalletTxRequestPayload,
} from "../utils/wallet";

type WalletHandlerConfig = {
  backendApiRef: MutableRefObject<BackendApi>;
  onWalletTxRequest?: WalletTxRequestHandler;
  publicKey?: string;
  showNotification: (notification: Omit<Notification, "id">) => void;
  applySessionMessagesToThread: (
    threadId: string,
    msgs?: SessionMessage[] | null
  ) => void;
  getCurrentThreadId: () => string;
};

export class WalletHandler {
  private handledRequests = new Set<string>();
  private queue: Array<{
    sessionId: string;
    threadId: string;
    request: WalletTxRequestPayload;
  }> = [];
  private inFlight = false;

  constructor(private readonly config: WalletHandlerConfig) {}

  handleRequest(
    sessionId: string,
    threadId: string,
    request: WalletTxRequestPayload
  ) {
    // Only pop the wallet if the user is currently viewing this thread.
    if (this.config.getCurrentThreadId() !== threadId) return;

    const description =
      request.description || request.topic || "Wallet transaction requested";
    this.config.showNotification({
      type: "notice",
      iconType: "wallet",
      title: "Transaction Request",
      message: description,
    });

    this.enqueue(sessionId, threadId, request);
    void this.drain();
  }

  private enqueue(
    sessionId: string,
    threadId: string,
    request: WalletTxRequestPayload
  ) {
    const key = `${sessionId}:${request.timestamp ?? JSON.stringify(request)}`;
    if (this.handledRequests.has(key)) return;
    this.handledRequests.add(key);
    this.queue.push({ sessionId, threadId, request });
  }

  private async drain() {
    if (this.inFlight) return;
    const next = this.queue.shift();
    if (!next) return;
    this.inFlight = true;

    try {
      if (this.config.onWalletTxRequest) {
        const txHash = await this.config.onWalletTxRequest(next.request, {
          sessionId: next.sessionId,
          threadId: next.threadId,
          publicKey: this.config.publicKey,
        });
        this.config.showNotification({
          type: "success",
          iconType: "transaction",
          title: "Transaction Sent",
          message: `Hash: ${txHash}`,
        });
        await this.config.backendApiRef.current.postSystemMessage(
          next.sessionId,
          `Transaction sent: ${txHash}`
        );
        await this.refreshThreadIfCurrent(next.sessionId, next.threadId);
        return;
      }

      const activeProvider = await pickInjectedProvider(this.config.publicKey);
      if (!activeProvider?.request) {
        this.config.showNotification({
          type: "error",
          iconType: "wallet",
          title: "Wallet Not Found",
          message: "No wallet provider found (window.ethereum missing).",
        });
        await this.config.backendApiRef.current.postSystemMessage(
          next.sessionId,
          "No wallet provider found (window.ethereum missing)."
        );
        return;
      }

      const accounts = (await activeProvider.request({
        method: "eth_accounts",
      })) as unknown;
      const addresses = Array.isArray(accounts)
        ? (accounts as unknown[]).map(String)
        : [];
      const from = this.config.publicKey || addresses[0];

      if (!from) {
        await activeProvider.request({ method: "eth_requestAccounts" });
      }

      const fromAddress =
        this.config.publicKey ||
        ((await activeProvider.request({ method: "eth_accounts" })) as unknown);
      const resolvedFrom =
        this.config.publicKey ||
        (Array.isArray(fromAddress)
          ? String((fromAddress as unknown[])[0] ?? "")
          : "");

      if (!resolvedFrom) {
        this.config.showNotification({
          type: "error",
          iconType: "wallet",
          title: "Wallet Not Connected",
          message: "Please connect a wallet to sign the requested transaction.",
        });
        await this.config.backendApiRef.current.postSystemMessage(
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
        this.config.showNotification({
          type: "error",
          iconType: "transaction",
          title: "Invalid Transaction",
          message: (error as Error).message,
        });
        await this.config.backendApiRef.current.postSystemMessage(
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

      this.config.showNotification({
        type: "success",
        title: "Transaction sent",
        message: `Transaction hash: ${txHash}`,
      });
      await this.config.backendApiRef.current.postSystemMessage(
        next.sessionId,
        `Transaction sent: ${txHash}`
      );
      await this.refreshThreadIfCurrent(next.sessionId, next.threadId);
    } catch (error) {
      const normalized = normalizeWalletError(error);
      const final = normalized.rejected
        ? "Transaction rejected by user."
        : `Transaction failed: ${normalized.message}`;

      this.config.showNotification({
        type: normalized.rejected ? "notice" : "error",
        iconType: normalized.rejected ? "transaction" : "error",
        title: normalized.rejected ? "Transaction Rejected" : "Transaction Failed",
        message: normalized.rejected
          ? "Transaction was rejected by user."
          : normalized.message,
      });

      try {
        await this.config.backendApiRef.current.postSystemMessage(
          next.sessionId,
          final
        );
        await this.refreshThreadIfCurrent(next.sessionId, next.threadId);
      } catch (postError) {
        console.error("Failed to report wallet tx result to backend:", postError);
      }
    } finally {
      this.inFlight = false;
      void this.drain();
    }
  }

  private async refreshThreadIfCurrent(sessionId: string, threadId: string) {
    if (this.config.getCurrentThreadId() !== threadId) return;
    try {
      const state = await this.config.backendApiRef.current.fetchState(sessionId);
      this.config.applySessionMessagesToThread(threadId, state.messages);
    } catch (refreshError) {
      console.error("Failed to refresh state after wallet tx:", refreshError);
    }
  }
}

