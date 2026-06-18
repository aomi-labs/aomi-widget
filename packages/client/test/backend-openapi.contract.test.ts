import { describe, expect, it } from "vitest";

import backendOpenApiFixture from "./fixtures/backend-openapi.json";
import { AOMI_BACKEND_ENDPOINTS } from "./routes";
import type { AomiAuthClass, AomiHttpMethod } from "./routes";

type OpenApiOperation = {
  "x-aomi-auth"?: string;
};

type OpenApiDocument = {
  paths?: Record<
    string,
    Partial<Record<Lowercase<AomiHttpMethod>, OpenApiOperation>>
  >;
};

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

describe("backend OpenAPI route contract", () => {
  it("keeps the client route manifest aligned with the checked-in backend OpenAPI fixture", () => {
    expectRouteContract(backendOpenApiFixture as OpenApiDocument);
  });

  it.runIf(process.env.AOMI_BACKEND_OPENAPI_URL)(
    "keeps the client route manifest aligned with a live backend OpenAPI document",
    async () => {
      const response = await fetch(process.env.AOMI_BACKEND_OPENAPI_URL!);

      expect(response.ok).toBe(true);
      expect(response.headers.get("content-type") ?? "").toContain(
        "application/json",
      );
      expectRouteContract((await response.json()) as OpenApiDocument);
    },
  );
});

function expectRouteContract(openApi: OpenApiDocument) {
  const backendRoutes = routeContractFromOpenApi(openApi);
  const clientRoutes = routeContractFromClientManifest();

  expect(clientRoutes).toEqual(backendRoutes);
  expect(clientRoutes).toContain("POST /api/account/exchange public");
  expect(clientRoutes).toContain("GET /api/account canonical_user");
  expect(clientRoutes).not.toContain("GET /api/account account_token");
  expect(clientRoutes.some((route) => route.includes(" account_token"))).toBe(
    false,
  );
  expect(clientRoutes.some((route) => route.includes("/api/settings/"))).toBe(
    false,
  );
  expect(clientRoutes.some((route) => route.includes("/api/control/"))).toBe(
    false,
  );
}

function routeContractFromClientManifest() {
  return AOMI_BACKEND_ENDPOINTS.map(
    ({ method, path, auth }) => `${method} ${openApiPath(path)} ${auth}`,
  ).sort();
}

function routeContractFromOpenApi(openApi: OpenApiDocument) {
  const routes: string[] = [];

  for (const [path, pathItem] of Object.entries(openApi.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      const operation =
        pathItem[method.toLowerCase() as Lowercase<AomiHttpMethod>];
      if (!operation) {
        continue;
      }

      const auth = operation["x-aomi-auth"];
      expect(isAomiAuthClass(auth), `${method} ${path} x-aomi-auth`).toBe(true);
      routes.push(`${method} ${path} ${auth}`);
    }
  }

  return routes.sort();
}

function openApiPath(path: string) {
  return path.replaceAll(/:([A-Za-z0-9_]+)/g, "{$1}");
}

function isAomiAuthClass(value: unknown): value is AomiAuthClass {
  return (
    value === "public" ||
    value === "session" ||
    value === "canonical_user" ||
    value === "self_guarded" ||
    value === "app_key_checked"
  );
}
