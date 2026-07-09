import { launchDeployRoute } from "@build/server/bff/launch/routes";

export const runtime = "nodejs";
export const POST = launchDeployRoute(true);
