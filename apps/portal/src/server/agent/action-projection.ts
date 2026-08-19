import type { AomiPublicV1 } from "@aomi-labs/client";

export type PublicAgentAction = AomiPublicV1["schemas"]["AgentAction"];

type KernelActionState =
  | "staged"
  | "awaiting_external"
  | "submitted"
  | "observing"
  | "completed"
  | "rejected"
  | "expired"
  | "superseded"
  | "failed";

type KernelMetadata = {
  generation: number;
  context_generation: number;
  description: string;
};

type KernelEvmLeg = {
  kind: "evm";
  leg_id: string;
  chain_id: number;
  to: string;
  value: string;
  data: string;
  gas?: string | null;
  max_fee_per_gas?: string | null;
  max_priority_fee_per_gas?: string | null;
  gas_price?: string | null;
  nonce?: string | null;
  transaction_type?: string | null;
  access_list: Array<{ address: string; storage_keys: string[] }>;
  description: string;
  simulation: {
    success: boolean;
    gas_used?: string | null;
    error?: string | null;
  };
  intent_hash: string;
};

type KernelSvmLeg = {
  kind: "svm";
  leg_id: string;
  cluster: string;
  unsigned_transaction_base64: string;
  recent_blockhash: string;
  last_valid_block_height?: number | null;
  preserve_blockhash: boolean;
  description: string;
  intent_hash: string;
};

type KernelSignablePayload =
  | {
      kind: "evm_personal";
      payload_id: string;
      message: string;
      raw_payload: string;
    }
  | {
      kind: "evm_typed_data";
      payload_id: string;
      typed_data: Record<string, unknown>;
      raw_payload: string;
    }
  | {
      kind: "svm_message";
      payload_id: string;
      message_base64: string;
      digest: string;
    }
  | {
      kind: "svm_transaction";
      payload_id: string;
      unsigned_transaction_base64: string;
      digest: string;
    };

type KernelActionPayload =
  | (KernelMetadata & {
      action_type: "external_transaction";
      family: "evm" | "svm";
      execution_kind: "external";
      broadcaster: "wallet";
      signer: string;
      chain_ref: string;
      legs: Array<KernelEvmLeg | KernelSvmLeg>;
    })
  | (KernelMetadata & {
      action_type: "signing_request";
      family: "evm" | "svm";
      execution_kind:
        | "message"
        | "transaction"
        | "account_abstraction"
        | "hosted";
      broadcaster: "wallet" | "backend";
      signer: string;
      operation_id?: string | null;
      payloads: KernelSignablePayload[];
      chain_id?: number | null;
      cluster?: string | null;
      executor?: string | null;
      calls_digest?: string | null;
      calls?: Array<{ to: string; value: string; data?: string }>;
      fees?: Array<{
        asset: { kind: "native" | "token"; address?: string };
        amount: string;
        recipient: string;
      }>;
      sponsorship?: "required" | null;
    });

export type KernelAgentAction = {
  action_id: string;
  revision: number;
  action_type: "external_transaction" | "signing_request";
  status: KernelActionState;
  schema_version: number;
  payload: KernelActionPayload;
  payload_hash: string;
  broadcast_operation_id?: string | null;
  created_at: number;
  expires_at: number;
};

