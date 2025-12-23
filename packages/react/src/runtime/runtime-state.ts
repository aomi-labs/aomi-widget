import { isTempThreadId } from "./utils";

export type ThreadRuntimeState = {
  tempToBackendId: Map<string, string>;
  skipInitialFetch: Set<string>;
  pendingChat: Map<string, string[]>;
  pendingSystem: Map<string, string[]>;
  runningThreads: Set<string>;
  creatingThreadId: string | null;
  createThreadPromise: Promise<void> | null;
};

export function createThreadRuntimeState(): ThreadRuntimeState {
  return {
    tempToBackendId: new Map(),
    skipInitialFetch: new Set(),
    pendingChat: new Map(),
    pendingSystem: new Map(),
    runningThreads: new Set(),
    creatingThreadId: null,
    createThreadPromise: null,
  };
}

export function resolveThreadId(state: ThreadRuntimeState, threadId: string): string {
  return state.tempToBackendId.get(threadId) ?? threadId;
}

export function isThreadReady(state: ThreadRuntimeState, threadId: string): boolean {
  if (!isTempThreadId(threadId)) return true;
  return state.tempToBackendId.has(threadId);
}

export function setBackendMapping(
  state: ThreadRuntimeState,
  tempId: string,
  backendId: string
) {
  state.tempToBackendId.set(tempId, backendId);
}

export function findTempIdForBackendId(
  state: ThreadRuntimeState,
  backendId: string
): string | undefined {
  for (const [tempId, id] of state.tempToBackendId.entries()) {
    if (id === backendId) return tempId;
  }
  return undefined;
}

export function markSkipInitialFetch(state: ThreadRuntimeState, threadId: string) {
  state.skipInitialFetch.add(threadId);
}

export function shouldSkipInitialFetch(
  state: ThreadRuntimeState,
  threadId: string
): boolean {
  return state.skipInitialFetch.has(threadId);
}

export function clearSkipInitialFetch(state: ThreadRuntimeState, threadId: string) {
  state.skipInitialFetch.delete(threadId);
}

export function setThreadRunning(state: ThreadRuntimeState, threadId: string, running: boolean) {
  if (running) {
    state.runningThreads.add(threadId);
  } else {
    state.runningThreads.delete(threadId);
  }
}

export function isThreadRunning(state: ThreadRuntimeState, threadId: string): boolean {
  return state.runningThreads.has(threadId);
}

export function enqueuePendingChat(state: ThreadRuntimeState, threadId: string, text: string) {
  const existing = state.pendingChat.get(threadId) ?? [];
  state.pendingChat.set(threadId, [...existing, text]);
}

export function dequeuePendingChat(state: ThreadRuntimeState, threadId: string): string[] {
  const pending = state.pendingChat.get(threadId) ?? [];
  state.pendingChat.delete(threadId);
  return pending;
}

export function hasPendingChat(state: ThreadRuntimeState, threadId: string): boolean {
  return (state.pendingChat.get(threadId)?.length ?? 0) > 0;
}

export function enqueuePendingSystem(state: ThreadRuntimeState, threadId: string, text: string) {
  const existing = state.pendingSystem.get(threadId) ?? [];
  state.pendingSystem.set(threadId, [...existing, text]);
}

export function dequeuePendingSystem(state: ThreadRuntimeState, threadId: string): string[] {
  const pending = state.pendingSystem.get(threadId) ?? [];
  state.pendingSystem.delete(threadId);
  return pending;
}

export function hasPendingSystem(state: ThreadRuntimeState, threadId: string): boolean {
  return (state.pendingSystem.get(threadId)?.length ?? 0) > 0;
}
