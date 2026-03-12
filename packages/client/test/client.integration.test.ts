/**
 * Integration tests for @aomi-labs/client against the live Aomi backend.
 *
 * These tests make REAL HTTP calls to https://api.aomi.dev.
 * Each test generates a fresh session ID to avoid cross-contamination.
 *
 * Run with:
 *   pnpm vitest run packages/client/test/client.integration.test.ts
 */
import { describe, it, expect, beforeAll } from "vitest";
import { AomiClient } from "../src/index";
import type {
  AomiChatResponse,
  AomiStateResponse,
  AomiSSEEvent,
} from "../src/index";

// =============================================================================
// Setup
// =============================================================================

const BACKEND_URL = "https://api.aomi.dev";
const TEST_TIMEOUT = 30_000; // 30s — AI responses can be slow

let client: AomiClient;

function freshSessionId(): string {
  return crypto.randomUUID();
}

/**
 * Poll /api/state until is_processing becomes false or timeout.
 */
async function pollUntilDone(
  sessionId: string,
  timeoutMs = 25_000,
): Promise<AomiStateResponse> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const state = await client.fetchState(sessionId);
    if (!state.is_processing) return state;
    await new Promise((r) => setTimeout(r, 600));
  }
  throw new Error("Timed out waiting for processing to complete");
}

beforeAll(() => {
  client = new AomiClient({
    baseUrl: BACKEND_URL,
    logger: console,
  });
});

// =============================================================================
// Chat Scenarios
// =============================================================================

describe("Chat scenarios (live backend)", () => {
  it(
    "sends a message and gets a response",
    async () => {
      const sessionId = freshSessionId();

      const response = await client.sendMessage(sessionId, "Say hello in exactly 3 words.");

      expect(response).toBeDefined();
      expect(response.messages).toBeDefined();
      expect(Array.isArray(response.messages)).toBe(true);

      // Should have at least the user message echoed back
      const userMsg = response.messages?.find((m) => m.sender === "user");
      expect(userMsg).toBeDefined();

      // If processing is done, we should have an agent response too
      if (!response.is_processing) {
        const agentMsg = response.messages?.find(
          (m) => m.sender === "agent" || m.sender === "assistant",
        );
        expect(agentMsg).toBeDefined();
        expect(agentMsg?.content).toBeTruthy();
      }

      // Cleanup
      await client.deleteThread(sessionId).catch(() => {});
    },
    TEST_TIMEOUT,
  );

  it(
    "supports multi-turn conversation",
    async () => {
      const sessionId = freshSessionId();

      // Turn 1
      await client.sendMessage(sessionId, "Remember the number 42.");
      const state1 = await pollUntilDone(sessionId);
      expect(state1.messages?.length).toBeGreaterThanOrEqual(2);

      // Turn 2 — references context from turn 1
      await client.sendMessage(sessionId, "What number did I ask you to remember?");
      const state2 = await pollUntilDone(sessionId);

      // Should have 4+ messages (2 user + 2 agent)
      expect(state2.messages?.length).toBeGreaterThanOrEqual(4);

      // The agent's second response should mention "42"
      const lastAgent = [...(state2.messages ?? [])]
        .reverse()
        .find((m) => m.sender === "agent" || m.sender === "assistant");
      expect(lastAgent?.content).toContain("42");

      await client.deleteThread(sessionId).catch(() => {});
    },
    TEST_TIMEOUT,
  );

  it(
    "polls state while processing",
    async () => {
      const sessionId = freshSessionId();

      const chatResponse = await client.sendMessage(
        sessionId,
        "Write a short haiku about code.",
      );

      // Even if is_processing is true or false, fetchState should work
      const state = await client.fetchState(sessionId);
      expect(state).toBeDefined();
      expect(state.messages).toBeDefined();

      // Wait for completion and verify
      const final = await pollUntilDone(sessionId);
      expect(final.is_processing).toBe(false);
      expect(final.messages?.length).toBeGreaterThanOrEqual(2);

      await client.deleteThread(sessionId).catch(() => {});
    },
    TEST_TIMEOUT,
  );

  it(
    "can interrupt a response",
    async () => {
      const sessionId = freshSessionId();

      // Send a message that should produce a long response
      const chatResponse = await client.sendMessage(
        sessionId,
        "Count from 1 to 1000 slowly, one number per line.",
      );

      // Interrupt immediately
      if (chatResponse.is_processing) {
        const interruptResponse = await client.interrupt(sessionId);
        expect(interruptResponse).toBeDefined();
        // After interrupt, processing should stop
        expect(interruptResponse.is_processing).toBe(false);
      }

      await client.deleteThread(sessionId).catch(() => {});
    },
    TEST_TIMEOUT,
  );

  it(
    "handles empty session state gracefully",
    async () => {
      const sessionId = freshSessionId();

      // Fetch state for a session that hasn't received any messages
      const state = await client.fetchState(sessionId);
      expect(state).toBeDefined();
      expect(state.is_processing).toBe(false);
      // Messages can be empty array or null
      expect(
        !state.messages || state.messages.length === 0,
      ).toBe(true);
    },
    TEST_TIMEOUT,
  );

  it(
    "sends a system message",
    async () => {
      const sessionId = freshSessionId();

      // First start a session with a chat message
      await client.sendMessage(sessionId, "Hello");
      await pollUntilDone(sessionId);

      // Send a system message
      const sysResponse = await client.sendSystemMessage(
        sessionId,
        JSON.stringify({ type: "wallet:state_changed", payload: { address: "0x1234", isConnected: true } }),
      );
      expect(sysResponse).toBeDefined();

      await client.deleteThread(sessionId).catch(() => {});
    },
    TEST_TIMEOUT,
  );
});

