"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
  type AppendMessage,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { BackendApi, type SessionMessagePayload } from "@/lib/backend-api";

function convertMessage(msg: SessionMessagePayload): ThreadMessageLike {
  const role = msg.sender === "user" ? "user" : "assistant";
  const content = [];

  if (msg.content) {
    content.push({ type: "text" as const, text: msg.content });
  }

  if (msg.tool_stream) {
    // Handle tool call as a proper tool-call content part
    if (Array.isArray(msg.tool_stream) && msg.tool_stream.length === 2) {
      // Format: [toolName, argsJSON]
      const [toolTopic, resultContent] = msg.tool_stream;
      content.push({
        type: "tool-call" as const,
        toolCallId: `tool_${Date.now()}`, // Generate unique ID
        toolName: toolTopic,
        args: undefined, // No args yet during streaming
        result: (() => {
            try {
              return JSON.parse(resultContent);
            } catch {
              return { args: resultContent };
            }
          })(), 
      });
    } else if (typeof msg.tool_stream === "object") {
      // Format: { topic, content } or custom object
      const toolData = msg.tool_stream as { topic?: unknown; content?: unknown };
      content.push({
        type: "tool-call" as const,
        toolCallId: `tool_${Date.now()}`,
        toolName: String(toolData.topic || "unknown"),
        args: undefined,
        result: toolData.content || toolData,
      });
    }
  }

  return {
    role,
    content: content.length > 0 ? content : [{ type: "text" as const, text: "" }],
    ...(msg.timestamp && { createdAt: new Date(msg.timestamp) }),
  };
}

export function MyRuntimeProvider({
  children,
  backendUrl = "http://localhost:8080",
  sessionId = "default-session",
}: Readonly<{
  children: ReactNode;
  backendUrl?: string;
  sessionId?: string;
}>) {
  const [messages, setMessages] = useState<ThreadMessageLike[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const backendApiRef = useRef(new BackendApi(backendUrl));
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    backendApiRef.current.setBackendUrl(backendUrl);
  }, [backendUrl]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return;

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const state = await backendApiRef.current.fetchState(sessionId);

        if (state.messages) {
          setMessages(state.messages.map(convertMessage));
        }

        if (!state.is_processing) {
          setIsRunning(false);
          stopPolling();
        }
      } catch (error) {
        console.error("Polling error:", error);
        stopPolling();
        setIsRunning(false);
      }
    }, 500);
  }, [sessionId, stopPolling]);

  useEffect(() => {
    const fetchInitialState = async () => {
      try {
        const state = await backendApiRef.current.fetchState(sessionId);
        if (state.messages) {
          setMessages(state.messages.map(convertMessage));
        }
        if (state.is_processing) {
          setIsRunning(true);
          startPolling();
        }
      } catch (error) {
        console.error("Failed to fetch initial state:", error);
      }
    };

    fetchInitialState();

    return () => {
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, backendUrl]);

  const onNew = useCallback(
    async (message: AppendMessage) => {
      const text = message.content
        .filter((part): part is Extract<typeof part, { type: "text" }> => part.type === "text")
        .map((part: Extract<typeof message.content[number], { type: "text" }>) => part.text)
        .join("\n");

      if (!text) return;

      const userMessage: ThreadMessageLike = {
        role: "user",
        content: [{ type: "text", text }],
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsRunning(true);

      try {
        const response = await backendApiRef.current.postChatMessage(sessionId, text);

        if (response.messages) {
          setMessages(response.messages.map(convertMessage));
        }

        if (response.is_processing) {
          startPolling();
        } else {
          setIsRunning(false);
        }
      } catch (error) {
        console.error("Failed to send message:", error);
        setIsRunning(false);

        const errorMessage: ThreadMessageLike = {
          role: "assistant",
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : "Failed to send message"}`,
            },
          ],
          createdAt: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    },
    [sessionId, startPolling]
  );

  const onCancel = useCallback(async () => {
    stopPolling();

    try {
      await backendApiRef.current.postInterrupt(sessionId);
      setIsRunning(false);
    } catch (error) {
      console.error("Failed to cancel:", error);
    }
  }, [sessionId, stopPolling]);

  const runtime = useExternalStoreRuntime({
    messages,
    setMessages: (msgs) => setMessages([...msgs]),
    isRunning,
    onNew,
    onCancel,
    convertMessage: (msg) => msg,
  });

  return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>;
}
