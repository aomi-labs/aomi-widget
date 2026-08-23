import { describe, expect, it, vi } from "vitest";

import { AomiClient, PipelineApiError } from "../src";

describe("PipelineTransport", () => {
  it("uses the canonical public discovery routes", async () => {
    const fetch = vi
      .fn()
      .mockImplementation(async () => Response.json({ results: [] }));
    const pipeline = new AomiClient({
      baseUrl: "https://portal.example/",
      fetch,
    }).pipeline;

    await pipeline.listApps({ limit: 5 });
    await pipeline.getApp("svm reads");
    await pipeline.searchApps({ q: "solana", limit: 6 });
    await pipeline.listTools({
      app: "svm-read-only",
      namespace: "svm-reads",
      limit: 7,
    });
    await pipeline.getTool("svm_get_balance", { app: "svm-read-only" });
    await pipeline.searchTools({
      q: "balance",
      app: "svm-read-only",
      limit: 8,
    });
    await pipeline.listSkills({ limit: 9 });
    await pipeline.getSkill("safe reads");

    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      "https://portal.example/v1/pipeline/apps?limit=5",
      "https://portal.example/v1/pipeline/apps/svm%20reads",
      "https://portal.example/v1/pipeline/search/apps?q=solana&limit=6",
      "https://portal.example/v1/pipeline/tools?app=svm-read-only&namespace=svm-reads&limit=7",
      "https://portal.example/v1/pipeline/tools/svm_get_balance?app=svm-read-only",
      "https://portal.example/v1/pipeline/search/tools?q=balance&app=svm-read-only&limit=8",
      "https://portal.example/v1/pipeline/skills?limit=9",
      "https://portal.example/v1/pipeline/skills/safe%20reads",
    ]);
  });

  it("surfaces stable policy errors and never retries execution", async () => {
    const fetch = vi.fn().mockResolvedValue(
      Response.json(
        {
          error: {
            code: "pipeline_policy_denied",
            message: "Only safe read-only Pipeline execution is enabled",
            requestId: "request-1",
          },
        },
        { status: 403 },
      ),
    );
    const pipeline = new AomiClient({
      baseUrl: "https://portal.example",
      fetch,
    }).pipeline;

    await expect(
      pipeline.callTool({
        sessionId: "session-1",
        toolId: "write_tool",
        arguments: { value: 1 },
        app: "default",
        skills: [],
      }),
    ).rejects.toMatchObject<Partial<PipelineApiError>>({
      status: 403,
      code: "pipeline_policy_denied",
      retryable: false,
      requestId: "request-1",
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    const [, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(new Headers(init.headers).get("idempotency-key")).toBeNull();
    expect(JSON.parse(init.body as string)).toEqual({
      sessionId: "session-1",
      toolId: "write_tool",
      arguments: { value: 1 },
      app: "default",
      skills: [],
    });
  });

  it("sends frozen run DTOs without adding custody or retry behavior", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(Response.json({ value: { balance: 1 }, steps: [] }));
    const pipeline = new AomiClient({
      baseUrl: "https://portal.example",
      fetch,
    }).pipeline;

    await pipeline.run({
      sessionId: "session-1",
      program: "svm_get_balance owner=wallet",
      app: "svm-read-only",
      skills: [],
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toBe(
      "https://portal.example/v1/pipeline/runs",
    );
  });

  it("falls back to a typed retryable error for a malformed upstream body", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response("gateway", { status: 503 }));
    const pipeline = new AomiClient({
      baseUrl: "https://portal.example",
      fetch,
    }).pipeline;

    await expect(pipeline.listApps()).rejects.toMatchObject({
      status: 503,
      code: "pipeline_request_failed",
      retryable: true,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
