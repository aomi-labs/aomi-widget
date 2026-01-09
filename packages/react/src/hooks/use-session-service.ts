import { useMemo, type RefObject } from "react";
import type { BackendApi } from "../api/client";
import { SessionService } from "../services/session-service";

/**
 * Hook that provides a SessionService instance.
 * 
 * @param backendApiRef - A ref to the BackendApi instance
 * @returns A SessionService instance that encapsulates all session operations
 * 
 * @example
 * ```tsx
 * const { backendApiRef } = useRuntimeOrchestrator(backendUrl);
 * const sessionService = useSessionService(backendApiRef);
 * 
 * // Use session service
 * const sessions = await sessionService.listSessions(publicKey);
 * ```
 */
export function useSessionService(
  backendApiRef: RefObject<BackendApi>
): SessionService {
  return useMemo(() => {
    if (!backendApiRef.current) {
      throw new Error(
        "BackendApi instance is not available. Ensure you're using this hook within a runtime provider."
      );
    }
    return new SessionService(backendApiRef.current);
  }, [backendApiRef]);
}
