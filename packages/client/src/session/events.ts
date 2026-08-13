import { unwrapSystemEvent } from "../event";
import { isAomiTaskEventType, parseAomiTaskEvent } from "../types";
import type {
  AomiMessage,
  AomiSSEEvent,
  AomiStateResponse,
  AomiSystemEvent,
} from "../types";
import type { UserState as UserStateShape } from "../user-state";
import type { SessionEventMap } from "./types";
import type {
  WalletAaDisplayCall,
  WalletAaFeeDisclosure,
  WalletSignablePayload,
  WalletSigningPayload,
} from "./types";
import type { SessionWalletController } from "./wallet";
import {
  hydrateTxPayloadFromUserState,
  normalizeSolanaSignPayload,
  normalizeSolanaWalletRequest,
  normalizeTxPayload,
  type NormalizedSolanaWalletRequest,
} from "../wallet-utils";
import type { WalletRequest } from "./types";

type Emit = <K extends keyof SessionEventMap & string>(
  type: K,
  payload: SessionEventMap[K],
) => void;

type StateDeps = {
  userState: () => UserStateShape | undefined;
  resolveUserState: (userState: UserStateShape) => void;
  getMessages: () => AomiMessage[];
  setMessages: (messages: AomiMessage[]) => void;
  setTitle: (title: string) => void;
  walletController: SessionWalletController;
  emit: Emit;
};

