var __defProp = Object.defineProperty;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};

// src/api/client.ts
function toQueryString(payload) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(payload)) {
    if (value === void 0 || value === null) continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
async function postState(backendUrl, path, payload) {
  const query = toQueryString(payload);
  const url = `${backendUrl}${path}${query}`;
  console.log("\u{1F535} [postState] URL:", url);
  console.log("\u{1F535} [postState] Payload:", payload);
  const response = await fetch(url, {
    method: "POST"
  });
  console.log("\u{1F535} [postState] Response status:", response.status);
  if (!response.ok) {
    console.error("\u{1F534} [postState] Error:", response.status, response.statusText);
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  const data = await response.json();
  console.log("\u{1F7E2} [postState] Success:", data);
  return data;
}
var BackendApi = class {
  constructor(backendUrl) {
    this.backendUrl = backendUrl;
    this.connectionStatus = false;
    this.eventSource = null;
    this.updatesEventSource = null;
  }
  async fetchState(sessionId) {
    console.log("\u{1F535} [fetchState] Called with sessionId:", sessionId);
    const url = `${this.backendUrl}/api/state?session_id=${encodeURIComponent(sessionId)}`;
    console.log("\u{1F535} [fetchState] URL:", url);
    const response = await fetch(url);
    console.log("\u{1F535} [fetchState] Response status:", response.status, response.statusText);
    if (!response.ok) {
      console.error("\u{1F534} [fetchState] Error:", response.status, response.statusText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    console.log("\u{1F7E2} [fetchState] Success:", data);
    return data;
  }
  async postChatMessage(sessionId, message) {
    console.log("\u{1F535} [postChatMessage] Called with sessionId:", sessionId, "message:", message);
    const result = await postState(this.backendUrl, "/api/chat", {
      message,
      session_id: sessionId
    });
    console.log("\u{1F7E2} [postChatMessage] Success:", result);
    return result;
  }
  async postSystemMessage(sessionId, message) {
    console.log("\u{1F535} [postSystemMessage] Called with sessionId:", sessionId, "message:", message);
    const result = await postState(this.backendUrl, "/api/system", {
      message,
      session_id: sessionId
    });
    console.log("\u{1F7E2} [postSystemMessage] Success:", result);
    return result;
  }
  async postInterrupt(sessionId) {
    console.log("\u{1F535} [postInterrupt] Called with sessionId:", sessionId);
    const result = await postState(this.backendUrl, "/api/interrupt", {
      session_id: sessionId
    });
    console.log("\u{1F7E2} [postInterrupt] Success:", result);
    return result;
  }
  disconnectSSE() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.setConnectionStatus(false);
  }
  setConnectionStatus(on) {
    this.connectionStatus = on;
  }
  async connectSSE(sessionId, publicKey) {
    this.disconnectSSE();
    try {
      const url = new URL(`${this.backendUrl}/api/chat/stream`);
      url.searchParams.set("session_id", sessionId);
      if (publicKey) {
        url.searchParams.set("public_key", publicKey);
      }
      this.eventSource = new EventSource(url.toString());
      this.eventSource.onopen = () => {
        console.log("\u{1F310} SSE connection opened to:", url.toString());
        this.setConnectionStatus(true);
      };
      this.eventSource.onmessage = (event) => {
        try {
          JSON.parse(event.data);
        } catch (error) {
          console.error("Failed to parse SSE data:", error);
        }
      };
      this.eventSource.onerror = (error) => {
        console.error("SSE connection error:", error);
      };
    } catch (error) {
      console.error("Failed to establish SSE connection:", error);
      this.handleConnectionError(sessionId, publicKey);
    }
  }
  handleConnectionError(sessionId, publicKey) {
    this.setConnectionStatus(false);
    let attempt = 0;
    const total = 3;
    if (attempt < total) {
      attempt++;
      console.log(`Attempting to reconnect (${attempt}/${total})...`);
      setTimeout(() => {
        this.connectSSE(sessionId, publicKey);
      }, 100);
    } else {
      console.error("Max reconnection attempts reached");
      this.setConnectionStatus(false);
    }
  }
  subscribeToUpdates(onUpdate, onError) {
    if (this.updatesEventSource) {
      this.updatesEventSource.close();
    }
    const updatesUrl = new URL("/api/updates", this.backendUrl).toString();
    this.updatesEventSource = new EventSource(updatesUrl);
    this.updatesEventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        onUpdate(parsed);
      } catch (error) {
        console.error("Failed to parse system update SSE:", error);
        onError == null ? void 0 : onError(error);
      }
    };
    this.updatesEventSource.onerror = (error) => {
      console.error("System updates SSE error:", error);
      onError == null ? void 0 : onError(error);
    };
    return () => {
      if (this.updatesEventSource) {
        this.updatesEventSource.close();
        this.updatesEventSource = null;
      }
    };
  }
  async fetchThreads(publicKey) {
    console.log("\u{1F535} [fetchThreads] Called with publicKey:", publicKey);
    const url = `${this.backendUrl}/api/sessions?public_key=${encodeURIComponent(publicKey)}`;
    console.log("\u{1F535} [fetchThreads] URL:", url);
    const response = await fetch(url);
    console.log("\u{1F535} [fetchThreads] Response status:", response.status);
    if (!response.ok) {
      console.error("\u{1F534} [fetchThreads] Error:", response.status);
      throw new Error(`Failed to fetch threads: HTTP ${response.status}`);
    }
    const data = await response.json();
    console.log("\u{1F7E2} [fetchThreads] Success:", data);
    return data;
  }
  async createThread(publicKey, title) {
    console.log("\u{1F535} [createThread] Called with publicKey:", publicKey, "title:", title);
    const body = {};
    if (publicKey) {
      body.public_key = publicKey;
    }
    if (title) {
      body.title = title;
    }
    console.log("\u{1F535} [createThread] Request body:", body);
    const url = `${this.backendUrl}/api/sessions`;
    console.log("\u{1F535} [createThread] URL:", url);
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    console.log("\u{1F535} [createThread] Response status:", response.status);
    if (!response.ok) {
      console.error("\u{1F534} [createThread] Error:", response.status);
      throw new Error(`Failed to create thread: HTTP ${response.status}`);
    }
    const data = await response.json();
    console.log("\u{1F7E2} [createThread] Success:", data);
    return data;
  }
  async archiveThread(sessionId) {
    console.log("\u{1F535} [archiveThread] Called with sessionId:", sessionId);
    const url = `${this.backendUrl}/api/sessions/${encodeURIComponent(sessionId)}/archive`;
    console.log("\u{1F535} [archiveThread] URL:", url);
    const response = await fetch(url, { method: "POST" });
    console.log("\u{1F535} [archiveThread] Response status:", response.status);
    if (!response.ok) {
      console.error("\u{1F534} [archiveThread] Error:", response.status);
      throw new Error(`Failed to archive thread: HTTP ${response.status}`);
    }
    console.log("\u{1F7E2} [archiveThread] Success");
  }
  async unarchiveThread(sessionId) {
    console.log("\u{1F535} [unarchiveThread] Called with sessionId:", sessionId);
    const url = `${this.backendUrl}/api/sessions/${encodeURIComponent(sessionId)}/unarchive`;
    console.log("\u{1F535} [unarchiveThread] URL:", url);
    const response = await fetch(url, { method: "POST" });
    console.log("\u{1F535} [unarchiveThread] Response status:", response.status);
    if (!response.ok) {
      console.error("\u{1F534} [unarchiveThread] Error:", response.status);
      throw new Error(`Failed to unarchive thread: HTTP ${response.status}`);
    }
    console.log("\u{1F7E2} [unarchiveThread] Success");
  }
  async deleteThread(sessionId) {
    console.log("\u{1F535} [deleteThread] Called with sessionId:", sessionId);
    const url = `${this.backendUrl}/api/sessions/${encodeURIComponent(sessionId)}`;
    console.log("\u{1F535} [deleteThread] URL:", url);
    const response = await fetch(url, { method: "DELETE" });
    console.log("\u{1F535} [deleteThread] Response status:", response.status);
    if (!response.ok) {
      console.error("\u{1F534} [deleteThread] Error:", response.status);
      throw new Error(`Failed to delete thread: HTTP ${response.status}`);
    }
    console.log("\u{1F7E2} [deleteThread] Success");
  }
  async renameThread(sessionId, newTitle) {
    console.log("\u{1F535} [renameThread] Called with sessionId:", sessionId, "newTitle:", newTitle);
    const url = `${this.backendUrl}/api/sessions/${encodeURIComponent(sessionId)}`;
    console.log("\u{1F535} [renameThread] URL:", url);
    const response = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle })
    });
    console.log("\u{1F535} [renameThread] Response status:", response.status);
    if (!response.ok) {
      console.error("\u{1F534} [renameThread] Error:", response.status);
      throw new Error(`Failed to rename thread: HTTP ${response.status}`);
    }
    console.log("\u{1F7E2} [renameThread] Success");
  }
};

