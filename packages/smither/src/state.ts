import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { buildPlanSchema, type BuildPlan } from "./plan";

export const packageRoot = resolvePackageRoot();
export const defaultRunsRoot = path.join(packageRoot, ".smithers", "runs");

function resolvePackageRoot(cwd = process.cwd()): string {
  const workspacePackage = path.join(cwd, "packages", "smither", "package.json");
  if (existsSync(workspacePackage)) {
    return path.join(cwd, "packages", "smither");
  }
  return cwd;
}

export function sanitizeAppName(app: string): string {
  return app.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function runDir(app: string, root = defaultRunsRoot): string {
  return path.join(root, sanitizeAppName(app));
}

export function smitherDbPath(app: string, root = defaultRunsRoot): string {
  return path.join(runDir(app, root), "smithers.sqlite");
}

export function runStatePath(app: string, root = defaultRunsRoot): string {
  return path.join(runDir(app, root), "run.json");
}

/** Pointer to the durable Smithers run for an app. The run itself (outputs,
 *  approvals, frames) lives in smithers.sqlite; this only remembers which
 *  runId to resume. */
export type RunState = {
  app: string;
  runId: string;
  createdAt: string;
};

export async function loadRunState(
  app: string,
  root = defaultRunsRoot,
): Promise<RunState | null> {
  try {
    return JSON.parse(await readFile(runStatePath(app, root), "utf8")) as RunState;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

export async function createRunState(
  app: string,
  root = defaultRunsRoot,
): Promise<RunState> {
  const state: RunState = {
    app,
    runId: `smither-${sanitizeAppName(app)}-${randomUUID()}`,
    createdAt: new Date().toISOString(),
  };
  await mkdir(runDir(app, root), { recursive: true });
  await writeFile(runStatePath(app, root), `${JSON.stringify(state, null, 2)}\n`);
  return state;
}

export async function resetRunState(app: string, root = defaultRunsRoot): Promise<void> {
  await rm(runDir(app, root), { recursive: true, force: true });
}

export function planPath(app: string, root = defaultRunsRoot): string {
  return path.join(runDir(app, root), "plan.json");
}

/** Persist the BuildPlan beside the run so another process (e.g.
 *  `aomi-smither console --app`) can rebuild the identical workflow and
 *  register it for observation. */
export async function savePlan(plan: BuildPlan, root = defaultRunsRoot): Promise<void> {
  await mkdir(runDir(plan.app, root), { recursive: true });
  await writeFile(planPath(plan.app, root), `${JSON.stringify(plan, null, 2)}\n`);
}

export async function loadPlan(
  app: string,
  root = defaultRunsRoot,
): Promise<BuildPlan | null> {
  try {
    const raw = await readFile(planPath(app, root), "utf8");
    return buildPlanSchema.parse(JSON.parse(raw));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw err;
  }
}
