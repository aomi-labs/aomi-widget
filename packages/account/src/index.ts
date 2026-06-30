// `@aomi-labs/account` — server-only BFF seam for every Aomi frontend (portal,
// base, landing). Resolve-or-create the canonical user against the database the
// Rust backend reads, mint the AccountBearer that carries `sub` = that canonical
// id, and provide the shared session cookie + backend proxy + auth-exchange
// route every BFF mounts. Node-only (holds `pg` + the EdDSA private key) — never
// import into a browser/client bundle. See
// docs/topics/account-authentication/facts/service-identity.md.

export {
  resolveOrCreateCanonicalUser,
  type ResolveInput,
  type CanonicalUser,
} from "./account-graph";
export {
  mintAccountBearer,
  AUDIENCE,
  ACCOUNT_BEARER_TTL_SECONDS,
  type MintedBearer,
} from "./bearer";
export { portalService } from "./topology";
export { getSessionedCanonicalId } from "./session";
export {
  createBackendProxy,
  type ProxyConfig,
  type AllowedRoute,
} from "./proxy";
export { createBearerTokenRoute } from "./token";
