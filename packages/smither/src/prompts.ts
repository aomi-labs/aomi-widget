import type { BuildPlan } from "./plan";
import { buildPlanSchema } from "./plan";

export function curatePrompt(plan: BuildPlan): string {
  const appPath = `apps/${plan.app}`;
  return [
    `Use the aomi-app-ux-tool-maker skill to curate ${plan.app} into user-centric Aomi tools.`,
    `Keep edits scoped to ${appPath} and required ext/ files.`,
    `Primary user story: ${plan.userStory}`,
  ].join(" ");
}

export function reviewPrompt(plan: BuildPlan): string {
  const appPath = `apps/${plan.app}`;
  return [
    `You are reviewing the tool curation that just happened in this session for ${plan.app}.`,
    `Re-read the changed files under ${appPath} with fresh eyes.`,
    `Judge whether the curated tools serve the primary user story: ${plan.userStory}.`,
    `Report concrete problems (missing tools, wrong parameters, unsafe defaults) — do not edit files.`,
  ].join(" ");
}

export function fixPrompt(plan: BuildPlan, validationLog: string): string {
  const appPath = `apps/${plan.app}`;
  return `Fix validation failures for ${plan.app}. Keep edits scoped to ${appPath} and required ext/ files.\n\nValidation log:\n${validationLog}`;
}

export type IntentTurn = {
  role: "user" | "smither";
  text: string;
};

/** Fields the intent agent is allowed to propose. Derived from the schema so
 *  the instructions never drift from what mergePlanDraft will accept. */
export function intentPlanFields(): string[] {
  return Object.keys(buildPlanSchema.shape);
}

export function intentPrompt(input: {
  turns: IntentTurn[];
  draft: Record<string, unknown>;
  sdkRoot: string;
}): string {
  const transcript = input.turns
    .map((turn) => `${turn.role === "user" ? "User" : "Smither"}: ${turn.text}`)
    .join("\n");
  return `You are the intake brain of aomi-smither, a terminal orchestrator that builds Aomi apps
(Rust plugins generated from OpenAPI specs) inside the SDK checkout at ${input.sdkRoot}.

An Aomi app build plan has these fields: ${intentPlanFields().join(", ")}.
- "source" is "url" when the user has an OpenAPI spec URL (set openApiUrl too),
  "existing" when apps/<app>/openapi.yaml already exists in the SDK checkout,
  and "discover" when aomi-build should find or draft the spec.
- "builder" is the coding agent that curates tools and repairs validation
  failures: "claude", "codex", or "none".
- "review" adds a second agent pass; "smoke" runs a local prompt against the
  compiled plugin; "deploy" ships it after an approval gate.
You may list files under ${input.sdkRoot}/apps to check whether a spec already exists.

Current draft plan: ${JSON.stringify(input.draft)}

Conversation so far:
${transcript}

Figure out what the user wants to build. Respond with ONLY a JSON object, no
markdown fences, shaped exactly like:
{"summary": "<one-sentence restatement of the intent>",
 "plan": {<only the plan fields you can infer, e.g. "app": "weather">},
 "questions": ["<at most two short questions for what you still need>"],
 "ready": <true when the plan has enough to run: at least app + source story>}`;
}

/** Pull the last JSON object out of agent CLI output. CLI agents wrap answers
 *  in prose or fences despite instructions, so scan rather than parse whole. */
export function extractJsonObject(raw: string): unknown {
  const text = raw.trim();
  const direct = tryParse(text);
  if (direct !== undefined) return direct;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return undefined;
  // Try progressively smaller windows from the outermost braces.
  for (let from = start; from !== -1 && from < end; from = text.indexOf("{", from + 1)) {
    const candidate = tryParse(text.slice(from, end + 1));
    if (candidate !== undefined) return candidate;
  }
  return undefined;
}

function tryParse(candidate: string): unknown {
  try {
    return JSON.parse(candidate);
  } catch {
    return undefined;
  }
}
