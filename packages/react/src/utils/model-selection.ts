/** Models preferred as default, in priority order (cheaper + good performance). */
const PREFERRED_DEFAULT_MODEL_PATTERNS: RegExp[] = [
  /^claude-4\.5-haiku/i,
  /^claude.*haiku/i,
  /^gpt-4o-mini/i,
  /^gemini.*flash/i,
];

/**
 * Resolve the actual backend model for auto mode.
 * Prefers known cheaper/performance-oriented models before falling back to the
 * backend order.
 */
export function resolveAutoModel(models: string[]): string | null {
  if (models.length === 0) return null;

  for (const pattern of PREFERRED_DEFAULT_MODEL_PATTERNS) {
    const match = models.find((model) => pattern.test(model));
    if (match) return match;
  }

  return models[0] ?? null;
}
