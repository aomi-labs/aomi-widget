import type { WalletRequest, WalletRequestKind } from "@aomi-labs/react";

export type SolanaDriverRequestKind = Extract<
  WalletRequestKind,
  "signing" | "solana_send" | "solana_sign_and_send"
>;

type SolanaDriverRequestInput = {
  kind: SolanaDriverRequestKind;
  unsignedTx: string;
  signer: string;
  description: string;
  cluster: string;
  pendingSolanaId: number;
};

export function createSolanaDriverRequest({
  kind,
  unsignedTx,
  signer,
  description,
  cluster,
  pendingSolanaId,
}: SolanaDriverRequestInput): WalletRequest {
  const timestamp = Date.now();

  if (kind === "signing") {
    const requestId = `sign:${crypto.randomUUID()}`;
    return {
      id: requestId,
      kind,
      payload: {
        requestId,
        chainFamily: "svm",
        executionKind: "transaction",
        signer,
        cluster,
        description,
        payloads: [{ kind: "svm_transaction", transactionBase64: unsignedTx }],
      },
      timestamp,
    };
  }

  const requestId = `${kind}-${pendingSolanaId}`;
  if (kind === "solana_send") {
    return {
      id: requestId,
      kind,
      payload: { unsignedTx, description, cluster, pendingSolanaId },
      timestamp,
    };
  }

  return {
    id: requestId,
    kind,
    payload: { unsignedTx, description, cluster, pendingSolanaId },
    timestamp,
  };
}
