"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";

import {
  STREAM_TO_JOURNEY,
  defaultStreamTemplate,
  generatedFileTree,
  mockBuildResponse,
  type BuildFileNode,
  type BuildMessage,
  type BuildSession,
  type BuildStreamEvent,
  type JourneyStageId,
} from "@build/features/build/contracts";
import {
  emptySessions,
  findSessionById,
  loadPersistedSessions,
  mergeSessions,
  savePersistedSession,
  subscribeBuildSessions,
} from "@build/features/build/storage/build-session-storage";

function nowTime() {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function nowStamp() {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
}

const stageMessages: Record<BuildStreamEvent["stage"], string> = {
  plan: "Analyzing prompt and composing Smithers plan (local mock).",
  generate: "Generating project files and configuration (local mock).",
  validate: "Running compile, lint, and type checks (local mock).",
  ready: "Artifacts ready. Ship toward Projects / GitHub.",
};

/**
 * Local Create-session driver with timer pipeline.
 * Honest mock until Han SSE — copy labels this as local mock.
 */
export function useBuildSession() {
  const persistedSessions = useSyncExternalStore(
    subscribeBuildSessions,
    loadPersistedSessions,
    () => emptySessions,
  );
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [stageId, setStageId] = useState<JourneyStageId>("describe");
  const [messages, setMessages] = useState<BuildMessage[]>([]);
  const [streamEvents, setStreamEvents] = useState<BuildStreamEvent[]>([]);
  const [fileTree, setFileTree] = useState<BuildFileNode[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null,
  );
  const [shipReady, setShipReady] = useState(false);
  const [showStreamInThread, setShowStreamInThread] = useState(false);
  const timersRef = useRef<number[]>([]);

  const recentSessions = mergeSessions(persistedSessions);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  const loadSession = useCallback(
    (sessionId: string) => {
      clearTimers();
      const session = findSessionById(sessionId, persistedSessions);
      if (!session) return;
      setActiveSessionId(sessionId);
      setStageId(session.stageId);
      setMessages(session.messages);
      setStreamEvents(session.streamEvents);
      setFileTree(session.fileTree);
      setShipReady(session.status === "healthy");
      setShowStreamInThread(false);
      setIsGenerating(false);
      setStreamingMessageId(null);
    },
    [clearTimers, persistedSessions],
  );

  const startNewSession = useCallback(() => {
    clearTimers();
    setActiveSessionId(null);
    setStageId("describe");
    setMessages([]);
    setStreamEvents([]);
    setFileTree([]);
    setShipReady(false);
    setShowStreamInThread(false);
    setIsGenerating(false);
    setStreamingMessageId(null);
  }, [clearTimers]);

  const runBuildPipeline = useCallback(
    (userText: string, onAssistantReady: (msg: BuildMessage) => void) => {
      clearTimers();
      const sessionId = `run_${Date.now()}`;
      const userMsg: BuildMessage = {
        id: `u_${Date.now()}`,
        role: "user",
        content: userText,
        timestamp: nowTime(),
      };

      setActiveSessionId(sessionId);
      setStageId("describe");
      setMessages([userMsg]);
      setIsGenerating(true);
      setShowStreamInThread(true);
      setShipReady(false);

      const initial = defaultStreamTemplate.map((e) => ({ ...e }));
      setStreamEvents(initial);
      setFileTree([]);

      const stages: BuildStreamEvent["stage"][] = [
        "plan",
        "generate",
        "validate",
        "ready",
      ];

      let finalMessages: BuildMessage[] = [userMsg];
      let finalStreamEvents = initial;
      let finalFileTree: BuildFileNode[] = [];
      let finalStageId: JourneyStageId = "describe";

      stages.forEach((stage, index) => {
        const timerId = window.setTimeout(() => {
          finalStageId = STREAM_TO_JOURNEY[stage];
          setStageId(finalStageId);

          setStreamEvents((prev) => {
            const next = prev.map((e) => {
              if (e.stage === stage) {
                return {
                  ...e,
                  status: "active" as const,
                  time: nowStamp(),
                  message: stageMessages[stage],
                };
              }
              if (stages.indexOf(e.stage) < index && e.status !== "done") {
                return {
                  ...e,
                  status: "done" as const,
                  time: e.time || nowStamp(),
                };
              }
              return e;
            });
            finalStreamEvents = next;
            return next;
          });

          if (stage === "generate") {
            setFileTree(generatedFileTree);
            finalFileTree = generatedFileTree;
          }

          if (stage === "ready") {
            setStreamEvents((prev) => {
              finalStreamEvents = prev.map((e) => ({
                ...e,
                status: "done" as const,
              }));
              return finalStreamEvents;
            });
            setShipReady(true);
            setStageId("ship");
            finalStageId = "ship";

            const assistantMsg: BuildMessage = {
              id: `a_${Date.now()}`,
              role: "assistant",
              content: mockBuildResponse,
              timestamp: nowTime(),
              model: "Local mock",
            };
            finalMessages = [...finalMessages, assistantMsg];
            setMessages(finalMessages);
            onAssistantReady(assistantMsg);

            const title =
              userText.length > 48
                ? `${userText.slice(0, 48).trim()}…`
                : userText.trim();

            const session: BuildSession = {
              id: sessionId,
              title: title || "New build",
              status: "healthy",
              model: "Local mock",
              updatedAt: "just now",
              runtime: "local mock",
              stageId: finalStageId,
              messages: finalMessages,
              streamEvents: finalStreamEvents,
              fileTree: finalFileTree.length ? finalFileTree : generatedFileTree,
            };

            savePersistedSession(session);
          }
        }, (index + 1) * 700);
        timersRef.current.push(timerId);
      });
    },
    [clearTimers],
  );

  const handleStreamComplete = useCallback(() => {
    setIsGenerating(false);
    setStreamingMessageId(null);
    setShowStreamInThread(false);
  }, []);

  return {
    activeSessionId,
    stageId,
    messages,
    streamEvents,
    fileTree,
    isGenerating,
    streamingMessageId,
    setStreamingMessageId,
    shipReady,
    showStreamInThread,
    loadSession,
    startNewSession,
    runBuildPipeline,
    handleStreamComplete,
    recentSessions,
  };
}
