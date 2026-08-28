"use client";

import { useEffect, useState } from "react";
import {
  Session,
  type Action,
  type GetAccountBearer,
} from "@aomi-labs/client";

import { aomiBffUrl } from "@/app/config";

export type AomiActionState = {
  error: string | null;
  action: Action | null;
  session: Session | null;
  status: "idle" | "loading" | "waiting" | "ready" | "error";
};

function chooseAction(
  actions: Action[],
  requestId: string | null,
): Action | null {
  if (requestId) {
    return actions.find((action) => action.id === requestId) ?? null;
  }
  return actions.length === 1 ? actions[0] : null;
}

export function useAomiAction(input: {
  enabled: boolean;
  provider: GetAccountBearer | null;
  requestId: string | null;
  sessionId: string | null;
}): AomiActionState {
  const [state, setState] = useState<AomiActionState>({
    error: null,
    action: null,
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
      },
    );

    const sync = () => {
      if (!active) return;
      const snapshot = session.getSnapshot();
      const actions = snapshot.actions.filter((action) => action.state === "pending");
      const action = chooseAction(actions, input.requestId);
      const ambiguous = !input.requestId && actions.length > 1;
      setState({
        error:
          ambiguous
            ? "multiple_actions"
            : snapshot.error instanceof Error
              ? snapshot.error.message
              : null,
        action,
        session,
        status: ambiguous ? "error" : action ? "ready" : "waiting",
      });
    };

    queueMicrotask(() => {
      if (active) {
        setState({ error: null, action: null, session, status: "loading" });
      }
    });
    const stop = session.subscribe(sync);

    void session
      .fetchCurrentState()
      .then(() => sync())
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          error:
            error instanceof Error ? error.message : "wallet_session_failed",
          action: null,
          session,
          status: "error",
        });
      });

    return () => {
      active = false;
      stop();
      session.close();
    };
  }, [input.enabled, input.provider, input.requestId, input.sessionId]);

  return input.enabled && input.provider && input.sessionId
    ? state
    : { error: null, action: null, session: null, status: "idle" };
}
