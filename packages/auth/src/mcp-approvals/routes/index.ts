/**
 * @deprecated Legacy portal route handlers for the old MCP approval-auth flow.
 * Do not mount these in active apps; the portal MCP endpoint now uses account
 * credentials and backend ports directly.
 */
export { makeStartHandler } from "./start";
export type { StartHandlerDeps } from "./start";

export { makeCallbackHandler } from "./callback";
export type { CallbackHandlerDeps } from "./callback";

export { makeAwaitHandler } from "./await";
export type { AwaitHandlerDeps } from "./await";

export { makeBeginHandler } from "./begin";
export type { BeginHandlerDeps } from "./begin";
