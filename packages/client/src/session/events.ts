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
import type { WalletAaSignPayload, WalletAaSignatureRequest } from "./types";
import type { SessionWalletController } from "./wallet";
import {
  hydrateTxPayloadFromUserState,
  normalizeEip712Payload,
  normalizeSolanaSignMessagePayload,
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

function normalizeAaSignatureRequest(
  value: unknown,
): WalletAaSignatureRequest | null {
  if (!isRecord(value) || typeof value.raw_payload !== "string") return null;
  if (value.kind === "personal_sign" && typeof value.message === "string") {
    return {
      kind: value.kind,
      message: value.message,
      raw_payload: value.raw_payload,
    };
  }
  if (
    value.kind === "eip7702_authorization" &&
    typeof value.contract_address === "string" &&
    typeof value.chain_id === "number" &&
    typeof value.nonce === "number"
  ) {
    return {
      kind: value.kind,
      contract_address: value.contract_address,
      chain_id: value.chain_id,
      nonce: value.nonce,
      raw_payload: value.raw_payload,
    };
  }
  return null;
}

function normalizeAaSignPayload(value: unknown): WalletAaSignPayload | null {
  if (!isRecord(value)) return null;
  const requests = Array.isArray(value.signature_requests)
    ? value.signature_requests.map(normalizeAaSignatureRequest)
    : [];
  if (
    value.chain_family !== "evm" ||
    typeof value.chain_id !== "number" ||
    typeof value.signer !== "string" ||
    typeof value.executor !== "string" ||
    (value.aa_mode !== "4337" && value.aa_mode !== "7702") ||
    !Array.isArray(value.tx_ids) ||
    !value.tx_ids.every((id) => typeof id === "number") ||
    requests.length === 0 ||
    requests.some((request) => request === null) ||
    typeof value.description !== "string" ||
    typeof value.sponsored !== "boolean"
  ) {
    return null;
  }
  return {
    chain_family: "evm",
    chain_id: value.chain_id,
    signer: value.signer,
    executor: value.executor,
    aa_mode: value.aa_mode,
    tx_ids: [...value.tx_ids],
    signature_requests: requests as WalletAaSignatureRequest[],
    description: value.description,
    sponsored: value.sponsored,
    ...(typeof value.tx_id === "string" ? { tx_id: value.tx_id } : {}),
    ...(typeof value.timestamp === "string"
      ? { timestamp: value.timestamp }
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
    event.type === "wallet_eip712_request" ||
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
  if (request.kind === "solana_sign_message") {
    queued = deps.walletController.enqueue(request.kind, request.payload);
    deps.emit("wallet_solana_sign_message_request", queued);
  } else if (request.kind === "solana_sign") {
    queued = deps.walletController.enqueue("solana_sign", request.payload);
    deps.emit("wallet_solana_sign_request", queued);
  } else if (request.kind === "solana_send") {
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

    if (unwrapped.type === "wallet_aa_sign_request") {
      const payload = normalizeAaSignPayload(unwrapped.payload);
      if (payload) {
        const req = deps.walletController.enqueue("aa_sign", payload);
        deps.emit("wallet_aa_sign_request", req);
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
    } else if (unwrapped.type === "wallet_eip712_request") {
      const payload = normalizeEip712Payload(unwrapped.payload ?? {});
      const req = deps.walletController.enqueue("eip712_sign", payload);
      deps.emit("wallet_eip712_request", req);
    } else if (unwrapped.type === "wallet::solana_sign_request") {
      const solanaRequest = normalizeSolanaWalletRequest(
        unwrapped.payload ?? {},
      );
      if (solanaRequest) {
        dispatchSolanaRequest(solanaRequest, deps);
        continue;
      }

      const payload = normalizeSolanaSignPayload(unwrapped.payload ?? {});
      const req = deps.walletController.enqueue("solana_sign", payload);
      deps.emit("wallet_solana_sign_request", req);
    } else if (unwrapped.type === "wallet::solana_sign_message_request") {
      const payload = normalizeSolanaSignMessagePayload(
        unwrapped.payload ?? {},
      );
      const req = deps.walletController.enqueue("solana_sign_message", payload);
      deps.emit("wallet_solana_sign_message_request", req);
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
