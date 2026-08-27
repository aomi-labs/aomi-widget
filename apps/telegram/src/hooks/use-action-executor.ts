"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createParaViemClientHook } from "@getpara/react-core/evm/viem";
import {
  toViemSignMessageArgs,
  toViemSignTypedDataArgs,
  type Action,
  type ActionRequest,
  type ActionResult,
  type Session,
} from "@aomi-labs/client";
import { createPublicClient, http, type Hex } from "viem";

import { actionChain, errorMessage } from "@/lib/action";

type ExecutionState = {
  error: string | null;
  status:
    | "idle"
    | "preparing"
    | "review"
    | "awaiting_wallet"
    | "done"
    | "error";
};

export type ActionExecution = ExecutionState & {
  approve: () => void;
  reject: () => void;
};

type EvmAction = Action & {
  request:
    | Extract<ActionRequest, { type: "execute_evm" }>
    | (Extract<ActionRequest, { type: "sign" }> & { chainFamily: "evm" });
};

const useEmbeddedParaViemClient = createParaViemClientHook();

function isEvmAction(action: Action): action is EvmAction {
  return (
    action.request.type === "execute_evm" ||
    (action.request.type === "sign" && action.request.chainFamily === "evm")
  );
}

export function useActionExecutor(input: {
  action: Action | null;
  session: Session | null;
}): ActionExecution {
  const [state, setState] = useState<ExecutionState>({
    error: null,
    status: "idle",
  });
  const settled = useRef(new Set<string>());
  const chain = actionChain(input.action);
  const { viemClient } = useEmbeddedParaViemClient({
    walletClientConfig: {
      chain,
      transport: http(chain.rpcUrls.default.http[0]),
    },
  });

  useEffect(() => {
    const action = input.action;
    if (!action || !input.session || !isEvmAction(action)) return;
    if (settled.current.has(action.id)) return;
    setState({ error: null, status: "review" });
  }, [input.action, input.session]);

  useEffect(() => {
    const action = input.action;
    const session = input.session;
    if (!action || !session || isEvmAction(action) || settled.current.has(action.id)) {
      return;
    }
    settled.current.add(action.id);
    void session
      .rejectAction(action.id, "Telegram Mini App currently supports EVM Actions only.")
      .finally(() => setState({ error: "unsupported_action", status: "error" }));
  }, [input.action, input.session]);

  const approve = useCallback(() => {
    const action = input.action;
    const session = input.session;
    if (!action || !session || !isEvmAction(action)) return;
    if (!viemClient?.account || settled.current.has(action.id)) return;
    const account = viemClient.account;
    settled.current.add(action.id);
    setState({ error: null, status: "awaiting_wallet" });

    const execute = async (): Promise<ActionResult> => {
      if (action.request.type === "sign") {
        if (account.address.toLowerCase() !== action.request.signer.toLowerCase()) {
          throw new Error("active_wallet_is_not_requested_signer");
        }
        const outputs: Extract<ActionResult, { status: "signed" }>["outputs"] = [];
        for (const [index, payload] of action.request.payloads.entries()) {
          const id = `payload_${index + 1}`;
          if (payload.kind === "evm_typed_data") {
            const typedData = toViemSignTypedDataArgs({ typed_data: payload.typed_data });
            if (!typedData) throw new Error("invalid_signature_payload");
            outputs.push({
              id,
              signature: await viemClient.signTypedData({
                account,
                ...typedData,
              } as Parameters<typeof viemClient.signTypedData>[0]),
            });
          } else if (payload.kind === "evm_personal") {
            const message = toViemSignMessageArgs({ non_typed_data: payload.message });
            if (!message) throw new Error("invalid_signature_payload");
            outputs.push({
              id,
              signature: await viemClient.signMessage({
                account,
                ...message,
              } as Parameters<typeof viemClient.signMessage>[0]),
            });
          } else {
            throw new Error("invalid_evm_signature_payload");
          }
        }
        return { status: "signed", outputs };
      }

      if (action.request.transactions.length !== 1) {
        throw new Error("transaction_bundle_requires_backend_account_execution");
      }
      const transaction = action.request.transactions[0];
      if (transaction.chain_id !== chain.id) throw new Error("wrong_chain");
      const transactionId: Hex = await viemClient.sendTransaction({
        account,
        chain,
        data: transaction.data as Hex,
        to: transaction.to as Hex,
        value: transaction.value ? BigInt(transaction.value) : undefined,
      });
      const receipt = await createPublicClient({
        chain,
        transport: http(chain.rpcUrls.default.http[0]),
      }).waitForTransactionReceipt({ hash: transactionId });
      if (receipt.status !== "success") throw new Error("transaction_reverted");
      return {
        status: "submitted",
        legs: [{ id: "leg_1", status: "submitted", transactionId }],
      };
    };

    void execute()
      .then(async (result) => {
        await session.respondToAction(action.id, result);
        setState({ error: null, status: "done" });
      })
      .catch(async (error: unknown) => {
        const message = errorMessage(error);
        await session.rejectAction(action.id, message).catch(() => undefined);
        setState({ error: message, status: "error" });
      });
  }, [chain, input.action, input.session, viemClient]);

  const reject = useCallback(() => {
    const action = input.action;
    const session = input.session;
    if (!action || !session || settled.current.has(action.id)) return;
    settled.current.add(action.id);
    setState({ error: null, status: "error" });
    void session
      .rejectAction(action.id, "Declined in the Telegram Mini App.")
      .catch(() => undefined);
  }, [input.action, input.session]);

  return {
    ...state,
    status:
      state.status === "review" && !viemClient?.account
        ? "preparing"
        : state.status,
    approve,
    reject,
  };
}
