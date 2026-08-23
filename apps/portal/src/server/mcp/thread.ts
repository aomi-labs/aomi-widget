import "server-only";

import { createHash, randomUUID } from "node:crypto";

/**
 * Deterministic MCP thread id — byte-for-byte the derivation the Rust MCP
 * gateway used (`aomi/crates/mcp/src/thread.rs`): RFC 4122 v5 UUID over the
 * URL namespace with seed `aomi:mcp:{canonicalUserId}:{sessionId|default}`,
 * prefixed `mcp-`. Keeping the seed identical means threads created through
 * the old in-process gateway stay reachable through this port.
 */
const UUID_NAMESPACE_URL = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";

export function mcpThreadId(
  canonicalUserId: string,
  sessionId?: string | null,
): string {
  const seed = `aomi:mcp:${canonicalUserId}:${sessionId?.trim() || "default"}`;
  return `mcp-${uuidV5(seed, UUID_NAMESPACE_URL)}`;
}

export function newMcpThreadId(): string {
  return `mcp-${randomUUID()}`;
}

/**
 * Stable fallback idempotency identity shared with the Rust Pipeline MCP
 * presenter. Objects are sorted recursively; safe integers retain JSON form,
 * while every other number uses its IEEE-754 bits. This avoids JavaScript
 * number formatting and large-integer rounding diverging from serde_json.
 */
export function mcpOperationKey(
  principal: string,
  requestId: unknown,
  name: string,
  arguments_: Record<string, unknown>,
): string {
  const seed = canonicalJson({
    arguments: arguments_,
    name,
    principal,
    request_id: requestId,
  });
  return `mcp-op-${uuidV5(seed, UUID_NAMESPACE_URL)}`;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (typeof value === "number") {
    if (Number.isSafeInteger(value)) return JSON.stringify(value);
    const bytes = Buffer.allocUnsafe(8);
    bytes.writeDoubleBE(value);
    return `~f64:${bytes.toString("hex")}`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) =>
        Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8")),
      );
    return `{${entries
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(",")}}`;
  }
  const serialized = JSON.stringify(value);
  return serialized === undefined ? "null" : serialized;
}

function uuidV5(name: string, namespace: string): string {
  const namespaceBytes = Buffer.from(namespace.replace(/-/g, ""), "hex");
  const hash = createHash("sha1")
    .update(namespaceBytes)
    .update(Buffer.from(name, "utf8"))
    .digest();
  const bytes = hash.subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
