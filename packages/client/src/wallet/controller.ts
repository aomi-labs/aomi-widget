import type { Action, ActionResult } from "../agent/types";
import { TypedEventEmitter } from "../event";

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
  action: Action;
  resolved: { action: Action; result: ActionResult };
  rejected: { action: Action; error: unknown };
}

/** Executes the request nested in a canonical Action. */
export class WalletController extends TypedEventEmitter<WalletControllerEvents> {
  constructor(readonly wallet?: AomiWalletAdapter) {
    super();
  }

  canHandle(action: Action): boolean {
    const request = action.request;
    if (request.type === "execute_evm") {
      return Boolean(this.wallet?.evm?.sendCalls || this.wallet?.evm?.sendTransaction);
    }
    if (request.type === "execute_svm") {
      return Boolean(
        this.wallet?.svm?.signAndSendTransaction || this.wallet?.svm?.sendTransaction,
      );
    }
    if (request.chainFamily === "evm") {
      const wallet = this.wallet?.evm;
      return Boolean(
        wallet &&
          request.payloads.every((payload) =>
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
        request.payloads.every((payload) =>
          payload.kind === "svm_message"
            ? wallet.signMessage
            : payload.kind === "svm_transaction"
              ? wallet.signTransaction
              : false,
        ),
    );
  }

  async execute(action: Action): Promise<ActionResult> {
    if (action.state !== "pending") throw new Error(`Action "${action.id}" is not pending`);
    this.emit("action", action);
    try {
      const result = await this.executeRequest(action);
      this.emit("resolved", { action, result });
      return result;
    } catch (error) {
      this.emit("rejected", { action, error });
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

  private executeRequest(action: Action): Promise<ActionResult> {
    switch (action.request.type) {
      case "execute_evm":
        return this.executeEvm(action.request);
      case "execute_svm":
        return this.executeSvm(action.request);
      case "sign":
        return this.executeSigning(action.request);
    }
  }

  private async executeEvm(
    request: Extract<Action["request"], { type: "execute_evm" }>,
  ): Promise<ActionResult> {
    const wallet = this.wallet?.evm;
    if (!wallet) throw new Error("No EVM wallet adapter is configured");
    const first = request.transactions[0];
    if (!first) throw new Error("EVM Action contains no transactions");
    if (
      request.transactions.some(
        (transaction) =>
          transaction.chain_id !== first.chain_id ||
          transaction.from.toLowerCase() !== wallet.address.toLowerCase(),
      )
    ) {
      throw new Error("The active EVM wallet does not match the Action");
    }
    if (this.evmChainId() !== first.chain_id) {
      if (!wallet.switchChain) throw new Error(`EVM wallet cannot switch to chain ${first.chain_id}`);
      await wallet.switchChain(first.chain_id);
    }
    const calls = request.transactions.map(({ to, data, value }) => ({ to, data, value }));
    const hashes: string[] = [];
    if (wallet.sendCalls) {
      hashes.push(...transactionHashes(await wallet.sendCalls({ chainId: first.chain_id, calls })));
    } else if (wallet.sendTransaction) {
      for (const call of calls) {
        hashes.push(
          ...transactionHashes(
            await wallet.sendTransaction({ chainId: first.chain_id, ...call }),
          ),
        );
      }
    }
    if (hashes.length === 0) throw new Error("EVM wallet returned no transaction hash");
    return {
      status: "submitted",
      legs: request.transactions.map((transaction, index) => ({
        id: `leg_${index + 1}`,
        status: "submitted",
        transactionId: hashes[index] ?? hashes.at(-1)!,
      })),
    };
  }

  private async executeSvm(
    request: Extract<Action["request"], { type: "execute_svm" }>,
  ): Promise<ActionResult> {
    const wallet = this.wallet?.svm;
    if (!wallet) throw new Error("No SVM wallet adapter is configured");
    const first = request.transactions[0];
    if (!first) throw new Error("SVM Action contains no transactions");
    if (
      request.transactions.some(
        (transaction) =>
          transaction.cluster !== first.cluster || transaction.payer !== wallet.address,
      )
    ) {
      throw new Error("The active SVM wallet does not match the Action");
    }
    await this.switchSvmCluster(first.cluster);
    const legs: Extract<ActionResult, { status: "submitted" }>["legs"] = [];
    for (const [index, transaction] of request.transactions.entries()) {
      const transactionBase64 = transaction.unsigned_transaction_base64;
      if (!transactionBase64) throw new Error("SVM Action has no unsigned transaction bytes");
      const result = wallet.signAndSendTransaction
        ? await wallet.signAndSendTransaction({
            transactionBase64,
            cluster: transaction.cluster,
          })
        : wallet.sendTransaction
          ? await wallet.sendTransaction({ transactionBase64, cluster: transaction.cluster })
          : undefined;
      if (result === undefined) throw new Error("SVM wallet cannot send transactions");
      legs.push({
        id: `leg_${index + 1}`,
        status: "submitted",
        transactionId: transactionHashes(result)[0] ?? signature(result),
        ...(typeof result === "object" && "signedTransaction" in result
          ? { signedTransactionBase64: result.signedTransaction }
          : {}),
      });
    }
    return { status: "submitted", legs };
  }

  private async executeSigning(
    request: Extract<Action["request"], { type: "sign" }>,
  ): Promise<ActionResult> {
    const outputs: Extract<ActionResult, { status: "signed" }>["outputs"] = [];
    if (request.chainFamily === "evm") {
      const wallet = this.wallet?.evm;
      if (!wallet) throw new Error("No EVM wallet adapter is configured");
      if (wallet.address.toLowerCase() !== request.signer.toLowerCase()) {
        throw new Error("The active EVM wallet is not the requested signer");
      }
      if (request.chainId && this.evmChainId() !== request.chainId) {
        if (!wallet.switchChain) throw new Error(`EVM wallet cannot switch to chain ${request.chainId}`);
        await wallet.switchChain(request.chainId);
      }
      for (const [index, payload] of request.payloads.entries()) {
        if (payload.kind === "evm_personal") {
          if (!wallet.signMessage) throw new Error("EVM wallet cannot sign messages");
          outputs.push({
            id: `payload_${index + 1}`,
            signature: signature(
              await wallet.signMessage({ message: payload.message, chainId: request.chainId }),
            ),
          });
        } else if (payload.kind === "evm_typed_data") {
          if (!wallet.signTypedData) throw new Error("EVM wallet cannot sign typed data");
          outputs.push({
            id: `payload_${index + 1}`,
            signature: signature(
              await wallet.signTypedData({ typedData: payload.typed_data, chainId: request.chainId }),
            ),
          });
        } else {
          throw new Error("EVM signing Action contains an SVM payload");
        }
      }
    } else {
      const wallet = this.wallet?.svm;
      if (!wallet) throw new Error("No SVM wallet adapter is configured");
      if (wallet.address !== request.signer) throw new Error("The active SVM wallet is not the requested signer");
      await this.switchSvmCluster(request.cluster);
      for (const [index, payload] of request.payloads.entries()) {
        if (payload.kind === "svm_message") {
          if (!wallet.signMessage) throw new Error("SVM wallet cannot sign messages");
          outputs.push({
            id: `payload_${index + 1}`,
            signature: signature(
              await wallet.signMessage({
                messageBase64: payload.message_base64,
                cluster: request.cluster,
              }),
            ),
          });
        } else if (payload.kind === "svm_transaction") {
          if (!wallet.signTransaction) throw new Error("SVM wallet cannot sign transactions");
          outputs.push({
            id: `payload_${index + 1}`,
            signedTransactionBase64: signedTransaction(
              await wallet.signTransaction({
                transactionBase64: payload.transaction_base64,
                cluster: request.cluster,
              }),
            ),
          });
        } else {
          throw new Error("SVM signing Action contains an EVM payload");
        }
      }
    }
    return { status: "signed", outputs };
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
    if (!switchCluster) throw new Error(`SVM wallet cannot switch to ${cluster}`);
    await switchCluster(cluster);
  }
}

function transactionHashes(result: unknown): string[] {
  if (typeof result === "string") return [result];
  const value = asRecord(result);
  if (!value) return [];
  if (Array.isArray(value.hashes)) return value.hashes.filter(isString);
  if (Array.isArray(value.transactionHashes)) return value.transactionHashes.filter(isString);
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
  if (typeof value?.signedTransaction === "string") return value.signedTransaction;
  throw new Error("Wallet returned no signed transaction");
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}