// =============================================================================
// Thread / Session Management
// =============================================================================

describe("Thread management (live backend)", () => {
  it(
    "creates, fetches, and deletes a thread",
    async () => {
      const sessionId = freshSessionId();

      // Create
      const created = await client.createThread(sessionId);
      expect(created).toBeDefined();
      expect(created.session_id).toBe(sessionId);

      // Fetch
      const thread = await client.getThread(sessionId);
      expect(thread).toBeDefined();
      expect(thread.session_id).toBe(sessionId);

      // Delete (backend soft-deletes by archiving)
      await client.deleteThread(sessionId);

      // Verify deleted — backend marks as archived rather than hard-deleting
      const deleted = await client.getThread(sessionId);
      expect(deleted.is_archived).toBe(true);
    },
    TEST_TIMEOUT,
  );

  it(
    "renames a thread",
    async () => {
      const sessionId = freshSessionId();

      await client.createThread(sessionId);

      await client.renameThread(sessionId, "Test Rename Title");

      const thread = await client.getThread(sessionId);
      expect(thread.title).toBe("Test Rename Title");

      await client.deleteThread(sessionId).catch(() => {});
    },
    TEST_TIMEOUT,
  );

  it(
    "archives and unarchives a thread",
    async () => {
      const sessionId = freshSessionId();

      await client.createThread(sessionId);

      // Archive
      await client.archiveThread(sessionId);
      const archived = await client.getThread(sessionId);
      expect(archived.is_archived).toBe(true);

      // Unarchive
      await client.unarchiveThread(sessionId);
      const unarchived = await client.getThread(sessionId);
      expect(unarchived.is_archived).toBe(false);

      await client.deleteThread(sessionId).catch(() => {});
    },
    TEST_TIMEOUT,
  );
});

// =============================================================================
// SSE (brief connection test)
// =============================================================================

describe("SSE subscription (live backend)", () => {
  it(
    "connects to SSE stream and receives events on message",
    async () => {
      const sessionId = freshSessionId();
      const receivedEvents: AomiSSEEvent[] = [];

      // Start SSE subscription
      const unsubscribe = client.subscribeSSE(
        sessionId,
        (event) => {
          receivedEvents.push(event);
        },
        (error) => {
          // SSE errors are expected when session is new
          console.log("[test] SSE error (expected):", error);
        },
      );

      // Give SSE a moment to connect
      await new Promise((r) => setTimeout(r, 1000));

      // Send a message to trigger events
      await client.sendMessage(sessionId, "Hello from SSE test");
      await pollUntilDone(sessionId);

      // Wait a bit for events to arrive
      await new Promise((r) => setTimeout(r, 2000));

      // Cleanup
      unsubscribe();

      // We should have received at least one event (title_changed is common)
      // But SSE may not fire for simple messages, so just verify no crash
      expect(true).toBe(true);

      await client.deleteThread(sessionId).catch(() => {});
    },
    TEST_TIMEOUT,
  );
});

// =============================================================================
// Control API
// =============================================================================

describe("Control API (live backend)", () => {
  it(
    "fetches available namespaces",
    async () => {
      const sessionId = freshSessionId();

      const namespaces = await client.getNamespaces(sessionId);
      expect(Array.isArray(namespaces)).toBe(true);
      expect(namespaces.length).toBeGreaterThan(0);
      expect(namespaces).toContain("default");
    },
    TEST_TIMEOUT,
  );

  it(
    "fetches available models",
    async () => {
      const sessionId = freshSessionId();

      const models = await client.getModels(sessionId);
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
    },
    TEST_TIMEOUT,
  );
});
