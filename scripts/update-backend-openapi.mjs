#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixturePath = join(
  repoRoot,
  "packages/client/test/fixtures/backend-openapi.json",
);
const tmpPath = join(repoRoot, ".tmp/backend-openapi.json");
const productMonoRoot = resolveProductMonoRoot();

mkdirSync(dirname(tmpPath), { recursive: true });

const result = spawnSync(
  "cargo",
  [
    "test",
    "-p",
    "backend",
    "endpoint::tests::routes::export_openapi_fixture",
    "--",
    "--ignored",
    "--exact",
    "--nocapture",
  ],
  {
    cwd: join(productMonoRoot, "aomi"),
    env: {
      ...process.env,
      AOMI_OPENAPI_OUT: tmpPath,
    },
    stdio: "inherit",
  },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const openApi = JSON.parse(readFileSync(tmpPath, "utf8"));
writeFileSync(fixturePath, `${JSON.stringify(openApi, null, 2)}\n`);
rmSync(tmpPath, { force: true });

console.log(`Updated ${fixturePath}`);

function resolveProductMonoRoot() {
  const configured =
    process.env.AOMI_PRODUCT_MONO_ROOT ?? process.env.PRODUCT_MONO_ROOT;
  const candidates = [
    configured,
    join(repoRoot, "../product-mono"),
    join(repoRoot, "../../product-mono"),
    join(repoRoot, "../../../product-mono"),
    join(repoRoot, "../product-mono.worktrees/main"),
    join(repoRoot, "../../product-mono.worktrees/main"),
  ].filter(Boolean);

  for (const candidate of candidates) {
    const root = resolve(candidate);
    if (existsSync(join(root, "aomi/bin/backend/Cargo.toml"))) {
      return root;
    }
  }

  throw new Error(
    "Could not find product-mono. Set AOMI_PRODUCT_MONO_ROOT to the product-mono checkout.",
  );
}
