// =============================================================================
// Wallet Request Types
// =============================================================================

export type WalletRequestKind = "transaction" | "eip712_sign";

export type WalletTxPayload = {
  to: string;
  value?: string;
  data?: string;
  chainId?: number;
};

export type WalletEip712Payload = {
  typed_data?: {
    domain?: { chainId?: number | string };
    types?: Record<string, Array<{ name: string; type: string }>>;
    primaryType?: string;
    message?: Record<string, unknown>;
  };
  description?: string;
};

export type WalletRequestStatus = "pending" | "processing";

export type WalletRequest = {
  id: string;
  kind: WalletRequestKind;
  payload: WalletTxPayload | WalletEip712Payload;
  status: WalletRequestStatus;
  timestamp: number;
};

// =============================================================================
// Buffer State
// =============================================================================

export type WalletBuffer = {
  queue: WalletRequest[];
  nextId: number;
};

export function createWalletBuffer(): WalletBuffer {
  return { queue: [], nextId: 1 };
}

// =============================================================================
// Queue Operations
// =============================================================================

export function enqueue(
  buffer: WalletBuffer,
  kind: WalletRequestKind,
  payload: WalletTxPayload | WalletEip712Payload,
): WalletRequest {
  const request: WalletRequest = {
    id: `wreq-${buffer.nextId++}`,
    kind,
    payload,
    status: "pending",
    timestamp: Date.now(),
  };
  buffer.queue.push(request);
  return request;
}

export function dequeue(
  buffer: WalletBuffer,
  id: string,
): WalletRequest | null {
  const index = buffer.queue.findIndex((r) => r.id === id);
  if (index === -1) return null;
  return buffer.queue.splice(index, 1)[0];
}

export function peek(buffer: WalletBuffer): WalletRequest | null {
  return buffer.queue.find((r) => r.status === "pending") ?? null;
}

export function markProcessing(buffer: WalletBuffer, id: string): boolean {
  const request = buffer.queue.find((r) => r.id === id);
  if (!request || request.status !== "pending") return false;
  request.status = "processing";
  return true;
}

export function getAll(buffer: WalletBuffer): WalletRequest[] {
  return [...buffer.queue];
}
