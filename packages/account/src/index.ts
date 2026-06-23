// `@aomi-labs/account` — server-only account graph for the issuer (the portal
// BFF). Resolve-or-create the canonical user against the database the Rust
// backend reads, and mint the AccountBearer that carries `sub` = that canonical
// id. Node-only (holds `pg` + the EdDSA private key) — never import into a
// browser/client bundle. See
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
export { getPool } from "./db";
export { portalService } from "./topology";
