export type AomiHttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type AomiAuthClass =
  | "public"
  | "session"
  | "canonical_user"
  | "self_guarded"
  | "app_key_checked";

export interface AomiEndpointSpec {
  method: AomiHttpMethod;
  path: string;
  auth: AomiAuthClass;
}

export { AOMI_BACKEND_ENDPOINTS } from "./generated/backend-routes";
