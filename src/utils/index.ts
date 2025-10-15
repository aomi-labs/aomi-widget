// Utility functions for the Aomi Chat Widget

import type {
  AomiChatWidgetParams,
  FlexibleConfig,
  SupportedChainId,
  AomiChatMode,
  AomiChatTheme,
  AomiChatWidgetPalette,
} from '../types';
import { SUPPORTED_CHAINS, PREDEFINED_THEMES } from '../types/constants';

/*
 * ============================================================================
 * CONFIGURATION UTILITIES
 * ============================================================================
 */

/**
 * Resolves a flexible configuration value based on chain ID and mode
 */
export function resolveFlexibleConfig<T>(
  config: FlexibleConfig<T>,
  chainId: SupportedChainId,
  mode: AomiChatMode,
): T | undefined {
  // If it's a simple value, return it
  if (typeof config !== 'object' || config === null) {
    return config as T;
  }

  // Check if it's a per-mode configuration
  if (isPerModeConfig(config)) {
    const modeValue = config[mode];
    if (modeValue === undefined) {
      return undefined;
    }

    // If the mode value is itself a per-network config
    if (isPerNetworkConfig(modeValue)) {
      return modeValue[chainId];
    }

    return modeValue as T;
  }

  // Check if it's a per-network configuration
  if (isPerNetworkConfig(config)) {
    const networkValue = config[chainId];
    if (networkValue === undefined) {
      return undefined;
    }

    // If the network value is itself a per-mode config
    if (isPerModeConfig(networkValue)) {
      return networkValue[mode];
    }

    return networkValue as T;
  }

  return config as T;
}

function isPerModeConfig<T>(config: unknown): config is Partial<Record<AomiChatMode, T>> {
  if (typeof config !== 'object' || config === null) return false;

  const modes: AomiChatMode[] = ['full', 'minimal', 'compact', 'terminal'];
  const keys = Object.keys(config);

  return keys.length > 0 && keys.every(key => modes.includes(key as AomiChatMode));
}

function isPerNetworkConfig<T>(config: unknown): config is Partial<Record<SupportedChainId, T>> {
  if (typeof config !== 'object' || config === null) return false;

  const chainIds = Object.keys(SUPPORTED_CHAINS).map(id => parseInt(id) as SupportedChainId);
  const keys = Object.keys(config).map(key => parseInt(key));

  return keys.length > 0 && keys.every(key => chainIds.includes(key as SupportedChainId));
}

/*
 * ============================================================================
 * VALIDATION UTILITIES
 * ============================================================================
 */

/**
 * Validates widget configuration parameters
 */
export function validateWidgetParams(params: AomiChatWidgetParams): string[] {
  const errors: string[] = [];

  // Required fields
  if (!params.appCode || typeof params.appCode !== 'string') {
    errors.push('appCode is required and must be a string');
  }

  // Validate dimensions
  if (params.width && !isValidDimension(params.width)) {
    errors.push('width must be a valid CSS dimension (e.g., "400px", "100%")');
  }

  if (params.height && !isValidDimension(params.height)) {
    errors.push('height must be a valid CSS dimension (e.g., "600px", "100vh")');
  }

  if (params.maxHeight && (typeof params.maxHeight !== 'number' || params.maxHeight <= 0)) {
    errors.push('maxHeight must be a positive number');
  }

  // Validate chain ID
  if (params.chainId && !Object.keys(SUPPORTED_CHAINS).includes(params.chainId.toString())) {
    errors.push(`chainId must be one of: ${Object.keys(SUPPORTED_CHAINS).join(', ')}`);
  }

  // Validate supported chains
  if (params.supportedChains) {
    const invalidChains = params.supportedChains.filter(
      id => !Object.keys(SUPPORTED_CHAINS).includes(id.toString()),
    );
    if (invalidChains.length > 0) {
      errors.push(`supportedChains contains invalid chain IDs: ${invalidChains.join(', ')}`);
    }
  }

  // Validate theme
  if (params.theme && !isValidTheme(params.theme)) {
    errors.push('theme must be a valid theme name or theme palette object');
  }

  // Validate mode
  if (params.mode && !['full', 'minimal', 'compact', 'terminal'].includes(params.mode)) {
    errors.push('mode must be one of: full, minimal, compact, terminal');
  }

  return errors;
}

function isValidDimension(dimension: string): boolean {
  // Simple regex to validate CSS dimensions
  return /^(\d+(\.\d+)?(px|%|em|rem|vh|vw)|auto|inherit)$/.test(dimension);
}

