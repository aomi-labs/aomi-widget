import type { BackendClient } from "../backend";
import { BackendError } from "../errors";
import type { UserProject } from "../types";
import { missingRequiredSecrets } from "../secrets";

export const REQUIRED_SECRETS_CHECK_UNAVAILABLE =
  "REQUIRED_SECRETS_CHECK_UNAVAILABLE" as const;

/** The required-secret metadata could not be verified safely. */
export class RequiredSecretsCheckError extends Error {
  readonly code = REQUIRED_SECRETS_CHECK_UNAVAILABLE;
  readonly upstream?: "github" | "rust";
  readonly upstreamStatus?: number;

  constructor(options?: {
    cause?: unknown;
    upstream?: "github" | "rust";
    upstreamStatus?: number;
  }) {
    super("Unable to verify required secrets. Try again.", {
      cause: options?.cause,
    });
    this.name = "RequiredSecretsCheckError";
    this.upstream = options?.upstream;
    this.upstreamStatus = options?.upstreamStatus;
  }
}

/** Backend statuses that answer the request rather than report a fault. 401 and
 *  403 are deliberately absent: those are the service credential failing, not a
 *  verdict on the release, and must fail the gate closed. */
const REQUEST_ANSWERS = new Set([400, 404, 409, 422]);

/**
 * Required slots the apps declare that have no value in the vault yet, keyed
 * by app name. Empty object = no missing required values. Verification
 * failures throw so activation cannot proceed when the declarations are
 * unreadable.
 *
 * The declarations come from the backend, which reads each candidate release's
 * `manifest.json` on the platform's own GitHub App installation — the same
 * credential it verifies the release with when it activates. This BFF used to
 * fetch those manifests itself with a `GITHUB_TOKEN` from its environment,
 * which made the gate fail closed wherever that token was absent: activation
 * answered 503 "Unable to verify required secrets. Try again." on every
 * attempt, including for releases that declare no secrets at all, and no
 * amount of retrying could clear it. The console holds no GitHub credential;
 * asking the service that does is the fix.
 */
export async function missingSecretsForActivation(input: {
  client: BackendClient;
  githubUserId: string;
  project: UserProject;
  pairs: { app: string; releaseTag: string }[];
}): Promise<Record<string, string[]>> {
  if (input.pairs.length === 0) return {};

  let declared;
  try {
    declared = await input.client.getUserProjectReleaseSecrets({
      githubUserId: input.githubUserId,
      projectId: input.project.id,
      pairs: input.pairs,
    });
  } catch (error) {
    // A definite answer *about the request* — an unknown release, a pair that
    // belongs to another project — is the backend's to report, and relaying it
    // keeps the caller's own 404/409. Only an indefinite failure means the
    // check could not run, which is what fails activation closed.
    if (error instanceof BackendError && REQUEST_ANSWERS.has(error.status)) {
      throw error;
    }
    throw new RequiredSecretsCheckError({
      cause: error,
      upstream: "rust",
      upstreamStatus: error instanceof BackendError ? error.status : undefined,
    });
  }

  const missing: Record<string, string[]> = {};
  for (const pair of input.pairs) {
    const entry = declared.byApp[pair.app];
    // A pair the backend did not answer for is not evidence of "nothing
    // required" — it means the gate did not run for that app.
    if (!entry) {
      throw new RequiredSecretsCheckError({
        cause: new Error(
          `no secret declarations returned for \`${pair.app}\` (${pair.releaseTag})`,
        ),
        upstream: "rust",
      });
    }
    if (entry.slots.length === 0) continue;

    // Only an app that declares something needs its configured values read.
    const applicationId =
      entry.applicationId ??
      input.project.apps.find((app) => app.name === pair.app)?.id;
    if (!applicationId) {
      throw new RequiredSecretsCheckError({
        cause: new Error(`Application identity is unavailable for ${pair.app}`),
        upstream: "rust",
      });
    }
    let configured;
    try {
      configured = await input.client.listAppSecrets({ applicationId });
    } catch (error) {
      throw new RequiredSecretsCheckError({
        cause: error,
        upstream: "rust",
        upstreamStatus:
          error instanceof BackendError ? error.status : undefined,
      });
    }
    const configuredKeys = (configured.byApp[pair.app] ?? []).map(
      (handle) => handle.split("::").pop() ?? handle,
    );
    const unfilled = missingRequiredSecrets(entry.slots, configuredKeys);
    if (unfilled.length > 0) {
      missing[pair.app] = unfilled.map((slot) => slot.name);
    }
  }
  return missing;
}
