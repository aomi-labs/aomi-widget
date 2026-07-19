import {
  integrationsConnectRoute,
  integrationsStatusRoute,
} from "@build/server/bff/integrations/routes";

export const GET = integrationsStatusRoute;
export const POST = integrationsConnectRoute;
