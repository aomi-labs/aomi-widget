import { randomBytes } from "node:crypto";

export type TokenPayload = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
};

export type OAuthClient = {
  clientId: string;
  disabled: boolean;
  directWalletGrants: string[];
};

export function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function parseJson(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
