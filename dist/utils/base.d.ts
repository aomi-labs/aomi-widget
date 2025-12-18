import type { AomiChatWidgetParams } from '../types/interfaces';
/**
 * Validates widget configuration parameters
 */
export declare function validateWidgetParams(params: AomiChatWidgetParams): string[];
/**
 * Generates a unique session ID
 */
export declare function generateSessionId(): string;
/**
 * Validates a session ID format
 */
export declare function isValidSessionId(sessionId: string): boolean;
/**
 * Builds widget URL with parameters
 */
export declare function buildWidgetUrl(baseUrl: string, params: AomiChatWidgetParams): string;
/**
 * Parses widget parameters from URL search params
 */
export declare function parseWidgetParams(searchParams: URLSearchParams): Partial<AomiChatWidgetParams>;
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
 * Checks if an element is visible in the viewport
 */
export declare function isElementVisible(element: HTMLElement): boolean;
/**
 * Type guard to check if a value is a valid Ethereum address
 */
export declare function isEthereumAddress(value: unknown): value is string;
/**
 * Type guard to check if a value is a valid transaction hash
 */
export declare function isTransactionHash(value: unknown): value is string;
/**
 * Type guard to check if an object has a specific property
 */
export declare function hasProperty<T extends object, K extends string | number | symbol>(obj: T, prop: K): obj is T & Record<K, unknown>;
/**
 * Delays execution for a specified number of milliseconds
 */
export declare function delay(ms: number): Promise<void>;
/**
 * Creates a promise that rejects after a timeout
 */
export declare function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T>;
/**
 * Retries a function with exponential backoff
 */
export declare function retry<T>(fn: () => Promise<T>, options?: {
    maxAttempts?: number;
    delay?: number;
    backoffFactor?: number;
    shouldRetry?: (error: unknown) => boolean;
}): Promise<T>;
/**
 * Detects if running in a browser environment
 */
export declare function isBrowser(): boolean;
/**
 * Detects if running on a mobile device
 */
export declare function isMobile(): boolean;
/**
 * Gets the current viewport dimensions
 */
export declare function getViewportDimensions(): {
    width: number;
    height: number;
};
/**
 * Formats a timestamp as a human-readable string
 */
export declare function formatTimestamp(timestamp: Date): string;
/**
 * Truncates an Ethereum address for display
 */
export declare function truncateAddress(address: string, startChars?: number, endChars?: number): string;
/**
 * Formats a number with appropriate decimal places
 */
export declare function formatNumber(value: number, options?: {
    decimals?: number;
    compact?: boolean;
    currency?: string;
}): string;
//# sourceMappingURL=base.d.ts.map