export function projectAgentAction(
  action: KernelAgentAction,
): PublicAgentAction {
  if (action.action_type !== action.payload.action_type) {
    throw new TypeError("kernel action type differs from its sealed payload");
  }
  const base = {
    id: action.action_id,
    generation: action.payload.generation,
    contextGeneration: action.payload.context_generation,
    revision: action.revision,
    status: projectStatus(action.status, action.action_type),
    createdAt: new Date(action.created_at * 1_000).toISOString(),
    expiresAt:
      action.expires_at > 0
        ? new Date(action.expires_at * 1_000).toISOString()
        : null,
    description: action.payload.description,
  } as const;

  if (action.payload.action_type === "external_transaction") {
    const payload = action.payload;
    if (payload.family === "evm") {
      const transactions = payload.legs.map((leg) => {
        if (leg.kind !== "evm" || leg.chain_id !== Number(payload.chain_ref)) {
          throw new TypeError("kernel EVM leg differs from its action chain");
        }
        return {
          id: leg.leg_id,
          from: payload.signer,
          to: leg.to,
          value: leg.value,
          data: leg.data,
          gas: leg.gas ?? null,
          maxFeePerGas: leg.max_fee_per_gas ?? null,
          maxPriorityFeePerGas: leg.max_priority_fee_per_gas ?? null,
          gasPrice: leg.gas_price ?? null,
          nonce: leg.nonce ?? null,
          transactionType: leg.transaction_type ?? null,
          accessList: leg.access_list.map((entry) => ({
            address: entry.address,
            storageKeys: entry.storage_keys,
          })),
          description: leg.description,
          simulation: {
            success: leg.simulation.success,
            gasUsed: leg.simulation.gas_used ?? null,
            error: leg.simulation.error ?? null,
          },
          intentHash: leg.intent_hash,
        };
      });
      return {
        ...base,
        type: "external_transaction",
        chainFamily: "evm",
        executionKind: "eoa",
        chainId: Number(payload.chain_ref),
        signer: payload.signer,
        broadcaster: "wallet",
        transactions,
      };
    }
    const transactions = payload.legs.map((leg) => {
      if (leg.kind !== "svm" || leg.cluster !== payload.chain_ref) {
        throw new TypeError("kernel SVM leg differs from its action cluster");
      }
      return {
        id: leg.leg_id,
        unsignedTransactionBase64: leg.unsigned_transaction_base64,
        recentBlockhash: leg.recent_blockhash,
        lastValidBlockHeight: leg.last_valid_block_height ?? null,
        preserveBlockhash: leg.preserve_blockhash,
        description: leg.description,
        intentHash: leg.intent_hash,
      };
    });
    return {
      ...base,
      type: "external_transaction",
      chainFamily: "svm",
      executionKind: "wallet",
      cluster: payload.chain_ref,
      signer: payload.signer,
      broadcaster: "wallet",
      transactions,
    };
  }

  const payloads = action.payload.payloads.map((payload) => {
    switch (payload.kind) {
      case "evm_personal":
        return {
          id: payload.payload_id,
          kind: payload.kind,
          message: payload.message,
          digest: payload.raw_payload,
        };
      case "evm_typed_data":
        return {
          id: payload.payload_id,
          kind: payload.kind,
          typedData: payload.typed_data,
          digest: payload.raw_payload,
        };
      case "svm_message":
        return {
          id: payload.payload_id,
          kind: payload.kind,
          messageBase64: payload.message_base64,
          digest: payload.digest,
        };
      case "svm_transaction":
        return {
          id: payload.payload_id,
          kind: payload.kind,
          transactionBase64: payload.unsigned_transaction_base64,
          digest: payload.digest,
        };
      default:
        return assertNever(payload);
    }
  });
  return {
    ...base,
    type: "signing_request",
    chainFamily: action.payload.family,
    executionKind: action.payload.execution_kind,
    signer: action.payload.signer,
    chainId: action.payload.chain_id ?? null,
    cluster: action.payload.cluster ?? null,
    broadcaster: action.payload.broadcaster,
    payloads,
    operationId:
      action.payload.operation_id ?? action.broadcast_operation_id ?? null,
    executor: action.payload.executor ?? null,
    callsDigest: action.payload.calls_digest ?? null,
    calls: action.payload.calls ?? [],
    fees: action.payload.fees ?? [],
    sponsorship: action.payload.sponsorship ?? null,
  };
}

function projectStatus(
  state: KernelActionState,
  actionType: KernelAgentAction["action_type"],
): PublicAgentAction["status"] {
  switch (state) {
    case "staged":
    case "awaiting_external":
      return "pending";
    case "submitted":
      return "submitted";
    case "observing":
      return "confirmed";
    case "completed":
      return actionType === "signing_request" ? "signed" : "finalized";
    case "rejected":
    case "expired":
    case "superseded":
    case "failed":
      return state;
    default:
      return assertNever(state);
  }
}

function assertNever(value: never): never {
  throw new TypeError(`unsupported kernel discriminant: ${String(value)}`);
}
