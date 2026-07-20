import {
  buildRunStatusRoute,
  createBuildRunRoute,
} from "@build/server/bff/build/routes";

export const POST = createBuildRunRoute;
export const GET = buildRunStatusRoute;
