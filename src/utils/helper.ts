import {
  type ChatMessage,
  type ToolStreamUpdate,
} from '../types';
import { createTransactionError } from '../types/errors';
import { isEthereumAddress } from '../utils';

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
  isTyping?: boolean;
  is_typing?: boolean;
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
    throw createTransactionError('Invalid recipient address');
  }

  if (!isHex(transaction.value)) {
    throw createTransactionError('Invalid transaction value');
  }

  if (transaction.data && !isHex(transaction.data)) {
    throw createTransactionError('Invalid transaction data');
  }

  if (transaction.gas && !isHex(transaction.gas)) {
    throw createTransactionError('Invalid gas value');
  }
}

function isHex(value: string): boolean {
  return /^0x[0-9a-fA-F]*$/.test(value);
}
