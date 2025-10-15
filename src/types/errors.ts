// Error types and classes for the Aomi Chat Widget

import { ERROR_CODES } from './constants';

/*
 * ============================================================================
 * BASE ERROR CLASS
 * ============================================================================
 */

export class AomiChatError extends Error {
  public readonly code: string;
  public readonly timestamp: Date;
  public readonly details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'AomiChatError';
    this.code = code;
    this.timestamp = new Date();
    this.details = details;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AomiChatError);
    }
  }

  public toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      timestamp: this.timestamp.toISOString(),
      details: this.details,
      stack: this.stack,
    };
  }

  public toString(): string {
    return `${this.name} [${this.code}]: ${this.message}`;
  }
}

/*
 * ============================================================================
 * SPECIFIC ERROR CLASSES
 * ============================================================================
 */

export class ConfigurationError extends AomiChatError {
  constructor(message: string, details?: unknown) {
    super(ERROR_CODES.INVALID_CONFIG, message, details);
    this.name = 'ConfigurationError';
  }
}

export class ConnectionError extends AomiChatError {
  constructor(message: string, details?: unknown) {
    super(ERROR_CODES.CONNECTION_FAILED, message, details);
    this.name = 'ConnectionError';
  }
}

export class WalletError extends AomiChatError {
  constructor(code: string, message: string, details?: unknown) {
    super(code, message, details);
    this.name = 'WalletError';
  }
}

export class TransactionError extends WalletError {
  constructor(message: string, details?: unknown) {
    super(ERROR_CODES.TRANSACTION_FAILED, message, details);
    this.name = 'TransactionError';
  }
}

export class ChatError extends AomiChatError {
  constructor(code: string, message: string, details?: unknown) {
    super(code, message, details);
    this.name = 'ChatError';
  }
}

export class RateLimitError extends ChatError {
  constructor(message: string, details?: unknown) {
    super(ERROR_CODES.RATE_LIMITED, message, details);
    this.name = 'RateLimitError';
  }
}

export class SessionError extends AomiChatError {
  constructor(message: string, details?: unknown) {
    super(ERROR_CODES.SESSION_EXPIRED, message, details);
    this.name = 'SessionError';
  }
}

/*
 * ============================================================================
 * ERROR FACTORY FUNCTIONS
 * ============================================================================
 */

export function createConfigurationError(message: string, details?: unknown): ConfigurationError {
  return new ConfigurationError(message, details);
}

export function createConnectionError(message: string, details?: unknown): ConnectionError {
  return new ConnectionError(message, details);
}

export function createWalletError(code: string, message: string, details?: unknown): WalletError {
  return new WalletError(code, message, details);
}

export function createTransactionError(message: string, details?: unknown): TransactionError {
  return new TransactionError(message, details);
}

export function createChatError(code: string, message: string, details?: unknown): ChatError {
  return new ChatError(code, message, details);
}

export function createRateLimitError(message: string, details?: unknown): RateLimitError {
  return new RateLimitError(message, details);
}

export function createSessionError(message: string, details?: unknown): SessionError {
  return new SessionError(message, details);
}

/*
 * ============================================================================
 * ERROR HANDLING UTILITIES
 * ============================================================================
 */

export function isAomiChatError(error: unknown): error is AomiChatError {
  return error instanceof AomiChatError;
}

export function isConfigurationError(error: unknown): error is ConfigurationError {
  return error instanceof ConfigurationError;
}

export function isConnectionError(error: unknown): error is ConnectionError {
  return error instanceof ConnectionError;
}

export function isWalletError(error: unknown): error is WalletError {
  return error instanceof WalletError;
}

export function isTransactionError(error: unknown): error is TransactionError {
  return error instanceof TransactionError;
}

export function isChatError(error: unknown): error is ChatError {
  return error instanceof ChatError;
}

export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError;
}

export function isSessionError(error: unknown): error is SessionError {
  return error instanceof SessionError;
}

/*
 * ============================================================================
 * ERROR SEVERITY LEVELS
 * ============================================================================
 */

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export function getErrorSeverity(error: AomiChatError): ErrorSeverity {
  switch (error.code) {
    case ERROR_CODES.MISSING_APP_CODE:
    case ERROR_CODES.INITIALIZATION_FAILED:
    case ERROR_CODES.BACKEND_UNAVAILABLE:
      return ErrorSeverity.CRITICAL;

    case ERROR_CODES.CONNECTION_FAILED:
    case ERROR_CODES.AUTHENTICATION_FAILED:
    case ERROR_CODES.SESSION_EXPIRED:
      return ErrorSeverity.HIGH;

    case ERROR_CODES.WALLET_NOT_CONNECTED:
    case ERROR_CODES.UNSUPPORTED_NETWORK:
    case ERROR_CODES.TRANSACTION_FAILED:
      return ErrorSeverity.MEDIUM;

    case ERROR_CODES.MESSAGE_TOO_LONG:
    case ERROR_CODES.RATE_LIMITED:
    case ERROR_CODES.INVALID_MESSAGE:
      return ErrorSeverity.LOW;

    default:
      return ErrorSeverity.MEDIUM;
  }
}

