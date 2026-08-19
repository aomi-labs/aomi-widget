import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source = join(root, "apps/portal/openapi/aomi-public-v1.yaml");
const generated = join(
  root,
  "packages/client/src/generated/public-v1/types.ts",
);
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

const sourceHash = createHash("sha256")
  .update(readFileSync(source))
  .digest("hex");
const types = readFileSync(generated, "utf8");
writeFileSync(generated, `// Public contract SHA256: ${sourceHash}\n${types}`);

const format = spawnSync("pnpm", ["exec", "prettier", "--write", generated], {
  cwd: root,
  encoding: "utf8",
});
if (format.status !== 0) {
  process.stderr.write(format.stdout);
  process.stderr.write(format.stderr);
  process.exit(format.status ?? 1);
}
