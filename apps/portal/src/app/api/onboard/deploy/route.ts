import { handleDeploy } from "@portal/lib/route-factory";
export const runtime = "nodejs";
export const POST = handleDeploy(false);
