import { TypedEventEmitter } from "../event";
import type {
  WalletRequest,
  WalletRequestResult,
  WalletSolanaLegResult,
} from "../session/types";

export interface EvmWalletCall {
  to: string;
  data?: string;
  value?: string;
}

export type WalletTransactionResult =
  | string
  | { hash?: string; transactionHash?: string }
  | { hashes?: string[]; transactionHashes?: string[] };

export interface EvmWalletAdapter {
  address: string;
  chainId?: number | (() => number | undefined);
  sendCalls?: (input: {
    chainId: number;
    calls: EvmWalletCall[];
  }) => Promise<WalletTransactionResult>;
  sendTransaction?: (
    input: EvmWalletCall & { chainId: number },
  ) => Promise<WalletTransactionResult>;
  signMessage?: (input: {
    message: string;
    chainId?: number;
  }) => Promise<string | { signature: string }>;
  signTypedData?: (input: {
    typedData: Record<string, unknown>;
    chainId?: number;
  }) => Promise<string | { signature: string }>;
  switchChain?: (chainId: number) => Promise<unknown>;
}

export interface SvmWalletAdapter {
  address: string;
  cluster?: string | (() => string | undefined);
  signTransaction?: (input: {
    transactionBase64: string;
    cluster?: string;
  }) => Promise<string | { signedTransaction?: string; signature?: string }>;
  sendTransaction?: (input: {
    transactionBase64: string;
    cluster?: string;
  }) => Promise<WalletTransactionResult>;
  signAndSendTransaction?: (input: {
    transactionBase64: string;
    cluster?: string;
  }) => Promise<string | { signature?: string; signedTransaction?: string }>;
  signMessage?: (input: {
    messageBase64: string;
    cluster?: string;
  }) => Promise<string | { signature: string }>;
  switchCluster?: (cluster: string) => Promise<unknown>;
}

export interface AomiWalletAdapter {
  evm?: EvmWalletAdapter;
  svm?: SvmWalletAdapter;
}

export interface WalletControllerEvents extends Record<string, unknown> {
  request: WalletRequest;
  resolved: { request: WalletRequest; result: WalletRequestResult };
  rejected: { request: WalletRequest; error: unknown };
}

/** Shared Pipeline and Agent wallet execution boundary. */
export class WalletController extends TypedEventEmitter<WalletControllerEvents> {
  constructor(readonly wallet?: AomiWalletAdapter) {
    super();
  }

  canHandle(request: WalletRequest): boolean {
    if (request.kind === "transaction") {
      return Boolean(
        this.wallet?.evm?.sendCalls || this.wallet?.evm?.sendTransaction,
      );
    }
    if (request.kind === "signing") {
      if (request.payload.chainFamily === "evm") {
        const wallet = this.wallet?.evm;
        return Boolean(
          wallet &&
          request.payload.payloads.every((payload) =>
            payload.kind === "evm_personal"
              ? wallet.signMessage
              : payload.kind === "evm_typed_data"
                ? wallet.signTypedData
                : false,
          ),
        );
      }
      const wallet = this.wallet?.svm;
      return Boolean(
        wallet &&
        request.payload.payloads.every((payload) =>
          payload.kind === "svm_message"
            ? wallet.signMessage
            : payload.kind === "svm_transaction"
              ? wallet.signTransaction
              : false,
        ),
      );
    }
    return Boolean(
      this.wallet?.svm?.signAndSendTransaction ||
      this.wallet?.svm?.sendTransaction,
    );
  }

  async execute(request: WalletRequest): Promise<WalletRequestResult> {
    this.emit("request", request);
    try {
      const result = await this.executeRequest(request);
      this.emit("resolved", { request, result });
      return result;
    } catch (error) {
      this.emit("rejected", { request, error });
      throw error;
    }
  }

  userState(): Record<string, unknown> | undefined {
    if (!this.wallet?.evm && !this.wallet?.svm) return undefined;
    return {
      connection: { is_connected: true },
      ...(this.wallet.evm
        ? {
            evm: {
              address: this.wallet.evm.address,
              ...(this.evmChainId() ? { chain_id: this.evmChainId() } : {}),
            },
          }
        : {}),
      ...(this.wallet.svm
        ? {
            svm: {
              address: this.wallet.svm.address,
              ...(this.svmCluster() ? { cluster: this.svmCluster() } : {}),
            },
          }
        : {}),
    };
  }

