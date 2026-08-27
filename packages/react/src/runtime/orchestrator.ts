"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ThreadMessageLike } from "@assistant-ui/react";

import type {
  Action,
  AomiClient,
  AomiMessage,
  UserState,
} from "@aomi-labs/client";
import { CLIENT_TYPE_WEB_UI, parseAomiTaskEvent } from "@aomi-labs/client";
import { Session as ClientSession } from "@aomi-labs/client";
import {
  useThreadContext,
  type ThreadContext,
} from "../contexts/thread-context";
import { initThreadControl, type ThreadTurnPhase } from "../state/thread-store";
import { SessionManager } from "./session-manager";
import { collectTxOutcomes, toInboundMessage } from "./utils";
import { mergeAssistantTurns } from "./merge-turns";

type OrchestratorOptions = {
  getUserState?: () => UserState;
  getApp: () => string;
  getModel?: () => string | null | undefined;
  getApplicationId?: () => number | string | null | undefined;
  getClientId?: () => string | undefined;
  prepareThreadForSend?: (threadId: string) => Promise<void> | void;
  onSendSuccess?: (threadId: string) => void;
  onSendError?: (threadId: string, error: unknown) => Promise<void> | void;
  onActionsChange?: (actions: Action[]) => void;
  onEvent?: (event: {
    type: string;
    payload: unknown;
    sessionId: string;
  }) => void;
};

type OptimisticSendStatus = "sending" | "sent" | "failed";

type RawMessageRange = {
  start: number;
  end: number | null;
};

type MessageProjection = { ranges: RawMessageRange[] };

const MESSAGE_PROJECTION_STORAGE_PREFIX = "aomi:message-projection:v1:";

const getMessageProjectionStorageKey = (threadId: string) =>
  `${MESSAGE_PROJECTION_STORAGE_PREFIX}${threadId}`;

const readMessageProjection = (threadId: string): MessageProjection | null => {
  if (typeof window === "undefined") return null;
  const key = getMessageProjectionStorageKey(threadId);
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as MessageProjection;
    if (
      !Array.isArray(parsed.ranges) ||
      parsed.ranges.some(
        (range) =>
          !Number.isSafeInteger(range.start) ||
          range.start < 0 ||
          (range.end !== null &&
            (!Number.isSafeInteger(range.end) || range.end < range.start)),
      )
    ) {
      throw new Error("Invalid message projection");
    }
    return parsed;
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
};

const writeMessageProjection = (
  threadId: string,
  projection: MessageProjection,
) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    getMessageProjectionStorageKey(threadId),
    JSON.stringify(projection),
  );
};

const clearMessageProjection = (threadId: string) => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(getMessageProjectionStorageKey(threadId));
};

const selectProjectedMessageEntries = (
  messages: readonly AomiMessage[],
  projection: MessageProjection | null,
) => {
  if (!projection) {
    return messages.map((message, rawIndex) => ({ message, rawIndex }));
  }

  return projection.ranges.flatMap((range) => {
    const end = Math.min(range.end ?? messages.length, messages.length);
    const entries: Array<{ message: AomiMessage; rawIndex: number }> = [];
    for (let rawIndex = range.start; rawIndex < end; rawIndex += 1) {
      const message = messages[rawIndex];
      if (message) entries.push({ message, rawIndex });
    }
    return entries;
  });
};

const projectInboundMessages = (
  messages: readonly AomiMessage[],
  projection: MessageProjection | null,
) => {
  // Collected over the FULL raw list, not the projected ranges: a truncated
  // projection may hide the system echo while still showing the staged step
  // it reports on.
  const txOutcomes = collectTxOutcomes(messages);
  const projectedMessages: ThreadMessageLike[] = [];
  for (const { message, rawIndex } of selectProjectedMessageEntries(
    messages,
    projection,
  )) {
    const converted = toInboundMessage(message, txOutcomes, rawIndex);
    if (converted) projectedMessages.push(converted);
  }
  return mergeAssistantTurns(projectedMessages);
};

const truncateProjectionBefore = (
  projection: MessageProjection | null,
  rawIndex: number,
): RawMessageRange[] => {
  const sourceRanges = projection?.ranges ?? [
    { start: 0, end: null } satisfies RawMessageRange,
  ];
  const prefix: RawMessageRange[] = [];

  for (const range of sourceRanges) {
    const rangeEnd = range.end ?? Number.POSITIVE_INFINITY;
    if (rawIndex >= rangeEnd) {
      prefix.push(range);
      continue;
    }
    if (rawIndex > range.start) {
      prefix.push({ start: range.start, end: rawIndex });
    }
    break;
  }

  return prefix;
};

