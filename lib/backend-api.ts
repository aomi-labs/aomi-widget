export interface SessionMessage {
  sender?: string;
  content?: string;
  timestamp?: string;
  is_streaming?: boolean;
  tool_stream?: [string, string] | { topic?: unknown; content?: unknown } | null;
}

export interface SessionResponsePayload {
  messages?: SessionMessage[] | null;
  is_processing?: boolean;
  pending_wallet_tx?: string | null;
}

export type BackendSessionResponse = SessionResponsePayload;

export interface SystemResponsePayload {
  res?: SessionMessage | null;
}

// Thread Management Types
export interface ThreadMetadata {
  session_id: string;
  title: string;
  is_archived?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateThreadResponse {
  session_id: string;
  title?: string;
}

function toQueryString(payload: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

async function postState<T>(
  backendUrl: string,
  path: string,
  payload: Record<string, unknown>
): Promise<T> {
  const query = toQueryString(payload);
  const response = await fetch(`${backendUrl}${path}${query}`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return (await response.json()) as T;
}

export class BackendApi {
  private connectionStatus = false;
  private eventSource: EventSource | null = null;

  constructor(private readonly backendUrl: string) {}

  async fetchState(sessionId: string): Promise<SessionResponsePayload> {
    const response = await fetch(`${this.backendUrl}/api/state?session_id=${encodeURIComponent(sessionId)}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return (await response.json()) as SessionResponsePayload;
  }

  async postChatMessage(sessionId: string, message: string): Promise<SessionResponsePayload> {
    return postState<SessionResponsePayload>(this.backendUrl, "/api/chat", { message, session_id: sessionId });
  }

  async postSystemMessage(sessionId: string, message: string): Promise<SystemResponsePayload> {
    return postState<SystemResponsePayload>(this.backendUrl, "/api/system", { message, session_id: sessionId });
  }

  async postInterrupt(sessionId: string): Promise<SessionResponsePayload> {
    return postState<SessionResponsePayload>(this.backendUrl, "/api/interrupt", { session_id: sessionId });
  }

  disconnectSSE(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.setConnectionStatus(false);
  }

  setConnectionStatus(on: boolean): void {
    this.connectionStatus = on
  }

  async connectSSE(sessionId: string, publicKey?: string) {
    // Close existing connection
    this.disconnectSSE();

    try {
      // Build URL with optional public_key parameter
      const url = new URL(`${this.backendUrl}/api/chat/stream`);
      url.searchParams.set('session_id', sessionId);
      if (publicKey) {
        url.searchParams.set('public_key', publicKey);
      }

      this.eventSource = new EventSource(url.toString());

      this.eventSource.onopen = () => {
        console.log('🌐 SSE connection opened to:', url.toString());
        this.setConnectionStatus(true);
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // this.updateChatState(data);
        } catch (error) {
          console.error('Failed to parse SSE data:', error);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
      };

    } catch (error) {
      console.error('Failed to establish SSE connection:', error);
      this.handleConnectionError(sessionId, publicKey);
    }
  }

  private handleConnectionError(sessionId: string, publicKey?: string): void {
    this.setConnectionStatus(false);
    let attempt = 0;
    let total = 3;
    if (attempt < total) {
      attempt++;
      console.log(`Attempting to reconnect (${attempt}/${total})...`);

      setTimeout(() => {
        this.connectSSE(sessionId, publicKey);
      }, 100);
    } else {
      console.error('Max reconnection attempts reached');
      this.setConnectionStatus(false);
    }
  }

  // ==================== Thread Management API ====================

  /**
   * Fetch all threads/sessions for a given public key
   * @param publicKey - User's wallet address
   * @returns Array of thread metadata
   */
  async fetchThreads(publicKey: string): Promise<ThreadMetadata[]> {
    const response = await fetch(
      `${this.backendUrl}/api/sessions?public_key=${encodeURIComponent(publicKey)}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch threads: HTTP ${response.status}`);
    }

    return (await response.json()) as ThreadMetadata[];
  }

  /**
   * Create a new thread/session
   * @param publicKey - Optional user's wallet address
   * @param title - Thread title (e.g., "Chat 1", "Chat 2")
   * @returns Created thread information with backend-generated ID
   */
  async createThread(publicKey?: string, title?: string): Promise<CreateThreadResponse> {
    const body: Record<string, string> = {};
    if (publicKey) {
      body.public_key = publicKey;
    }
    if (title) {
      body.title = title;
    }

    const response = await fetch(`${this.backendUrl}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Failed to create thread: HTTP ${response.status}`);
    }

    return (await response.json()) as CreateThreadResponse;
  }

  /**
   * Archive a thread/session
   * @param sessionId - The session ID to archive
   */
  async archiveThread(sessionId: string): Promise<void> {
    const response = await fetch(
      `${this.backendUrl}/api/sessions/${encodeURIComponent(sessionId)}/archive`,
      { method: 'POST' }
    );

    if (!response.ok) {
      throw new Error(`Failed to archive thread: HTTP ${response.status}`);
    }
  }

  /**
   * Unarchive a thread/session
   * @param sessionId - The session ID to unarchive
   */
  async unarchiveThread(sessionId: string): Promise<void> {
    const response = await fetch(
      `${this.backendUrl}/api/sessions/${encodeURIComponent(sessionId)}/unarchive`,
      { method: 'POST' }
    );

    if (!response.ok) {
      throw new Error(`Failed to unarchive thread: HTTP ${response.status}`);
    }
  }

  /**
   * Delete a thread/session permanently
   * @param sessionId - The session ID to delete
   */
  async deleteThread(sessionId: string): Promise<void> {
    const response = await fetch(
      `${this.backendUrl}/api/sessions/${encodeURIComponent(sessionId)}`,
      { method: 'DELETE' }
    );

    if (!response.ok) {
      throw new Error(`Failed to delete thread: HTTP ${response.status}`);
    }
  }

  /**
   * Rename a thread/session
   * @param sessionId - The session ID to rename
   * @param newTitle - The new title for the thread
   */
  async renameThread(sessionId: string, newTitle: string): Promise<void> {
    const response = await fetch(
      `${this.backendUrl}/api/sessions/${encodeURIComponent(sessionId)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to rename thread: HTTP ${response.status}`);
    }
  }
}