  private executeRequest(request: WalletRequest): Promise<WalletRequestResult> {
    switch (request.kind) {
      case "transaction":
        return this.executeEvmTransactions(request);
      case "signing":
        return this.executeSigning(request);
      case "solana_send":
      case "solana_sign_and_send":
        return this.executeSvmTransactions(request);
    }
  }

  private async executeEvmTransactions(
    request: Extract<WalletRequest, { kind: "transaction" }>,
  ): Promise<WalletRequestResult> {
    const wallet = this.wallet?.evm;
    if (!wallet) throw new Error("No EVM wallet adapter is configured");
    const senders = new Set(
      (request.payload.calls ?? [])
        .map((call) => call.from?.toLowerCase())
        .filter((address): address is string => Boolean(address)),
    );
    if (
      senders.size > 0 &&
      (senders.size !== 1 || !senders.has(wallet.address.toLowerCase()))
    ) {
      throw new Error("The active EVM wallet is not the requested sender");
    }
    const calls = request.payload.calls?.length
      ? request.payload.calls.map(({ to, data, value }) => ({
          to,
          data,
          value,
        }))
      : request.payload.to
        ? [
            {
              to: request.payload.to,
              data: request.payload.data,
              value: request.payload.value,
            },
          ]
        : [];
    if (calls.length === 0) throw new Error("Wallet request contains no calls");
    const chainId = request.payload.chainId ?? this.evmChainId();
    if (!chainId) throw new Error("EVM wallet request has no chainId");
    if (this.evmChainId() !== chainId) {
      if (!wallet.switchChain) {
        throw new Error(`EVM wallet cannot switch to chain ${chainId}`);
      }
      await wallet.switchChain(chainId);
    }

    const hashes: string[] = [];
    if (wallet.sendCalls) {
      hashes.push(
        ...transactionHashes(await wallet.sendCalls({ chainId, calls })),
      );
    } else if (wallet.sendTransaction) {
      for (const call of calls) {
        hashes.push(
          ...transactionHashes(
            await wallet.sendTransaction({ chainId, ...call }),
          ),
        );
      }
    } else {
      throw new Error("EVM wallet cannot send calls");
    }
    if (hashes.length === 0) {
      throw new Error("EVM wallet returned no transaction hash");
    }
    return {
      kind: "transaction",
      txHash: hashes.at(-1)!,
      txHashes: hashes,
      completedTxIds: request.payload.txIds,
      executionKind: "eoa",
      batched: calls.length > 1,
      callCount: calls.length,
    };
  }

  private async executeSigning(
    request: Extract<WalletRequest, { kind: "signing" }>,
  ): Promise<WalletRequestResult> {
    const signatures: string[] = [];
    if (request.payload.chainFamily === "evm") {
      const wallet = this.wallet?.evm;
      if (!wallet) throw new Error("No EVM wallet adapter is configured");
      if (
        wallet.address.toLowerCase() !== request.payload.signer.toLowerCase()
      ) {
        throw new Error("The active EVM wallet is not the requested signer");
      }
      if (
        request.payload.chainId &&
        this.evmChainId() !== request.payload.chainId
      ) {
        if (!wallet.switchChain) {
          throw new Error(
            `EVM wallet cannot switch to chain ${request.payload.chainId}`,
          );
        }
        await wallet.switchChain(request.payload.chainId);
      }
      for (const payload of request.payload.payloads) {
        if (payload.kind === "evm_personal") {
          if (!wallet.signMessage)
            throw new Error("EVM wallet cannot sign messages");
          signatures.push(
            signature(
              await wallet.signMessage({
                message: payload.message,
                chainId: request.payload.chainId,
              }),
            ),
          );
        } else if (payload.kind === "evm_typed_data") {
          if (!wallet.signTypedData) {
            throw new Error("EVM wallet cannot sign typed data");
          }
          signatures.push(
            signature(
              await wallet.signTypedData({
                typedData: payload.typedData,
                chainId: request.payload.chainId,
              }),
            ),
          );
        } else {
          throw new Error("EVM signing request contains an SVM payload");
        }
      }
    } else {
      const wallet = this.wallet?.svm;
      if (!wallet) throw new Error("No SVM wallet adapter is configured");
      if (wallet.address !== request.payload.signer) {
        throw new Error("The active SVM wallet is not the requested signer");
      }
      await this.switchSvmCluster(request.payload.cluster);
      for (const payload of request.payload.payloads) {
        if (payload.kind === "svm_message") {
          if (!wallet.signMessage)
            throw new Error("SVM wallet cannot sign messages");
          signatures.push(
            signature(
              await wallet.signMessage({
                messageBase64: payload.messageBase64,
                cluster: request.payload.cluster,
              }),
            ),
          );
        } else if (payload.kind === "svm_transaction") {
          if (!wallet.signTransaction) {
            throw new Error("SVM wallet cannot sign transactions");
          }
          signatures.push(
            signedTransaction(
              await wallet.signTransaction({
                transactionBase64: payload.transactionBase64,
                cluster: request.payload.cluster,
              }),
            ),
          );
        } else {
          throw new Error("SVM signing request contains an EVM payload");
        }
      }
    }
    return { kind: "signing", signatures };
  }

