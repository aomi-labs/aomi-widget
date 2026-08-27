import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { mintAgentApiBearer } from "../packages/account/src/index.ts";
import {
  AomiClient,
  type Action,
  type Event,
  type EventPage,
} from "../packages/client/src/index.ts";

const origin = process.env.AOMI_AGENT_E2E_ORIGIN ?? "http://127.0.0.1:8082";
const productRoot = process.env.AOMI_PRODUCT_ROOT;
assert.ok(productRoot, "AOMI_PRODUCT_ROOT must name the product-mono checkout under test");
const authFixture = readFileSync(
  join(productRoot, "aomi/bin/api-server/src/auth.rs"),
  "utf8",
).match(/const BFF_PRIVATE: &\[u8\] = b"([\s\S]*?-----END PRIVATE KEY-----\n)";/);
assert.ok(authFixture, "the api-server development issuer fixture is missing");
process.env.PORTAL_SERVICE_PRIVATE_KEY = authFixture[1];
process.env.BACKEND_URL = origin;
const userId =
  process.env.AOMI_AGENT_E2E_USER_ID ??
  "11111111-1111-4111-8111-111111111111";
const sessionId =
  process.env.AOMI_AGENT_E2E_SESSION_ID ?? `cutover-e2e-${Date.now()}`;
const expectAction = process.env.AOMI_AGENT_E2E_EXPECT_ACTION !== "false";
const stopAtAction = process.env.AOMI_AGENT_E2E_STOP_AT_ACTION === "true";
const resumeActionId = process.env.AOMI_AGENT_E2E_RESUME_ACTION_ID;
const resumeActionRevision = Number(
  process.env.AOMI_AGENT_E2E_RESUME_ACTION_REVISION ?? "0",
);
const model = process.env.AOMI_AGENT_E2E_MODEL;
const message =
  process.env.AOMI_AGENT_E2E_MESSAGE ??
  ("Send 0 ETH on chain 31337 from my connected wallet to " +
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8. " +
    "Prepare the transaction and ask me to execute it.");

const client = new AomiClient({
  baseUrl: origin,
  guest: false,
  oauth: async ({ resource, scopes }) => {
    const token = await mintAgentApiBearer(userId, {
      scope: scopes.join(" "),
      resource,
      client_id: "cutover-e2e",
      auth_source: "oauth",
      principal_class: "user",
      grant_id: "cutover-e2e",
    });
    return {
      accessToken: token.bearer,
      expiresAt: token.expiresAt * 1_000,
      resource,
      scopes,
      tokenType: "Bearer",
    };
  },
});

const allEvents: Event[] = [];
let cursor: string | undefined;
let lastSequence = 0;
const publicEventTypes = new Set([
  "message",
  "turn_state_changed",
  "tool_update",
  "tool_complete",
  "task_started",
  "task_activity",
  "task_completed",
  "title_changed",
  "error",
  "action",
]);
const privateActionFields = new Set([
  "pending_tx_id",
  "pending_ix_id",
  "current_lifecycle",
  "last_batch_status",
  "fee_outcome",
  "fee_subject",
  "signed_transaction_base64",
  "broadcast_commitment",
]);

function assertPublicAction(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(assertPublicAction);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    assert.ok(!privateActionFields.has(key), `Action leaked private field ${key}`);
    assertPublicAction(child);
  }
}

function consume(page: EventPage): Action | undefined {
  assert.equal(page.session_id, sessionId);
  for (const event of page.events) {
    assert.ok(publicEventTypes.has(event.type), `unknown public Event ${event.type}`);
    assert.ok(
      event.sequence > lastSequence,
      `event sequence ${event.sequence} did not advance past ${lastSequence}`,
    );
    if (event.type === "message") {
      assert.ok(
        ["user", "agent", "system", "notice"].includes(event.sender),
        `unknown Message sender ${event.sender}`,
      );
      assert.equal(event.is_streaming, false, "streaming snapshots must not be durable Events");
    }
    if (event.type === "action") assertPublicAction(event.request);
    lastSequence = event.sequence;
    allEvents.push(event);
  }
  cursor = page.cursor;
  console.log(
    JSON.stringify({
      cursor,
      events: page.events.map((event) => ({
        sequence: event.sequence,
        type: event.type,
        state: event.type === "action" ? event.state : undefined,
      })),
      hasMore: page.has_more,
    }),
  );
  return page.events.find(
    (event): event is Action =>
      event.type === "action" && event.state === "pending",
  );
}

