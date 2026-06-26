import { describe, expect, it } from "vitest";
import {
  GITHUB_REDIRECT_KEYS,
  bootstrapStep,
  installationStatusLabel,
  isResumingInstall,
  loadLaunch,
  normalizeRepo,
  oneshotStep,
  readGithubRedirect,
  saveLaunch,
  withPath,
  withPendingInstall,
  withProgress,
  type LaunchState,
} from ".";

const launchState = (over: Partial<LaunchState> = {}): LaunchState => ({
  path: null,
  oneshot: {},
  bootstrap: {},
  pendingInstall: null,
  ...over,
});

describe("oneshotStep", () => {
  it("advances install -> create -> build -> live", () => {
    expect(oneshotStep({})).toBe("install");
    expect(oneshotStep({ installationId: "1" })).toBe("create");
    expect(oneshotStep({ installationId: "1", repo: "a/b" })).toBe("build");
    expect(oneshotStep({ installationId: "1", repo: "a/b", live: true })).toBe(
      "live",
    );
  });
});

describe("bootstrapStep", () => {
  it("advances template -> install -> deploy -> live", () => {
    expect(bootstrapStep({})).toBe("template");
    expect(bootstrapStep({ repo: "a/b" })).toBe("install");
    expect(bootstrapStep({ repo: "a/b", installationId: "1" })).toBe("deploy");
    expect(
      bootstrapStep({ repo: "a/b", installationId: "1", live: true }),
    ).toBe("live");
  });
});

describe("installationStatusLabel", () => {
  it("describes backend callback statuses", () => {
    expect(installationStatusLabel("bound")).toBe("installation done");
    expect(installationStatusLabel("awaiting_webhook")).toBe(
      "installed, syncing repositories",
    );
    expect(installationStatusLabel("unknown")).toBeNull();
  });
});

describe("normalizeRepo", () => {
  it("accepts owner/name, URLs, .git, trailing slash", () => {
    expect(normalizeRepo("you/my-agent")).toBe("you/my-agent");
    expect(normalizeRepo("  you/my-agent  ")).toBe("you/my-agent");
    expect(normalizeRepo("https://github.com/you/my-agent")).toBe(
      "you/my-agent",
    );
    expect(normalizeRepo("https://github.com/you/my-agent.git")).toBe(
      "you/my-agent",
    );
    expect(
      normalizeRepo("https://github.com/phoebe-aomi/my-playground-2"),
    ).toBe("phoebe-aomi/my-playground-2");
    expect(
      normalizeRepo(
        "https://github.com/phoebe-aomi/my-playground-2?tab=readme",
      ),
    ).toBe("phoebe-aomi/my-playground-2");
    expect(
      normalizeRepo(
        "https://github.com/phoebe-aomi/my-playground-2/tree/main/src",
      ),
    ).toBe("phoebe-aomi/my-playground-2");
    expect(normalizeRepo("you/my-agent/")).toBe("you/my-agent");
    expect(normalizeRepo("not-a-repo")).toBeNull();
    expect(normalizeRepo("")).toBeNull();
  });
});

describe("readGithubRedirect", () => {
  it("parses GitHub and backend redirect params", () => {
    expect(readGithubRedirect("?foo=bar")).toBeNull();
    expect(
      readGithubRedirect("?installation_id=42&setup_action=install&state=tok"),
    ).toEqual({
      installationId: "42",
      installationIds: [],
      setupAction: "install",
      state: "tok",
      launchStatus: null,
      repo: null,
    });
    expect(
      readGithubRedirect(
        "?installation_id=42&launch=bound&repo=phoebe-aomi%2Fmy-playground-2",
      ),
    ).toEqual({
      installationId: "42",
      installationIds: [],
      setupAction: null,
      state: null,
      launchStatus: "bound",
      repo: "phoebe-aomi/my-playground-2",
    });
    expect(
      readGithubRedirect("?installation_ids=12,34&launch=choose_installation"),
    ).toEqual({
      installationId: null,
      installationIds: ["12", "34"],
      setupAction: null,
      state: null,
      launchStatus: "choose_installation",
      repo: null,
    });
  });
});

describe("state transitions", () => {
  it("are immutable and correct", () => {
    const base = {
      path: null,
      oneshot: {},
      bootstrap: {},
      pendingInstall: null,
    };

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

    expect(loadLaunch()).toEqual({
      path: null,
      oneshot: {},
      bootstrap: {},
      pendingInstall: null,
    });

    const next = withProgress(loadLaunch(), "bootstrap", { repo: "me/app" });
    saveLaunch(next);
    expect(loadLaunch().bootstrap.repo).toBe("me/app");

    (globalThis as { window?: unknown }).window = undefined;
  });
});

describe("isResumingInstall", () => {
  it("stays in the wizard while returning from the install round-trip", () => {
    // Saved pendingInstall before the full-page nav to GitHub.
    expect(
      isResumingInstall(
        launchState({
          path: "bootstrap",
          pendingInstall: { path: "bootstrap" },
        }),
        "",
      ),
    ).toBe(true);

    // Backend callback redirect on the URL, even if pendingInstall was cleared.
    expect(
      isResumingInstall(
        launchState({ path: "bootstrap" }),
        "?installation_id=141779906&launch=bound&repo=ceciliaz030%2Flocal-4",
      ),
    ).toBe(true);
  });

  it("does not resume without an active launch or a pending install", () => {
    // No active path → never resume, even with a redirect on the URL.
    expect(
      isResumingInstall(launchState(), "?installation_id=42&launch=bound"),
    ).toBe(false);

    // Active path but nothing pending and no redirect → fall through to list.
    expect(isResumingInstall(launchState({ path: "bootstrap" }), "")).toBe(
      false,
    );
  });
});

describe("GITHUB_REDIRECT_KEYS", () => {
  it("covers GitHub and launch redirect params", () => {
    for (const k of [
      "installation_id",
      "installation_ids",
      "setup_action",
      "state",
      "code",
      "launch",
    ]) {
      expect(GITHUB_REDIRECT_KEYS).toContain(k);
    }
  });
});
