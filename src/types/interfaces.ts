import type { WidgetError } from './errors';

/*
 * ============================================================================
 * CORE WIDGET TYPES
 * ============================================================================
 */

export type SupportedChainId =
  | 1
  | 5
  | 10
  | 100
  | 137
  | 42161
  | 8453
  | 11155111
  | 1337
  | 31337
  | 59140
  | 59144;

/*
 * ============================================================================
 * CHAT MESSAGE TYPES
 * ============================================================================
 */

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

/*
 * ============================================================================
 * MAIN WIDGET CONFIGURATION
 * ============================================================================
 */

// 删
export enum InteractionMode {
  CHAT = 'chat',
  ONCHAIN = 'onchain',
}

export enum WidgetRenderSurface {
  INLINE = 'inline',
  IFRAME = 'iframe',
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

// 删
export interface AomiWidgetImages {
  emptyState?: string | null;
  avatarAssistant?: string | null;
}

// 删
export interface AomiWidgetSounds {
  message?: string | null;
  notification?: string | null;
  transaction?: string | null;
}

// 删
export interface AomiChatContentConfig {
  welcomeTitle?: string;
  assistantName?: string;
  emptyStateMessage?: string;
}

// 删
export interface AomiChatContentResolved {
  welcomeTitle: string;
  assistantName: string;
  emptyStateMessage: string;
}

export interface AomiWidgetThemeDefinition {
  palette: AomiWidgetPalette;
  fonts: AomiWidgetFonts;
  images: AomiWidgetImages;
  sounds: AomiWidgetSounds;
  content: AomiChatContentResolved;
}

export interface AomiWidgetThemeConfig {
  palette?: Partial<AomiWidgetPalette>;
  fonts?: Partial<AomiWidgetFonts>;
  images?: Partial<AomiWidgetImages>;
  sounds?: Partial<AomiWidgetSounds>;
  content?: Partial<AomiChatContentConfig>;
}

export interface AomiChatWidgetParams {
  // Required
  appCode: string;

  // Core Configuration
  width?: string;
  height?: string;
  maxHeight?: number;
  baseUrl?: string;
  sessionId?: string;
  interactionMode?: InteractionMode;
  renderSurface?: WidgetRenderSurface;

  // UI Customization
  welcomeMessage?: string;
  placeholder?: string;

  // Network Configuration
  chainId?: SupportedChainId;
  supportedChains?: SupportedChainId[];

  // Content Customization
  content?: AomiChatContentConfig;
  theme?: AomiWidgetThemeConfig;
}

export interface ResolvedAomiChatWidgetParams {
  appCode: string;
  width: string;
  height: string;
  maxHeight: number;
  baseUrl?: string;
  sessionId?: string;
  interactionMode: InteractionMode;
  renderSurface: WidgetRenderSurface;
  welcomeMessage?: string;
  placeholder?: string;
  chainId?: SupportedChainId;
  supportedChains?: SupportedChainId[];
  content: AomiChatContentResolved;
  theme: AomiWidgetThemeDefinition;
}

/*
 * ============================================================================
 * WIDGET STATE TYPES
 * ============================================================================
 */

export enum ConnectionStatus {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
  RECONNECTING = 'reconnecting'
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

/*
 * ============================================================================
 * EVENT TYPES
 * ============================================================================
 */

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
  onTypingChange?: (_isTyping: boolean) => void; // 删
  onProcessingChange?: (_isProcessing: boolean) => void; // 删
  onConnectionChange?: (_status: ConnectionStatus) => void;  // 删
  onResize?: (_dimensions: { width: number; height: number }) => void; // 删
}

/*
 * ============================================================================
 * WIDGET HANDLER INTERFACE
 * ============================================================================
 */

export interface AomiChatWidgetHandler {
  // Core methods
  sendMessage: (message: string) => Promise<void>;
  updateParams: (params: Partial<AomiChatWidgetParams>) => void;
  updateProvider: (provider?: EthereumProvider) => void;
  destroy: () => void;

  // State getters
  getState: () => ChatState;
  getSessionId: () => string;
  isReady: () => boolean;

  // Event handling
  on: <K extends keyof AomiChatEventListeners>(
    event: K,
    listener: NonNullable<AomiChatEventListeners[K]>
  ) => AomiChatWidgetHandler;
  off: <K extends keyof AomiChatEventListeners>(
    event: K,
    listener: NonNullable<AomiChatEventListeners[K]>
  ) => AomiChatWidgetHandler;

  // Utility methods
  clearChat: () => void;
  exportChat: () => ChatMessage[];
  resize: (width?: string, height?: string) => void;
  focus: () => void;
}

/*
 * ============================================================================
 * ETHEREUM PROVIDER TYPES
 * ============================================================================
 */

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

/*
 * ============================================================================
 * INTERNAL TYPES
 * ============================================================================
 */

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
