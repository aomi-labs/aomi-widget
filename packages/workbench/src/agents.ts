import type { CommandRunner } from "./types";
import { defaultRunner } from "./binaries";

export type AgentName = "codex" | "claude";

export function agentPrompt(input: {
  app: string;
  sdkRoot: string;
  primaryUserStory: string;
  phase: "draft-spec" | "curate-tools" | "fix-validation";
  validationLog?: string;
}): string {
  const appPath = `apps/${input.app}`;
  if (input.phase === "draft-spec") {
    return `Use the aomi-app-client-api-gen skill to draft or repair ${input.app}'s OpenAPI spec. Keep edits scoped to ${appPath} and required ext/ files. Primary user story: ${input.primaryUserStory}`;
  }
  if (input.phase === "fix-validation") {
    return `Fix validation failures for ${input.app}. Keep edits scoped to ${appPath} and required ext/ files.\n\nValidation log:\n${input.validationLog ?? ""}`;
  }
  return `Use the aomi-app-ux-tool-maker skill to curate ${input.app} into user-centric Aomi tools. Keep edits scoped to ${appPath} and required ext/ files. Primary user story: ${input.primaryUserStory}`;
}

export async function runAgent(
  agent: AgentName,
  prompt: string,
  sdkRoot: string,
  runner: CommandRunner = defaultRunner,
) {
  const bin = agent === "codex" ? "codex" : "claude";
  return runner(bin, [prompt], { cwd: sdkRoot });
}