function aomiMessagesEqual(a: AomiMessage[], b: AomiMessage[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (
      x.sender !== y.sender ||
      x.content !== y.content ||
      x.timestamp !== y.timestamp ||
      x.is_streaming !== y.is_streaming
    ) {
      return false;
    }
    const xt = x.tool_result;
    const yt = y.tool_result;
    if (xt !== yt) {
      if (!xt || !yt) return false;
      if (xt[0] !== yt[0] || xt[1] !== yt[1]) return false;
    }
  }
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * A `0x`-prefixed hex string. AA owner/executor addresses, the calls digest,
 * and the signing messages are all cast to `` `0x${string}` `` downstream and
 * fed into the owner-equality guard and `signMessage({ message: { raw } })`, so
 * a malformed value must be rejected here rather than trusted by the dialog.
 */
function isHexString(value: unknown): value is `0x${string}` {
  return typeof value === "string" && /^0x[0-9a-fA-F]*$/.test(value);
}

function isEvmAddress(value: unknown): value is `0x${string}` {
  return typeof value === "string" && /^0x[0-9a-fA-F]{40}$/.test(value);
}

function normalizeAaCall(value: unknown): WalletAaDisplayCall | null {
  if (
    !isRecord(value) ||
    !isEvmAddress(value.to) ||
    typeof value.value !== "string" ||
    (value.data !== undefined && !isHexString(value.data))
  ) {
    return null;
  }
  return {
    to: value.to,
    value: value.value,
    ...(value.data !== undefined ? { data: value.data } : {}),
  };
}

function normalizeAaFee(value: unknown): WalletAaFeeDisclosure | null {
  if (
    !isRecord(value) ||
    !isRecord(value.asset) ||
    typeof value.amount !== "string" ||
    typeof value.recipient !== "string" ||
    value.recipient.length === 0
  ) {
    return null;
  }
  const asset =
    value.asset.kind === "native"
      ? ({ kind: "native" } as const)
      : (value.asset.kind === "token" || value.asset.kind === "erc20") &&
          typeof (value.asset.address ?? value.asset.token) === "string" &&
          String(value.asset.address ?? value.asset.token).length > 0
        ? ({
            kind: "token",
            address: String(value.asset.address ?? value.asset.token),
          } as const)
        : null;
  return asset
    ? { asset, amount: value.amount, recipient: value.recipient }
    : null;
}

function isOpaqueSigningRequestId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^sign:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function normalizeSignablePayload(
  value: unknown,
): WalletSignablePayload | null {
  if (!isRecord(value)) return null;
  if (value.kind === "evm_personal" && isHexString(value.message)) {
    return { kind: value.kind, message: value.message };
  }
  if (value.kind === "evm_typed_data" && isRecord(value.typed_data)) {
    return { kind: value.kind, typedData: value.typed_data };
  }
  if (
    value.kind === "svm_message" &&
    typeof value.message_base64 === "string"
  ) {
    return { kind: value.kind, messageBase64: value.message_base64 };
  }
  if (
    value.kind === "svm_transaction" &&
    typeof value.transaction_base64 === "string"
  ) {
    return { kind: value.kind, transactionBase64: value.transaction_base64 };
  }
  return null;
}

function normalizeSigningPayload(value: unknown): WalletSigningPayload | null {
  if (!isRecord(value)) return null;
  const payloads = Array.isArray(value.payloads)
    ? value.payloads.map(normalizeSignablePayload)
    : [];
  const calls = Array.isArray(value.calls)
    ? value.calls.map(normalizeAaCall)
    : [];
  const fees = Array.isArray(value.fees) ? value.fees.map(normalizeAaFee) : [];
  const hasInvalidCalls =
    (value.calls !== undefined && !Array.isArray(value.calls)) ||
    calls.some((call) => call === null);
  const hasInvalidFees =
    (value.fees !== undefined && !Array.isArray(value.fees)) ||
    fees.some(
      (fee) =>
        fee === null ||
        !isEvmAddress(fee.recipient) ||
        (fee.asset.kind === "token" && !isEvmAddress(fee.asset.address)),
    );
  const isErc4337 = value.executionKind === "erc4337";
  if (
    !isOpaqueSigningRequestId(value.requestId) ||
    (value.chainFamily !== "evm" && value.chainFamily !== "svm") ||
    (value.executionKind !== "message" &&
      value.executionKind !== "transaction" &&
      value.executionKind !== "erc4337") ||
    (value.executionKind === "erc4337" && value.chainFamily !== "evm") ||
    typeof value.signer !== "string" ||
    typeof value.description !== "string" ||
    payloads.length === 0 ||
    payloads.some((payload) => payload === null) ||
    payloads.some((payload) =>
      value.chainFamily === "evm"
        ? !payload?.kind.startsWith("evm_")
        : !payload?.kind.startsWith("svm_"),
    ) ||
    hasInvalidCalls ||
    hasInvalidFees ||
    (isErc4337 &&
      (typeof value.operationId !== "string" ||
        !isEvmAddress(value.executor) ||
        typeof value.expiresAt !== "string" ||
        typeof value.callsDigest !== "string" ||
        !/^0x[0-9a-fA-F]{64}$/.test(value.callsDigest) ||
        value.sponsorship !== "required" ||
        calls.length === 0 ||
        fees.length === 0))
  ) {
    return null;
  }
  return {
    requestId: value.requestId,
    chainFamily: value.chainFamily,
    executionKind: value.executionKind,
    signer: value.signer,
    description: value.description,
    payloads: payloads as WalletSignablePayload[],
    ...(typeof value.chainId === "number" ? { chainId: value.chainId } : {}),
    ...(typeof value.cluster === "string" ? { cluster: value.cluster } : {}),
    ...(typeof value.broadcaster === "string"
      ? { broadcaster: value.broadcaster }
      : {}),
    ...(typeof value.operationId === "string"
      ? { operationId: value.operationId }
      : {}),
    ...(isHexString(value.executor) ? { executor: value.executor } : {}),
    ...(typeof value.expiresAt === "string"
      ? { expiresAt: value.expiresAt }
      : {}),
    ...(isHexString(value.callsDigest)
      ? { callsDigest: value.callsDigest }
      : {}),
    ...(calls.length ? { calls: calls as WalletAaDisplayCall[] } : {}),
    ...(fees.length ? { fees: fees as WalletAaFeeDisclosure[] } : {}),
    ...(value.sponsorship === "required"
      ? { sponsorship: "required" as const }
      : {}),
  };
}

export function applySessionState(
  state: Pick<
    AomiStateResponse,
    "messages" | "system_events" | "title" | "is_processing" | "user_state"
  >,
  deps: StateDeps,
): void {
  if (state.user_state) {
    deps.resolveUserState(state.user_state);
  }

  if (state.messages) {
    // Skip the setMessages + emit when polling returned an unchanged message
    // list. Avoids a full thread re-render twice per second while the backend
    // is still preparing the response.
    if (!aomiMessagesEqual(state.messages, deps.getMessages())) {
      deps.setMessages(state.messages);
      deps.emit("messages", state.messages);
    }
  }

  if (state.title) {
    deps.setTitle(state.title);
  }

  if (state.system_events?.length) {
    dispatchSystemEvents(state.system_events, deps);
  }
}

export function handleSessionSSEEvent(
  event: AomiSSEEvent,
  deps: StateDeps,
): void {
  if (event.type === "title_changed" && event.new_title) {
    deps.setTitle(event.new_title);
    deps.emit("title_changed", { title: event.new_title });
  } else if (event.type === "tool_update") {
    deps.emit("tool_update", event);
  } else if (event.type === "tool_complete") {
    deps.emit("tool_complete", event);
  } else if (isAomiTaskEventType(event.type)) {
    // Orchestrator delegation events are re-emitted as-is (like tool_update):
    // no session-state mutation, the React runtime owns the taskRuns sidecar.
    const taskEvent = parseAomiTaskEvent(event);
    if (taskEvent) {
      if (taskEvent.type === "task_started") {
        deps.emit("task_started", taskEvent);
      } else if (taskEvent.type === "task_activity") {
        deps.emit("task_activity", taskEvent);
      } else {
        deps.emit("task_completed", taskEvent);
      }
    }
  } else if (
    event.type === "wallet_tx_request" ||
    event.type === "wallet_signing_request" ||
    event.type.startsWith("wallet::solana_")
  ) {
    dispatchSystemEvents(
      [
        {
          InlineCall: {
            type: event.type,
            payload: event.payload,
          },
        },
      ],
      deps,
    );
  }
}

function dispatchSolanaRequest(
  request: NormalizedSolanaWalletRequest,
  deps: StateDeps,
): void {
  let queued: WalletRequest;
  if (request.kind === "solana_send") {
    queued = deps.walletController.enqueue("solana_send", request.payload);
    deps.emit("wallet_solana_send_request", queued);
  } else {
    queued = deps.walletController.enqueue(
      "solana_sign_and_send",
      request.payload,
    );
    deps.emit("wallet_solana_sign_and_send_request", queued);
  }
}

function dispatchSystemEvents(
  events: AomiSystemEvent[],
  deps: StateDeps,
): void {
  for (const event of events) {
    const unwrapped = unwrapSystemEvent(event);
    if (!unwrapped) continue;

    if (unwrapped.type === "wallet_signing_request") {
      const payload = normalizeSigningPayload(unwrapped.payload);
      if (payload) {
        const req = deps.walletController.enqueue("signing", payload);
        deps.emit("wallet_signing_request", req);
      }
    } else if (unwrapped.type === "wallet_tx_request") {
      const solanaRequest = normalizeSolanaWalletRequest(
        unwrapped.payload ?? {},
      );
      if (solanaRequest) {
        dispatchSolanaRequest(solanaRequest, deps);
        continue;
      }

      const normalizedPayload = normalizeTxPayload(unwrapped.payload);
      const payload = normalizedPayload
        ? hydrateTxPayloadFromUserState(normalizedPayload, deps.userState())
        : null;
      if (payload) {
        const req = deps.walletController.enqueue("transaction", payload);
        deps.emit("wallet_tx_request", req);
      }
    } else if (unwrapped.type === "wallet::solana_send_request") {
      const payload = normalizeSolanaSignPayload(unwrapped.payload ?? {});
      const req = deps.walletController.enqueue("solana_send", payload);
      deps.emit("wallet_solana_send_request", req);
    } else if (unwrapped.type === "wallet::solana_sign_and_send_request") {
      const payload = normalizeSolanaSignPayload(unwrapped.payload ?? {});
      const req = deps.walletController.enqueue(
        "solana_sign_and_send",
        payload,
      );
      deps.emit("wallet_solana_sign_and_send_request", req);
    } else if (
      unwrapped.type === "system_notice" ||
      unwrapped.type === "system_error" ||
      unwrapped.type === "async_callback"
    ) {
      deps.emit(
        unwrapped.type as keyof SessionEventMap & string,
        unwrapped.payload as never,
      );
    } else {
      deps.emit(
        unwrapped.type as keyof SessionEventMap & string,
        unwrapped.payload as never,
      );
    }
  }
}
