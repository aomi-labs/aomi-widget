export { auth } from "./auth";
export {
  setBetterAuthFailureObserver,
  type BetterAuthFailure,
  type ObserveBetterAuthFailure,
} from "./failure-observer";
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
