/*
 * ChatManager - Aligns widget behaviour with the updated frontend core logic
 */

import { EventEmitter } from 'eventemitter3';
import {
  ConnectionStatus,
  ReadinessPhase,
  type ChatMessage,
  type ChatState,
  type BackendReadiness,
  type WalletTransaction,
  type WalletState,
  type ChatManagerConfig,
  type AomiChatError,
} from '../types';
import {
  createConnectionError,
  createChatError,
} from '../types/errors';
import { ERROR_CODES, API_ENDPOINTS, TIMING } from '../types/constants';
import { generateSessionId, withTimeout } from '../utils';

interface SessionMessagePayload {
  sender?: string;
  content?: string;
  timestamp?: string;
  tool_stream?: ToolStreamPayload;
}

interface SessionResponsePayload {
  messages?: SessionMessagePayload[] | null;
  is_processing?: boolean;
  pending_wallet_tx?: string | null;
  readiness?: ReadinessPayload | null;
}

type ToolStreamPayload = [string, string] | { topic?: unknown; content?: unknown } | null | undefined;

interface ReadinessPayload {
  phase?: unknown;
  detail?: unknown;
  message?: unknown;
}

interface ChatManagerEvents {
  stateChange: [ChatState];
  message: [ChatMessage];
  error: [AomiChatError];
  connectionChange: [ConnectionStatus];
  transactionRequest: [WalletTransaction];
}

type NetworkSwitchResult = {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
};

export class ChatManager extends EventEmitter<ChatManagerEvents> {
  private config: ChatManagerConfig;
  private state: ChatState;
  private eventSource: EventSource | null = null;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private lastPendingTransactionRaw: string | null = null;

  constructor(config: Partial<ChatManagerConfig> = {}) {
    super();

    this.config = {
      backendUrl: config.backendUrl || 'http://localhost:8080',
      sessionId: config.sessionId || generateSessionId(),
      maxMessageLength: config.maxMessageLength || 2000,
      reconnectAttempts: config.reconnectAttempts || 5,
      reconnectDelay: config.reconnectDelay || 3000,
    };

    this.state = {
      messages: [],
      isTyping: false,
      isProcessing: false,
      connectionStatus: ConnectionStatus.DISCONNECTED,
      readiness: {
        phase: ReadinessPhase.INITIALIZING,
      },
      walletState: {
        isConnected: false,
      },
      sessionId: this.config.sessionId,
      pendingTransaction: undefined,
    };
  }

  /*
   * ============================================================================
   * PUBLIC API
   * ============================================================================
   */

  public getState(): ChatState {
    return {
      ...this.state,
      messages: [...this.state.messages],
      walletState: { ...this.state.walletState },
    };
  }

  public getSessionId(): string {
    return this.config.sessionId;
  }

  public setSessionId(sessionId: string): void {
    this.config.sessionId = sessionId;
    this.state.sessionId = sessionId;

    if (this.state.connectionStatus === ConnectionStatus.CONNECTED) {
      void this.connectSSE();
    }
  }

  public async connectSSE(): Promise<void> {
    this.setConnectionStatus(ConnectionStatus.CONNECTING);
    this.updateReadiness({ phase: ReadinessPhase.CONNECTING_BACKEND });

    this.teardownEventSource();

    try {
      const streamUrl = `${this.config.backendUrl}${API_ENDPOINTS.CHAT_STREAM}?session_id=${encodeURIComponent(
        this.config.sessionId,
      )}`;
      this.eventSource = new EventSource(streamUrl);

      this.eventSource.onopen = () => {
        this.setConnectionStatus(ConnectionStatus.CONNECTED);
        this.reconnectAttempt = 0;
        this.startHeartbeat();
        void this.refreshState();
      };

      this.eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as SessionResponsePayload;
          this.processBackendPayload(payload);
        } catch (error) {
          console.error('Failed to parse SSE payload:', error);
          this.emit('error', createChatError(ERROR_CODES.INVALID_MESSAGE, 'Invalid message format'));
        }
      };