// src/runtime/aomi-runtime.tsx
import { useCallback as useCallback2, useEffect, useMemo, useRef, useState as useState2 } from "react";
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime
} from "@assistant-ui/react";

// src/utils/conversion.ts
function constructThreadMessage(msg) {
  var _a;
  if (msg.sender === "system") return null;
  const content = [];
  const role = msg.sender === "user" ? "user" : "assistant";
  if (msg.content) {
    content.push({ type: "text", text: msg.content });
  }
  const [topic, toolContent] = (_a = parseToolStream(msg.tool_stream)) != null ? _a : [];
  if (topic && toolContent) {
    content.push({
      type: "tool-call",
      toolCallId: `tool_${Date.now()}`,
      toolName: topic,
      args: void 0,
      result: (() => {
        try {
          return JSON.parse(toolContent);
        } catch (e) {
          return { args: toolContent };
        }
      })()
    });
  }
  const threadMessage = __spreadValues({
    role,
    content: content.length > 0 ? content : [{ type: "text", text: "" }]
  }, msg.timestamp && { createdAt: new Date(msg.timestamp) });
  return threadMessage;
}
function constructSystemMessage(msg) {
  var _a;
  const [topic] = (_a = parseToolStream(msg.tool_stream)) != null ? _a : [];
  const messageText = topic || msg.content || "";
  const timestamp = parseTimestamp(msg.timestamp);
  if (!messageText.trim()) return null;
  return __spreadValues({
    role: "system",
    content: [{ type: "text", text: messageText }]
  }, timestamp && { createdAt: timestamp });
}
function parseTimestamp(timestamp) {
  if (!timestamp) return void 0;
  const parsed = new Date(timestamp);
  return Number.isNaN(parsed.valueOf()) ? void 0 : parsed;
}
function parseToolStream(toolStream) {
  if (!toolStream) return null;
  if (Array.isArray(toolStream) && toolStream.length === 2) {
    const [topic, content] = toolStream;
    return [String(topic), content];
  }
  if (typeof toolStream === "object") {
    const topic = toolStream.topic;
    const content = toolStream.content;
    return topic ? [String(topic), String(content)] : null;
  }
  return null;
}

