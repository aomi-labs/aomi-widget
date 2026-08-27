"use client";

import { useCallback, useRef, useState } from "react";
import type { Action, ActionResult, Session as ClientSession } from "@aomi-labs/client";

export type ActionStatus = "pending" | "processing";

export type ActionHandlerConfig = {
  getSession: () => ClientSession | undefined;
};

export type ActionHandlerApi = {
  pendingActions: Action[];
  hasBlockingActions: boolean;
  setActions: (actions: Action[]) => void;
  startAction: (id: string) => void;
  dismissAction: (id: string) => void;
  respondToAction: (id: string, result: ActionResult) => Promise<void>;
  rejectAction: (id: string, reason?: string) => Promise<void>;
};

/** Keeps UI presentation state around the canonical durable Actions. */
export function useActionHandler({
  getSession,
}: ActionHandlerConfig): ActionHandlerApi {
  const [pendingActions, setPendingActions] = useState<Action[]>([]);
  const [hasBlockingActions, setHasBlockingActions] = useState(false);
  const actionsRef = useRef<Action[]>(pendingActions);
  const inFlight = useRef(new Set<string>());
  const suppressed = useRef(new Set<string>());

  const sync = useCallback(() => {
    setPendingActions(
      actionsRef.current.filter((action) => !suppressed.current.has(action.id)),
    );
    setHasBlockingActions(actionsRef.current.length > 0 || inFlight.current.size > 0);
  }, []);

  const setActions = useCallback(
    (actions: Action[]) => {
      const pending = actions.filter((action) => action.state === "pending");
      const ids = new Set(pending.map((action) => action.id));
      for (const id of suppressed.current) {
        if (!ids.has(id) && !inFlight.current.has(id)) suppressed.current.delete(id);
      }
      const preserved = actionsRef.current.filter(
        (action) => inFlight.current.has(action.id) && !ids.has(action.id),
      );
      actionsRef.current = [...pending, ...preserved];
      sync();
    },
    [sync],
  );

  const startAction = useCallback(
    (id: string) => {
      if (!actionsRef.current.some((action) => action.id === id)) return;
      inFlight.current.add(id);
      suppressed.current.add(id);
      sync();
    },
    [sync],
  );

  const finish = useCallback(
    (id: string) => {
      actionsRef.current = actionsRef.current.filter((action) => action.id !== id);
      inFlight.current.delete(id);
      sync();
    },
    [sync],
  );

  const respondToAction = useCallback(
    async (id: string, result: ActionResult) => {
      const session = getSession();
      if (!session) throw new Error("No session available to respond to Action");
      startAction(id);
      try {
        await session.respondToAction(id, result);
      } finally {
        finish(id);
      }
    },
    [finish, getSession, startAction],
  );

  const rejectAction = useCallback(
    async (id: string, reason?: string) => {
      const session = getSession();
      if (!session) throw new Error("No session available to reject Action");
      startAction(id);
      try {
        await session.rejectAction(id, reason);
      } finally {
        finish(id);
      }
    },
    [finish, getSession, startAction],
  );

  const dismissAction = useCallback(
    (id: string) => {
      actionsRef.current = actionsRef.current.filter((action) => action.id !== id);
      inFlight.current.delete(id);
      suppressed.current.add(id);
      sync();
    },
    [sync],
  );

  return {
    pendingActions,
    hasBlockingActions,
    setActions,
    startAction,
    dismissAction,
    respondToAction,
    rejectAction,
  };
}
