import type { AomiChatError } from './errors';

// Core type definitions for Aomi Chat Widget

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

export enum InteractionMode {
  CHAT = 'chat',
  ONCHAIN = 'onchain',
}

export enum WidgetRenderSurface {
  INLINE = 'inline',
  IFRAME = 'iframe',
}

export type PerChainConfig<T> = Partial<Record<SupportedChainId, T>>;
export type PerInteractionModeConfig<T> = Partial<Record<InteractionMode, T>>;

export type FlexibleConfig<T> =
  | T
  | PerChainConfig<T>
  | PerInteractionModeConfig<T>
  | PerChainConfig<PerInteractionModeConfig<T>>
  | PerInteractionModeConfig<PerChainConfig<T>>;

export type FlexibleValue<T> = FlexibleConfig<T> | undefined;

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

export interface AomiWidgetImages {
  emptyState?: string | null;
  avatarAssistant?: string | null;
}

export interface AomiWidgetSounds {
  message?: string | null;
  notification?: string | null;
  transaction?: string | null;
}

export interface AomiChatContentConfig {
  welcomeTitle?: FlexibleConfig<string>;
  assistantName?: FlexibleConfig<string>;
  emptyStateMessage?: FlexibleConfig<string>;
}

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
  width?: FlexibleConfig<string>;
  height?: FlexibleConfig<string>;
  maxHeight?: FlexibleConfig<number>;
  baseUrl?: string;
  sessionId?: string;
  interactionMode?: InteractionMode;
  renderSurface?: WidgetRenderSurface;

  // UI Customization
  welcomeMessage?: FlexibleConfig<string>;
  placeholder?: FlexibleConfig<string>;

  // Network Configuration
  chainId?: SupportedChainId;
  supportedChains?: SupportedChainId[];

  // Content Customization
  content?: AomiChatContentConfig;
  theme?: FlexibleConfig<AomiWidgetThemeConfig>;
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

export interface WidgetResolutionContext {
  chainId?: SupportedChainId;
  mode?: InteractionMode;
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

export enum ReadinessPhase {
  INITIALIZING = 'initializing',
  CONNECTING_MCP = 'connecting_mcp',
  VALIDATING_ANTHROPIC = 'validating_anthropic',
  READY = 'ready',
  MISSING_API_KEY = 'missing_api_key',
  ERROR = 'error'
}

export interface BackendReadiness {
  phase: ReadinessPhase;
  detail?: string;
  retryCount?: number;
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
  readiness: BackendReadiness;
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
  onError?: (_error: AomiChatError) => void;
  onSessionStart?: (_sessionId: string) => void;
  onSessionEnd?: (_sessionId: string) => void;
  onNetworkChange?: (_chainId: SupportedChainId) => void;
  onWalletConnect?: (_address: string) => void;
  onWalletDisconnect?: () => void;
  onTypingChange?: (_isTyping: boolean) => void;
  onProcessingChange?: (_isProcessing: boolean) => void;
  onConnectionChange?: (_status: ConnectionStatus) => void;
  onResize?: (_dimensions: { width: number; height: number }) => void;
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
