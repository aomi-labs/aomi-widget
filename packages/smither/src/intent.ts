import { z } from "zod";
import type { CommandRunner } from "./types";
import { defaultRunner } from "./binaries";
import type { BuildPlan } from "./plan";
import { extractJsonObject, intentPrompt, type IntentTurn } from "./prompts";

export const intentDraftSchema = z.object({
  summary: z.string().default(""),
  /** Partial BuildPlan fields the agent inferred; merged via mergePlanDraft. */
  plan: z.record(z.string(), z.unknown()).default({}),
  questions: z.array(z.string()).default([]),
  ready: z.boolean().default(false),
});

export type IntentDraft = z.infer<typeof intentDraftSchema>;

export type IntentAgent = "claude" | "codex";

/**
 * One round of the intake conversation: hand the full transcript and current
 * draft to a read-only CLI agent, get back a refined draft plus follow-up
 * questions. Runs outside the Smithers workflow — the distilled BuildPlan
 * becomes the run's immutable input.
 */
export async function distillIntent(options: {
  turns: IntentTurn[];
  draft: Partial<BuildPlan>;
  sdkRoot: string;
  agent?: IntentAgent;
  runner?: CommandRunner;
}): Promise<IntentDraft> {
  const runner = options.runner ?? defaultRunner;
  const agent = options.agent ?? "claude";
  const prompt = intentPrompt({
    turns: options.turns,
    draft: options.draft as Record<string, unknown>,
    sdkRoot: options.sdkRoot,
  });
  const result =
    agent === "codex"
      ? await runner(
          "codex",
          ["exec", "--sandbox", "read-only", "--skip-git-repo-check", prompt],
          { cwd: options.sdkRoot },
        )
      : await runner("claude", ["-p", prompt], {
          cwd: options.sdkRoot,
          stdin: "ignore",
        });
  if (result.exitCode !== 0) {
    throw new Error(
      `${agent} intent distillation failed: ${result.stderr || result.stdout}`,
    );
  }
  const parsed = extractJsonObject(result.stdout);
  if (parsed === undefined) {
    throw new Error(
      `could not parse intent JSON from ${agent} output:\n${result.stdout.slice(0, 500)}`,
    );
  }
  return intentDraftSchema.parse(parsed);
}
