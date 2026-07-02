import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveAomiBinaries, targetBinaryPaths } from "../binaries";
import type { CommandRunner } from "../types";

describe("resolveAomiBinaries", () => {
  it("builds fresh SDK binaries before using target paths", async () => {
    const sdkRoot = await mkdtemp(path.join(os.tmpdir(), "aomi-sdk-"));
    const calls: string[] = [];
    const runner: CommandRunner = async (file, args) => {
      calls.push([file, ...args].join(" "));
      return { exitCode: 0, stdout: "", stderr: "" };
    };

    const resolved = await resolveAomiBinaries(sdkRoot, runner);

    expect(resolved.source).toBe("fresh-cargo-build");
    expect(resolved.aomiBuild).toBe(targetBinaryPaths(sdkRoot).aomiBuild);
    expect(calls[0]).toContain("cargo build --manifest-path");
    expect(calls[0]).toContain("--features cli,dev-runtime --bins --release");
  });

  it("falls back to existing target binaries with a drift warning", async () => {
    const sdkRoot = await mkdtemp(path.join(os.tmpdir(), "aomi-sdk-"));
    const bins = targetBinaryPaths(sdkRoot);
    await mkdir(path.dirname(bins.aomiBuild), { recursive: true });
    await writeFile(bins.aomiBuild, "");
    await writeFile(bins.aomiRun, "");

    const runner: CommandRunner = async () => ({
      exitCode: 1,
      stdout: "",
      stderr: "cargo missing",
    });

    const resolved = await resolveAomiBinaries(sdkRoot, runner);

    expect(resolved.source).toBe("stale-target-fallback");
    expect(resolved.warning).toContain("may lag the checkout");
  });

  it("falls back to PATH binaries after target fallback is unavailable", async () => {
    const sdkRoot = await mkdtemp(path.join(os.tmpdir(), "aomi-sdk-"));
    const runner: CommandRunner = async (file) => ({
      exitCode: file === "cargo" ? 1 : 0,
      stdout: "",
      stderr: "",
    });

    const resolved = await resolveAomiBinaries(sdkRoot, runner);

    expect(resolved.source).toBe("path-fallback");
    expect(resolved.warning).toContain("PATH binaries");
  });
});
