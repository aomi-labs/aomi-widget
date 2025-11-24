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

export type SystemUpdate =
  | {
    type: "TitleChanged";
    data: {
      session_id: string;
      new_title: string;
    };
  };

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
  const url = `${backendUrl}${path}${query}`;
  console.log('🔵 [postState] URL:', url);
  console.log('🔵 [postState] Payload:', payload);

  const response = await fetch(url, {
    method: "POST",
  });
  console.log('🔵 [postState] Response status:', response.status);

  if (!response.ok) {
    console.error('🔴 [postState] Error:', response.status, response.statusText);
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = (await response.json()) as T;
  console.log('🟢 [postState] Success:', data);
  return data;
}

export class BackendApi {
  private connectionStatus = false;
  private eventSource: EventSource | null = null;
  private updatesEventSource: EventSource | null = null;

  constructor(private readonly backendUrl: string) {}

  async fetchState(sessionId: string): Promise<SessionResponsePayload> {
    console.log('🔵 [fetchState] Called with sessionId:', sessionId);
    const url = `${this.backendUrl}/api/state?session_id=${encodeURIComponent(sessionId)}`;
    console.log('🔵 [fetchState] URL:', url);

    const response = await fetch(url);
    console.log('🔵 [fetchState] Response status:', response.status, response.statusText);

    if (!response.ok) {
      console.error('🔴 [fetchState] Error:', response.status, response.statusText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as SessionResponsePayload;
    console.log('🟢 [fetchState] Success:', data);
    return data;
  }

  async postChatMessage(sessionId: string, message: string): Promise<SessionResponsePayload> {
    console.log('🔵 [postChatMessage] Called with sessionId:', sessionId, 'message:', message);
    const result = await postState<SessionResponsePayload>(this.backendUrl, "/api/chat", { message, session_id: sessionId });
    console.log('🟢 [postChatMessage] Success:', result);
    return result;
  }

  async postSystemMessage(sessionId: string, message: string): Promise<SystemResponsePayload> {
    console.log('🔵 [postSystemMessage] Called with sessionId:', sessionId, 'message:', message);
    const result = await postState<SystemResponsePayload>(this.backendUrl, "/api/system", { message, session_id: sessionId });
    console.log('🟢 [postSystemMessage] Success:', result);
    return result;
  }

  async postInterrupt(sessionId: string): Promise<SessionResponsePayload> {
    console.log('🔵 [postInterrupt] Called with sessionId:', sessionId);
    const result = await postState<SessionResponsePayload>(this.backendUrl, "/api/interrupt", { session_id: sessionId });
    console.log('🟢 [postInterrupt] Success:', result);
    return result;
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

  subscribeToUpdates(
    onUpdate: (update: SystemUpdate) => void,
    onError?: (error: unknown) => void
  ): () => void {
    // Close any existing connection before opening a new one
    if (this.updatesEventSource) {
      this.updatesEventSource.close();
    }

    const updatesUrl = new URL("/api/updates", this.backendUrl).toString();
    this.updatesEventSource = new EventSource(updatesUrl);

    this.updatesEventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as SystemUpdate;
        onUpdate(parsed);
      } catch (error) {
        console.error("Failed to parse system update SSE:", error);
        onError?.(error);
      }
    };

    this.updatesEventSource.onerror = (error) => {
      console.error("System updates SSE error:", error);
      onError?.(error);
    };

    return () => {
      if (this.updatesEventSource) {
        this.updatesEventSource.close();
        this.updatesEventSource = null;
      }
    };
  }

  // ==================== Thread Management API ====================

  /**
   * Fetch all threads/sessions for a given public key
   * @param publicKey - User's wallet address
   * @returns Array of thread metadata
   */
  async fetchThreads(publicKey: string): Promise<ThreadMetadata[]> {
    console.log('🔵 [fetchThreads] Called with publicKey:', publicKey);
    const url = `${this.backendUrl}/api/sessions?public_key=${encodeURIComponent(publicKey)}`;
    console.log('🔵 [fetchThreads] URL:', url);

    const response = await fetch(url);
    console.log('🔵 [fetchThreads] Response status:', response.status);

    if (!response.ok) {
      console.error('🔴 [fetchThreads] Error:', response.status);
      throw new Error(`Failed to fetch threads: HTTP ${response.status}`);
    }

    const data = (await response.json()) as ThreadMetadata[];
    console.log('🟢 [fetchThreads] Success:', data);
    return data;
  }

  /**
   * Create a new thread/session
   * @param publicKey - Optional user's wallet address
   * @param title - Thread title (e.g., "Chat 1", "Chat 2")
   * @returns Created thread information with backend-generated ID
   */
  async createThread(publicKey?: string, title?: string): Promise<CreateThreadResponse> {
    console.log('🔵 [createThread] Called with publicKey:', publicKey, 'title:', title);
    const body: Record<string, string> = {};
    if (publicKey) {
      body.public_key = publicKey;
    }
    if (title) {
      body.title = title;
    }
    console.log('🔵 [createThread] Request body:', body);

    const url = `${this.backendUrl}/api/sessions`;
    console.log('🔵 [createThread] URL:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    console.log('🔵 [createThread] Response status:', response.status);

    if (!response.ok) {
      console.error('🔴 [createThread] Error:', response.status);
      throw new Error(`Failed to create thread: HTTP ${response.status}`);
    }

    const data = (await response.json()) as CreateThreadResponse;
    console.log('🟢 [createThread] Success:', data);
    return data;
  }

  /**
   * Archive a thread/session
   * @param sessionId - The session ID to archive
   */
  async archiveThread(sessionId: string): Promise<void> {
    console.log('🔵 [archiveThread] Called with sessionId:', sessionId);
    const url = `${this.backendUrl}/api/sessions/${encodeURIComponent(sessionId)}/archive`;
    console.log('🔵 [archiveThread] URL:', url);

    const response = await fetch(url, { method: 'POST' });
    console.log('🔵 [archiveThread] Response status:', response.status);

    if (!response.ok) {
      console.error('🔴 [archiveThread] Error:', response.status);
      throw new Error(`Failed to archive thread: HTTP ${response.status}`);
    }
    console.log('🟢 [archiveThread] Success');
  }

  /**
   * Unarchive a thread/session
   * @param sessionId - The session ID to unarchive
   */
  async unarchiveThread(sessionId: string): Promise<void> {
    console.log('🔵 [unarchiveThread] Called with sessionId:', sessionId);
    const url = `${this.backendUrl}/api/sessions/${encodeURIComponent(sessionId)}/unarchive`;
    console.log('🔵 [unarchiveThread] URL:', url);

    const response = await fetch(url, { method: 'POST' });
    console.log('🔵 [unarchiveThread] Response status:', response.status);

    if (!response.ok) {
      console.error('🔴 [unarchiveThread] Error:', response.status);
      throw new Error(`Failed to unarchive thread: HTTP ${response.status}`);
    }
    console.log('🟢 [unarchiveThread] Success');
  }

  /**
   * Delete a thread/session permanently
   * @param sessionId - The session ID to delete
   */
  async deleteThread(sessionId: string): Promise<void> {
    console.log('🔵 [deleteThread] Called with sessionId:', sessionId);
    const url = `${this.backendUrl}/api/sessions/${encodeURIComponent(sessionId)}`;
    console.log('🔵 [deleteThread] URL:', url);

    const response = await fetch(url, { method: 'DELETE' });
    console.log('🔵 [deleteThread] Response status:', response.status);

    if (!response.ok) {
      console.error('🔴 [deleteThread] Error:', response.status);
      throw new Error(`Failed to delete thread: HTTP ${response.status}`);
    }
    console.log('🟢 [deleteThread] Success');
  }

  /**
   * Rename a thread/session
   * @param sessionId - The session ID to rename
   * @param newTitle - The new title for the thread
   */
  async renameThread(sessionId: string, newTitle: string): Promise<void> {
    console.log('🔵 [renameThread] Called with sessionId:', sessionId, 'newTitle:', newTitle);
    const url = `${this.backendUrl}/api/sessions/${encodeURIComponent(sessionId)}`;
    console.log('🔵 [renameThread] URL:', url);

    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle }),
    });
    console.log('🔵 [renameThread] Response status:', response.status);

    if (!response.ok) {
      console.error('🔴 [renameThread] Error:', response.status);
      throw new Error(`Failed to rename thread: HTTP ${response.status}`);
    }
    console.log('🟢 [renameThread] Success');
  }
}
