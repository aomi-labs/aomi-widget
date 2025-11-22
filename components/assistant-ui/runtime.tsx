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
import { BackendApi, type SessionMessage } from "@/lib/backend-api";
import { constructNotification, constructThreadMessage } from "@/lib/conversion";

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


  const applyMessages = useCallback((msgs?: SessionMessage[] | null) => {
    if (!msgs) return;

    const threadMessages: ThreadMessageLike[] = [];
    let latestNotification: SystemNotification = null;

    for (const msg of msgs) {
      if (msg.sender === "system") {
        const notif = constructNotification(msg);
        if (notif?.message) {
          latestNotification = notif;
        }
        continue;
      }
      threadMessages.push(constructThreadMessage(msg));
    }

    setMessages(threadMessages);
    if (latestNotification) {
      setSystemNotification(latestNotification);
    }
  }, []);


  useEffect(() => {
    backendApiRef.current = new BackendApi(backendUrl);
  }, [backendUrl]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return;
    setIsRunning(true);
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


  const syncState = useCallback(async () => {
    try {
      const state = await backendApiRef.current.fetchState(sessionId);
      applyMessages(state.messages);
      if (state.is_processing) {
        startPolling();
      } else {
        setIsRunning(false);
      }
    } catch (error) {
      console.error("Polling error:", error);
    }
  }, [applyMessages, sessionId, startPolling]);


  // Initialization
  useEffect(() => {
    void syncState();
    return () => {
      stopPolling();
    };
  }, [sessionId, backendUrl, stopPolling, syncState]);


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

      try {
        setIsRunning(true);
        await backendApiRef.current.postChatMessage(sessionId, text);
        await syncState();
      } catch (error) {
        console.error("Failed to send message:", error);
        setIsRunning(false);
      }
    },
    [sessionId, syncState]
  );

  const sendSystemMessage = useCallback(
    async (message: string) => {
      setIsRunning(true);
      try {
        const response = await backendApiRef.current.postSystemMessage(
          sessionId,
          message,
        );

        if (response.res) {
          const notification = constructNotification(response.res);
          if (notification?.message) {
            setSystemNotification(notification);
          }
        }

        startPolling();
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

    console.log("Wallet effect", { isConnected, address, chainId, prev });

    if (isConnected && normalizedAddress && numericChainId) {
      const networkName = getNetworkName(numericChainId);

      const addressChanged = prev.address !== normalizedAddress;
      const shouldConnect = !prev.isConnected || addressChanged;

      if (shouldConnect) {
        const message = `User connected wallet with address ${normalizedAddress} on ${networkName} network (Chain ID: ${numericChainId}). Ready to help with transactions.`;
        void sendSystemMessage(message);
      } else if (prev.chainId !== numericChainId) {
        const message = `User switched wallet to ${networkName} network (Chain ID: ${numericChainId}).`;
        void sendSystemMessage(message);
      }

      lastWalletRef.current = {
        isConnected: true,
        address: normalizedAddress,
        chainId: numericChainId,
      };
    } else if (!isConnected && prev.isConnected) {
      
      void sendSystemMessage("Wallet disconnected by user.");
      lastWalletRef.current = { isConnected: false };
    }
  }, [address, chainId, isConnected, sendSystemMessage]);

  return (
    <SystemNotificationContext.Provider value={systemNotification}>
      <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>
    </SystemNotificationContext.Provider>
  );
}
