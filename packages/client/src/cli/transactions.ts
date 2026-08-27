import type { ExecutionResult, AAWalletCall } from "../aa";
import type { Action } from "../agent/types";
import type {
  WalletEip712Payload,
  WalletSolanaSignMessagePayload,
  WalletSolanaSignPayload,
  WalletTxPayload,
} from "../wallet-utils";
import { toAAWalletCall } from "../wallet-utils";
import type { PendingSolTx, PendingTx, SignedSolTx, SignedTx } from "./state";

export function actionToPendingTx(
  action: Action,
): Omit<PendingTx, "id"> | null {
  if (action.request.type === "execute_evm") {
    const first = action.request.transactions[0];
    if (!first) return null;
    const payload: WalletTxPayload = {
      requestId: action.id,
      chainId: first.chain_id,
      calls: action.request.transactions.map((transaction, index) => ({
        txId: index + 1,
        to: transaction.to,
        value: transaction.value,
        data: transaction.data,
        chainId: transaction.chain_id,
        from: transaction.from,
        gas: transaction.gas,
        description: transaction.label,
      })),
      txIds: action.request.transactions.map((_, index) => index + 1),
    };
    return {
      kind: "transaction",
      agentRequestId: action.id,
      txId: payload.txId,
      to: first.to,
      value: first.value,
      data: first.data,
      chainId: first.chain_id,
      description: first.label,
      timestamp: action.created_at,
      payload: payload as unknown as Record<string, unknown>,
    };
  }

  if (action.request.type === "sign" && action.request.chainFamily === "evm") {
    const signable = action.request.payloads[0];
    if (
      !signable ||
      (signable.kind !== "evm_personal" && signable.kind !== "evm_typed_data")
    ) {
      return null;
    }
    const payload: WalletEip712Payload = {
      requestId: action.id,
      signer: action.request.signer,
      chainId: action.request.chainId,
      description: action.request.description,
      ...(signable.kind === "evm_personal"
        ? { non_typed_data: signable.message }
        : {
            typed_data: signable.typed_data as WalletEip712Payload["typed_data"],
          }),
    };
    return {
      kind: "eip712_sign",
      agentRequestId: action.id,
      eip712Id: payload.eip712Id,
      description: payload.description,
      timestamp: action.created_at,
      payload: action.request as unknown as Record<string, unknown>,
    };
  }

  return null;
}

/**
 * Convert a `solana_sign` [`WalletRequest`] into a [`PendingSolTx`] without
 * the display id. Companion to [`actionToPendingTx`] — split out
 * because Solana state is its own typed array, not a discriminated union
 * member of the EVM/EIP-712 record.
 */
export function actionToPendingSolTx(
  action: Action,
): Omit<PendingSolTx, "id"> | null {
  if (action.request.type === "sign" && action.request.chainFamily === "svm") {
    const signable = action.request.payloads[0];
    if (!signable) return null;
    if (signable.kind === "svm_message") {
      return {
        agentRequestId: action.id,
        requestKind: "solana_sign_message",
        message: signable.message_base64,
        cluster: action.request.cluster,
        signer: action.request.signer,
        description: action.request.description,
        timestamp: action.created_at,
        payload: action.request as unknown as Record<string, unknown>,
      };
    }
    if (signable.kind === "svm_transaction") {
      return {
        agentRequestId: action.id,
        requestKind: "solana_sign",
        unsignedTx: signable.transaction_base64,
        cluster: action.request.cluster,
        signer: action.request.signer,
        description: action.request.description,
        timestamp: action.created_at,
        payload: action.request as unknown as Record<string, unknown>,
      };
    }
    return null;
  }
  if (action.request.type !== "execute_svm") return null;
  const first = action.request.transactions[0];
  if (!first?.unsigned_transaction_base64) return null;
  const payload: WalletSolanaSignPayload = {
    requestId: action.id,
    unsignedTx: first.unsigned_transaction_base64,
    cluster: first.cluster,
    description: first.description,
    transactions: action.request.transactions.map((transaction, index) => ({
      id: String(index),
      unsignedTx: transaction.unsigned_transaction_base64 ?? "",
      description: transaction.description,
    })),
  };

  return {
    agentRequestId: action.id,
    solanaId: payload.pendingSolanaId,
    solanaIds: payload.pendingSolanaIds,
    requestKind: "solana_sign_and_send",
    unsignedTx: payload.unsignedTx,
    cluster: payload.cluster,
    description: payload.description,
    timestamp: action.created_at,
    payload: payload as unknown as Record<string, unknown>,
  };
}

