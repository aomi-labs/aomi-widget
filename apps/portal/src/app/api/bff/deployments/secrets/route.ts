import {
  deploymentSecretsRoute,
  deploymentSecretsWriteRoute,
  deploymentSecretsDeleteRoute,
} from "@portal/server/bff/launch/routes";

export const GET = deploymentSecretsRoute;
export const POST = deploymentSecretsWriteRoute;
export const DELETE = deploymentSecretsDeleteRoute;
