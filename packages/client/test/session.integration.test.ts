/**
 * Integration tests for Session (high-level client) against the live Aomi backend.
 *
 * These tests make REAL HTTP calls to https://api.aomi.dev.
 * Each test gets a fresh Session with a new session ID.
 *
 * Run with:
 *   pnpm vitest run packages/client/test/session.integration.test.ts
 */
import { describe, it, expect, afterEach } from "vitest";
import { Session, AomiClient } from "../src/index";
import type { AomiMessage, SendResult, SessionEventMap } from "../src/index";

// =============================================================================
// Setup
// =============================================================================

const BACKEND_URL = "https://api.aomi.dev";
const TEST_TIMEOUT = 30_000; // 30s — AI responses can be slow

const sessions: Session[] = [];

function createSession(opts?: Partial<Parameters<typeof Session.prototype.constructor>[1]>): Session {
  const session = new Session(
    { baseUrl: BACKEND_URL },
    { namespace: "default", ...opts },
  );
  sessions.push(session);
  return session;
}

afterEach(async () => {
  // Cleanup all sessions created during the test
  for (const session of sessions) {
    try {
      session.close();
      await session.client.deleteThread(session.sessionId).catch(() => {});
    } catch {
      // ignore cleanup errors
    }
  }
  sessions.length = 0;
});

// =============================================================================
// Session.send() — blocking send
// =============================================================================

describe("Session.send() (live backend)", () => {
  it(
    "sends a message and returns a result with messages",
    async () => {
      const session = createSession();

      const result = await session.send("Say hello in exactly 3 words.");

      expect(result).toBeDefined();
      expect(result.messages).toBeDefined();
      expect(Array.isArray(result.messages)).toBe(true);
      expect(result.messages.length).toBeGreaterThanOrEqual(2);

      // Should have user message
      const userMsg = result.messages.find((m) => m.sender === "user");
      expect(userMsg).toBeDefined();

      // Should have agent response
      const agentMsg = result.messages.find(
        (m) => m.sender === "agent" || m.sender === "assistant",
      );
      expect(agentMsg).toBeDefined();
      expect(agentMsg?.content).toBeTruthy();
    },
    TEST_TIMEOUT,
  );

  it(
    "supports multi-turn conversation",
    async () => {
      const session = createSession();

      // Turn 1
      const result1 = await session.send("Remember the number 42.");
      expect(result1.messages.length).toBeGreaterThanOrEqual(2);

      // Turn 2 — references context from turn 1
      const result2 = await session.send("What number did I ask you to remember?");
      expect(result2.messages.length).toBeGreaterThanOrEqual(4);

      // The agent's second response should mention "42"
      const lastAgent = [...result2.messages]
        .reverse()
        .find((m) => m.sender === "agent" || m.sender === "assistant");
      expect(lastAgent?.content).toContain("42");
    },
    TEST_TIMEOUT,
  );
});

// =============================================================================
// Session.sendAsync() — non-blocking send
// =============================================================================

describe("Session.sendAsync() (live backend)", () => {
  it(
    "returns immediately and fires events",
    async () => {
      const session = createSession();

      const receivedMessages: AomiMessage[][] = [];
      session.on("messages", (msgs) => {
        receivedMessages.push([...msgs]);
      });

      const chatResponse = await session.sendAsync("Say hello.");

      expect(chatResponse).toBeDefined();
      expect(chatResponse.messages).toBeDefined();

      // Wait for processing to complete via event
      await new Promise<void>((resolve) => {
        if (!session.getIsProcessing()) {
          resolve();
          return;
        }
        session.on("processing_end", () => resolve());
      });

      // Should have received at least one messages event
      expect(receivedMessages.length).toBeGreaterThan(0);

      // Final messages should contain agent response
      const finalMessages = session.getMessages();
      const agentMsg = finalMessages.find(
        (m) => m.sender === "agent" || m.sender === "assistant",
      );
      expect(agentMsg).toBeDefined();
    },
    TEST_TIMEOUT,
  );
});

// =============================================================================
// Events
// =============================================================================

