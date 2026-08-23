import { describe, expect, it } from "vitest";

import publicApi from "../../../apps/portal/openapi/aomi-agent-v1.json";

describe("public Agent and Pipeline OpenAPI snapshot", () => {
  it("freezes the exact Rust route manifest including Pipeline MCP", () => {
    expect(publicApi["x-aomi-route-manifest"]).toHaveLength(23);
    expect(
      publicApi["x-aomi-route-manifest"].filter((route) =>
        route.includes("/v1/pipeline/"),
      ),
    ).toEqual([
      "GET /v1/pipeline/apps",
      "GET /v1/pipeline/apps/{app}",
      "GET /v1/pipeline/search/apps",
      "GET /v1/pipeline/search/tools",
      "GET /v1/pipeline/skills",
      "GET /v1/pipeline/skills/{skillId}",
      "GET /v1/pipeline/tools",
      "GET /v1/pipeline/tools/{toolId}",
      "POST /v1/pipeline/mcp",
      "POST /v1/pipeline/runs",
      "POST /v1/pipeline/tool-calls",
    ]);
    expect(publicApi.paths["/v1/pipeline/mcp"].post.operationId).toBe(
      "pipelineMcp",
    );
  });

  it("freezes Gate F public execution and custody authority", () => {
    const schemas = publicApi.components.schemas;
    expect(publicApi.info.description).toContain(
      "Gate F Pipeline execution supports builtin public apps",
    );
    for (const path of [
      "/v1/pipeline/tool-calls",
      "/v1/pipeline/runs",
      "/v1/pipeline/mcp",
    ] as const) {
      expect(publicApi.paths[path].post.description).toContain("builtin");
      expect(publicApi.paths[path].post.description).toContain("Phase 10");
    }
    expect(
      publicApi.paths["/v1/pipeline/tool-calls"].post.description,
    ).toContain("returns 501");
    expect(publicApi.paths["/v1/pipeline/runs"].post.description).toContain(
      "returns 501",
    );
    for (const request of [
      schemas.PipelineToolCallRequest,
      schemas.PipelineRunRequest,
    ]) {
      expect(request.properties.app).toMatchObject({
        type: "string",
        minLength: 1,
      });
      expect(request.properties.applicationId).toMatchObject({
        type: ["integer", "null"],
        minimum: 1,
      });
      expect(request.properties.platform).toMatchObject({
        type: ["string", "null"],
      });
      expect(request.properties.skills).not.toHaveProperty("maxItems");
    }
    expect(
      publicApi.paths["/v1/pipeline/tool-calls"].post.parameters,
    ).toContainEqual(
      expect.objectContaining({
        name: "Idempotency-Key",
        in: "header",
        required: true,
      }),
    );
    expect(publicApi.paths["/v1/pipeline/runs"].post.parameters).toContainEqual(
      expect.objectContaining({
        name: "Idempotency-Key",
        in: "header",
        required: true,
      }),
    );
    expect(schemas.PipelineToolCallResponse.properties.actions).toEqual({
      type: "array",
      items: { $ref: "#/components/schemas/PipelineAction" },
    });
    expect(schemas.PipelineRunResponse.properties.actions).toEqual({
      type: "array",
      items: { $ref: "#/components/schemas/PipelineAction" },
    });
    expect(publicApi.paths["/v1/pipeline/mcp"].post.responses).toHaveProperty(
      "402",
    );
  });

  it("carries stable public app identity through every discovery projection", () => {
    const schemas = publicApi.components.schemas;
    for (const schema of [
      schemas.PipelineAppCard,
      schemas.PipelineAppDescription,
      schemas.PipelineToolList,
      schemas.PipelineToolDescription,
      schemas.PipelineSearchResults,
    ]) {
      expect(schema.properties.application_id).toMatchObject({
        type: ["integer", "null"],
        minimum: 1,
      });
      expect(schema.properties.platform).toMatchObject({
        type: ["string", "null"],
      });
    }
    for (const schema of [
      schemas.PipelineAppCard,
      schemas.PipelineAppDescription,
      schemas.PipelineToolList,
      schemas.PipelineSearchResults,
    ]) {
      expect(schema.properties.app_release_tag).toEqual({
        type: ["string", "null"],
      });
      expect(schema.properties.artifact_ready).toEqual({
        type: ["boolean", "null"],
      });
    }
  });
});