/*
 * ============================================================================
 * ERROR MESSAGES
 * ============================================================================
 */

export const ERROR_MESSAGES = {
  [ERROR_CODES.INVALID_CONFIG]: 'Invalid widget configuration provided',
  [ERROR_CODES.MISSING_APP_CODE]: 'App code is required for widget initialization',
  [ERROR_CODES.INVALID_THEME]: 'Invalid theme configuration',
  [ERROR_CODES.INVALID_DIMENSIONS]: 'Invalid widget dimensions',

  [ERROR_CODES.CONNECTION_FAILED]: 'Failed to connect to the chat backend',
  [ERROR_CODES.CONNECTION_TIMEOUT]: 'Connection timed out',
  [ERROR_CODES.BACKEND_UNAVAILABLE]: 'Chat backend is currently unavailable',
  [ERROR_CODES.AUTHENTICATION_FAILED]: 'Authentication failed',

  [ERROR_CODES.WALLET_NOT_CONNECTED]: 'Wallet is not connected',
  [ERROR_CODES.WALLET_CONNECTION_FAILED]: 'Failed to connect to wallet',
  [ERROR_CODES.UNSUPPORTED_NETWORK]: 'Unsupported network',
  [ERROR_CODES.TRANSACTION_FAILED]: 'Transaction failed',
  [ERROR_CODES.TRANSACTION_REJECTED]: 'Transaction was rejected by user',

  [ERROR_CODES.MESSAGE_TOO_LONG]: 'Message exceeds maximum length',
  [ERROR_CODES.RATE_LIMITED]: 'Rate limit exceeded, please slow down',
  [ERROR_CODES.INVALID_MESSAGE]: 'Invalid message format',
  [ERROR_CODES.SESSION_EXPIRED]: 'Chat session has expired',

  [ERROR_CODES.UNKNOWN_ERROR]: 'An unknown error occurred',
  [ERROR_CODES.INITIALIZATION_FAILED]: 'Widget initialization failed',
  [ERROR_CODES.PROVIDER_ERROR]: 'Provider error occurred',
} as const;

/*
 * ============================================================================
 * ERROR RECOVERY STRATEGIES
 * ============================================================================
 */

export enum RecoveryStrategy {
  RETRY = 'retry',
  RECONNECT = 'reconnect',
  REFRESH = 'refresh',
  FALLBACK = 'fallback',
  MANUAL = 'manual',
  NONE = 'none',
}

export function getRecoveryStrategy(error: AomiChatError): RecoveryStrategy {
  switch (error.code) {
    case ERROR_CODES.CONNECTION_FAILED:
    case ERROR_CODES.CONNECTION_TIMEOUT:
      return RecoveryStrategy.RECONNECT;

    case ERROR_CODES.BACKEND_UNAVAILABLE:
      return RecoveryStrategy.RETRY;

    case ERROR_CODES.SESSION_EXPIRED:
      return RecoveryStrategy.REFRESH;

    case ERROR_CODES.WALLET_NOT_CONNECTED:
    case ERROR_CODES.UNSUPPORTED_NETWORK:
      return RecoveryStrategy.MANUAL;

    case ERROR_CODES.RATE_LIMITED:
      return RecoveryStrategy.RETRY;

    case ERROR_CODES.MISSING_APP_CODE:
    case ERROR_CODES.INVALID_CONFIG:
      return RecoveryStrategy.NONE;

    default:
      return RecoveryStrategy.RETRY;
  }
}

/*
 * ============================================================================
 * ERROR REPORTING
 * ============================================================================
 */

export interface ErrorReport {
  error: AomiChatError;
  severity: ErrorSeverity;
  recoveryStrategy: RecoveryStrategy;
  context: {
    timestamp: string;
    userAgent: string;
    url: string;
    widgetConfig?: Partial<unknown>;
  };
}

export function createErrorReport(
  error: AomiChatError,
  widgetConfig?: Partial<unknown>,
): ErrorReport {
  return {
    error,
    severity: getErrorSeverity(error),
    recoveryStrategy: getRecoveryStrategy(error),
    context: {
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      widgetConfig,
    },
  };
}
