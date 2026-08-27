// @aomi-labs/deploy/bff — server-only, framework-agnostic BFF route factories
// for the one-shot launch flow. Every handler is `(Request) => Promise<Response>`,
// mountable directly as Next.js App Router route exports (or behind any
// fetch-style server).
//
// Layering: browser UI → these routes → `BackendClient` (root export) →
// Aomi backend. The activation/service bearer never leaves this layer.

export {
  identifyLaunchError,
  launchErrorResponse,
  type LaunchFailureSource,
} from "./errors";

export {
  createLaunchRoutes,
  resolveLaunchConfig,
  DEFAULT_DEPLOY_PLATFORM,
  DEFAULT_TEMPLATE_REPO,
  launchAppStatusesResult,
  type LaunchRoutes,
  type LaunchRoutesOptions,
  type LaunchRouteHandler,
  type LaunchConfig,
} from "./launch-routes";

export {
  createGitHubAuthRoutes,
  createGitHubSessionCodec,
  GITHUB_SESSION_COOKIE,
  type GitHubAuthRoutes,
  type GitHubAuthRoutesOptions,
  type GitHubSession,
  type GitHubSessionCodec,
  type GitHubSessionCodecOptions,
} from "./auth";

export {
  createDefaultGuards,
  createRateLimiter,
  validateOrigin,
  getClientIp,
  readCookie,
  serializeCookie,
  appendSetCookie,
  isValidInstallationId,
  isValidRepo,
  isValidDeploymentId,
  isValidReleaseTags,
  isValidProjectId,
  type LaunchGuards,
  type RouteGuard,
} from "./http";

export {
  missingSecretsForActivation,
  RequiredSecretsCheckError,
  REQUIRED_SECRETS_CHECK_UNAVAILABLE,
} from "./release-manifest";
