export type AomiHttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type AomiAuthClass =
  | "thread"
  | "account"
  | "agent_adapter"
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
