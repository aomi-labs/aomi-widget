// =============================================================================
// ThreadRegistry — owns every piece of per-thread runtime bookkeeping
// =============================================================================
//
// Before this existed the same state was scattered across 9 refs in 2 files:
//   core.tsx           remoteThreadIdsRef, warmedThreadIdsRef, warmPromisesRef,
//                      threadsMaterializedForSendRef
//   orchestrator.ts    sessionManager, pendingFetches, initialStatePromises,
//                      hydratedThreadIds, listenerCleanups
//
// Each set was mutated independently, requiring careful coordination at every
// teardown site to avoid leaks (the prior code had subtle ordering bugs around
// closeIdleSessionsExcept that we kept fixing). The registry collapses them
// into one container with a small set of intentional operations.
//
// Operations form three layers:
//   per-id   : closeSession(id), forget(id)
//   sweep    : closeIdleSessionsExcept(activeId), closeAllSessions()
//   nuke     : reset()
//
// The registry is intentionally non-reactive: state changes here don't trigger
// React re-renders. Anything user-visible (isRunning, isThreadLoading) stays
// in useState.

import type { AomiClient } from "@aomi-labs/client";
import { SessionManager } from "./session-manager";

export class ThreadRegistry {
  /** Threads the backend already knows about (from /threads list or createThread). */
  readonly remoteThreads = new Set<string>();
  /** Threads whose initial state has been fetched at least once this session. */
  readonly hydratedThreads = new Set<string>();
  /** Threads where the backend record was created specifically to receive a send. */
  readonly materializedForSend = new Set<string>();
  /** Active in-flight initial-state fetches, keyed by thread id (for dedup). */
  readonly initialStatePromises = new Map<string, Promise<void>>();
  /** Currently-pending fetches (subset of above, kept separately for diagnostics). */
  readonly pendingFetches = new Set<string>();

  private readonly listenerCleanups = new Map<string, () => void>();
  readonly sessionManager: SessionManager;

  constructor(clientFactory: () => AomiClient) {
    this.sessionManager = new SessionManager(clientFactory);
  }

  // ===========================================================================
  // Listener cleanup wiring (used by orchestrator when binding session events)
  // ===========================================================================

  setListenerCleanup(threadId: string, cleanup: () => void): void {
    this.listenerCleanups.get(threadId)?.();
    this.listenerCleanups.set(threadId, cleanup);
  }

  private runAndDropListeners(threadId: string): void {
    this.listenerCleanups.get(threadId)?.();
    this.listenerCleanups.delete(threadId);
  }

  // ===========================================================================
  // Per-thread teardown
  // ===========================================================================

  /**
   * Close a single thread's session and drop its session-scoped bookkeeping.
   * Keeps `remoteThreads` and `materializedForSend` (structural facts about the
   * thread itself, unaffected by whether a Session instance is alive).
   */
  closeSession(threadId: string): void {
    this.runAndDropListeners(threadId);
    this.hydratedThreads.delete(threadId);
    this.initialStatePromises.delete(threadId);
    this.pendingFetches.delete(threadId);
    this.sessionManager.close(threadId);
  }

  /**
   * Forget every record for a thread (delete-thread flow). Closes the session
   * and also wipes structural facts. After this the registry behaves as though
   * the thread never existed.
   */
  forget(threadId: string): void {
    this.closeSession(threadId);
    this.remoteThreads.delete(threadId);
    this.materializedForSend.delete(threadId);
  }

  // ===========================================================================
  // Multi-thread sweeps
  // ===========================================================================

  /**
   * Close every session that isn't the active one AND isn't busy (processing,
   * polling, or holding pending wallet requests). Returns ids closed so callers
   * can react if they need to.
   */
  closeIdleSessionsExcept(activeThreadId: string): string[] {
    const closed = this.sessionManager.closeIdleExcept(activeThreadId, (id) =>
      this.runAndDropListeners(id),
    );
    for (const id of closed) {
      this.hydratedThreads.delete(id);
      this.initialStatePromises.delete(id);
      this.pendingFetches.delete(id);
    }
    return closed;
  }

  /**
   * Close every session and drop all session-scoped state. Used on unmount.
   * Structural facts (remoteThreads, materializedForSend) are preserved so a
   * remount can reuse what the user already had.
   */
  closeAllSessions(): void {
    this.hydratedThreads.clear();
    this.initialStatePromises.clear();
    this.pendingFetches.clear();
    for (const cleanup of this.listenerCleanups.values()) cleanup();
    this.listenerCleanups.clear();
    this.sessionManager.closeAll();
  }

  // ===========================================================================
  // Full reset
  // ===========================================================================

  /**
   * Wipe everything. Used when the user disconnects every wallet — we no
   * longer have a stable identity to bind threads to.
   */
  reset(): void {
    this.remoteThreads.clear();
    this.materializedForSend.clear();
    this.closeAllSessions();
  }
}
