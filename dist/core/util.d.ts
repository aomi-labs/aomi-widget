import { ReadinessPhase, type BackendReadiness, type ChatMessage, type ToolStreamUpdate, type SupportedChainId } from '../types';
export type ToolStreamPayload = [unknown, unknown] | {
    topic?: unknown;
    content?: unknown;
} | null | undefined;
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
export declare const NETWORK_CONFIGS: Record<SupportedChainId, any>;
export declare function getNetworkConfig(chainId: SupportedChainId): any;
export declare function convertBackendMessage(message: BackendMessagePayload, index: number, previousMessage?: ChatMessage): ChatMessage;
export declare function resolveBackendBoolean(value: unknown): boolean | null;
export declare function normalizeBackendReadiness(payload: BackendStatePayload): BackendReadiness | null;
export declare function mapReadinessPhase(value: string): ReadinessPhase;
export declare function normaliseToolStream(raw: ToolStreamPayload): ToolStreamUpdate | undefined;
export declare function areToolStreamsEqual(a?: ToolStreamUpdate, b?: ToolStreamUpdate): boolean;
export declare function validateTransactionPayload(transaction: TransactionRequest): void;
//# sourceMappingURL=util.d.ts.map