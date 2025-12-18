import { ERROR_CODES } from './constants';
export type WidgetErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
export interface WidgetError extends Error {
    code: WidgetErrorCode;
    details?: unknown;
}
export declare function createWidgetError(code: WidgetErrorCode, message: string, details?: unknown): WidgetError;
//# sourceMappingURL=errors.d.ts.map