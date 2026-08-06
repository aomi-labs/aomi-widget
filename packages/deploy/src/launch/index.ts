// @aomi-labs/deploy/launch — browser-safe client for the one-shot launch flow.
//
// Talks only to the host's same-origin BFF (`@aomi-labs/deploy/bff` mounts);
// no secrets, no backend URL, no framework dependency. Pairs with the launch
// UI components distributed via the Aomi shadcn registry.

export {
  createLaunchClient,
  LaunchRequestError,
  DEFAULT_LAUNCH_BASE_PATH,
  DEFAULT_DEPLOYMENTS_BASE_PATH,
  DEFAULT_GITHUB_AUTH_BASE_PATH,
  type LaunchClient,
  type LaunchClientOptions,
  type GitHubSessionInfo,
  type UserSourcesResult,
  type GithubAppOAuthStartResponse,
  type UserSource,
} from "./client";

export {
  DEFAULT_TEMPLATE_REPO,
  resolveTemplateRepo,
  templateRepoUrl,
  templateGenerateUrl,
  type LaunchPath,
  type LaunchDeployPayload,
  type LaunchProgress,
  type LaunchPreflightInput,
  type LaunchDeployInput,
  type LaunchDeployResult,
  type LaunchCreateRepoResult,
  type LaunchStatus,
  type LaunchActivateResult,
  type LaunchAppStatus,
  type LaunchRedeployResult,
  type LaunchSdkStatus,
  type DeploymentSourcesResult,
  type DeploymentHistoryResult,
  type DeploymentFeedResult,
  type DeploymentSecretsResult,
  type DeploymentPromoteResult,
  type RequiredSecretsByApp,
  type RequiredSecretsResult,
} from "./contracts";

export {
  MissingRequiredSecretsError,
  missingRequiredSecrets,
} from "./required-secrets";

export {
  connectionResult,
  type RepositoryConnectionResult,
} from "./connection-result";

export {
  loadLaunch,
  saveLaunch,
  resetLaunch,
  progressOf,
  withPath,
  withProgress,
  withPendingInstall,
  withRejectedInstall,
  normalizeRepo,
  readGithubRedirect,
  isResumingInstall,
  oneshotStep,
  installationStatusLabel,
  GITHUB_REDIRECT_KEYS,
  ONESHOT_STEPS,
  type LaunchState,
  type PendingInstall,
  type GithubRedirect,
  type OneshotStep,
} from "./state";

export {
  deploymentProgress,
  isTerminalState,
  watchDeploymentLoop,
  type WatchLoopOptions,
} from "./watch";

export {
  readLaunchUrlContext,
  sourceMatchesLaunchUrlContext,
  hasSourceForLaunchUrlContext,
  platformParam,
  type LaunchUrlContext,
} from "./url-context";
