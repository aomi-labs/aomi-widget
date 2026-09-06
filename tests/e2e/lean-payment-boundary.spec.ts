import { randomUUID } from "node:crypto";

import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import {
  AomiClient,
  type Event,
  type EventPage,
  type StartTurnIntent,
} from "../../packages/client/src/index.ts";

const byokKey = process.env.AOMI_E2E_BYOK_KEY?.trim();
const byokProvider = process.env.AOMI_E2E_BYOK_PROVIDER?.trim() || "anthropic";
const model = process.env.AOMI_E2E_MODEL?.trim();
const portalOrigin = process.env.LOCAL_PORTAL_URL ?? "http://127.0.0.1:3000";

test.describe.configure({ mode: "serial", timeout: 8 * 60_000 });
test.use({ trace: "off", video: "off" });

test("paired account, credits, and platform chat idempotency", async ({
  page,
  context,
}) => {
  await signInWithTestWallet(page);

  const fundingHeaders: string[] = [];
  const client = await authenticatedClient(context, fundingHeaders);

  const keysBefore = await client.listByokKeys("account-e2e");
  expect(Array.isArray(keysBefore)).toBe(true);

  const credits = await client.account.credits.get({ limit: 10 });
  expect(Number.isSafeInteger(credits.included.remaining_microusd)).toBe(true);
  expect(Number.isSafeInteger(credits.bank.balance_microusd)).toBe(true);

  const platformSession = `lean-payment-platform-${randomUUID()}`;
  const platformIntent: StartTurnIntent = {
    sessionId: platformSession,
    message: "Reply with exactly LEAN_PAYMENT_E2E_OK.",
    ...(model ? { model } : {}),
  };
  const platformKey = `lean-payment-platform-${randomUUID()}`;
  const platformPages = await settleTurn(
    client,
    platformSession,
    platformIntent,
    platformKey,
  );
  expect(agentReply(platformPages)).toContain("LEAN_PAYMENT_E2E_OK");

  const replay = await client.agent.start(platformIntent, {
    idempotencyKey: platformKey,
  });
  expect(replay.session_id).toBe(platformSession);
  const originalSequences = new Set(
    platformPages.flatMap((entry) =>
      entry.events.map((event) => event.sequence),
    ),
  );
  expect(
    replay.events.every((event) => originalSequences.has(event.sequence)),
  ).toBe(true);

  const followUpSession = `lean-payment-follow-up-${randomUUID()}`;
  const followUpIntent: StartTurnIntent = {
    sessionId: followUpSession,
    message: "Reply with exactly LEAN_PAYMENT_FOLLOW_UP_OK.",
    ...(model ? { model } : {}),
  };
  const followUpPages = await settleTurn(
    client,
    followUpSession,
    followUpIntent,
    `lean-payment-follow-up-${randomUUID()}`,
  );
  expect(agentReply(followUpPages)).toContain("LEAN_PAYMENT_FOLLOW_UP_OK");
});

test("paired model-key CRUD and explicit user_byok chat", async ({
  page,
  context,
}) => {
  test.skip(!byokKey, "AOMI_E2E_BYOK_KEY is required for the BYOK flow");
  if (!byokKey) return;
  await signInWithTestWallet(page);

  const fundingHeaders: string[] = [];
  const client = await authenticatedClient(context, fundingHeaders);

  const saved = await client.saveByokKey(
    "account-e2e",
    byokProvider,
    byokKey,
    "lean-payment-boundary-e2e",
  );
  try {
    expect(saved.provider).toBe(byokProvider);
    expect(saved.key_prefix).toBeTruthy();

    const listed = await client.listByokKeys("account-e2e");
    expect(listed.some((entry) => entry.provider === byokProvider)).toBe(true);

    const byokSession = `lean-payment-byok-${randomUUID()}`;
    const byokIntent: StartTurnIntent = {
      sessionId: byokSession,
      message: "Reply with exactly LEAN_PAYMENT_BYOK_E2E_OK.",
      ...(model ? { model } : {}),
    };
    const byokPages = await settleTurn(
      client,
      byokSession,
      byokIntent,
      `lean-payment-byok-${randomUUID()}`,
      "user_byok",
    );
    expect(agentReply(byokPages)).toContain("LEAN_PAYMENT_BYOK_E2E_OK");
    expect(fundingHeaders).toContain("user_byok");
  } finally {
    await client.deleteByokKey("account-e2e", byokProvider);
  }

  const keysAfter = await client.listByokKeys("account-e2e");
  expect(keysAfter.some((entry) => entry.provider === byokProvider)).toBe(
    false,
  );
});

async function signInWithTestWallet(page: Page): Promise<void> {
  await page.goto("/dev/widget-auth-e2e", { waitUntil: "domcontentloaded" });
  const verified = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/auth/siwe/verify" &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Test SIWE Sign In" }).click();
  expect((await verified).status()).toBe(200);
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const response = await fetch("/api/auth/get-session", {
            credentials: "include",
          });
          return response.json();
        }),
      { timeout: 30_000 },
    )
    .toMatchObject({ user: { isAnonymous: false } });
}

async function authenticatedClient(
  context: BrowserContext,
  fundingHeaders: string[],
): Promise<AomiClient> {
  const cookieHeader = (await context.cookies())
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");

  return new AomiClient({
    baseUrl: portalOrigin,
    guest: false,
    fetch: async (input, init) => {
      const headers = new Headers(init?.headers);
      headers.set("Cookie", cookieHeader);
      const funding = headers.get("x-aomi-inference-funding");
      if (funding) fundingHeaders.push(funding);
      return fetch(input, { ...init, headers });
    },
  });
}

async function settleTurn(
  client: AomiClient,
  sessionId: string,
  intent: StartTurnIntent,
  idempotencyKey: string,
  inferenceFunding?: "user_byok",
): Promise<EventPage[]> {
  const pages: EventPage[] = [];
  let page = await client.agent.start(intent, {
    idempotencyKey,
    ...(inferenceFunding ? { inferenceFunding } : {}),
  });
  pages.push(page);

  for (let attempt = 0; attempt < 12; attempt += 1) {
    if (terminalState(pages) !== undefined) return pages;
    page = await client.agent.poll(sessionId, {
      cursor: page.cursor,
      waitMs: 15_000,
    });
    pages.push(page);
  }

  throw new Error(`Agent turn ${sessionId} did not settle within 3 minutes`);
}

function terminalState(pages: EventPage[]): string | undefined {
  return pages
    .flatMap((page) => page.events)
    .filter((event) => event.type === "turn_state_changed")
    .map((event) => event.state)
    .findLast((state) => ["complete", "failed", "interrupted"].includes(state));
}

function agentReply(pages: EventPage[]): string {
  return pages
    .flatMap((page) => page.events)
    .filter(
      (event): event is Extract<Event, { type: "message" }> =>
        event.type === "message" && event.sender === "agent",
    )
    .map((event) => event.content)
    .join("\n");
}
