export const DEPLOY_PLATFORM = "community";

export function resolveDeployPlatform(): string {
  return process.env.NEXT_PUBLIC_AOMI_DEPLOY_PLATFORM?.trim() || DEPLOY_PLATFORM;
}
