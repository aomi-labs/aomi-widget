import { afterEach, describe, expect, it, vi } from "vitest";
import { missingSecretsForActivation } from "../src/bff/release-manifest";
import { BackendError } from "../src/errors";
import type { BackendClient } from "../src/backend";

const PROJECT = {
  id: 42,
  latestDeployment: null,
  apps: [{ id: 17, name: "binance" }],
} as never;

function slot(name: string, required = true) {
  return { name, description: "d", required };
}

describe("missingSecretsForActivation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("reports only the required slots with no configured key", async () => {
    const client = {
      getUserProjectReleaseSecrets: vi.fn(async () => ({
        byApp: {
          binance: {
            applicationId: 17,
            releaseTag: "v1",
            slots: [slot("BINANCE_API_KEY"), slot("BINANCE_SECRET_KEY")],
          },
        },
      })),
      listAppSecrets: vi.fn(async () => ({
        byApp: { binance: ["$SECRET:APP:binance::BINANCE_API_KEY"] },
      })),
    } as unknown as BackendClient;

    const missing = await missingSecretsForActivation({
      client,
      githubUserId: "gh-1",
      project: PROJECT,
      pairs: [{ app: "binance", releaseTag: "v1" }],
    });

    expect(missing).toEqual({ binance: ["BINANCE_SECRET_KEY"] });
    expect(client.getUserProjectReleaseSecrets).toHaveBeenCalledWith({
      githubUserId: "gh-1",
      projectId: 42,
      pairs: [{ app: "binance", releaseTag: "v1" }],
    });
    expect(client.listAppSecrets).toHaveBeenCalledWith({ applicationId: 17 });
  });

  /**
   * The production failure this rewrite exists for: the gate used to read
   * release manifests from GitHub with a `GITHUB_TOKEN` out of the BFF's own
   * environment. Where that token was unset — which was every aomi-build
   * production deployment — activation answered 503 "Unable to verify required
   * secrets" forever. The declarations now come from the backend, which holds
   * the platform's GitHub App installation, so this path must touch no GitHub
   * API and read no token.
   */
  it("reaches GitHub for nothing, with no GITHUB_TOKEN in the environment", async () => {
    const fetchImpl = vi.fn();
    vi.stubGlobal("fetch", fetchImpl);
    vi.stubEnv("GITHUB_TOKEN", "");

    const client = {
      getUserProjectReleaseSecrets: vi.fn(async () => ({
        byApp: {
          binance: { applicationId: 17, releaseTag: "v1", slots: [] },
        },
      })),
      listAppSecrets: vi.fn(),
    } as unknown as BackendClient;

    await expect(
      missingSecretsForActivation({
        client,
        githubUserId: "gh-1",
        project: PROJECT,
        pairs: [{ app: "binance", releaseTag: "v1" }],
      }),
    ).resolves.toEqual({});
    expect(fetchImpl).not.toHaveBeenCalled();
    // An app that declares nothing needs no vault read either.
    expect(client.listAppSecrets).not.toHaveBeenCalled();
  });

  it("gates every app in a multi-app activation on its own declarations", async () => {
    const apps = ["alpha", "beta", "gamma"];
    const client = {
      getUserProjectReleaseSecrets: vi.fn(async () => ({
        byApp: Object.fromEntries(
          apps.map((app, index) => [
            app,
            {
              applicationId: index + 1,
              releaseTag: "v1",
              slots: [slot(`${app.toUpperCase()}_KEY`)],
            },
          ]),
        ),
      })),
      listAppSecrets: vi.fn(async () => ({ byApp: {} })),
    } as unknown as BackendClient;

    const missing = await missingSecretsForActivation({
      client,
      githubUserId: "gh-1",
      project: {
        id: 42,
        apps: apps.map((name, index) => ({ id: index + 1, name })),
      } as never,
      pairs: apps.map((app) => ({ app, releaseTag: "v1" })),
    });

    expect(missing).toEqual({
      alpha: ["ALPHA_KEY"],
      beta: ["BETA_KEY"],
      gamma: ["GAMMA_KEY"],
    });
    // One backend call for the whole batch, whatever the app count.
    expect(client.getUserProjectReleaseSecrets).toHaveBeenCalledTimes(1);
  });

  it("blocks activation when the declarations read fails, carrying its status", async () => {
    const backendError = new BackendError(
      "get_user_project_release_secrets",
      502,
      "backend unavailable",
    );
    const client = {
      getUserProjectReleaseSecrets: vi.fn(async () => {
        throw backendError;
      }),
      listAppSecrets: vi.fn(),
    } as unknown as BackendClient;

    await expect(
      missingSecretsForActivation({
        client,
        githubUserId: "gh-1",
        project: PROJECT,
        pairs: [{ app: "binance", releaseTag: "v1" }],
      }),
    ).rejects.toMatchObject({
      code: "REQUIRED_SECRETS_CHECK_UNAVAILABLE",
      upstream: "rust",
      upstreamStatus: 502,
      cause: backendError,
    });
    expect(client.listAppSecrets).not.toHaveBeenCalled();
  });

  /** A silent omission must not read as "this app requires nothing". */
  it("blocks activation for a pair the backend did not answer for", async () => {
    const client = {
      getUserProjectReleaseSecrets: vi.fn(async () => ({
        byApp: { binance: { applicationId: 17, releaseTag: "v1", slots: [] } },
      })),
      listAppSecrets: vi.fn(async () => ({ byApp: {} })),
    } as unknown as BackendClient;

    await expect(
      missingSecretsForActivation({
        client,
        githubUserId: "gh-1",
        project: PROJECT,
        pairs: [
          { app: "binance", releaseTag: "v1" },
          { app: "unanswered", releaseTag: "v1" },
        ],
      }),
    ).rejects.toMatchObject({
      code: "REQUIRED_SECRETS_CHECK_UNAVAILABLE",
      upstream: "rust",
    });
  });

  it("blocks activation when the configured values cannot be read", async () => {
    const backendError = new BackendError(
      "list_app_secrets",
      503,
      "vault down",
    );
    const client = {
      getUserProjectReleaseSecrets: vi.fn(async () => ({
        byApp: {
          binance: {
            applicationId: 17,
            releaseTag: "v1",
            slots: [slot("BINANCE_API_KEY")],
          },
        },
      })),
      listAppSecrets: vi.fn(async () => {
        throw backendError;
      }),
    } as unknown as BackendClient;

    await expect(
      missingSecretsForActivation({
        client,
        githubUserId: "gh-1",
        project: PROJECT,
        pairs: [{ app: "binance", releaseTag: "v1" }],
      }),
    ).rejects.toMatchObject({
      code: "REQUIRED_SECRETS_CHECK_UNAVAILABLE",
      upstream: "rust",
      upstreamStatus: 503,
    });
  });

  /** The app row is bound at deploy time, so this is a backstop, not a path a
   *  deployed release is expected to take. */
  it("falls back to the project's own app row for the application id", async () => {
    const client = {
      getUserProjectReleaseSecrets: vi.fn(async () => ({
        byApp: {
          binance: {
            applicationId: null,
            releaseTag: "v1",
            slots: [slot("BINANCE_API_KEY")],
          },
        },
      })),
      listAppSecrets: vi.fn(async () => ({ byApp: {} })),
    } as unknown as BackendClient;

    const missing = await missingSecretsForActivation({
      client,
      githubUserId: "gh-1",
      project: PROJECT,
      pairs: [{ app: "binance", releaseTag: "v1" }],
    });

    expect(missing).toEqual({ binance: ["BINANCE_API_KEY"] });
    expect(client.listAppSecrets).toHaveBeenCalledWith({ applicationId: 17 });
  });

  it("blocks when no application identity can be resolved at all", async () => {
    const client = {
      getUserProjectReleaseSecrets: vi.fn(async () => ({
        byApp: {
          binance: {
            applicationId: null,
            releaseTag: "v1",
            slots: [slot("BINANCE_API_KEY")],
          },
        },
      })),
      listAppSecrets: vi.fn(),
    } as unknown as BackendClient;

    await expect(
      missingSecretsForActivation({
        client,
        githubUserId: "gh-1",
        project: { id: 42, apps: [] } as never,
        pairs: [{ app: "binance", releaseTag: "v1" }],
      }),
    ).rejects.toMatchObject({ code: "REQUIRED_SECRETS_CHECK_UNAVAILABLE" });
    expect(client.listAppSecrets).not.toHaveBeenCalled();
  });

  it("asks nothing for an empty activation", async () => {
    const client = {
      getUserProjectReleaseSecrets: vi.fn(),
      listAppSecrets: vi.fn(),
    } as unknown as BackendClient;

    await expect(
      missingSecretsForActivation({
        client,
        githubUserId: "gh-1",
        project: PROJECT,
        pairs: [],
      }),
    ).resolves.toEqual({});
    expect(client.getUserProjectReleaseSecrets).not.toHaveBeenCalled();
  });
});