// src/runtime/message-handlers.ts
function createMessageHandlers({
  backendApiRef,
  resolveThreadId,
  getThreadMessages,
  setThreadMessages,
  setIsRunning,
  startPolling,
  stopPolling,
  isThreadReady,
  pendingSystemMessagesRef,
  pendingChatMessagesRef,
  updateThreadMetadata,
  getCurrentThreadId,
  getCurrentMessages
}) {
  const sendSystemMessageNow = async (threadId, message) => {
    const backendThreadId = resolveThreadId(threadId);
    setIsRunning(true);
    try {
      const response = await backendApiRef.current.postSystemMessage(backendThreadId, message);
      if (response.res) {
        const systemMessage = constructSystemMessage(response.res);
        if (systemMessage) {
          const updatedMessages = [...getThreadMessages(threadId), systemMessage];
          setThreadMessages(threadId, updatedMessages);
        }
      }
      await startPolling();
    } catch (error) {
      console.error("Failed to send system message:", error);
      setIsRunning(false);
    }
  };
  const flushPendingSystemMessages = async (threadId) => {
    const pending = pendingSystemMessagesRef.current.get(threadId);
    if (!(pending == null ? void 0 : pending.length)) return;
    pendingSystemMessagesRef.current.delete(threadId);
    for (const pendingMessage of pending) {
      await sendSystemMessageNow(threadId, pendingMessage);
    }
  };
  const flushPendingChatMessages = async (threadId) => {
    const pending = pendingChatMessagesRef.current.get(threadId);
    if (!(pending == null ? void 0 : pending.length)) return;
    pendingChatMessagesRef.current.delete(threadId);
    const backendThreadId = resolveThreadId(threadId);
    for (const text of pending) {
      try {
        await backendApiRef.current.postChatMessage(backendThreadId, text);
      } catch (error) {
        console.error("Failed to send queued message:", error);
      }
    }
    startPolling();
  };
  const onNew = async (message) => {
    const text = message.content.filter((part) => part.type === "text").map((part) => part.text).join("\n");
    if (!text) return;
    const threadId = getCurrentThreadId();
    const currentMessages = getCurrentMessages();
    const userMessage = {
      role: "user",
      content: [{ type: "text", text }],
      createdAt: /* @__PURE__ */ new Date()
    };
    setThreadMessages(threadId, [...currentMessages, userMessage]);
    updateThreadMetadata(threadId, { lastActiveAt: (/* @__PURE__ */ new Date()).toISOString() });
    if (!isThreadReady(threadId)) {
      console.log("Thread not ready yet; queuing message for later delivery.");
      setIsRunning(true);
      const pending = pendingChatMessagesRef.current.get(threadId) || [];
      pendingChatMessagesRef.current.set(threadId, [...pending, text]);
      return;
    }
    const backendThreadId = resolveThreadId(threadId);
    try {
      setIsRunning(true);
      await backendApiRef.current.postChatMessage(backendThreadId, text);
      await flushPendingSystemMessages(threadId);
      startPolling();
    } catch (error) {
      console.error("Failed to send message:", error);
      setIsRunning(false);
    }
  };
  const sendSystemMessage = async (message) => {
    const threadId = getCurrentThreadId();
    if (!isThreadReady(threadId)) return;
    const threadMessages = getThreadMessages(threadId);
    const hasUserMessages = threadMessages.some((msg) => msg.role === "user");
    if (!hasUserMessages) {
      const pending = pendingSystemMessagesRef.current.get(threadId) || [];
      pendingSystemMessagesRef.current.set(threadId, [...pending, message]);
      return;
    }
    await sendSystemMessageNow(threadId, message);
  };
  const onCancel = async () => {
    const threadId = getCurrentThreadId();
    if (!isThreadReady(threadId)) return;
    stopPolling();
    const backendThreadId = resolveThreadId(threadId);
    try {
      await backendApiRef.current.postInterrupt(backendThreadId);
      setIsRunning(false);
    } catch (error) {
      console.error("Failed to cancel:", error);
    }
  };
  return {
    onNew,
    onCancel,
    sendSystemMessage,
    sendSystemMessageNow,
    flushPendingSystemMessages,
    flushPendingChatMessages
  };
}

