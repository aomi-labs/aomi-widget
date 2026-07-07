import type { AgentRole, BuildPlan } from "./plan";
import { buildPlanSchema } from "./plan";

/** Context an agent phase can fold into its prompt: the composer's brief for
 *  this phase, and any clarify answers the human gave earlier in the run. */
export type PromptContext = {
  brief?: string;
  clarifications?: Array<{ question: string; selected: string; notes?: string | null }>;
};

function contextLines(context?: PromptContext): string {
  if (!context) return "";
  const lines: string[] = [];
  if (context.brief) lines.push(`Focus for this phase: ${context.brief}`);
  for (const c of context.clarifications ?? []) {
    lines.push(
      `Human decision — "${c.question}": chose "${c.selected}"${c.notes ? ` (${c.notes})` : ""}`,
    );
  }
  return lines.length > 0 ? `\n${lines.join("\n")}` : "";
}

export function curatePrompt(plan: BuildPlan, context?: PromptContext): string {
  const appPath = `apps/${plan.app}`;
  return (
    [
      `Use the aomi-app-ux-tool-maker skill to curate ${plan.app} into user-centric Aomi tools.`,
      `Keep edits scoped to ${appPath} and required ext/ files.`,
      `Primary user story: ${plan.userStory}`,
    ].join(" ") + contextLines(context)
  );
}

export function reviewPrompt(plan: BuildPlan, context?: PromptContext): string {
  const appPath = `apps/${plan.app}`;
  return (
    [
      `You are an independent reviewer of the ${plan.app} Aomi app's curated tool surface.`,
      `Read ${appPath}/src/tool.rs and ${appPath}/src/lib.rs with fresh eyes.`,
      `Judge whether the curated tools serve the primary user story: ${plan.userStory}.`,
      `Report concrete problems (missing tools, wrong parameters, unsafe defaults) — do not edit files.`,
    ].join(" ") + contextLines(context)
  );
}

export function fixPrompt(
  plan: BuildPlan,
  validationLog: string,
  context?: PromptContext,
): string {
  const appPath = `apps/${plan.app}`;
  return `Fix validation failures for ${plan.app}. Keep edits scoped to ${appPath} and required ext/ files.${contextLines(context)}\n\nValidation log:\n${validationLog}`;
}

export function researchPrompt(plan: BuildPlan, context?: PromptContext): string {
  return (
    [
      `Research how the protocols behind "${plan.app}" work, in service of: ${plan.userStory}.`,
      `Use web search, protocol docs, and contract source. Write your findings to`,
      `apps/${plan.app}/research.md in the SDK checkout: core mechanisms, key contract`,
      `addresses and entry points, risks, and the concrete user actions the Aomi agent`,
      `should support. Findings must be specific enough to build preambles and tools from —`,
      `cite sources inline. Do not edit any other files.`,
    ].join(" ") + contextLines(context)
  );
}

export function draftSpecPrompt(plan: BuildPlan, context?: PromptContext): string {
  return (
    [
      `Use the aomi-app-client-api-gen skill to draft an OpenAPI spec for ${plan.app}`,
      `from the platform's public docs, in service of: ${plan.userStory}.`,
      `Write it to apps/${plan.app}/openapi.yaml. Cover the endpoints the user story`,
      `needs — small and correct beats exhaustive. Validate the YAML parses before finishing.`,
    ].join(" ") + contextLines(context)
  );
}

export function synthesizePrompt(plan: BuildPlan, context?: PromptContext): string {
  return (
    [
      `Distill the research in apps/${plan.app}/research.md into Aomi building blocks for:`,
      `${plan.userStory}. Produce preamble sections (agent behavior instructions grounded in`,
      `the protocol mechanics) and, where existing SDK on-chain primitives suffice, thin tool`,
      `wrappers. Keep edits scoped to apps/${plan.app} and required ext/ files. The output must`,
      `compile if it touches Rust; preambles live beside the app per SDK convention.`,
    ].join(" ") + contextLines(context)
  );
}

/** Prompt for an agent phase by role. */
export function rolePrompt(
  role: AgentRole,
  plan: BuildPlan,
  context?: PromptContext & { validationLog?: string },
): string {
  switch (role) {
    case "curate":
      return curatePrompt(plan, context);
    case "review":
      return reviewPrompt(plan, context);
    case "fix":
      return fixPrompt(plan, context?.validationLog ?? "", context);
    case "research":
      return researchPrompt(plan, context);
    case "draft-spec":
      return draftSpecPrompt(plan, context);
    case "synthesize":
      return synthesizePrompt(plan, context);
  }
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
(Rust plugins for the Aomi agent platform) inside the SDK checkout at ${input.sdkRoot}.

You COMPOSE the workflow: a plan is flags plus an optional "phases" array — a
composition of typed phases the workflow renders directly. The human reviews and
edits your composition in a preview before anything runs.

Plan fields: ${intentPlanFields().join(", ")}.
- "source" is "url" when the user has an OpenAPI spec URL (set openApiUrl too),
  "existing" when apps/<app>/openapi.yaml already exists in the SDK checkout,
  and "discover" when aomi-build should search public sources for a spec.
- "builder" curates tools and repairs validation: "claude", "codex", or "none".

Phase vocabulary (each: unique kebab-case "id"):
- {"kind":"compute","id","op"} — op: binaries | codegen | validate | smoke | deploy | result
- {"kind":"agent","id","role","brief"?} — role: curate | review | fix | research | draft-spec | synthesize.
  research: investigate protocols (web/docs/contracts), write apps/<app>/research.md.
  draft-spec: draft apps/<app>/openapi.yaml from platform docs (for platforms with a real HTTP API but no published spec).
  synthesize: turn research.md into preambles/building blocks for on-chain-only protocols with no API at all.
- {"kind":"clarify","id","question","options":[{"key","label","summary"?},...]} — pause the RUN and
  ask the human; first option is your recommendation. Use for decisions that only surface mid-run.
- {"kind":"gate","id","title","summary"?} — binary approval pause (e.g. before deploy).
- {"kind":"loop","id","until":"validation-green","maxRounds",body:[phases]} — put a
  {"op":"validate"} compute and a {"role":"fix","onlyIf":"prev-red"} agent in the body.

Omit "phases" entirely when the standard pipeline fits (spec exists or a URL is given):
binaries → codegen → curate → validate-loop → result comes built-in from the flags.
Compose custom phases when the target needs a different shape.

VIABILITY — do this before answering: check whether ${input.sdkRoot}/apps/<app>/openapi.yaml
exists for your candidate app name, and use your knowledge of the platform's API surface.
If the platform has NO public HTTP API (e.g. on-chain-only protocols like Morpho — GraphQL
or contracts only), a spec-based build WILL FAIL at codegen. Do not mark such a plan ready
with source "discover". Instead either (a) ask the user to choose between research-mode
(research → synthesize preambles), draft-spec from docs, or a different target — put that
in "questions" — or (b) if the conversation already settled it, compose the phases for the
chosen path.

Current draft plan: ${JSON.stringify(input.draft)}

Conversation so far:
${transcript}

Figure out what the user wants to build. Respond with ONLY a JSON object, no
markdown fences, shaped exactly like:
{"summary": "<one-sentence restatement of the intent>",
 "plan": {<only the plan fields you can infer; include "phases" only for custom compositions>},
 "questions": ["<at most two short questions for what you still need>"],
 "ready": <true when the plan has enough to run AND the build path is viable>}`;
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
