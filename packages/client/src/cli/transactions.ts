import type { WalletRequest } from "../session";
import type { WalletEip712Payload, WalletTxPayload } from "../wallet-utils";
import type { PendingTx } from "./state";

export function walletRequestToPendingTx(
  request: WalletRequest,
): Omit<PendingTx, "id"> {
  if (request.kind === "transaction") {
    const payload = request.payload as WalletTxPayload;
    return {
      kind: "transaction",
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
    description: payload.description,
    timestamp: request.timestamp,
    payload: request.payload as unknown as Record<string, unknown>,
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