// src/runtime/polling.ts
function createPollingController({
  backendApiRef,
  pollingIntervalRef,
  resolveThreadId,
  applyMessages,
  isThreadReady,
  currentThreadIdRef,
  setIsRunning
}) {
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };
  const startPolling = () => {
    const threadId = currentThreadIdRef.current;
    if (!isThreadReady(threadId)) return;
    if (pollingIntervalRef.current) return;
    const backendThreadId = resolveThreadId(threadId);
    setIsRunning(true);
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const state = await backendApiRef.current.fetchState(backendThreadId);
        if (state.session_exists === false) {
          setIsRunning(false);
          stopPolling();
          return;
        }
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
  };
  return { startPolling, stopPolling };
}

// src/runtime/utils.ts
var isTempThreadId = (id) => id.startsWith("temp-");
var parseTimestamp2 = (value) => {
  if (value === void 0 || value === null) return 0;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value < 1e12 ? value * 1e3 : value : 0;
  }
  const numeric = Number(value);
  if (!Number.isNaN(numeric)) {
    return numeric < 1e12 ? numeric * 1e3 : numeric;
  }
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? 0 : ts;
};
var isPlaceholderTitle = (title) => {
  var _a;
  const normalized = (_a = title == null ? void 0 : title.trim()) != null ? _a : "";
  return !normalized || normalized.startsWith("#[");
};

