"use client";

import {
  useAccount as useParaAccount,
  useClient as useParaClient,
  useIssueJwt,
  useLogout,
  useModal,
  type TOAuthMethod,
} from "@getpara/react-sdk";
import type ParaWeb from "@getpara/react-sdk";
import type { AomiAccountCredential, AomiLoginMethod } from "../../types";

export type ParaAccountShape = {
  isLoading: boolean;
  isConnected: boolean;
  embedded: {
    email?: string;
    farcasterUsername?: string;
    telegramUserId?: string;
    authMethods?: Set<unknown>;
    wallets?: Array<{ address?: string; chainId?: number | string }>;
  };
  external: {
    evm?: {
      address?: string;
      chainId?: number | string;
    };
  };
};

export const DISCONNECTED_PARA_ACCOUNT: ParaAccountShape = {
  isLoading: false,
  isConnected: false,
  embedded: {},
  external: {},
};

export const defaultOAuthMethods: TOAuthMethod[] = ["GOOGLE"];
const ISSUE_JWT_FAILURE_COOLDOWN_MS = 30_000;
let issueJwtUnavailableUntil = 0;
let issueJwtInFlight: Promise<AomiAccountCredential | null> | null = null;

export function useSafeParaAccount(): ParaAccountShape {
  try {
    return useParaAccount() as ParaAccountShape;
  } catch {
    return DISCONNECTED_PARA_ACCOUNT;
  }
}

export function useSafeParaModal(): {
  openModal: (args?: { step?: string }) => void;
} | null {
  try {
    return useModal() as { openModal: (args?: { step?: string }) => void };
  } catch {
    return null;
  }
}

export function useSafeParaClient(): ParaWeb | null {
  try {
    return useParaClient() ?? null;
  } catch {
    return null;
  }
}

export function useSafeIssueJwt():
  | (() => Promise<AomiAccountCredential | null>)
  | null {
  try {
    const { issueJwtAsync } = useIssueJwt();
    return async () => {
      const now = Date.now();
      if (now < issueJwtUnavailableUntil) {
        return null;
      }
      if (issueJwtInFlight) {
        return issueJwtInFlight;
      }
      issueJwtInFlight = (async () => {
        let result: { token?: string; keyId?: string } | null | undefined;
        try {
          result = await issueJwtAsync({});
        } catch (error) {
          if (isParaJwtUnavailableError(error)) {
            issueJwtUnavailableUntil =
              Date.now() + ISSUE_JWT_FAILURE_COOLDOWN_MS;
            return null;
          }
          throw error;
        } finally {
          issueJwtInFlight = null;
        }
        const token = result?.token?.trim();
        return token
          ? {
              provider: "para",
              tokenKind: "session_jwt",
              providerToken: token,
              keyId: result?.keyId,
            }
          : null;
      })();
      return issueJwtInFlight;
    };
  } catch {
    return null;
  }
}

function isParaJwtUnavailableError(error: unknown): boolean {
  const candidate = error as
    | {
        name?: unknown;
        message?: unknown;
        status?: unknown;
        response?: { status?: unknown };
      }
    | undefined;
  const status = candidate?.status ?? candidate?.response?.status;
  if (status === 401 || status === 403) return true;
  const message = String(candidate?.message ?? "").toLowerCase();
  return (
    candidate?.name === "ParaApiError" ||
    message.includes("unknown error") ||
    message.includes("network error") ||
    message.includes("failed to fetch") ||
    message.includes("cors")
  );
}

export function useSafeLogout(): (() => Promise<void>) | null {
  try {
    const { logoutAsync } = useLogout();
    return async () => {
      await logoutAsync();
    };
  } catch {
    return null;
  }
}

export function resolveParaAuthValue(
  embedded: ParaAccountShape["embedded"],
  authMethod: AomiLoginMethod | undefined,
): string | undefined {
  if (authMethod === "telegram") {
    return embedded.telegramUserId;
  }
  if (authMethod === "farcaster") {
    return embedded.farcasterUsername;
  }
  if (!authMethod || authMethod === "wagmi") {
    return undefined;
  }
  return embedded.email;
}
