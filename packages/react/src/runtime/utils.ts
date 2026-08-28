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

/** Final outcome of a staged tx, mined from wallet completion callbacks. */
export type TxOutcome = {
  status: "success" | "failed";
  txHash?: string;
  error?: string;
};

/**
 * Staged-tx outcomes, keyed per VM. EVM `pending_tx_ids` and SVM
 * `pending_solana_id` are independent counters that can collide numerically,
 * so they get separate maps — a failed EVM tx-1 must never paint a Solana
 * step red.
 */
export type TxOutcomes = {
  evm: ReadonlyMap<number, TxOutcome>;
  svm: ReadonlyMap<number, TxOutcome>;
  /**
   * SVM outcomes keyed by the unsigned tx blob. The staged tool envelope
   * (`policy/svm.rs wallet_pending`) does NOT carry `pending_solana_id` —
   * that id exists only between the wallet request and its callback — but
   * BOTH the envelope and the callback echo `unsigned_tx`, so the blob is
   * the join key that actually reaches the trace step.
   */
  svmByTx: ReadonlyMap<string, TxOutcome>;
};

/**
 * The Solana wallet flow reports through four `wallet::solana_*_complete`
 * event types (packages/client `session/wallet.ts`), with statuses
 * `signed`/`submitted` on the happy path and `rejected`/`failed` otherwise —
 * unlike EVM's single `wallet:tx_complete` with `success`/`failed`.
 */
const SVM_COMPLETE_TYPES = new Set([
  "wallet::solana_sign_complete",
  "wallet::solana_send_complete",
  "wallet::solana_sign_and_send_complete",
]);

/**
 * Mine the transcript's system-endpoint echoes for staged-tx outcomes.
 *
 * A staged tool step is recorded once (`current_lifecycle: "queued"` on EVM,
 * `status: "pending_approval"` on SVM) and never updated — the actual result
 * arrives later as a wallet callback that only the model was meant to read.
 * Without reconciling the two, the trace shows "Execute ✓ / Queued" forever,
 * even when execution failed. The echo messages are hidden from display (see
 * the prefix guard above), but they are still the single durable record of
 * what happened — including after a reload, when no client-side wallet state
 * survives.
 *
 * Later callbacks win: a re-staged tx gets a fresh pending id, so collisions
 * only occur when the same id genuinely reports twice.
 */
export function collectTxOutcomes(
  messages: readonly AomiMessage[],
): TxOutcomes | null {
  let evm: Map<number, TxOutcome> | null = null;
  let svm: Map<number, TxOutcome> | null = null;
  let svmByTx: Map<string, TxOutcome> | null = null;
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
    if (typeof parsed !== "object" || parsed === null) continue;
    const type = (parsed as { type?: unknown }).type;
    const payload = (parsed as { payload?: unknown }).payload;
    if (typeof payload !== "object" || payload === null) continue;

    if (type === "wallet:tx_complete") {
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
        evm ??= new Map();
        evm.set(id, {
          status,
          ...(typeof txHash === "string" && txHash && { txHash }),
          ...(typeof error === "string" && error && { error }),
        });
      }
      continue;
    }

    if (typeof type === "string" && SVM_COMPLETE_TYPES.has(type)) {
      const { status, signature, error, pending_solana_id, unsigned_tx } =
        payload as {
          status?: unknown;
          signature?: unknown;
          error?: unknown;
          pending_solana_id?: unknown;
          unsigned_tx?: unknown;
        };
      const mapped =
        status === "signed" || status === "submitted"
          ? ("success" as const)
          : status === "rejected" || status === "failed"
            ? ("failed" as const)
            : null;
      if (mapped === null) continue;
      const outcome: TxOutcome = {
        status: mapped,
        ...(typeof signature === "string" &&
          signature && { txHash: signature }),
        ...(typeof error === "string" && error && { error }),
      };
      if (
        typeof pending_solana_id === "number" &&
        Number.isInteger(pending_solana_id)
      ) {
        svm ??= new Map();
        svm.set(pending_solana_id, outcome);
      }
      if (typeof unsigned_tx === "string" && unsigned_tx) {
        svmByTx ??= new Map();
        svmByTx.set(unsigned_tx, outcome);
      }
    }
  }
  if (!evm && !svm && !svmByTx) return null;
  return {
    evm: evm ?? new Map(),
    svm: svm ?? new Map(),
    svmByTx: svmByTx ?? new Map(),
  };
}

export function toInboundMessage(
  msg: AomiMessage,
  txOutcomes?: TxOutcomes | null,
  /** Position in the raw list, the id fallback for a notice with no key. */
  rawIndex = 0,
): ThreadMessageLike | null {
  // System records exist in the transcript for model/runtime coordination, not
  // as chat turns. Live notices are presented through the event notification
  // path, while transaction-completion echoes are still consumed above by
  // `collectTxOutcomes`. Keeping an otherwise-hidden system message here would
  // split the surrounding assistant fragments into two message identities.
  if (msg.sender === "system") {
    return null;
  }

  // A notice explains a turn that produced no answer. It rides the durable
  // message projection precisely so the explanation survives a reload — the
  // transient `system_error` event cannot, since the backend drains it.
  if (msg.sender === "notice") {
    return {
      id: noticeMessageId(msg, rawIndex),
      role: "assistant",
      content: [{ type: "text" as const, text: msg.content ?? "" }],
      createdAt: new Date(),
      metadata: {
        custom: {
          aomiNoticeKind: "error",
          aomiNoticeTitle: "Error",
        },
      },
    };
  }

  return buildInboundMessage(msg, txOutcomes);
}

