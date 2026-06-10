import { DeployError } from "./errors";

// =============================================================================
// Activation request — the pre-deploy onboarding ask
// =============================================================================
//
// Mirror of `aomi-git request` (sdk/bin/git/discord.rs). A new contributor
// can't deploy until ops invites their GitHub account to the platform repo, and
// can't self-activate until ops issues them an activation bearer. This is
// the structured ask carrying the requester identity ops needs to act.
//
// The canonical payload below is byte-compatible with what `aomi-git request`
// emits, so a request raised from the FE and one from the CLI are
// indistinguishable to whatever consumes them (e.g. the Discord bot).
//
// HARD RULES (same as the CLI):
//   - The activation bearer is NEVER part of this payload. Ops mint it and
//     deliver it to `email` out-of-band.
//   - Pre-deploy: NO `app_release_tag` / `server_tags` (no release exists yet).

/** Discriminator value for the payload `kind` field. */
export const ACTIVATION_REQUEST_KIND = "activation_request" as const;

/** Provenance stamp. Matches the `aomi-git` form (`<tool>/<version>`). */
export const ACTIVATION_REQUEST_SOURCE = "@aomi-labs/deploy/0.1.0";

/** Discord embed accent color (blurple). Cosmetic only. Matches the CLI. */
export const ACTIVATION_REQUEST_EMBED_COLOR = 5_793_266;

export interface ActivationRequestInput {
  /** Where ops sends the activation bearer. */
  email: string;
  /** GitHub account to invite as a platform-repo collaborator. */
  githubAccount: string;
  /** App slug. */
  app: string;
  /** Platform name (e.g. "community"). */
  platform: string;
  /** Normalized `owner/repo`. */
  repo: string;
  /** RFC3339 timestamp; defaults to now. Injectable for deterministic tests. */
  requestedAt?: string;
}

/**
 * The canonical machine-readable payload. Snake_case keys match the CLI /
 * Discord contract exactly — do not rename without updating the consumer.
 */
export interface ActivationRequestPayload {
  kind: typeof ACTIVATION_REQUEST_KIND;
  email: string;
  github_account: string;
  app: string;
  platform: string;
  repo: string;
  requested_at: string;
  source: string;
}

/** Minimal shape of a Discord incoming-webhook body (the parts we set). */
export interface DiscordWebhookBody {
  content: string;
  allowed_mentions: { parse: string[] };
  embeds: Array<{
    title: string;
    color: number;
    fields: Array<{ name: string; value: string; inline: boolean }>;
    description: string;
  }>;
}

function requireField(value: string, name: string): string {
  const v = value?.trim();
  if (!v) {
    throw new DeployError("ACTIVATION_REQUEST", `\`${name}\` must not be empty`);
  }
  return v;
}

/**
 * Build the canonical activation-request payload. Validates inputs and normalizes
 * whitespace. `requestedAt` defaults to the current time in RFC3339.
 */
export function buildActivationRequest(input: ActivationRequestInput): ActivationRequestPayload {
  const email = requireField(input.email, "email");
  if (!email.includes("@")) {
    throw new DeployError("ACTIVATION_REQUEST", `\`email\` must be a valid email address (got ${JSON.stringify(input.email)})`);
  }
  return {
    kind: ACTIVATION_REQUEST_KIND,
    email,
    github_account: requireField(input.githubAccount, "githubAccount"),
    app: requireField(input.app, "app"),
    platform: requireField(input.platform, "platform"),
    repo: requireField(input.repo, "repo"),
    requested_at: input.requestedAt ?? new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    source: ACTIVATION_REQUEST_SOURCE,
  };
}

/**
 * Build the Discord webhook body: a human-readable embed for ops plus the
 * canonical payload inlined as a fenced ```json block in the embed description
 * for the bot to parse. Mirror of `discord.rs::webhook_body`.
 *
 * `allowed_mentions` is scoped to users/roles only, never `@everyone`.
 */
export function buildActivationRequestDiscordBody(
  input: ActivationRequestInput,
  opts?: { opsMention?: string },
): DiscordWebhookBody {
  const payload = buildActivationRequest(input);
  const compact = JSON.stringify(payload);
  return {
    content: opts?.opsMention ?? "",
    allowed_mentions: { parse: ["users", "roles"] },
    embeds: [
      {
        title: "Activation request",
        color: ACTIVATION_REQUEST_EMBED_COLOR,
        fields: [
          { name: "Requester", value: payload.email, inline: true },
          { name: "GitHub", value: payload.github_account, inline: true },
          { name: "App", value: payload.app, inline: true },
          { name: "Platform", value: payload.platform, inline: true },
          { name: "Repo", value: payload.repo, inline: false },
        ],
        description: "```json\n" + compact + "\n```",
      },
    ],
  };
}
