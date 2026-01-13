import type { BackendApi } from "../api/client";
import type {
  BackendThreadMetadata,
  CreateThreadResponse,
} from "../api/types";

/**
 * SessionService encapsulates all session-related backend operations.
 * This service provides a clean interface for session management,
 * decoupling UI components from direct BackendApi usage.
 */
export class SessionService {
  constructor(private readonly backendApi: BackendApi) {}

  /**
   * List all sessions for a given public key
   * @param publicKey - The public key to fetch sessions for
   * @returns Promise resolving to array of session metadata
   */
  async listSessions(publicKey: string): Promise<BackendThreadMetadata[]> {
    return this.backendApi.fetchThreads(publicKey);
  }

  /**
   * Get a single session by ID
   * @param sessionId - The session ID to fetch
   * @returns Promise resolving to session metadata
   */
  async getSession(sessionId: string): Promise<BackendThreadMetadata> {
    return this.backendApi.fetchThread(sessionId);
  }

  /**
   * Create a new session
   * @param publicKey - Optional public key for the session
   * @param title - Optional title for the session
   * @returns Promise resolving to created session response
   */
  async createSession(
    publicKey?: string,
    title?: string
  ): Promise<CreateThreadResponse> {
    return this.backendApi.createThread(publicKey, title);
  }

  /**
   * Delete a session
   * @param sessionId - The session ID to delete
   * @returns Promise that resolves when deletion is complete
   */
  async deleteSession(sessionId: string): Promise<void> {
    return this.backendApi.deleteThread(sessionId);
  }

  /**
   * Rename a session
   * @param sessionId - The session ID to rename
   * @param newTitle - The new title for the session
   * @returns Promise that resolves when rename is complete
   */
  async renameSession(sessionId: string, newTitle: string): Promise<void> {
    return this.backendApi.renameThread(sessionId, newTitle);
  }

  /**
   * Archive a session
   * @param sessionId - The session ID to archive
   * @returns Promise that resolves when archive is complete
   */
  async archiveSession(sessionId: string): Promise<void> {
    return this.backendApi.archiveThread(sessionId);
  }

  /**
   * Unarchive a session
   * @param sessionId - The session ID to unarchive
   * @returns Promise that resolves when unarchive is complete
   */
  async unarchiveSession(sessionId: string): Promise<void> {
    return this.backendApi.unarchiveThread(sessionId);
  }
}
