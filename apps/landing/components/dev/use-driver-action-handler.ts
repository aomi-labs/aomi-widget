"use client";

import { useEffect, useRef, useState } from "react";
import {
  ActionHandler,
  type Action,
  type ActionResult,
} from "@aomi-labs/client";

import { useActionCapabilities } from "../../../shadcn-registry/src/lib/wallet-kit/use-action-capabilities";

export function useDriverActionHandler(
  actions: Action[],
  respond: (id: string, result: ActionResult) => Promise<void>,
): (id: string) => Promise<void> {
  const capabilities = useActionCapabilities();
  const respondRef = useRef(respond);
  respondRef.current = respond;
  const [handler] = useState(
    () =>
      new ActionHandler(capabilities, async (action, result) => {
        await respondRef.current(action.id, result);
        return {
          ...action,
          revision: action.revision + 1,
          state:
            result.status === "rejected"
              ? "rejected"
              : result.status === "submitted"
                ? "submitted"
                : "completed",
          result,
        };
      }),
  );

  useEffect(
    () => handler.setCapabilities(capabilities),
    [capabilities, handler],
  );
  useEffect(() => {
    for (const action of actions) handler.ingest(action);
  }, [actions, handler]);
  useEffect(() => () => handler.close(), [handler]);

  return (id) => handler.execute(id).then(() => undefined);
}
