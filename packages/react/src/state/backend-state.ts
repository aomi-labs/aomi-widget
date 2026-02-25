export type BackendState = {
  runningThreads: Set<string>;
};

export function createBackendState(): BackendState {
  return {
    runningThreads: new Set(),
  };
}

export function resolveThreadId(
  _state: BackendState,
  threadId: string,
): string {
  return threadId;
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

export function isThreadRunning(
  state: BackendState,
  threadId: string,
): boolean {
  return state.runningThreads.has(threadId);
}
