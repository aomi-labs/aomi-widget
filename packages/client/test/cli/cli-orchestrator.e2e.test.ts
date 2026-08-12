// @vitest-environment node

import { createServer, type ServerResponse } from "node:http";
import { afterEach, describe, expect, it } from "vitest";

import { AomiClient, Session } from "../../src/index";

const SESSION_ID = "019fb2de-mother-orchestrator-e2e";

function json(res: ServerResponse, body: unknown): void {
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

describe("orchestrator CLI mother wallet flow", () => {
  const sessions: Session[] = [];

  afterEach(() => {
    for (const session of sessions) session.close();
  });

  it("queues a mother batch, resolves it through the tx-sign path, and resumes", async () => {
    let callbackAccepted = false;
    let callbackThread: string | undefined;
    let callbackQuery: URLSearchParams | undefined;
    let callbackMessage: {
      type?: string;
      payload?: { pending_tx_ids?: number[]; txHash?: string };
    } = {};
    const requests: string[] = [];

    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      requests.push(`${req.method} ${url.pathname}`);
      if (req.method === "POST" && url.pathname === "/api/thread/chat") {
        json(res, {
          messages: [
            { sender: "user", content: "delegate and commit", timestamp: 1 },
            {
              sender: "agent",
              content: "Two reviewed transfers are ready for one signature.",
              timestamp: 2,
            },
          ],
          system_events: [
            {
              InlineCall: {
                type: "wallet_tx_request",
                payload: { tx_ids: [1, 2], aa_preference: "auto" },
              },
            },
          ],
          is_processing: false,
          user_state: {
            pending_txs: {
              1: {
                to: "0x2222222222222222222222222222222222222222",
                value: "1",
                data: "0x",
                chain_id: 1,
              },
              2: {
                to: "0x3333333333333333333333333333333333333333",
                value: "1",
                data: "0x",
                chain_id: 1,
              },
            },
          },
        });
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/system") {
        callbackThread = req.headers["x-thread-id"] as string | undefined;
        callbackQuery = new URLSearchParams(url.searchParams);
        callbackMessage = JSON.parse(
          url.searchParams.get("message") ?? "{}",
        ) as typeof callbackMessage;
        callbackAccepted =
          callbackThread === SESSION_ID &&
          url.searchParams.get("app") === "orchestrator" &&
          callbackMessage.type === "wallet:tx_complete" &&
          JSON.stringify(callbackMessage.payload?.pending_tx_ids) === "[1,2]";
        json(res, { res: null });
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/thread/state") {
        json(res, {
          messages: callbackAccepted
            ? [
                {
                  sender: "user",
                  content: "delegate and commit",
                  timestamp: 1,
                },
                {
                  sender: "agent",
                  content: "Both orchestrated transfers confirmed.",
                  timestamp: 3,
                },
              ]
            : [],
          system_events: [],
          is_processing: !callbackAccepted,
        });
        return;
      }
      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Mock backend did not bind an ephemeral port");
    }

    try {
      const session = new Session(
        new AomiClient({ baseUrl: `http://127.0.0.1:${address.port}` }),
        {
          sessionId: SESSION_ID,
          app: "orchestrator",
          pollIntervalMs: 5,
        },
      );
      sessions.push(session);
      await session.sendAsync("delegate and commit");
      expect(session.getPendingRequests()).toEqual([
        expect.objectContaining({ id: "tx-1-2", kind: "transaction" }),
      ]);

      await session.resolve("tx-1-2", {
        kind: "transaction",
        txHash: "0xmotherbatch",
      });
      const deadline = Date.now() + 2_000;
      while (session.getIsProcessing() && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      if (session.getIsProcessing()) {
        throw new Error(
          `mother did not resume; callback=${callbackAccepted}; requests=${requests.join(", ")}`,
        );
      }

      expect(callbackAccepted).toBe(true);
      expect(callbackThread).toBe(SESSION_ID);
      expect(callbackQuery?.get("app")).toBe("orchestrator");
      expect(callbackMessage.payload?.txHash).toBe("0xmotherbatch");
      expect(
        requests.filter((request) => request === "POST /api/system"),
      ).toHaveLength(1);
      expect(session.getMessages().at(-1)?.content).toBe(
        "Both orchestrated transfers confirmed.",
      );
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
});
