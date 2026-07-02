import { access } from "node:fs/promises";
import path from "node:path";
import { execa } from "execa";
import type { CommandResult, CommandRunner, ResolvedBinaries } from "./types";

const executable = process.platform === "win32" ? ".exe" : "";

export const defaultRunner: CommandRunner = async (file, args, options) => {
  const result = await execa(file, args, {
    cwd: options?.cwd,
    env: options?.env,
    reject: false,
    all: false,
  });
  return {
    exitCode: result.exitCode ?? 0,
    stdout: result.stdout,
    stderr: result.stderr,
  };
};

async function fileExists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

export function defaultSdkRoot(cwd = process.cwd()): string {
  return path.resolve(cwd, "../aomi-sdk");
}

export function targetBinaryPaths(sdkRoot: string): Pick<ResolvedBinaries, "aomiBuild" | "aomiRun"> {
  return {
    aomiBuild: path.join(sdkRoot, "target", "release", `aomi-build${executable}`),
    aomiRun: path.join(sdkRoot, "target", "release", `aomi-run${executable}`),
  };
}

export async function resolveAomiBinaries(
  sdkRoot: string,
  runner: CommandRunner = defaultRunner,
): Promise<ResolvedBinaries> {
  const resolvedRoot = path.resolve(sdkRoot);
  const bins = targetBinaryPaths(resolvedRoot);
  const manifest = path.join(resolvedRoot, "sdk", "Cargo.toml");
  const cargoArgs = [
    "build",
    "--manifest-path",
    manifest,
    "--features",
    "cli,dev-runtime",
    "--bins",
    "--release",
  ];

  const cargo = await runner("cargo", cargoArgs, { cwd: resolvedRoot });
  if (cargo.exitCode === 0) {
    return { ...bins, sdkRoot: resolvedRoot, source: "fresh-cargo-build" };
  }

  if ((await fileExists(bins.aomiBuild)) && (await fileExists(bins.aomiRun))) {
    return {
      ...bins,
      sdkRoot: resolvedRoot,
      source: "stale-target-fallback",
      warning:
        "cargo build failed; using existing target/release binaries, which may lag the checkout",
    };
  }

  const pathBuild = await runner(`aomi-build${executable}`, ["--help"]);
  const pathRun = await runner(`aomi-run${executable}`, ["--help"]);
  if (pathBuild.exitCode === 0 && pathRun.exitCode === 0) {
    return {
      aomiBuild: `aomi-build${executable}`,
      aomiRun: `aomi-run${executable}`,
      sdkRoot: resolvedRoot,
      source: "path-fallback",
      warning:
        "cargo build failed; using PATH binaries, which may drift from the selected SDK checkout",
    };
  }

  throw new Error(
    `Could not build or find aomi-build/aomi-run. Install Rust or run: cargo install aomi-sdk --features cli,dev-runtime\n\ncargo stderr:\n${cargo.stderr}`,
  );
}