const SUBMITTING_TO_WORKING_GRACE_MS = 300;

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Message failed to send";

const getHttpStatus = (error: unknown): number | undefined => {
  const status = (error as { status?: unknown })?.status;
  if (typeof status === "number") return status;

  const message = toErrorMessage(error);
  const match = /\bHTTP\s+(\d{3})\b/i.exec(message);
  return match ? Number(match[1]) : undefined;
};

const isPaymentRequiredError = (error: unknown) => getHttpStatus(error) === 402;

const PAYMENT_REQUIRED_MESSAGE =
  "You're out of funds, please set up a payment method.";

/**
 * Shown when a turn ends without an answer. Matches the backend's durable
 * notice copy: the provider's envelope names tools and schemas, which is
 * material for the app builder's log, not for the person in the chat.
 */
const TURN_ERROR_MESSAGE = "This app hit an error and couldn't respond.";

/** A non-model message shown in the transcript: a runtime notice, not a turn. */
const buildNoticeMessage = (
  kind: string,
  title: string,
  text: string,
): ThreadMessageLike => ({
  id: `aomi-${kind}-${Date.now()}`,
  role: "assistant",
  content: [{ type: "text", text }],
  createdAt: new Date(),
  metadata: {
    custom: {
      aomiNoticeKind: kind,
      aomiNoticeTitle: title,
    },
  },
});

const buildPaymentRequiredMessage = (): ThreadMessageLike =>
  buildNoticeMessage(
    "payment_required",
    "Credits needed",
    PAYMENT_REQUIRED_MESSAGE,
  );

const previewText = (value: string, max = 80) => {
  const singleLine = value.replace(/\s+/g, " ").trim();
  if (singleLine.length <= max) return singleLine;
  return `${singleLine.slice(0, max - 1)}…`;
};

const getOptimisticStatus = (message: ThreadMessageLike) => {
  const status = message.metadata?.custom?.aomiSendStatus;
  return status === "sending" || status === "sent" || status === "failed"
    ? status
    : undefined;
};

const hasUnhydratedOptimisticMessage = (messages: ThreadMessageLike[]) =>
  messages.some((message) => {
    const status = getOptimisticStatus(message);
    return status === "sending" || status === "sent";
  });

const withOptimisticStatus = (
  message: ThreadMessageLike,
  status: OptimisticSendStatus,
  error?: unknown,
): ThreadMessageLike => {
  const custom: Record<string, unknown> = {
    ...(message.metadata?.custom ?? {}),
    aomiSendStatus: status,
  };

  if (error) {
    custom.aomiSendError = toErrorMessage(error);
  } else {
    delete custom.aomiSendError;
  }

  return {
    ...message,
    metadata: {
      ...message.metadata,
      custom,
    },
  };
};

const updateOptimisticMessage = (
  threadContext: ThreadContext,
  threadId: string,
  messageId: string,
  status: OptimisticSendStatus,
  error?: unknown,
) => {
  const messages = threadContext.getThreadMessages(threadId);
  let changed = false;
  const nextMessages = messages.map((message) => {
    if (message.id !== messageId) return message;
    changed = true;
    return withOptimisticStatus(message, status, error);
  });

  if (changed) {
    threadContext.setThreadMessages(threadId, nextMessages);
  }
};

const updateTurnPhase = (
  threadContext: ThreadContext,
  threadId: string,
  turnPhase: ThreadTurnPhase,
) => {
  const metadata = threadContext.getThreadMetadata(threadId);
  if (metadata?.control.turnPhase === turnPhase) {
    return;
  }

  if (!metadata) {
    // A first send can reach a phase change before anything registered this
    // thread's metadata. updateThreadMetadata no-ops on missing rows, so
    // create the row here — otherwise the phase reads "idle" for the whole
    // turn and the working indicator never appears.
    threadContext.setThreadMetadata((all) => {
      const next = new Map(all);
      next.set(threadId, {
        title: "New Chat",
        status: "regular",
        lastActiveAt: new Date().toISOString(),
        control: {
          ...initThreadControl(),
          turnPhase,
        },
      });
      return next;
    });
    return;
  }

  threadContext.updateThreadMetadata(threadId, {
    control: {
      ...metadata.control,
      turnPhase,
    },
  });
};

