"use client";

import { useEffect, useRef, useState } from "react";
import { useSignMessage, useSignTypedData } from "wagmi";
import { Providers, initAppKit } from "./providers";
import { restore } from "@/lib/session-bridge";
import { getTelegramUserId, readyTelegramWebApp } from "@/lib/telegram-webapp";
import {
  useSigningFlow,
  terminalMessageFromEip712Status,
  type SigningFlowConfig,
} from "@/hooks/use-signing-flow";

interface TypedData {
  domain?: Record<string, unknown>;
  types?: Record<string, Array<{ name: string; type: string }>>;
  primaryType?: string;
  message?: Record<string, unknown>;
}

interface PendingEip712Payload {
  typedData?: TypedData;
  nonTypedData?: string;
  pendingEip712Id?: number;
}

const EIP712_CONFIG: SigningFlowConfig<PendingEip712Payload> = {
  apiEndpoint: "/api/operation/eip712",
  idParamName: "eip712_id",
  idResponseKey: "eip712Id",
  dataResponseKey: "typedData",
  resultKey: "signature",
  terminalMessageFromStatus: terminalMessageFromEip712Status,
  checkLocalPrivateKey: false,
  transformData: (json) => ({
    typedData: (json.typedData ?? undefined) as TypedData | undefined,
    nonTypedData:
      typeof json.nonTypedData === "string" ? json.nonTypedData : undefined,
    pendingEip712Id:
      typeof json.pendingEip712Id === "number"
        ? json.pendingEip712Id
        : undefined,
  }),
};

type SignMessageArgs = { message: string | { raw: `0x${string}` } };

function messageArgs(nonTypedData: string): SignMessageArgs {
  return /^0x(?:[0-9a-fA-F]{2})*$/.test(nonTypedData)
    ? { message: { raw: nonTypedData as `0x${string}` } }
    : { message: nonTypedData };
}

function SignContent({ restoreDone }: { restoreDone: boolean }) {
  const { signTypedDataAsync } = useSignTypedData();
  const { signMessageAsync } = useSignMessage();
  const [state, handlers] = useSigningFlow<PendingEip712Payload>(
    EIP712_CONFIG,
    restoreDone,
  );
  const signingStarted = useRef(false);

  const {
    status,
    terminalMessage,
    data: pendingRequest,
    requestId: eip712Id,
    connectionSettled,
    isConnected,
  } = state;

  // Auto-trigger signing when typed data + wallet ready
  useEffect(() => {
    if (
      (!pendingRequest?.typedData && !pendingRequest?.nonTypedData) ||
      !eip712Id
    )
      return;
    if (!restoreDone) return;
    if (!connectionSettled) return;
    if (signingStarted.current) return;
    if (!isConnected) return;

    signingStarted.current = true;
    state.startSigning();
    sign(pendingRequest, eip712Id);
  }, [pendingRequest, eip712Id, isConnected, restoreDone, connectionSettled]);

  async function sign(payload: PendingEip712Payload, requestId: string) {
    try {
      await handlers.reportAwaitingWallet(requestId);
      const signature = payload.typedData
        ? await signTypedDataAsync(
            payload.typedData as Parameters<typeof signTypedDataAsync>[0],
          )
        : await signMessageAsync(messageArgs(payload.nonTypedData ?? ""));
      await handlers.reportSuccess(requestId, signature, {
        ...(typeof payload.pendingEip712Id === "number"
          ? { pending_eip712_id: payload.pendingEip712Id }
          : {}),
      });
    } catch (err) {
      await handlers.reportFailure(requestId, err);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-sm text-white">
      {status === "loading" && (
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-white" />
      )}
      {status !== "loading" && (
        <p className="max-w-[92vw] break-all px-4 text-center">
          {terminalMessage ?? "Approve in your wallet..."}
        </p>
      )}
    </main>
  );
}

export default function SignTypedData() {
  const [ready, setReady] = useState(false);
  const [restoreDone, setRestoreDone] = useState(false);

  useEffect(() => {
    readyTelegramWebApp();
    const userId = getTelegramUserId();
    const init = userId ? restore(userId) : Promise.resolve(false);
    init.then(() => {
      initAppKit();
      setReady(true);
      setRestoreDone(true);
    });
  }, []);

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-white" />
      </main>
    );
  }

  return (
    <Providers>
      <SignContent restoreDone={restoreDone} />
    </Providers>
  );
}
