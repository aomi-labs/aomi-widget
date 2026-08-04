// =============================================================================
// Input validation for BFF route handlers.
//
// Each function is a type guard that returns `true` only when the value
// matches the expected shape. All checks fail-closed on `unknown` input.
// =============================================================================

/**
 * Accepts numeric installation IDs like `"123456789"`.
 * Rejects empty strings, floats, negative numbers, and non-digit characters.
 */
export function isValidInstallationId(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && /^\d+$/.test(trimmed);
}

/**
 * Accepts `"owner/name"` — exactly two non-empty segments separated by one `/`.
 * Rejects trailing/leading slashes, multiple slashes, and empty segments.
 */
export function isValidRepo(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const parts = value.trim().split("/");
  return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0;
}

/** Rejects empty strings and whitespace-only strings. */
export function isValidDeploymentId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Accepts an array of strings where every element is non-empty after trimming.
 * Also accepts an empty array (no tags yet — the backend handles that case).
 */
export function isValidReleaseTags(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((tag) => typeof tag === "string" && tag.trim().length > 0)
  );
}

/** Positive safe integer — project ids and app ids. */
export function isValidProjectId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}
