import { EventEmitter } from 'eventemitter3';
import { ConnectionStatus, type ChatMessage, type ChatState, type WalletTransaction, type ChatManagerConfig } from '../types/interface';
interface ChatManagerEvents {
    stateChange: (_state: ChatState) => void;
    message: (_message: ChatMessage) => void;
    error: (_error: Error) => void;
    connectionChange: (_status: ConnectionStatus) => void;
    transactionRequest: (_transaction: WalletTransaction) => void;
}
export declare class ChatManager extends EventEmitter<ChatManagerEvents> {
    private config;
    private state;
    private eventSource;
    private reconnectAttempt;
    private reconnectTimer;
    private heartbeatTimer;
    private lastPendingTransactionRaw;
    constructor(config?: Partial<ChatManagerConfig>);
    /**
     * Gets the current state
     */
    getState(): ChatState;
    /**
     * Gets the session ID
     */
    getSessionId(): string;
    /**
     * Sets a new session ID and reconnects if needed
     */
    setSessionId(sessionId: string): void;
    /**
     * Connects to the backend via Server-Sent Events
     */
    connectSSE(): Promise<void>;
    /**
     * Disconnects from the backend
     */
    disconnectSSE(): void;
    private refreshState;
    /**
     * Sends a message to the backend
     */
    sendMessage(message: string): Promise<void>;
    /**
     * Sends a system message
     */
    sendSystemMessage(message: string): Promise<void>;
    /**
     * Interrupts current processing
     */
    interrupt(): Promise<void>;
    /**
     * Sends transaction result back to backend
     */
    sendTransactionResult(success: boolean, txHash?: string, error?: string): Promise<void>;
    /**
     * Clears all messages
     */
    clearMessages(): void;
    /**
     * Destroys the chat manager
     */
    destroy(): void;
    private updateChatState;
    private setConnectionStatus;
    private emitStateChange;
    private postToBackend;
    private handleConnectionError;
    private scheduleReconnect;
    private clearReconnectTimer;
    private startHeartbeat;
    private stopHeartbeat;
}
export {};
//# sourceMappingURL=chatManager.d.ts.map