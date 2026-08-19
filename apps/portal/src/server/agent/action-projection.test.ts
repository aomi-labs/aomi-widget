import { describe, expect, it } from "vitest";

import { goldenActions } from "../../../../../packages/client/test/fixtures/public-v1/golden";

import {
  projectAgentAction,
  type KernelAgentAction,
} from "./action-projection";

const digest = `0x${"a".repeat(64)}`;
const signer = "0x1111111111111111111111111111111111111111";
const target = "0x2222222222222222222222222222222222222222";
const base = {
  revision: 0,
  status: "awaiting_external",
  schema_version: 1,
  payload_hash: digest,
  broadcast_operation_id: null,
  created_at: Date.parse("2026-08-19T00:00:00Z") / 1_000,
  expires_at: 0,
} as const;

describe("BFF AgentAction projection", () => {
  it("projects EVM partial-batch intent without deciding execution", () => {
    const projected = projectAgentAction({
      ...base,
      action_id: "act_evm_external",
      action_type: "external_transaction",
      payload: {
        action_type: "external_transaction",
        family: "evm",
        execution_kind: "external",
        broadcaster: "wallet",
        signer,
        chain_ref: "8453",
        generation: 1,
        context_generation: 0,
        description: "Golden action",
        legs: [
          evmLeg("leg_1", "0x0", "0x1234", "Approve"),
          evmLeg("leg_2", "0x1", "0x", "Transfer"),
        ],
      },
    } satisfies KernelAgentAction);

    expect(projected).toEqual({
      ...goldenActions[0],
      createdAt: "2026-08-19T00:00:00.000Z",
    });
  });

  it("projects exact SVM transaction and freshness fields", () => {
    const projected = projectAgentAction({
      ...base,
      action_id: "act_svm_external",
      action_type: "external_transaction",
      payload: {
        action_type: "external_transaction",
        family: "svm",
        execution_kind: "external",
        broadcaster: "wallet",
        signer: "7YGoldenSigner1111111111111111111111111111",
        chain_ref: "devnet",
        generation: 1,
        context_generation: 0,
        description: "Golden action",
        legs: [
          {
            kind: "svm",
            leg_id: "leg_1",
            cluster: "devnet",
            unsigned_transaction_base64: "AQID",
            recent_blockhash: "GoldenBlockhash11111111111111111111111111",
            last_valid_block_height: 123456,
            preserve_blockhash: false,
            description: "SVM transfer",
            intent_hash: "svm-digest",
          },
        ],
      },
    } satisfies KernelAgentAction);

    expect(projected).toEqual({
      ...goldenActions[1],
      createdAt: "2026-08-19T00:00:00.000Z",
    });
  });

  it("projects every sign-only discriminant and backend BroadcastOp metadata", () => {
    const cases = goldenActions.slice(2).map((golden) => {
      if (!("payloads" in golden)) throw new Error("fixture is not signing");
      return projectAgentAction({
        ...base,
        action_id: golden.id,
        action_type: "signing_request",
        broadcast_operation_id: golden.operationId,
        payload: {
          action_type: "signing_request",
          family: golden.chainFamily,
          execution_kind: golden.executionKind,
          broadcaster:
            golden.broadcaster === "venue" ? "wallet" : golden.broadcaster,
          signer: golden.signer,
          operation_id: golden.operationId,
          generation: 1,
          context_generation: 0,
          description: "Golden action",
          chain_id: golden.chainId,
          cluster: golden.cluster,
          executor: golden.executor,
          calls_digest: golden.callsDigest,
          calls: golden.calls,
          fees: golden.fees,
          sponsorship: golden.sponsorship,
          payloads: golden.payloads.map((payload) => {
            switch (payload.kind) {
              case "evm_personal":
                return {
                  kind: payload.kind,
                  payload_id: payload.id,
                  message: payload.message,
                  raw_payload: payload.digest,
                };
              case "evm_typed_data":
                return {
                  kind: payload.kind,
                  payload_id: payload.id,
                  typed_data: payload.typedData,
                  raw_payload: payload.digest,
                };
              case "svm_message":
                return {
                  kind: payload.kind,
                  payload_id: payload.id,
                  message_base64: payload.messageBase64,
                  digest: payload.digest,
                };
              case "svm_transaction":
                return {
                  kind: payload.kind,
                  payload_id: payload.id,
                  unsigned_transaction_base64: payload.transactionBase64,
                  digest: payload.digest,
                };
            }
          }),
        },
      } satisfies KernelAgentAction);
    });

    expect(cases.map((action) => action.payloads[0].kind)).toEqual([
      "evm_personal",
      "evm_typed_data",
      "svm_message",
      "svm_transaction",
      "evm_personal",
    ]);
    expect(cases.at(-1)).toMatchObject({
      executionKind: "account_abstraction",
      broadcaster: "backend",
      operationId: "bop_golden",
      callsDigest: digest,
    });
  });

  it("fails closed on action, chain, and cluster drift", () => {
    const action = {
      ...base,
      action_id: "act_drift",
      action_type: "external_transaction",
      payload: {
        action_type: "external_transaction",
        family: "evm",
        execution_kind: "external",
        broadcaster: "wallet",
        signer,
        chain_ref: "8453",
        generation: 1,
        context_generation: 0,
        description: "Drift",
        legs: [evmLeg("leg_1", "0x0", "0x", "Drift")],
      },
    } satisfies KernelAgentAction;
    expect(() =>
      projectAgentAction({ ...action, action_type: "signing_request" }),
    ).toThrow("action type differs");
    action.payload.legs[0].chain_id = 1;
    expect(() => projectAgentAction(action)).toThrow(
      "differs from its action chain",
    );
  });
});

function evmLeg(id: string, value: string, data: string, description: string) {
  return {
    kind: "evm" as const,
    leg_id: id,
    chain_id: 8453,
    to: target,
    value,
    data,
    gas: null,
    max_fee_per_gas: null,
    max_priority_fee_per_gas: null,
    gas_price: null,
    nonce: null,
    transaction_type: null,
    access_list: [],
    description,
    simulation: { success: true, gas_used: "0x5208", error: null },
    intent_hash: digest,
  };
}
