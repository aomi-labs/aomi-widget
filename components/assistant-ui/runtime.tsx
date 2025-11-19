"use client";

import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
  type AppendMessage,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import {
  BackendApi,
  type SessionMessagePayload,
  type SystemCommand,
} from "@/lib/backend-api";

type SystemNotification = {
  message: string;
  timestamp?: Date;
} | null;

const SystemNotificationContext = createContext<SystemNotification | undefined>(undefined);

export const useSystemNotification = () => {
  const context = useContext(SystemNotificationContext);
  if (context === undefined) {
    throw new Error("useSystemNotification must be used within AomiRuntimeProvider");
  }
  return context;
};

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

export function AomiRuntimeProvider({
  children,
  backendUrl = "http://localhost:8080",
  sessionId = "default-session",
}: Readonly<{
  children: ReactNode;
  backendUrl?: string;
  sessionId?: string;
}>) {
  const { address, isConnected } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();
  const [messages, setMessages] = useState<ThreadMessageLike[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [systemNotification, setSystemNotification] = useState<SystemNotification>(null);
  const backendApiRef = useRef(new BackendApi(backendUrl));
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastWalletRef = useRef<{
    isConnected: boolean;
    address?: string;
    chainId?: number;
  }>({ isConnected: false });

  useEffect(() => {
    backendApiRef.current = new BackendApi(backendUrl);
  }, [backendUrl]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const applyMessages = useCallback((msgs?: SessionMessagePayload[] | null) => {
    if (!msgs) return;
    setMessages(msgs.map(convertMessage));
  }, []);

  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return;

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const state = await backendApiRef.current.fetchState(sessionId);
        applyMessages(state.messages);

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
  }, [applyMessages, sessionId, stopPolling]);

  useEffect(() => {
    const fetchInitialState = async () => {
      try {
        const state = await backendApiRef.current.fetchState(sessionId);
        applyMessages(state.messages);
        if (state.is_processing) {
          setIsRunning(true);
          startPolling();
        } else {
          setIsRunning(false);
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
        applyMessages(response.messages);

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

  const sendSystemMessage = useCallback(
    async (command: SystemCommand) => {
      console.log("System command:", command);
      setIsRunning(true);

      try {
        setSystemNotification({
          message: command.notification,
          timestamp: new Date(),
        });

        await backendApiRef.current.postSystemMessage(
          sessionId,
          command.message_to_backend,
        );
        startPolling();
        setIsRunning(false);
      } catch (error) {
        console.error("Failed to send system message:", error);
        setIsRunning(false);

        const errorMessage: ThreadMessageLike = {
          role: "assistant",
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : "Failed to send system message"}`,
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

  useEffect(() => {
    const getNetworkName = (id: number): string => {
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

    const prev = lastWalletRef.current;
    const normalizedAddress = address?.toLowerCase();
    const numericChainId =
      typeof chainId === "string" ? Number(chainId) : chainId;

    if (isConnected && normalizedAddress && numericChainId) {
      const networkName = getNetworkName(numericChainId);

      const addressChanged = prev.address !== normalizedAddress;
      const shouldConnect = !prev.isConnected || addressChanged;

      if (shouldConnect) {
        void sendSystemMessage({
          message_to_backend: `User connected wallet with address ${normalizedAddress} on ${networkName} network (Chain ID: ${numericChainId}). Ready to help with transactions.`,
          notification: `Wallet connected to ${networkName}`,
        });
      } else if (prev.chainId !== numericChainId) {
        void sendSystemMessage({
          message_to_backend: `User switched wallet to ${networkName} network (Chain ID: ${numericChainId}).`,
          notification: `Wallet switched to ${networkName}`,
        });
      }

      lastWalletRef.current = {
        isConnected: true,
        address: normalizedAddress,
        chainId: numericChainId,
      };
    } else if (!isConnected && prev.isConnected) {
      void sendSystemMessage({
        message_to_backend: "Wallet disconnected by user.",
        notification: "Wallet disconnected",
      });
      lastWalletRef.current = { isConnected: false };
    }
  }, [address, chainId, isConnected, sendSystemMessage]);

  return (
    <SystemNotificationContext.Provider value={systemNotification}>
      <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>
    </SystemNotificationContext.Provider>
  );
}
