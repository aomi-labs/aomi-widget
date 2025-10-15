/*
 * ChatManager - Manages chat connection, state, and communication
 * Adapted from your existing chat-manager.ts
 */

import { EventEmitter } from 'eventemitter3';
import type {
  ChatMessage,
  ChatState,
  BackendReadiness,
  WalletTransaction,
  WalletState,
  ChatManagerConfig,
  AomiChatError,
} from '../types';
import {
  ConnectionStatus,
  ReadinessPhase,
} from '../types';
import {
  createConnectionError,
  createChatError,
} from '../types/errors';
import { ERROR_CODES } from '../types/constants';
import { API_ENDPOINTS, TIMING } from '../types/constants';
import { generateSessionId, withTimeout } from '../utils';

/*
 * ============================================================================
 * TYPES
 * ============================================================================
 */

interface BackendMessage {
  messages?: Array<{
    type: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: string;
  }>;
  isTyping?: boolean;
  isProcessing?: boolean;
  readiness?: {
    phase: string;
    detail?: string;
  };
  pendingWalletTx?: WalletTransaction;
}

interface ChatManagerEvents {
  stateChange: (state: ChatState) => void;
  message: (message: ChatMessage) => void;
  error: (error: AomiChatError) => void;
  connectionChange: (status: ConnectionStatus) => void;
  transactionRequest: (transaction: WalletTransaction) => void;
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
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;

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
    this.setReadiness({ phase: ReadinessPhase.CONNECTING_BACKEND });

    // Close existing connection
    this.disconnectSSE();

    try {
      const url = `${this.config.backendUrl}${API_ENDPOINTS.CHAT_STREAM}?session_id=${this.config.sessionId}`;
      this.eventSource = new EventSource(url);

      this.eventSource.onopen = () => {
        console.log('🌐 SSE connection opened:', url);
        this.setConnectionStatus(ConnectionStatus.CONNECTED);
        this.setReadiness({ phase: ReadinessPhase.VALIDATING_API });
        this.reconnectAttempt = 0;
        this.startHeartbeat();
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data: BackendMessage = JSON.parse(event.data);
          this.handleBackendMessage(data);
        } catch (error) {
          console.error('Failed to parse SSE message:', error);
          this.emit('error', createChatError(ERROR_CODES.INVALID_MESSAGE, 'Invalid message format'));
        }
      };

