import type { ThreadMessageLike } from "@assistant-ui/react";

import type { AomiMessage } from "../backend/types";
import type { UserState } from "../contexts/user-context";

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind CSS classes with conflict resolution.
 * Combines clsx for conditional classes and tailwind-merge for deduplication.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}



// ==================== Thread Utilities ====================

export const isTempThreadId = (id: string) => id.startsWith("temp-");

export const parseTimestamp = (value?: string | number) => {
  if (value === undefined || value === null) return 0;
  if (typeof value === "number") {
    return Number.isFinite(value) ? (value < 1e12 ? value * 1000 : value) : 0;
  }

  const numeric = Number(value);
  if (!Number.isNaN(numeric)) {
    return numeric < 1e12 ? numeric * 1000 : numeric;
  }

  const ts = Date.parse(value);
  return Number.isNaN(ts) ? 0 : ts;
};

export const isPlaceholderTitle = (title?: string) => {
  const normalized = title?.trim() ?? "";
  return !normalized || normalized.startsWith("#[");
};

// ==================== Message Conversion ====================

type MessageContentPart = Exclude<
  ThreadMessageLike["content"],
  string
> extends readonly (infer U)[]
  ? U
  : never;

export function toInboundMessage(
  msg: AomiMessage,
): ThreadMessageLike | null {
  if (msg.sender === "system") return null;

  const content: MessageContentPart[] = [];
  const role: ThreadMessageLike["role"] =
    msg.sender === "user" ? "user" : "assistant";

  if (msg.content) {
    content.push({ type: "text" as const, text: msg.content });
  }

  // Sync result or Asnyc Ack
  const [topic, toolContent] = parseToolResult(msg.tool_result) ?? [];
  if (topic && toolContent) {
    content.push({
      type: "tool-call" as const,
      toolCallId: `tool_${Date.now()}`,
      toolName: topic,
      args: undefined,
      result: (() => {
        try {
          return JSON.parse(toolContent);
        } catch {
          return { args: toolContent };
        }
      })(),
    });
  }

  const threadMessage = {
    role,
    content: (content.length > 0
      ? content
      : [{ type: "text" as const, text: "" }]) as ThreadMessageLike["content"],
    ...(msg.timestamp && { createdAt: new Date(msg.timestamp) }),
  } satisfies ThreadMessageLike;

  return threadMessage;
}


export function constructUITool(): string {
  return "";
}

function parseMessageTimestamp(timestamp?: string) {
  if (!timestamp) return undefined;
  const parsed = new Date(timestamp);
  return Number.isNaN(parsed.valueOf()) ? undefined : parsed;
}

function parseToolResult(
  toolResult: AomiMessage["tool_result"],
): [string, string] | null {
  if (!toolResult) return null;

  if (Array.isArray(toolResult) && toolResult.length === 2) {
    const [topic, content] = toolResult;
    return [String(topic), content];
  }

  if (typeof toolResult === "object") {
    const topic = (toolResult as { topic?: unknown }).topic;
    const content = (toolResult as { content?: unknown }).content;
    return topic ? [String(topic), String(content)] : null;
  }

  return null;
}

// ==================== Wallet Utilities ====================

/**
 * Props for wallet footer components.
 * @deprecated Use useUser() hook instead for global state access.
 */
export type WalletFooterProps = {
  user: UserState;
  setUser: (data: Partial<UserState>) => void;
};

export type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

export const getNetworkName = (
  chainId: number | string | undefined,
): string => {
  if (chainId === undefined) return "";
  const id = typeof chainId === "string" ? Number(chainId) : chainId;
  switch (id) {
    case 1:
      return "ethereum";
    case 137:
      return "polygon";
    case 42161:
      return "arbitrum";
    case 8453:
      return "base";
    case 10:
      return "optimism";
    case 11155111:
      return "sepolia";
    case 1337:
    case 31337:
      return "testnet";
    case 59140:
      return "linea-sepolia";
    case 59144:
      return "linea";
    default:
      return "testnet";
  }
};

export const formatAddress = (addr?: string): string =>
  addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "Connect Wallet";

export function normalizeWalletError(error: unknown): {
  rejected: boolean;
  message: string;
} {
  const e = error as {
    code?: unknown;
    name?: unknown;
    message?: unknown;
    shortMessage?: unknown;
    cause?: unknown;
  };
  const cause = (e?.cause ?? null) as {
    code?: unknown;
    name?: unknown;
    message?: unknown;
    shortMessage?: unknown;
  } | null;

  const code =
    (typeof e?.code === "number" ? e.code : undefined) ??
    (typeof cause?.code === "number" ? cause.code : undefined);
  const name =
    (typeof e?.name === "string" ? e.name : undefined) ??
    (typeof cause?.name === "string" ? cause.name : undefined);
  const msg =
    (typeof e?.shortMessage === "string" ? e.shortMessage : undefined) ??
    (typeof cause?.shortMessage === "string"
      ? cause.shortMessage
      : undefined) ??
    (typeof e?.message === "string" ? e.message : undefined) ??
    (typeof cause?.message === "string" ? cause.message : undefined) ??
    "Unknown wallet error";

  const rejected =
    code === 4001 ||
    name === "UserRejectedRequestError" ||
    name === "RejectedRequestError" ||
    /user rejected|rejected the request|denied|request rejected|canceled|cancelled/i.test(
      msg,
    );

  return { rejected, message: msg };
}

export function toHexQuantity(value: string): string {
  const trimmed = value.trim();
  const asBigInt = BigInt(trimmed);
  return `0x${asBigInt.toString(16)}`;
}

export async function pickInjectedProvider(
  publicKey?: string,
): Promise<Eip1193Provider | undefined> {
  const ethereum = (globalThis as unknown as { ethereum?: unknown })
    .ethereum as (Eip1193Provider & { providers?: unknown[] }) | undefined;
  if (!ethereum?.request) return undefined;

  const candidates: Eip1193Provider[] = Array.isArray(ethereum.providers)
    ? (ethereum.providers.filter(
        (p): p is Eip1193Provider => !!(p as Eip1193Provider)?.request,
      ) as Eip1193Provider[])
    : [ethereum];

  const target = publicKey?.toLowerCase();
  if (target) {
    for (const candidate of candidates) {
      try {
        const accounts = (await candidate.request({
          method: "eth_accounts",
        })) as unknown;
        const list = Array.isArray(accounts)
          ? (accounts as unknown[]).map((a) => String(a).toLowerCase())
          : [];
        if (list.includes(target)) return candidate;
      } catch {
        // Ignore providers that error on eth_accounts.
      }
    }
  }

  return candidates[0];
}
