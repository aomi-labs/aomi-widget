#!/usr/bin/env node

import { readFileSync } from "node:fs";

const targetPath = process.argv[2];
if (!targetPath) {
  throw new Error("Usage: verify-backend-openapi-file.mjs <target-openapi.json>");
}

const committed = JSON.parse(
  readFileSync("packages/client/test/fixtures/backend-openapi.json", "utf8"),
);
const target = JSON.parse(readFileSync(targetPath, "utf8"));
const methods = ["get", "post", "put", "patch", "delete"];

function contract(document) {
  const routes = [];
  for (const [path, item] of Object.entries(document.paths ?? {})) {
    for (const method of methods) {
      const operation = item[method];
      if (!operation) continue;
      routes.push(
        `${method.toUpperCase()} ${path} ${JSON.stringify(operation["x-aomi-auth"] ?? [])}`,
      );
    }
  }
  return routes.sort();
}

const expected = contract(committed);
const actual = contract(target);
const actualSet = new Set(actual);
const missing = expected.filter((route) => !actualSet.has(route));
if (missing.length) {
  console.error("Target backend is missing routes/auth required by production frontend:");
  for (const route of missing) console.error(`- ${route}`);
  process.exit(1);
}
console.log(`Target backend satisfies ${expected.length} committed frontend routes.`);