  private async executeSvmTransactions(
    request: Extract<
      WalletRequest,
      { kind: "solana_send" | "solana_sign_and_send" }
    >,
  ): Promise<WalletRequestResult> {
    const wallet = this.wallet?.svm;
    if (!wallet) throw new Error("No SVM wallet adapter is configured");
    await this.switchSvmCluster(request.payload.cluster);
    const transactions = request.payload.transactions?.length
      ? request.payload.transactions
      : request.payload.unsignedTx
        ? [
            {
              id: request.payload.requestId ?? request.id,
              unsignedTx: request.payload.unsignedTx,
              description: request.payload.description,
            },
          ]
        : [];
    if (transactions.length === 0) {
      throw new Error("SVM wallet request contains no transaction");
    }

    const legs: WalletSolanaLegResult[] = [];
    for (const transaction of transactions) {
      const result = wallet.signAndSendTransaction
        ? await wallet.signAndSendTransaction({
            transactionBase64: transaction.unsignedTx,
            cluster: request.payload.cluster,
          })
        : wallet.sendTransaction
          ? await wallet.sendTransaction({
              transactionBase64: transaction.unsignedTx,
              cluster: request.payload.cluster,
            })
          : undefined;
      if (result === undefined) {
        throw new Error("SVM wallet cannot send transactions");
      }
      legs.push({
        id: transaction.id,
        status: "submitted",
        signature: transactionHashes(result)[0] ?? signature(result),
        ...(typeof result === "object" && "signedTransaction" in result
          ? { signedTx: result.signedTransaction }
          : {}),
      });
    }
    const last = legs.at(-1)!;
    return {
      kind: request.kind,
      signature: last.signature!,
      signedTx: last.signedTx,
      legs,
    };
  }

  private evmChainId(): number | undefined {
    const value = this.wallet?.evm?.chainId;
    return typeof value === "function" ? value() : value;
  }

  private svmCluster(): string | undefined {
    const value = this.wallet?.svm?.cluster;
    return typeof value === "function" ? value() : value;
  }

  private async switchSvmCluster(cluster?: string): Promise<void> {
    if (!cluster || cluster === this.svmCluster()) return;
    const switchCluster = this.wallet?.svm?.switchCluster;
    if (!switchCluster) {
      throw new Error(`SVM wallet cannot switch to ${cluster}`);
    }
    await switchCluster(cluster);
  }
}

function transactionHashes(result: unknown): string[] {
  if (typeof result === "string") return [result];
  const value = asRecord(result);
  if (!value) return [];
  if (Array.isArray(value.hashes)) {
    return value.hashes.filter(
      (hash): hash is string => typeof hash === "string",
    );
  }
  if (Array.isArray(value.transactionHashes)) {
    return value.transactionHashes.filter(
      (hash): hash is string => typeof hash === "string",
    );
  }
  const hash =
    typeof value.hash === "string"
      ? value.hash
      : typeof value.transactionHash === "string"
        ? value.transactionHash
        : undefined;
  return hash ? [hash] : [];
}

function signature(result: unknown): string {
  if (typeof result === "string") return result;
  const value = asRecord(result);
  if (typeof value?.signature === "string") return value.signature;
  throw new Error("Wallet returned no signature");
}

function signedTransaction(result: unknown): string {
  if (typeof result === "string") return result;
  const value = asRecord(result);
  if (typeof value?.signedTransaction === "string") {
    return value.signedTransaction;
  }
  throw new Error("Wallet returned no signed transaction");
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
