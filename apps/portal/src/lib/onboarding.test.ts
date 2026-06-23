import { describe, it, expect, vi } from "vitest";
import {
  oneshotStep,
  bootstrapStep,
  installationStatusLabel,
  normalizeRepo,
  readGithubRedirect,
  withPath,
  withProgress,
  withPendingInstall,
  loadOnboarding,
  saveOnboarding,
  GITHUB_REDIRECT_KEYS,
} from "./onboarding";

// onboarding.ts imports @aomi-labs/widget-lib which has a volatile dependency
// chain through the registry. The pure functions don't use it — mock it out.
vi.mock("@aomi-labs/widget-lib", () => ({}));

describe("oneshotStep", () => {
  it("advances install → create → build → live", () => {
    expect(oneshotStep({})).toBe("install");
    expect(oneshotStep({ installationId: "1" })).toBe("create");
    expect(oneshotStep({ installationId: "1", repo: "a/b" })).toBe("build");
    expect(oneshotStep({ installationId: "1", repo: "a/b", live: true })).toBe("live");
  });
});

describe("bootstrapStep", () => {
  it("advances template → install → deploy → live", () => {
    expect(bootstrapStep({})).toBe("template");
    expect(bootstrapStep({ repo: "a/b" })).toBe("install");
    expect(bootstrapStep({ repo: "a/b", installationId: "1" })).toBe("deploy");
    expect(bootstrapStep({ repo: "a/b", installationId: "1", live: true })).toBe("live");
  });
});

describe("installationStatusLabel", () => {
  it("describes backend callback statuses", () => {
    expect(installationStatusLabel("bound")).toBe("installation done");
    expect(installationStatusLabel("awaiting_webhook")).toBe("installed, syncing repositories");
    expect(installationStatusLabel("unknown")).toBeNull();
  });
});

describe("normalizeRepo", () => {
  it("accepts owner/name, URLs, .git, trailing slash", () => {
    expect(normalizeRepo("you/my-agent")).toBe("you/my-agent");
    expect(normalizeRepo("  you/my-agent  ")).toBe("you/my-agent");
    expect(normalizeRepo("https://github.com/you/my-agent")).toBe("you/my-agent");
    expect(normalizeRepo("https://github.com/you/my-agent.git")).toBe("you/my-agent");
    expect(normalizeRepo("https://github.com/phoebe-aomi/my-playground-2")).toBe("phoebe-aomi/my-playground-2");
    expect(normalizeRepo("https://github.com/phoebe-aomi/my-playground-2?tab=readme")).toBe("phoebe-aomi/my-playground-2");
    expect(normalizeRepo("https://github.com/phoebe-aomi/my-playground-2/tree/main/src")).toBe("phoebe-aomi/my-playground-2");
    expect(normalizeRepo("you/my-agent/")).toBe("you/my-agent");
    expect(normalizeRepo("not-a-repo")).toBeNull();
    expect(normalizeRepo("")).toBeNull();
  });
});

describe("readGithubRedirect", () => {
  it("parses installation_id + state + setup_action", () => {
    expect(readGithubRedirect("?foo=bar")).toBeNull();
    expect(readGithubRedirect("?installation_id=42&setup_action=install&state=tok")).toEqual({
      installationId: "42",
      setupAction: "install",
      state: "tok",
      onboard: null,
      repo: null,
    });
    expect(
      readGithubRedirect(
        "?installation_id=42&onboard=bound&repo=phoebe-aomi%2Fmy-playground-2",
      ),
    ).toEqual({
      installationId: "42",
      setupAction: null,
      state: null,
      onboard: "bound",
      repo: "phoebe-aomi/my-playground-2",
    });
  });
});

describe("state transitions", () => {
  it("are immutable and correct", () => {
    const base = { path: null, oneshot: {}, bootstrap: {}, pendingInstall: null };

    const a = withPath(base, "oneshot");
    expect(a.path).toBe("oneshot");
    expect(base.path).toBeNull();

    const b = withProgress(a, "oneshot", { installationId: "9" });
    expect(b.oneshot).toEqual({ installationId: "9" });
    expect(a.oneshot).toEqual({});

    const c = withPendingInstall(b, { path: "oneshot" });
    expect(c.pendingInstall).toEqual({ path: "oneshot" });
    expect(withPendingInstall(c, null).pendingInstall).toBeNull();
  });
});

describe("load/save", () => {
  it("round-trips through a window.localStorage stub", () => {
    const store = new Map<string, string>();
    const win = {
      localStorage: {
        getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
      },
    } as unknown as Window & typeof globalThis;
    globalThis.window = win;

    expect(loadOnboarding()).toEqual({
      path: null,
      oneshot: {},
      bootstrap: {},
      pendingInstall: null,
    });

    const next = withProgress(loadOnboarding(), "bootstrap", { repo: "me/app" });
    saveOnboarding(next);
    expect(loadOnboarding().bootstrap.repo).toBe("me/app");

    (globalThis as { window?: unknown }).window = undefined;
  });

  it("strips stale mock deploy progress", () => {
    const store = new Map<string, string>();
    store.set(
      "aomi_onboard",
      JSON.stringify({
        path: "bootstrap",
        oneshot: {},
        bootstrap: {
          repo: "me/app",
          installationId: "123",
          live: true,
        },
        pendingInstall: null,
      }),
    );
    const win = {
      localStorage: {
        getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
      },
    } as unknown as Window & typeof globalThis;
    globalThis.window = win;

    expect(loadOnboarding().bootstrap).toEqual({
      repo: "me/app",
      installationId: "123",
      live: true,
    });

    (globalThis as { window?: unknown }).window = undefined;
  });
});

describe("GITHUB_REDIRECT_KEYS", () => {
  it("covers GitHub and backend redirect params", () => {
    for (const k of ["installation_id", "setup_action", "state", "code", "onboard"]) {
      expect(GITHUB_REDIRECT_KEYS).toContain(k);
    }
  });
});
