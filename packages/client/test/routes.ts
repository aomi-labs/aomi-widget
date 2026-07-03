export type AomiHttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type AomiAuthClass =
  | "session"
  | "thread"
  | "account"
  | "app_gate"
  | "service"
  | "admin"
  | "activation";

export interface AomiEndpointSpec {
  method: AomiHttpMethod;
  path: string;
  auth: readonly AomiAuthClass[];
}

export { AOMI_BACKEND_ENDPOINTS } from "./generated/backend-routes";
