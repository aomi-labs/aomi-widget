import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { publishPackageIfNeeded } from "../../../scripts/publish-package-if-needed.mjs";

const packageDirectory = path.resolve("packages/client");
const packageManifest = JSON.parse(
  readFileSync(path.join(packageDirectory, "package.json"), "utf8"),
);
const packageSpec = `${packageManifest.name}@${packageManifest.version}`;

// Registry manifest response for the post-publish verification fetch.
const manifestResponse = (manifest = {}) =>
  new Response(JSON.stringify(manifest), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

describe("publishPackageIfNeeded", () => {
  it("skips an exact version that is already published", async () => {
    const publishImpl = vi.fn();

    await expect(
      publishPackageIfNeeded(packageDirectory, {
        fetchImpl: vi.fn(async () => manifestResponse()),
        publishImpl,
      }),
    ).resolves.toBe("skipped");

    expect(publishImpl).not.toHaveBeenCalled();
  });

  it("publishes when the exact version is absent", async () => {
    const publishImpl = vi.fn(async () => undefined);

    await expect(
      publishPackageIfNeeded(packageDirectory, {
        fetchImpl: vi
          .fn()
          .mockResolvedValueOnce(new Response(null, { status: 404 }))
          .mockResolvedValueOnce(manifestResponse()),
        publishImpl,
      }),
    ).resolves.toBe("published");

    expect(publishImpl).toHaveBeenCalledWith(packageDirectory);
  });

  it("fails closed on registry errors instead of guessing that a version is missing", async () => {
    const publishImpl = vi.fn();

    await expect(
      publishPackageIfNeeded(packageDirectory, {
        fetchImpl: vi.fn(
          async () =>
            new Response("Service Unavailable", {
              status: 503,
            }),
        ),
        publishImpl,
      }),
    ).rejects.toThrow(`Registry check for ${packageSpec} failed with HTTP 503`);

    expect(publishImpl).not.toHaveBeenCalled();
  });

  it("accepts a concurrent publish after its own publish attempt fails", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(manifestResponse());

    await expect(
      publishPackageIfNeeded(packageDirectory, {
        fetchImpl,
        publishImpl: vi.fn(async () => {
          throw new Error("version already exists");
        }),
      }),
    ).resolves.toBe("published");

    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  // The 2.0.0 incident, encoded: a publish that reaches the registry with
  // workspace-protocol dependencies must FAIL the job even though npm
  // accepted the upload — the artifact is unusable and immutable, and the
  // operator needs to know while a bump-and-republish is still cheap.
  it("fails after publish when the registry manifest still carries workspace:*", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(
        manifestResponse({
          dependencies: { "@aomi-labs/react": "workspace:*" },
        }),
      );

    await expect(
      publishPackageIfNeeded(packageDirectory, {
        fetchImpl,
        publishImpl: vi.fn(async () => undefined),
      }),
    ).rejects.toThrow(/workspace-protocol dependencies/);
  });

  it("flags a workspace:* range in any dependency field", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(
        manifestResponse({
          peerDependencies: { "@aomi-labs/client": "workspace:^" },
        }),
      );

    await expect(
      publishPackageIfNeeded(packageDirectory, {
        fetchImpl,
        publishImpl: vi.fn(async () => undefined),
      }),
    ).rejects.toThrow(/peerDependencies.@aomi-labs\/client=workspace:\^/);
  });

  // Regression guard for the 2.0.0 release: publishing moved to `npm publish`
  // in the release hardening (fdbea398), which uploads the manifest verbatim.
  // Every publishable manifest declares its siblings as `workspace:*`, a
  // pnpm-only protocol, so @aomi-labs/widget-lib@2.0.0 and
  // @aomi-labs/react@0.6.0 reached the registry unresolvable by npm/yarn
  // consumers — with a green publish job both times. Only `pnpm publish`
  // rewrites the protocol, so the default implementation must stay pnpm.
  it("defaults to pnpm publish so workspace:* is rewritten in the published manifest", async () => {
    // Walk up from cwd: vitest runs from the repo root, but the suite is also
    // runnable from packages/client. `import.meta.url` is not a file: URL once
    // vitest has transformed the module, so it cannot be used here.
    let dir = process.cwd();
    let scriptPath = "";
    for (let i = 0; i < 5; i += 1) {
      const candidate = path.join(dir, "scripts/publish-package-if-needed.mjs");
      if (existsSync(candidate)) {
        scriptPath = candidate;
        break;
      }
      dir = path.dirname(dir);
    }
    expect(scriptPath, "publish script not found from cwd").not.toBe("");
    const source = readFileSync(scriptPath, "utf8");
    expect(source).toMatch(/publishImpl\s*=\s*publishWithPnpm/);
    expect(source).toMatch(/spawn\(\s*["']pnpm["']/);
    // `npm publish` must not be the transport, under any function name.
    expect(source).not.toMatch(/spawn\(\s*["']npm["']/);
    // Detached candidate-SHA checkouts have no branch; pnpm refuses without it.
    expect(source).toContain("--no-git-checks");
  });
});
