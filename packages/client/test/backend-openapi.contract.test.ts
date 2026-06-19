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

// The live backend can be slow or briefly unreachable from CI runners, which
// previously stranded unrelated PRs on a 5s fetch timeout. Retry the fetch a
// handful of times with exponential backoff before letting the test fail.
const LIVE_FETCH_ATTEMPTS = 5;
const LIVE_FETCH_ATTEMPT_TIMEOUT_MS = 10_000;
const LIVE_FETCH_BACKOFF_MS = 2_000;
// Generous overall budget so the retries (timeouts + backoff) can run to
// completion instead of tripping vitest's default 5s test timeout.
const LIVE_TEST_TIMEOUT_MS = 90_000;

describe("backend OpenAPI route contract", () => {
  it("keeps the client route manifest aligned with the checked-in backend OpenAPI fixture", () => {
    expectRouteContract(backendOpenApiFixture as OpenApiDocument);
  });

  it.runIf(process.env.AOMI_BACKEND_OPENAPI_URL)(
    "keeps the client route manifest aligned with a live backend OpenAPI document",
    async () => {
      const response = await fetchWithRetry(
        process.env.AOMI_BACKEND_OPENAPI_URL!,
      );

      expect(response.ok).toBe(true);
      expect(response.headers.get("content-type") ?? "").toContain(
        "application/json",
      );
      expectRouteContract((await response.json()) as OpenApiDocument);
    },
    LIVE_TEST_TIMEOUT_MS,
  );
});

async function fetchWithRetry(url: string): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= LIVE_FETCH_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(LIVE_FETCH_ATTEMPT_TIMEOUT_MS),
      });

      // Retry on transient upstream errors (e.g. 502/503 during a deploy).
      if (!response.ok && response.status >= 500) {
        throw new Error(`Live backend responded with ${response.status}`);
      }

      return response;
    } catch (error) {
      lastError = error;
      if (attempt < LIVE_FETCH_ATTEMPTS) {
        await delay(LIVE_FETCH_BACKOFF_MS * 2 ** (attempt - 1));
      }
    }
  }

  throw new Error(
    `Failed to fetch live backend OpenAPI document at ${url} after ${LIVE_FETCH_ATTEMPTS} attempts: ${String(
      lastError,
    )}`,
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
