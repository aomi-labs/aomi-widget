// Main entry point for the Aomi Chat Widget Library

import { createAomiChatWidget } from './core/AomiChatWidget';
import {
  SUPPORTED_CHAINS,
  ERROR_CODES,
  WIDGET_EVENTS,
} from './types/constants';

// Core widget factory
export { createAomiChatWidget };

// Core managers
export { ChatManager } from './core/ChatManager';
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
  SupportedChainId,

  // Network and provider types
  EthereumProvider,
  JsonRpcRequest,
  ConnectionStatus,
} from './types/interfaces';

// Error classes
export {
  type WidgetError,
  createWidgetError,
} from './types/interfaces';

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
} from './utils/base';
export { resolveWidgetParams } from './utils/widgetParams';
export {
  AomiChatWidget as ReactAomiChatWidget,
  type ReactAomiChatWidgetProps,
} from './react/AomiChatWidget';

// Package version (this would be set during build)
export const VERSION = '0.1.0';

// Import necessary types for the convenience function
import type {
  EthereumProvider,
  ChatMessage,
  AomiChatWidgetHandler,
  WidgetConfig,
} from './types/interfaces';
import type { WidgetError } from './types/interfaces';

// Simple convenience function for basic usage
export function createChatWidget(
  containerId: string | HTMLElement,
  options: {
    appCode: string;
    width?: string;
    height?: string;
    baseUrl?: string;
    provider?: EthereumProvider;
    onReady?: () => void;
    onMessage?: (_message: ChatMessage) => void;
    onError?: (_error: WidgetError | Error) => void;
  },
): AomiChatWidgetHandler {
  // Get container element
  const container = typeof containerId === 'string'
    ? document.getElementById(containerId)
    : containerId;

  if (!container) {
    throw new Error(
      typeof containerId === 'string'
        ? `Element with id "${containerId}" not found`
        : 'Invalid container element',
    );
  }

  // Create widget configuration
  const config: WidgetConfig = {
    params: {
      appCode: options.appCode,
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
  ERROR_CODES,
  WIDGET_EVENTS,
};
