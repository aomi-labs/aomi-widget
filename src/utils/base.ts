// Utility functions for the Aomi Chat Widget

import type {
  AomiChatWidgetParams,
  SupportedChainId,
} from '../types/interfaces';

/*
 * ============================================================================
 * VALIDATION UTILITIES
 * ============================================================================
 */

/**
 * Validates widget configuration parameters
 */
export function validateWidgetParams(params: AomiChatWidgetParams): string[] {
  if (!params.appCode || typeof params.appCode !== 'string') {
    return ['appCode is required and must be a string'];
  }
  return [];
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

  if (params.chainId) {
    url.searchParams.set('chainId', params.chainId.toString());
  }

  const welcomeMessage =
    typeof params.welcomeMessage === 'string' ? params.welcomeMessage : undefined;
  if (welcomeMessage) {
    url.searchParams.set('welcomeMessage', welcomeMessage);
  }

  const placeholder =
    typeof params.placeholder === 'string' ? params.placeholder : undefined;
  if (placeholder) {
    url.searchParams.set('placeholder', placeholder);
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

  const chainId = searchParams.get('chainId');
  if (chainId) {
    const parsed = parseInt(chainId);
    if (!isNaN(parsed)) params.chainId = parsed as SupportedChainId;
  }

  const welcomeMessage = searchParams.get('welcomeMessage');
  if (welcomeMessage) params.welcomeMessage = welcomeMessage;

  const placeholder = searchParams.get('placeholder');
  if (placeholder) params.placeholder = placeholder;

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
  doc?: Document,
): HTMLElementTagNameMap[K] {
  const targetDocument = doc ?? (typeof document !== 'undefined' ? document : null);
  if (!targetDocument) {
    throw new Error('No document available for DOM operations');
  }

  const element = targetDocument.createElement(tagName);

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
        element.appendChild(targetDocument.createTextNode(child));
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
