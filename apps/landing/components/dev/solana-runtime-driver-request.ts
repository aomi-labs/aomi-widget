import type { Action } from "@aomi-labs/react";

export type SolanaDriverActionKind = "sign" | "execute_svm";

type SolanaDriverActionInput = {
  kind: SolanaDriverActionKind;
  unsignedTx: string;
  signer: string;
  description: string;
  cluster: string;
};

export function createSolanaDriverAction({
  kind,
  unsignedTx,
  signer,
  description,
  cluster,
}: SolanaDriverActionInput): Action {
  const id = `act_${crypto.randomUUID().replaceAll("-", "")}`;
  const timestamp = Date.now();
  const meta = {
    event_id: `event_${id}`,
    sequence: 1,
    turn_id: "turn_driver",
    occurred_at: timestamp,
    type: "action" as const,
    id,
    revision: 0,
    state: "pending" as const,
    created_at: timestamp,
    expires_at: null,
  };
  return kind === "sign"
    ? {
        ...meta,
        request: {
          type: "sign",
          requestId: id,
          chainFamily: "svm",
          executionKind: "transaction",
          signer,
          cluster,
          description,
          payloads: [
            { kind: "svm_transaction", transaction_base64: unsignedTx },
          ],
        },
      }
    : {
        ...meta,
        request: {
          type: "execute_svm",
          transactions: [
            {
              payer: signer,
              cluster,
              version: "v0",
              instructions: [],
              unsigned_transaction_base64: unsignedTx,
              description,
              kind: "driver",
            },
          ],
        },
      };
}
