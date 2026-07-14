"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";

import {
  STREAM_TO_JOURNEY,
  defaultStreamTemplate,
  deriveGeneratedFileTree,
  deriveSmithersNodes,
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
import { sanitizeBuildSession } from "@build/features/build/storage/sanitize-session-copy";
import {
  deriveSessionTitle,
  uniqueSessionTitle,
} from "@build/features/build/storage/session-title";

function nowTime() {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function nowStamp() {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
}

const stageMessages: Record<BuildStreamEvent["stage"], string> = {
  plan: "Reading your intent and drafting a build plan.",
  generate: "Generating project files and tool wiring.",
  validate: "Ready for compile and smoke test.",
  ready: "Waiting for compile + smoke test before ship.",
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
      const clean = sanitizeBuildSession(session);
      const healthy = clean.status === "healthy" && clean.stageId === "ship";
      const needsVerify =
        !healthy &&
        (clean.stageId === "compile_test" ||
          clean.status === "running");
      let streamEvents = clean.streamEvents;
      if (needsVerify && streamEvents.length > 0) {
        // Persisted mid-verify runs may wrongly mark Ship done — coerce.
        streamEvents = streamEvents.map((e) => {
          if (e.stage === "plan" || e.stage === "generate") {
            return { ...e, status: "done" as const };
          }
          if (e.stage === "validate") {
            return {
              ...e,
              status: "active" as const,
              message: e.message || "Ready for compile and smoke test.",
            };
          }
          return {
            ...e,
            status: "pending" as const,
            message: e.message || "Waiting for compile + smoke test before ship.",
          };
        });
      }
      setActiveSessionId(sessionId);
      setStageId(healthy ? "ship" : needsVerify ? "compile_test" : clean.stageId);
      setMessages(clean.messages);
      setStreamEvents(streamEvents);
      setFileTree(clean.fileTree);
      setNodes(clean.nodes ?? []);
      setShipReady(healthy);
      setAwaitingVerify(needsVerify);
      setCompileDone(healthy);
      setTestDone(healthy);
      setVerifyBusy(null);
      setShowStreamInThread(false);
      setIsGenerating(false);
      setStreamingMessageId(null);
      sessionDraftRef.current = {
        id: clean.id,
        title: clean.title,
        messages: clean.messages,
        streamEvents,
        fileTree: clean.fileTree,
        nodes: clean.nodes ?? [],
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

  const cancelPipeline = useCallback(() => {
    clearTimers();
    setIsGenerating(false);
    setStreamingMessageId(null);
    setVerifyBusy(null);
    setShowStreamInThread(true);
    setStreamEvents((prev) =>
      prev.map((e) =>
        e.status === "active" ? { ...e, status: "pending" as const } : e,
      ),
    );
    setMessages((prev) => {
      const next: BuildMessage[] = [
        ...prev,
        {
          id: `sys_cancel_${Date.now()}`,
          role: "system",
          content:
            "Stopped. Edit your prompt and run again, or continue compile / smoke test if files already exist.",
          timestamp: nowTime(),
        },
      ];
      if (sessionDraftRef.current) {
        sessionDraftRef.current.messages = next;
      }
      return next;
    });
    if (fileTree.length > 0) {
      setAwaitingVerify(true);
      setStageId("compile_test");
    }
  }, [clearTimers, fileTree.length]);

  const runBuildPipeline = useCallback(
    (userText: string, onAssistantReady: (msg: BuildMessage) => void) => {
      clearTimers();
      const sessionId = `run_${Date.now()}`;
      const title = uniqueSessionTitle(
        deriveSessionTitle(userText),
        recentSessions.map((s) => s.title),
      );
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

      const stages: BuildStreamEvent["stage"][] = ["plan", "generate"];

      let finalMessages: BuildMessage[] = [userMsg];
      let finalStreamEvents = initial;
      let finalFileTree: BuildFileNode[] = [];
      let finalNodes = plannedNodes;

      stages.forEach((stage, index) => {
        const timerId = window.setTimeout(() => {
          setStageId(STREAM_TO_JOURNEY[stage]);

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
            const tree = deriveGeneratedFileTree(userText);
            setFileTree(tree);
            finalFileTree = tree;
            if (sessionDraftRef.current) {
              sessionDraftRef.current.fileTree = finalFileTree;
            }

            // End of generate → enter verify gates (do not mark Ship done).
            setStreamEvents((prev) => {
              finalStreamEvents = prev.map((e) => {
                if (e.stage === "plan" || e.stage === "generate") {
                  return {
                    ...e,
                    status: "done" as const,
                    time: e.time || nowStamp(),
                  };
                }
                if (e.stage === "validate") {
                  return {
                    ...e,
                    status: "active" as const,
                    time: nowStamp(),
                    message: stageMessages.validate,
                  };
                }
                return {
                  ...e,
                  status: "pending" as const,
                  message: stageMessages.ready,
                };
              });
              if (sessionDraftRef.current) {
                sessionDraftRef.current.streamEvents = finalStreamEvents;
              }
              return finalStreamEvents;
            });
            setStageId("compile_test");
            setAwaitingVerify(true);
            setIsGenerating(false);

            const assistantMsg: BuildMessage = {
              id: `a_${Date.now()}`,
              role: "assistant",
              content: mockBuildResponse,
              timestamp: nowTime(),
              model: "Aomi",
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
              model: "Aomi",
              updatedAt: "just now",
              runtime: "local",
              stageId: "compile_test",
              messages: finalMessages,
              streamEvents: finalStreamEvents,
              fileTree:
                finalFileTree.length > 0
                  ? finalFileTree
                  : deriveGeneratedFileTree(userText),
              nodes: finalNodes,
            });
          }
        }, (index + 1) * 700);
        timersRef.current.push(timerId);
      });
    },
    [clearTimers, recentSessions],
  );

  const handleStreamComplete = useCallback(() => {
    setIsGenerating(false);
    setStreamingMessageId(null);
    setShowStreamInThread(false);
  }, []);

  const runCompile = useCallback(() => {
    if (compileDone || verifyBusy) return;
    setVerifyBusy("compile");
    setStageId("compile_test");
    const id = window.setTimeout(() => {
      setCompileDone(true);
      setVerifyBusy(null);
      setNodes((prev) =>
        prev.map((n) =>
          n.id === "node_run" ? n : { ...n, status: "done" as const },
        ),
      );
      setStreamEvents((prev) => {
        const next = prev.map((e) => {
          if (e.stage === "validate") {
            return {
              ...e,
              status: "active" as const,
              message: "Compile done — smoke test next.",
              time: e.time || nowStamp(),
            };
          }
          if (e.stage === "ready") {
            return {
              ...e,
              status: "pending" as const,
              message: "Ship after smoke test passes.",
            };
          }
          return e.stage === "plan" || e.stage === "generate"
            ? { ...e, status: "done" as const }
            : e;
        });
        if (sessionDraftRef.current) {
          sessionDraftRef.current.streamEvents = next;
        }
        return next;
      });
    }, 600);
    timersRef.current.push(id);
  }, [compileDone, verifyBusy]);

  const runTest = useCallback(() => {
    if (!compileDone || testDone || verifyBusy) return;
    setVerifyBusy("test");
    setStageId("compile_test");
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
      setStreamEvents((prev) => {
        const next = prev.map((e) => ({
          ...e,
          status: "done" as const,
          message:
            e.stage === "ready"
              ? "Ready to ship — open Projects or download files."
              : e.stage === "validate"
                ? "Compile and smoke test passed."
                : e.message,
          time: e.time || nowStamp(),
        }));
        const draft = sessionDraftRef.current;
        if (draft) {
          const doneNodes = draft.nodes.map((n) => ({
            ...n,
            status: "done" as const,
          }));
          sessionDraftRef.current = {
            ...draft,
            streamEvents: next,
            nodes: doneNodes,
          };
          savePersistedSession({
            id: draft.id,
            title: draft.title,
            status: "healthy",
            model: "Aomi",
            updatedAt: "just now",
            runtime: "local",
            stageId: "ship",
            messages: draft.messages,
            streamEvents: next,
            fileTree: draft.fileTree,
            nodes: doneNodes,
          });
        }
        return next;
      });
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
    cancelPipeline,
    runBuildPipeline,
    handleStreamComplete,
    runCompile,
    runTest,
    recentSessions,
  };
}
