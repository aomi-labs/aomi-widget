import type {
  ExecutionResult,
  AAWalletCall,
} from "../aa";
import type { WalletRequest } from "../session";
import type { WalletEip712Payload, WalletTxPayload } from "../wallet-utils";
import { toAAWalletCall } from "../wallet-utils";
import type { PendingTx, SignedTx } from "./state";

export function walletRequestToPendingTx(
  request: WalletRequest,
): Omit<PendingTx, "id"> {
  if (request.kind === "transaction") {
    const payload = request.payload as WalletTxPayload;
    return {
      kind: "transaction",
      txId: payload.txId,
      to: payload.to,
      value: payload.value,
      data: payload.data,
      chainId: payload.chainId,
      timestamp: request.timestamp,
      payload: request.payload as unknown as Record<string, unknown>,
    };
  }

  const payload = request.payload as WalletEip712Payload;
  return {
    kind: "eip712_sign",
    eip712Id: payload.eip712Id,
    description: payload.description,
    timestamp: request.timestamp,
    payload: request.payload as unknown as Record<string, unknown>,
  };
}

export function pendingTxToCallList(tx: PendingTx): AAWalletCall[] {
  if (tx.kind !== "transaction" || !tx.to) {
    throw new Error("pending_transaction_missing_call_data");
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
  aaProvider?: string,
  aaMode?: string,
): SignedTx {
  return {
    id: tx.id,
    kind: "transaction",
    txHash: execution.txHash,
    txHashes: execution.txHashes,
    executionKind: execution.executionKind,
    aaProvider,
    aaMode,
    batched: execution.batched,
    sponsored: execution.sponsored,
    AAAddress: execution.AAAddress,
    delegationAddress: execution.delegationAddress,
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
    parts.push("eip712");
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
    if (tx.sponsored) parts.push("sponsored");
    if (tx.AAAddress) parts.push(`aa: ${tx.AAAddress}`);
    if (tx.delegationAddress) parts.push(`delegation: ${tx.delegationAddress}`);
    if (tx.to) parts.push(`to: ${tx.to}`);
    if (tx.value) parts.push(`value: ${tx.value}`);
  }

  parts.push(`(${new Date(tx.timestamp).toLocaleTimeString()})`);
  return parts.join("  ");
}
