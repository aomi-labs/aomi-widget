import { execFile } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { observeSmitherArtifactFailure } from "./observability";
import type { SmitherArtifactFailureKind } from "./observability";
import type { CommandRunner } from "./types";

/**
 * Crate artifact packaging for the result phase. The generated app's file
 * tree and a small tarball ride the durable result row, so surfaces that
 * cannot see the run's filesystem (the web BFF observing a sandbox run)
 * still serve real Files and Download.
 */

export type CrateFileNode = {
  path: string;
  type: "file" | "folder";
  children?: CrateFileNode[];
};

const TREE_SKIP = new Set(["target", "node_modules", ".git", "Cargo.lock"]);

/** The generated crate as a display tree. Paths are prefixed with the app
 *  name ("<app>/src/tool.rs") — the shape the /build page renders. */
function readCrateFileTree(
  appDir: string,
  app: string,
  onFailure?: (kind: SmitherArtifactFailureKind) => void,
): CrateFileNode[] {
  const walk = (dir: string, rel: string, depth: number): CrateFileNode[] => {
    if (depth > 4) return [];
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch (error) {
      observeSmitherArtifactFailure({ kind: "crate_tree_read", error });
      onFailure?.("crate_tree_read");
      return [];
    }
    return entries
      .filter((e) => !TREE_SKIP.has(e.name) && !e.name.startsWith("."))
      .sort((a, b) =>
        a.isDirectory() === b.isDirectory()
          ? a.name.localeCompare(b.name)
          : a.isDirectory()
            ? -1
            : 1,
      )
      .map((e) => {
        const childRel = `${rel}/${e.name}`;
        return e.isDirectory()
          ? {
              path: childRel,
              type: "folder" as const,
              children: walk(path.join(dir, e.name), childRel, depth + 1),
            }
          : { path: childRel, type: "file" as const };
      });
  };
  if (!existsSync(appDir)) return [];
  return [{ path: app, type: "folder", children: walk(appDir, app, 0) }];
}

export function crateFileTree(appDir: string, app: string): CrateFileNode[] {
  return readCrateFileTree(appDir, app);
}

/** Keep the embedded tarball comfortably under the run's maxOutputBytes
 *  (executeRun raises it to 4 MB for exactly this row). */
const MAX_TAR_B64_CHARS = 2_500_000;

/** Plain child_process runner — packaging is a local tar spawn and must not
 *  depend on the heavier workflow runner stack. Injectable for tests/TUI. */
const localRunner: CommandRunner = (file, args, options) =>
  new Promise((resolve) => {
    execFile(
      file,
      args,
      { cwd: options?.cwd, env: options?.env, maxBuffer: 16 * 1024 * 1024 },
      (error, stdout, stderr) => {
        const exitCode =
          error && typeof (error as { code?: unknown }).code === "number"
            ? (error as { code: number }).code
            : error
              ? 1
              : 0;
        resolve({ exitCode, stdout: String(stdout), stderr: String(stderr) });
      },
    );
  });

export type CrateArtifact = {
  /** JSON-encoded CrateFileNode[]; "" when the crate directory is absent. */
  fileTreeJson: string;
  /** Base64 .tar.gz of apps/<app> (target/ and Cargo.lock excluded); "" when
   *  packaging failed or the crate exceeds the embed cap. */
  crateTarB64: string;
  /** Human-readable packaging warning, if any. */
  warning: string;
  /** Bounded cross-process signal; never contains paths, output, or source. */
  failureCode: SmitherArtifactFailureKind | "";
};

export type ArtifactTempDirectory = {
  create(prefix: string): string;
  remove(directory: string): void;
};

const localTempDirectory: ArtifactTempDirectory = {
  create: (prefix) => mkdtempSync(prefix),
  remove: (directory) => rmSync(directory, { recursive: true, force: true }),
};

export async function packageCrate(options: {
  sdkRoot: string;
  app: string;
  runner?: CommandRunner;
  tempDirectory?: ArtifactTempDirectory;
}): Promise<CrateArtifact> {
  const appsDir = path.join(options.sdkRoot, "apps");
  const appDir = path.join(appsDir, options.app);
  if (!existsSync(appDir)) {
    return {
      fileTreeJson: "",
      crateTarB64: "",
      warning: `no generated crate at apps/${options.app}`,
      failureCode: "",
    };
  }
  let failureCode: SmitherArtifactFailureKind | "" = "";
  const fileTreeJson = JSON.stringify(
    readCrateFileTree(appDir, options.app, (kind) => {
      failureCode ||= kind;
    }),
  );
  const runner = options.runner ?? localRunner;
  const tempDirectory = options.tempDirectory ?? localTempDirectory;
  let tmp: string | undefined;
  let artifact: CrateArtifact;
  try {
    tmp = tempDirectory.create(path.join(tmpdir(), "aomi-crate-"));
    const tarPath = path.join(tmp, `${options.app}.tar.gz`);
    const tar = await runner("tar", [
      "-czf",
      tarPath,
      "--exclude",
      "target",
      "--exclude",
      "Cargo.lock",
      "-C",
      appsDir,
      options.app,
    ]);
    if (tar.exitCode !== 0) {
      observeSmitherArtifactFailure({
        kind: "crate_tar",
        error: new Error("Crate tar subprocess failed"),
      });
      artifact = {
        fileTreeJson,
        crateTarB64: "",
        warning: `tar failed: ${(tar.stderr || tar.stdout).slice(0, 300)}`,
        failureCode: "crate_tar",
      };
    } else {
      const crateTarB64 = readFileSync(tarPath).toString("base64");
      artifact =
        crateTarB64.length > MAX_TAR_B64_CHARS
          ? {
              fileTreeJson,
              crateTarB64: "",
              warning: `crate too large to embed (${crateTarB64.length} base64 chars > ${MAX_TAR_B64_CHARS})`,
              failureCode,
            }
          : { fileTreeJson, crateTarB64, warning: "", failureCode };
    }
  } catch (error) {
    observeSmitherArtifactFailure({ kind: "crate_package", error });
    artifact = {
      fileTreeJson,
      crateTarB64: "",
      warning: "artifact packaging failed",
      failureCode: "crate_package",
    };
  }

  if (tmp) {
    try {
      tempDirectory.remove(tmp);
    } catch (error) {
      observeSmitherArtifactFailure({ kind: "crate_cleanup", error });
      artifact = {
        ...artifact,
        warning: artifact.warning || "artifact cleanup failed",
        failureCode: artifact.failureCode || "crate_cleanup",
      };
    }
  }

  return artifact;
}