export function pendingTxToCallList(tx: PendingTx): AAWalletCall[] {
  if (tx.kind !== "transaction" || !tx.to) {
    throw new Error("pending_transaction_missing_call_data");
  }

  const calls = (tx.payload as { calls?: WalletTxPayload["calls"] }).calls;
  if (calls?.length) {
    return calls.map((call) =>
      toAAWalletCall({
        to: call.to,
        value: call.value,
        data: call.data,
        chainId: call.chainId ?? tx.chainId,
      }),
    );
  }

  return [
    toAAWalletCall({
      to: tx.to,
      value: tx.value,
      data: tx.data,
      chainId: tx.chainId,
    }),
  ];
}

export function toSignedTransactionRecord(
  tx: PendingTx,
  execution: ExecutionResult,
  from: string,
  chainId: number,
  timestamp: number,
): SignedTx {
  return {
    id: tx.id,
    kind: "transaction",
    pendingTxId: tx.txId,
    txHash: execution.txHash,
    txHashes: execution.txHashes,
    executionKind: execution.executionKind,
    batched: execution.batched,
    sponsored: execution.sponsored,
    from,
    to: tx.to,
    value: tx.value,
    chainId,
    timestamp,
  };
}

export function formatTxLine(tx: PendingTx, prefix: string): string {
  const parts = [`${prefix} ${tx.id}`];
  if (tx.kind === "transaction") {
    parts.push(`to: ${tx.to ?? "?"}`);
    if (tx.value) parts.push(`value: ${tx.value}`);
    if (tx.chainId) parts.push(`chain: ${tx.chainId}`);
    if (tx.data) parts.push(`data: ${tx.data.slice(0, 20)}...`);
  } else {
    parts.push(tx.payload.non_typed_data ? "erc191" : "eip712");
    if (tx.description) parts.push(tx.description);
  }
  parts.push(`(${new Date(tx.timestamp).toLocaleTimeString()})`);
  return parts.join("  ");
}

export function formatSignedTxLine(tx: SignedTx, prefix: string): string {
  const parts = [`${prefix} ${tx.id}`];

  if (tx.kind === "eip712_sign") {
    parts.push(`sig: ${tx.signature?.slice(0, 20)}...`);
    if (tx.description) parts.push(tx.description);
  } else {
    parts.push(`hash: ${tx.txHash}`);
    if (tx.executionKind) parts.push(`exec: ${tx.executionKind}`);
    if (tx.aaProvider) parts.push(`provider: ${tx.aaProvider}`);
    if (tx.aaMode) parts.push(`mode: ${tx.aaMode}`);
    if (tx.txHashes && tx.txHashes.length > 1) {
      parts.push(`txs: ${tx.txHashes.length}`);
    }
    if (tx.serviceFeeStatus) {
      parts.push(`fee: ${tx.serviceFeeStatus}`);
    }
    if (tx.sponsored) parts.push("sponsored");
    if (tx.smartAccount4337) parts.push(`4337: ${tx.smartAccount4337}`);
    if (tx.Delegation7702) parts.push(`delegation: ${tx.Delegation7702}`);
    if (tx.to) parts.push(`to: ${tx.to}`);
    if (tx.value) parts.push(`value: ${tx.value}`);
  }

  parts.push(`(${new Date(tx.timestamp).toLocaleTimeString()})`);
  return parts.join("  ");
}

/** Render a pending Solana sign request for `aomi tx list`. */
export function formatPendingSolTxLine(
  tx: PendingSolTx,
  prefix: string,
): string {
  const parts = [`${prefix} ${tx.id}`, tx.requestKind ?? "solana_sign"];
  if (tx.cluster) parts.push(`cluster: ${tx.cluster}`);
  if (tx.description) parts.push(tx.description);
  if (tx.signer) parts.push(`signer: ${tx.signer}`);
  if (tx.unsignedTx) parts.push(`tx: ${tx.unsignedTx.slice(0, 20)}...`);
  if (tx.message) parts.push(`message: ${tx.message.slice(0, 20)}...`);
  parts.push(`(${new Date(tx.timestamp).toLocaleTimeString()})`);
  return parts.join("  ");
}

/** Render a locally-persisted signed Solana tx record. */
export function formatSignedSolTxLine(tx: SignedSolTx, prefix: string): string {
  const parts = [`${prefix} ${tx.id}`, tx.requestKind ?? "solana_sign"];
  if (tx.signedTx) parts.push(`signed: ${tx.signedTx.slice(0, 20)}...`);
  if (tx.signature) parts.push(`sig: ${tx.signature.slice(0, 20)}...`);
  if (tx.cluster) parts.push(`cluster: ${tx.cluster}`);
  if (tx.signer) parts.push(`signer: ${tx.signer}`);
  if (tx.description) parts.push(tx.description);
  parts.push(`(${new Date(tx.timestamp).toLocaleTimeString()})`);
  return parts.join("  ");
}
