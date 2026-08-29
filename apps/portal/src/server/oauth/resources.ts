import {
  AGENT_SCOPES,
  AOMI_SCOPES,
  PIPELINE_SCOPES,
  aomiOAuthResourcePolicy,
  aomiOAuthResources,
} from "@aomi-labs/account/better-auth";

export {
  AGENT_SCOPES,
  AOMI_SCOPES,
  PIPELINE_SCOPES,
  aomiOAuthResourcePolicy,
  aomiOAuthResources,
};

export type AomiPublicResource = ReturnType<typeof aomiOAuthResources>[
  | "agentMcp"
  | "pipelineMcp"
  | "agentRest"
  | "pipelineRest"];

export function protectedResourceMetadataPath(resource: AomiPublicResource) {
  return `/.well-known/oauth-protected-resource${new URL(resource).pathname}`;
}
