export { observedWidgetOrigin, widgetOriginDomain } from "./origin";
export {
  issueWidgetSession,
  resolveWidgetCanonicalUserId,
  resolveWidgetSession,
  revokeWidgetSession,
  WIDGET_SESSION_TTL_SECONDS,
  type WidgetSession,
} from "./session";
export {
  createWidgetSiweChallenge,
  verifyWidgetSiweProof,
  WidgetAuthError,
  WIDGET_SIWE_NONCE_TTL_SECONDS,
  type WidgetSiweChallenge,
} from "./siwe";
export type { WidgetAuthStore, WidgetAuthTicket } from "./store";
