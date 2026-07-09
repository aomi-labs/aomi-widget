import path from "node:path";
import type { BuildPlan, EvalPhase } from "./plan";
import type { CommandRunner, ResolvedBinaries } from "./types";
import { pluginLibraryFileName, runAomiBuild, runAomiRun } from "./commands";
import { boundedLog, type EvaluationRow } from "./schemas";
import { extractJsonObject, judgePrompt } from "./prompts";

/** Which agent judges an eval: the phase's explicit choice, else the builder
 *  (claude when the builder is none — a judge is always an LLM). */
export function evalJudge(plan: BuildPlan, phase: EvalPhase): "claude" | "codex" {
  if (phase.judge) return phase.judge;
  return plan.builder === "none" ? "claude" : plan.builder;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * Run one behavioral eval: compile the plugin, run it against the scenario,
 * then have a read-only judge score the transcript against the rubric. The
 * judge never edits files — it returns strict JSON we parse into a metric.
 * This is the exit signal for an `eval-pass` loop.
 */
export async function runEvalStep(options: {
  plan: BuildPlan;
  phase: EvalPhase;
  binaries: ResolvedBinaries;
  runner: CommandRunner;
}): Promise<EvaluationRow> {
  const { plan, phase, binaries, runner } = options;

  const compile = await runAomiBuild(binaries, "compile", ["--app", plan.app], runner);
  if (compile.exitCode !== 0) {
    throw new Error(`eval compile failed: ${boundedLog(compile.stderr || compile.stdout)}`);
  }
  const plugin = path.join(plan.sdkRoot, "plugins", pluginLibraryFileName(plan.app));
  const run = await runAomiRun(binaries, plugin, ["--prompt", phase.scenario], runner);
  if (run.exitCode !== 0) {
    throw new Error(`eval scenario run failed: ${boundedLog(run.stderr || run.stdout)}`);
  }
  const transcript = boundedLog(run.stdout, 6000);

  const prompt = judgePrompt({
    app: plan.app,
    scenario: phase.scenario,
    rubric: phase.rubric,
    transcript,
  });
  const judge = evalJudge(plan, phase);
  const judged =
    judge === "codex"
      ? await runner(
          "codex",
          ["exec", "--sandbox", "read-only", "--skip-git-repo-check", prompt],
          { cwd: plan.sdkRoot },
        )
      : await runner("claude", ["-p", prompt], { cwd: plan.sdkRoot, stdin: "ignore" });
  if (judged.exitCode !== 0) {
    throw new Error(`eval judge failed: ${boundedLog(judged.stderr || judged.stdout)}`);
  }

  const parsed = extractJsonObject(judged.stdout) as
    | { score?: unknown; notes?: unknown }
    | undefined;
  const score = clamp01(Number(parsed?.score));
  const notes = typeof parsed?.notes === "string" ? parsed.notes : "";
  return {
    score,
    pass: score >= phase.threshold,
    threshold: phase.threshold,
    notes,
    transcript,
  };
}
