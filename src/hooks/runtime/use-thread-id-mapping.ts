"use client";

import { useCallback, useRef } from "react";

import { isTempThreadId } from "@/lib/runtime-utils";

export function useThreadIdMapping() {
  const tempToBackendIdRef = useRef<Map<string, string>>(new Map());

  const resolveThreadId = useCallback((threadId: string): string => {
    return tempToBackendIdRef.current.get(threadId) || threadId;
  }, []);

  const findTempIdForBackendId = useCallback((backendId: string): string | undefined => {
    for (const [tempId, mappedId] of tempToBackendIdRef.current.entries()) {
      if (mappedId === backendId) return tempId;
    }
    return undefined;
  }, []);

  const bindBackendId = useCallback((threadId: string, backendId: string) => {
    tempToBackendIdRef.current.set(threadId, backendId);
  }, []);

  const hasBackendId = useCallback((threadId: string): boolean => {
    return tempToBackendIdRef.current.has(threadId);
  }, []);

  const isThreadReady = useCallback(
    (threadId: string): boolean => {
      if (!isTempThreadId(threadId)) return true;
      return tempToBackendIdRef.current.has(threadId);
    },
    []
  );

  return {
    bindBackendId,
    findTempIdForBackendId,
    hasBackendId,
    isThreadReady,
    resolveThreadId,
  };
}