/**
 * Append a notice to `threadId`, unless one of the same kind already trails the
 * transcript.
 *
 * Walks back to the most recent assistant message rather than checking the last
 * one. A "last message" check fails for back-to-back 402s because the second
 * failed send inserts an optimistic user message between the existing notice
 * and the new notice call, so the last message is always a user message and the
 * dedupe misses. Skipping over user messages also gives the correct "fresh
 * notice after a successful reply" behavior: if a successful assistant message
 * landed since the last notice, we want a new notice.
 *
 * `threadId` is always explicit — a notice must land on the thread whose
 * session raised it, which for a warmed or background session is not the
 * thread the user is looking at.
 */
export const appendNoticeMessage = (
  threadContext: ThreadContext,
  threadId: string,
  message: ThreadMessageLike,
) => {
  const kind = message.metadata?.custom?.aomiNoticeKind;
  const messages = threadContext.getThreadMessages(threadId);

  let hasNotice = false;
  for (let i = messages.length - 1; i >= 0; i--) {
    const existing = messages[i];
    if (existing.role !== "assistant") continue;
    hasNotice = existing.metadata?.custom?.aomiNoticeKind === kind;
    break;
  }

  if (hasNotice) return;

  threadContext.setThreadMessages(threadId, [...messages, message]);
};

/** The transient half of a failed turn; see `buildTurnErrorMessage`. */
export const buildTurnErrorMessage = (): ThreadMessageLike =>
  buildNoticeMessage("error", "Error", TURN_ERROR_MESSAGE);

const appendPaymentRequiredMessage = (
  threadContext: ThreadContext,
  threadId: string,
) =>
  appendNoticeMessage(threadContext, threadId, buildPaymentRequiredMessage());

