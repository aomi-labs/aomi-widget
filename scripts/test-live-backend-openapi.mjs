#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const configuredOpenApiUrl = process.env.AOMI_BACKEND_OPENAPI_URL;
const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
const openApiUrl =
  configuredOpenApiUrl ??
  (backendUrl
    ? `${backendUrl.replace(/\/+$/, "")}/api/openapi.json`
    : undefined);

if (!openApiUrl) {
  console.error(
    "Set NEXT_PUBLIC_BACKEND_URL before running the live OpenAPI contract check.",
  );
  process.exit(1);
}

const result = spawnSync("pnpm", ["run", "test:openapi"], {
  env: {
    ...process.env,
    AOMI_BACKEND_OPENAPI_URL: openApiUrl,
  },
  stdio: "inherit",
});

process.exit(result.status ?? 1);
