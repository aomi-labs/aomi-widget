import { isTempThreadId } from "../runtime/utils";

export type BackendState = {
  tempToBackendId: Map<string, string>;
  skipInitialFetch: Set<string>;
  pendingChat: Map<string, string[]>;
  runningThreads: Set<string>;
  creatingThreadId: string | null;
  createThreadPromise: Promise<void> | null;
};

export function createBackendState(): BackendState {
  return {
    tempToBackendId: new Map(),
    skipInitialFetch: new Set(),
    pendingChat: new Map(),
    runningThreads: new Set(),
    creatingThreadId: null,
    createThreadPromise: null,
  };
}

export function resolveThreadId(state: BackendState, threadId: string): string {
  return state.tempToBackendId.get(threadId) ?? threadId;
}

export function isThreadReady(state: BackendState, threadId: string): boolean {
  if (!isTempThreadId(threadId)) return true;
  return state.tempToBackendId.has(threadId);
}

export function setBackendMapping(
  state: BackendState,
  tempId: string,
  backendId: string,
) {
  state.tempToBackendId.set(tempId, backendId);
  if (process.env.NODE_ENV !== "production") {
    console.debug("[aomi][mapping] set", { tempId, backendId });
  }
}

export function findTempIdForBackendId(
  state: BackendState,
  backendId: string,
): string | undefined {
  for (const [tempId, id] of state.tempToBackendId.entries()) {
    if (id === backendId) return tempId;
  }
  return undefined;
}

export function markSkipInitialFetch(state: BackendState, threadId: string) {
  state.skipInitialFetch.add(threadId);
}

export function shouldSkipInitialFetch(
  state: BackendState,
  threadId: string,
): boolean {
  return state.skipInitialFetch.has(threadId);
}

export function clearSkipInitialFetch(state: BackendState, threadId: string) {
  state.skipInitialFetch.delete(threadId);
}

export function setThreadRunning(
  state: BackendState,
  threadId: string,
  running: boolean,
) {
  if (running) {
    state.runningThreads.add(threadId);
  } else {
    state.runningThreads.delete(threadId);
  }
}

export function isThreadRunning(state: BackendState, threadId: string): boolean {
  return state.runningThreads.has(threadId);
}

export function enqueuePendingChat(
  state: BackendState,
  threadId: string,
  text: string,
) {
  const existing = state.pendingChat.get(threadId) ?? [];
  state.pendingChat.set(threadId, [...existing, text]);
}

export function dequeuePendingChat(
  state: BackendState,
  threadId: string,
): string[] {
  const pending = state.pendingChat.get(threadId) ?? [];
  state.pendingChat.delete(threadId);
  return pending;
}

export function hasPendingChat(state: BackendState, threadId: string): boolean {
  return (state.pendingChat.get(threadId)?.length ?? 0) > 0;
}
