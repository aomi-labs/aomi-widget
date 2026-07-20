import type { AgentLike } from "smithers-orchestrator";

export type AgentKind = "claude" | "codex";

/** OpenRouter's Anthropic-compatible endpoint ("Anthropic Skin") — the claude
 *  CLI speaks its native Messages protocol straight to it. */
export const OPENROUTER_BASE_URL = "https://openrouter.ai/api";

/** Latest cheap coding Kimi. Deliberately NOT kimi-k3 (Sonnet-priced, no
 *  savings); k2.7-code is ~$0.72/$3.50 per M tokens. Ops override via
 *  SMITHER_OPENROUTER_MODEL. */
export const DEFAULT_OPENROUTER_MODEL = "moonshotai/kimi-k2.7-code";

export type AgentBilling =
  | { kind: "openrouter"; apiKey: string; model: string }
  | { kind: "anthropic"; apiKey: string }
  | { kind: "none" };

/**
 * Pick who pays for claude work agents. OpenRouter is the default whenever its
 * key is present (build runs are expensive on first-party Anthropic); the
 * Anthropic key is the backup path, kept for a quick rollback via env alone.
 * Not user-selectable — pure deployment config.
 */
export function resolveAgentBilling(env: NodeJS.ProcessEnv | undefined): AgentBilling {
  const openrouterKey = env?.SMITHER_OPENROUTER_API_KEY;
  if (openrouterKey) {
    return {
      kind: "openrouter",
      apiKey: openrouterKey,
      model: env?.SMITHER_OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL,
    };
  }
  const anthropicKey = env?.SMITHER_ANTHROPIC_API_KEY;
  if (anthropicKey) return { kind: "anthropic", apiKey: anthropicKey };
  return { kind: "none" };
}

/**
 * Env overrides that point the claude CLI at OpenRouter. ANTHROPIC_API_KEY is
 * pinned to "" (not merely unset) so the CLI can never fall back to Anthropic
 * first-party auth; both model slots route to the same slug so background/fast
 * tasks don't silently bill a Claude model.
 */
export function openrouterAgentEnv(billing: {
  apiKey: string;
  model: string;
}): Record<string, string> {
  return {
    ANTHROPIC_BASE_URL: OPENROUTER_BASE_URL,
    ANTHROPIC_AUTH_TOKEN: billing.apiKey,
    ANTHROPIC_API_KEY: "",
    ANTHROPIC_MODEL: billing.model,
    ANTHROPIC_SMALL_FAST_MODEL: billing.model,
  };
}

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
  options: {
    cwd: string;
    env?: NodeJS.ProcessEnv;
    timeoutMs?: number;
    /** Who pays. Headless runners (sandboxes, CI) have no CLI login, so
     *  "none" only works where a personal subscription is signed in. Codex
     *  agents ignore this — they bill their own auth. */
    billing?: AgentBilling;
  },
): Promise<AgentLike> {
  const { ClaudeCodeAgent, CodexAgent } = await import("smithers-orchestrator");
  const billing = options.billing ?? { kind: "none" as const };
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
  if (billing.kind === "openrouter") {
    // ClaudeCodeAgent merges caller env last, so these overrides survive its
    // own ANTHROPIC_API_KEY-clearing pass.
    return new ClaudeCodeAgent({
      cwd: options.cwd,
      env: { ...env, ...openrouterAgentEnv(billing) },
      model: billing.model,
      permissionMode: "acceptEdits",
      timeoutMs: options.timeoutMs,
    });
  }
  return new ClaudeCodeAgent({
    cwd: options.cwd,
    env,
    permissionMode: "acceptEdits",
    timeoutMs: options.timeoutMs,
    ...(billing.kind === "anthropic" ? { apiKey: billing.apiKey } : {}),
  });
}