// src/runtime/thread-list-adapter.ts
function normalizeBackendThreads(threads, existingMetadata, threadCnt) {
  var _a;
  const newMetadata = new Map(existingMetadata);
  let maxChatNum = threadCnt;
  for (const thread of threads) {
    const rawTitle = thread.title || "New Chat";
    const title = isPlaceholderTitle(rawTitle) ? "" : rawTitle;
    const lastActive = thread.last_active_at || thread.updated_at || thread.created_at || ((_a = newMetadata.get(thread.session_id)) == null ? void 0 : _a.lastActiveAt) || (/* @__PURE__ */ new Date()).toISOString();
    newMetadata.set(thread.session_id, {
      title,
      status: thread.is_archived ? "archived" : "regular",
      lastActiveAt: lastActive
    });
    const match = title.match(/^Chat (\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxChatNum) {
        maxChatNum = num;
      }
    }
  }
  return { metadata: newMetadata, maxChatNum };
}
function createThreadListAdapter({
  currentThreadId,
  currentThreadIdRef,
  threadMetadata,
  setThreadMetadata,
  setThreads,
  setThreadMessages,
  setCurrentThreadId,
  setIsRunning,
  bumpThreadViewKey,
  findPendingThreadId,
  creatingThreadIdRef,
  createThreadPromiseRef,
  pendingChatMessagesRef,
  pendingSystemMessagesRef,
  tempToBackendIdRef,
  skipInitialFetchRef,
  backendApiRef,
  publicKey,
  threadCnt,
  setThreadCnt,
  resolveThreadId,
  startPolling,
  updateThreadMetadata
}) {
  const sortByLastActiveDesc = ([, metaA], [, metaB]) => {
    const tsA = parseTimestamp2(metaA.lastActiveAt);
    const tsB = parseTimestamp2(metaB.lastActiveAt);
    return tsB - tsA;
  };
  const regularThreads = Array.from(threadMetadata.entries()).filter(([_, meta]) => meta.status === "regular").filter(([_, meta]) => !isPlaceholderTitle(meta.title)).sort(sortByLastActiveDesc).map(([id, meta]) => ({
    id,
    title: meta.title || "New Chat",
    status: "regular"
  }));
  const archivedThreadsArray = Array.from(threadMetadata.entries()).filter(([_, meta]) => meta.status === "archived").filter(([_, meta]) => !isPlaceholderTitle(meta.title)).sort(sortByLastActiveDesc).map(([id, meta]) => ({
    id,
    title: meta.title || "New Chat",
    status: "archived"
  }));
  return {
    threadId: currentThreadId,
    threads: regularThreads,
    archivedThreads: archivedThreadsArray,
    onSwitchToNewThread: async () => {
      var _a;
      const preparePendingThread = (newId) => {
        const previousPendingId = creatingThreadIdRef.current;
        if (previousPendingId && previousPendingId !== newId) {
          setThreadMetadata((prev) => {
            const next = new Map(prev);
            next.delete(previousPendingId);
            return next;
          });
          setThreads((prev) => {
            const next = new Map(prev);
            next.delete(previousPendingId);
            return next;
          });
          pendingChatMessagesRef.current.delete(previousPendingId);
          pendingSystemMessagesRef.current.delete(previousPendingId);
          tempToBackendIdRef.current.delete(previousPendingId);
          skipInitialFetchRef.current.delete(previousPendingId);
        }
        creatingThreadIdRef.current = newId;
        pendingChatMessagesRef.current.delete(newId);
        pendingSystemMessagesRef.current.delete(newId);
        setThreadMetadata(
          (prev) => new Map(prev).set(newId, {
            title: "New Chat",
            status: "pending",
            lastActiveAt: (/* @__PURE__ */ new Date()).toISOString()
          })
        );
        setThreadMessages(newId, []);
        setCurrentThreadId(newId);
        setIsRunning(false);
        bumpThreadViewKey();
      };
      const existingPendingId = findPendingThreadId();
      if (existingPendingId) {
        preparePendingThread(existingPendingId);
        return;
      }
      if (createThreadPromiseRef.current) {
        preparePendingThread((_a = creatingThreadIdRef.current) != null ? _a : `temp-${crypto.randomUUID()}`);
        return;
      }
      const tempId = `temp-${crypto.randomUUID()}`;
      preparePendingThread(tempId);
      const createPromise = backendApiRef.current.createThread(publicKey, void 0).then(async (newThread) => {
        var _a2;
        const uiThreadId = (_a2 = creatingThreadIdRef.current) != null ? _a2 : tempId;
        const backendId = newThread.session_id;
        tempToBackendIdRef.current.set(uiThreadId, backendId);
        skipInitialFetchRef.current.add(uiThreadId);
        const backendTitle = newThread.title;
        if (backendTitle && !isPlaceholderTitle(backendTitle)) {
          setThreadMetadata((prev) => {
            var _a3;
            const next = new Map(prev);
            const existing = next.get(uiThreadId);
            const nextStatus = (existing == null ? void 0 : existing.status) === "archived" ? "archived" : "regular";
            next.set(uiThreadId, {
              title: backendTitle,
              status: nextStatus,
              lastActiveAt: (_a3 = existing == null ? void 0 : existing.lastActiveAt) != null ? _a3 : (/* @__PURE__ */ new Date()).toISOString()
            });
            return next;
          });
          if (creatingThreadIdRef.current === uiThreadId) {
            creatingThreadIdRef.current = null;
          }
        }
        const pendingMessages = pendingChatMessagesRef.current.get(uiThreadId);
        if (pendingMessages == null ? void 0 : pendingMessages.length) {
          pendingChatMessagesRef.current.delete(uiThreadId);
          for (const text of pendingMessages) {
            try {
              await backendApiRef.current.postChatMessage(backendId, text);
            } catch (error) {
              console.error("Failed to send queued message:", error);
            }
          }
          if (currentThreadIdRef.current === uiThreadId) {
            startPolling();
          }
        }
      }).catch((error) => {
        var _a2;
        console.error("Failed to create new thread:", error);
        const failedId = (_a2 = creatingThreadIdRef.current) != null ? _a2 : tempId;
        setThreadMetadata((prev) => {
          const next = new Map(prev);
          next.delete(failedId);
          return next;
        });
        setThreads((prev) => {
          const next = new Map(prev);
          next.delete(failedId);
          return next;
        });
        if (creatingThreadIdRef.current === failedId) {
          creatingThreadIdRef.current = null;
        }
      }).finally(() => {
        createThreadPromiseRef.current = null;
      });
      createThreadPromiseRef.current = createPromise;
    },
    onSwitchToThread: (threadId) => {
      setCurrentThreadId(threadId);
    },
    onRename: async (threadId, newTitle) => {
      updateThreadMetadata(threadId, { title: isPlaceholderTitle(newTitle) ? "" : newTitle });
      try {
        await backendApiRef.current.renameThread(threadId, newTitle);
      } catch (error) {
        console.error("Failed to rename thread:", error);
      }
    },
    onArchive: async (threadId) => {
      updateThreadMetadata(threadId, { status: "archived" });
      try {
        await backendApiRef.current.archiveThread(threadId);
      } catch (error) {
        console.error("Failed to archive thread:", error);
        updateThreadMetadata(threadId, { status: "regular" });
      }
    },
    onUnarchive: async (threadId) => {
      updateThreadMetadata(threadId, { status: "regular" });
      try {
        await backendApiRef.current.unarchiveThread(threadId);
      } catch (error) {
        console.error("Failed to unarchive thread:", error);
        updateThreadMetadata(threadId, { status: "archived" });
      }
    },
    onDelete: async (threadId) => {
      try {
        await backendApiRef.current.deleteThread(threadId);
        setThreadMetadata((prev) => {
          const next = new Map(prev);
          next.delete(threadId);
          return next;
        });
        setThreads((prev) => {
          const next = new Map(prev);
          next.delete(threadId);
          return next;
        });
        if (currentThreadId === threadId) {
          const firstRegularThread = Array.from(threadMetadata.entries()).find(
            ([id, meta]) => meta.status === "regular" && id !== threadId
          );
          if (firstRegularThread) {
            setCurrentThreadId(firstRegularThread[0]);
          } else {
            const defaultId = "default-session";
            setThreadMetadata(
              (prev) => new Map(prev).set(defaultId, {
                title: "New Chat",
                status: "regular",
                lastActiveAt: (/* @__PURE__ */ new Date()).toISOString()
              })
            );
            setThreadMessages(defaultId, []);
            setCurrentThreadId(defaultId);
          }
        }
      } catch (error) {
        console.error("Failed to delete thread:", error);
        throw error;
      }
    }
  };
}

// src/runtime/hooks.ts
import { createContext, useContext } from "react";
var RuntimeActionsContext = createContext(void 0);
var RuntimeActionsProvider = RuntimeActionsContext.Provider;
function useRuntimeActions() {
  const context = useContext(RuntimeActionsContext);
  if (!context) {
    throw new Error("useRuntimeActions must be used within AomiRuntimeProvider");
  }
  return context;
}

