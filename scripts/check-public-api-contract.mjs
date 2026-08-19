import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source = join(root, "apps/portal/openapi/aomi-public-v1.yaml");
const generated = join(
  root,
  "packages/client/src/generated/public-v1/types.ts",
);
const expected = createHash("sha256")
  .update(readFileSync(source))
  .digest("hex");
const firstLine = readFileSync(generated, "utf8").split("\n", 1)[0];

if (firstLine !== `// Public contract SHA256: ${expected}`) {
  console.error(
    "Generated public API types are stale. Run `pnpm generate:public-api`.",
  );
  process.exit(1);
}
