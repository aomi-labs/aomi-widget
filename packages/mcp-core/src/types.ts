// =============================================================================
// @aomi-labs/mcp-core — types
// =============================================================================

export type UserId = string;

/** Per-request context derived from MCP transport. v1: just the resolved
 *  Aomi user. Future: scopes from plugin OAuth, client install id, etc. */
export interface McpCallCtx {
  userId: UserId;
}
