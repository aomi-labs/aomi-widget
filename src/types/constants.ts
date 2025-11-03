// Constants for the Aomi Chat Widget

import type { AomiChatWidgetPaletteColors, SupportedChainId, ThemeDefinition } from './index';

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

/*
 * ============================================================================
 * NETWORK CONSTANTS
 * ============================================================================
 */

export const SUPPORTED_CHAINS: Record<SupportedChainId, string> = {
  1: 'Ethereum',
  5: 'Goerli',
  10: 'Optimism',
  100: 'Gnosis',
  1337: 'Localhost',
  31337: 'Anvil',
  137: 'Polygon',
  42161: 'Arbitrum One',
  59140: 'Linea Sepolia',
  59144: 'Linea',
  8453: 'Base',
  11155111: 'Sepolia',
} as const;

export const DEFAULT_CHAIN_ID: SupportedChainId = 1;

/*
 * ============================================================================
 * THEME PALETTES
 * ============================================================================
 */

export const THEME_PALETTES: Record<string, AomiChatWidgetPaletteColors> = {
  light: {
    primary: '#007bff',
    background: '#ffffff',
    surface: '#f8f9fa',
    text: '#212529',
    textSecondary: '#6c757d',
    border: '#dee2e6',
    success: '#28a745',
    error: '#dc3545',
    warning: '#ffc107',
    accent: '#6f42c1',
  },

  dark: {
    primary: '#0d6efd',
    background: '#121212',
    surface: '#1e1e1e',
    text: '#ffffff',
    textSecondary: '#b3b3b3',
    border: '#404040',
    success: '#00d26a',
    error: '#ff4757',
    warning: '#ffa500',
    accent: '#8b5cf6',
  },

  terminal: {
    primary: '#00ff00',
    background: '#0a0a0a',
    surface: '#161b22',
    text: '#00ff00',
    textSecondary: '#22c55e',
    border: '#30363d',
    success: '#00ff88',
    error: '#ff5555',
    warning: '#ffff55',
    accent: '#ff00ff',
  },

  neon: {
    primary: '#ff007f',
    background: '#0d0015',
    surface: '#1a0033',
    text: '#ffffff',
    textSecondary: '#cc99ff',
    border: '#4a0066',
    success: '#00ffaa',
    error: '#ff3366',
    warning: '#ffaa00',
    accent: '#00aaff',
  },

  minimal: {
    primary: '#000000',
    background: '#ffffff',
    surface: '#fafafa',
    text: '#333333',
    textSecondary: '#888888',
    border: '#e0e0e0',
    success: '#4caf50',
    error: '#f44336',
    warning: '#ff9800',
    accent: '#9c27b0',
  },
} as const;

/*
 * ============================================================================
 * COMPLETE THEME DEFINITIONS
 * ============================================================================
 */

export const PREDEFINED_THEMES: Record<string, ThemeDefinition> = {
  light: {
    name: 'Light',
    palette: THEME_PALETTES.light,
    fonts: {
      primary: '"Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
      monospace: '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace',
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '32px',
    },
    borderRadius: {
      sm: '4px',
      md: '8px',
      lg: '12px',
    },
    shadows: {
      sm: '0 1px 3px rgba(0, 0, 0, 0.1)',
      md: '0 4px 12px rgba(0, 0, 0, 0.15)',
      lg: '0 8px 24px rgba(0, 0, 0, 0.2)',
    },
  },

  dark: {
    name: 'Dark',
    palette: THEME_PALETTES.dark,
    fonts: {
      primary: '"Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
      monospace: '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace',
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '32px',
    },
    borderRadius: {
      sm: '4px',
      md: '8px',
      lg: '12px',
    },
    shadows: {
      sm: '0 1px 3px rgba(0, 0, 0, 0.3)',
      md: '0 4px 12px rgba(0, 0, 0, 0.4)',
      lg: '0 8px 24px rgba(0, 0, 0, 0.5)',
    },
  },

  terminal: {
    name: 'Terminal',
    palette: THEME_PALETTES.terminal,
    fonts: {
      primary: '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace',
      monospace: '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace',
    },
    spacing: {
      xs: '2px',
      sm: '4px',
      md: '8px',
      lg: '16px',
      xl: '24px',
    },
    borderRadius: {
      sm: '0px',
      md: '2px',
      lg: '4px',
    },
    shadows: {
      sm: '0 0 8px rgba(0, 255, 0, 0.3)',
      md: '0 0 16px rgba(0, 255, 0, 0.5)',
      lg: '0 0 24px rgba(0, 255, 0, 0.7)',
    },
  },

  neon: {
    name: 'Neon',
    palette: THEME_PALETTES.neon,
    fonts: {
      primary: '"Orbitron", "Rajdhani", "Exo 2", sans-serif',
      monospace: '"Share Tech Mono", "Courier New", monospace',
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '32px',
    },
    borderRadius: {
      sm: '2px',
      md: '6px',
      lg: '10px',
    },
    shadows: {
      sm: '0 0 8px rgba(255, 0, 127, 0.4)',
      md: '0 0 16px rgba(255, 0, 127, 0.6)',
      lg: '0 0 24px rgba(255, 0, 127, 0.8)',
    },
  },

  minimal: {
    name: 'Minimal',
    palette: THEME_PALETTES.minimal,
    fonts: {
      primary: '"Inter", "Helvetica Neue", Arial, sans-serif',
      monospace: '"JetBrains Mono", "SF Mono", monospace',
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '32px',
    },
    borderRadius: {
      sm: '2px',
      md: '4px',
      lg: '6px',
    },
    shadows: {
      sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
      md: '0 2px 8px rgba(0, 0, 0, 0.1)',
      lg: '0 4px 16px rgba(0, 0, 0, 0.15)',
    },
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
  INVALID_THEME: 'INVALID_THEME',
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
  TYPING_CHANGE: 'typingChange',
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

  // Theme classes
  THEME_LIGHT: 'aomi-theme-light',
  THEME_DARK: 'aomi-theme-dark',
  THEME_TERMINAL: 'aomi-theme-terminal',
  THEME_NEON: 'aomi-theme-neon',
  THEME_MINIMAL: 'aomi-theme-minimal',

  // Mode classes
  MODE_FULL: 'aomi-mode-full',
  MODE_MINIMAL: 'aomi-mode-minimal',
  MODE_COMPACT: 'aomi-mode-compact',
  MODE_TERMINAL: 'aomi-mode-terminal',

  // Component classes
  CHAT_INTERFACE: 'aomi-chat-interface',
  CHAT_HEADER: 'aomi-chat-header',
  CHAT_TITLE: 'aomi-chat-title',
  CHAT_BODY: 'aomi-chat-body',
  STATUS_BADGE: 'aomi-status-badge',
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
  TYPING_INDICATOR: 'aomi-typing-indicator',

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
  TYPING_INDICATOR_DELAY: 100,
  MESSAGE_ANIMATION_DURATION: 300,
  CONNECTION_TIMEOUT: 10000,
  RETRY_DELAY: 1000,
  HEARTBEAT_INTERVAL: 30000,
  SESSION_TIMEOUT: 3600000, // 1 hour
} as const;
