"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { Action, ActionHandler, ActionResult } from "@aomi-labs/client";

const NO_ACTIONS: Action[] = [];

export function useActions(handler: ActionHandler | undefined) {
  const subscribe = useCallback(
    (listener: () => void) => handler?.subscribe(listener) ?? (() => undefined),
    [handler],
  );
  const snapshot = useCallback(() => handler?.all() ?? NO_ACTIONS, [handler]);
  const actions = useSyncExternalStore(subscribe, snapshot, snapshot);
  const pendingActions = useMemo(
    () => actions.filter((action) => action.state === "pending"),
    [actions],
  );

  return {
    pendingActions,
    hasBlockingActions:
      pendingActions.length > 0 || Boolean(handler?.isBlocking()),
    executeAction: (id: string) =>
      requireHandler(handler)
        .execute(id)
        .then(() => undefined),
    respondToAction: (id: string, result: ActionResult) =>
      requireHandler(handler)
        .submitResult(id, result)
        .then(() => undefined),
    rejectAction: (id: string, reason?: string) =>
      requireHandler(handler)
        .reject(id, reason)
        .then(() => undefined),
  };
}

function requireHandler(handler: ActionHandler | undefined): ActionHandler {
  if (!handler)
    throw new Error("No ActionHandler is available for this session");
  return handler;
}
