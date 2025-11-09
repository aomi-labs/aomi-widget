import { ERROR_CODES } from './constants';

export type WidgetErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export interface WidgetError extends Error {
  code: WidgetErrorCode;
  details?: unknown;
}

export function createWidgetError(
  code: WidgetErrorCode,
  message: string,
  details?: unknown,
): WidgetError {
  const error = new Error(message) as WidgetError;
  error.name = `WidgetError(${code})`;
  error.code = code;
  error.details = details;
  return error;
}
