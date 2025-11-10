// Constants for the Aomi Chat Widget

import {
  WidgetRenderSurface,
  type AomiWidgetThemeDefinition,
  type SupportedChainId,
} from './interfaces';

/*
 * ============================================================================
 * WIDGET DEFAULTS
 * ============================================================================
 */

export const DEFAULT_WIDGET_WIDTH = '400px';
export const DEFAULT_WIDGET_HEIGHT = '600px';
export const DEFAULT_MAX_HEIGHT = 800;
export const DEFAULT_MESSAGE_LENGTH = 2000;
export const DEFAULT_RECONNECT_ATTEMPTS = 5;
export const DEFAULT_RECONNECT_DELAY = 3000;
export const DEFAULT_RENDER_SURFACE = WidgetRenderSurface.IFRAME;

/*
 * ============================================================================
 * NETWORK CONSTANTS
 * ============================================================================
 */

export const SUPPORTED_CHAINS: Record<SupportedChainId, string> = {
  1: 'Ethereum',
  5: 'Goerli',
  11155111: 'Sepolia',
  100: 'Gnosis',
  137: 'Polygon',
  42161: 'Arbitrum One',
  8453: 'Base',
  10: 'Optimism',
  1337: 'Localhost',
  31337: 'Anvil',
  59140: 'Linea Sepolia',
  59144: 'Linea',
} as const;

export const DEFAULT_CHAIN_ID: SupportedChainId = 1;

export const DEFAULT_WIDGET_THEME: AomiWidgetThemeDefinition = {
  palette: {
    primary: '#111827',
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#0f172a',
    textSecondary: '#475569',
    border: '#e2e8f0',
    success: '#059669',
    error: '#dc2626',
    warning: '#f97316',
    accent: '#2563eb',
  },
  fonts: {
    primary: '"Inter", "Helvetica Neue", Arial, sans-serif',
    monospace: '"JetBrains Mono", "SF Mono", monospace',
  },
} as const;


/*
 * ============================================================================
 * ERROR CODES
 * ============================================================================
 */

export const ERROR_CODES = {
  // Configuration errors
  INVALID_CONFIG: 'INVALID_CONFIG',
  MISSING_APP_CODE: 'MISSING_APP_CODE',
  INVALID_DIMENSIONS: 'INVALID_DIMENSIONS',

  // Connection errors
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  CONNECTION_TIMEOUT: 'CONNECTION_TIMEOUT',
  BACKEND_UNAVAILABLE: 'BACKEND_UNAVAILABLE',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',

  // Wallet errors
  WALLET_NOT_CONNECTED: 'WALLET_NOT_CONNECTED',
  WALLET_CONNECTION_FAILED: 'WALLET_CONNECTION_FAILED',
  UNSUPPORTED_NETWORK: 'UNSUPPORTED_NETWORK',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  TRANSACTION_REJECTED: 'TRANSACTION_REJECTED',

  // Chat errors
  MESSAGE_TOO_LONG: 'MESSAGE_TOO_LONG',
  RATE_LIMITED: 'RATE_LIMITED',
  INVALID_MESSAGE: 'INVALID_MESSAGE',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // General errors
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  INITIALIZATION_FAILED: 'INITIALIZATION_FAILED',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
} as const;

/*
 * ============================================================================
 * EVENT NAMES
 * ============================================================================
 */

export const WIDGET_EVENTS = {
  // Widget lifecycle
  READY: 'ready',
  DESTROY: 'destroy',
  RESIZE: 'resize',

  // Chat events
  MESSAGE: 'message',
  PROCESSING_CHANGE: 'processingChange',

  // Connection events
  CONNECTION_CHANGE: 'connectionChange',
  SESSION_START: 'sessionStart',
  SESSION_END: 'sessionEnd',

  // Wallet events
  WALLET_CONNECT: 'walletConnect',
  WALLET_DISCONNECT: 'walletDisconnect',
  NETWORK_CHANGE: 'networkChange',
  TRANSACTION_REQUEST: 'transactionRequest',

  // Error events
  ERROR: 'error',
} as const;

/*
 * ============================================================================
 * CSS CLASS NAMES
 * ============================================================================
 */

export const CSS_CLASSES = {
  // Root classes
  WIDGET_ROOT: 'aomi-chat-widget',
  WIDGET_CONTAINER: 'aomi-chat-container',
  WIDGET_IFRAME: 'aomi-chat-iframe',

  // Component classes
  CHAT_INTERFACE: 'aomi-chat-interface',
  CHAT_HEADER: 'aomi-chat-header',
  CHAT_TITLE: 'aomi-chat-title',
  CHAT_BODY: 'aomi-chat-body',
  MESSAGE_LIST: 'aomi-message-list',
  MESSAGE_CONTAINER: 'aomi-message-container',
  MESSAGE_BUBBLE: 'aomi-message',
  MESSAGE_USER: 'aomi-message-user',
  MESSAGE_ASSISTANT: 'aomi-message-assistant',
  MESSAGE_SYSTEM: 'aomi-message-system',
  ACTION_BAR: 'aomi-action-bar',
  MESSAGE_INPUT: 'aomi-message-input',
  INPUT_FORM: 'aomi-chat-input-form',
  INPUT_FIELD: 'aomi-chat-input-field',
  SEND_BUTTON: 'aomi-chat-send-button',
  WALLET_STATUS: 'aomi-wallet-status',

  // State classes
  LOADING: 'aomi-loading',
  ERROR: 'aomi-error',
  DISABLED: 'aomi-disabled',
  CONNECTED: 'aomi-connected',
  DISCONNECTED: 'aomi-disconnected',
} as const;

/*
 * ============================================================================
 * API ENDPOINTS
 * ============================================================================
 */

export const API_ENDPOINTS = {
  CHAT: '/api/chat',
  CHAT_STREAM: '/api/chat/stream',
  STATE: '/api/state',
  INTERRUPT: '/api/interrupt',
  SYSTEM: '/api/system',
  MCP_COMMAND: '/api/mcp-command',
  HEALTH: '/health',
} as const;

/*
 * ============================================================================
 * TIMING CONSTANTS
 * ============================================================================
 */

export const TIMING = {
  MESSAGE_ANIMATION_DURATION: 300,
  CONNECTION_TIMEOUT: 10000,
  RETRY_DELAY: 1000,
  HEARTBEAT_INTERVAL: 30000,
  SESSION_TIMEOUT: 3600000, // 1 hour
} as const;
