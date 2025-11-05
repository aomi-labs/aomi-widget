/*
 * ChatManager - Manages chat connection, state, and communication
 * Adapted from your existing chat-manager.ts
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
  type ToolStreamUpdate,
} from '../types';
import { createConnectionError, createChatError } from '../types/errors';
import { API_ENDPOINTS, ERROR_CODES, TIMING } from '../types/constants';
import { generateSessionId, withTimeout } from '../utils';

/*
 * ============================================================================
 * TYPES
 * ============================================================================
 */

type ToolStreamPayload =
  | [unknown, unknown]
  | {
    topic?: unknown;
    content?: unknown;
  }
  | null
  | undefined;

interface BackendMessagePayload {
  sender?: 'user' | 'assistant' | 'system' | 'agent';
  content?: string;
  timestamp?: string;
  is_streaming?: boolean;
  tool_stream?: ToolStreamPayload;
  toolStream?: ToolStreamPayload;
}

interface BackendReadinessPayload {
  phase?: unknown;
  detail?: unknown;
  message?: unknown;
}

interface BackendStatePayload {
  messages?: BackendMessagePayload[] | null;
  isTyping?: boolean;
  is_typing?: boolean;
  isProcessing?: boolean;
  is_processing?: boolean;
  pending_wallet_tx?: string | null;
  readiness?: BackendReadinessPayload | null;
  missingApiKey?: boolean | string;
  missing_api_key?: boolean | string;
  isLoading?: boolean | string;
  is_loading?: boolean | string;
  isConnectingMcp?: boolean | string;
  is_connecting_mcp?: boolean | string;
}

