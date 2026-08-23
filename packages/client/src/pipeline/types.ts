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

export type PipelineAppsResponse = Schemas["PipelineAppList"];
export type PipelineAppResponse = Schemas["PipelineAppDescription"];
export type PipelineToolsResponse = Schemas["PipelineToolList"];
export type PipelineToolResponse = Schemas["PipelineToolDescription"];
export type PipelineSkillsResponse = Schemas["PipelineSkillList"];
export type PipelineSearchResponse = Schemas["PipelineSearchResults"];

type GeneratedPipelineToolCallRequest = Schemas["PipelineToolCallRequest"];

/** Generated request narrowed by the OpenAPI `skills.maxItems: 0` gate. */
export type PipelineToolCallRequest = Omit<
  GeneratedPipelineToolCallRequest,
  "skills"
> & { skills?: [] };

type GeneratedPipelineRunRequest = Schemas["PipelineRunRequest"];
type PipelineRunRequestBase = Omit<
  GeneratedPipelineRunRequest,
  "program" | "plan" | "skills"
> & { skills?: [] };

/** The server requires exactly one frozen program representation. */
export type PipelineRunRequest = PipelineRunRequestBase &
  (
    | { program: string; plan?: never }
    | { program?: never; plan: Record<string, unknown> }
  );
