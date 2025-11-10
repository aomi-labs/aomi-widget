import { ERROR_CODES } from './constants';

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

export enum SurfaceMode {
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

export interface AomiWidgetThemeDefinition {
  palette: AomiWidgetPalette;
  fonts: AomiWidgetFonts;
}

export interface AomiWidgetThemeConfig {
  palette?: Partial<AomiWidgetPalette>;
  fonts?: Partial<AomiWidgetFonts>;
}

export interface OptionalParam {
  // Required
  appCode: string;

  // Core Configuration
  width?: string;
  height?: string;
  maxHeight?: number;
  baseUrl?: string;
  sessionId?: string;
  surfaceMode?: SurfaceMode;

  // UI Customization
  welcomeMessage?: string;
  placeholder?: string;
  title?: string;
  emptyStateMessage?: string;

  // Network Configuration
  chainId?: SupportedChainId;
  supportedChains?: SupportedChainId[];

  // Content Customization
  theme?: AomiWidgetThemeConfig;
}

export interface ResolvedParams {
  appCode: string;
  width: string;
  height: string;
  maxHeight: number;
  baseUrl?: string;
  sessionId?: string;
  renderSurface: SurfaceMode;
  welcomeMessage?: string;
  placeholder?: string;
  chainId?: SupportedChainId;
  supportedChains?: SupportedChainId[];
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

export interface ChatState {
  messages: ChatMessage[];
  isProcessing: boolean;
  connectionStatus: ConnectionStatus;
  sessionId: string;
  pendingTransaction?: WalletTransaction;
}

/*
 * ============================================================================
 * EVENT TYPES
 * ============================================================================
 */

export interface AomiEventListeners {
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

/*
 * ============================================================================
 * WIDGET HANDLER INTERFACE
 * ============================================================================
 */

export interface AomiWidgetHandler {
  // Core methods
  sendMessage: (message: string) => Promise<void>;
  updateParams: (params: Partial<OptionalParam>) => void;
  updateProvider: (provider?: EthereumProvider) => void;
  destroy: () => void;

  // State getters
  getState: () => ChatState;
  getSessionId: () => string;
  isReady: () => boolean;

  // Event handling
  on: <K extends keyof AomiEventListeners>(
    event: K,
    listener: NonNullable<AomiEventListeners[K]>
  ) => AomiWidgetHandler;
  off: <K extends keyof AomiEventListeners>(
    event: K,
    listener: NonNullable<AomiEventListeners[K]>
  ) => AomiWidgetHandler;

  // Utility methods
  clearChat: () => void;
  exportChat: () => ChatMessage[];
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
  params: OptionalParam;
  provider?: EthereumProvider;
  listeners?: AomiEventListeners;
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
 * WIDGET ERROR TYPES
 * ============================================================================
 */

export type WidgetErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export interface WidgetError extends Error {
  code: WidgetErrorCode;
  details?: unknown;
}

export function createWidgetError(
  code: WidgetErrorCode,
  message: string,
  details?: unknown,
): WidgetError {
  const error = new Error(message) as WidgetError;
  error.name = `WidgetError(${code})`;
  error.code = code;
  error.details = details;
  return error;
}
