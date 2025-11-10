import {
  type ChatMessage,
  type ToolStreamUpdate,
  type OptionalParam,
} from '../types/interface';

export type ToolStreamPayload =
  | [unknown, unknown]
  | {
    topic?: unknown;
    content?: unknown;
  }
  | null
  | undefined;

export interface BackendMessagePayload {
  sender?: 'user' | 'assistant' | 'system' | 'agent';
  content?: string;
  timestamp?: string;
  is_streaming?: boolean;
  tool_stream?: ToolStreamPayload;
  toolStream?: ToolStreamPayload;
}

export interface BackendStatePayload {
  messages?: BackendMessagePayload[] | null;
  isProcessing?: boolean;
  is_processing?: boolean;
  pending_wallet_tx?: string | null;
}

export interface TransactionRequest {
  to: string;
  value: string;
  data: string;
  gas?: string;
}

export function convertBackendMessage(
  message: BackendMessagePayload,
  index: number,
  previousMessage?: ChatMessage,
): ChatMessage {
  const sender = message.sender === 'user'
    ? 'user'
    : message.sender === 'system'
      ? 'system'
      : 'assistant';

  const parsedTimestamp = message.timestamp ? new Date(message.timestamp) : new Date();
  const timestamp = Number.isNaN(parsedTimestamp.valueOf()) ? new Date() : parsedTimestamp;
  const idBase = message.timestamp || `${sender}-${index}`;
  const toolStream = normaliseToolStream(message.tool_stream ?? message.toolStream);

  return {
    id: previousMessage?.id ?? `${idBase}-${index}`,
    type: sender,
    content: message.content ?? '',
    timestamp,
    metadata: {
      streaming: Boolean(message.is_streaming),
    },
    toolStream,
  };
}

export function resolveBackendBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return null;
}

export function normaliseToolStream(raw: ToolStreamPayload): ToolStreamUpdate | undefined {
  if (!raw) return undefined;

  if (Array.isArray(raw)) {
    const [topic, content] = raw;
    return typeof topic === 'string'
      ? {
        topic,
        content: typeof content === 'string' ? content : '',
      }
      : undefined;
  }

  if (typeof raw === 'object') {
    const { topic, content } = raw as { topic?: unknown; content?: unknown };
    return typeof topic === 'string'
      ? {
        topic,
        content: typeof content === 'string' ? content : '',
      }
      : undefined;
  }

  return undefined;
}

export function areToolStreamsEqual(
  a?: ToolStreamUpdate,
  b?: ToolStreamUpdate,
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.topic === b.topic && a.content === b.content;
}

export function validateTransactionPayload(transaction: TransactionRequest): void {
  if (!isEthereumAddress(transaction.to)) {
    throw new Error('Invalid recipient address');
  }

  if (!isHex(transaction.value)) {
    throw new Error('Invalid transaction value');
  }

  if (transaction.data && !isHex(transaction.data)) {
    throw new Error('Invalid transaction data');
  }

  if (transaction.gas && !isHex(transaction.gas)) {
    throw new Error('Invalid gas value');
  }
}

function isHex(value: string): boolean {
  return /^0x[0-9a-fA-F]*$/.test(value);
}

/*
 * ============================================================================
 * VALIDATION UTILITIES
 * ============================================================================
 */

/**
 * Validates widget configuration parameters
 */
export function validateWidgetParams(params: OptionalParam): string[] {
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

/*
 * ============================================================================
 * ASYNC UTILITIES
 * ============================================================================
 */

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

/*
 * ============================================================================
 * FORMATTING UTILITIES
 * ============================================================================
 */

/**
 * Truncates an Ethereum address for display
 */
export function truncateAddress(address: string, startChars = 6, endChars = 4): string {
  if (!isEthereumAddress(address)) return address;

  if (address.length <= startChars + endChars) return address;

  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}
