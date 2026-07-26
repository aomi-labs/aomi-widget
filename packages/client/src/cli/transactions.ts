import type { ExecutionResult, AAWalletCall } from "../aa";
import type { WalletRequest } from "../session";
import type {
  WalletEip712Payload,
  WalletSolanaSignMessagePayload,
  WalletSolanaSignPayload,
  WalletTxPayload,
} from "../wallet-utils";
import { toAAWalletCall } from "../wallet-utils";
import type { PendingSolTx, PendingTx, SignedSolTx, SignedTx } from "./state";

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

  if (request.kind === "eip712_sign") {
    const payload = request.payload as WalletEip712Payload;
    return {
      kind: "eip712_sign",
      eip712Id: payload.eip712Id,
      description: payload.description,
      timestamp: request.timestamp,
      payload: request.payload as unknown as Record<string, unknown>,
    };
  }

  throw new Error(
    `walletRequestToPendingTx received non-EVM kind '${request.kind}'. Solana sign requests use walletRequestToPendingSolTx.`,
  );
}

/**
 * Convert a `solana_sign` [`WalletRequest`] into a [`PendingSolTx`] without
 * the display id. Companion to [`walletRequestToPendingTx`] — split out
 * because Solana state is its own typed array, not a discriminated union
 * member of the EVM/EIP-712 record.
 */
export function walletRequestToPendingSolTx(
  request: WalletRequest,
): Omit<PendingSolTx, "id"> | null {
  if (request.kind === "solana_sign_message") {
    const payload = request.payload as WalletSolanaSignMessagePayload;
    if (
      payload.pendingSolanaId === undefined ||
      payload.message === undefined
    ) {
      return null;
    }
    return {
      solanaId: payload.pendingSolanaId,
      requestKind: request.kind,
      message: payload.message,
      cluster: payload.cluster,
      description: payload.description,
      timestamp: request.timestamp,
      payload: request.payload as unknown as Record<string, unknown>,
    };
  }
  if (
    request.kind !== "solana_sign" &&
    request.kind !== "solana_send" &&
    request.kind !== "solana_sign_and_send"
  ) {
    return null;
  }
  const payload = request.payload as WalletSolanaSignPayload;
  if (
    payload.pendingSolanaId === undefined ||
    payload.unsignedTx === undefined
  ) {
    return null;
  }

  return {
    solanaId: payload.pendingSolanaId,
    solanaIds: payload.pendingSolanaIds,
    requestKind: request.kind,
    unsignedTx: payload.unsignedTx,
    cluster: payload.cluster,
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
): SignedTx {
  return {
    id: tx.id,
    kind: "transaction",
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
