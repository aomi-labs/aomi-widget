/** The authorization route has already applied the canonical resource policy.
 * The consent UI must display and return that exact set instead of maintaining
 * a second, inevitably drifting client-side allowlist. */
export function consentScopes(scopes: readonly string[]): string[] {
  return [...scopes];
}
