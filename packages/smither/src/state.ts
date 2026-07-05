import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  WORKFLOW_NAME,
  defaultSteps,
  type RunPlan,
  type WorkbenchIntake,
  type WorkflowStep,
} from "./types";

export const packageRoot = resolvePackageRoot();
export const defaultRunsRoot = path.join(packageRoot, ".smithers", "runs");

function resolvePackageRoot(cwd = process.cwd()): string {
  const workspacePackage = path.join(cwd, "packages", "workbench", "package.json");
  if (existsSync(workspacePackage)) {
    return path.join(cwd, "packages", "workbench");
  }
  return cwd;
}

export function sanitizeAppName(app: string): string {
  return app.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function runDir(app: string, root = defaultRunsRoot): string {
  return path.join(root, sanitizeAppName(app));
}

export function planPath(app: string, root = defaultRunsRoot): string {
  return path.join(runDir(app, root), "plan.json");
}

export async function loadRunPlan(
  app: string,
  root = defaultRunsRoot,
): Promise<RunPlan | null> {
  try {
    return JSON.parse(await readFile(planPath(app, root), "utf8")) as RunPlan;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

export function createRunPlan(
  intake: WorkbenchIntake,
  smithers: RunPlan["smithers"],
): RunPlan {
  const now = new Date().toISOString();
  return {
    workflow: WORKFLOW_NAME,
    runId: randomUUID(),
    app: intake.app,
    createdAt: now,
    updatedAt: now,
    smithers,
    intake,
    steps: defaultSteps.map((step) => ({ ...step })),
  };
}

export async function saveRunPlan(
  plan: RunPlan,
  root = defaultRunsRoot,
): Promise<void> {
  const next = { ...plan, updatedAt: new Date().toISOString() };
  await mkdir(runDir(plan.app, root), { recursive: true });
  await writeFile(planPath(plan.app, root), `${JSON.stringify(next, null, 2)}\n`);
}

export async function resetRunPlan(app: string, root = defaultRunsRoot): Promise<void> {
  await rm(runDir(app, root), { recursive: true, force: true });
}

export function updateStep(
  plan: RunPlan,
  id: string,
  patch: Partial<WorkflowStep>,
): RunPlan {
  const now = new Date().toISOString();
  return {
    ...plan,
    updatedAt: now,
    steps: plan.steps.map((step) =>
      step.id === id
        ? {
            ...step,
            ...patch,
            startedAt:
              patch.status === "running" && !step.startedAt ? now : step.startedAt,
            finishedAt:
              patch.status && ["complete", "skipped", "failed"].includes(patch.status)
                ? now
                : step.finishedAt,
          }
        : step,
    ),
  };
}
