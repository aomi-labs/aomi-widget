import type { WidgetError } from './errors';
export type SupportedChainId = 1 | 5 | 10 | 100 | 137 | 42161 | 8453 | 11155111 | 1337 | 31337 | 59140 | 59144;
export interface ChatMessage {
    id: string;
    type: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    toolStream?: ToolStreamUpdate;
    metadata?: Record<string, unknown>;
}
export interface ToolStreamUpdate {
    topic: string;
    content: string;
}
export interface WalletTransaction {
    to: string;
    value: string;
    data: string;
    gas?: string;
    description: string;
    timestamp: string;
}
export declare enum WidgetRenderSurface {
    INLINE = "inline",
    IFRAME = "iframe"
}
export interface AomiWidgetPalette {
    primary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    error: string;
    warning: string;
    accent: string;
}
export interface AomiWidgetFonts {
    primary: string;
    monospace: string;
}
export interface AomiWidgetThemeDefinition {
    palette: AomiWidgetPalette;
    fonts: AomiWidgetFonts;
}
export interface AomiWidgetThemeConfig {
    palette?: Partial<AomiWidgetPalette>;
    fonts?: Partial<AomiWidgetFonts>;
}
export interface AomiChatWidgetParams {
    appCode: string;
    width?: string;
    height?: string;
    maxHeight?: number;
    baseUrl?: string;
    sessionId?: string;
    renderSurface?: WidgetRenderSurface;
    welcomeMessage?: string;
    placeholder?: string;
    title?: string;
    emptyStateMessage?: string;
    chainId?: SupportedChainId;
    supportedChains?: SupportedChainId[];
    theme?: AomiWidgetThemeConfig;
}
export interface ResolvedAomiChatWidgetParams {
    appCode: string;
    width: string;
    height: string;
    maxHeight: number;
    baseUrl?: string;
    sessionId?: string;
    renderSurface: WidgetRenderSurface;
    welcomeMessage?: string;
    placeholder?: string;
    chainId?: SupportedChainId;
    supportedChains?: SupportedChainId[];
    theme: AomiWidgetThemeDefinition;
}
export declare enum ConnectionStatus {
    CONNECTING = "connecting",
    CONNECTED = "connected",
    DISCONNECTED = "disconnected",
    ERROR = "error",
    RECONNECTING = "reconnecting"
}
export interface WalletState {
    isConnected: boolean;
    address?: string;
    chainId?: SupportedChainId;
    networkName?: string;
    balance?: string;
}
export interface ChatState {
    messages: ChatMessage[];
    isTyping: boolean;
    isProcessing: boolean;
    connectionStatus: ConnectionStatus;
    walletState: WalletState;
    sessionId: string;
    pendingTransaction?: WalletTransaction;
}
export interface AomiChatEventListeners {
    onReady?: () => void;
    onMessage?: (_message: ChatMessage) => void;
    onTransactionRequest?: (_transaction: WalletTransaction) => void;
    onError?: (_error: WidgetError) => void;
    onSessionStart?: (_sessionId: string) => void;
    onSessionEnd?: (_sessionId: string) => void;
    onNetworkChange?: (_chainId: SupportedChainId) => void;
    onWalletConnect?: (_address: string) => void;
    onWalletDisconnect?: () => void;
}
export interface AomiChatWidgetHandler {
    sendMessage: (message: string) => Promise<void>;
    updateParams: (params: Partial<AomiChatWidgetParams>) => void;
    updateProvider: (provider?: EthereumProvider) => void;
    destroy: () => void;
    getState: () => ChatState;
    getSessionId: () => string;
    isReady: () => boolean;
    on: <K extends keyof AomiChatEventListeners>(event: K, listener: NonNullable<AomiChatEventListeners[K]>) => AomiChatWidgetHandler;
    off: <K extends keyof AomiChatEventListeners>(event: K, listener: NonNullable<AomiChatEventListeners[K]>) => AomiChatWidgetHandler;
    clearChat: () => void;
    exportChat: () => ChatMessage[];
    resize: (width?: string, height?: string) => void;
    focus: () => void;
}
export interface JsonRpcRequest {
    id: number;
    method: string;
    params: unknown[];
}
export interface EthereumProvider {
    request<T>(params: JsonRpcRequest): Promise<T>;
    on(event: string, handler: (...args: unknown[]) => void): void;
    removeListener?(event: string, handler: (...args: unknown[]) => void): void;
    isMetaMask?: boolean;
    isWalletConnect?: boolean;
}
export interface WidgetConfig {
    params: AomiChatWidgetParams;
    provider?: EthereumProvider;
    listeners?: AomiChatEventListeners;
}
export interface ChatManagerConfig {
    backendUrl: string;
    sessionId: string;
    maxMessageLength?: number;
    reconnectAttempts?: number;
    reconnectDelay?: number;
}
//# sourceMappingURL=interfaces.d.ts.map