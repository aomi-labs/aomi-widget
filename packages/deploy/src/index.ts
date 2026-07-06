// @aomi-labs/deploy — server-side typed relay for the Aomi platform deploy API.
// (Service-identity/topology lives in @aomi-labs/service.)

export { DeploymentClient, assertServerOnly } from "./client";

export {
  buildActivationRequest,
  buildActivationRequestDiscordBody,
  ACTIVATION_REQUEST_KIND,
  ACTIVATION_REQUEST_SOURCE,
  ACTIVATION_REQUEST_EMBED_COLOR,
} from "./activation-request";

export {
  DeployError,
  BrowserEnvironmentError,
  BackendError,
  ActivationError,
} from "./errors";
export type { DeployErrorCode } from "./errors";

export type {
  AomiConfig,
  AuditEvent,
  DeploymentClientOptions,
  ServerTagsResult,
  SdkVersionStatus,
  SourceRef,
  DeployInput,
  PreflightInput,
  DeployStatus,
  CiStatus,
  DeployResult,
  DeployPayload,
  Source,
  Platform,
  AppRecord,
  AppFileRecord,
  ReleaseTags,
  ActivateInput,
  ActivateResult,
  ActivationPromotion,
  ActivatedApp,
  StatusInput,
  DeploymentStatus,
  DeploymentAppStatus,
  ProgressModel,
  DeploymentEventKind,
  DeploymentProgressEvent,
  WatchDeploymentOptions,
  TokenScope,
  MintTokenInput,
  MintedToken,
  TokenRecord,
  ListTokensInput,
  RevokeTokenInput,
  AppSource,
  SyncSourceInput,
  ScaffoldInput,
  ListAppsInput,
  GetAppInput,
  PlatformApp,
  ExchangeGitHubCodeInput,
  GitHubIdentity,
  ListUserSourcesInput,
  ListUserSourceDeploymentsInput,
  DeploymentRecord,
  DeactivateAppInput,
  ListDeploymentRecordsInput,
  ListDeploymentRecordsResult,
  ListSecretsInput,
  ListSecretsResult,
  UserSource,
  UserSourceDeploymentApp,
  UserSourceLatestDeployment,
  RedactedDeploymentSecret,
  RedactedDeploymentEnvVar,
  PromoteInput,
  PromoteResult,
} from "./types";

export type {
  ActivationRequestInput,
  ActivationRequestPayload,
  DiscordWebhookBody,
} from "./activation-request";
