import "server-only";

import { portalService } from "@aomi-labs/account";
import { DeploymentClient } from "@aomi-labs/deploy";
import { configuredBackendUrl } from "@portal/server/backend-url";

async function mintServiceBearer(): Promise<string> {
  const { accessToken } = await portalService().mint({
    role: "service",
    subject: "aomi-bff",
    audience: "aomi-backend",
  });
  return accessToken;
}

export async function deploymentClient(): Promise<DeploymentClient> {
  const activationToken = await mintServiceBearer();
  return new DeploymentClient({
    aomi: { backendUrl: configuredBackendUrl(), activationToken },
  });
}
