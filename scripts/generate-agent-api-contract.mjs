import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const rustRepo = resolve(
  process.env.AOMI_RUST_REPO ?? join(root, "../product-mono/aomi"),
);
const source = join(root, "apps/portal/openapi/aomi-agent-v1.json");
const generated = join(
  root,
  "packages/client/src/generated/agent-v1/types.ts",
);

const rust = spawnSync(
  "cargo",
  ["run", "--quiet", "-p", "api-server", "--", "--print-openapi"],
  { cwd: rustRepo, encoding: "utf8" },
);
if (rust.status !== 0) {
  process.stderr.write(rust.stdout);
  process.stderr.write(rust.stderr);
  process.exit(rust.status ?? 1);
}

const document = `${JSON.stringify(JSON.parse(rust.stdout), null, 2)}\n`;
writeFileSync(source, document);

const result = spawnSync(
  "pnpm",
  ["dlx", "openapi-typescript@7.13.0", source, "-o", generated],
  { cwd: root, encoding: "utf8" },
);
if (result.status !== 0) {
  process.stderr.write(result.stdout);
  process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
}

const sourceHash = createHash("sha256").update(document).digest("hex");
const types = readFileSync(generated, "utf8");
writeFileSync(generated, `// Rust Agent contract SHA256: ${sourceHash}\n${types}`);

const format = spawnSync("pnpm", ["exec", "prettier", "--write", generated], {
  cwd: root,
  encoding: "utf8",
});
if (format.status !== 0) {
  process.stderr.write(format.stdout);
  process.stderr.write(format.stderr);
  process.exit(format.status ?? 1);
}
