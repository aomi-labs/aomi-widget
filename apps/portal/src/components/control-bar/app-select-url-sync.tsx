"use client";

import { useEffect, useRef } from "react";
import { initThreadControl, useControl, useThreadContext } from "@aomi-labs/react";
import { getRequestedAppFromSearch } from "./app-select-url";

const APPS_UPDATED_EVENT = "aomi:apps-updated";

export function AppSelectUrlSync() {
  const { getAuthorizedApps } = useControl();
  const threadContext = useThreadContext();
  const requestedAppRef = useRef<string | null>(null);
  const hasAppliedRequestedAppRef = useRef(false);

  useEffect(() => {
    requestedAppRef.current = getRequestedAppFromSearch(window.location.search);
  }, []);

  useEffect(() => {
    const handleAppsUpdated = () => {
      void getAuthorizedApps();
    };

    void getAuthorizedApps();
    window.addEventListener(APPS_UPDATED_EVENT, handleAppsUpdated);

    return () => {
      window.removeEventListener(APPS_UPDATED_EVENT, handleAppsUpdated);
    };
  }, [getAuthorizedApps]);

  useEffect(() => {
    const requestedApp = requestedAppRef.current;
    if (!requestedApp || hasAppliedRequestedAppRef.current) {
      return;
    }

    const threadId = threadContext.currentThreadId;
    const metadata = threadContext.getThreadMetadata(threadId);
    const currentControl = metadata?.control ?? initThreadControl();

    threadContext.updateThreadMetadata(threadId, {
      control: {
        ...currentControl,
        app: requestedApp,
        controlDirty: true,
      },
    });
    hasAppliedRequestedAppRef.current = true;
  }, [threadContext]);

  return null;
}
