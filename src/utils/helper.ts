import {
  ReadinessPhase,
  type BackendReadiness,
  type ChatMessage,
  type ToolStreamUpdate,
  type SupportedChainId,
} from '../types';
import { createTransactionError } from '../types/errors';
import { isEthereumAddress } from './index';

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

export interface BackendReadinessPayload {
  phase?: unknown;
  detail?: unknown;
  message?: unknown;
}

export interface BackendStatePayload {
  messages?: BackendMessagePayload[] | null;
  isTyping?: boolean;
  is_typing?: boolean;
  isProcessing?: boolean;
  is_processing?: boolean;
  pending_wallet_tx?: string | null;
  readiness?: BackendReadinessPayload | null;
  missingApiKey?: boolean | string;
  missing_api_key?: boolean | string;
  isLoading?: boolean | string;
  is_loading?: boolean | string;
  isConnectingMcp?: boolean | string;
  is_connecting_mcp?: boolean | string;
}

export interface TransactionRequest {
  to: string;
  value: string;
  data: string;
  gas?: string;
}

export const NETWORK_CONFIGS: Record<SupportedChainId, any> = {
  1: null,
  5: null,
  11155111: null,
  100: {
    chainId: '0x64',
    chainName: 'Gnosis',
    nativeCurrency: {
      name: 'xDai',
      symbol: 'XDAI',
      decimals: 18,
    },
    rpcUrls: ['https://rpc.gnosischain.com'],
    blockExplorerUrls: ['https://gnosisscan.io'],
  },
  137: {
    chainId: '0x89',
    chainName: 'Polygon',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
    },
    rpcUrls: ['https://polygon-rpc.com'],
    blockExplorerUrls: ['https://polygonscan.com'],
  },
  42161: {
    chainId: '0xa4b1',
    chainName: 'Arbitrum One',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: ['https://arb1.arbitrum.io/rpc'],
    blockExplorerUrls: ['https://arbiscan.io'],
  },
  8453: {
    chainId: '0x2105',
    chainName: 'Base',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: ['https://mainnet.base.org'],
    blockExplorerUrls: ['https://basescan.org'],
  },
  10: {
    chainId: '0xa',
    chainName: 'Optimism',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: ['https://mainnet.optimism.io'],
    blockExplorerUrls: ['https://optimistic.etherscan.io'],
  },
};

export function getNetworkConfig(chainId: SupportedChainId): any {
  return NETWORK_CONFIGS[chainId] ?? null;
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

export function normalizeBackendReadiness(payload: BackendStatePayload): BackendReadiness | null {
  const readinessPayload = payload.readiness;

  if (typeof readinessPayload === 'string') {
    return { phase: mapReadinessPhase(readinessPayload) };
  }

  if (readinessPayload && typeof readinessPayload === 'object' && typeof readinessPayload.phase === 'string') {
    const phase = mapReadinessPhase(readinessPayload.phase);
    const detailCandidate = typeof readinessPayload.detail === 'string' && readinessPayload.detail.trim().length > 0
      ? readinessPayload.detail
      : typeof readinessPayload.message === 'string' && readinessPayload.message.trim().length > 0
        ? readinessPayload.message
        : undefined;

    return { phase, detail: detailCandidate };
  }

  if (resolveBackendBoolean(payload.missingApiKey ?? payload.missing_api_key)) {
    return { phase: ReadinessPhase.MISSING_API_KEY };
  }

  if (resolveBackendBoolean(payload.isLoading ?? payload.is_loading)) {
    return { phase: ReadinessPhase.VALIDATING_ANTHROPIC };
  }

  if (resolveBackendBoolean(payload.isConnectingMcp ?? payload.is_connecting_mcp)) {
    return { phase: ReadinessPhase.CONNECTING_MCP };
  }

  return null;
}

export function mapReadinessPhase(value: string): ReadinessPhase {
  const normalised = value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  switch (normalised) {
    case 'connecting_mcp':
      return ReadinessPhase.CONNECTING_MCP;
    case 'validating_anthropic':
      return ReadinessPhase.VALIDATING_ANTHROPIC;
    case 'ready':
      return ReadinessPhase.READY;
    case 'missing_api_key':
      return ReadinessPhase.MISSING_API_KEY;
    case 'error':
      return ReadinessPhase.ERROR;
    case 'initializing':
    case 'initialising':
    case 'starting':
      return ReadinessPhase.CONNECTING_MCP;
    default:
      console.warn('Unknown readiness phase received:', value);
      return ReadinessPhase.CONNECTING_MCP;
  }
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
