export { auth } from "./auth";
export {
  setBetterAuthFailureObserver,
  type BetterAuthFailure,
  type ObserveBetterAuthFailure,
} from "./failure-observer";
export {
  AOMI_CANONICAL_USER_CLAIM,
  AOMI_PRINCIPAL_CLASS_CLAIM,
  AOMI_SCOPES,
  AGENT_SCOPES,
  PIPELINE_SCOPES,
  aomiOAuthResourcePolicy,
  aomiOAuthResources,
} from "./oauth-policy";
export { readAccountAuthEnv, type AccountAuthEnv } from "./env";
export { verifySiweMessage } from "./siwe";
export {
  SIWS_CLUSTERS,
  SIWS_DEFAULT_CLUSTER,
  aomiSiwsPlugin,
  parseSiwsMessage,
  siwsIdentitySubject,
  validSolanaAddress,
  verifySiwsMessage,
  type SiwsCluster,
  type SiwsIntent,
} from "./siws";
export { aomiSiwsClient } from "./siws-client";
