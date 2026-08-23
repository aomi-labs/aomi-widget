import type { AomiHttpMethod, AomiRequestOptions } from "../types";
import type {
  PipelineAppResponse,
  PipelineAppsResponse,
  PipelineCatalogResponse,
  PipelineErrorBody,
  PipelineExecutionOptions,
  PipelineExecutionResponse,
  PipelineListOptions,
  PipelineRunRequest,
  PipelineSearchOptions,
  PipelineSearchResponse,
  PipelineSkillsResponse,
  PipelineToolCallRequest,
  PipelineToolListOptions,
  PipelineToolResponse,
  PipelineToolSearchOptions,
  PipelineToolsResponse,
} from "./types";

type RequestResponse = (
  method: AomiHttpMethod,
  path: string,
  options?: AomiRequestOptions,
) => Promise<Response>;

export class PipelineApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly retryable: boolean,
    readonly requestId?: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "PipelineApiError";
  }
}

/** The single typed transport for every first-party Pipeline consumer. */
export class PipelineTransport {
  constructor(private readonly requestResponse: RequestResponse) {}

  listApps(options: PipelineListOptions = {}): Promise<PipelineAppsResponse> {
    return this.json("GET", "/v1/pipeline/apps", {
      query: { limit: options.limit },
    });
  }

  getApp(app: string): Promise<PipelineAppResponse> {
    return this.json(
      "GET",
      `/v1/pipeline/apps/${encodeURIComponent(required("app", app))}`,
    );
  }

  searchApps(
    options: PipelineSearchOptions = {},
  ): Promise<PipelineSearchResponse> {
    return this.json("GET", "/v1/pipeline/search/apps", {
      query: { q: options.q, limit: options.limit },
    });
  }

  listTools(
    options: PipelineToolListOptions = {},
  ): Promise<PipelineToolsResponse> {
    return this.json("GET", "/v1/pipeline/tools", {
      query: {
        app: options.app,
        namespace: options.namespace,
        limit: options.limit,
      },
    });
  }

  getTool(
    toolId: string,
    options: { app?: string } = {},
  ): Promise<PipelineToolResponse> {
    return this.json(
      "GET",
      `/v1/pipeline/tools/${encodeURIComponent(required("toolId", toolId))}`,
      { query: { app: options.app } },
    );
  }

  searchTools(
    options: PipelineToolSearchOptions = {},
  ): Promise<PipelineSearchResponse> {
    return this.json("GET", "/v1/pipeline/search/tools", {
      query: { q: options.q, app: options.app, limit: options.limit },
    });
  }

  listSkills(
    options: PipelineListOptions = {},
  ): Promise<PipelineSkillsResponse> {
    return this.json("GET", "/v1/pipeline/skills", {
      query: { limit: options.limit },
    });
  }

  getSkill(skillId: string): Promise<PipelineCatalogResponse> {
    return this.json(
      "GET",
      `/v1/pipeline/skills/${encodeURIComponent(required("skillId", skillId))}`,
    );
  }

  callTool<T extends PipelineExecutionResponse = PipelineExecutionResponse>(
    request: PipelineToolCallRequest,
    options: PipelineExecutionOptions,
  ): Promise<T> {
    return this.json("POST", "/v1/pipeline/tool-calls", {
      headers: executionHeaders(options),
      body: request,
    });
  }

  run<T extends PipelineExecutionResponse = PipelineExecutionResponse>(
    request: PipelineRunRequest,
    options: PipelineExecutionOptions,
  ): Promise<T> {
    return this.json("POST", "/v1/pipeline/runs", {
      headers: executionHeaders(options),
      body: request,
    });
  }

  private async json<T>(
    method: AomiHttpMethod,
    path: string,
    options?: AomiRequestOptions,
  ): Promise<T> {
    return parsePipelineResponse<T>(
      await this.requestResponse(method, path, options),
    );
  }
}

async function parsePipelineResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }
  const body = (await response
    .json()
    .catch(() => null)) as PipelineErrorBody | null;
  throw new PipelineApiError(
    response.status,
    body?.error?.code ?? "pipeline_request_failed",
    body?.error?.message ??
      `Pipeline request failed with HTTP ${response.status}`,
    response.status === 408 ||
      response.status === 429 ||
      response.status >= 500,
    body?.error?.requestId ?? response.headers.get("x-request-id") ?? undefined,
    body?.error?.details,
  );
}

function required(name: string, value: string): string {
  const normalized = value.trim();
  if (!normalized) throw new TypeError(`${name} is required`);
  return normalized;
}

function executionHeaders(options: PipelineExecutionOptions): HeadersInit {
  const idempotencyKey = required("idempotencyKey", options.idempotencyKey);
  return {
    "idempotency-key": idempotencyKey,
    ...(options.paymentSignature
      ? { "payment-signature": options.paymentSignature }
      : {}),
  };
}
