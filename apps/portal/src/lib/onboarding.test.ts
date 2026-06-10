import test from "node:test";
import assert from "node:assert/strict";

// NOTE: vitest config excludes apps/**, so this is not run by CI. It documents
// the onboarding state machine and is runnable locally with a TS-aware runner,
// e.g. `npx tsx --test src/lib/onboarding.test.ts` from apps/portal.

const moduleUrl = new URL("./onboarding.ts", import.meta.url).href;

test("oneshotStep advances install → create → build → live", async () => {
  const { oneshotStep } = await import(moduleUrl);
  assert.equal(oneshotStep({}), "install");
  assert.equal(oneshotStep({ installationId: "1" }), "create");
  assert.equal(oneshotStep({ installationId: "1", repo: "a/b" }), "build");
  assert.equal(
    oneshotStep({ installationId: "1", repo: "a/b", releaseTag: "t" }),
    "build",
  );
  assert.equal(
    oneshotStep({ installationId: "1", repo: "a/b", live: true }),
    "live",
  );
});

test("bootstrapStep advances template → install → deploy → live", async () => {
  const { bootstrapStep } = await import(moduleUrl);
  assert.equal(bootstrapStep({}), "template");
  assert.equal(bootstrapStep({ repo: "a/b" }), "install");
  assert.equal(bootstrapStep({ repo: "a/b", installationId: "1" }), "deploy");
  assert.equal(
    bootstrapStep({ repo: "a/b", installationId: "1", live: true }),
    "live",
  );
});

test("normalizeRepo accepts owner/name, URLs, .git, trailing slash", async () => {
  const { normalizeRepo } = await import(moduleUrl);
  assert.equal(normalizeRepo("you/my-agent"), "you/my-agent");
  assert.equal(normalizeRepo("  you/my-agent  "), "you/my-agent");
  assert.equal(
    normalizeRepo("https://github.com/you/my-agent"),
    "you/my-agent",
  );
  assert.equal(normalizeRepo("https://github.com/you/my-agent.git"), "you/my-agent");
  assert.equal(normalizeRepo("you/my-agent/"), "you/my-agent");
  assert.equal(normalizeRepo("not-a-repo"), null);
  assert.equal(normalizeRepo(""), null);
});

test("readGithubRedirect parses installation_id + state + setup_action", async () => {
  const { readGithubRedirect } = await import(moduleUrl);
  assert.equal(readGithubRedirect("?foo=bar"), null);
  assert.deepEqual(
    readGithubRedirect("?installation_id=42&setup_action=install&state=tok"),
    { installationId: "42", setupAction: "install", state: "tok" },
  );
  assert.deepEqual(readGithubRedirect("?installation_id=42"), {
    installationId: "42",
    setupAction: null,
    state: null,
  });
});

test("appInstallUrl points at the right App slug and carries state", async () => {
  const { appInstallUrl } = await import(moduleUrl);
  const one = appInstallUrl("oneshot", "abc");
  const boot = appInstallUrl("bootstrap", "xyz");
  assert.match(one, /github\.com\/apps\/aomi-build-oneshot\/installations\/new/);
  assert.match(one, /state=abc/);
  assert.match(boot, /github\.com\/apps\/aomi-build\/installations\/new/);
  assert.match(boot, /state=xyz/);
});

test("state transitions are immutable and correct", async () => {
  const { withPath, withProgress, withPendingInstall } = await import(
    moduleUrl
  );
  const base = { path: null, oneshot: {}, bootstrap: {}, pendingInstall: null };

  const a = withPath(base, "oneshot");
  assert.equal(a.path, "oneshot");
  assert.equal(base.path, null); // original untouched

  const b = withProgress(a, "oneshot", { installationId: "9" });
  assert.deepEqual(b.oneshot, { installationId: "9" });
  assert.deepEqual(a.oneshot, {}); // original untouched

  const c = withPendingInstall(b, { token: "t", path: "oneshot" });
  assert.deepEqual(c.pendingInstall, { token: "t", path: "oneshot" });
  assert.equal(withPendingInstall(c, null).pendingInstall, null);
});

test("load/save round-trips through a window.localStorage stub", async () => {
  const store = new Map<string, string>();
  const win = {
    localStorage: {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
  } as unknown as Window & typeof globalThis;
  globalThis.window = win;

  const { loadOnboarding, saveOnboarding, withProgress } = await import(
    moduleUrl
  );
  assert.deepEqual(loadOnboarding(), {
    path: null,
    oneshot: {},
    bootstrap: {},
    pendingInstall: null,
  });

  const next = withProgress(loadOnboarding(), "bootstrap", { repo: "me/app" });
  saveOnboarding(next);
  assert.equal(loadOnboarding().bootstrap.repo, "me/app");

  (globalThis as { window?: unknown }).window = undefined;
});

test("GITHUB_REDIRECT_KEYS covers the params GitHub appends", async () => {
  const { GITHUB_REDIRECT_KEYS } = await import(moduleUrl);
  for (const k of ["installation_id", "setup_action", "state", "code"]) {
    assert.ok(GITHUB_REDIRECT_KEYS.includes(k), `missing ${k}`);
  }
});
