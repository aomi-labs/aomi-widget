import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { registry } from "../src/registry.js";

const REGISTRY_NAME = "aomi";
const REGISTRY_HOMEPAGE = "https://r.aomi.dev";

const baseDir = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(baseDir, "../dist");
const srcDir = path.resolve(baseDir, "../src");

function buildComponent(entry) {
  const filePath = path.join(srcDir, entry.file);
  const content = readFileSync(filePath, "utf8");

  const payload = {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name: entry.name,
    type: "registry:component",
    description: entry.description,
    files: [
      {
        type: "registry:component",
        path: entry.file,
        content,
      },
    ],
    dependencies: entry.dependencies ?? [],
    registryDependencies: entry.registryDependencies ?? [],
  };

  const outPath = path.join(distDir, `${entry.name}.json`);
  writeFileSync(outPath, JSON.stringify(payload, null, 2));

  // Return item for registry.json (without content)
  return {
    name: entry.name,
    type: "registry:component",
    description: entry.description,
    files: [
      {
        type: "registry:component",
        path: entry.file,
      },
    ],
    dependencies: entry.dependencies ?? [],
    registryDependencies: entry.registryDependencies ?? [],
  };
}

function main() {
  mkdirSync(distDir, { recursive: true });

  const items = registry.map(buildComponent);

  // Generate registry.json index
  const registryIndex = {
    $schema: "https://ui.shadcn.com/schema/registry.json",
    name: REGISTRY_NAME,
    homepage: REGISTRY_HOMEPAGE,
    items,
  };

  writeFileSync(
    path.join(distDir, "registry.json"),
    JSON.stringify(registryIndex, null, 2)
  );

  console.log(`Wrote ${items.length} component files + registry.json to dist/`);
}

main();
