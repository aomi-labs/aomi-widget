"use client";

export type WalletTxRequestPayload = {
  to: string;
  value: string; // wei as decimal string
  data: string; // 0x-prefixed hex
  gas?: string | null;
  gas_limit?: string | null;
  description?: string;
  topic?: string;
  timestamp?: string;
};

export type WalletTxRequestContext = {
  sessionId: string;
  threadId: string;
  publicKey?: string;
};

// Return the transaction hash (0x...) or throw on failure/rejection.
export type WalletTxRequestHandler = (
  request: WalletTxRequestPayload,
  context: WalletTxRequestContext
) => Promise<string>;