function isValidTheme(theme: AomiChatTheme | AomiChatWidgetPalette): boolean {
  if (typeof theme === 'string') {
    return Object.keys(PREDEFINED_THEMES).includes(theme);
  }

  if (typeof theme === 'object' && theme !== null) {
    return 'baseTheme' in theme && typeof theme.baseTheme === 'string';
  }

  return false;
}

/*
 * ============================================================================
 * SESSION UTILITIES
 * ============================================================================
 */

/**
 * Generates a unique session ID
 */
export function generateSessionId(): string {
  // Use crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback UUID v4 implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Validates a session ID format
 */
export function isValidSessionId(sessionId: string): boolean {
  // UUID v4 format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(sessionId);
}

/*
 * ============================================================================
 * URL UTILITIES
 * ============================================================================
 */

/**
 * Builds widget URL with parameters
 */
export function buildWidgetUrl(baseUrl: string, params: AomiChatWidgetParams): string {
  const url = new URL('/widget', baseUrl);

  // Add essential parameters
  url.searchParams.set('appCode', params.appCode);

  if (params.sessionId) {
    url.searchParams.set('sessionId', params.sessionId);
  }

  if (params.theme) {
    if (typeof params.theme === 'string') {
      url.searchParams.set('theme', params.theme);
    } else {
      // For complex theme objects, encode as JSON
      url.searchParams.set('palette', JSON.stringify(params.theme));
    }
  }

  if (params.mode) {
    url.searchParams.set('mode', params.mode);
  }

  if (params.chainId) {
    url.searchParams.set('chainId', params.chainId.toString());
  }

  if (params.welcomeMessage) {
    url.searchParams.set('welcomeMessage', params.welcomeMessage);
  }

  if (params.placeholder) {
    url.searchParams.set('placeholder', params.placeholder);
  }

  // Boolean flags
  if (params.showWalletStatus === false) {
    url.searchParams.set('showWalletStatus', 'false');
  }

  if (params.showNetworkSelector === false) {
    url.searchParams.set('showNetworkSelector', 'false');
  }

  if (params.hideHeader) {
    url.searchParams.set('hideHeader', 'true');
  }

  if (params.hideFooter) {
    url.searchParams.set('hideFooter', 'true');
  }

  if (params.enableTransactions === false) {
    url.searchParams.set('enableTransactions', 'false');
  }

  if (params.requireWalletConnection) {
    url.searchParams.set('requireWalletConnection', 'true');
  }

  if (params.standaloneMode === false) {
    url.searchParams.set('standaloneMode', 'false');
  }

  return url.toString();
}

/**
 * Parses widget parameters from URL search params
 */
export function parseWidgetParams(searchParams: URLSearchParams): Partial<AomiChatWidgetParams> {
  const params: Partial<AomiChatWidgetParams> = {};

  const appCode = searchParams.get('appCode');
  if (appCode) params.appCode = appCode;

  const sessionId = searchParams.get('sessionId');
  if (sessionId) params.sessionId = sessionId;

  const theme = searchParams.get('theme');
  if (theme) params.theme = theme as AomiChatTheme;

  const palette = searchParams.get('palette');
  if (palette) {
    try {
      params.theme = JSON.parse(palette) as AomiChatWidgetPalette;
    } catch {
      // Ignore invalid JSON
    }
  }

  const mode = searchParams.get('mode');
  if (mode) params.mode = mode as AomiChatMode;

  const chainId = searchParams.get('chainId');
  if (chainId) {
    const parsed = parseInt(chainId);
    if (!isNaN(parsed)) params.chainId = parsed as SupportedChainId;
  }

  const welcomeMessage = searchParams.get('welcomeMessage');
  if (welcomeMessage) params.welcomeMessage = welcomeMessage;

  const placeholder = searchParams.get('placeholder');
  if (placeholder) params.placeholder = placeholder;

  // Boolean parameters
  const showWalletStatus = searchParams.get('showWalletStatus');
  if (showWalletStatus === 'false') params.showWalletStatus = false;

  const showNetworkSelector = searchParams.get('showNetworkSelector');
  if (showNetworkSelector === 'false') params.showNetworkSelector = false;

  const hideHeader = searchParams.get('hideHeader');
  if (hideHeader === 'true') params.hideHeader = true;

  const hideFooter = searchParams.get('hideFooter');
  if (hideFooter === 'true') params.hideFooter = true;

  const enableTransactions = searchParams.get('enableTransactions');
  if (enableTransactions === 'false') params.enableTransactions = false;

  const requireWalletConnection = searchParams.get('requireWalletConnection');
  if (requireWalletConnection === 'true') params.requireWalletConnection = true;

  const standaloneMode = searchParams.get('standaloneMode');
  if (standaloneMode === 'false') params.standaloneMode = false;

  return params;
}

/*
 * ============================================================================
 * DOM UTILITIES
 * ============================================================================
 */

/**
 * Creates a DOM element with classes and attributes
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  options: {
    className?: string | string[];
    attributes?: Record<string, string>;
    styles?: Partial<CSSStyleDeclaration>;
    children?: (HTMLElement | string)[];
  } = {},
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);

  // Set classes
  if (options.className) {
    if (Array.isArray(options.className)) {
      element.classList.add(...options.className);
    } else {
      element.className = options.className;
    }
  }

  // Set attributes
  if (options.attributes) {
    Object.entries(options.attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }

  // Set styles
  if (options.styles) {
    Object.assign(element.style, options.styles);
  }

  // Add children
  if (options.children) {
    options.children.forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else {
        element.appendChild(child);
      }
    });
  }

  return element;
}

/**
 * Checks if an element is visible in the viewport
 */
export function isElementVisible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/*
 * ============================================================================
 * TYPE GUARDS
 * ============================================================================
 */

/**
 * Type guard to check if a value is a valid Ethereum address
 */
export function isEthereumAddress(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

/**
 * Type guard to check if a value is a valid transaction hash
 */
export function isTransactionHash(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return /^0x[a-fA-F0-9]{64}$/.test(value);
}

/**
 * Type guard to check if an object has a specific property
 */
export function hasProperty<T extends object, K extends string | number | symbol>(
  obj: T,
  prop: K,
): obj is T & Record<K, unknown> {
  return prop in obj;
}

/*
 * ============================================================================
 * ASYNC UTILITIES
 * ============================================================================
 */

/**
 * Delays execution for a specified number of milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Creates a promise that rejects after a timeout
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)),
  ]);
}

/**
 * Retries a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delay?: number;
    backoffFactor?: number;
    shouldRetry?: (error: unknown) => boolean;
  } = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    delay: initialDelay = 1000,
    backoffFactor = 2,
    shouldRetry = () => true,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts || !shouldRetry(error)) {
        throw error;
      }

      const delayMs = initialDelay * Math.pow(backoffFactor, attempt - 1);
      await delay(delayMs);
    }
  }

  throw lastError;
}

/*
 * ============================================================================
 * ENVIRONMENT UTILITIES
 * ============================================================================
 */

/**
 * Detects if running in a browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * Detects if running on a mobile device
 */
export function isMobile(): boolean {
  if (!isBrowser()) return false;

  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
}

/**
 * Gets the current viewport dimensions
 */
export function getViewportDimensions(): { width: number; height: number } {
  if (!isBrowser()) {
    return { width: 0, height: 0 };
  }

  return {
    width: window.innerWidth || document.documentElement.clientWidth,
    height: window.innerHeight || document.documentElement.clientHeight,
  };
}

/*
 * ============================================================================
 * FORMATTING UTILITIES
 * ============================================================================
 */

/**
 * Formats a timestamp as a human-readable string
 */
export function formatTimestamp(timestamp: Date): string {
  const now = new Date();
  const diff = now.getTime() - timestamp.getTime();

  if (diff < 60000) { // Less than 1 minute
    return 'just now';
  } else if (diff < 3600000) { // Less than 1 hour
    const minutes = Math.floor(diff / 60000);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diff < 86400000) { // Less than 1 day
    const hours = Math.floor(diff / 3600000);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    return timestamp.toLocaleDateString();
  }
}

/**
 * Truncates an Ethereum address for display
 */
export function truncateAddress(address: string, startChars = 6, endChars = 4): string {
  if (!isEthereumAddress(address)) return address;

  if (address.length <= startChars + endChars) return address;

  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Formats a number with appropriate decimal places
 */
export function formatNumber(
  value: number,
  options: {
    decimals?: number;
    compact?: boolean;
    currency?: string;
  } = {},
): string {
  const { decimals = 2, compact = false, currency } = options;

  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    notation: compact ? 'compact' : 'standard',
    style: currency ? 'currency' : 'decimal',
    currency: currency || 'USD',
  });

  return formatter.format(value);
}
