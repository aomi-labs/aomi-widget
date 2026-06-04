// =============================================================================
// @aomi-labs/deploy — server-side client to the Aomi deployment platform
// =============================================================================
//
// NODE-ONLY. Holds the bot PAT + platform activation token; never bundle into a
// browser. Performs `deploy` (GitHub publish, GitHub Git Data API) and
// `activate` (Aomi backend). Per-user ownership/auth/audit persistence is the
// consumer's responsibility — see PLAN.md / README.md.

export { DeploymentClient, assertServerOnly } from "./client";

// ----- generators / utilities (pure, safe anywhere) -------------------------
export {
  stageFiles,
  buildDeploymentManifest,
  validateManifest,
  normalizeGithubRepo,
  sha256Prefixed,
  RESERVED_MANIFEST_PATH,
  DEPLOYMENT_DIR,
  DEPLOYMENT_FILE,
} from "./deployment-json";
export {
  releaseTag,
  shortCommit,
  deriveSourceCommit,
  assertValidCommit,
  COMMIT_RE,
  DEFAULT_RELEASE_TAG_CONVENTION,
} from "./release-tag";
export {
  buildActivationRequest,
  buildActivationRequestDiscordBody,
  ACTIVATION_REQUEST_KIND,
  ACTIVATION_REQUEST_SOURCE,
  ACTIVATION_REQUEST_EMBED_COLOR,
} from "./activation-request";

// ----- errors ---------------------------------------------------------------
export {
  DeployError,
  BrowserEnvironmentError,
  PathScopeError,
  TagWideningError,
  ActivationError,
} from "./errors";
export type { DeployErrorCode } from "./errors";

// ----- types ----------------------------------------------------------------
export type {
  SourceBundle,
  GitHubConfig,
  AomiConfig,
  AuditEvent,
  DeploymentClientOptions,
  DeployInput,
  DeployResult,
  CiStatus,
  ReleaseStatus,
  StatusResult,
  ActivateInput,
  ActivateResult,
} from "./types";
export type { DiscordConfig } from "./types";
export type {
  ActivationRequestInput,
  ActivationRequestPayload,
  DiscordWebhookBody,
} from "./activation-request";
export type {
  ActivateAppRequest,
  DeploymentManifest,
  DeploymentApp,
  DeploymentSource,
  DeploymentPlatform,
  DeploymentTarget,
  DeploymentStateFlags,
  StagedFile,
  PlatformDescriptor,
} from "./contract";
export type { GitHubRestClient } from "./github";
