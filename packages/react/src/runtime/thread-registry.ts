import type { Dispatch, SetStateAction } from "react";
import type { ThreadMessageLike } from "@assistant-ui/react";

import type { ThreadMetadata } from "../state/types";
import type { ThreadStateStore } from "./thread-store";
import { createThreadState } from "./thread-store";

type ThreadStateAccess = {
  getThreadMessages: (threadId: string) => ThreadMessageLike[];
  setThreadMessages: (threadId: string, messages: ThreadMessageLike[]) => void;
  updateThreadMetadata: (threadId: string, updates: Partial<ThreadMetadata>) => void;
  setThreadMetadata: Dispatch<SetStateAction<Map<string, ThreadMetadata>>>;
  setThreads: Dispatch<SetStateAction<Map<string, ThreadMessageLike[]>>>;
  setThreadCnt: Dispatch<SetStateAction<number>>;
  threadCnt: number;
  threadMetadata: Map<string, ThreadMetadata>;
  getCurrentThreadId: () => string;
  setCurrentThreadId: (id: string) => void;
};

export type ThreadListAdapterApi = {
  getCurrentThreadId: () => string;
  setCurrentThreadId: (id: string) => void;
  threadMetadata: Map<string, ThreadMetadata>;
  setThreadMetadata: Dispatch<SetStateAction<Map<string, ThreadMetadata>>>;
  setThreads: Dispatch<SetStateAction<Map<string, ThreadMessageLike[]>>>;
  setThreadMessages: (threadId: string, messages: ThreadMessageLike[]) => void;
  updateThreadMetadata: (threadId: string, updates: Partial<ThreadMetadata>) => void;
  threadCnt: number;
  setThreadCnt: Dispatch<SetStateAction<number>>;
};

export class ThreadRegistry {
  private stores = new Map<string, ThreadStateStore>();
  private tempToBackendId = new Map<string, string>();
  private skipInitialFetch = new Set<string>();
  private isRunningByThread = new Map<string, boolean>();
  private pendingChat = new Map<string, string[]>();
  private pendingSystem = new Map<string, string[]>();

  private readonly threadListApi: ThreadListAdapterApi;

  constructor(private readonly deps: ThreadStateAccess) {
    this.threadListApi = {
      getCurrentThreadId: () => this.deps.getCurrentThreadId(),
      setCurrentThreadId: (id: string) => this.deps.setCurrentThreadId(id),
      threadMetadata: this.deps.threadMetadata,
      setThreadMetadata: this.deps.setThreadMetadata,
      setThreads: this.deps.setThreads,
      setThreadMessages: (threadId: string, messages: ThreadMessageLike[]) =>
        this.deps.setThreadMessages(threadId, messages),
      updateThreadMetadata: (threadId: string, updates: Partial<ThreadMetadata>) =>
        this.deps.updateThreadMetadata(threadId, updates),
      threadCnt: this.deps.threadCnt,
      setThreadCnt: this.deps.setThreadCnt,
    };
  }

  getThreadListApi(): ThreadListAdapterApi {
    return this.threadListApi;
  }

  ensure(threadId: string, metadata?: Partial<ThreadMetadata>): ThreadStateStore {
    if (!this.stores.has(threadId)) {
      const messages = this.deps.getThreadMessages(threadId);
      const meta = this.deps.threadMetadata.get(threadId);
      const store = createThreadState(threadId, meta ?? metadata, messages);
      this.stores.set(threadId, store);
    }
    return this.stores.get(threadId)!;
  }

  get(threadId: string): ThreadStateStore | undefined {
    return this.stores.get(threadId);
  }

  resolveThreadId(threadId: string): string {
    return this.tempToBackendId.get(threadId) ?? threadId;
  }

  setBackendMapping(tempId: string, backendId: string) {
    this.tempToBackendId.set(tempId, backendId);
  }

  findTempIdForBackendId(backendId: string): string | undefined {
    for (const [tempId, id] of this.tempToBackendId.entries()) {
      if (id === backendId) return tempId;
    }
    return undefined;
  }

  getTempToBackendMap() {
    return this.tempToBackendId;
  }

  isThreadReady(threadId: string): boolean {
    if (!threadId.startsWith("temp-")) return true;
    return this.tempToBackendId.has(threadId);
  }

  markSkipInitialFetch(threadId: string) {
    this.skipInitialFetch.add(threadId);
  }

  shouldSkipInitialFetch(threadId: string): boolean {
    return this.skipInitialFetch.has(threadId);
  }

  clearSkipInitialFetch(threadId: string) {
    this.skipInitialFetch.delete(threadId);
  }

  getSkipInitialFetchSet() {
    return this.skipInitialFetch;
  }

  setThreadMessages(threadId: string, messages: ThreadMessageLike[]) {
    this.deps.setThreadMessages(threadId, messages);
    const store = this.ensure(threadId);
    store.messages = messages;
  }

  getThreadMessages(threadId: string): ThreadMessageLike[] {
    const store = this.ensure(threadId);
    store.messages = this.deps.getThreadMessages(threadId);
    return store.messages;
  }

  updateThreadMetadata(threadId: string, updates: Partial<ThreadMetadata>) {
    this.deps.updateThreadMetadata(threadId, updates);
    const store = this.ensure(threadId);
    store.metadata = { ...store.metadata, ...updates };
  }

  setThreadMetadata(updater: Dispatch<SetStateAction<Map<string, ThreadMetadata>>>) {
    this.deps.setThreadMetadata(updater);
  }

  setThreads(updater: Dispatch<SetStateAction<Map<string, ThreadMessageLike[]>>>) {
    this.deps.setThreads(updater);
  }

  getCurrentThreadId(): string {
    return this.deps.getCurrentThreadId();
  }

  setCurrentThreadId(threadId: string) {
    this.deps.setCurrentThreadId(threadId);
  }

  setIsRunning(threadId: string, running: boolean) {
    if (running) {
      this.isRunningByThread.set(threadId, true);
    } else {
      this.isRunningByThread.delete(threadId);
    }
  }

  isRunning(threadId: string): boolean {
    return this.isRunningByThread.get(threadId) ?? false;
  }

  enqueuePendingChat(threadId: string, text: string) {
    const existing = this.pendingChat.get(threadId) ?? [];
    this.pendingChat.set(threadId, [...existing, text]);
  }

  dequeuePendingChat(threadId: string): string[] {
    const pending = this.pendingChat.get(threadId) ?? [];
    this.pendingChat.delete(threadId);
    return pending;
  }

  hasPendingChat(threadId: string): boolean {
    return (this.pendingChat.get(threadId)?.length ?? 0) > 0;
  }

  getPendingChatMap() {
    return this.pendingChat;
  }

  enqueuePendingSystem(threadId: string, text: string) {
    const existing = this.pendingSystem.get(threadId) ?? [];
    this.pendingSystem.set(threadId, [...existing, text]);
  }

  dequeuePendingSystem(threadId: string): string[] {
    const pending = this.pendingSystem.get(threadId) ?? [];
    this.pendingSystem.delete(threadId);
    return pending;
  }

  hasPendingSystem(threadId: string): boolean {
    return (this.pendingSystem.get(threadId)?.length ?? 0) > 0;
  }

  getPendingSystemMap() {
    return this.pendingSystem;
  }
}
