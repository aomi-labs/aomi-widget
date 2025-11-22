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

async function postState<T>(
  backendUrl: string,
  path: string,
  payload: Record<string, unknown>
): Promise<T> {
  const response = await fetch(`${backendUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
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
}
