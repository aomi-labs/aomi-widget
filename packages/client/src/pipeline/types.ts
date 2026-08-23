import type { components } from "../generated/agent-v1/types";

type Schemas = components["schemas"];

export type PipelineCatalogResponse =
  | Schemas["PipelineAppList"]
  | Schemas["PipelineAppDescription"]
  | Schemas["PipelineToolList"]
  | Schemas["PipelineToolDescription"]
  | Schemas["PipelineSkillList"]
  | Schemas["PipelineSkill"]
  | Schemas["PipelineSearchResults"];
export type PipelineExecutionResponse =
  | Schemas["PipelineToolCallResponse"]
  | Schemas["PipelineRunResponse"];
export type PipelineAction = Schemas["PipelineAction"];
export type PipelineErrorBody = Schemas["ErrorEnvelope"];
export type PipelineResource = Record<string, unknown>;

export interface PipelineListOptions {
  /** Result limit, bounded by the selected catalog operation. */
  limit?: number;
}

export interface PipelineToolListOptions extends PipelineListOptions {
  app?: string;
  namespace?: string;
}

export interface PipelineSearchOptions extends PipelineListOptions {
  q?: string;
}

export interface PipelineToolSearchOptions extends PipelineSearchOptions {
  app?: string;
}

/**
 * Headers that bind one fail-closed, at-most-once Pipeline execution.
 *
 * The transport deliberately does not manufacture this key: callers must
 * retain and reuse it for the same logical operation. An unknown post-effect
 * crash may remain permanently pending; the client does not retry or claim
 * recovery for that outcome.
 */
export interface PipelineExecutionOptions {
  idempotencyKey: string;
  paymentSignature?: string;
}

export type PipelineAppsResponse = Schemas["PipelineAppList"];
export type PipelineAppResponse = Schemas["PipelineAppDescription"];
export type PipelineToolsResponse = Schemas["PipelineToolList"];
export type PipelineToolResponse = Schemas["PipelineToolDescription"];
export type PipelineSkillsResponse = Schemas["PipelineSkillList"];
export type PipelineSearchResponse = Schemas["PipelineSearchResults"];

type GeneratedPipelineToolCallRequest = Schemas["PipelineToolCallRequest"];

/** Public execution context resolved and enforced by the backend runtime. */
export type PipelineToolCallRequest = Omit<
  GeneratedPipelineToolCallRequest,
  "skills"
> & { skills?: string[] };

type GeneratedPipelineRunRequest = Schemas["PipelineRunRequest"];
type PipelineRunRequestBase = Omit<
  GeneratedPipelineRunRequest,
  "program" | "plan" | "skills"
> & { skills?: string[] };

/** The server requires exactly one frozen program representation. */
export type PipelineRunRequest = PipelineRunRequestBase &
  (
    | { program: string; plan?: never }
    | { program?: never; plan: Record<string, unknown> }
  );
