import {
  operateBotsCreateRoute,
  operateBotsDeleteRoute,
  operateBotsRoute,
} from "@build/server/bff/operate/routes";

export const GET = operateBotsRoute;
export const POST = operateBotsCreateRoute;
export const DELETE = operateBotsDeleteRoute;
