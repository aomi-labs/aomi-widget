import type { components } from "../../../src/generated/public-v1/types";

type Schemas = components["schemas"];

const base = {
  generation: 1,
  contextGeneration: 0,
  revision: 0,
  status: "pending",
  createdAt: "2026-08-19T00:00:00Z",
  expiresAt: null,
  description: "Golden action",
} as const;

const evmAddress = "0x1111111111111111111111111111111111111111";
const evmTarget = "0x2222222222222222222222222222222222222222";
const digest =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

export const goldenActions = [
  {
    ...base,
    id: "act_evm_external",
    type: "external_transaction",
    chainFamily: "evm",
    executionKind: "eoa",
    chainId: 8453,
    signer: evmAddress,
    broadcaster: "wallet",
    transactions: [
      {
        id: "leg_1",
        from: evmAddress,
        to: evmTarget,
        value: "0x0",
        data: "0x1234",
        gas: null,
        maxFeePerGas: null,
        maxPriorityFeePerGas: null,
        gasPrice: null,
        nonce: null,
        transactionType: null,
        accessList: [],
        description: "Approve",
        simulation: { success: true, gasUsed: "0x5208", error: null },
        intentHash: digest,
      },
      {
        id: "leg_2",
        from: evmAddress,
        to: evmTarget,
        value: "0x1",
        data: "0x",
        gas: null,
        maxFeePerGas: null,
        maxPriorityFeePerGas: null,
        gasPrice: null,
        nonce: null,
        transactionType: null,
        accessList: [],
        description: "Transfer",
        simulation: { success: true, gasUsed: "0x5208", error: null },
        intentHash: digest,
      },
    ],
  },
  {
    ...base,
    id: "act_svm_external",
    type: "external_transaction",
    chainFamily: "svm",
    executionKind: "wallet",
    cluster: "devnet",
    signer: "7YGoldenSigner1111111111111111111111111111",
    broadcaster: "wallet",
    transactions: [
      {
        id: "leg_1",
        unsignedTransactionBase64: "AQID",
        recentBlockhash: "GoldenBlockhash11111111111111111111111111",
        lastValidBlockHeight: 123456,
        preserveBlockhash: false,
        description: "SVM transfer",
        intentHash: "svm-digest",
      },
    ],
  },
  {
    ...base,
    id: "act_evm_personal",
    type: "signing_request",
    chainFamily: "evm",
    executionKind: "message",
    signer: evmAddress,
    chainId: 8453,
    cluster: null,
    broadcaster: "wallet",
    payloads: [
      { id: "payload_1", kind: "evm_personal", message: "0x6869", digest },
    ],
    operationId: null,
    executor: null,
    callsDigest: null,
    calls: [],
    fees: [],
    sponsorship: null,
  },
  {
    ...base,
    id: "act_evm_typed",
    type: "signing_request",
    chainFamily: "evm",
    executionKind: "message",
    signer: evmAddress,
    chainId: 8453,
    cluster: null,
    broadcaster: "wallet",
    payloads: [
      {
        id: "payload_1",
        kind: "evm_typed_data",
        typedData: { domain: { chainId: 8453 }, message: { value: "1" } },
        digest,
      },
    ],
    operationId: null,
    executor: null,
    callsDigest: null,
    calls: [],
    fees: [],
    sponsorship: null,
  },
  {
    ...base,
    id: "act_svm_message",
    type: "signing_request",
    chainFamily: "svm",
    executionKind: "message",
    signer: "7YGoldenSigner1111111111111111111111111111",
    chainId: null,
    cluster: "devnet",
    broadcaster: "venue",
    payloads: [
      {
        id: "payload_1",
        kind: "svm_message",
        messageBase64: "aGk=",
        digest: "svm-message",
      },
    ],
    operationId: null,
    executor: null,
    callsDigest: null,
    calls: [],
    fees: [],
    sponsorship: null,
  },
  {
    ...base,
    id: "act_svm_transaction_sign",
    type: "signing_request",
    chainFamily: "svm",
    executionKind: "transaction",
    signer: "7YGoldenSigner1111111111111111111111111111",
    chainId: null,
    cluster: "devnet",
    broadcaster: "venue",
    payloads: [
      {
        id: "payload_1",
        kind: "svm_transaction",
        transactionBase64: "AQID",
        digest: "svm-tx",
      },
    ],
    operationId: null,
    executor: null,
    callsDigest: null,
    calls: [],
    fees: [],
    sponsorship: null,
  },
  {
    ...base,
    id: "act_evm_aa",
    type: "signing_request",
    chainFamily: "evm",
    executionKind: "account_abstraction",
    signer: evmAddress,
    chainId: 8453,
    cluster: null,
    broadcaster: "backend",
    payloads: [
      { id: "payload_1", kind: "evm_personal", message: digest, digest },
    ],
    operationId: "bop_golden",
    executor: evmTarget,
    callsDigest: digest,
    calls: [{ to: evmTarget, value: "0", data: "0x1234" }],
    fees: [{ asset: { kind: "native" }, amount: "1", recipient: evmTarget }],
    sponsorship: "required",
  },
] satisfies Schemas["AgentAction"][];

export const goldenResults = [
  {
    status: "submitted",
    revision: 0,
    legs: [
      { id: "leg_1", status: "submitted", transactionId: digest },
      { id: "leg_2", status: "skipped", reason: "previous_leg_failed" },
    ],
  },
  {
    status: "signed",
    revision: 0,
    outputs: [{ id: "payload_1", signature: `0x${"11".repeat(65)}` }],
  },
  {
    status: "signed",
    revision: 0,
    outputs: [{ id: "payload_1", signedTransactionBase64: "AQID" }],
  },
  { status: "rejected", revision: 0, reason: "Rejected by user" },
] satisfies Schemas["ActionResult"][];

export const guestStartTurn = {
  session: "sess_AAAAAAAAAAAAAAAAAAAAAA",
  message: "Quote a safe swap",
  application: "app_9",
  model: "default",
  wallets: {
    evm: { address: evmAddress, chainId: 8453 },
  },
} satisfies Schemas["StartTurnRequest"];

export const mcpHumanHandoff = {
  session: "sess_AAAAAAAAAAAAAAAAAAAAAA",
  turn: { status: "thinking", error: null },
  messages: [],
  activity: [],
  actions: [goldenActions[0]],
  cursor: "cur_AAAAAAAAAAAAAAAAAAAAAA",
} satisfies Schemas["AgentDelta"];