async function pollUntil(
  predicate: (event: Event) => boolean,
): Promise<Action | undefined> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const page = await client.agent.poll(sessionId, {
      cursor,
      waitMs: 30_000,
    });
    const action = consume(page);
    if (page.events.some(predicate)) return action;
  }
  throw new Error("timed out waiting for the expected Agent event");
}

if (resumeActionId) {
  const resolved = await client.agent.respondToAction(
    sessionId,
    resumeActionId,
    resumeActionRevision,
    { status: "rejected", reason: "cutover_e2e_restart_rejection" },
    `restart-${sessionId}-${resumeActionId}`,
  );
  assert.equal(resolved.id, resumeActionId);
  assert.equal(resolved.revision, resumeActionRevision + 1);
  assert.equal(resolved.state, "rejected");
  await pollUntil(
    (event) =>
      event.type === "turn_state_changed" &&
      ["complete", "failed", "interrupted"].includes(event.state),
  );
  const lifecycle = allEvents
    .filter((event) => event.type === "turn_state_changed")
    .map((event) => event.state);
  assert.ok(lifecycle.includes("processing"));
  assert.ok(lifecycle.includes("awaiting_action"));
  assert.ok(
    lifecycle.some((state) =>
      ["complete", "failed", "interrupted"].includes(state),
    ),
  );
  console.log(
    JSON.stringify({
      result: "restart-pass",
      sessionId,
      actionId: resumeActionId,
      lifecycle,
    }),
  );
  process.exit(0);
}

const first = await client.agent.start(
  {
    sessionId,
    applicationId: 8,
    model,
    message,
    userState: {
      connection: { is_connected: true, provider: "para" },
      evm: {
        chain_id: 31337,
        address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      },
      ext: { client_type: "web_ui" },
    },
  },
  { idempotencyKey: `start-${sessionId}` },
);

let action = consume(first);
if (!action) {
  action = await pollUntil(
    (event) =>
      event.type === "action" ||
      (event.type === "turn_state_changed" &&
        ["complete", "failed", "interrupted"].includes(event.state)),
  );
}
if (!expectAction) {
  const lifecycle = allEvents
    .filter((event) => event.type === "turn_state_changed")
    .map((event) => event.state);
  assert.ok(
    lifecycle.some((state) => ["complete", "failed", "interrupted"].includes(state)),
  );
  console.log(JSON.stringify({ result: "pass", sessionId, lifecycle }));
  process.exit(0);
}
assert.ok(action, "the runtime reached a terminal state without emitting an Action");
if (stopAtAction) {
  console.log(
    JSON.stringify({
      result: "action-checkpoint",
      sessionId,
      actionId: action.id,
      actionRevision: action.revision,
      cursor,
    }),
  );
  process.exit(0);
}

const resolved = await client.agent.respondToAction(
  sessionId,
  action.id,
  action.revision,
  { status: "rejected", reason: "cutover_e2e_rejection" },
  `respond-${sessionId}-${action.id}`,
);
assert.equal(resolved.id, action.id);
assert.equal(resolved.revision, action.revision + 1);
assert.equal(resolved.state, "rejected");

await pollUntil(
  (event) =>
    event.type === "turn_state_changed" &&
    ["complete", "failed", "interrupted"].includes(event.state),
);

const lifecycle = allEvents
  .filter((event) => event.type === "turn_state_changed")
  .map((event) => event.state);
assert.ok(lifecycle.includes("processing"));
assert.ok(lifecycle.includes("awaiting_action"));
assert.ok(
  lifecycle.some((state) => ["complete", "failed", "interrupted"].includes(state)),
);

console.log(
  JSON.stringify({
    result: "pass",
    sessionId,
    actionId: action.id,
    eventCount: allEvents.length,
    lifecycle,
  }),
);
