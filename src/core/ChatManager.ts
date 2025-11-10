/*
 * ChatManager - Manages chat connection, state, and communication
 * Adapted from your existing chat-manager.ts
 */

import { EventEmitter } from 'eventemitter3';
import {
  ConnectionStatus,
  type ChatMessage,
  type ChatState,
  type WalletTransaction,
  type ChatManagerConfig,
} from '../types/interfaces';
import { createWidgetError } from '../types/interfaces';
import { API_ENDPOINTS, ERROR_CODES, TIMING } from '../types/constants';
import { generateSessionId, withTimeout } from '../utils/base';
import {
  type BackendMessagePayload,
  type BackendStatePayload,
  convertBackendMessage,
  resolveBackendBoolean,
  areToolStreamsEqual,
} from '../utils/helper';

/*
 * ============================================================================
 * TYPES
 * ============================================================================
 */

interface ChatManagerEvents {
  stateChange: (_state: ChatState) => void;
  message: (_message: ChatMessage) => void;
  error: (_error: Error) => void;
  connectionChange: (_status: ConnectionStatus) => void;
  transactionRequest: (_transaction: WalletTransaction) => void;
}

/*
 * ============================================================================
 * CHAT MANAGER CLASS
 * ============================================================================
 */

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
      ...config,
    };

    this.state = {
      messages: [],
      isProcessing: false,
      connectionStatus: ConnectionStatus.DISCONNECTED,
      sessionId: this.config.sessionId,
    };
  }

  /*
   * ============================================================================
   * PUBLIC API
   * ============================================================================
   */

  /**
   * Gets the current state
   */
  public getState(): ChatState {
    return { ...this.state };
  }

  /**
   * Gets the session ID
   */
  public getSessionId(): string {
    return this.config.sessionId;
  }

  /**
   * Sets a new session ID and reconnects if needed
   */
  public setSessionId(sessionId: string): void {
    this.config.sessionId = sessionId;
    this.state.sessionId = sessionId;

    if (this.state.connectionStatus === ConnectionStatus.CONNECTED) {
      this.connectSSE();
    }
  }

  /**
   * Connects to the backend via Server-Sent Events
   */
  public async connectSSE(): Promise<void> {
    this.setConnectionStatus(ConnectionStatus.CONNECTING);

    // Close existing connection
    this.disconnectSSE();

    try {
      const url = `${this.config.backendUrl}${API_ENDPOINTS.CHAT_STREAM}?session_id=${this.config.sessionId}`;
      this.eventSource = new EventSource(url);

      this.eventSource.onopen = () => {
        console.warn('SSE connection opened:', url);
        this.setConnectionStatus(ConnectionStatus.CONNECTED);
        this.reconnectAttempt = 0;
        this.startHeartbeat();
        this.refreshState().catch((error) => {
          console.warn('Failed to refresh chat state after opening SSE connection:', error);
        });
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data: BackendStatePayload = JSON.parse(event.data);
          this.updateChatState(data);
        } catch (error) {
          console.error('Failed to parse SSE message:', error);
      this.emit('error', createWidgetError(ERROR_CODES.INVALID_MESSAGE, 'Invalid message format'));
        }
      };

      this.eventSource.onerror = (event) => {
        console.error('SSE connection error:', event);
        this.handleConnectionError();
      };

    } catch (error) {
      console.error('Failed to create SSE connection:', error);
      this.emit('error', createWidgetError(ERROR_CODES.CONNECTION_FAILED, 'Failed to establish connection'));
      this.handleConnectionError();
    }
  }

  /**
   * Disconnects from the backend
   */
  public disconnectSSE(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.stopHeartbeat();
    this.clearReconnectTimer();
    this.setConnectionStatus(ConnectionStatus.DISCONNECTED);
  }

  private async refreshState(): Promise<void> {
    try {
      const response = await withTimeout(
        fetch(`${this.config.backendUrl}${API_ENDPOINTS.STATE}?session_id=${this.config.sessionId}`, {
          method: 'GET',
        }),
        TIMING.CONNECTION_TIMEOUT,
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const payload = await response.json() as BackendStatePayload;
      this.updateChatState(payload);
    } catch (error) {
      console.warn('Failed to fetch chat state:', error);
    }
  }

  /**
   * Sends a message to the backend
   */
  public async sendMessage(message: string): Promise<void> {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      throw createWidgetError(ERROR_CODES.INVALID_MESSAGE, 'Message cannot be empty');
    }

    if (trimmedMessage.length > this.config.maxMessageLength!) {
      throw createWidgetError(ERROR_CODES.MESSAGE_TOO_LONG, `Message exceeds ${this.config.maxMessageLength} characters`);
    }

    if (this.state.connectionStatus !== ConnectionStatus.CONNECTED) {
      throw createWidgetError(ERROR_CODES.CONNECTION_FAILED, 'Not connected to backend');
    }

    if (this.state.isProcessing) {
      throw createWidgetError(ERROR_CODES.RATE_LIMITED, 'Previous message is still being processed');
    }

    try {
      const payload = await this.postToBackend(API_ENDPOINTS.CHAT, {
        message: trimmedMessage,
        session_id: this.config.sessionId,
      });

      this.updateChatState(payload);
    } catch (error) {
      console.error('Failed to send message:', error);
      throw createWidgetError(ERROR_CODES.UNKNOWN_ERROR, 'Failed to send message');
    }
  }

  /**
   * Sends a system message
   */
  public async sendSystemMessage(message: string): Promise<void> {
    try {
      const payload = await this.postToBackend(API_ENDPOINTS.SYSTEM, {
        message,
        session_id: this.config.sessionId,
      });
      this.updateChatState(payload);
    } catch (error) {
      console.error('Failed to send system message:', error);
      throw createWidgetError(ERROR_CODES.UNKNOWN_ERROR, 'Failed to send system message');
    }
  }

  /**
   * Interrupts current processing
   */
  public async interrupt(): Promise<void> {
    try {
      const payload = await this.postToBackend(API_ENDPOINTS.INTERRUPT, {
        session_id: this.config.sessionId,
      });
      this.updateChatState(payload);
    } catch (error) {
      console.error('Failed to interrupt:', error);
      throw createWidgetError(ERROR_CODES.UNKNOWN_ERROR, 'Failed to interrupt processing');
    }
  }

  /**
   * Sends transaction result back to backend
   */
  public async sendTransactionResult(
    success: boolean,
    txHash?: string,
    error?: string,
  ): Promise<void> {
    try {
      await this.sendSystemMessage(
        `Transaction ${success ? 'completed' : 'failed'}${txHash ? `: ${txHash}` : ''}${error ? ` (${error})` : ''}`,
      );
    } catch (err) {
      console.error('Failed to send transaction result:', err);
    }
  }

  /**
   * Clears all messages
   */
  public clearMessages(): void {
    this.state.messages = [];
    this.emitStateChange();
  }

  /**
   * Destroys the chat manager
   */
  public destroy(): void {
    this.disconnectSSE();
    this.removeAllListeners();
  }

  /*
   * ============================================================================
   * PRIVATE METHODS
   * ============================================================================
   */

  private updateChatState(payload: BackendStatePayload | undefined | null): void {
    if (!payload) {
      return;
    }

    const previousMessages = this.state.messages.slice();
    let stateChanged = false;

    if (Array.isArray(payload.messages)) {
      const converted = payload.messages
        .filter((msg): msg is BackendMessagePayload => Boolean(msg))
        .map((msg, index) => convertBackendMessage(msg, index, previousMessages[index]));

      this.state.messages = converted;
      stateChanged = true;

      converted.forEach((message, index) => {
        const previous = previousMessages[index];
        const isNewMessage = !previous || previous.id !== message.id;
        const contentChanged = previous && previous.content !== message.content;
        const toolStreamChanged = previous && !areToolStreamsEqual(previous.toolStream, message.toolStream);

        if (isNewMessage || contentChanged || toolStreamChanged) {
          this.emit('message', message);
        }
      });
    }

    const processingFlag = resolveBackendBoolean(payload.isProcessing ?? payload.is_processing);
    if (processingFlag !== null && processingFlag !== this.state.isProcessing) {
      this.state.isProcessing = processingFlag;
      stateChanged = true;
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

  private async postToBackend(endpoint: string, data: Record<string, unknown>): Promise<BackendStatePayload> {
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

      return await response.json() as BackendStatePayload;
    } catch (error) {
      if (error instanceof Error && error.message.includes('timed out')) {
        throw createWidgetError(ERROR_CODES.CONNECTION_TIMEOUT, 'Request timed out');
      }
      throw createWidgetError(ERROR_CODES.CONNECTION_FAILED, `Request failed: ${error}`);
    }
  }

  private handleConnectionError(): void {
    this.setConnectionStatus(ConnectionStatus.ERROR);
    this.stopHeartbeat();

    if (this.reconnectAttempt < this.config.reconnectAttempts!) {
      this.scheduleReconnect();
    } else {
      this.setConnectionStatus(ConnectionStatus.DISCONNECTED);
      this.emit('error', createWidgetError(ERROR_CODES.CONNECTION_FAILED, 'Max reconnection attempts reached'));
    }
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer();
    this.setConnectionStatus(ConnectionStatus.RECONNECTING);

    const delay = this.config.reconnectDelay! * Math.pow(2, this.reconnectAttempt);
    this.reconnectAttempt++;

    console.warn(`Scheduling reconnect attempt ${this.reconnectAttempt} in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      this.connectSSE().catch(error => {
        console.error('Reconnection attempt failed:', error);
      });
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
        // Check if connection is still alive
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
}
