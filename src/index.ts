// Main entry point for the Aomi Chat Widget Library

import { createAomiChatWidget } from './core/AomiChatWidget';
import {
  SUPPORTED_CHAINS,
  PREDEFINED_THEMES,
  ERROR_CODES,
  WIDGET_EVENTS,
} from './types/constants';

// Core widget factory
export { createAomiChatWidget };

// Core managers
export { ChatManager } from './core/ChatManager';
export { ThemeManager, createThemeManager, getAvailableThemes, validateCustomPalette, createCustomPalette } from './core/ThemeManager';
export { WalletManager, createWalletManager, isValidProvider, detectWallets } from './core/WalletManager';

// Types
export type {
  // Main widget types
  AomiChatWidgetParams,
  AomiChatWidgetHandler,
  WidgetConfig,
  AomiChatEventListeners,

  // Chat types
  ChatMessage,
  ChatState,
  WalletTransaction,
  WalletState,
  ToolStreamUpdate,

  // Configuration types
  AomiChatMode,
  AomiChatTheme,
  AomiChatWidgetPalette,
  AomiChatWidgetPaletteColors,
  FlexibleConfig,
  SupportedChainId,

  // Network and provider types
  EthereumProvider,
  JsonRpcRequest,

  // State types
  ConnectionStatus,
  BackendReadiness,
  ReadinessPhase,


  // Theme types
  ThemeDefinition,

  // Component types (for React usage)
  ChatInterfaceProps,
  MessageListProps,
  MessageInputProps,
  WalletStatusProps,
  TypingIndicatorProps,

  // Utility types
  DeepPartial,
  RequiredKeys,
  OptionalKeys,
} from './types';

// Error classes
export {
  type AomiChatError,
  ConfigurationError,
  ConnectionError,
  WalletError,
  TransactionError,
  ChatError,
  RateLimitError,
  SessionError,
  createConfigurationError,
  createConnectionError,
  createWalletError,
  createTransactionError,
  createChatError,
  createRateLimitError,
  createSessionError,
  isAomiChatError,
  isConfigurationError,
  isConnectionError,
  isWalletError,
  isTransactionError,
  isChatError,
  isRateLimitError,
  isSessionError,
} from './types/errors';

// Constants
export {
  // Widget defaults
  DEFAULT_WIDGET_WIDTH,
  DEFAULT_WIDGET_HEIGHT,
  DEFAULT_MAX_HEIGHT,
  DEFAULT_MESSAGE_LENGTH,
  DEFAULT_RECONNECT_ATTEMPTS,
  DEFAULT_RECONNECT_DELAY,

  // Network constants
  SUPPORTED_CHAINS,
  DEFAULT_CHAIN_ID,

  // Theme constants
  THEME_PALETTES,
  PREDEFINED_THEMES,

  // Error codes
  ERROR_CODES,

  // Event names
  WIDGET_EVENTS,

  // CSS classes
  CSS_CLASSES,

  // API endpoints
  API_ENDPOINTS,

  // Timing constants
  TIMING,
} from './types/constants';

// Utilities
export {
  // Configuration utilities
  resolveFlexibleConfig,
  validateWidgetParams,

  // Session utilities
  generateSessionId,
  isValidSessionId,

  // URL utilities
  buildWidgetUrl,
  parseWidgetParams,

  // DOM utilities
  createElement,
  isElementVisible,

  // Type guards
  isEthereumAddress,
  isTransactionHash,
  hasProperty,

  // Async utilities
  delay,
  withTimeout,
  retry,

  // Environment utilities
  isBrowser,
  isMobile,
  getViewportDimensions,

  // Formatting utilities
  formatTimestamp,
  truncateAddress,
  formatNumber,
} from './utils';

// Package version (this would be set during build)
export const VERSION = '0.1.0';

// Import necessary types for the convenience function
import type {
  AomiChatTheme,
  AomiChatWidgetPalette,
  EthereumProvider,
  ChatMessage,
  AomiChatError,
  AomiChatWidgetHandler,
  WidgetConfig,
} from './types';
import { createConfigurationError } from './types/errors';

// Simple convenience function for basic usage
export function createChatWidget(
  containerId: string | HTMLElement,
  options: {
    appCode: string;
    theme?: AomiChatTheme | AomiChatWidgetPalette;
    width?: string;
    height?: string;
    baseUrl?: string;
    provider?: EthereumProvider;
    onReady?: () => void;
    onMessage?: (message: ChatMessage) => void;
    onError?: (error: AomiChatError) => void;
  },
): AomiChatWidgetHandler {
  // Get container element
  const container = typeof containerId === 'string'
    ? document.getElementById(containerId)
    : containerId;

  if (!container) {
    throw createConfigurationError(
      typeof containerId === 'string'
        ? `Element with id "${containerId}" not found`
        : 'Invalid container element',
    );
  }

  // Create widget configuration
  const config: WidgetConfig = {
    params: {
      appCode: options.appCode,
      theme: options.theme,
      width: options.width,
      height: options.height,
      baseUrl: options.baseUrl,
    },
    provider: options.provider,
    listeners: {
      onReady: options.onReady,
      onMessage: options.onMessage,
      onError: options.onError,
    },
  };

  return createAomiChatWidget(container, config);
}

// Default export for convenience
export default {
  createChatWidget,
  createAomiChatWidget,
  VERSION,
  SUPPORTED_CHAINS,
  PREDEFINED_THEMES,
  ERROR_CODES,
  WIDGET_EVENTS,
};
