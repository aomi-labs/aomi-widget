import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const rustRepo = resolve(
  process.env.AOMI_RUST_REPO ?? join(root, "../product-mono/aomi"),
);
const source = join(root, "apps/portal/openapi/aomi-agent-v1.json");
const generated = join(root, "packages/client/src/generated/agent-v1/types.ts");
const artifact = process.env.AOMI_AGENT_OPENAPI_FILE;
const serialized = artifact
  ? readFileSync(resolve(artifact), "utf8")
  : printRustOpenApi();
const checkedIn = readFileSync(source, "utf8");
const current = JSON.stringify(JSON.parse(serialized));
if (current !== JSON.stringify(JSON.parse(checkedIn))) {
  console.error(
    "Rust Agent OpenAPI snapshot is stale. Run `pnpm generate:agent-api`.",
  );
  process.exit(1);
}

const expected = createHash("sha256").update(checkedIn).digest("hex");
const firstLine = readFileSync(generated, "utf8").split("\n", 1)[0];
if (firstLine !== `// Rust Agent contract SHA256: ${expected}`) {
  console.error(
    "Generated Agent API types are stale. Run `pnpm generate:agent-api`.",
  );
  process.exit(1);
}

function printRustOpenApi() {
  const rust = spawnSync(
    "cargo",
    ["run", "--quiet", "-p", "api-server", "--", "--print-openapi"],
    { cwd: rustRepo, encoding: "utf8" },
  );
  if (rust.status !== 0) {
    if (rust.stdout) process.stderr.write(rust.stdout);
    if (rust.stderr) process.stderr.write(rust.stderr);
    process.exit(rust.status ?? 1);
  }
  return rust.stdout;
}
