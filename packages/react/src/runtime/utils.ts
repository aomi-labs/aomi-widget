import type { ThreadMessageLike } from "@assistant-ui/react";

import {
  SUPPORTED_CHAINS as CLIENT_SUPPORTED_CHAINS,
  type AomiMessage,
  type ChainInfo,
  type UserState,
} from "@aomi-labs/client";

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

type MessageContentPart =
  Exclude<ThreadMessageLike["content"], string> extends readonly (infer U)[]
    ? U
    : never;

/**
 * The backend transcribes every system-endpoint callback verbatim as
 * `Response of system endpoint: {raw json}` (runtime `thread.rs`). That line
 * exists for the MODEL — it is how wallet callbacks reach the next turn — and
 * was never meant for humans; the CLI has filtered it from display since day
 * one (`cli/commands/history.ts`). Without this guard the web thread renders
 * the raw JSON as an assistant bubble.
 */
const SYSTEM_ENDPOINT_ECHO_PREFIX = "Response of system endpoint:";

/** Final outcome of a staged tx, mined from `wallet:tx_complete` callbacks. */
export type TxOutcome = {
  status: "success" | "failed";
  txHash?: string;
  error?: string;
};

/**
 * Mine the transcript's system-endpoint echoes for staged-tx outcomes.
 *
 * A staged tool step is recorded once, with `current_lifecycle: "queued"`, and
 * never updated — the actual result arrives later as a `wallet:tx_complete`
 * callback that only the model was meant to read. Without reconciling the two,
 * the trace shows "Execute ✓ / Queued" forever, even when execution failed.
 * The echo messages are hidden from display (see the prefix guard above), but
 * they are still the single durable record of what happened — including after
 * a reload, when no client-side wallet state survives.
 *
 * Later callbacks win: a re-staged tx gets a fresh pending id, so collisions
 * only occur when the same id genuinely reports twice.
 */
export function collectTxOutcomes(
  messages: readonly AomiMessage[],
): ReadonlyMap<number, TxOutcome> | null {
  let outcomes: Map<number, TxOutcome> | null = null;
  for (const msg of messages) {
    if (
      msg.sender !== "system" ||
      !msg.content?.startsWith(SYSTEM_ENDPOINT_ECHO_PREFIX)
    ) {
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(
        msg.content.slice(SYSTEM_ENDPOINT_ECHO_PREFIX.length),
      );
    } catch {
      continue;
    }
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      (parsed as { type?: unknown }).type !== "wallet:tx_complete"
    ) {
      continue;
    }
    const payload = (parsed as { payload?: unknown }).payload;
    if (typeof payload !== "object" || payload === null) continue;
    const { status, txHash, error, pending_tx_ids } = payload as {
      status?: unknown;
      txHash?: unknown;
      error?: unknown;
      pending_tx_ids?: unknown;
    };
    if (status !== "success" && status !== "failed") continue;
    if (!Array.isArray(pending_tx_ids)) continue;
    for (const id of pending_tx_ids) {
      if (typeof id !== "number" || !Number.isInteger(id)) continue;
      outcomes ??= new Map();
      outcomes.set(id, {
        status,
        ...(typeof txHash === "string" && txHash && { txHash }),
        ...(typeof error === "string" && error && { error }),
      });
    }
  }
  return outcomes;
}

export function toInboundMessage(
  msg: AomiMessage,
  txOutcomes?: ReadonlyMap<number, TxOutcome> | null,
): ThreadMessageLike | null {
  if (
    msg.sender === "system" &&
    msg.content?.startsWith(SYSTEM_ENDPOINT_ECHO_PREFIX)
  ) {
    return null;
  }

  const content: MessageContentPart[] = [];
  const role: ThreadMessageLike["role"] =
    msg.sender === "user" ? "user" : "assistant";

  if (msg.content && msg.content.trim().length > 0) {
    content.push({ type: "text" as const, text: msg.content });
  }

  const [topic, toolContent] = parseToolResult(msg.tool_result) ?? [];
  if (topic && toolContent) {
    content.push({
      type: "tool-call" as const,
      toolCallId: `tool_${Date.now()}`,
      toolName: topic,
      args: undefined,
      result: (() => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(toolContent);
        } catch {
          return { args: toolContent };
        }
        // Reconcile the step with its async outcome: a staged tx records
        // `current_lifecycle: "queued"` and is never touched again, so the
        // trace would show Queued/✓ forever. The interpreter reads
        // `tx_outcome` to flip the chip (and the red-X marker) instead.
        if (
          txOutcomes &&
          typeof parsed === "object" &&
          parsed !== null &&
          !Array.isArray(parsed)
        ) {
          const record = parsed as { pending_tx_id?: unknown };
          const outcome =
            typeof record.pending_tx_id === "number"
              ? txOutcomes.get(record.pending_tx_id)
              : undefined;
          if (outcome) {
            return { ...record, tx_outcome: outcome };
          }
        }
        return parsed;
      })(),
    });
  }

  if (content.length === 0 && role === "assistant" && !msg.is_streaming) {
    return null;
  }

  const threadMessage = {
    role,
    content: content as ThreadMessageLike["content"],
    ...(msg.timestamp && { createdAt: new Date(msg.timestamp) }),
    ...(msg.sender === "system" && {
      metadata: {
        custom: {
          aomiNoticeKind: isCreditNotice(msg.content)
            ? "payment_required"
            : "system_notice",
          aomiNoticeTitle: isCreditNotice(msg.content)
            ? "Credits needed"
            : "System notice",
        },
      },
    }),
  } satisfies ThreadMessageLike;

  return threadMessage;
}

function isCreditNotice(content: string | undefined): boolean {
  return /\b(?:credit|quota|payment)\b/i.test(content ?? "");
}

function parseToolResult(
  toolResult: AomiMessage["tool_result"],
): [string, string] | null {
  if (!toolResult) return null;

  if (Array.isArray(toolResult) && toolResult.length === 2) {
    const [topic, content] = toolResult;
    return [String(topic), String(content ?? "")];
  }

  return null;
}

// ==================== Wallet Utilities ====================

/**
 * User configuration props for footer components.
 * Provides user state and setter from UserContext.
 */
export type UserConfig = {
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
    case 143:
      return "monad";
    case 10143:
      return "monad-testnet";
    case 1337:
    case 31337:
      return "testnet";
    case 59141:
      return "linea-sepolia";
    case 59144:
      return "linea";
    default:
      return "testnet";
  }
};

export const formatAddress = (addr?: string): string =>
  addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "Connect Wallet";

// ==================== Chain Metadata ====================

export type { ChainInfo } from "@aomi-labs/client";

/** All chains supported by the application. Sourced from @aomi-labs/client. */
export const SUPPORTED_CHAINS: ChainInfo[] = [...CLIENT_SUPPORTED_CHAINS];

/** Look up ChainInfo by chain ID. Returns undefined for unknown chains. */
export const getChainInfo = (
  chainId: number | undefined,
): ChainInfo | undefined =>
  chainId === undefined
    ? undefined
    : SUPPORTED_CHAINS.find((c) => c.id === chainId);

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
