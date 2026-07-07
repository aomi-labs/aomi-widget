import {
  deploymentSecretsRoute,
  deploymentSecretsWriteRoute,
  deploymentSecretsDeleteRoute,
} from "@build/server/bff/launch/routes";

export const GET = deploymentSecretsRoute;
export const POST = deploymentSecretsWriteRoute;
export const DELETE = deploymentSecretsDeleteRoute;
