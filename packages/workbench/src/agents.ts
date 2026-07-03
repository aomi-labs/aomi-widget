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
  // The workflow runner provides no TTY, so both agents must run in their
  // non-interactive modes: `codex exec` and `claude -p` (with edits allowed,
  // since curation/repair phases write into apps/<name>).
  if (agent === "codex") {
    return runner("codex", ["exec", "--full-auto", prompt], { cwd: sdkRoot });
  }
  return runner("claude", ["-p", "--permission-mode", "acceptEdits", prompt], {
    cwd: sdkRoot,
  });
}
