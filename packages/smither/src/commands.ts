import path from "node:path";
import os from "node:os";
import { readFile } from "node:fs/promises";
import type { CommandRunner, ResolvedBinaries } from "./types";
import { defaultRunner } from "./binaries";

export type AomiBuildCommand =
  | "gen-specs"
  | "gen-client"
  | "gen-tool"
  | "new-app"
  | "compile"
  | "deploy"
  | "status"
  | "activate";

export async function runAomiBuild(
  binaries: ResolvedBinaries,
  command: AomiBuildCommand,
  args: string[] = [],
  runner: CommandRunner = defaultRunner,
  env?: NodeJS.ProcessEnv,
) {
  return runner(binaries.aomiBuild, [command, ...args], {
    cwd: binaries.sdkRoot,
    ...(env ? { env } : {}),
  });
}

export async function runAomiRun(
  binaries: ResolvedBinaries,
  pluginPath: string,
  args: string[] = [],
  runner: CommandRunner = defaultRunner,
) {
  return runner(binaries.aomiRun, [pluginPath, ...args], { cwd: binaries.sdkRoot });
}

export async function runAppCargoChecks(
  sdkRoot: string,
  app: string,
  runner: CommandRunner = defaultRunner,
) {
  // Apps are `exclude`d from the SDK root workspace (app-local mode), so
  // `-p <app>` at the root never resolves; target the app's own manifest.
  const manifest = path.join(sdkRoot, "apps", app, "Cargo.toml");
  const fmt = await runner("cargo", ["fmt", "--manifest-path", manifest], {
    cwd: sdkRoot,
  });
  if (fmt.exitCode !== 0) {
    return fmt;
  }

  const clippy = await runner(
    "cargo",
    ["clippy", "--manifest-path", manifest, "--lib", "--", "-Dwarnings"],
    { cwd: sdkRoot },
  );
  if (clippy.exitCode !== 0) {
    return clippy;
  }

  return runner("cargo", ["test", "--manifest-path", manifest, "--no-run"], {
    cwd: sdkRoot,
  });
}

export function newAppArgs(input: {
  app: string;
  source: "discover" | "url" | "existing";
  openApiUrl?: string;
  shared: boolean;
  includeAllOperations: boolean;
  force: boolean;
  build: boolean;
}): string[] {
  if (input.source === "existing") {
    return [
      "gen-client",
      input.app,
      ...(input.shared ? ["--shared"] : []),
      ...(input.force ? ["--force"] : []),
    ];
  }

  // Always `--all`: without it aomi-build opens an interactive operation
  // picker, which dies under the workflow runner (no TTY). The agent
  // curation step prunes the tool surface afterwards.
  return [
    "new-app",
    input.app,
    ...(input.openApiUrl ? ["--from-url", input.openApiUrl] : []),
    ...(input.shared ? ["--shared"] : []),
    "--all",
    ...(input.force ? ["--force"] : []),
    ...(input.build ? [] : ["--no-build"]),
  ];
}

export type ActivationCredential = {
  source: "flag" | "env" | "config";
  token: string;
};

export function activationConfigPath(env: NodeJS.ProcessEnv = process.env): string {
  const root = env.XDG_CONFIG_HOME?.trim() || path.join(env.HOME || os.homedir(), ".config");
  return path.join(root, "aomi", "config.toml");
}

export async function resolveActivationCredential(options: {
  activationToken?: string;
  env?: NodeJS.ProcessEnv;
  configPath?: string;
} = {}): Promise<ActivationCredential | null> {
  const flagToken = options.activationToken?.trim();
  if (flagToken) {
    return { source: "flag", token: flagToken };
  }

  const env = options.env ?? process.env;
  const envToken = env.AOMI_APP_ACTIVATION_TOKEN?.trim();
  if (envToken) {
    return { source: "env", token: envToken };
  }

  const configPath = options.configPath ?? activationConfigPath(env);
  try {
    const config = await readFile(configPath, "utf8");
    const match = config.match(/^\s*activation_token\s*=\s*"([^"]+)"\s*$/m);
    const token = match?.[1]?.trim();
    return token ? { source: "config", token } : null;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

export function pluginLibraryFileName(manifestName: string, platform = process.platform): string {
  const baseName = manifestName.replaceAll("-", "_");
  if (platform === "win32") {
    return `${baseName}.dll`;
  }
  if (platform === "darwin") {
    return `${baseName}.dylib`;
  }
  return `${baseName}.so`;
}
