import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const readWorkspace = (path) =>
  readFile(new URL(`../../../${path}`, import.meta.url), "utf8");

test("Para login resolves the canonical Aomi account", async () => {
  const [providers, canonicalAccount] = await Promise.all([
    read("src/app/providers.tsx"),
    read("src/hooks/use-canonical-account.ts"),
  ]);

  assert.match(providers, /oAuthMethods: \["GOOGLE", "TELEGRAM"\]/);
  assert.match(canonicalAccount, /createProviderCredentialAdapter/);
  assert.match(canonicalAccount, /paraClient\.issueJwt/);
  assert.match(canonicalAccount, /createWidgetSessionProvider/);
  assert.match(canonicalAccount, /\/api\/aomi\/telegram\/exchange/);
  assert.match(canonicalAccount, /\/api\/aomi\/account/);
});

test("Telegram launches are verified before a production wallet flow", async () => {
  const [client, route, verifier] = await Promise.all([
    read("src/lib/telegram.ts"),
    read("src/app/api/telegram/launch/route.ts"),
    readWorkspace("packages/account/src/telegram.ts"),
  ]);

  assert.match(client, /webApp\.initData/);
  assert.match(client, /bot_id/);
  assert.match(client, /\/api\/telegram\/launch/);
  assert.match(route, /verifyTelegramInitData/);
  assert.match(verifier, /verifySignature/);
  assert.match(verifier, /WebAppData/);
  assert.doesNotMatch(verifier, /BOT_TOKEN|bot token/i);
});

test("the Mini App consumes canonical Actions and submits Action results", async () => {
  const [actionSession, executor] = await Promise.all([
    read("src/hooks/use-aomi-action.ts"),
    read("src/hooks/use-action-executor.ts"),
  ]);

  assert.match(actionSession, /new Session/);
  assert.match(actionSession, /actions_changed/);
  assert.match(actionSession, /fetchCurrentState/);
  assert.match(executor, /ActionResult/);
  assert.match(executor, /toViemSignTypedDataArgs/);
  assert.match(executor, /toViemSignMessageArgs/);
  assert.match(executor, /session\.respondToAction/);
  assert.match(executor, /session\.rejectAction/);
  assert.match(executor, /waitForTransactionReceipt/);
});

test("Para and the app share one React Query context", async () => {
  const nextConfig = await read("next.config.ts");

  assert.match(nextConfig, /"@tanstack\/react-query"/);
  assert.match(nextConfig, /appNodeModules/);
});

test("the legacy relay and multi-page wallet are absent", async () => {
  const [packageJson, page] = await Promise.all([
    read("package.json"),
    read("src/app/page.tsx"),
  ]);

  assert.doesNotMatch(packageJson, /walletconnect|wagmi|privy/i);
  assert.doesNotMatch(page, /\/api\/operation|Swap assets|Review & sign/i);
});

test("signing is gated behind explicit approval of a rendered Action", async () => {
  const [executor, page, describe] = await Promise.all([
    read("src/hooks/use-action-executor.ts"),
    read("src/app/page.tsx"),
    read("src/lib/action.ts"),
  ]);

  // The Telegram button only opens the app; the user must read the request and
  // approve it here. Para signs headlessly, so this screen is the only place a
  // Telegram user ever sees what they are signing.
  assert.match(executor, /approve: \(\) => void/);
  assert.match(executor, /reject: \(\) => void/);
  assert.match(page, /onClick=\{execution\.approve\}/);
  assert.match(page, /onClick=\{execution\.reject\}/);
  assert.match(page, /describeAction/);
  assert.match(describe, /export function describeAction/);

  // sendTransaction must be reachable only from the approve callback.
  const approveIndex = executor.indexOf("const approve = useCallback");
  assert.ok(approveIndex > 0, "approve callback is present");
  assert.ok(
    executor.indexOf("sendTransaction") > approveIndex,
    "sendTransaction is only called after the user approves",
  );
});
