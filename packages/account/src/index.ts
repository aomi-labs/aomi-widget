// `@aomi-labs/account` — server-only BFF seam for every Aomi frontend (portal,
// base, landing). Resolve-or-create the canonical user against the database the
// Rust backend reads, mint the AccountBearer that carries `sub` = that canonical
// id, and provide the shared session cookie + backend proxy + auth-exchange
// route every BFF mounts. Node-only (holds `pg` + the EdDSA private key) — never
// import into a browser/client bundle. See
// docs/topics/account-authentication/facts/service-identity.md.

export {
  resolveOrCreateCanonicalUser,
  resolveOrCreateByWallet,
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
export {
  SESSION_COOKIE,
  issueSessionCookie,
  readSessionCookie,
  setSessionCookie,
  getSessionedCanonicalId,
  clearSessionCookie,
} from "./session";
export {
  createBackendProxy,
  type ProxyConfig,
  type AllowedRoute,
} from "./proxy";
export {
  createAuthExchangeRoute,
  type ExchangeConfig,
  type Provider,
} from "./exchange";
export {
  verifyProviderCredential,
  verifyPrivyToken,
  verifyParaJwt,
  ProviderCredentialError,
  type AccountCredentialProvider,
  type ProviderTokenCredential,
  type VerifiedProviderToken,
  type VerifiedProviderTokenCredential,
  type ProviderCredentialVerifier,
} from "./providers";
export {
  createSiweNonceRoute,
  createSiweExchangeRoute,
  verifySiweMessage,
  type SiweConfig,
} from "./siwe";