describe("Session events (live backend)", () => {
  it(
    "emits processing_start and processing_end events",
    async () => {
      const session = createSession();

      let processingStarted = false;
      let processingEnded = false;

      session.on("processing_start", () => {
        processingStarted = true;
      });

      session.on("processing_end", () => {
        processingEnded = true;
      });

      await session.send("Write a one-sentence haiku about code.");

      // processing_start may or may not fire depending on whether backend
      // responds synchronously, but if it processes async, both should fire
      // At minimum, the send completed successfully
      expect(session.getMessages().length).toBeGreaterThanOrEqual(2);

      // If processing was async, both events should have fired
      if (processingStarted) {
        expect(processingEnded).toBe(true);
      }
    },
    TEST_TIMEOUT,
  );

  it(
    "emits messages events during processing",
    async () => {
      const session = createSession();
      const messageSnapshots: number[] = [];

      session.on("messages", (msgs) => {
        messageSnapshots.push(msgs.length);
      });

      await session.send("Hello, just testing.");

      // Should have received at least one messages event
      expect(messageSnapshots.length).toBeGreaterThan(0);
    },
    TEST_TIMEOUT,
  );

  it(
    "wildcard listener receives events",
    async () => {
      const session = createSession();
      const wildcardEvents: string[] = [];

      session.on("*", ({ type }) => {
        wildcardEvents.push(type);
      });

      await session.send("Hi.");

      // Should have received some events via wildcard
      expect(wildcardEvents.length).toBeGreaterThan(0);
      expect(wildcardEvents).toContain("messages");
    },
    TEST_TIMEOUT,
  );

  it(
    "unsubscribe stops receiving events",
    async () => {
      const session = createSession();
      const events: AomiMessage[][] = [];

      const unsub = session.on("messages", (msgs) => {
        events.push([...msgs]);
      });

      // Unsubscribe immediately
      unsub();

      await session.send("Hello.");

      // Should NOT have received any events after unsubscribe
      // (the applyState from the send response still calls emit internally,
      // but our listener is removed so events array should be empty)
      expect(events.length).toBe(0);
    },
    TEST_TIMEOUT,
  );
});

// =============================================================================
// Accessors
// =============================================================================

describe("Session accessors (live backend)", () => {
  it(
    "getMessages() returns messages after send",
    async () => {
      const session = createSession();

      expect(session.getMessages()).toEqual([]);

      await session.send("Hello!");

      const messages = session.getMessages();
      expect(messages.length).toBeGreaterThanOrEqual(2);
    },
    TEST_TIMEOUT,
  );

  it(
    "getIsProcessing() returns false after send completes",
    async () => {
      const session = createSession();

      await session.send("Hello!");

      expect(session.getIsProcessing()).toBe(false);
    },
    TEST_TIMEOUT,
  );

  it(
    "getPendingRequests() returns empty for non-wallet messages",
    async () => {
      const session = createSession();

      await session.send("What is 2+2?");

      expect(session.getPendingRequests()).toEqual([]);
    },
    TEST_TIMEOUT,
  );
});

// =============================================================================
// Session with existing AomiClient
// =============================================================================

describe("Session with AomiClient instance (live backend)", () => {
  it(
    "accepts an AomiClient instead of options",
    async () => {
      const client = new AomiClient({ baseUrl: BACKEND_URL });
      const session = new Session(client, { namespace: "default" });
      sessions.push(session);

      const result = await session.send("Say hi.");

      expect(result.messages.length).toBeGreaterThanOrEqual(2);
      expect(session.client).toBe(client); // same instance
    },
    TEST_TIMEOUT,
  );
});

// =============================================================================
// Session.interrupt()
// =============================================================================

describe("Session.interrupt() (live backend)", () => {
  it(
    "can interrupt a response",
    async () => {
      const session = createSession();

      // Send async so we can interrupt
      const chatResponse = await session.sendAsync(
        "Count from 1 to 1000 slowly, one number per line.",
      );

      if (chatResponse.is_processing) {
        await session.interrupt();
        expect(session.getIsProcessing()).toBe(false);
      }
    },
    TEST_TIMEOUT,
  );
});

// =============================================================================
// Session.close()
// =============================================================================

describe("Session.close() (live backend)", () => {
  it(
    "prevents further sends after close",
    async () => {
      const session = createSession();

      session.close();

      await expect(session.send("Hello")).rejects.toThrow("Session is closed");
    },
    TEST_TIMEOUT,
  );

  it(
    "is idempotent",
    async () => {
      const session = createSession();

      session.close();
      session.close(); // should not throw

      expect(session.getIsProcessing()).toBe(false);
    },
    TEST_TIMEOUT,
  );
});
