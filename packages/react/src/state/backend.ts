import { isTempThreadId } from "../utils/conversion";

export type BakendState = {
  tempToSessionId: Map<string, string>;
  skipInitialFetch: Set<string>;
  pendingSession: Map<string, string[]>;
  pendingSystem: Map<string, string[]>;
  runningSessions: Set<string>;
  creatingThreadId: string | null;
  createThreadPromise: Promise<void> | null;
};

export function createBakendState(): BakendState {
  return {
    tempToSessionId: new Map(),
    skipInitialFetch: new Set(),
    pendingSession: new Map(),
    pendingSystem: new Map(),
    runningSessions: new Set(),
    creatingThreadId: null,
    createThreadPromise: null,
  };
}

export function resolveSessionId(state: BakendState, threadId: string): string {
  return state.tempToSessionId.get(threadId) ?? threadId;
}

export function isSessionReady(state: BakendState, threadId: string): boolean {
  if (!isTempThreadId(threadId)) return true;
  return state.tempToSessionId.has(threadId);
}

export function setBackendMapping(
  state: BakendState,
  tempId: string,
  backendId: string
) {
  state.tempToSessionId.set(tempId, backendId);
}

export function getTempIdForSession(
  state: BakendState,
  backendId: string
): string | undefined {
  for (const [tempId, id] of state.tempToSessionId.entries()) {
    if (id === backendId) return tempId;
  }
  return undefined;
}

export function skipFirstFetch(state: BakendState, threadId: string) {
  state.skipInitialFetch.add(threadId);
}

export function shouldSkipInitialFetch(
  state: BakendState,
  threadId: string
): boolean {
  return state.skipInitialFetch.has(threadId);
}

export function clearSkipInitialFetch(state: BakendState, threadId: string) {
  state.skipInitialFetch.delete(threadId);
}

export function setSessionRunning(state: BakendState, threadId: string, running: boolean) {
  if (running) {
    state.runningSessions.add(threadId);
  } else {
    state.runningSessions.delete(threadId);
  }
}

export function getRunningSessions(state: BakendState): string[] {
  return Array.from(state.runningSessions);
}

export function isSessionRunning(state: BakendState, threadId: string): boolean {
  return state.runningSessions.has(threadId);
}

export function enqueuePendingSession(state: BakendState, threadId: string, text: string) {
  const existing = state.pendingSession.get(threadId) ?? [];
  state.pendingSession.set(threadId, [...existing, text]);
}

export function dequeuePendingSession(state: BakendState, threadId: string): string[] {
  const pending = state.pendingSession.get(threadId) ?? [];
  state.pendingSession.delete(threadId);
  return pending;
}

export function hasPendingSession(state: BakendState, threadId: string): boolean {
  return (state.pendingSession.get(threadId)?.length ?? 0) > 0;
}

export function enqueuePendingSystem(state: BakendState, threadId: string, text: string) {
  const existing = state.pendingSystem.get(threadId) ?? [];
  state.pendingSystem.set(threadId, [...existing, text]);
}

export function dequeuePendingSystem(state: BakendState, threadId: string): string[] {
  const pending = state.pendingSystem.get(threadId) ?? [];
  state.pendingSystem.delete(threadId);
  return pending;
}

export function hasPendingSystem(state: BakendState, threadId: string): boolean {
  return (state.pendingSystem.get(threadId)?.length ?? 0) > 0;
}
