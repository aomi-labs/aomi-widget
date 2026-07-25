import { describe, expect, it } from "vitest";
import { z } from "zod";
import { PortalPrincipalError } from "./principal";
import { widgetAuthErrorResponse, widgetRoute } from "./response";

function widgetRequest(): Request {
  return new Request("http://localhost:3002/api/widget/auth/exchange", {
    method: "POST",
    headers: { Origin: "http://localhost:3000" },
  });
}

async function bodyOf(response: Response): Promise<unknown> {
  return response.clone().json();
}

describe("widgetAuthErrorResponse", () => {
  it("passes typed auth error code and status through", () => {
    const response = widgetAuthErrorResponse(
      widgetRequest(),
      new PortalPrincipalError("unknown_provider", 400),
      "test",
    );
    expect(response.status).toBe(400);
    return expect(bodyOf(response)).resolves.toEqual({
      error: "unknown_provider",
    });
  });

  it("maps ZodError to 400 invalid_request", async () => {
    const error = z.object({ a: z.string() }).safeParse({}).error;
    const response = widgetAuthErrorResponse(widgetRequest(), error, "test");
    expect(response.status).toBe(400);
    expect(await bodyOf(response)).toEqual({ error: "invalid_request" });
  });

  it("maps provider-token verification failures to 401 with the code", async () => {
    for (const code of [
      "provider_token_expired",
      "provider_token_kid_mismatch",
      "invalid_provider_token_header",
      "invalid_provider_token",
    ]) {
      const response = widgetAuthErrorResponse(
        widgetRequest(),
        new Error(code),
        "test",
      );
      expect(response.status).toBe(401);
      expect(await bodyOf(response)).toEqual({ error: code });
    }
  });

  it("keeps genuinely unknown errors as 500 widget_auth_failed", async () => {
    const response = widgetAuthErrorResponse(
      widgetRequest(),
      new Error("Para JWKS verification is not configured"),
      "test",
    );
    expect(response.status).toBe(500);
    expect(await bodyOf(response)).toEqual({ error: "widget_auth_failed" });
  });

  it("applies cross-origin CORS headers to the error response", () => {
    const response = widgetAuthErrorResponse(
      widgetRequest(),
      new PortalPrincipalError("invalid_request", 400),
      "test",
    );
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:3000",
    );
    expect(response.headers.get("Vary")).toContain("Origin");
  });
});

describe("widgetRoute", () => {
  it("applies CORS to a successful handler response", async () => {
    const handler = widgetRoute(async () => Response.json({ ok: true }));
    const response = await handler(widgetRequest());
    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:3000",
    );
  });

  it("maps thrown typed errors centrally", async () => {
    const handler = widgetRoute(async () => {
      throw new PortalPrincipalError("provider_not_enabled", 400);
    });
    const response = await handler(widgetRequest());
    expect(response.status).toBe(400);
    expect(await bodyOf(response)).toEqual({ error: "provider_not_enabled" });
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:3000",
    );
  });
});
