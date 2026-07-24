import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { publishPackageIfNeeded } from "../../../scripts/publish-package-if-needed.mjs";

const packageDirectory = path.resolve("packages/client");

describe("publishPackageIfNeeded", () => {
  it("skips an exact version that is already published", async () => {
    const publishImpl = vi.fn();

    await expect(
      publishPackageIfNeeded(packageDirectory, {
        fetchImpl: vi.fn(async () => new Response(null, { status: 200 })),
        publishImpl,
      }),
    ).resolves.toBe("skipped");

    expect(publishImpl).not.toHaveBeenCalled();
  });

  it("publishes when the exact version is absent", async () => {
    const publishImpl = vi.fn(async () => undefined);

    await expect(
      publishPackageIfNeeded(packageDirectory, {
        fetchImpl: vi.fn(async () => new Response(null, { status: 404 })),
        publishImpl,
      }),
    ).resolves.toBe("published");

    expect(publishImpl).toHaveBeenCalledWith("@aomi-labs/client");
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
    ).rejects.toThrow(
      "Registry check for @aomi-labs/client@0.3.9 failed with HTTP 503",
    );

    expect(publishImpl).not.toHaveBeenCalled();
  });

  it("accepts a concurrent publish after its own publish attempt fails", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    await expect(
      publishPackageIfNeeded(packageDirectory, {
        fetchImpl,
        publishImpl: vi.fn(async () => {
          throw new Error("version already exists");
        }),
      }),
    ).resolves.toBe("published");

    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