// src/state/thread-context.tsx
import { createContext as createContext2, useCallback, useContext as useContext2, useState } from "react";
import { jsx } from "react/jsx-runtime";
var ThreadContext = createContext2(null);
function useThreadContext() {
  const context = useContext2(ThreadContext);
  if (!context) {
    throw new Error(
      "useThreadContext must be used within ThreadContextProvider. Wrap your app with <ThreadContextProvider>...</ThreadContextProvider>"
    );
  }
  return context;
}
function ThreadContextProvider({
  children,
  initialThreadId
}) {
  const [generateThreadId] = useState(() => {
    const id = initialThreadId || crypto.randomUUID();
    console.log("\u{1F535} [ThreadContext] Initialized with thread ID:", id);
    return id;
  });
  const [threadCnt, setThreadCnt] = useState(1);
  const [threads, setThreads] = useState(
    () => /* @__PURE__ */ new Map([[generateThreadId, []]])
  );
  const [threadMetadata, setThreadMetadata] = useState(
    () => /* @__PURE__ */ new Map([
      [
        generateThreadId,
        { title: "New Chat", status: "pending", lastActiveAt: (/* @__PURE__ */ new Date()).toISOString() }
      ]
    ])
  );
  const ensureThreadExists = useCallback(
    (threadId) => {
      setThreadMetadata((prev) => {
        if (prev.has(threadId)) return prev;
        const next = new Map(prev);
        next.set(threadId, { title: "New Chat", status: "regular", lastActiveAt: (/* @__PURE__ */ new Date()).toISOString() });
        return next;
      });
      setThreads((prev) => {
        if (prev.has(threadId)) return prev;
        const next = new Map(prev);
        next.set(threadId, []);
        return next;
      });
    },
    []
  );
  const [currentThreadId, _setCurrentThreadId] = useState(generateThreadId);
  const [threadViewKey, setThreadViewKey] = useState(0);
  const bumpThreadViewKey = useCallback(() => {
    setThreadViewKey((prev) => prev + 1);
  }, []);
  const setCurrentThreadId = useCallback(
    (threadId) => {
      ensureThreadExists(threadId);
      _setCurrentThreadId(threadId);
    },
    [ensureThreadExists]
  );
  const getThreadMessages = useCallback(
    (threadId) => {
      return threads.get(threadId) || [];
    },
    [threads]
  );
  const setThreadMessages = useCallback((threadId, messages) => {
    setThreads((prev) => {
      const next = new Map(prev);
      next.set(threadId, messages);
      return next;
    });
  }, []);
  const getThreadMetadata = useCallback(
    (threadId) => {
      return threadMetadata.get(threadId);
    },
    [threadMetadata]
  );
  const updateThreadMetadata = useCallback((threadId, updates) => {
    setThreadMetadata((prev) => {
      const existing = prev.get(threadId);
      if (!existing) {
        console.warn(`Thread metadata not found for threadId: ${threadId}`);
        return prev;
      }
      const next = new Map(prev);
      next.set(threadId, __spreadValues(__spreadValues({}, existing), updates));
      return next;
    });
  }, []);
  const value = {
    currentThreadId,
    setCurrentThreadId,
    threadViewKey,
    bumpThreadViewKey,
    threads,
    setThreads,
    threadMetadata,
    setThreadMetadata,
    threadCnt,
    setThreadCnt,
    getThreadMessages,
    setThreadMessages,
    getThreadMetadata,
    updateThreadMetadata
  };
  return /* @__PURE__ */ jsx(ThreadContext.Provider, { value, children });
}
function useCurrentThreadMessages() {
  const { currentThreadId, getThreadMessages } = useThreadContext();
  return getThreadMessages(currentThreadId);
}
function useCurrentThreadMetadata() {
  const { currentThreadId, getThreadMetadata } = useThreadContext();
  return getThreadMetadata(currentThreadId);
}