      this.eventSource.onerror = (event) => {
        console.error('SSE connection error:', event);
        this.handleConnectionError();
      };

    } catch (error) {
      console.error('Failed to create SSE connection:', error);
      this.emit('error', createConnectionError('Failed to establish connection'));
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

  /**
   * Sends a message to the backend
   */
  public async sendMessage(message: string): Promise<void> {
    if (!message.trim()) {
      throw createChatError(ERROR_CODES.INVALID_MESSAGE, 'Message cannot be empty');
    }

    if (message.length > this.config.maxMessageLength!) {
      throw createChatError(ERROR_CODES.MESSAGE_TOO_LONG, `Message exceeds ${this.config.maxMessageLength} characters`);
    }

    if (this.state.connectionStatus !== ConnectionStatus.CONNECTED) {
      throw createConnectionError('Not connected to backend');
    }

    if (this.state.isProcessing) {
      throw createChatError(ERROR_CODES.RATE_LIMITED, 'Previous message is still being processed');
    }

    try {
      const response = await this.postToBackend(API_ENDPOINTS.CHAT, {
        message: message.trim(),
        session_id: this.config.sessionId,
      });

      // Add user message immediately
      this.addMessage({
        id: generateSessionId(),
        type: 'user',
        content: message.trim(),
        timestamp: new Date(),
      });

      console.log('Message sent successfully:', response);
    } catch (error) {
      console.error('Failed to send message:', error);
      throw createChatError(ERROR_CODES.UNKNOWN_ERROR, 'Failed to send message');
    }
  }

  /**
   * Sends a system message
   */
  public async sendSystemMessage(message: string): Promise<void> {
    try {
      await this.postToBackend(API_ENDPOINTS.SYSTEM, {
        message,
        session_id: this.config.sessionId,
      });
    } catch (error) {
      console.error('Failed to send system message:', error);
      throw createChatError(ERROR_CODES.UNKNOWN_ERROR, 'Failed to send system message');
    }
  }

  /**
   * Interrupts current processing
   */
  public async interrupt(): Promise<void> {
    try {
      await this.postToBackend(API_ENDPOINTS.INTERRUPT, {
        session_id: this.config.sessionId,
      });
    } catch (error) {
      console.error('Failed to interrupt:', error);
      throw createChatError(ERROR_CODES.UNKNOWN_ERROR, 'Failed to interrupt processing');
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
   * Updates wallet state
   */
  public updateWalletState(walletState: Partial<WalletState>): void {
    this.state.walletState = { ...this.state.walletState, ...walletState };
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

  private handleBackendMessage(data: BackendMessage): void {
    let stateChanged = false;

    // Handle messages
    if (data.messages) {
      const newMessages = data.messages.map(msg => ({
        id: generateSessionId(),
        type: msg.type,
        content: msg.content,
        timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
      })) as ChatMessage[];

      // Replace all messages (backend sends complete state)
      this.state.messages = newMessages;
      stateChanged = true;

      // Emit individual message events for new messages
      newMessages.forEach(message => {
        this.emit('message', message);
      });
    }

    // Handle typing state
    if (typeof data.isTyping === 'boolean' && data.isTyping !== this.state.isTyping) {
      this.state.isTyping = data.isTyping;
      stateChanged = true;
    }

    // Handle processing state
    if (typeof data.isProcessing === 'boolean' && data.isProcessing !== this.state.isProcessing) {
      this.state.isProcessing = data.isProcessing;
      stateChanged = true;
    }

    // Handle readiness
    if (data.readiness) {
      const newReadiness = this.normalizeReadiness(data.readiness);
      if (newReadiness.phase !== this.state.readiness.phase) {
        this.setReadiness(newReadiness);
        stateChanged = true;
      }
    }

    // Handle transaction requests
    if (data.pendingWalletTx) {
      this.state.pendingTransaction = data.pendingWalletTx;
      this.emit('transactionRequest', data.pendingWalletTx);
      stateChanged = true;
    }

    if (stateChanged) {
      this.emitStateChange();
    }
  }

  private normalizeReadiness(readiness: { phase: string; detail?: string }): BackendReadiness {
    let phase: ReadinessPhase;

    switch (readiness.phase) {
      case 'connecting_mcp':
        phase = ReadinessPhase.CONNECTING_BACKEND;
        break;
      case 'validating_anthropic':
        phase = ReadinessPhase.VALIDATING_API;
        break;
      case 'ready':
        phase = ReadinessPhase.READY;
        break;
      case 'missing_api_key':
      case 'error':
        phase = ReadinessPhase.ERROR;
        break;
      default:
        phase = ReadinessPhase.INITIALIZING;
    }

    return {
      phase,
      detail: readiness.detail,
    };
  }

  private addMessage(message: ChatMessage): void {
    this.state.messages.push(message);
    this.emit('message', message);
    this.emitStateChange();
  }

  private setConnectionStatus(status: ConnectionStatus): void {
    if (this.state.connectionStatus !== status) {
      this.state.connectionStatus = status;
      this.emit('connectionChange', status);
      this.emitStateChange();
    }
  }

  private setReadiness(readiness: BackendReadiness): void {
    this.state.readiness = readiness;
    this.emitStateChange();
  }

  private emitStateChange(): void {
    this.emit('stateChange', this.getState());
  }

  private async postToBackend(endpoint: string, data: Record<string, unknown>): Promise<unknown> {
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

      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.message.includes('timed out')) {
        throw createConnectionError('Request timed out');
      }
      throw createConnectionError(`Request failed: ${error}`);
    }
  }

  private handleConnectionError(): void {
    this.setConnectionStatus(ConnectionStatus.ERROR);
    this.stopHeartbeat();

    if (this.reconnectAttempt < this.config.reconnectAttempts!) {
      this.scheduleReconnect();
    } else {
      this.emit('error', createConnectionError('Max reconnection attempts reached'));
    }
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer();
    this.setConnectionStatus(ConnectionStatus.RECONNECTING);

    const delay = this.config.reconnectDelay! * Math.pow(2, this.reconnectAttempt);
    this.reconnectAttempt++;

    console.log(`Scheduling reconnect attempt ${this.reconnectAttempt} in ${delay}ms`);

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
