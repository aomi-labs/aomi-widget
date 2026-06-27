import { unwrapSystemEvent } from "../event";
import type {
  AomiMessage,
  AomiSSEEvent,
  AomiStateResponse,
  AomiSystemEvent,
} from "../types";
import type { UserState as UserStateShape } from "../user-state";
import type { SessionEventMap } from "./types";
import type { SessionWalletController } from "./wallet";
import {
  hydrateTxPayloadFromUserState,
  normalizeEip712Payload,
  normalizeSolanaSignMessagePayload,
  normalizeSolanaSignPayload,
  normalizeSolanaWalletRequest,
  normalizeTxPayload,
} from "../wallet-utils";

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
  deps: Pick<StateDeps, "setTitle" | "emit">,
): void {
  if (event.type === "title_changed" && event.new_title) {
    deps.setTitle(event.new_title);
    deps.emit("title_changed", { title: event.new_title });
  } else if (event.type === "tool_update") {
    deps.emit("tool_update", event);
  } else if (event.type === "tool_complete") {
    deps.emit("tool_complete", event);
  }
}

function dispatchSystemEvents(
  events: AomiSystemEvent[],
  deps: StateDeps,
): void {
  for (const event of events) {
    const unwrapped = unwrapSystemEvent(event);
    if (!unwrapped) continue;

    if (unwrapped.type === "wallet_tx_request") {
      const solanaRequest = normalizeSolanaWalletRequest(
        unwrapped.payload ?? {},
      );
      if (solanaRequest) {
        if (solanaRequest.kind === "solana_sign_message") {
          const req = deps.walletController.enqueue(
            "solana_sign_message",
            solanaRequest.payload,
          );
          deps.emit("wallet_solana_sign_message_request", req);
        } else if (solanaRequest.kind === "solana_send") {
          const req = deps.walletController.enqueue(
            "solana_send",
            solanaRequest.payload,
          );
          deps.emit("wallet_solana_send_request", req);
        } else if (solanaRequest.kind === "solana_sign_and_send") {
          const req = deps.walletController.enqueue(
            "solana_sign_and_send",
            solanaRequest.payload,
          );
          deps.emit("wallet_solana_sign_and_send_request", req);
        } else {
          const req = deps.walletController.enqueue(
            "solana_sign",
            solanaRequest.payload,
          );
          deps.emit("wallet_solana_sign_request", req);
        }
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
        if (solanaRequest.kind === "solana_sign_message") {
          const req = deps.walletController.enqueue(
            "solana_sign_message",
            solanaRequest.payload,
          );
          deps.emit("wallet_solana_sign_message_request", req);
        } else if (solanaRequest.kind === "solana_send") {
          const req = deps.walletController.enqueue(
            "solana_send",
            solanaRequest.payload,
          );
          deps.emit("wallet_solana_send_request", req);
        } else if (solanaRequest.kind === "solana_sign_and_send") {
          const req = deps.walletController.enqueue(
            "solana_sign_and_send",
            solanaRequest.payload,
          );
          deps.emit("wallet_solana_sign_and_send_request", req);
        } else {
          const req = deps.walletController.enqueue(
            "solana_sign",
            solanaRequest.payload,
          );
          deps.emit("wallet_solana_sign_request", req);
        }
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
