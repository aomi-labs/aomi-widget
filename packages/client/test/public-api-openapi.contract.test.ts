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

  it("keeps Gate F restrictions in the generated authority", () => {
    const schemas = publicApi.components.schemas;
    for (const request of [
      schemas.PipelineToolCallRequest,
      schemas.PipelineRunRequest,
    ]) {
      expect(request.properties.app).toEqual({ const: "svm-read-only" });
      expect(request.properties.skills).toMatchObject({ maxItems: 0 });
    }
  });
});
