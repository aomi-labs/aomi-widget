"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";

import {
  STREAM_TO_JOURNEY,
  defaultStreamTemplate,
  deriveSmithersNodes,
  generatedFileTree,
  mockBuildResponse,
  type BuildFileNode,
  type BuildMessage,
  type BuildSession,
  type BuildStreamEvent,
  type JourneyStageId,
  type SmithersNode,
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
  plan: "Composing Smithers nodes from your intent (local mock).",
  generate: "Generating project files and configuration (local mock).",
  validate: "Tool layer ready — compile & aomi-run are next (local mock).",
  ready: "Waiting for compile + aomi-run before ship.",
};

/**
 * Local Create-session driver with timer pipeline + P3 verify gates.
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
  const [nodes, setNodes] = useState<SmithersNode[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null,
  );
  const [awaitingVerify, setAwaitingVerify] = useState(false);
  const [compileDone, setCompileDone] = useState(false);
  const [testDone, setTestDone] = useState(false);
  const [verifyBusy, setVerifyBusy] = useState<"compile" | "test" | null>(null);
  const [shipReady, setShipReady] = useState(false);
  const [showStreamInThread, setShowStreamInThread] = useState(false);
  const timersRef = useRef<number[]>([]);
  const sessionDraftRef = useRef<{
    id: string;
    title: string;
    messages: BuildMessage[];
    streamEvents: BuildStreamEvent[];
    fileTree: BuildFileNode[];
    nodes: SmithersNode[];
  } | null>(null);

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
      setNodes(session.nodes ?? []);
      const healthy = session.status === "healthy" && session.stageId === "ship";
      setShipReady(healthy);
      setAwaitingVerify(session.stageId === "compile_test" && !healthy);
      setCompileDone(healthy || session.stageId === "ship");
      setTestDone(healthy);
      setVerifyBusy(null);
      setShowStreamInThread(false);
      setIsGenerating(false);
      setStreamingMessageId(null);
      sessionDraftRef.current = {
        id: session.id,
        title: session.title,
        messages: session.messages,
        streamEvents: session.streamEvents,
        fileTree: session.fileTree,
        nodes: session.nodes ?? [],
      };
    },
    [clearTimers, persistedSessions],
  );

  const startNewSession = useCallback(() => {
    clearTimers();
    sessionDraftRef.current = null;
    setActiveSessionId(null);
    setStageId("describe");
    setMessages([]);
    setStreamEvents([]);
    setFileTree([]);
    setNodes([]);
    setShipReady(false);
    setAwaitingVerify(false);
    setCompileDone(false);
    setTestDone(false);
    setVerifyBusy(null);
    setShowStreamInThread(false);
    setIsGenerating(false);
    setStreamingMessageId(null);
  }, [clearTimers]);

  const runBuildPipeline = useCallback(
    (userText: string, onAssistantReady: (msg: BuildMessage) => void) => {
      clearTimers();
      const sessionId = `run_${Date.now()}`;
      const title =
        userText.length > 48
          ? `${userText.slice(0, 48).trim()}…`
          : userText.trim();
      const userMsg: BuildMessage = {
        id: `u_${Date.now()}`,
        role: "user",
        content: userText,
        timestamp: nowTime(),
      };
      const plannedNodes = deriveSmithersNodes(userText);

      setActiveSessionId(sessionId);
      setStageId("describe");
      setMessages([userMsg]);
      setIsGenerating(true);
      setShowStreamInThread(true);
      setShipReady(false);
      setAwaitingVerify(false);
      setCompileDone(false);
      setTestDone(false);
      setVerifyBusy(null);
      setNodes(plannedNodes.map((n) => ({ ...n, status: "pending" })));

      const initial = defaultStreamTemplate.map((e) => ({ ...e }));
      setStreamEvents(initial);
      setFileTree([]);

      sessionDraftRef.current = {
        id: sessionId,
        title: title || "New build",
        messages: [userMsg],
        streamEvents: initial,
        fileTree: [],
        nodes: plannedNodes,
      };

      const stages: BuildStreamEvent["stage"][] = [
        "plan",
        "generate",
        "validate",
        "ready",
      ];

      let finalMessages: BuildMessage[] = [userMsg];
      let finalStreamEvents = initial;
      let finalFileTree: BuildFileNode[] = [];
      let finalNodes = plannedNodes;

      stages.forEach((stage, index) => {
        const timerId = window.setTimeout(() => {
          const journey = STREAM_TO_JOURNEY[stage];
          setStageId(journey);

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
            if (sessionDraftRef.current) {
              sessionDraftRef.current.streamEvents = next;
            }
            return next;
          });

          if (stage === "plan") {
            finalNodes = plannedNodes.map((n, i) => ({
              ...n,
              status: i === 0 ? "active" : "pending",
            }));
            setNodes(finalNodes);
            const activateRest = window.setTimeout(() => {
              finalNodes = plannedNodes.map((n) => ({
                ...n,
                status: n.id === "node_run" ? "pending" : "done",
              }));
              setNodes(finalNodes);
              if (sessionDraftRef.current) {
                sessionDraftRef.current.nodes = finalNodes;
              }
            }, 500);
            timersRef.current.push(activateRest);
          }

          if (stage === "generate") {
            setFileTree(generatedFileTree);
            finalFileTree = generatedFileTree;
            if (sessionDraftRef.current) {
              sessionDraftRef.current.fileTree = finalFileTree;
            }
          }

          if (stage === "ready") {
            setStreamEvents((prev) => {
              finalStreamEvents = prev.map((e) => ({
                ...e,
                status: "done" as const,
              }));
              if (sessionDraftRef.current) {
                sessionDraftRef.current.streamEvents = finalStreamEvents;
              }
              return finalStreamEvents;
            });
            setStageId("compile_test");
            setAwaitingVerify(true);

            const assistantMsg: BuildMessage = {
              id: `a_${Date.now()}`,
              role: "assistant",
              content: mockBuildResponse,
              timestamp: nowTime(),
              model: "Local mock",
            };
            finalMessages = [...finalMessages, assistantMsg];
            setMessages(finalMessages);
            if (sessionDraftRef.current) {
              sessionDraftRef.current.messages = finalMessages;
            }
            onAssistantReady(assistantMsg);

            savePersistedSession({
              id: sessionId,
              title: title || "New build",
              status: "running",
              model: "Local mock",
              updatedAt: "just now",
              runtime: "local mock",
              stageId: "compile_test",
              messages: finalMessages,
              streamEvents: finalStreamEvents,
              fileTree: finalFileTree.length ? finalFileTree : generatedFileTree,
              nodes: finalNodes,
            });
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

  const runCompile = useCallback(() => {
    if (compileDone || verifyBusy) return;
    setVerifyBusy("compile");
    const id = window.setTimeout(() => {
      setCompileDone(true);
      setVerifyBusy(null);
      setNodes((prev) =>
        prev.map((n) =>
          n.id === "node_run" ? n : { ...n, status: "done" as const },
        ),
      );
    }, 600);
    timersRef.current.push(id);
  }, [compileDone, verifyBusy]);

  const runTest = useCallback(() => {
    if (!compileDone || testDone || verifyBusy) return;
    setVerifyBusy("test");
    setNodes((prev) =>
      prev.map((n) =>
        n.id === "node_run" ? { ...n, status: "active" as const } : n,
      ),
    );
    const id = window.setTimeout(() => {
      setTestDone(true);
      setVerifyBusy(null);
      setNodes((prev) =>
        prev.map((n) => ({ ...n, status: "done" as const })),
      );
      setAwaitingVerify(false);
      setShipReady(true);
      setStageId("ship");
      const draft = sessionDraftRef.current;
      if (draft) {
        savePersistedSession({
          id: draft.id,
          title: draft.title,
          status: "healthy",
          model: "Local mock",
          updatedAt: "just now",
          runtime: "local mock",
          stageId: "ship",
          messages: draft.messages,
          streamEvents: draft.streamEvents,
          fileTree: draft.fileTree,
          nodes: draft.nodes.map((n) => ({ ...n, status: "done" })),
        });
      }
    }, 700);
    timersRef.current.push(id);
  }, [compileDone, testDone, verifyBusy]);

  return {
    activeSessionId,
    stageId,
    messages,
    streamEvents,
    fileTree,
    nodes,
    isGenerating,
    streamingMessageId,
    setStreamingMessageId,
    awaitingVerify,
    compileDone,
    testDone,
    verifyBusy,
    shipReady,
    showStreamInThread,
    loadSession,
    startNewSession,
    runBuildPipeline,
    handleStreamComplete,
    runCompile,
    runTest,
    recentSessions,
  };
}
