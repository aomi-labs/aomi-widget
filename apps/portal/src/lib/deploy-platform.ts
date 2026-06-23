// Single source of truth for the onboarding deploy platform name.
// Portal onboarding always deploys the example app to the community platform.
export const DEPLOY_PLATFORM = "community";

export function resolveDeployPlatform(): string {
  return DEPLOY_PLATFORM;
}
