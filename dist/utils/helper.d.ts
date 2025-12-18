import { type ChatMessage, type ToolStreamUpdate, type OptionalParam } from '../types/interface';
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
export declare function convertBackendMessage(message: BackendMessagePayload, index: number, previousMessage?: ChatMessage): ChatMessage;
export declare function resolveBackendBoolean(value: unknown): boolean | null;
export declare function normaliseToolStream(raw: ToolStreamPayload): ToolStreamUpdate | undefined;
export declare function areToolStreamsEqual(a?: ToolStreamUpdate, b?: ToolStreamUpdate): boolean;
export declare function validateTransactionPayload(transaction: TransactionRequest): void;
/**
 * Validates widget configuration parameters
 */
export declare function validateWidgetParams(params: OptionalParam): string[];
/**
 * Generates a unique session ID
 */
export declare function generateSessionId(): string;
/**
 * Creates a DOM element with classes and attributes
 */
export declare function createElement<K extends keyof HTMLElementTagNameMap>(tagName: K, options?: {
    className?: string | string[];
    attributes?: Record<string, string>;
    styles?: Partial<CSSStyleDeclaration>;
    children?: (HTMLElement | string)[];
}, doc?: Document): HTMLElementTagNameMap[K];
/**
 * Type guard to check if a value is a valid Ethereum address
 */
export declare function isEthereumAddress(value: unknown): value is string;
/**
 * Type guard to check if a value is a valid transaction hash
 */
export declare function isTransactionHash(value: unknown): value is string;
/**
 * Creates a promise that rejects after a timeout
 */
export declare function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T>;
/**
 * Detects if running in a browser environment
 */
export declare function isBrowser(): boolean;
/**
 * Truncates an Ethereum address for display
 */
export declare function truncateAddress(address: string, startChars?: number, endChars?: number): string;
//# sourceMappingURL=helper.d.ts.map