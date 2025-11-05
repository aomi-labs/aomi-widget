// Core type definitions for Aomi Chat Widget

/*
 * ============================================================================
 * CORE WIDGET TYPES
 * ============================================================================
 */

export type SupportedChainId = 1 | 5 | 11155111 | 100 | 137 | 42161 | 8453 | 10;

export type PerNetworkConfig<T> = Partial<Record<SupportedChainId, T>>;
export type PerModeConfig<T> = Partial<Record<AomiChatMode, T>>;

export type FlexibleConfig<T> =
  | T
  | PerNetworkConfig<T>
  | PerModeConfig<T>
  | PerModeConfig<PerNetworkConfig<T>>
  | PerNetworkConfig<PerModeConfig<T>>;

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
 * CONFIGURATION TYPES
 * ============================================================================
 */

export type AomiChatMode = 'full' | 'minimal' | 'compact' | 'terminal';
export type AomiChatTheme = 'light' | 'dark' | 'terminal' | 'neon' | 'minimal';

export interface AomiChatWidgetPaletteColors {
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

export interface AomiChatWidgetPalette extends AomiChatWidgetPaletteColors {
  baseTheme: AomiChatTheme;
}

export interface RateLimitConfig {
  maxMessages?: number;
  windowMs?: number;
  skipWhenConnected?: boolean;
}

export interface AnalyticsConfig {
  trackEvents?: boolean;
  customId?: string;
  excludeContent?: boolean;
}

export interface ChatCommand {
  command: string;
  description: string;
  handler: (_args: string[]) => Promise<void> | void;
}

/*
 * ============================================================================
 * MAIN WIDGET CONFIGURATION
 * ============================================================================
 */

export interface AomiChatWidgetParams {
  // Required
  appCode: string;

  // Core Configuration
  width?: string;
  height?: string;
  maxHeight?: number;
  baseUrl?: string;
  sessionId?: string;

  // UI Customization
  theme?: AomiChatTheme | AomiChatWidgetPalette;
  mode?: AomiChatMode;
  welcomeMessage?: string;
  placeholder?: string;
  showWalletStatus?: boolean;
  showNetworkSelector?: boolean;
  hideHeader?: boolean;
  hideFooter?: boolean;

  // Network Configuration
  chainId?: SupportedChainId;
  supportedChains?: SupportedChainId[];

  // Behavioral Settings
  enableTransactions?: boolean;
  requireWalletConnection?: boolean;
  sessionPersistence?: boolean;
  autoConnect?: boolean;
  standaloneMode?: boolean;

  // Advanced Features
  customCommands?: ChatCommand[];
  rateLimiting?: FlexibleConfig<RateLimitConfig>;

  // Integration Settings
  apiKey?: string;
  webhookUrl?: string;
  analytics?: AnalyticsConfig;

  // Sounds and Media
  sounds?: {
    messageReceived?: string | null;
    messageSent?: string | null;
    transactionSuccess?: string | null;
    transactionError?: string | null;
  };

  // Content Customization
  content?: {
    welcomeTitle?: string;
    connectWalletText?: string;
    disconnectText?: string;
    networkSwitchText?: string;
    errorMessages?: Record<string, string>;
  };
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

export interface AomiChatError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: Date;
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

export interface BackendApiConfig {
  baseUrl: string;
  sessionId: string;
  timeout?: number;
  retryAttempts?: number;
}

export interface ChatManagerConfig {
  backendUrl: string;
  sessionId: string;
  maxMessageLength?: number;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

/*
 * ============================================================================
 * COMPONENT PROPS (for React components)
 * ============================================================================
 */

export interface ChatInterfaceProps {
  messages: ChatMessage[];
  isTyping: boolean;
  isProcessing: boolean;
  onSendMessage: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export interface MessageListProps {
  messages: ChatMessage[];
  isTyping: boolean;
  className?: string;
}

export interface MessageInputProps {
  onSendMessage: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  className?: string;
}

export interface WalletStatusProps {
  walletState: WalletState;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onNetworkSwitch?: (chainId: SupportedChainId) => void;
  showNetworkSelector?: boolean;
  className?: string;
}

export interface TypingIndicatorProps {
  isTyping: boolean;
  className?: string;
}

/*
 * ============================================================================
 * THEME TYPES
 * ============================================================================
 */

export interface ThemeDefinition {
  name: string;
  palette: AomiChatWidgetPaletteColors;
  fonts?: {
    primary?: string;
    monospace?: string;
  };
  spacing?: {
    xs?: string;
    sm?: string;
    md?: string;
    lg?: string;
    xl?: string;
  };
  borderRadius?: {
    sm?: string;
    md?: string;
    lg?: string;
  };
  shadows?: {
    sm?: string;
    md?: string;
    lg?: string;
  };
}

/*
 * ============================================================================
 * UTILITY TYPES
 * ============================================================================
 */

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/*
 * ============================================================================
 * EXPORTS
 * ============================================================================
 */

export * from './constants';
export * from './errors';
