"use client";

import { useEffect, useState } from "react";
import {
  Session,
  type WalletRequest,
  type WidgetSessionProvider,
} from "@aomi-labs/client";

import { aomiBffUrl } from "@/app/config";

export type AomiWalletRequestState = {
  error: string | null;
  request: WalletRequest | null;
  session: Session | null;
  status: "idle" | "loading" | "waiting" | "ready" | "error";
};

function chooseRequest(
  requests: WalletRequest[],
  requestId: string | null,
): WalletRequest | null {
  if (requestId) {
    return requests.find((request) => request.id === requestId) ?? null;
  }
  return requests.length === 1 ? requests[0] : null;
}

export function useAomiWalletRequest(input: {
  enabled: boolean;
  provider: WidgetSessionProvider | null;
  requestId: string | null;
  sessionId: string | null;
}): AomiWalletRequestState {
  const [state, setState] = useState<AomiWalletRequestState>({
    error: null,
    request: null,
    session: null,
    status: "idle",
  });

  useEffect(() => {
    if (!input.enabled || !input.provider || !input.sessionId) return;

    let active = true;
    const session = new Session(
      {
        baseUrl: aomiBffUrl,
        getAccountBearer: input.provider,
      },
      {
        sessionId: input.sessionId,
        syncPendingTxRequestsFromUserState: true,
      },
    );

    const sync = (requests = session.getPendingRequests()) => {
      if (!active) return;
      const request = chooseRequest(requests, input.requestId);
      const ambiguous = !input.requestId && requests.length > 1;
      setState({
        error: ambiguous ? "multiple_wallet_requests" : null,
        request,
        session,
        status: ambiguous ? "error" : request ? "ready" : "waiting",
      });
    };

    queueMicrotask(() => {
      if (active) {
        setState({ error: null, request: null, session, status: "loading" });
      }
    });
    const stopRequests = session.on("wallet_requests_changed", sync);
    const stopErrors = session.on("error", ({ error }) => {
      if (!active) return;
      setState({
        error: error instanceof Error ? error.message : "wallet_session_failed",
        request: null,
        session,
        status: "error",
      });
    });

    void session
      .fetchCurrentState()
      .then(() => sync())
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          error:
            error instanceof Error ? error.message : "wallet_session_failed",
          request: null,
          session,
          status: "error",
        });
      });

    return () => {
      active = false;
      stopRequests();
      stopErrors();
      session.close();
    };
  }, [input.enabled, input.provider, input.requestId, input.sessionId]);

  return input.enabled && input.provider && input.sessionId
    ? state
    : { error: null, request: null, session: null, status: "idle" };
}
