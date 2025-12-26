"use client";

import { createContext, useContext } from "react";
import type { ThreadMessageLike } from "@assistant-ui/react";
import type { ThreadMetadata } from "../state/types";

export type AomiRuntimeApi = {
  sendSystemMessage: (message: string) => Promise<void>;
  sendChatMessage: (message: string) => Promise<void>;
  getThreadMessages: (threadId: string) => ThreadMessageLike[];
  getThreadMetadata: (threadId: string) => ThreadMetadata | undefined;
  getAllMetadatas: () => ThreadMetadata[];
  getAllThreads: () => Map<string, ThreadMessageLike[]>;
};

const AomiRuntimeApiContext = createContext<AomiRuntimeApi | undefined>(undefined);

export const AomiRuntimeApiProvider = AomiRuntimeApiContext.Provider;

export function useRuntimeActions(): AomiRuntimeApi {
  const context = useContext(AomiRuntimeApiContext);
  if (!context) {
    throw new Error("useRuntimeActions must be used within AomiRuntimeProvider");
  }
  return context;
}