      this.eventSource.onerror = (event) => {
        console.error('SSE connection error:', event);

        if (this.state.isProcessing) {
          this.state.isProcessing = false;
          this.state.isTyping = false;
          this.emitStateChange();
        }

        this.handleConnectionError();
        void this.refreshState();
      };
    } catch (error) {
      console.error('Failed to create SSE connection:', error);
      this.emit('error', createConnectionError('Failed to establish connection'));
      this.handleConnectionError();
    }
  }

  public disconnectSSE(): void {
    this.teardownEventSource();
    this.setConnectionStatus(ConnectionStatus.DISCONNECTED);
  }


  public async sendMessage(message: string): Promise<void> {
    const content = message.trim();

    if (!content) {
      throw createChatError(ERROR_CODES.INVALID_MESSAGE, 'Message cannot be empty');
    }

    if (content.length > (this.config.maxMessageLength ?? 0)) {
      throw createChatError(ERROR_CODES.MESSAGE_TOO_LONG, `Message exceeds ${this.config.maxMessageLength} characters`);
    }

    if (this.state.connectionStatus !== ConnectionStatus.CONNECTED) {
      throw createConnectionError('Not connected to backend');
    }

    try {
      const response = await this.postToBackend(API_ENDPOINTS.CHAT, {
        message: content,
        session_id: this.config.sessionId,
      });

      this.processBackendPayload(response);
    } catch (error) {
      console.error('Failed to send message:', error);
      throw createChatError(ERROR_CODES.UNKNOWN_ERROR, 'Failed to send message');
    }
  }

  public async sendSystemMessage(message: string): Promise<void> {
    try {
      const response = await this.postToBackend(API_ENDPOINTS.SYSTEM, {
        message,
        session_id: this.config.sessionId,
      });

      this.processBackendPayload(response);
    } catch (error) {
      console.error('Failed to send system message:', error);
      throw createChatError(ERROR_CODES.UNKNOWN_ERROR, 'Failed to send system message');
    }
  }

  public async interrupt(): Promise<void> {
    try {
      const response = await this.postToBackend(API_ENDPOINTS.INTERRUPT, {
        session_id: this.config.sessionId,
      });

      this.processBackendPayload(response);
    } catch (error) {
      console.error('Failed to interrupt:', error);
      throw createChatError(ERROR_CODES.UNKNOWN_ERROR, 'Failed to interrupt processing');
    }
  }

  public async sendNetworkSwitchRequest(networkName: string): Promise<NetworkSwitchResult> {
    try {
      await this.sendSystemMessage(`Detected user's wallet connected to ${networkName} network`);
      return {
        success: true,
        message: `Network switch system message sent for ${networkName}`,
        data: { network: networkName },
      };
    } catch (error) {
      const err = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: err,
      };
    }
  }

  public async sendTransactionResult(success: boolean, transactionHash?: string, error?: string): Promise<void> {
    const message = success
      ? `Transaction sent: ${transactionHash}`
      : `Transaction rejected by user${error ? `: ${error}` : ''}`;

    try {
      await this.sendSystemMessage(message);
    } catch (err) {
      console.error('Failed to send transaction result:', err);
    } finally {
      this.clearPendingTransaction();
    }
  }

  public clearPendingTransaction(): void {
    if (this.state.pendingTransaction) {
      this.state.pendingTransaction = undefined;
      this.lastPendingTransactionRaw = null;
      this.emitStateChange();
    }
  }

  public clearMessages(): void {
    if (this.state.messages.length === 0) return;
    this.state.messages = [];
    this.emitStateChange();
  }

  public updateWalletState(walletState: Partial<WalletState>): void {
    this.state.walletState = { ...this.state.walletState, ...walletState };
    this.emitStateChange();
  }

  public destroy(): void {
    this.disconnectSSE();
    this.removeAllListeners();
  }

  /*
   * ============================================================================
   * INTERNAL STATE HANDLING
   * ============================================================================
   */

  private processBackendPayload(payload: SessionResponsePayload): void {
    if (!payload) {
      return;
    }

    const previousMessages = this.state.messages;
    let stateChanged = false;

    if (Array.isArray(payload.messages)) {
      const nextMessages = this.buildMessages(payload.messages, previousMessages);
      this.state.messages = nextMessages;
      stateChanged = true;

      nextMessages.forEach((message, index) => {
        const previous = previousMessages[index];
        const isNewMessage = !previous || previous.id !== message.id;
        const contentChanged = previous && previous.content !== message.content;
        const toolStreamChanged = previous && !areToolStreamsEqual(previous.toolStream, message.toolStream);

        if (isNewMessage || contentChanged || toolStreamChanged) {
          this.emit('message', message);
        }
      });
    } else if (payload.messages === null) {
      if (previousMessages.length > 0) {
        this.state.messages = [];
        stateChanged = true;
      }
    } else if (payload.messages !== undefined) {
      console.error('Received malformed messages payload from backend:', payload.messages);
    }

    if (payload.is_processing !== undefined) {
      const processing = Boolean(payload.is_processing);
      if (processing !== this.state.isProcessing) {
        this.state.isProcessing = processing;
        stateChanged = true;
      }

      if (this.state.isTyping !== processing) {
        this.state.isTyping = processing;
        stateChanged = true;
      }
    }

    if (payload.readiness !== undefined) {
      const readiness = this.normaliseReadiness(payload.readiness);
      if (readiness) {
        const current = this.state.readiness;
        if (
          current.phase !== readiness.phase ||
          current.detail !== readiness.detail
        ) {
          this.state.readiness = readiness;
          stateChanged = true;
        }
      }
    }

    if (payload.pending_wallet_tx !== undefined) {
      if (payload.pending_wallet_tx === null) {
        if (this.state.pendingTransaction) {
          this.state.pendingTransaction = undefined;
          this.lastPendingTransactionRaw = null;
          stateChanged = true;
        }
      } else if (payload.pending_wallet_tx !== this.lastPendingTransactionRaw) {
        try {
          const transaction = JSON.parse(payload.pending_wallet_tx) as WalletTransaction;
          this.state.pendingTransaction = transaction;
          this.lastPendingTransactionRaw = payload.pending_wallet_tx;
          this.emit('transactionRequest', transaction);
          stateChanged = true;
        } catch (error) {
          console.error('Failed to parse wallet transaction payload:', error);
        }
      }
    }

    if ('pending_wallet_tx' in payload) {
      const raw = payload.pending_wallet_tx ?? null;

      if (raw === null) {
        if (this.state.pendingTransaction) {
          this.state.pendingTransaction = undefined;
          this.lastPendingTransactionRaw = null;
          stateChanged = true;
        }
      } else if (raw !== this.lastPendingTransactionRaw) {
        this.lastPendingTransactionRaw = raw;
        try {
          const parsed = JSON.parse(raw) as WalletTransaction;
          this.state.pendingTransaction = parsed;
          stateChanged = true;
          this.emit('transactionRequest', parsed);
        } catch (error) {
          console.error('Failed to parse wallet transaction request:', error);
        }
      }
    }

    if (stateChanged) {
      this.emitStateChange();
    }
  }

  private buildMessages(messages: SessionMessagePayload[], previousMessages: ChatMessage[]): ChatMessage[] {
    return messages
      .filter((msg): msg is SessionMessagePayload => Boolean(msg))
      .map((msg, index) => {
        const type = this.normaliseSender(msg.sender);
        const content = msg.content ?? '';
        const timestamp = this.parseTimestamp(msg.timestamp);
        const toolStream = normaliseToolStream(msg.tool_stream);

        const previous = previousMessages[index];
        const id = previous ? previous.id : generateSessionId();

        return {
          id,
          type,
          content,
          timestamp,
          toolStream,
        };
      });
  }

  private normaliseSender(sender?: string): ChatMessage['type'] {
    switch (sender) {
      case 'user':
        return 'user';
      case 'system':
        return 'system';
      default:
        return 'assistant';
    }
  }

  private parseTimestamp(timestamp?: string): Date {
    if (!timestamp) {
      return new Date();
    }

    const parsed = new Date(timestamp);
    if (Number.isNaN(parsed.valueOf())) {
      return new Date();
    }

    return parsed;
  }

  private normaliseReadiness(payload?: ReadinessPayload | null): BackendReadiness | null {
    if (!payload || typeof payload.phase !== 'string') {
      return null;
    }

    const detailRaw = typeof payload.detail === 'string' && payload.detail.trim().length > 0
      ? payload.detail.trim()
      : typeof payload.message === 'string' && payload.message.trim().length > 0
        ? payload.message.trim()
        : undefined;

    switch (payload.phase) {
      case 'connecting_mcp':
        return { phase: ReadinessPhase.CONNECTING_BACKEND, detail: detailRaw };
      case 'validating_anthropic':
        return { phase: ReadinessPhase.VALIDATING_API, detail: detailRaw };
      case 'ready':
        return { phase: ReadinessPhase.READY, detail: detailRaw };
      case 'missing_api_key':
        return ReadinessPhase.MISSING_API_KEY;
      case 'error':
        return { phase: ReadinessPhase.ERROR, detail: detailRaw };
      default:
        return { phase: ReadinessPhase.ERROR, detail: detailRaw };
    }
  }

  private updateReadiness(readiness: BackendReadiness): void {
    this.state.readiness = readiness;
    this.emitStateChange();
  }

  private setConnectionStatus(status: ConnectionStatus): void {
    if (this.state.connectionStatus !== status) {
      this.state.connectionStatus = status;
      this.emit('connectionChange', status);
      this.emitStateChange();
    }
  }

  private emitStateChange(): void {
    this.emit('stateChange', this.getState());
  }

  /*
   * ============================================================================
   * BACKEND COMMUNICATION
   * ============================================================================
   */

  private async postToBackend(endpoint: string, data: Record<string, unknown>): Promise<SessionResponsePayload> {
    const url = `${this.config.backendUrl}${endpoint}`;

    try {
      const response = await withTimeout(
        fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        }),
        TIMING.CONNECTION_TIMEOUT,
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json() as SessionResponsePayload;
    } catch (error) {
      if (error instanceof Error && error.message.includes('timed out')) {
        throw createConnectionError('Request timed out');
      }
      throw createConnectionError(`Request failed: ${error}`);
    }
  }

  private async refreshState(): Promise<void> {
    try {
      const response = await withTimeout(
        fetch(
          `${this.config.backendUrl}${API_ENDPOINTS.STATE}?session_id=${encodeURIComponent(
            this.config.sessionId,
          )}`,
        ),
        TIMING.CONNECTION_TIMEOUT,
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const payload = await response.json() as SessionResponsePayload;
      this.processBackendPayload(payload);
    } catch (error) {
      console.warn('Failed to refresh chat state:', error);
    }
  }

  /*
   * ============================================================================
   * CONNECTION MANAGEMENT
   * ============================================================================
   */

  private handleConnectionError(): void {
    this.setConnectionStatus(ConnectionStatus.ERROR);
    this.stopHeartbeat();

    if (this.reconnectAttempt < (this.config.reconnectAttempts ?? 0)) {
      this.scheduleReconnect();
    } else {
      this.setReadiness({ phase: ReadinessPhase.ERROR, detail: 'Connection lost' });
      this.setConnectionStatus(ConnectionStatus.DISCONNECTED);
      this.emit('error', createConnectionError('Max reconnection attempts reached'));
      this.setConnectionStatus(ConnectionStatus.DISCONNECTED);
    }
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer();
    this.setConnectionStatus(ConnectionStatus.RECONNECTING);
    this.setReadiness({ phase: ReadinessPhase.CONNECTING_MCP });

    const delay = (this.config.reconnectDelay ?? 0) * Math.pow(2, this.reconnectAttempt);
    this.reconnectAttempt += 1;

    this.reconnectTimer = setTimeout(() => {
      void this.connectSSE();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.state.connectionStatus === ConnectionStatus.CONNECTED && this.eventSource) {
        if (this.eventSource.readyState !== EventSource.OPEN) {
          console.warn('SSE connection lost, attempting to reconnect');
          this.handleConnectionError();
        }
      }
    }, TIMING.HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private teardownEventSource(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.stopHeartbeat();
    this.clearReconnectTimer();
  }
}

function normaliseToolStream(raw: ToolStreamPayload): ChatMessage['toolStream'] | undefined {
  if (!raw) {
    return undefined;
  }

  if (Array.isArray(raw)) {
    const [topic, content] = raw;
    return typeof topic === 'string'
      ? { topic, content: typeof content === 'string' ? content : '' }
      : undefined;
  }

  if (typeof raw === 'object') {
    const { topic, content } = raw as { topic?: unknown; content?: unknown };
    return typeof topic === 'string'
      ? { topic, content: typeof content === 'string' ? content : '' }
      : undefined;
  }

  return undefined;
}

function areToolStreamsEqual(a?: ChatMessage['toolStream'], b?: ChatMessage['toolStream']): boolean {
  if (!a && !b) {
    return true;
  }

  if (!a || !b) {
    return false;
  }

  return a.topic === b.topic && a.content === b.content;
}