interface ChatManagerEvents {
  stateChange: (_state: ChatState) => void;
  message: (_message: ChatMessage) => void;
  error: (_error: AomiChatError) => void;
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
    this.setReadiness({ phase: ReadinessPhase.CONNECTING_MCP });

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
      throw createChatError(ERROR_CODES.INVALID_MESSAGE, 'Message cannot be empty');
    }

    if (trimmedMessage.length > this.config.maxMessageLength!) {
      throw createChatError(ERROR_CODES.MESSAGE_TOO_LONG, `Message exceeds ${this.config.maxMessageLength} characters`);
    }

    if (this.state.connectionStatus !== ConnectionStatus.CONNECTED) {
      throw createConnectionError('Not connected to backend');
    }

    if (this.state.readiness.phase !== ReadinessPhase.READY) {
      throw createChatError(ERROR_CODES.INVALID_CONFIG, 'Backend is not ready to accept messages');
    }

    if (this.state.isProcessing) {
      throw createChatError(ERROR_CODES.RATE_LIMITED, 'Previous message is still being processed');
    }

    try {
      const payload = await this.postToBackend(API_ENDPOINTS.CHAT, {
        message: trimmedMessage,
        session_id: this.config.sessionId,
      });

      this.updateChatState(payload);
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
      const payload = await this.postToBackend(API_ENDPOINTS.SYSTEM, {
        message,
        session_id: this.config.sessionId,
      });
      this.updateChatState(payload);
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
      const payload = await this.postToBackend(API_ENDPOINTS.INTERRUPT, {
        session_id: this.config.sessionId,
      });
      this.updateChatState(payload);
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

  private updateChatState(payload: BackendStatePayload | undefined | null): void {
    if (!payload) {
      return;
    }

    const previousMessages = this.state.messages.slice();
    let stateChanged = false;

    if (Array.isArray(payload.messages)) {
      const converted = payload.messages
        .filter((msg): msg is BackendMessagePayload => Boolean(msg))
        .map((msg, index) => this.convertBackendMessage(msg, index, previousMessages[index]));

      this.state.messages = converted;
      stateChanged = true;

      if (!this.state.isTyping && converted.some(message => message.metadata?.streaming)) {
        this.state.isTyping = true;
        stateChanged = true;
      }

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

    const typingFlag = this.resolveBoolean(payload.isTyping ?? payload.is_typing);
    if (typingFlag !== null && typingFlag !== this.state.isTyping) {
      this.state.isTyping = typingFlag;
      stateChanged = true;
    }

    const processingFlag = this.resolveBoolean(payload.isProcessing ?? payload.is_processing);
    if (processingFlag !== null && processingFlag !== this.state.isProcessing) {
      this.state.isProcessing = processingFlag;
      stateChanged = true;
    }

    const readiness = this.normalizeReadiness(payload);
    if (
      readiness
      && (
        readiness.phase !== this.state.readiness.phase
        || readiness.detail !== this.state.readiness.detail
      )
    ) {
      this.state.readiness = readiness;
      stateChanged = true;
    }

    if (
      !readiness &&
      this.state.connectionStatus === ConnectionStatus.CONNECTED &&
      this.state.readiness.phase !== ReadinessPhase.READY &&
      this.state.readiness.phase !== ReadinessPhase.ERROR &&
      this.state.readiness.phase !== ReadinessPhase.MISSING_API_KEY
    ) {
      this.state.readiness = { phase: ReadinessPhase.READY };
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

  private convertBackendMessage(
    message: BackendMessagePayload,
    index: number,
    previousMessage?: ChatMessage,
  ): ChatMessage {
    const sender = message.sender === 'user'
      ? 'user'
      : message.sender === 'system'
        ? 'system'
        : 'assistant';

    const parsedTimestamp = message.timestamp ? new Date(message.timestamp) : new Date();
    const timestamp = Number.isNaN(parsedTimestamp.valueOf()) ? new Date() : parsedTimestamp;
    const idBase = message.timestamp || `${sender}-${index}`;
    const toolStream = normaliseToolStream(message.tool_stream ?? message.toolStream);

    return {
      id: previousMessage?.id ?? `${idBase}-${index}`,
      type: sender,
      content: message.content ?? '',
      timestamp,
      metadata: {
        streaming: Boolean(message.is_streaming),
      },
      toolStream,
    };
  }

  private resolveBoolean(value: unknown): boolean | null {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return null;
  }

  private normalizeReadiness(payload: BackendStatePayload): BackendReadiness | null {
    const readinessPayload = payload.readiness;

    if (typeof readinessPayload === 'string') {
      return { phase: this.mapReadinessPhase(readinessPayload) };
    }

    if (readinessPayload && typeof readinessPayload === 'object' && typeof readinessPayload.phase === 'string') {
      const phase = this.mapReadinessPhase(readinessPayload.phase);
      const detailCandidate = typeof readinessPayload.detail === 'string' && readinessPayload.detail.trim().length > 0
        ? readinessPayload.detail
        : typeof readinessPayload.message === 'string' && readinessPayload.message.trim().length > 0
          ? readinessPayload.message
          : undefined;

      return { phase, detail: detailCandidate };
    }

    if (this.resolveBoolean(payload.missingApiKey ?? payload.missing_api_key)) {
      return { phase: ReadinessPhase.MISSING_API_KEY };
    }

    if (this.resolveBoolean(payload.isLoading ?? payload.is_loading)) {
      return { phase: ReadinessPhase.VALIDATING_ANTHROPIC };
    }

    if (this.resolveBoolean(payload.isConnectingMcp ?? payload.is_connecting_mcp)) {
      return { phase: ReadinessPhase.CONNECTING_MCP };
    }

    return null;
  }

  private mapReadinessPhase(value: string): ReadinessPhase {
    const normalised = value
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_');

    switch (normalised) {
      case 'connecting_mcp':
        return ReadinessPhase.CONNECTING_MCP;
      case 'validating_anthropic':
        return ReadinessPhase.VALIDATING_ANTHROPIC;
      case 'ready':
        return ReadinessPhase.READY;
      case 'missing_api_key':
        return ReadinessPhase.MISSING_API_KEY;
      case 'error':
        return ReadinessPhase.ERROR;
      case 'initializing':
      case 'initialising':
      case 'starting':
        return ReadinessPhase.CONNECTING_MCP;
      default:
        console.warn('Unknown readiness phase received:', value);
        return ReadinessPhase.CONNECTING_MCP;
    }
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
      this.setReadiness({ phase: ReadinessPhase.ERROR, detail: 'Connection lost' });
      this.setConnectionStatus(ConnectionStatus.DISCONNECTED);
      this.emit('error', createConnectionError('Max reconnection attempts reached'));
    }
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer();
    this.setConnectionStatus(ConnectionStatus.RECONNECTING);
    this.setReadiness({ phase: ReadinessPhase.CONNECTING_MCP });

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

function normaliseToolStream(raw: ToolStreamPayload): ToolStreamUpdate | undefined {
  if (!raw) return undefined;

  if (Array.isArray(raw)) {
    const [topic, content] = raw;
    return typeof topic === 'string'
      ? {
        topic,
        content: typeof content === 'string' ? content : '',
      }
      : undefined;
  }

  if (typeof raw === 'object') {
    const { topic, content } = raw as { topic?: unknown; content?: unknown };
    return typeof topic === 'string'
      ? {
        topic,
        content: typeof content === 'string' ? content : '',
      }
      : undefined;
  }

  return undefined;
}

function areToolStreamsEqual(
  a?: ToolStreamUpdate,
  b?: ToolStreamUpdate,
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.topic === b.topic && a.content === b.content;
}