/**
 * Id for a projected notice.
 *
 * Prefers the backend's own `message_key`, which is unique per failure. Content
 * cannot serve here — every notice carries identical copy, so two failed turns
 * in one thread would render under the same id. The index fallback covers
 * legacy rows with no key; it is still position-stable within a projection,
 * which is what keeps the card from remounting on every poll.
 */
function noticeMessageId(msg: AomiMessage, index: number): string {
  return `aomi-notice-${msg.message_key ?? `idx-${index}`}`;
}

/**
 * UI-only join key attached to a completed `task` tool-call part. The trace uses
 * it to pair the transcript part with the live `TaskRunState` sidecar (see
 * `state/thread-store.ts`). Survives `fromThreadMessageLike` because unknown
 * tool-call properties are spread through unchanged.
 */
export type AomiTaskPartMetadata = { agentId: string };

const TASK_TOOL_NAME = "task";

/** Read `metadata.custom.aomiTask.agentId` off a tool-call part, if present. */
export function readTaskPartAgentId(part: unknown): string | undefined {
  const custom = (
    part as
      | { metadata?: { custom?: { aomiTask?: { agentId?: unknown } } } }
      | undefined
  )?.metadata?.custom?.aomiTask?.agentId;
  return typeof custom === "string" && custom.length > 0 ? custom : undefined;
}

const asPlainObject = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

/** The `task` tool returns `{agent_id, status, staged_count}` (public projection). */
const readTaskAgentId = (result: unknown): string | undefined => {
  const agentId = asPlainObject(result)?.agent_id;
  return typeof agentId === "string" && agentId.length > 0
    ? agentId
    : undefined;
};

function buildInboundMessage(
  msg: AomiMessage,
  txOutcomes?: TxOutcomes | null,
): ThreadMessageLike | null {
  const content: MessageContentPart[] = [];
  const role: ThreadMessageLike["role"] =
    msg.sender === "user" ? "user" : "assistant";

  if (msg.content && msg.content.trim().length > 0) {
    content.push({ type: "text" as const, text: msg.content });
  }

  const [topic, toolContent] = parseToolResult(msg.tool_result) ?? [];
  // `tool_name` is the tool the backend actually ran; `tool_result[0]` is only
  // a display topic. Prefer the former when the backend supplies it.
  const toolName = msg.tool_name?.trim() || topic;
  if (toolName && toolContent) {
    const result = (() => {
      try {
        return JSON.parse(toolContent);
      } catch {
        return { args: toolContent };
      }
    })();
    const agentId =
      toolName === TASK_TOOL_NAME ? readTaskAgentId(result) : undefined;

    content.push({
      type: "tool-call" as const,
      toolCallId: `tool_${Date.now()}`,
      toolName,
      args: asPlainObject(msg.tool_arguments),
      result: (() => {
        const parsed: unknown = result;
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
          const record = parsed as {
            pending_tx_id?: unknown;
            tx_ids?: unknown;
            pending_solana_id?: unknown;
            unsigned_tx?: unknown;
          };
          const directOutcome =
            typeof record.pending_tx_id === "number"
              ? txOutcomes.evm.get(record.pending_tx_id)
              : typeof record.pending_solana_id === "number"
                ? txOutcomes.svm.get(record.pending_solana_id)
                : typeof record.unsigned_tx === "string"
                  ? txOutcomes.svmByTx.get(record.unsigned_tx)
                  : undefined;
          // `evm_commit_txs` returns the committed ids as a batch, while the
          // wallet callback reports outcomes per pending id. Keep the commit
          // row pending until every leg has reported; any failed leg makes the
          // aggregate fail. This lets the trace itself settle instead of only
          // updating the earlier staging rows.
          const batchIds = Array.isArray(record.tx_ids)
            ? record.tx_ids.filter(
                (id): id is number =>
                  typeof id === "number" && Number.isInteger(id),
              )
            : [];
          const batchOutcomes = batchIds.flatMap((id) => {
            const batchOutcome = txOutcomes.evm.get(id);
            return batchOutcome ? [batchOutcome] : [];
          });
          const failedBatchOutcome = batchOutcomes.find(
            (batchOutcome) => batchOutcome.status === "failed",
          );
          const completeBatchOutcome =
            batchIds.length > 0 && batchOutcomes.length === batchIds.length
              ? batchOutcomes[batchOutcomes.length - 1]
              : undefined;
          const outcome =
            directOutcome ?? failedBatchOutcome ?? completeBatchOutcome;
          if (outcome) {
            return { ...record, tx_outcome: outcome };
          }
        }
        return parsed;
      })(),
      // Only `task` calls carry the sidecar join key.
      ...(agentId
        ? {
            metadata: {
              custom: { aomiTask: { agentId } satisfies AomiTaskPartMetadata },
            },
          }
        : null),
    } as MessageContentPart);
  }

  if (content.length === 0 && role === "assistant" && !msg.is_streaming) {
    return null;
  }

  const threadMessage = {
    role,
    content: content as ThreadMessageLike["content"],
    ...(msg.timestamp && { createdAt: new Date(msg.timestamp) }),
  } satisfies ThreadMessageLike;

  return threadMessage;
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
    case 4326:
      return "megaeth";
    case 5042002:
      return "arc-testnet";
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