// src/runtime/aomi-runtime.tsx
import { jsx as jsx2 } from "react/jsx-runtime";
function AomiRuntimeProvider({
  children,
  backendUrl = "http://localhost:8080",
  publicKey
}) {
  const {
    currentThreadId,
    setCurrentThreadId,
    bumpThreadViewKey,
    threads,
    setThreads,
    threadMetadata,
    setThreadMetadata,
    threadCnt,
    setThreadCnt,
    getThreadMessages,
    setThreadMessages,
    updateThreadMetadata
  } = useThreadContext();
  const [isRunning, setIsRunning] = useState2(false);
  const backendApiRef = useRef(new BackendApi(backendUrl));
  const pollingIntervalRef = useRef(null);
  const pendingSystemMessagesRef = useRef(/* @__PURE__ */ new Map());
  const pendingChatMessagesRef = useRef(/* @__PURE__ */ new Map());
  const creatingThreadIdRef = useRef(null);
  const createThreadPromiseRef = useRef(null);
  const findPendingThreadId = useCallback2(() => {
    if (creatingThreadIdRef.current) return creatingThreadIdRef.current;
    for (const [id, meta] of threadMetadata.entries()) {
      if (meta.status === "pending") return id;
    }
    return null;
  }, [threadMetadata]);
  const currentThreadIdRef = useRef(currentThreadId);
  useEffect(() => {
    currentThreadIdRef.current = currentThreadId;
  }, [currentThreadId]);
  const skipInitialFetchRef = useRef(/* @__PURE__ */ new Set());
  const tempToBackendIdRef = useRef(/* @__PURE__ */ new Map());
  const resolveThreadId = useCallback2((threadId) => {
    return tempToBackendIdRef.current.get(threadId) || threadId;
  }, []);
  const findTempIdForBackendId = useCallback2((backendId) => {
    for (const [tempId, bId] of tempToBackendIdRef.current.entries()) {
      if (bId === backendId) return tempId;
    }
    return void 0;
  }, []);
  const isThreadReady = useCallback2((threadId) => {
    if (!isTempThreadId(threadId)) return true;
    return tempToBackendIdRef.current.has(threadId);
  }, []);
  const applyMessages = useCallback2(
    (msgs) => {
      var _a, _b;
      if (!msgs) return;
      const activeThreadId = currentThreadIdRef.current;
      const hasPendingMessages = pendingChatMessagesRef.current.has(activeThreadId) && ((_b = (_a = pendingChatMessagesRef.current.get(activeThreadId)) == null ? void 0 : _a.length) != null ? _b : 0) > 0;
      if (hasPendingMessages) {
        console.log("Skipping applyMessages - pending messages exist for thread:", activeThreadId);
        return;
      }
      const threadMessages = [];
      for (const msg of msgs) {
        if (msg.sender === "system") {
          const systemMessage = constructSystemMessage(msg);
          if (systemMessage) {
            threadMessages.push(systemMessage);
          }
          continue;
        }
        const threadMessage = constructThreadMessage(msg);
        if (threadMessage) {
          threadMessages.push(threadMessage);
        }
      }
      setThreadMessages(activeThreadId, threadMessages);
    },
    [setThreadMessages]
  );
  useEffect(() => {
    backendApiRef.current = new BackendApi(backendUrl);
  }, [backendUrl]);
  const { startPolling, stopPolling } = useMemo(
    () => createPollingController({
      backendApiRef,
      pollingIntervalRef,
      resolveThreadId,
      applyMessages,
      isThreadReady,
      currentThreadIdRef,
      setIsRunning
    }),
    [applyMessages, isThreadReady, resolveThreadId]
  );
  useEffect(() => {
    const fetchInitialState = async () => {
      const threadId = currentThreadIdRef.current;
      if (isTempThreadId(threadId) && !tempToBackendIdRef.current.has(threadId)) {
        setIsRunning(false);
        return;
      }
      if (skipInitialFetchRef.current.has(threadId)) {
        skipInitialFetchRef.current.delete(threadId);
        setIsRunning(false);
        return;
      }
      const backendThreadId = resolveThreadId(threadId);
      try {
        const state = await backendApiRef.current.fetchState(backendThreadId);
        if (state.session_exists === false) {
          setIsRunning(false);
          return;
        }
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
    void fetchInitialState();
    return () => {
      stopPolling();
    };
  }, [applyMessages, resolveThreadId, startPolling, stopPolling]);
  useEffect(() => {
    if (!publicKey) return;
    const fetchThreadList = async () => {
      try {
        const threadList = await backendApiRef.current.fetchThreads(publicKey);
        const { metadata, maxChatNum } = normalizeBackendThreads(threadList, threadMetadata, threadCnt);
        setThreadMetadata(metadata);
        if (maxChatNum > threadCnt) {
          setThreadCnt(maxChatNum);
        }
      } catch (error) {
        console.error("Failed to fetch thread list:", error);
      }
    };
    void fetchThreadList();
  }, [publicKey, setThreadCnt, setThreadMetadata, threadCnt, threadMetadata]);
  const threadListAdapter = useMemo(
    () => createThreadListAdapter({
      currentThreadId,
      currentThreadIdRef,
      threadMetadata,
      setThreadMetadata,
      setThreads,
      setThreadMessages,
      setCurrentThreadId,
      setIsRunning,
      bumpThreadViewKey,
      findPendingThreadId,
      creatingThreadIdRef,
      createThreadPromiseRef,
      pendingChatMessagesRef,
      pendingSystemMessagesRef,
      tempToBackendIdRef,
      skipInitialFetchRef,
      backendApiRef,
      publicKey,
      threadCnt,
      setThreadCnt,
      resolveThreadId,
      startPolling,
      updateThreadMetadata: (id, updates) => updateThreadMetadata(id, updates)
    }),
    [
      backendApiRef,
      bumpThreadViewKey,
      currentThreadId,
      findPendingThreadId,
      publicKey,
      resolveThreadId,
      setCurrentThreadId,
      setIsRunning,
      setThreadCnt,
      setThreadMetadata,
      setThreadMessages,
      setThreads,
      startPolling,
      threadCnt,
      threadMetadata,
      updateThreadMetadata
    ]
  );
  const currentMessages = getThreadMessages(currentThreadId);
  const {
    onNew,
    onCancel,
    sendSystemMessage,
    sendSystemMessageNow,
    flushPendingSystemMessages,
    flushPendingChatMessages
  } = useMemo(
    () => createMessageHandlers({
      backendApiRef,
      resolveThreadId,
      getThreadMessages,
      setThreadMessages,
      setIsRunning,
      startPolling,
      stopPolling,
      isThreadReady,
      pendingSystemMessagesRef,
      pendingChatMessagesRef,
      updateThreadMetadata,
      getCurrentThreadId: () => currentThreadIdRef.current,
      getCurrentMessages: () => getThreadMessages(currentThreadIdRef.current)
    }),
    [
      backendApiRef,
      getThreadMessages,
      isThreadReady,
      resolveThreadId,
      setThreadMessages,
      setIsRunning,
      startPolling,
      stopPolling,
      updateThreadMetadata
    ]
  );
  useEffect(() => {
    if (isTempThreadId(currentThreadId)) return;
    const hasUserMessages = currentMessages.some((msg) => msg.role === "user");
    if (hasUserMessages) {
      void flushPendingSystemMessages(currentThreadId);
    }
  }, [currentMessages, currentThreadId, flushPendingSystemMessages]);
  useEffect(() => {
    const unsubscribe = backendApiRef.current.subscribeToUpdates(
      (update) => {
        if (update.type !== "TitleChanged") return;
        const sessionId = update.data.session_id;
        const newTitle = update.data.new_title;
        const tempId = findTempIdForBackendId(sessionId);
        const threadIdToUpdate = tempId || sessionId;
        setThreadMetadata((prev) => {
          var _a;
          const next = new Map(prev);
          const existing = next.get(threadIdToUpdate);
          const normalizedTitle = isPlaceholderTitle(newTitle) ? "" : newTitle;
          const nextStatus = (existing == null ? void 0 : existing.status) === "archived" ? "archived" : "regular";
          next.set(threadIdToUpdate, {
            title: normalizedTitle,
            status: nextStatus,
            lastActiveAt: (_a = existing == null ? void 0 : existing.lastActiveAt) != null ? _a : (/* @__PURE__ */ new Date()).toISOString()
          });
          return next;
        });
        if (!isPlaceholderTitle(newTitle) && creatingThreadIdRef.current === threadIdToUpdate) {
          creatingThreadIdRef.current = null;
        }
      },
      (error) => {
        console.error("Failed to handle system update SSE:", error);
      }
    );
    return () => {
      unsubscribe();
    };
  }, [backendUrl, setThreadMetadata, findTempIdForBackendId]);
  useEffect(() => {
    const threadId = currentThreadIdRef.current;
    if (!isTempThreadId(threadId)) return;
    if (!tempToBackendIdRef.current.has(threadId)) return;
    void flushPendingChatMessages(threadId);
  }, [flushPendingChatMessages]);
  const runtime = useExternalStoreRuntime({
    messages: currentMessages,
    setMessages: (msgs) => setThreadMessages(currentThreadIdRef.current, [...msgs]),
    isRunning,
    onNew: (message) => onNew(message),
    onCancel,
    convertMessage: (msg) => msg,
    adapters: {
      threadList: threadListAdapter
    }
  });
  return /* @__PURE__ */ jsx2(RuntimeActionsProvider, { value: { sendSystemMessage }, children: /* @__PURE__ */ jsx2(AssistantRuntimeProvider, { runtime, children }) });
}

// src/utils/wallet.ts
import { useEffect as useEffect2, useRef as useRef2 } from "react";
var getNetworkName = (chainId) => {
  if (chainId === void 0) return "";
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
var formatAddress = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "Connect Wallet";
function WalletSystemMessageEmitter({ wallet }) {
  const { sendSystemMessage } = useRuntimeActions();
  const lastWalletRef = useRef2({ isConnected: false });
  useEffect2(() => {
    const prev = lastWalletRef.current;
    const { address, chainId, isConnected } = wallet;
    const normalizedAddress = address == null ? void 0 : address.toLowerCase();
    if (isConnected && normalizedAddress && chainId && (!prev.isConnected || prev.address !== normalizedAddress)) {
      const networkName = getNetworkName(chainId);
      const message = `User connected wallet with address ${normalizedAddress} on ${networkName} network (Chain ID: ${chainId}). Ready to help with transactions.`;
      console.log(message);
      void sendSystemMessage(message);
      lastWalletRef.current = { isConnected: true, address: normalizedAddress, chainId };
      return;
    }
    if (!isConnected && prev.isConnected) {
      void sendSystemMessage("Wallet disconnected by user.");
      console.log("Wallet disconnected by user.");
      lastWalletRef.current = { isConnected: false };
      return;
    }
    if (isConnected && normalizedAddress && chainId && prev.isConnected && prev.address === normalizedAddress && prev.chainId !== chainId) {
      const networkName = getNetworkName(chainId);
      const message = `User switched wallet to ${networkName} network (Chain ID: ${chainId}).`;
      console.log(message);
      void sendSystemMessage(message);
      lastWalletRef.current = { isConnected: true, address: normalizedAddress, chainId };
    }
  }, [wallet, sendSystemMessage]);
  return null;
}

// src/lib/utils.ts
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
function cn(...inputs) {
  return twMerge(clsx(inputs));
}
export {
  AomiRuntimeProvider,
  BackendApi,
  RuntimeActionsProvider,
  ThreadContextProvider,
  WalletSystemMessageEmitter,
  cn,
  constructSystemMessage,
  constructThreadMessage,
  formatAddress,
  getNetworkName,
  useCurrentThreadMessages,
  useCurrentThreadMetadata,
  useRuntimeActions,
  useThreadContext
};
//# sourceMappingURL=index.js.map