export function useRuntimeOrchestrator(
  aomiClient: AomiClient,
  options: OrchestratorOptions,
) {
  const threadContext = useThreadContext();
  const threadContextRef = useRef<ThreadContext>(threadContext);
  threadContextRef.current = threadContext;
  const aomiClientRef = useRef(aomiClient);
  aomiClientRef.current = aomiClient;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [isRunning, setIsRunning] = useState(false);

  const sessionManagerRef = useRef<SessionManager | null>(null);
  if (!sessionManagerRef.current) {
    sessionManagerRef.current = new SessionManager(() => aomiClientRef.current);
  }

  const pendingFetches = useRef<Set<string>>(new Set());
  const initialStatePromises = useRef<Map<string, Promise<void>>>(new Map());
  const hydratedThreadIds = useRef<Set<string>>(new Set());
  const messageProjections = useRef<Map<string, MessageProjection>>(new Map());
  const loadedMessageProjectionIds = useRef<Set<string>>(new Set());
  // Track event listener cleanup per thread
  const listenerCleanups = useRef<Map<string, () => void>>(new Map());

  const getMessageProjection = useCallback((threadId: string) => {
    if (!loadedMessageProjectionIds.current.has(threadId)) {
      loadedMessageProjectionIds.current.add(threadId);
      const stored = readMessageProjection(threadId);
      if (stored) messageProjections.current.set(threadId, stored);
    }
    return messageProjections.current.get(threadId) ?? null;
  }, []);

  const setMessageProjection = useCallback(
    (threadId: string, projection: MessageProjection) => {
      loadedMessageProjectionIds.current.add(threadId);
      messageProjections.current.set(threadId, projection);
      writeMessageProjection(threadId, projection);
    },
    [],
  );

  const deleteMessageProjection = useCallback((threadId: string) => {
    loadedMessageProjectionIds.current.delete(threadId);
    messageProjections.current.delete(threadId);
    clearMessageProjection(threadId);
  }, []);

  const cleanupSessionListeners = useCallback((threadId: string) => {
    listenerCleanups.current.get(threadId)?.();
    listenerCleanups.current.delete(threadId);
  }, []);

  const closeSession = useCallback(
    (threadId: string) => {
      cleanupSessionListeners(threadId);
      pendingFetches.current.delete(threadId);
      initialStatePromises.current.delete(threadId);
      hydratedThreadIds.current.delete(threadId);
      deleteMessageProjection(threadId);
      sessionManagerRef.current?.close(threadId);
    },
    [cleanupSessionListeners, deleteMessageProjection],
  );

  const closeIdleSessionsExcept = useCallback(
    (activeThreadId: string) => {
      const closedThreadIds =
        sessionManagerRef.current?.closeIdleExcept(
          activeThreadId,
          cleanupSessionListeners,
        ) ?? [];

      for (const threadId of closedThreadIds) {
        pendingFetches.current.delete(threadId);
        initialStatePromises.current.delete(threadId);
        hydratedThreadIds.current.delete(threadId);
      }

      return closedThreadIds;
    },
    [cleanupSessionListeners],
  );

  const closeAllSessions = useCallback(() => {
    pendingFetches.current.clear();
    initialStatePromises.current.clear();
    hydratedThreadIds.current.clear();
    messageProjections.current.clear();
    loadedMessageProjectionIds.current.clear();
    for (const threadId of Array.from(listenerCleanups.current.keys())) {
      cleanupSessionListeners(threadId);
    }
    sessionManagerRef.current?.closeAll();
  }, [cleanupSessionListeners]);

  /** Get or create a ClientSession for a thread, wiring up event listeners. */
  const getSession = useCallback(
    (threadId: string): ClientSession => {
      const manager = sessionManagerRef.current!;
      const nextOptions = optionsRef.current;
      const nextApp = nextOptions.getApp();
      const nextModel = nextOptions.getModel?.() ?? undefined;
      const nextApplicationId = nextOptions.getApplicationId?.();
      const nextClientId = nextOptions.getClientId?.();
      const nextUserState = nextOptions.getUserState?.();
      const existing = manager.get(threadId);
      if (existing) {
        existing.syncRuntimeOptions({
          app: nextApp,
          model: nextModel,
          applicationId: nextApplicationId,
          clientId: nextClientId,
          userState: nextUserState,
        });
        return existing;
      }

      const session = manager.getOrCreate(threadId, {
        app: nextApp,
        model: nextModel,
        applicationId: nextApplicationId,
        clientId: nextClientId,
        clientType: CLIENT_TYPE_WEB_UI,
        userState: nextUserState,
      });

      // Wire ClientSession events → React state
      const cleanups: Array<() => void> = [];

      // Messages → thread context
      cleanups.push(
        session.on("messages", (msgs) => {
          const projection = getMessageProjection(threadId);
          const threadMessages = projectInboundMessages(msgs, projection);
          const existingMessages =
            threadContextRef.current.getThreadMessages(threadId);
          if (
            threadMessages.length === 0 &&
            hasUnhydratedOptimisticMessage(existingMessages)
          ) {
            return;
          }
          threadContextRef.current.setThreadMessages(threadId, threadMessages);
        }),
      );

      // Processing state
      cleanups.push(
        session.on("processing_start", () => {
          updateTurnPhase(threadContextRef.current, threadId, "working");
          if (threadContextRef.current.currentThreadId === threadId) {
            setIsRunning(true);
          }
        }),
      );
      cleanups.push(
        session.on("processing_end", () => {
          updateTurnPhase(threadContextRef.current, threadId, "idle");
          if (threadContextRef.current.currentThreadId === threadId) {
            setIsRunning(false);
          }
        }),
      );

      cleanups.push(
        session.on("actions_changed", (actions) =>
          optionsRef.current.onActionsChange?.(actions),
        ),
      );

      // Title changes → thread metadata
      cleanups.push(
        session.on("title_changed", ({ title }) => {
          threadContextRef.current.updateThreadMetadata(threadId, { title });
        }),
      );

      // Forward Agent activity to the event relay.
      const forwardEvent = (type: string) =>
        session.on(
          type as keyof import("@aomi-labs/client").SessionEventMap,
          (payload: unknown) => {
            optionsRef.current.onEvent?.({
              type,
              payload,
              sessionId: threadId,
            });
          },
        );

      cleanups.push(forwardEvent("tool_complete"));

      // Orchestrator delegation events → per-thread taskRuns sidecar.
      // The mother's `task` tool message only lands in the transcript once the
      // child finishes, so the live agent row can only come from these events.
      // `applyTaskEvent` dedupes on (agentId, child_seq), which makes the SSE
      // replay after a reconnect idempotent.
      const forwardTaskEvent = <
        K extends "task_started" | "task_activity" | "task_completed",
      >(
        type: K,
      ) =>
        session.on(type, (event) => {
          const task = parseAomiTaskEvent(event);
          if (!task) return;
          threadContextRef.current.applyTaskEvent(threadId, task);
          optionsRef.current.onEvent?.({
            type,
            payload: event,
            sessionId: threadId,
          });
        });

      cleanups.push(forwardTaskEvent("task_started"));
      cleanups.push(forwardTaskEvent("task_activity"));
      cleanups.push(forwardTaskEvent("task_completed"));
      cleanups.push(forwardEvent("system_error"));

      listenerCleanups.current.set(threadId, () => {
        for (const cleanup of cleanups) cleanup();
      });

      return session;
    },
    // Stable deps — option getters are refs
    [getMessageProjection],
  );

  const ensureInitialState = useCallback(
    async (threadId: string) => {
      const existingPromise = initialStatePromises.current.get(threadId);
      if (existingPromise) {
        return existingPromise;
      }

      const cachedMessages =
        threadContextRef.current.getThreadMessages(threadId);
      const existingSession = sessionManagerRef.current?.get(threadId);
      if (
        existingSession &&
        (hydratedThreadIds.current.has(threadId) || cachedMessages.length > 0)
      ) {
        optionsRef.current.onActionsChange?.(
          existingSession.getActions(),
        );
        if (threadContextRef.current.currentThreadId === threadId) {
          setIsRunning(existingSession.getIsProcessing());
        }
        return;
      }

      const fetchPromise = (async () => {
        pendingFetches.current.add(threadId);

        try {
          const session = getSession(threadId);
          await session.fetchCurrentState();
          hydratedThreadIds.current.add(threadId);
          optionsRef.current.onActionsChange?.(
            session.getActions(),
          );

          if (threadContextRef.current.currentThreadId === threadId) {
            setIsRunning(session.getIsProcessing());
          }
        } catch (error) {
          console.error("Failed to fetch initial state:", error);
          if (threadContextRef.current.currentThreadId === threadId) {
            setIsRunning(false);
          }
        } finally {
          pendingFetches.current.delete(threadId);
          initialStatePromises.current.delete(threadId);
        }
      })();

      initialStatePromises.current.set(threadId, fetchPromise);
      return fetchPromise;
    },
    [getSession],
  );

  /** Send a message on the given thread. */
  const sendMessage = useCallback(
    async (text: string, threadId: string) => {
      console.debug("[aomi][runtime] sendMessage start", {
        threadId,
        messagePreview: previewText(text),
      });
      const existingMessages =
        threadContextRef.current.getThreadMessages(threadId);
      const optimisticMessageId = String(existingMessages.length);
      const userMessage: ThreadMessageLike = {
        id: optimisticMessageId,
        role: "user",
        content: [{ type: "text", text }],
        createdAt: new Date(),
        metadata: {
          custom: {
            aomiOriginalText: text,
            aomiSendStatus: "sending",
          },
        },
      };
      threadContextRef.current.setThreadMessages(threadId, [
        ...existingMessages,
        userMessage,
      ]);
      threadContextRef.current.updateThreadMetadata(threadId, {
        lastActiveAt: new Date().toISOString(),
      });
      // A new turn starts a fresh delegation sidecar. This is what lets the
      // trace treat every run in `taskRuns` as belonging to the current turn
      // (and keep rendering completed runs until the transcript catches up)
      // without leaking rows from earlier turns.
      threadContextRef.current.clearThreadTaskRuns(threadId);
      updateTurnPhase(threadContextRef.current, threadId, "submitting");
      const submittingFallbackTimer = setTimeout(() => {
        const metadata = threadContextRef.current.getThreadMetadata(threadId);
        if (metadata?.control.turnPhase !== "submitting") return;
        updateTurnPhase(threadContextRef.current, threadId, "working");
      }, SUBMITTING_TO_WORKING_GRACE_MS);

      // Immediately show "generating" state so the UI switches to the stop
      // button and displays a loading indicator while the message is in flight.
      if (threadContextRef.current.currentThreadId === threadId) {
        setIsRunning(true);
      }

      try {
        console.debug("[aomi][runtime] sendMessage preparing thread", {
          threadId,
        });
        await optionsRef.current.prepareThreadForSend?.(threadId);
        console.debug("[aomi][runtime] sendMessage prepare complete", {
          threadId,
        });
        const session = getSession(threadId);
        console.debug("[aomi][runtime] sendMessage session ready", {
          threadId,
          sessionId: session.sessionId,
        });
        await session.sendAsync(text);
        clearTimeout(submittingFallbackTimer);
        console.debug("[aomi][runtime] sendMessage sendAsync complete", {
          threadId,
          sessionId: session.sessionId,
          isProcessing: session.getIsProcessing(),
          pendingActionCount: session.getPendingActions().length,
        });
        optionsRef.current.onSendSuccess?.(threadId);
        if (!session.getIsProcessing()) {
          updateTurnPhase(threadContextRef.current, threadId, "idle");
        }
        if (threadContextRef.current.currentThreadId === threadId) {
          setIsRunning(session.getIsProcessing());
        }
        updateOptimisticMessage(
          threadContextRef.current,
          threadId,
          optimisticMessageId,
          "sent",
        );
        optionsRef.current.onActionsChange?.(
          session.getActions(),
        );
      } catch (error) {
        clearTimeout(submittingFallbackTimer);
        console.error("[aomi][runtime] sendMessage failed", {
          threadId,
          messagePreview: previewText(text),
          error,
        });
        if (threadContextRef.current.currentThreadId === threadId) {
          setIsRunning(false);
        }
        updateTurnPhase(threadContextRef.current, threadId, "idle");
        updateOptimisticMessage(
          threadContextRef.current,
          threadId,
          optimisticMessageId,
          "failed",
          error,
        );
        if (isPaymentRequiredError(error)) {
          appendPaymentRequiredMessage(threadContextRef.current, threadId);
        }
        await optionsRef.current.onSendError?.(threadId, error);
        throw error;
      }
    },
    [getSession],
  );

  const regenerateMessage = useCallback(
    async (
      threadId: string,
      messageId: string | null,
      replacementText?: string,
    ) => {
      const visibleMessages =
        threadContextRef.current.getThreadMessages(threadId);
      const explicitIndex = visibleMessages.findIndex(
        (message) => message.id === messageId,
      );
      const numericIndex =
        explicitIndex === -1 && messageId !== null && /^\d+$/.test(messageId)
          ? Number(messageId)
          : -1;
      let userMessageIndex =
        explicitIndex !== -1 ? explicitIndex : numericIndex;

      if (userMessageIndex < 0 || userMessageIndex >= visibleMessages.length) {
        throw new Error("Message to regenerate was not found.");
      }

      while (
        userMessageIndex >= 0 &&
        visibleMessages[userMessageIndex]?.role !== "user"
      ) {
        userMessageIndex -= 1;
      }

      const userMessage = visibleMessages[userMessageIndex];
      if (!userMessage || userMessage.role !== "user") {
        throw new Error("Regeneration requires a user message.");
      }

      const originalText =
        typeof userMessage.content === "string"
          ? userMessage.content.trim()
          : userMessage.content
              .filter(
                (part): part is Extract<typeof part, { type: "text" }> =>
                  part.type === "text",
              )
              .map((part) => part.text)
              .join("\n")
              .trim();
      const nextText = replacementText?.trim() || originalText;
      if (!nextText) {
        throw new Error("Regeneration requires message text.");
      }

      const session = getSession(threadId);
      const rawMessages = session.getMessages();
      const currentProjection = getMessageProjection(threadId);
      const userOrdinal = visibleMessages
        .slice(0, userMessageIndex + 1)
        .filter((message) => message.role === "user").length;
      const targetEntry = selectProjectedMessageEntries(
        rawMessages,
        currentProjection,
      ).filter(({ message }) => message.sender === "user")[userOrdinal - 1];
      if (!targetEntry) {
        throw new Error("Backend message to regenerate was not found.");
      }

      const nextProjection: MessageProjection = {
        ranges: [
          ...truncateProjectionBefore(currentProjection, targetEntry.rawIndex),
          { start: rawMessages.length, end: null },
        ],
      };
      setMessageProjection(threadId, nextProjection);
      threadContextRef.current.setThreadMessages(
        threadId,
        projectInboundMessages(rawMessages, nextProjection),
      );

      await sendMessage(nextText, threadId);
    },
    [getMessageProjection, getSession, sendMessage, setMessageProjection],
  );

  /** Cancel the current generation on the given thread. */
  const cancelGeneration = useCallback(async (threadId: string) => {
    const session = sessionManagerRef.current?.get(threadId);
    if (session) {
      await session.interrupt();
    } else {
      updateTurnPhase(threadContextRef.current, threadId, "idle");
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      closeAllSessions();
    };
  }, [closeAllSessions]);

  return {
    sessionManager: sessionManagerRef.current!,
    getSession,
    isRunning,
    setIsRunning,
    ensureInitialState,
    sendMessage,
    regenerateMessage,
    cancelGeneration,
    closeSession,
    closeAllSessions,
    closeIdleSessionsExcept,
    aomiClientRef,
  };
}
