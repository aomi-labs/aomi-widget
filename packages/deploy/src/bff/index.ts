// @aomi-labs/deploy/bff — server-only, framework-agnostic BFF route factories
// for the one-shot launch flow. Every handler is `(Request) => Promise<Response>`,
// mountable directly as Next.js App Router route exports (or behind any
// fetch-style server).
//
// Layering: browser UI → these routes → `DeploymentClient` (root export) →
// Aomi backend. The activation/service bearer never leaves this layer.

export { identifyLaunchError, type LaunchFailureSource } from "./errors";

export {
  createLaunchRoutes,
  type LaunchRoutes,
  type LaunchRoutesOptions,
  type LaunchRouteHandler,
} from "./launch-routes";

export {
  createGitHubAuthRoutes,
  type GitHubAuthRoutes,
  type GitHubAuthRoutesOptions,
} from "./github-auth-routes";

export {
  createGitHubSessionCodec,
  GITHUB_SESSION_COOKIE,
  type GitHubSession,
  type GitHubSessionCodec,
  type GitHubSessionCodecOptions,
} from "./github-session";

export {
  resolveLaunchConfig,
  DEFAULT_DEPLOY_PLATFORM,
  DEFAULT_TEMPLATE_REPO,
  type LaunchConfig,
} from "./config";

export {
  createDefaultGuards,
  createRateLimiter,
  validateOrigin,
  getClientIp,
  type LaunchGuards,
  type RouteGuard,
} from "./guards";

export { releaseTagsFromDeployment, appNamesFromDeployment } from "./mappers";

export {
  isValidInstallationId,
  isValidRepo,
  isValidDeploymentId,
  isValidReleaseTags,
  isValidAppSourceId,
} from "./validate";

export { readCookie, serializeCookie, appendSetCookie } from "./cookies";

export {
  fetchReleaseSecretSlots,
  missingSecretsForActivation,
  RequiredSecretsCheckError,
  REQUIRED_SECRETS_CHECK_UNAVAILABLE,
} from "./release-manifest";
