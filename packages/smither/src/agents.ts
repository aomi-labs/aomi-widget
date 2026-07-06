import type { AgentLike } from "smithers-orchestrator";

export type AgentKind = "claude" | "codex";

function cleanEnv(env: NodeJS.ProcessEnv | undefined): Record<string, string> | undefined {
  if (!env) return undefined;
  const entries = Object.entries(env).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string",
  );
  return Object.fromEntries(entries);
}

/**
 * CLI work agent for curation/review/repair tasks. Runs inside the SDK
 * checkout in non-interactive mode with edits allowed — Smithers owns the
 * retry/fallback/fork machinery around it. Lazy-imports the orchestrator so
 * merely loading this module doesn't require Bun.
 */
export async function makeWorkAgent(
  kind: AgentKind,
  options: { cwd: string; env?: NodeJS.ProcessEnv; timeoutMs?: number },
): Promise<AgentLike> {
  const { ClaudeCodeAgent, CodexAgent } = await import("smithers-orchestrator");
  const env = cleanEnv(options.env);
  if (kind === "codex") {
    return new CodexAgent({
      cwd: options.cwd,
      env,
      fullAuto: true,
      skipGitRepoCheck: true,
      timeoutMs: options.timeoutMs,
    });
  }
  return new ClaudeCodeAgent({
    cwd: options.cwd,
    env,
    permissionMode: "acceptEdits",
    timeoutMs: options.timeoutMs,
  });
}
